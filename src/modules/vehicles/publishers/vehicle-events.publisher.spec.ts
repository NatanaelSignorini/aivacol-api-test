import { toUuidV7 } from '../../../common/types/entity-id.type';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import * as amqp from 'amqplib';
import { VehicleEventRoutingKey } from '../constants/vehicle-events.constants';
import type { VehicleResponseDto } from '../dto/vehicle-response.dto';
import { VehicleEventsPublisher } from './vehicle-events.publisher';

jest.mock('amqplib');

const vehicleSnapshot = {
  id: toUuidV7('018f1234-5678-7890-abcd-ef1234567892'),
  licensePlate: 'ABC1D23',
  chassis: '9BWZZZ377VT004251',
  renavam: '12345678901',
  year: 2024,
  model: {
    id: toUuidV7('018f1234-5678-7890-abcd-ef1234567891'),
    name: 'Corolla',
    brand: null,
  },
} as VehicleResponseDto;

describe('VehicleEventsPublisher', () => {
  let publisher: VehicleEventsPublisher;
  let publishMock: jest.Mock;
  let assertExchangeMock: jest.Mock;

  const createModule = async (rabbitmq: Record<string, unknown> = {}) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleEventsPublisher,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, unknown> = {
                'rabbitmq.url':
                  rabbitmq.url ?? 'amqp://guest:guest@localhost:5672',
                'rabbitmq.exchange': rabbitmq.exchange ?? 'aivacol.vehicles',
              };
              return map[key];
            }),
          },
        },
      ],
    }).compile();

    return module.get(VehicleEventsPublisher);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    publishMock = jest.fn().mockReturnValue(true);
    assertExchangeMock = jest.fn().mockResolvedValue(undefined);

    (amqp.connect as jest.Mock).mockResolvedValue({
      createChannel: jest.fn().mockResolvedValue({
        assertExchange: assertExchangeMock,
        publish: publishMock,
        close: jest.fn().mockResolvedValue(undefined),
      }),
      close: jest.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('connects and declares exchange on init', async () => {
    publisher = await createModule();
    await publisher.onModuleInit();
    await publisher.publishCreated(vehicleSnapshot);

    expect(amqp.connect).toHaveBeenCalled();
    expect(assertExchangeMock).toHaveBeenCalledWith(
      'aivacol.vehicles',
      'topic',
      { durable: true },
    );
  });

  it('publishes created event with routing key', async () => {
    publisher = await createModule();
    await publisher.onModuleInit();
    await publisher.publishCreated(vehicleSnapshot);

    expect(assertExchangeMock).toHaveBeenCalledWith(
      'aivacol.vehicles',
      'topic',
      { durable: true },
    );
    expect(publishMock).toHaveBeenCalledWith(
      'aivacol.vehicles',
      VehicleEventRoutingKey.Created,
      expect.any(Buffer),
      { contentType: 'application/json', persistent: true },
    );

    const body = JSON.parse(publishMock.mock.calls[0][2].toString()) as {
      eventType: string;
      vehicle: { id: string };
    };

    expect(body.eventType).toBe(VehicleEventRoutingKey.Created);
    expect(body.vehicle.id).toBe(vehicleSnapshot.id);
  });

  it('publishes updated and deleted routing keys', async () => {
    publisher = await createModule();
    await publisher.onModuleInit();

    await publisher.publishUpdated(vehicleSnapshot);
    await publisher.publishDeleted(vehicleSnapshot);

    expect(publishMock).toHaveBeenNthCalledWith(
      1,
      'aivacol.vehicles',
      VehicleEventRoutingKey.Updated,
      expect.any(Buffer),
      expect.objectContaining({ persistent: true }),
    );
    expect(publishMock).toHaveBeenNthCalledWith(
      2,
      'aivacol.vehicles',
      VehicleEventRoutingKey.Deleted,
      expect.any(Buffer),
      expect.objectContaining({ persistent: true }),
    );
  });

  it('logs and skips publishing when connection fails on init', async () => {
    (amqp.connect as jest.Mock).mockRejectedValueOnce(
      new Error('connection refused'),
    );

    publisher = await createModule();
    await publisher.onModuleInit();
    await publisher.publishCreated(vehicleSnapshot);

    expect(Logger.prototype.error).toHaveBeenCalled();
    expect(publishMock).not.toHaveBeenCalled();
  });

  it('warns when publish buffer is full', async () => {
    publishMock.mockReturnValueOnce(false);
    publisher = await createModule();
    await publisher.onModuleInit();

    await publisher.publishCreated(vehicleSnapshot);

    expect(Logger.prototype.warn).toHaveBeenCalledWith(
      expect.stringContaining(VehicleEventRoutingKey.Created),
    );
  });

  it('logs publish errors without throwing', async () => {
    publishMock.mockImplementationOnce(() => {
      throw new Error('publish failed');
    });
    publisher = await createModule();
    await publisher.onModuleInit();

    await expect(
      publisher.publishUpdated(vehicleSnapshot),
    ).resolves.toBeUndefined();

    expect(Logger.prototype.error).toHaveBeenCalled();
  });

  it('closes channel and connection on module destroy', async () => {
    const channelClose = jest.fn().mockResolvedValue(undefined);
    const connectionClose = jest.fn().mockResolvedValue(undefined);

    (amqp.connect as jest.Mock).mockResolvedValueOnce({
      createChannel: jest.fn().mockResolvedValue({
        assertExchange: assertExchangeMock,
        publish: publishMock,
        close: channelClose,
      }),
      close: connectionClose,
    });

    publisher = await createModule();
    await publisher.onModuleInit();
    await publisher.onModuleDestroy();

    expect(channelClose).toHaveBeenCalled();
    expect(connectionClose).toHaveBeenCalled();
  });
});
