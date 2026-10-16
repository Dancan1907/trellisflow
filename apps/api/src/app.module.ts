/**
 * Root application module.
 *
 * Every feature module is imported here. As TrellisFlow grows,
 * this file becomes the table of contents for the backend.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Load environment variables globally.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
