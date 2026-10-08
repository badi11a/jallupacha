import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'SECURITY_EVENT' })
export class SecurityEventEntity {
  @PrimaryGeneratedColumn({ name: 'ID', type: 'number' })
  id!: number;

  @CreateDateColumn({ name: 'CREATED_AT', type: 'timestamp with time zone' })
  createdAt!: Date;

  @Column({ name: 'ACTOR_USER_ID', type: 'number', nullable: true })
  actorUserId!: number | null;

  @Column({ name: 'EVENT', type: 'varchar2', length: 40 })
  event!: string;

  @Column({ name: 'RESULT', type: 'varchar2', length: 20 })
  result!: string;
}
