import {
  type ArgumentsHost,
  BadRequestException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let configService: jest.Mocked<Pick<ConfigService, 'get'>>;
  let json: jest.Mock;
  let status: jest.Mock;

  const createHost = (url = '/api/v1/test'): ArgumentsHost => {
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });

    return {
      switchToHttp: () => ({
        getResponse: () => ({ status, json }),
        getRequest: () => ({ url, method: 'GET' }),
      }),
    } as unknown as ArgumentsHost;
  };

  beforeEach(() => {
    configService = {
      get: jest.fn().mockReturnValue('test'),
    };
    filter = new HttpExceptionFilter(configService as unknown as ConfigService);
  });

  it('formats HttpException with statusCode, message, error, timestamp, path', () => {
    const host = createHost('/api/v1/missing');

    filter.catch(new NotFoundException('Resource not found'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
        error: 'Not Found',
        path: '/api/v1/missing',
        timestamp: expect.any(String),
      }),
    );
  });

  it('preserves validation error message arrays', () => {
    const host = createHost('/api/v1/auth/login');

    filter.catch(
      new BadRequestException({
        message: ['email must be an email', 'password should not be empty'],
        error: 'Bad Request',
        statusCode: HttpStatus.BAD_REQUEST,
      }),
      host,
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: ['email must be an email', 'password should not be empty'],
        error: 'Bad Request',
      }),
    );
  });

  it('returns generic 500 message for unknown errors in production', () => {
    configService.get.mockReturnValue('production');
    filter = new HttpExceptionFilter(configService as unknown as ConfigService);
    const host = createHost();

    filter.catch(new Error('database connection failed'), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        error: 'INTERNAL_SERVER_ERROR',
      }),
    );
  });

  it('omits stack trace in production', () => {
    configService.get.mockReturnValue('production');
    filter = new HttpExceptionFilter(configService as unknown as ConfigService);
    const host = createHost();

    filter.catch(new Error('secret failure'), host);

    expect(json.mock.calls[0][0]).not.toHaveProperty('stack');
  });

  it('includes stack trace in development for Error instances', () => {
    configService.get.mockReturnValue('development');
    filter = new HttpExceptionFilter(configService as unknown as ConfigService);
    const host = createHost();

    filter.catch(new Error('debug failure'), host);

    expect(json.mock.calls[0][0].stack).toEqual(expect.any(String));
  });

  it('uses exception message for unknown errors outside production', () => {
    configService.get.mockReturnValue('development');
    filter = new HttpExceptionFilter(configService as unknown as ConfigService);
    const host = createHost();

    filter.catch(new Error('debug failure'), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'debug failure',
      }),
    );
  });
});
