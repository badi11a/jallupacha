import { Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'DEMO_IDENTITY' })
export class DemoIdentityEntity {
  @PrimaryColumn({ name: 'USER_ID', type: 'number' })
  userId!: number;

}
