import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TcrtDirectAuthService } from './services/tcrt-direct-auth.service';
import { TcrtTeamsSyncService } from './services/tcrt-teams-sync.service';
import { SessionService, SessionSchema } from './services/session.service';
import { RolesGuard } from './guards/roles.guard';
import { AuditService } from '../audit/services/audit.service';

/**
 * Authentication Module
 * Handles TCRT direct login (JWT-based), session management,
 * team synchronization, and role-based access control
 */
@Module({
  imports: [
    PassportModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('jwt.secret') || 'default-secret-key',
        signOptions: {
          expiresIn: configService.get('jwt.expiresIn') || '7d',
        },
      }),
    }),
    MongooseModule.forFeature([
      { name: 'Session', schema: SessionSchema },
      { name: 'AuditLog', schema: {} }, // Placeholder - imported from audit module
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    TcrtDirectAuthService,
    TcrtTeamsSyncService,
    SessionService,
    RolesGuard,
    AuditService,
  ],
  exports: [AuthService, SessionService, RolesGuard, TcrtDirectAuthService, TcrtTeamsSyncService],
})
export class AuthModule {}
