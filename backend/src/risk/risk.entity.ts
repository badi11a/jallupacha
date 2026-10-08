import { CreateDateColumn, Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

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

  @Column({ name: 'RISK_TYPE_ID', type: 'number' })
  riskTypeId!: number;

  @Column({ name: 'RISK_LEVEL_ID', type: 'number' })
  riskLevelId!: number;

  @Column({ name: 'CREATED_BY_USER_ID', type: 'number' })
  createdByUserId!: number;

  @CreateDateColumn({ name: 'CREATED_AT', type: 'timestamp with time zone' })
  createdAt!: Date;
}
