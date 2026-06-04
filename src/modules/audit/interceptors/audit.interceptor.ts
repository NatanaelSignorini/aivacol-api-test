import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { type Observable, tap } from 'rxjs';
import type { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import type { InteractionAuditRecord } from '../interfaces/interaction-audit.interface';
import { InteractionAuditService } from '../services/interaction-audit.service';

type RequestWithUser = Request & { user?: AuthenticatedUser };

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: InteractionAuditService,
    private readonly configService: ConfigService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithUser>();

    if (this.shouldSkip(request)) {
      return next.handle();
    }

    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.persistAudit(request, http.getResponse<Response>(), startedAt);
        },
        error: () => {
          this.persistAudit(request, http.getResponse<Response>(), startedAt);
        },
      }),
    );
  }

  private shouldSkip(request: RequestWithUser): boolean {
    const path = request.path.toLowerCase();
    const swaggerPath =
      this.configService.get<string>('swagger.path') ?? 'api/docs';

    return (
      path.startsWith(`/${swaggerPath.toLowerCase()}`) ||
      path === '/favicon.ico'
    );
  }

  private persistAudit(
    request: RequestWithUser,
    response: Response,
    startedAt: number,
  ): void {
    const entry: InteractionAuditRecord = {
      occurredAt: new Date().toISOString(),
      method: request.method,
      path: request.path,
      statusCode: response.statusCode,
      durationMs: Date.now() - startedAt,
      userId: request.user?.id ?? null,
      userEmail: request.user?.email ?? null,
      userRole: request.user?.role ?? null,
    };

    void this.auditService.record(entry);
  }
}
