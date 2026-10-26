import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { OrganizationalUnitEntity } from '../structure/organizational-unit.entity';
import { ProcessEntity } from './process.entity';

@Entity({ name: 'PROCESS_UNIT' })
export class ProcessUnitEntity {
  @PrimaryColumn({ name: 'PROCESS_ID', type: 'number' })
  processId!: number;

  @PrimaryColumn({ name: 'UNIT_ID', type: 'number' })
  unitId!: number;

  @Column({ name: 'ROLE', type: 'varchar2', length: 20 })
  role!: 'RESPONSABLE' | 'PARTICIPANTE';

  @Column({ name: 'PARTICIPANT_FUNCTION', type: 'varchar2', length: 500, nullable: true })
  participantFunction!: string | null;

  @ManyToOne(() => ProcessEntity)
  @JoinColumn({ name: 'PROCESS_ID' })
  process?: ProcessEntity;

  @ManyToOne(() => OrganizationalUnitEntity)
  @JoinColumn({ name: 'UNIT_ID' })
  unit?: OrganizationalUnitEntity;
}
