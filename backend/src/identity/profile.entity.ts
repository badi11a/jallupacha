import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'APP_PROFILE' })
export class ProfileEntity {
  @PrimaryColumn({ name: 'CODE', type: 'varchar2', length: 30 })
  code!: string;

  @Column({ name: 'NAME', type: 'varchar2', length: 80 })
  name!: string;
}
