import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { ErrorResponse } from '../interfaces/error-response.interface';

type HttpExceptionBody =
  | string
  | {
      message?: string | string[];
      error?: string;
      statusCode?: number;
    };

@Catch()
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const isProduction =
      this.configService.get<string>('nodeEnv') === 'production';

    const status = this.resolveStatus(exception);
    const exceptionBody = this.resolveExceptionBody(exception, isProduction);
    const message = this.extractMessage(exceptionBody);
    const error = this.extractError(exceptionBody, status);

    const body: ErrorResponse = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (
      !isProduction &&
      !(exception instanceof HttpException) &&
      exception instanceof Error &&
      exception.stack
    ) {
      body.stack = exception.stack;
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json(body);
  }

  private resolveStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private resolveExceptionBody(
    exception: unknown,
    isProduction: boolean,
  ): HttpExceptionBody {
    if (exception instanceof HttpException) {
      return exception.getResponse() as HttpExceptionBody;
    }

    if (isProduction) {
      return 'Internal server error';
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return 'Internal server error';
  }

  private extractMessage(body: HttpExceptionBody): string | string[] {
    if (typeof body === 'string') {
      return body;
    }

    if (Array.isArray(body.message)) {
      return body.message;
    }

    if (typeof body.message === 'string') {
      return body.message;
    }

    return 'Unexpected error';
  }

  private extractError(body: HttpExceptionBody, status: number): string {
    if (typeof body !== 'string' && typeof body.error === 'string') {
      return body.error;
    }

    return HttpStatus[status] ?? 'Error';
  }
}
