import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'RISK_TYPE' })
export class RiskTypeEntity {
  @PrimaryGeneratedColumn({ name: 'ID', type: 'number' })
  id!: number;

  @Column({ name: 'NAME', type: 'varchar2', length: 120, unique: true })
  name!: string;

  @Column({ name: 'IS_ACTIVE', type: 'number', precision: 1, default: 1 })
  isActive!: number;
}
