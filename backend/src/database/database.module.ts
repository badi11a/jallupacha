import { Global, Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { databaseOptions } from '../common/config';

@Global()
@Module({
  providers: [
    { provide: DataSource, useFactory: () => new DataSource(databaseOptions()) },
    { provide: 'DATABASE_SHUTDOWN', inject: [DataSource], useFactory: (source: DataSource) => ({ onModuleDestroy: async () => { if (source.isInitialized) await source.destroy(); } }) }
  ],
  exports: [DataSource]
})
export class DatabaseModule { }
