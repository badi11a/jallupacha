import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'PROCESS_VERSION' })
export class ProcessVersionEntity {
  @PrimaryGeneratedColumn({ name: 'ID', type: 'number' })
  id!: number;

  @Column({ name: 'PROCESS_ID', type: 'number' })
  processId!: number;

  @Column({ name: 'VERSION_NUMBER', type: 'number' })
  versionNumber!: number;

  @Column({ name: 'STATUS', type: 'varchar2', length: 20 })
  status!: string;

  @Column({ name: 'MACROPROCESS_ID', type: 'number' })
  macroprocessId!: number;

  @Column({ name: 'PROCESS_TYPE_ID', type: 'number' })
  processTypeId!: number;

  @Column({ name: 'PARENT_PROCESS_ID', type: 'number', nullable: true })
  parentProcessId!: number | null;

  @Column({ name: 'NAME', type: 'varchar2', length: 250, nullable: true })
  name!: string | null;

  @Column({ name: 'ALIAS', type: 'varchar2', length: 250, nullable: true })
  alias!: string | null;

  @Column({ name: 'DESCRIPTION', type: 'clob', nullable: true })
  description!: string | null;

  @Column({ name: 'OBJECTIVE', type: 'clob', nullable: true })
  objective!: string | null;

  @Column({ name: 'SCOPE', type: 'clob', nullable: true })
  scope!: string | null;

  @Column({ name: 'INPUTS', type: 'clob', nullable: true })
  inputs!: string | null;

  @Column({ name: 'OUTPUTS', type: 'clob', nullable: true })
  outputs!: string | null;

  @Column({ name: 'SUPPLIERS', type: 'clob', nullable: true })
  suppliers!: string | null;

  @Column({ name: 'CLIENTS', type: 'clob', nullable: true })
  clients!: string | null;

  @Column({ name: 'INVOLVED_PARTIES', type: 'clob', nullable: true })
  involvedParties!: string | null;

  @Column({ name: 'STARTS_WHEN', type: 'clob', nullable: true })
  startsWhen!: string | null;

  @Column({ name: 'ENDS_WHEN', type: 'clob', nullable: true })
  endsWhen!: string | null;

  @Column({ name: 'DEVELOPMENT_PLAN', type: 'clob', nullable: true })
  developmentPlan!: string | null;

  @Column({ name: 'OPERATION', type: 'clob', nullable: true })
  operation!: string | null;

  @Column({ name: 'DESIGN', type: 'clob', nullable: true })
  design!: string | null;

  @Column({ name: 'VALIDATION', type: 'clob', nullable: true })
  validation!: string | null;

  @Column({ name: 'BUSINESS_AREA', type: 'varchar2', length: 250, nullable: true })
  businessArea!: string | null;

  @Column({ name: 'SUBPROCESS_TYPE', type: 'varchar2', length: 250, nullable: true })
  subprocessType!: string | null;

  @Column({ name: 'CRITICALITY', type: 'varchar2', length: 250, nullable: true })
  criticality!: string | null;

  @Column({ name: 'AUTOMATION_LEVEL', type: 'varchar2', length: 250, nullable: true })
  automationLevel!: string | null;

  @Column({ name: 'PERIODICITY', type: 'varchar2', length: 250, nullable: true })
  periodicity!: string | null;

  @Column({ name: 'REVISION', type: 'number', default: 1 })
  revision!: number;
}
