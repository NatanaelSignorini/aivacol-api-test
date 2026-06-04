import { JWT_AUTH_SCHEME, swaggerDocumentConfig } from './swagger.config';

describe('swaggerDocumentConfig', () => {
  it('defines API metadata and JWT bearer scheme', () => {
    expect(swaggerDocumentConfig.info.title).toBe('Aivacol API');
    expect(swaggerDocumentConfig.info.description).toBe(
      'API de Gestão de Frota',
    );
    expect(swaggerDocumentConfig.info.version).toBe('1.0');
    expect(swaggerDocumentConfig.components?.securitySchemes).toEqual(
      expect.objectContaining({
        [JWT_AUTH_SCHEME]: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      }),
    );
  });
});
