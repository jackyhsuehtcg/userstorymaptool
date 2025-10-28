import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from './database.service';
import { DatabaseController } from './database.controller';
import { MigrationService } from './migrations/migration.service';
import { NodeSchema } from '../story-map/schemas/node.schema';
import { EdgeSchema } from '../story-map/schemas/edge.schema';
import { AuditLogSchema } from '../audit/schemas/audit-log.schema';
import { ApiTokenSchema } from '../tokens/schemas/api-token.schema';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>('database.uri');
        const name = configService.get<string>('database.name');
        const options = configService.get<any>('database.options') || {};
        const connectionPool = configService.get<any>('database.connectionPool') || {};
        const replicaSet = configService.get<string>('database.replicaSet');

        const mongooseOptions: any = {
          dbName: name,
          ...options,
        };

        // Add connection pool settings
        if (connectionPool.minPoolSize !== undefined) {
          mongooseOptions.minPoolSize = connectionPool.minPoolSize;
        }
        if (connectionPool.maxPoolSize !== undefined) {
          mongooseOptions.maxPoolSize = connectionPool.maxPoolSize;
        }

        // Enable sessions for transactions
        mongooseOptions.serverSelectionTimeoutMS = 5000;

        // Add replica set if configured
        if (replicaSet) {
          mongooseOptions.replicaSet = replicaSet;
          // Enable sessions on replica set
          mongooseOptions.retryWrites = true;
        }

        // Enable event listeners for debugging
        mongooseOptions.socketTimeoutMS = 45000;

        return {
          uri,
          ...mongooseOptions,
        };
      },
      inject: [ConfigService],
    }),
    // Register schemas
    MongooseModule.forFeature([
      { name: 'Node', schema: NodeSchema },
      { name: 'Edge', schema: EdgeSchema },
      { name: 'AuditLog', schema: AuditLogSchema },
      { name: 'ApiToken', schema: ApiTokenSchema },
    ]),
  ],
  controllers: [DatabaseController],
  providers: [DatabaseService, MigrationService],
  exports: [DatabaseService, MigrationService],
})
export class DatabaseModule {}
