import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ProcessVersionEntity } from './process-version.entity';

@Entity({ name: 'PROCESS' })
export class ProcessEntity {
  @PrimaryGeneratedColumn({ name: 'ID', type: 'number' })
  id!: number;

  @Column({ name: 'CODE', type: 'varchar2', length: 32, unique: true })
  code!: string;

  @Column({ name: 'CURRENT_VERSION_ID', type: 'number', nullable: true })
  currentVersionId!: number | null;

  @Column({ name: 'IS_ACTIVE', type: 'number', precision: 1, default: 1 })
  isActive!: number;

  @OneToOne(() => ProcessVersionEntity, { nullable: true })
  @JoinColumn({ name: 'CURRENT_VERSION_ID' })
  currentVersion?: ProcessVersionEntity | null;
}
