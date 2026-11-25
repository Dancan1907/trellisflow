import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createHash } from 'crypto';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AiImageInput } from '../ai/ai-provider.interface';
import { MpesaImportService } from './mpesa-import.service';
import { ConfirmMpesaTransactionDto } from './dto/confirm-mpesa-transaction.dto';

interface UploadedReceipt {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

@ApiTags('M-Pesa import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mpesa-import')
export class MpesaImportController {
  constructor(private readonly mpesaImportService: MpesaImportService) {}

  @Post('parse')
  @ApiOperation({ summary: 'Extract a reviewable draft from an M-Pesa SMS or receipt image' })
  @ApiConsumes('multipart/form-data')
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  @UseInterceptors(
    FileInterceptor('receipt', {
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
      fileFilter: (_request, file, callback) => {
        const supported = ['image/jpeg', 'image/png', 'image/webp'];
        if (!supported.includes(file.mimetype)) {
          callback(new BadRequestException('Upload a JPG, PNG, or WebP receipt image.'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  async parse(
    @CurrentUser() user: { id: string },
    @Body('text') text?: string,
    @UploadedFile() receipt?: UploadedReceipt,
  ) {
    let image: AiImageInput | undefined;
    if (receipt) {
      const bytes = receipt.buffer;
      const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
      const isPng =
        bytes.length >= 8 &&
        bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
      const isWebp =
        bytes.length >= 12 &&
        bytes.toString('ascii', 0, 4) === 'RIFF' &&
        bytes.toString('ascii', 8, 12) === 'WEBP';

      if (!isJpeg && !isPng && !isWebp) {
        throw new BadRequestException('The uploaded file is not a valid JPG, PNG, or WebP image.');
      }

      image = {
        mediaType: isJpeg ? 'image/jpeg' : isPng ? 'image/png' : 'image/webp',
        data: bytes.toString('base64'),
      };
    }

    const receiptImageHash = receipt ? createHash('sha256').update(receipt.buffer).digest('hex') : undefined;
    return this.mpesaImportService.parse({ text, image, receiptImageHash }, user.id);
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Confirm an extracted draft and create the transaction' })
  async confirm(
    @CurrentUser() user: { id: string },
    @Body() dto: ConfirmMpesaTransactionDto,
  ) {
    return this.mpesaImportService.confirm(user.id, dto);
  }
}
