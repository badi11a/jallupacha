import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'PROCESS' })
export class ProcessEntity {
  @PrimaryGeneratedColumn({ name: 'ID', type: 'number' })
  id!: number;

  @Column({ name: 'CODE', type: 'varchar2', length: 32, unique: true })
  code!: string;

  @Column({ name: 'OWNER_USER_ID', type: 'number' })
  ownerUserId!: number;

  @Column({ name: 'CURRENT_VERSION_ID', type: 'number', nullable: true })
  currentVersionId!: number | null;

  @Column({ name: 'IS_ACTIVE', type: 'number', precision: 1, default: 1 })
  isActive!: number;
}
