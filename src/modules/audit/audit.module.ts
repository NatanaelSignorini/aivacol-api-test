import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { InteractionAuditService } from './services/interaction-audit.service';

@Module({
  providers: [
    InteractionAuditService,
    AuditInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  exports: [InteractionAuditService],
})
export class AuditModule {}
