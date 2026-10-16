/**
 * TrellisFlow API — Application entry point.
 *
 * This file:
 *   1. Creates the NestJS application.
 *   2. Configures global pipes (validation).
 *   3. Configures global filters (error handling) — added later.
 *   4. Configures CORS for the frontend.
 *   5. Configures Swagger for API documentation.
 *   6. Starts the HTTP server.
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Create the NestJS application.
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);

  // Global validation pipe: strips unknown fields, transforms payloads,
  // and validates DTOs using class-validator.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not in the DTO.
      forbidNonWhitelisted: true, // Throw if extra properties are sent.
      transform: true, // Auto-transform payloads to DTO instances.
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enable CORS for the frontend (dev + prod origins).
  app.enableCors({
    origin: true, // Will be locked down per environment later.
    credentials: true,
  });

  // Global API prefix (all routes under /api, except Swagger).
  app.setGlobalPrefix('api', {
    exclude: ['health'],
  });

  // Read port from config (default 3000).
  const port = config.get<number>('PORT', 3000);

  await app.listen(port);

  logger.log(`🚀 TrellisFlow API is running on http://localhost:${port}`);
  logger.log(`📚 API docs will be available at http://localhost:${port}/api/docs (once enabled)`);
}

bootstrap();
