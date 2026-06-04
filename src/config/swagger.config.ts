import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const JWT_AUTH_SCHEME = 'JWT-auth';

export const swaggerDocumentConfig = new DocumentBuilder()
  .setTitle('Aivacol API')
  .setDescription('API de Gestão de Frota')
  .setVersion('1.0')
  .addBearerAuth(
    { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    JWT_AUTH_SCHEME,
  )
  .build();

export function setupSwagger(app: INestApplication, path: string): void {
  const document = SwaggerModule.createDocument(app, swaggerDocumentConfig);
  SwaggerModule.setup(path, app, document);
}
