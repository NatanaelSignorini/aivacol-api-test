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
  VEHICLE_EVENTS_EXCHANGE_DEFAULT,
  VehicleEventRoutingKey,
} from '../constants/vehicle-events.constants';
import type { VehicleResponseDto } from '../dto/vehicle-response.dto';
import type { VehicleEventMessage } from '../interfaces/vehicle-event-message.interface';

@Injectable()
export class VehicleEventsPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VehicleEventsPublisher.name);
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  constructor(private readonly configService: ConfigService) {}

  /** Nome do exchange topic para eventos de veículos. */
  private get exchange(): string {
    return (
      this.configService.get<string>('rabbitmq.exchange') ??
      VEHICLE_EVENTS_EXCHANGE_DEFAULT
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
   * Conecta ao RabbitMQ e declara exchange topic durável.
   * Falhas são logadas; CRUD de veículos continua sem publicação.
   */
  async onModuleInit(): Promise<void> {
    try {
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange(this.exchange, 'topic', {
        durable: true,
      });
      this.logger.log(`RabbitMQ connected; exchange "${this.exchange}" ready`);
    } catch (error) {
      this.logger.error(
        'Failed to connect to RabbitMQ; vehicle events will not be published',
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

  /** Publica evento `vehicle.created` com snapshot do veículo. */
  async publishCreated(vehicle: VehicleResponseDto): Promise<void> {
    await this.publish(VehicleEventRoutingKey.Created, vehicle);
  }

  /** Publica evento `vehicle.updated` com snapshot atualizado. */
  async publishUpdated(vehicle: VehicleResponseDto): Promise<void> {
    await this.publish(VehicleEventRoutingKey.Updated, vehicle);
  }

  /** Publica evento `vehicle.deleted` com snapshot pré-remoção. */
  async publishDeleted(vehicle: VehicleResponseDto): Promise<void> {
    await this.publish(VehicleEventRoutingKey.Deleted, vehicle);
  }

  /** Serializa mensagem JSON persistente no exchange com routing key do evento. */
  private async publish(
    eventType: VehicleEventRoutingKey,
    vehicle: VehicleResponseDto,
  ): Promise<void> {
    if (!this.channel) {
      return;
    }

    const message: VehicleEventMessage = {
      eventType,
      occurredAt: new Date().toISOString(),
      vehicle,
    };

    try {
      const published = this.channel.publish(
        this.exchange,
        eventType,
        Buffer.from(JSON.stringify(message)),
        { contentType: 'application/json', persistent: true },
      );

      if (!published) {
        this.logger.warn(
          `RabbitMQ buffer full; dropped ${eventType} for vehicle ${vehicle.id}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to publish ${eventType} for vehicle ${vehicle.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
