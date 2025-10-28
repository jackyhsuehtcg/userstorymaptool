import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ConfigService } from '@nestjs/config';

export interface DatabaseHealthStatus {
  status: 'up' | 'down';
  database: string;
  replicaSet?: string;
  connected: boolean;
  message: string;
  timestamp: Date;
}

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);
  private isHealthy = false;
  private lastHealthCheckTime: Date | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    // Perform initial health check
    await this.performHealthCheck();

    // Start periodic health check every 30 seconds
    const healthCheckIntervalMs = 30000;
    this.healthCheckInterval = setInterval(
      () => this.performHealthCheck(),
      healthCheckIntervalMs,
    );

    this.logger.log('Database module initialized with health check');
  }

  async onModuleDestroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }

  /**
   * Perform health check on MongoDB connection
   */
  private async performHealthCheck(): Promise<void> {
    try {
      // Execute a simple ping command
      const db = this.connection.db;
      if (db) {
        await db.admin().ping();
      }
      this.isHealthy = true;
      this.lastHealthCheckTime = new Date();
      this.logger.debug('Database health check passed');
    } catch (error) {
      this.isHealthy = false;
      this.lastHealthCheckTime = new Date();
      this.logger.error(
        `Database health check failed: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Get current health status
   */
  async getHealth(): Promise<DatabaseHealthStatus> {
    const dbName = this.configService.get<string>('database.name') || 'story-map';
    const replicaSet = this.configService.get<string>('database.replicaSet');

    return {
      status: this.isHealthy ? 'up' : 'down',
      database: dbName,
      replicaSet,
      connected: this.connection.readyState === 1,
      message: this.isHealthy ? 'Database is healthy' : 'Database is unhealthy',
      timestamp: this.lastHealthCheckTime || new Date(),
    };
  }

  /**
   * Check if database is connected
   */
  isConnected(): boolean {
    return this.connection.readyState === 1;
  }

  /**
   * Check if database is healthy
   */
  isHealthy_(): boolean {
    return this.isHealthy;
  }

  /**
   * Get MongoDB connection object
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<any> {
    try {
      const db = this.connection.db;
      if (db) {
        return await db.stats();
      }
      return null;
    } catch (error) {
      this.logger.error(`Failed to get database stats: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Get server information
   */
  async getServerInfo(): Promise<any> {
    try {
      const db = this.connection.db;
      if (db) {
        return await db.admin().serverInfo();
      }
      return null;
    } catch (error) {
      this.logger.error(`Failed to get server info: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Get replica set status (if available)
   */
  async getReplicaSetStatus(): Promise<any> {
    try {
      const db = this.connection.db;
      if (db) {
        return await db.admin().replSetGetStatus();
      }
      return null;
    } catch (error) {
      this.logger.debug(`Replica set not available: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Create a new session for transactions
   */
  async createSession(): Promise<any> {
    try {
      return await this.connection.startSession();
    } catch (error) {
      this.logger.error(`Failed to create session: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get connection state description
   */
  getConnectionState(): string {
    const states: Record<number, string> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    return states[this.connection.readyState] || 'unknown';
  }

  /**
   * Get connection details
   */
  getConnectionDetails(): Record<string, any> {
    return {
      state: this.getConnectionState(),
      readyState: this.connection.readyState,
      database: this.connection.name,
      host: this.connection.host,
      port: this.connection.port,
      models: Object.keys(this.connection.models),
      collections: Object.keys(this.connection.collections),
    };
  }
}
