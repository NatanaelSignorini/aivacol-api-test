import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import type { EntityId } from '../../../common/types/entity-id.type';
import { BaseEntity } from '../../bases/entities/base.entity';
import { Brand } from '../../brands/entities/brand.entity';

@Entity('models')
export class Model extends BaseEntity {
  @Column()
  name: string;

  @Column({ name: 'brand_id', type: 'uuid' })
  brandId: EntityId;

  @ManyToOne(() => Brand)
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;
}
