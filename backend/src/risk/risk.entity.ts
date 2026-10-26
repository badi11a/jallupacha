import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ProcessEntity } from '../process/process.entity';

@Entity({ name: 'PROCESS_RISK' })
export class RiskEntity {
  @PrimaryGeneratedColumn({ name: 'ID', type: 'number' })
  id!: number;

  @Column({ name: 'PROCESS_ID', type: 'number' })
  processId!: number;

  @Column({ name: 'DESCRIPTION', type: 'clob' })
  description!: string;

  @Column({ name: 'CAUSE', type: 'clob' })
  cause!: string;

  @Column({ name: 'CONSEQUENCE', type: 'clob' })
  consequence!: string;

  @Column({ name: 'RISK_TYPE', type: 'varchar2', length: 120 })
  riskType!: string;

  @Column({ name: 'RISK_LEVEL', type: 'varchar2', length: 20 })
  riskLevel!: string;

  @CreateDateColumn({ name: 'CREATED_AT', type: 'timestamp with time zone' })
  createdAt!: Date;

  @ManyToOne(() => ProcessEntity)
  @JoinColumn({ name: 'PROCESS_ID' })
  process?: ProcessEntity;
}
