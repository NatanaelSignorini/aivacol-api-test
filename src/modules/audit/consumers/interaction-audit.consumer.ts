import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import * as amqp from 'amqplib';
import {
  AUDIT_EVENTS_EXCHANGE_DEFAULT,
  AUDIT_EVENTS_QUEUE_DEFAULT,
  AuditEventRoutingKey,
} from '../constants/audit-events.constants';
import type { InteractionAuditRecord } from '../interfaces/interaction-audit.interface';
import { InteractionAuditService } from '../services/interaction-audit.service';

const CONSUMER_PREFETCH = 10;

@Injectable()
export class InteractionAuditConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InteractionAuditConsumer.name);
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private consumerTag: string | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: InteractionAuditService,
  ) {}

  private get exchange(): string {
    return (
      this.configService.get<string>('rabbitmq.auditExchange') ??
      AUDIT_EVENTS_EXCHANGE_DEFAULT
    );
  }

  private get queue(): string {
    return (
      this.configService.get<string>('rabbitmq.auditQueue') ??
      AUDIT_EVENTS_QUEUE_DEFAULT
    );
  }

  private get url(): string {
    return (
      this.configService.get<string>('rabbitmq.url') ??
      'amqp://guest:guest@localhost:5672'
    );
  }

  /**
   * Conecta ao RabbitMQ, declara infraestrutura e inicia consumo da fila de audit.
   */
  async onModuleInit(): Promise<void> {
    try {
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();
      await this.channel.prefetch(CONSUMER_PREFETCH);
      await this.channel.assertExchange(this.exchange, 'topic', {
        durable: true,
      });
      await this.channel.assertQueue(this.queue, { durable: true });
      await this.channel.bindQueue(
        this.queue,
        this.exchange,
        AuditEventRoutingKey.InteractionRecord,
      );

      const { consumerTag } = await this.channel.consume(
        this.queue,
        (message) => {
          void this.handleMessage(message);
        },
      );
      this.consumerTag = consumerTag;

      this.logger.log(`RabbitMQ audit consumer started; queue "${this.queue}"`);
    } catch (error) {
      this.logger.error(
        'Failed to start RabbitMQ audit consumer; queued audits will not be persisted',
        error instanceof Error ? error.stack : String(error),
      );
      this.channel = null;
      this.connection = null;
      this.consumerTag = null;
    }
  }

  /** Cancela consumo e fecha conexão AMQP ao desligar o módulo. */
  async onModuleDestroy(): Promise<void> {
    if (this.channel && this.consumerTag) {
      await this.channel.cancel(this.consumerTag).catch(() => undefined);
    }
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
    this.channel = null;
    this.connection = null;
    this.consumerTag = null;
  }

  /** Processa mensagem da fila: persiste no MongoDB ou descarta/requeue conforme erro. */
  private async handleMessage(message: ConsumeMessage | null): Promise<void> {
    if (!message || !this.channel) {
      return;
    }

    let record: InteractionAuditRecord;

    try {
      record = JSON.parse(message.content.toString()) as InteractionAuditRecord;
      if (!this.isValidRecord(record)) {
        throw new Error('invalid interaction audit payload');
      }
    } catch (error) {
      this.logger.error(
        'Invalid interaction audit message; discarding',
        error instanceof Error ? error.stack : String(error),
      );
      this.channel.nack(message, false, false);
      return;
    }

    const persisted = await this.auditService.persistToMongo(record);

    if (persisted) {
      this.channel.ack(message);
      return;
    }

    this.channel.nack(message, false, true);
  }

  /** Valida campos mínimos do payload antes de persistir. */
  private isValidRecord(record: InteractionAuditRecord): boolean {
    return (
      typeof record.occurredAt === 'string' &&
      typeof record.method === 'string' &&
      typeof record.path === 'string' &&
      typeof record.statusCode === 'number' &&
      typeof record.durationMs === 'number'
    );
  }
}
