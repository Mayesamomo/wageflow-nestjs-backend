import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SeedsService } from './seeds/seeds.service';
import { LoggerService } from './common/services/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  
  const configService = app.get(ConfigService);
  
  // Setup custom logger
  const logger = new LoggerService(configService);
  logger.setContext('Main');
  app.useLogger(logger);
  
  logger.log('Application starting up...');
  logger.log(`Environment: ${configService.get('NODE_ENV', 'development')}`);
  
  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  logger.log('Global validation pipe configured');
  
  // CORS
  app.enableCors();
  logger.log('CORS enabled');
  
  // API prefix
  const apiPrefix = configService.get('API_PREFIX', 'api');
  app.setGlobalPrefix(apiPrefix);
  logger.log(`API prefix set to: ${apiPrefix}`);
  
  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('WageFlow API')
    .setDescription('The WageFlow healthcare time-tracking and invoicing platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
    
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);
  logger.log('Swagger documentation configured');
  
  // Seed database in development
  if (configService.get('NODE_ENV') === 'development') {
    try {
      logger.log('Starting database seeding process');
      const seedsService = app.get(SeedsService);
      await seedsService.seed();
      logger.log('Database seeding completed successfully');
    } catch (error) {
      logger.error('Failed to seed database', error.stack);
    }
  }
  
  const port = configService.get('PORT', 3000);
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}/${apiPrefix}`);
  logger.log(`Swagger documentation available at: http://localhost:${port}/${apiPrefix}/docs`);
}
bootstrap().catch((error) => {
  const logger = new LoggerService(new ConfigService());
  logger.setContext('Bootstrap');
  logger.error('Failed to start application', error.stack);
});