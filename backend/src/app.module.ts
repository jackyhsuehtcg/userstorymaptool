import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import {
  appConfig,
  databaseConfig,
  jwtConfig,
  oauthConfig,
} from './config';
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
      load: [appConfig, databaseConfig, jwtConfig, oauthConfig],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3000),
        MONGODB_URI: Joi.string().default('mongodb://localhost:27017/story-map'),
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRES_IN: Joi.string().default('24h'),
      }),
      validationOptions: {
        allowUnknown: true,
      },
    }),
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
