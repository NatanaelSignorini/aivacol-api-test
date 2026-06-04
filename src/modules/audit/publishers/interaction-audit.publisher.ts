import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Channel, ChannelModel } from 'amqplib';
import * as amqp from 'amqplib';
import {
  AUDIT_EVENTS_EXCHANGE_DEFAULT,
  AUDIT_EVENTS_QUEUE_DEFAULT,
  AuditEventRoutingKey,
} from '../constants/audit-events.constants';
import type { InteractionAuditRecord } from '../interfaces/interaction-audit.interface';

@Injectable()
export class InteractionAuditPublisher
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(InteractionAuditPublisher.name);
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  constructor(private readonly configService: ConfigService) {}

  /** Nome do exchange topic para eventos de auditoria. */
  private get exchange(): string {
    return (
      this.configService.get<string>('rabbitmq.auditExchange') ??
      AUDIT_EVENTS_EXCHANGE_DEFAULT
    );
  }

  /** Nome da fila durável de registros de interação. */
  private get queue(): string {
    return (
      this.configService.get<string>('rabbitmq.auditQueue') ??
      AUDIT_EVENTS_QUEUE_DEFAULT
    );
  }

  /** URL AMQP de conexão com RabbitMQ. */
  private get url(): string {
    return (
      this.configService.get<string>('rabbitmq.url') ??
      'amqp://guest:guest@localhost:5672'
    );
  }

  /**
   * Conecta ao RabbitMQ e declara exchange, fila e binding.
   * Falhas são logadas; a API continua sem publicação de audit.
   */
  async onModuleInit(): Promise<void> {
    try {
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange(this.exchange, 'topic', {
        durable: true,
      });
      await this.channel.assertQueue(this.queue, { durable: true });
      await this.channel.bindQueue(
        this.queue,
        this.exchange,
        AuditEventRoutingKey.InteractionRecord,
      );
      this.logger.log(
        `RabbitMQ audit publisher ready; exchange "${this.exchange}", queue "${this.queue}"`,
      );
    } catch (error) {
      this.logger.error(
        'Failed to connect to RabbitMQ; interaction audit will not be queued',
        error instanceof Error ? error.stack : String(error),
      );
      this.channel = null;
      this.connection = null;
    }
  }

  /** Fecha canal e conexão AMQP ao desligar o módulo. */
  async onModuleDestroy(): Promise<void> {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
    this.channel = null;
    this.connection = null;
  }

  /**
   * Publica registro de auditoria na fila.
   * @returns `true` se a mensagem foi aceita pelo buffer; `false` caso contrário ou sem conexão.
   */
  async publish(record: InteractionAuditRecord): Promise<boolean> {
    if (!this.channel) {
      return false;
    }

    try {
      const published = this.channel.publish(
        this.exchange,
        AuditEventRoutingKey.InteractionRecord,
        Buffer.from(JSON.stringify(record)),
        { contentType: 'application/json', persistent: true },
      );

      if (!published) {
        this.logger.warn(
          `RabbitMQ buffer full; dropped audit for ${record.method} ${record.path}`,
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to publish audit for ${record.method} ${record.path}`,
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }
}
