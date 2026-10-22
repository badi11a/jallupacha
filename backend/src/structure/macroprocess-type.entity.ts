import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'MACROPROCESS_TYPE' })
export class MacroprocessTypeEntity {
  @PrimaryGeneratedColumn({ name: 'ID', type: 'number' })
  id!: number;

  @Column({ name: 'CODE', type: 'varchar2', length: 32, unique: true })
  code!: string;

  @Column({ name: 'NAME', type: 'varchar2', length: 120, unique: true })
  name!: string;

  @Column({ name: 'SORT_ORDER', type: 'number', precision: 6, unique: true })
  sortOrder!: number;

  @Column({ name: 'IS_ACTIVE', type: 'number', precision: 1, default: 1 })
  isActive!: number;
}
