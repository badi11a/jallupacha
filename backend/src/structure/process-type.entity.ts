import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { MacroprocessEntity } from './macroprocess.entity';

@Entity({ name: 'PROCESS_TYPE' })
export class ProcessTypeEntity {
  @PrimaryGeneratedColumn({ name: 'ID', type: 'number' })
  id!: number;

  @Column({ name: 'MACROPROCESS_ID', type: 'number' })
  macroprocessId!: number;

  @Column({ name: 'NAME', type: 'varchar2', length: 120 })
  name!: string;

  @Column({ name: 'IS_ACTIVE', type: 'number', precision: 1, default: 1 })
  isActive!: number;

  @ManyToOne(() => MacroprocessEntity)
  @JoinColumn({ name: 'MACROPROCESS_ID' })
  macroprocess?: MacroprocessEntity;
}
