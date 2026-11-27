import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ConfirmMoneyCopilotActionDto {
  @ApiProperty({ format: 'uuid', description: 'The preview action identifier returned by the preview endpoint.' })
  @IsUUID()
  actionId: string;
}
