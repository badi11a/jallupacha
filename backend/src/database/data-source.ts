import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { databaseOptions } from '../common/config';

export const AppDataSource = new DataSource(databaseOptions(true) as never);
