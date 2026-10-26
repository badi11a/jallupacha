import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ProcessEntity } from './process.entity';

@Entity({ name: 'PROCESS_RELATION' })
export class ProcessRelationEntity {
  @PrimaryGeneratedColumn({ name: 'ID', type: 'number' })
  id!: number;

  @Column({ name: 'ORIGIN_PROCESS_ID', type: 'number' })
  originProcessId!: number;

  @Column({ name: 'DESTINATION_PROCESS_ID', type: 'number' })
  destinationProcessId!: number;

  @Column({ name: 'RELATION_TYPE', type: 'varchar2', length: 20 })
  relationType!: 'FLUJO' | 'DEPENDENCIA' | 'COORDINACION';

  @Column({ name: 'DESCRIPTION', type: 'clob' })
  description!: string;

  @ManyToOne(() => ProcessEntity)
  @JoinColumn({ name: 'ORIGIN_PROCESS_ID' })
  originProcess?: ProcessEntity;

  @ManyToOne(() => ProcessEntity)
  @JoinColumn({ name: 'DESTINATION_PROCESS_ID' })
  destinationProcess?: ProcessEntity;
}
