import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { UserProfileEntity } from './user-profile.entity';

@Entity({ name: 'APP_USER' })
export class UserEntity {
  @PrimaryGeneratedColumn({ name: 'ID', type: 'number' })
  id!: number;

  @Column({ name: 'IS_DEMO', type: 'number', precision: 1, default: 0 })
  isDemo!: number;

  @Column({ name: 'IS_ACTIVE', type: 'number', precision: 1, default: 1 })
  isActive!: number;

  @OneToMany(() => UserProfileEntity, (userProfile) => userProfile.user)
  userProfiles!: UserProfileEntity[];
}
