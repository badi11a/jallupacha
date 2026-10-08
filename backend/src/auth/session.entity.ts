import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'APP_SESSION' })
export class SessionEntity {
  @PrimaryColumn({ name: 'SESSION_HASH', type: 'char', length: 64 })
  sessionHash!: string;

  @Column({ name: 'USER_ID', type: 'number' })
  userId!: number;

  @Column({ name: 'CSRF_HASH', type: 'char', length: 64 })
  csrfHash!: string;

  @Column({ name: 'LAST_ACTIVITY', type: 'timestamp with time zone' })
  lastActivity!: Date;

  @Column({ name: 'EXPIRES_AT', type: 'timestamp with time zone' })
  expiresAt!: Date;
}
