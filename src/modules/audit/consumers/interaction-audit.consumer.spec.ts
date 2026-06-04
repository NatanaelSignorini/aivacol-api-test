import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import type { ConsumeMessage } from 'amqplib';
import * as amqp from 'amqplib';
import { AuditEventRoutingKey } from '../constants/audit-events.constants';
import type { InteractionAuditRecord } from '../interfaces/interaction-audit.interface';
import { InteractionAuditService } from '../services/interaction-audit.service';
import { InteractionAuditConsumer } from './interaction-audit.consumer';

jest.mock('amqplib');

const auditRecord: InteractionAuditRecord = {
  occurredAt: '2026-06-04T12:00:00.000Z',
  method: 'GET',
  path: '/api/v1/vehicles',
  statusCode: 200,
  durationMs: 12,
  userId: null,
  userEmail: null,
  userRole: null,
};

describe('InteractionAuditConsumer', () => {
  let consumer: InteractionAuditConsumer;
  let persistToMongoMock: jest.Mock;
  let consumeMock: jest.Mock;
  let ackMock: jest.Mock;
  let nackMock: jest.Mock;
  let prefetchMock: jest.Mock;
  let messageHandler: ((message: ConsumeMessage | null) => void) | null = null;

  const createMessage = (payload: unknown): ConsumeMessage =>
    ({
      content: Buffer.from(JSON.stringify(payload)),
    }) as ConsumeMessage;

  const createModule = async (config: Record<string, unknown> = {}) => {
    persistToMongoMock = jest.fn().mockResolvedValue(true);
    ackMock = jest.fn();
    nackMock = jest.fn();
    prefetchMock = jest.fn().mockResolvedValue(undefined);
    consumeMock = jest.fn().mockImplementation((_queue, handler) => {
      messageHandler = handler;
      return Promise.resolve({ consumerTag: 'audit-consumer-tag' });
    });

    (amqp.connect as jest.Mock).mockResolvedValue({
      createChannel: jest.fn().mockResolvedValue({
        prefetch: prefetchMock,
        assertExchange: jest.fn().mockResolvedValue(undefined),
        assertQueue: jest.fn().mockResolvedValue(undefined),
        bindQueue: jest.fn().mockResolvedValue(undefined),
        consume: consumeMock,
        cancel: jest.fn().mockResolvedValue(undefined),
        ack: ackMock,
        nack: nackMock,
        close: jest.fn().mockResolvedValue(undefined),
      }),
      close: jest.fn().mockResolvedValue(undefined),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InteractionAuditConsumer,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, unknown> = {
                'rabbitmq.url':
                  config.url ?? 'amqp://guest:guest@localhost:5672',
                'rabbitmq.auditExchange':
                  config.auditExchange ?? 'aivacol.audit',
                'rabbitmq.auditQueue':
                  config.auditQueue ?? 'aivacol.audit.interactions',
              };
              return map[key];
            }),
          },
        },
        {
          provide: InteractionAuditService,
          useValue: {
            persistToMongo: persistToMongoMock,
          },
        },
      ],
    }).compile();

    return module.get(InteractionAuditConsumer);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    messageHandler = null;
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('starts consuming on init', async () => {
    consumer = await createModule();
    await consumer.onModuleInit();

    expect(prefetchMock).toHaveBeenCalledWith(10);
    expect(consumeMock).toHaveBeenCalledWith(
      'aivacol.audit.interactions',
      expect.any(Function),
    );
    expect(messageHandler).not.toBeNull();
  });

  it('acks message after successful persistence', async () => {
    consumer = await createModule();
    await consumer.onModuleInit();

    messageHandler?.(createMessage(auditRecord));
    await new Promise((resolve) => setImmediate(resolve));

    expect(persistToMongoMock).toHaveBeenCalledWith(auditRecord);
    expect(ackMock).toHaveBeenCalled();
    expect(nackMock).not.toHaveBeenCalled();
  });

  it('nacks invalid messages without requeue', async () => {
    consumer = await createModule();
    await consumer.onModuleInit();

    messageHandler?.(createMessage({ method: 'GET' }));
    await new Promise((resolve) => setImmediate(resolve));

    expect(persistToMongoMock).not.toHaveBeenCalled();
    expect(nackMock).toHaveBeenCalledWith(expect.anything(), false, false);
    expect(Logger.prototype.error).toHaveBeenCalled();
  });

  it('requeues message when MongoDB persistence fails', async () => {
    consumer = await createModule();
    persistToMongoMock.mockResolvedValueOnce(false);
    await consumer.onModuleInit();

    messageHandler?.(createMessage(auditRecord));
    await new Promise((resolve) => setImmediate(resolve));

    expect(nackMock).toHaveBeenCalledWith(expect.anything(), false, true);
    expect(ackMock).not.toHaveBeenCalled();
  });

  it('binds queue to audit routing key on init', async () => {
    const bindQueueMock = jest.fn().mockResolvedValue(undefined);

    (amqp.connect as jest.Mock).mockResolvedValueOnce({
      createChannel: jest.fn().mockResolvedValue({
        prefetch: prefetchMock,
        assertExchange: jest.fn().mockResolvedValue(undefined),
        assertQueue: jest.fn().mockResolvedValue(undefined),
        bindQueue: bindQueueMock,
        consume: consumeMock,
        cancel: jest.fn().mockResolvedValue(undefined),
        ack: ackMock,
        nack: nackMock,
        close: jest.fn().mockResolvedValue(undefined),
      }),
      close: jest.fn().mockResolvedValue(undefined),
    });

    consumer = await createModule();
    await consumer.onModuleInit();

    expect(bindQueueMock).toHaveBeenCalledWith(
      'aivacol.audit.interactions',
      'aivacol.audit',
      AuditEventRoutingKey.InteractionRecord,
    );
  });

  it('logs and skips consuming when connection fails on init', async () => {
    (amqp.connect as jest.Mock).mockRejectedValueOnce(
      new Error('connection refused'),
    );

    consumer = await createModule();
    await consumer.onModuleInit();

    expect(Logger.prototype.error).toHaveBeenCalled();
    expect(consumeMock).not.toHaveBeenCalled();
  });
});
