import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 3001);
  const corsOrigin = configService.get<string>('corsOrigin', 'http://localhost:3000');

  // Global API Prefix
  app.setGlobalPrefix('api/v1');

  // CORS Configuration
  app.enableCors({
    origin: [corsOrigin, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Global Request Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger Documentation Setup at /api/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Pharmacy Platform API')
    .setDescription(
      'REST API documentation for the Pharmacy Management Platform (Customer, Pharmacist, Admin, Compliance & Fulfilment)',
    )
    .setVersion('1.0')
    .addTag('Health', 'Health and infrastructure status endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Pharmacy API Docs',
  });

  await app.listen(port);
  logger.log(`Pharmacy API running on: http://localhost:${port}/api/v1`);
  logger.log(`Swagger documentation available at: http://localhost:${port}/api/docs`);
}

bootstrap();
