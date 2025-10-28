import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from './database.service';
import { DatabaseController } from './database.controller';

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
  ],
  controllers: [DatabaseController],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
