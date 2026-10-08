import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ProfileEntity } from './profile.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'USER_PROFILE' })
export class UserProfileEntity {
  @PrimaryColumn({ name: 'USER_ID', type: 'number' })
  userId!: number;

  @PrimaryColumn({ name: 'PROFILE_CODE', type: 'varchar2', length: 30 })
  profileCode!: string;

  @ManyToOne(() => UserEntity, (user) => user.userProfiles)
  @JoinColumn({ name: 'USER_ID', referencedColumnName: 'id' })
  user!: UserEntity;

  @ManyToOne(() => ProfileEntity)
  @JoinColumn({ name: 'PROFILE_CODE', referencedColumnName: 'code' })
  profile!: ProfileEntity;
}
