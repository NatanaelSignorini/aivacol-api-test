import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { MongoClient } from 'mongodb';
import { UserRole } from '../../users/enums/user-role.enum';
import { INTERACTION_AUDIT_COLLECTION } from '../constants/audit.constants';
import { InteractionAuditPublisher } from '../publishers/interaction-audit.publisher';
import { InteractionAuditService } from './interaction-audit.service';

jest.mock('mongodb');

describe('InteractionAuditService', () => {
  let service: InteractionAuditService;
  let insertOneMock: jest.Mock;
  let createIndexMock: jest.Mock;
  let publishMock: jest.Mock;

  const createModule = async (config: Record<string, unknown> = {}) => {
    insertOneMock = jest.fn().mockResolvedValue({ acknowledged: true });
    createIndexMock = jest.fn().mockResolvedValue('occurredAt_-1');
    publishMock = jest.fn().mockResolvedValue(config.publishResult ?? true);

    const collection = {
      insertOne: insertOneMock,
      createIndex: createIndexMock,
    };

    (MongoClient as jest.Mock).mockImplementation(() => ({
      connect: config.connectFails
        ? jest.fn().mockRejectedValue(new Error('connection refused'))
        : jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      db: jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue(collection),
      }),
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InteractionAuditService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, unknown> = {
                'mongodb.uri': config.uri ?? 'mongodb://localhost:27017',
                'mongodb.database': config.database ?? 'aivacol_audit',
              };
              return map[key];
            }),
          },
        },
        {
          provide: InteractionAuditPublisher,
          useValue: {
            publish: publishMock,
          },
        },
      ],
    }).compile();

    return module.get(InteractionAuditService);
  };

  const sampleEntry = {
    occurredAt: '2026-06-04T12:00:00.000Z',
    method: 'POST',
    path: '/api/v1/vehicles',
    statusCode: 201,
    durationMs: 45,
    userId: '018f1234-5678-7890-abcd-ef1234567890',
    userEmail: 'admin@aivacol.com',
    userRole: UserRole.Admin,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('connects to MongoDB on init', async () => {
    service = await createModule();
    await service.onModuleInit();
    await service.record(sampleEntry);

    expect(MongoClient).toHaveBeenCalledWith('mongodb://localhost:27017');
    expect(createIndexMock).toHaveBeenCalledWith({ occurredAt: -1 });
  });

  it('publishes to RabbitMQ and skips direct insert on success', async () => {
    service = await createModule({ publishResult: true });
    await service.onModuleInit();
    await service.record(sampleEntry);

    expect(publishMock).toHaveBeenCalledWith(sampleEntry);
    expect(insertOneMock).not.toHaveBeenCalled();
  });

  it('falls back to MongoDB when publish fails', async () => {
    service = await createModule({ publishResult: false });
    await service.onModuleInit();
    await service.record(sampleEntry);

    expect(publishMock).toHaveBeenCalledWith(sampleEntry);
    expect(Logger.prototype.warn).toHaveBeenCalledWith(
      expect.stringContaining('Falling back to direct MongoDB write'),
    );
    expect(insertOneMock).toHaveBeenCalledWith(sampleEntry);
  });

  it('persistToMongo returns true on successful insert', async () => {
    service = await createModule();
    await service.onModuleInit();

    await expect(service.persistToMongo(sampleEntry)).resolves.toBe(true);
    expect(insertOneMock).toHaveBeenCalledWith(sampleEntry);
  });

  it('persistToMongo returns false when insert fails', async () => {
    service = await createModule();
    await service.onModuleInit();
    insertOneMock.mockRejectedValueOnce(new Error('write failed'));

    await expect(service.persistToMongo(sampleEntry)).resolves.toBe(false);
  });

  it('uses configured database and collection', async () => {
    service = await createModule({ database: 'custom_audit' });
    await service.onModuleInit();

    const clientInstance = (MongoClient as jest.Mock).mock.results[0].value as {
      db: jest.Mock;
    };

    expect(clientInstance.db).toHaveBeenCalledWith('custom_audit');
    expect(clientInstance.db().collection).toHaveBeenCalledWith(
      INTERACTION_AUDIT_COLLECTION,
    );
  });

  it('persistToMongo returns false when MongoDB connection fails', async () => {
    service = await createModule({ connectFails: true });
    await service.onModuleInit();

    await expect(service.persistToMongo(sampleEntry)).resolves.toBe(false);
    expect(Logger.prototype.error).toHaveBeenCalled();
    expect(insertOneMock).not.toHaveBeenCalled();
  });

  it('closes client on module destroy', async () => {
    service = await createModule();
    await service.onModuleInit();

    const clientInstance = (MongoClient as jest.Mock).mock.results[0].value as {
      close: jest.Mock;
    };

    await service.onModuleDestroy();

    expect(clientInstance.close).toHaveBeenCalled();
  });
});
