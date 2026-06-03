import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import type { EntityId } from '../../../common/types/entity-id.type';

export abstract class BaseEntity {
  @PrimaryColumn('uuid')
  id: EntityId;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: EntityId;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: unknown;

  @BeforeInsert()
  assignId(): void {
    if (!this.id) {
      this.id = uuidv7();
    }
  }
}
