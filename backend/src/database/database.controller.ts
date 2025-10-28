import { Controller, Get } from '@nestjs/common';
import { DatabaseService, DatabaseHealthStatus } from './database.service';

@Controller('health/database')
export class DatabaseController {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Get database health status
   */
  @Get()
  async health(): Promise<DatabaseHealthStatus> {
    return this.databaseService.getHealth();
  }

  /**
   * Get detailed connection information
   */
  @Get('info')
  async info(): Promise<Record<string, any>> {
    return {
      connection: this.databaseService.getConnectionDetails(),
      stats: await this.databaseService.getStats(),
      serverInfo: await this.databaseService.getServerInfo(),
      replicaSet: await this.databaseService.getReplicaSetStatus(),
    };
  }

  /**
   * Verify database connectivity
   */
  @Get('check')
  async check(): Promise<Record<string, any>> {
    const health = await this.databaseService.getHealth();
    return {
      healthy: health.status === 'up',
      connected: health.connected,
      database: health.database,
      replicaSet: health.replicaSet || null,
      timestamp: health.timestamp,
    };
  }
}
