import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'ORGANIZATIONAL_UNIT' })
export class OrganizationalUnitEntity {
  @PrimaryGeneratedColumn({ name: 'ID', type: 'number' })
  id!: number;

  @Column({ name: 'CODE', type: 'varchar2', length: 32, unique: true })
  code!: string;

  @Column({ name: 'NAME', type: 'varchar2', length: 200 })
  name!: string;

  @Column({ name: 'PARENT_UNIT_ID', type: 'number', nullable: true })
  parentUnitId!: number | null;

  @Column({ name: 'IS_ACTIVE', type: 'number', precision: 1, default: 1 })
  isActive!: number;

  @ManyToOne(() => OrganizationalUnitEntity, (unit) => unit.children, { nullable: true })
  @JoinColumn({ name: 'PARENT_UNIT_ID' })
  parent?: OrganizationalUnitEntity | null;

  @OneToMany(() => OrganizationalUnitEntity, (unit) => unit.parent)
  children?: OrganizationalUnitEntity[];
}
