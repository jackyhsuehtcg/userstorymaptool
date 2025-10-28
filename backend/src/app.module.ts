import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration, validationConfig } from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { TeamsModule } from './teams/teams.module';
import { StoryMapModule } from './story-map/story-map.module';
import { TokensModule } from './tokens/tokens.module';
import { AuditModule } from './audit/audit.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      // Load configuration from YAML file with environment variable overrides
      load: [configuration],
      // Validate configuration values
      validate: validationConfig.validate,
      // Allow unknown environment variables
      validationOptions: validationConfig.validationOptions,
      // Make config globally available
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    TeamsModule,
    StoryMapModule,
    TokensModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
