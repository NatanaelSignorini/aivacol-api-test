import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import * as amqp from 'amqplib';
import { UserRole } from '../../users/enums/user-role.enum';
import { AuditEventRoutingKey } from '../constants/audit-events.constants';
import type { InteractionAuditRecord } from '../interfaces/interaction-audit.interface';
import { InteractionAuditPublisher } from './interaction-audit.publisher';

jest.mock('amqplib');

const auditRecord: InteractionAuditRecord = {
  occurredAt: '2026-06-04T12:00:00.000Z',
  method: 'POST',
  path: '/api/v1/vehicles',
  statusCode: 201,
  durationMs: 45,
  userId: '018f1234-5678-7890-abcd-ef1234567890',
  userEmail: 'admin@aivacol.com',
  userRole: UserRole.Admin,
};

describe('InteractionAuditPublisher', () => {
  let publisher: InteractionAuditPublisher;
  let publishMock: jest.Mock;
  let assertExchangeMock: jest.Mock;
  let assertQueueMock: jest.Mock;
  let bindQueueMock: jest.Mock;

  const createModule = async (rabbitmq: Record<string, unknown> = {}) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InteractionAuditPublisher,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, unknown> = {
                'rabbitmq.url':
                  rabbitmq.url ?? 'amqp://guest:guest@localhost:5672',
                'rabbitmq.auditExchange':
                  rabbitmq.auditExchange ?? 'aivacol.audit',
                'rabbitmq.auditQueue':
                  rabbitmq.auditQueue ?? 'aivacol.audit.interactions',
              };
              return map[key];
            }),
          },
        },
      ],
    }).compile();

    return module.get(InteractionAuditPublisher);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    publishMock = jest.fn().mockReturnValue(true);
    assertExchangeMock = jest.fn().mockResolvedValue(undefined);
    assertQueueMock = jest.fn().mockResolvedValue(undefined);
    bindQueueMock = jest.fn().mockResolvedValue(undefined);

    (amqp.connect as jest.Mock).mockResolvedValue({
      createChannel: jest.fn().mockResolvedValue({
        assertExchange: assertExchangeMock,
        assertQueue: assertQueueMock,
        bindQueue: bindQueueMock,
        publish: publishMock,
        close: jest.fn().mockResolvedValue(undefined),
      }),
      close: jest.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('declares exchange, queue and binding on init', async () => {
    publisher = await createModule();
    await publisher.onModuleInit();

    expect(assertExchangeMock).toHaveBeenCalledWith('aivacol.audit', 'topic', {
      durable: true,
    });
    expect(assertQueueMock).toHaveBeenCalledWith('aivacol.audit.interactions', {
      durable: true,
    });
    expect(bindQueueMock).toHaveBeenCalledWith(
      'aivacol.audit.interactions',
      'aivacol.audit',
      AuditEventRoutingKey.InteractionRecord,
    );
  });

  it('publishes audit record with routing key', async () => {
    publisher = await createModule();
    await publisher.onModuleInit();

    const published = await publisher.publish(auditRecord);

    expect(published).toBe(true);
    expect(publishMock).toHaveBeenCalledWith(
      'aivacol.audit',
      AuditEventRoutingKey.InteractionRecord,
      expect.any(Buffer),
      { contentType: 'application/json', persistent: true },
    );

    const body = JSON.parse(publishMock.mock.calls[0][2].toString()) as {
      method: string;
      path: string;
    };

    expect(body.method).toBe('POST');
    expect(body.path).toBe('/api/v1/vehicles');
  });

  it('returns false when connection fails on init', async () => {
    (amqp.connect as jest.Mock).mockRejectedValueOnce(
      new Error('connection refused'),
    );

    publisher = await createModule();
    await publisher.onModuleInit();

    expect(Logger.prototype.error).toHaveBeenCalled();
    expect(await publisher.publish(auditRecord)).toBe(false);
  });

  it('returns false when publish buffer is full', async () => {
    publishMock.mockReturnValueOnce(false);
    publisher = await createModule();
    await publisher.onModuleInit();

    const published = await publisher.publish(auditRecord);

    expect(published).toBe(false);
    expect(Logger.prototype.warn).toHaveBeenCalledWith(
      expect.stringContaining('RabbitMQ buffer full'),
    );
  });

  it('returns false on publish errors without throwing', async () => {
    publishMock.mockImplementationOnce(() => {
      throw new Error('publish failed');
    });
    publisher = await createModule();
    await publisher.onModuleInit();

    await expect(publisher.publish(auditRecord)).resolves.toBe(false);
    expect(Logger.prototype.error).toHaveBeenCalled();
  });

  it('closes channel and connection on module destroy', async () => {
    const channelClose = jest.fn().mockResolvedValue(undefined);
    const connectionClose = jest.fn().mockResolvedValue(undefined);

    (amqp.connect as jest.Mock).mockResolvedValueOnce({
      createChannel: jest.fn().mockResolvedValue({
        assertExchange: assertExchangeMock,
        assertQueue: assertQueueMock,
        bindQueue: bindQueueMock,
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
