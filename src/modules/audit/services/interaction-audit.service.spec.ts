import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { MongoClient } from 'mongodb';
import { UserRole } from '../../users/enums/user-role.enum';
import { INTERACTION_AUDIT_COLLECTION } from '../constants/audit.constants';
import { InteractionAuditService } from './interaction-audit.service';

jest.mock('mongodb');

describe('InteractionAuditService', () => {
  let service: InteractionAuditService;
  let insertOneMock: jest.Mock;
  let createIndexMock: jest.Mock;

  const createModule = async (mongodb: Record<string, unknown>) => {
    insertOneMock = jest.fn().mockResolvedValue({ acknowledged: true });
    createIndexMock = jest.fn().mockResolvedValue('occurredAt_-1');

    const collection = {
      insertOne: insertOneMock,
      createIndex: createIndexMock,
    };

    (MongoClient as jest.Mock).mockImplementation(() => ({
      connect: mongodb.connectFails
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
                'mongodb.enabled': mongodb.enabled ?? false,
                'mongodb.uri': mongodb.uri ?? 'mongodb://localhost:27017',
                'mongodb.database': mongodb.database ?? 'aivacol_audit',
              };
              return map[key];
            }),
          },
        },
      ],
    }).compile();

    return module.get(InteractionAuditService);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not connect when MongoDB is disabled', async () => {
    service = await createModule({ enabled: false });
    await service.onModuleInit();
    await service.record({
      occurredAt: new Date().toISOString(),
      method: 'GET',
      path: '/api/v1/vehicles',
      statusCode: 200,
      durationMs: 12,
      userId: null,
      userEmail: null,
      userRole: null,
    });

    expect(MongoClient).not.toHaveBeenCalled();
    expect(insertOneMock).not.toHaveBeenCalled();
  });

  it('inserts audit document when MongoDB is enabled', async () => {
    service = await createModule({ enabled: true });
    await service.onModuleInit();

    const entry = {
      occurredAt: '2026-06-04T12:00:00.000Z',
      method: 'POST',
      path: '/api/v1/vehicles',
      statusCode: 201,
      durationMs: 45,
      userId: '018f1234-5678-7890-abcd-ef1234567890',
      userEmail: 'admin@aivacol.com',
      userRole: UserRole.Admin,
    };

    await service.record(entry);

    expect(MongoClient).toHaveBeenCalledWith('mongodb://localhost:27017');
    expect(createIndexMock).toHaveBeenCalledWith({ occurredAt: -1 });
    expect(insertOneMock).toHaveBeenCalledWith(entry);
  });

  it('logs and continues when insert fails', async () => {
    service = await createModule({ enabled: true });
    await service.onModuleInit();
    insertOneMock.mockRejectedValueOnce(new Error('write failed'));

    await expect(
      service.record({
        occurredAt: new Date().toISOString(),
        method: 'DELETE',
        path: '/api/v1/vehicles/1',
        statusCode: 204,
        durationMs: 8,
        userId: null,
        userEmail: null,
        userRole: null,
      }),
    ).resolves.toBeUndefined();
  });

  it('uses configured database and collection', async () => {
    service = await createModule({
      enabled: true,
      database: 'custom_audit',
    });
    await service.onModuleInit();

    const clientInstance = (MongoClient as jest.Mock).mock.results[0].value as {
      db: jest.Mock;
    };

    expect(clientInstance.db).toHaveBeenCalledWith('custom_audit');
    expect(clientInstance.db().collection).toHaveBeenCalledWith(
      INTERACTION_AUDIT_COLLECTION,
    );
  });

  it('logs and skips recording when MongoDB connection fails', async () => {
    service = await createModule({ enabled: true, connectFails: true });
    await service.onModuleInit();

    await service.record({
      occurredAt: new Date().toISOString(),
      method: 'GET',
      path: '/api/v1/vehicles',
      statusCode: 200,
      durationMs: 1,
      userId: null,
      userEmail: null,
      userRole: null,
    });

    expect(Logger.prototype.error).toHaveBeenCalled();
    expect(insertOneMock).not.toHaveBeenCalled();
  });

  it('closes client on module destroy', async () => {
    service = await createModule({ enabled: true });
    await service.onModuleInit();

    const clientInstance = (MongoClient as jest.Mock).mock.results[0].value as {
      close: jest.Mock;
    };

    await service.onModuleDestroy();

    expect(clientInstance.close).toHaveBeenCalled();
  });
});
