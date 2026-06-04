import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger.config';

/** Inicializa a API: configura segurança HTTP, pipes, prefixo e Swagger. */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('apiPrefix') ?? 'api/v1';
  const port = configService.get<number>('port') ?? 4000;
  const nodeEnv = configService.get<string>('nodeEnv') ?? 'development';

  app.use(helmet());

  const corsOrigins = configService.get<string>('cors.origins');
  if (corsOrigins) {
    app.enableCors({
      origin: corsOrigins
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    });
  }

  app.setGlobalPrefix(apiPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (nodeEnv !== 'production') {
    const swaggerPath = configService.get<string>('swagger.path') ?? 'api/docs';
    setupSwagger(app, swaggerPath);
  }

  await app.listen(port, '0.0.0.0');
}
bootstrap();
