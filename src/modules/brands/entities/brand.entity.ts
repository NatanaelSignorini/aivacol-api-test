import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../bases/entities/base.entity';

@Entity('brands')
export class Brand extends BaseEntity {
  @Column({ unique: true })
  name: string;
}
