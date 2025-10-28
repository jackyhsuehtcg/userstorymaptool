import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date(),
      uptime: process.uptime(),
      environment: this.configService.get('app.nodeEnv'),
    };
  }

  getInfo() {
    return {
      name: 'User Story Map Tool API',
      version: '1.0.0',
      description: 'Backend API for the User Story Map Tool',
      apiPrefix: this.configService.get('app.apiPrefix'),
      documentation: '/api/docs',
    };
  }
}
