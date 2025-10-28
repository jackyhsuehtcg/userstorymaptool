import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TcrtOAuthService } from './services/tcrt-oauth.service';
import { SessionService } from './services/session.service';
import { AuditService, AuditAction, AuditStatus } from '../audit/services/audit.service';

/**
 * Authentication Service
 * Handles user authentication, session management, and TCRT integration
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly oauthService: TcrtOAuthService,
    private readonly sessionService: SessionService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Initiate OAuth login flow
   * Returns authorization URL and state for frontend redirect
   */
  async initiateOAuthLogin(): Promise<{
    authorizationUrl: string;
    state: string;
    codeVerifier?: string;
    codeChallenge?: string;
  }> {
    try {
      // Generate state for CSRF protection
      const state = this.oauthService.generateState();

      // Generate PKCE for enhanced security (optional)
      const usePkce = this.configService.get<boolean>('oauth.usePkce') || true;
      let pkce: { codeVerifier: string; codeChallenge: string } | null = null;

      if (usePkce) {
        pkce = this.oauthService.generatePkceChallenge();
      }

      // Generate authorization URL
      const authorizationUrl = this.oauthService.generateAuthorizationUrl(state);

      this.logger.debug(`OAuth login initiated with state: ${state}`);

      return {
        authorizationUrl,
        state,
        ...(pkce && { codeVerifier: pkce.codeVerifier, codeChallenge: pkce.codeChallenge }),
      };
    } catch (error) {
      this.logger.error(`Failed to initiate OAuth login: ${(error as Error).message}`);
      throw new Error('Failed to initiate login');
    }
  }

  /**
   * Handle OAuth callback and create session
   */
  async handleOAuthCallback(
    code: string,
    state: string,
    storedState: string,
    ipAddress: string,
    userAgent: string,
    codeVerifier?: string,
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
    user: any;
    sessionId: string;
  }> {
    try {
      // Validate state
      if (!this.oauthService.validateState(state, storedState)) {
        this.logger.warn(`Invalid OAuth state in callback`);
        throw new BadRequestException('Invalid state parameter');
      }

      // Exchange code for TCRT token
      const oauthToken = await this.oauthService.exchangeCodeForToken(code, codeVerifier);

      // Fetch user profile from TCRT
      const userProfile = await this.oauthService.getUserProfile(oauthToken.accessToken);

      // Check storymap permissions
      if (!this.oauthService.hasStorymapPermission(userProfile.roles)) {
        this.logger.warn(
          `User ${userProfile.id} lacks storymap permission`,
        );
        throw new UnauthorizedException(
          'User does not have permission to access Story Map Tool',
        );
      }

      // Fetch teams
      const teams = await this.oauthService.getTeams(oauthToken.accessToken);

      // Create JWT token
      const payload = {
        sub: userProfile.id,
        username: userProfile.username,
        email: userProfile.email,
        displayName: userProfile.displayName,
        roles: userProfile.roles,
        teams: teams.map((t) => ({ id: t.id, name: t.name, active: t.active })),
      };

      const jwtToken = this.jwtService.sign(payload, {
        expiresIn: this.configService.get('jwt.expiresIn') || '1h',
      });

      // Create session
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + (oauthToken.expiresIn || 3600));

      const session = await this.sessionService.createSession(
        userProfile.id,
        jwtToken,
        expiresAt,
        ipAddress,
        userAgent,
        {
          refreshToken: oauthToken.refreshToken,
          state,
          codeVerifier,
        },
      );

      // Log successful login
      await this.auditService.logAuthentication(
        AuditAction.LOGIN,
        userProfile.id,
        ipAddress,
        userAgent,
        AuditStatus.SUCCESS,
      );

      this.logger.log(`User ${userProfile.id} logged in successfully`);

      return {
        accessToken: jwtToken,
        refreshToken: oauthToken.refreshToken,
        expiresIn: oauthToken.expiresIn,
        user: {
          id: userProfile.id,
          username: userProfile.username,
          email: userProfile.email,
          displayName: userProfile.displayName,
          roles: userProfile.roles,
          teams,
        },
        sessionId: session._id || '',
      };
    } catch (error) {
      // Log failed login
      const userId = 'unknown';
      await this.auditService.logAuthentication(
        AuditAction.LOGIN_FAILED,
        userId,
        ipAddress,
        userAgent,
        AuditStatus.FAILURE,
        (error as Error).message,
      );

      throw error;
    }
  }

  /**
   * Logout and invalidate session
   */
  async logout(
    sessionId: string,
    refreshToken?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      const session = await this.sessionService.getSession(sessionId);

      if (!session) {
        throw new UnauthorizedException('Session not found');
      }

      // Revoke TCRT token if available
      if (refreshToken) {
        try {
          await this.oauthService.revokeToken(refreshToken, 'refresh_token');
        } catch (error) {
          this.logger.warn(`Failed to revoke refresh token: ${(error as Error).message}`);
          // Continue with logout even if revocation fails
        }
      }

      // Invalidate session
      await this.sessionService.invalidateSession(sessionId);

      // Log logout
      await this.auditService.logAuthentication(
        AuditAction.LOGOUT,
        session.userId,
        ipAddress || session.ipAddress,
        userAgent || session.userAgent,
        AuditStatus.SUCCESS,
      );

      this.logger.log(`User ${session.userId} logged out`);
    } catch (error) {
      this.logger.error(`Logout error: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(
    sessionId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    try {
      const session = await this.sessionService.getSession(sessionId);

      if (!session || !session.refreshToken) {
        throw new UnauthorizedException('Session expired or refresh token not available');
      }

      // Refresh TCRT token
      const newOauthToken = await this.oauthService.refreshAccessToken(
        session.refreshToken,
      );

      // Fetch updated user profile
      const userProfile = await this.oauthService.getUserProfile(
        newOauthToken.accessToken,
      );

      // Create new JWT token
      const payload = {
        sub: userProfile.id,
        username: userProfile.username,
        email: userProfile.email,
        roles: userProfile.roles,
      };

      const newJwtToken = this.jwtService.sign(payload, {
        expiresIn: this.configService.get('jwt.expiresIn') || '1h',
      });

      // Update session
      const newExpiresAt = new Date();
      newExpiresAt.setSeconds(
        newExpiresAt.getSeconds() + (newOauthToken.expiresIn || 3600),
      );

      await this.sessionService.refreshSession(
        sessionId,
        newJwtToken,
        newExpiresAt,
        newOauthToken.refreshToken,
      );

      // Log token refresh
      await this.auditService.logAuthentication(
        AuditAction.TOKEN_REFRESH,
        userProfile.id,
        ipAddress,
        userAgent,
        AuditStatus.SUCCESS,
      );

      return {
        accessToken: newJwtToken,
        expiresIn: newOauthToken.expiresIn,
      };
    } catch (error) {
      this.logger.error(`Token refresh failed: ${(error as Error).message}`);
      throw new UnauthorizedException('Failed to refresh token');
    }
  }

  /**
   * Get user profile from session
   */
  async getProfile(user: any): Promise<any> {
    return {
      id: user.sub || user.userId,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      roles: user.roles || [],
      teams: user.teams || [],
    };
  }

  /**
   * Sync user teams with TCRT
   */
  async syncTeams(
    accessToken: string,
    userId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<any[]> {
    try {
      this.logger.debug(`Syncing teams for user ${userId}`);

      const teams = await this.oauthService.getTeams(accessToken);

      // Log team sync
      await this.auditService.logAuthentication(
        AuditAction.TEAM_SYNC,
        userId,
        ipAddress,
        userAgent,
        AuditStatus.SUCCESS,
      );

      return teams;
    } catch (error) {
      this.logger.error(`Team sync failed: ${(error as Error).message}`);

      // Log failed sync
      await this.auditService.logAuthentication(
        AuditAction.TEAM_SYNC_FAILED,
        userId,
        ipAddress,
        userAgent,
        AuditStatus.FAILURE,
        (error as Error).message,
      );

      throw error;
    }
  }

  /**
   * Validate user has required roles
   */
  hasRequiredRole(roles: string[], requiredRole?: string): boolean {
    return this.oauthService.hasStorymapPermission(roles, requiredRole);
  }
}
