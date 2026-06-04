import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { UserRole } from '../../users/enums/user-role.enum';
import { InteractionAuditService } from '../services/interaction-audit.service';
import { AuditInterceptor } from './audit.interceptor';

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let recordMock: jest.Mock;

  const createHttpContext = (options: {
    method?: string;
    path?: string;
    statusCode?: number;
    user?: {
      id: string;
      email: string;
      role: UserRole;
    };
  }): ExecutionContext => {
    const response = { statusCode: options.statusCode ?? 200 };
    const request = {
      method: options.method ?? 'GET',
      path: options.path ?? '/api/v1/vehicles',
      user: options.user,
    };

    return {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as ExecutionContext;
  };

  const createHandler = (error?: Error): CallHandler => ({
    handle: () => (error ? throwError(() => error) : of({ ok: true })),
  });

  beforeEach(async () => {
    recordMock = jest.fn().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditInterceptor,
        {
          provide: InteractionAuditService,
          useValue: { record: recordMock },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'swagger.path' ? 'api/docs' : undefined,
            ),
          },
        },
      ],
    }).compile();

    interceptor = module.get(AuditInterceptor);
  });

  it('records interaction after successful request', (done) => {
    const context = createHttpContext({
      method: 'POST',
      path: '/api/v1/models',
      statusCode: 201,
      user: {
        id: '018f1234-5678-7890-abcd-ef1234567890',
        email: 'admin@aivacol.com',
        role: UserRole.Admin,
      },
    });

    interceptor.intercept(context, createHandler()).subscribe({
      complete: () => {
        expect(recordMock).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'POST',
            path: '/api/v1/models',
            statusCode: 201,
            userId: '018f1234-5678-7890-abcd-ef1234567890',
            userEmail: 'admin@aivacol.com',
            userRole: UserRole.Admin,
            durationMs: expect.any(Number),
          }),
        );
        done();
      },
    });
  });

  it('records interaction when handler throws', (done) => {
    const context = createHttpContext({
      method: 'GET',
      path: '/api/v1/vehicles/unknown',
      statusCode: 404,
    });

    interceptor
      .intercept(context, createHandler(new Error('not found')))
      .subscribe({
        error: () => {
          expect(recordMock).toHaveBeenCalledWith(
            expect.objectContaining({
              method: 'GET',
              path: '/api/v1/vehicles/unknown',
              statusCode: 404,
              userId: null,
              userEmail: null,
              userRole: null,
            }),
          );
          done();
        },
      });
  });

  it('skips Swagger documentation paths', (done) => {
    const context = createHttpContext({ path: '/api/docs' });

    interceptor.intercept(context, createHandler()).subscribe({
      complete: () => {
        expect(recordMock).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('passes through non-http contexts without recording', (done) => {
    const context = {
      getType: () => 'rpc',
      switchToHttp: jest.fn(),
    } as unknown as ExecutionContext;

    interceptor.intercept(context, createHandler()).subscribe({
      complete: () => {
        expect(recordMock).not.toHaveBeenCalled();
        done();
      },
    });
  });
});
