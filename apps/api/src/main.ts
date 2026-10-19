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
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global API prefix
  app.setGlobalPrefix('api', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });

  // ==========================================================================
  // Swagger Setup
  // ==========================================================================
  // Only expose Swagger in non-production environments for security.
  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('TrellisFlow API')
      .setDescription('The backend API for TrellisFlow — Personal Wealth Platform')
      .setVersion('1.0')
      .addBearerAuth() // Tells Swagger we use JWT Bearer tokens
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);

    // Serves Swagger UI at http://localhost:3000/api/docs
    SwaggerModule.setup('api/docs', app, document);

    logger.log(`📚 Swagger UI available at http://localhost:3000/api/docs`);
  }

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);

  logger.log(`🚀 TrellisFlow API is running on http://localhost:${port}`);
}

bootstrap();
