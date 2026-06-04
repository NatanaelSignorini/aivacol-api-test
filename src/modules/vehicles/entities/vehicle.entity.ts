import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import type { EntityId } from '../../../common/types/entity-id.type';
import { BaseEntity } from '../../bases/entities/base.entity';
import { Model } from '../../models/entities/model.entity';

@Entity('vehicles')
export class Vehicle extends BaseEntity {
  @Column({ name: 'license_plate', length: 10, unique: true })
  licensePlate: string;

  @Column({ length: 17, unique: true })
  chassis: string;

  @Column({ length: 11, unique: true })
  renavam: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ name: 'model_id', type: 'uuid' })
  modelId: EntityId;

  @ManyToOne(() => Model)
  @JoinColumn({ name: 'model_id' })
  model: Model;
}
