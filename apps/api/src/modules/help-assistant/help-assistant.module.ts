import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { HelpAssistantController } from './help-assistant.controller';
import { HelpAssistantService } from './help-assistant.service';

@Module({
  imports: [AiModule],
  controllers: [HelpAssistantController],
  providers: [HelpAssistantService],
})
export class HelpAssistantModule {}
