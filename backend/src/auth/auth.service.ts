import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TcrtDirectAuthService } from './services/tcrt-direct-auth.service';
import { TcrtTeamsSyncService } from './services/tcrt-teams-sync.service';
import { SessionService } from './services/session.service';
import { AuditService, AuditAction, AuditStatus } from '../audit/services/audit.service';

/**
 * Authentication Service
 * Handles user authentication, session management, and TCRT integration
 * Uses JWT-based direct login (not OAuth2/OIDC)
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tcrtDirectAuthService: TcrtDirectAuthService,
    private readonly tcrtTeamsSyncService: TcrtTeamsSyncService,
    private readonly sessionService: SessionService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Perform TCRT direct login with username and password
   */
  async login(
    usernameOrEmail: string,
    password: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{
    accessToken: string;
    expiresIn: number;
    user: any;
    sessionId: string;
  }> {
    try {
      // 1. 使用 TCRT 登入
      const tcrtResponse = await this.tcrtDirectAuthService.login(usernameOrEmail, password);

      // 2. 取得使用者詳細資訊
      const userInfo = await this.tcrtDirectAuthService.getUserInfo(tcrtResponse.access_token);

      // 3. 檢查使用者是否為活躍
      if (!userInfo.is_active) {
        throw new UnauthorizedException('帳號已被停用');
      }

      // 4. 將 TCRT 角色對應至 Story Map 角色
      const storymapRole = this.tcrtDirectAuthService.mapTcrtRoleToStorymapRole(
        userInfo.role,
      );

      // 5. 建立本地 JWT token
      const payload = {
        sub: userInfo.user_id,
        userId: userInfo.user_id,
        username: userInfo.username,
        email: userInfo.email,
        fullName: userInfo.full_name,
        role: storymapRole,
        tcrtRole: userInfo.role,
        teams: userInfo.accessible_teams || [],
      };

      const localToken = this.jwtService.sign(payload, {
        expiresIn: this.configService.get('jwt.expiresIn') || '7d',
      });

      // 6. 建立 session（包含 TCRT token）
      const session = await this.sessionService.createSession(
        userInfo.user_id,
        localToken,
        new Date(Date.now() + (tcrtResponse.expires_in || 604800) * 1000),
        ipAddress,
        userAgent,
        {
          tcrtToken: tcrtResponse.access_token,
          tcrtRole: userInfo.role,
          storymapRole,
        }
      );

      // 7. 審計記錄
      await this.auditService.logAuthentication(
        AuditAction.LOGIN,
        userInfo.user_id,
        ipAddress,
        userAgent,
        AuditStatus.SUCCESS,
      );

      this.logger.log(`User ${userInfo.username} logged in successfully`);

      return {
        accessToken: localToken,
        expiresIn: tcrtResponse.expires_in || 604800,
        user: {
          id: userInfo.user_id,
          username: userInfo.username,
          email: userInfo.email,
          fullName: userInfo.full_name,
          role: storymapRole,
          tcrtRole: userInfo.role,
          teams: userInfo.accessible_teams || [],
        },
        sessionId: session._id || '',
      };
    } catch (error: any) {
      this.logger.error(`Login failed for ${usernameOrEmail}: ${error.message}`);

      // 審計失敗登入
      await this.auditService.logAuthentication(
        AuditAction.LOGIN_FAILED,
        'unknown',
        ipAddress,
        userAgent,
        AuditStatus.FAILURE,
        error.message,
      );

      throw error;
    }
  }

  /**
   * Logout and invalidate session
   */
  async logout(
    sessionId: string,
    tcrtToken?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      const session = await this.sessionService.getSession(sessionId);

      if (!session) {
        throw new UnauthorizedException('Session not found');
      }

      // 從 session 中取得 TCRT token（如果沒有直接傳入）
      const tokenToRevoke = tcrtToken || (session.metadata?.tcrtToken as string);

      // 撤銷 TCRT token
      if (tokenToRevoke) {
        try {
          await this.tcrtDirectAuthService.logout(tokenToRevoke);
        } catch (error) {
          this.logger.warn(`Failed to revoke TCRT token: ${(error as Error).message}`);
          // 繼續登出即使 TCRT 撤銷失敗
        }
      }

      // 失效 session
      await this.sessionService.invalidateSession(sessionId);

      // 審計記錄
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
   * Get user profile from session
   */
  async getProfile(user: any): Promise<any> {
    return {
      id: user.sub || user.userId,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      tcrtRole: user.tcrtRole,
      teams: user.teams || [],
    };
  }

  /**
   * Sync user teams with TCRT
   */
  async syncTeams(
    tcrtToken: string,
    userId: number,
    ipAddress: string,
    userAgent: string,
  ): Promise<any[]> {
    try {
      this.logger.debug(`Syncing teams for user ${userId}`);

      const teams = await this.tcrtTeamsSyncService.getUserTeams(tcrtToken, true);

      // 審計記錄
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

      // 審計失敗
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
   * Validate user has required role
   */
  hasRequiredRole(role: string, requiredRole?: string): boolean {
    if (!requiredRole) {
      return true;
    }

    // 檢查是否為管理員角色
    if (requiredRole === 'admin') {
      return role === 'storymap.admin';
    }

    // 檢查是否為編輯角色
    if (requiredRole === 'editor') {
      return role === 'storymap.admin' || role === 'storymap.editor';
    }

    // 檢查是否為任何Story Map 角色
    if (requiredRole === 'storymap.*') {
      return role.startsWith('storymap.');
    }

    return role === requiredRole;
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(
    userId: number,
    sessionId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    try {
      const session = await this.sessionService.getSession(sessionId);

      if (!session) {
        throw new UnauthorizedException('Session expired');
      }

      // 檢查 TCRT token 是否仍然有效
      const tcrtToken = session.metadata?.tcrtToken as string;
      if (!tcrtToken) {
        throw new UnauthorizedException('TCRT token not found');
      }

      const isValid = await this.tcrtDirectAuthService.validateToken(tcrtToken);
      if (!isValid) {
        throw new UnauthorizedException('TCRT token expired');
      }

      // 建立新的本地 JWT token
      const userInfo = await this.tcrtDirectAuthService.getUserInfo(tcrtToken);
      const storymapRole = this.tcrtDirectAuthService.mapTcrtRoleToStorymapRole(
        userInfo.role,
      );

      const payload = {
        sub: userInfo.user_id,
        userId: userInfo.user_id,
        username: userInfo.username,
        email: userInfo.email,
        fullName: userInfo.full_name,
        role: storymapRole,
        tcrtRole: userInfo.role,
        teams: userInfo.accessible_teams || [],
      };

      const newToken = this.jwtService.sign(payload, {
        expiresIn: this.configService.get('jwt.expiresIn') || '7d',
      });

      // 更新 session
      await this.sessionService.refreshSession(
        sessionId,
        newToken,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );

      // 審計記錄
      await this.auditService.logAuthentication(
        AuditAction.TOKEN_REFRESH,
        userId,
        ipAddress,
        userAgent,
        AuditStatus.SUCCESS,
      );

      return {
        accessToken: newToken,
        expiresIn: 7 * 24 * 60 * 60, // 7 days
      };
    } catch (error) {
      this.logger.error(`Token refresh failed: ${(error as Error).message}`);
      throw new UnauthorizedException('Failed to refresh token');
    }
  }

  /**
   * Validate TCRT token
   */
  async validateTcrtToken(tcrtToken: string): Promise<boolean> {
    return this.tcrtDirectAuthService.validateToken(tcrtToken);
  }

  /**
   * Get TCRT user info
   */
  async getTcrtUserInfo(tcrtToken: string): Promise<any> {
    return this.tcrtDirectAuthService.getUserInfo(tcrtToken);
  }
}
