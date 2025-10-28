import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Migration } from './migration.interface';

/**
 * Migration tracking record
 */
interface MigrationRecord {
  version: string;
  description: string;
  executedAt: Date;
  duration: number; // milliseconds
}

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);
  private migrationsCollection: any;

  constructor(@InjectConnection() private readonly connection: Connection) {}

  /**
   * Initialize migrations table
   */
  async initialize(): Promise<void> {
    try {
      const db = this.connection.db;
      if (!db) {
        throw new Error('Database connection not available');
      }

      // Create migrations collection if it doesn't exist
      const collections = await db.listCollections().toArray();
      const migrationExists = collections.some(
        (c) => c.name === 'migrations',
      );

      if (!migrationExists) {
        this.migrationsCollection = await db.createCollection('migrations');
        // Create index on version
        await this.migrationsCollection.createIndex({ version: 1 });
        this.logger.log('Created migrations collection');
      } else {
        this.migrationsCollection = db.collection('migrations');
      }
    } catch (error) {
      this.logger.error(`Failed to initialize migrations: ${error}`);
      throw error;
    }
  }

  /**
   * Run pending migrations
   */
  async runMigrations(migrations: Migration[]): Promise<void> {
    await this.initialize();

    // Get executed migrations
    const executed = await this.getExecutedMigrations();
    const executedVersions = new Set(executed.map((m) => m.version));

    // Find pending migrations
    const pending = migrations.filter((m) => !executedVersions.has(m.version));

    if (pending.length === 0) {
      this.logger.log('No pending migrations');
      return;
    }

    this.logger.log(`Found ${pending.length} pending migration(s)`);

    // Execute migrations in order
    for (const migration of pending) {
      await this.executeMigration(migration);
    }

    this.logger.log('All migrations completed successfully');
  }

  /**
   * Execute a single migration
   */
  private async executeMigration(migration: Migration): Promise<void> {
    this.logger.log(`Executing migration: ${migration.version}`);
    const startTime = Date.now();

    try {
      // Run the migration
      await migration.up();

      // Record the migration
      const duration = Date.now() - startTime;
      await this.recordMigration(
        migration.version,
        migration.description,
        duration,
      );

      this.logger.log(
        `Migration ${migration.version} completed in ${duration}ms`,
      );
    } catch (error) {
      this.logger.error(
        `Migration ${migration.version} failed: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Rollback a migration
   */
  async rollbackMigration(migration: Migration): Promise<void> {
    if (!migration.reversible || !migration.down) {
      throw new Error(`Migration ${migration.version} is not reversible`);
    }

    this.logger.log(`Rolling back migration: ${migration.version}`);
    const startTime = Date.now();

    try {
      // Run the rollback
      await migration.down();

      // Remove the migration record
      await this.migrationsCollection.deleteOne({ version: migration.version });

      const duration = Date.now() - startTime;
      this.logger.log(
        `Migration ${migration.version} rolled back in ${duration}ms`,
      );
    } catch (error) {
      this.logger.error(
        `Rollback for ${migration.version} failed: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Get executed migrations
   */
  async getExecutedMigrations(): Promise<MigrationRecord[]> {
    try {
      const db = this.connection.db;
      if (!db) {
        return [];
      }

      const migrations = await db
        .collection('migrations')
        .find({})
        .sort({ executedAt: 1 })
        .toArray();

      return migrations.map((m: any) => ({
        version: m.version,
        description: m.description,
        executedAt: m.executedAt,
        duration: m.duration,
      })) as MigrationRecord[];
    } catch (error) {
      this.logger.error(
        `Failed to get executed migrations: ${(error as Error).message}`,
      );
      return [];
    }
  }

  /**
   * Record a migration as executed
   */
  private async recordMigration(
    version: string,
    description: string,
    duration: number,
  ): Promise<void> {
    try {
      await this.migrationsCollection.insertOne({
        version,
        description,
        executedAt: new Date(),
        duration,
      });
    } catch (error) {
      this.logger.error(
        `Failed to record migration: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<Record<string, any>> {
    const executed = await this.getExecutedMigrations();

    return {
      totalExecuted: executed.length,
      migrations: executed,
      lastMigration: executed.length > 0 ? executed[executed.length - 1] : null,
    };
  }
}
