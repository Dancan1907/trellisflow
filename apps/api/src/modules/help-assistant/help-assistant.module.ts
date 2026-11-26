import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { HelpAssistantController } from './help-assistant.controller';
import { HelpAssistantService } from './help-assistant.service';

@Module({
  imports: [AiModule, PrismaModule],
  controllers: [HelpAssistantController],
  providers: [HelpAssistantService],
})
export class HelpAssistantModule {}
