import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'AUDIT' })
export class AuditEntity {
  @PrimaryGeneratedColumn({ name: 'ID', type: 'number' })
  id!: number;

  @CreateDateColumn({ name: 'CREATED_AT', type: 'timestamp with time zone' })
  createdAt!: Date;

  @Column({ name: 'ACTOR_USER_ID', type: 'number', nullable: true })
  actorUserId!: number | null;

  @Column({ name: 'ACTION', type: 'varchar2', length: 80 })
  action!: string;

  @Column({ name: 'ENTITY_TYPE', type: 'varchar2', length: 40 })
  entityType!: string;

  @Column({ name: 'ENTITY_ID', type: 'varchar2', length: 80 })
  entityId!: string;

  @Column({ name: 'BEFORE_VALUE', type: 'clob', nullable: true })
  beforeValue!: string | null;

  @Column({ name: 'AFTER_VALUE', type: 'clob', nullable: true })
  afterValue!: string | null;
}
