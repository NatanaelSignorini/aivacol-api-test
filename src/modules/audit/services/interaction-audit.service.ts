import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Collection, MongoClient } from 'mongodb';
import {
  INTERACTION_AUDIT_COLLECTION,
  MONGODB_DATABASE_DEFAULT,
  MONGODB_URI_DEFAULT,
} from '../constants/audit.constants';
import type {
  InteractionAuditDocument,
  InteractionAuditRecord,
} from '../interfaces/interaction-audit.interface';

@Injectable()
export class InteractionAuditService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InteractionAuditService.name);
  private client: MongoClient | null = null;
  private collection: Collection<InteractionAuditDocument> | null = null;

  constructor(private readonly configService: ConfigService) {}

  private get enabled(): boolean {
    return this.configService.get<boolean>('mongodb.enabled') === true;
  }

  private get uri(): string {
    return this.configService.get<string>('mongodb.uri') ?? MONGODB_URI_DEFAULT;
  }

  private get database(): string {
    return (
      this.configService.get<string>('mongodb.database') ??
      MONGODB_DATABASE_DEFAULT
    );
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      this.client = new MongoClient(this.uri);
      await this.client.connect();
      this.collection = this.client
        .db(this.database)
        .collection<InteractionAuditDocument>(INTERACTION_AUDIT_COLLECTION);
      await this.collection.createIndex({ occurredAt: -1 });
      this.logger.log(
        `MongoDB audit connected; database "${this.database}", collection "${INTERACTION_AUDIT_COLLECTION}"`,
      );
    } catch (error) {
      this.logger.error(
        'Failed to connect to MongoDB; interaction audit will not be recorded',
        error instanceof Error ? error.stack : String(error),
      );
      this.client = null;
      this.collection = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.close().catch(() => undefined);
    this.client = null;
    this.collection = null;
  }

  async record(entry: InteractionAuditRecord): Promise<void> {
    if (!this.enabled || !this.collection) {
      return;
    }

    try {
      await this.collection.insertOne(entry);
    } catch (error) {
      this.logger.error(
        `Failed to record interaction audit for ${entry.method} ${entry.path}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
