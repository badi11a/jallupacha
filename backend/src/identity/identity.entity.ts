import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity({ name: 'USER_IDENTITY' })
export class IdentityEntity {
  @PrimaryColumn({ name: 'USER_ID', type: 'number' })
  userId!: number;

  @Column({ name: 'DISPLAY_NAME', type: 'varchar2', length: 120 })
  displayName!: string;

  @Column({ name: 'EMAIL', type: 'varchar2', length: 254 })
  email!: string;

  @Column({ name: 'PROVIDER', type: 'varchar2', length: 20 })
  provider!: string;

  @OneToOne(() => UserEntity)
  @JoinColumn({ name: 'USER_ID', referencedColumnName: 'id' })
  user!: UserEntity;
}
