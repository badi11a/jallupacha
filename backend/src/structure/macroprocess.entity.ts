import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { MacroprocessTypeEntity } from './macroprocess-type.entity';

@Entity({ name: 'MACROPROCESS' })
export class MacroprocessEntity {
  @PrimaryGeneratedColumn({ name: 'ID', type: 'number' })
  id!: number;

  @Column({ name: 'MACROPROCESS_TYPE_ID', type: 'number' })
  macroprocessTypeId!: number;

  @Column({ name: 'CODE', type: 'varchar2', length: 32, unique: true })
  code!: string;

  @Column({ name: 'NAME', type: 'varchar2', length: 120 })
  name!: string;

  @Column({ name: 'DESCRIPTION', type: 'clob', nullable: true })
  description!: string | null;

  @Column({ name: 'SORT_ORDER', type: 'number', precision: 6 })
  order!: number;

  @Column({ name: 'IS_ACTIVE', type: 'number', precision: 1, default: 1 })
  isActive!: number;

  @ManyToOne(() => MacroprocessTypeEntity)
  @JoinColumn({ name: 'MACROPROCESS_TYPE_ID' })
  macroprocessType?: MacroprocessTypeEntity;
}
