import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'SECURITY_EVENT_IP' })
export class SecurityEventIpEntity {
  @PrimaryColumn({ name: 'SECURITY_EVENT_ID', type: 'number' })
  securityEventId!: number;

  @Column({ name: 'IP_ADDRESS', type: 'varchar2', length: 64 })
  ipAddress!: string;
}
