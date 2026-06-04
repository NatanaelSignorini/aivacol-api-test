import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { InteractionAuditConsumer } from './consumers/interaction-audit.consumer';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { InteractionAuditPublisher } from './publishers/interaction-audit.publisher';
import { InteractionAuditService } from './services/interaction-audit.service';

@Module({
  providers: [
    InteractionAuditPublisher,
    InteractionAuditService,
    InteractionAuditConsumer,
    AuditInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  exports: [InteractionAuditService],
})
export class AuditModule {}
