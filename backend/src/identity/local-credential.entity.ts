import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity({ name: 'LOCAL_CREDENTIAL' })
export class LocalCredentialEntity {
  @PrimaryColumn({ name: 'USER_ID', type: 'number' })
  userId!: number;

  @Column({ name: 'PASSWORD_HASH', type: 'varchar2', length: 255 })
  passwordHash!: string;

  @Column({ name: 'FAILED_ATTEMPTS', type: 'number', precision: 2, default: 0 })
  failedAttempts!: number;

  @Column({ name: 'LOCKED_UNTIL', type: 'timestamp with time zone', nullable: true })
  lockedUntil!: Date | null;

  @UpdateDateColumn({ name: 'PASSWORD_UPDATED_AT', type: 'timestamp with time zone' })
  passwordUpdatedAt!: Date;

  @OneToOne(() => UserEntity)
  @JoinColumn({ name: 'USER_ID' })
  user?: UserEntity;
}
