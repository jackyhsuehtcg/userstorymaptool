import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { RolesGuard, Roles } from './guards/roles.guard';

/**
 * Authentication Controller
 * Handles TCRT direct login, logout, profile, and team sync endpoints
 */
@Controller('api/v1/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Direct login with TCRT credentials
   * POST /api/v1/auth/login
   */
  @Post('login')
  async login(
    @Body()
    body: {
      username: string;
      password: string;
    },
    @Req() req: Request,
  ): Promise<{
    accessToken: string;
    expiresIn: number;
    user: any;
    sessionId: string;
  }> {
    if (!body.username || !body.password) {
      throw new BadRequestException('Username and password are required');
    }

    const ipAddress = this.getClientIp(req);
    const userAgent = req.get('user-agent') || 'unknown';

    this.logger.debug(`Login attempt for user ${body.username} from ${ipAddress}`);

    return this.authService.login(body.username, body.password, ipAddress, userAgent);
  }

  /**
   * Get current user profile
   * GET /api/v1/auth/profile
   * Requires valid JWT token
   */
  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Req() req: Request): Promise<any> {
    const user = (req as any).user;
    this.logger.debug(`Profile requested by user ${user.userId}`);
    return this.authService.getProfile(user);
  }

  /**
   * Logout and invalidate session
   * POST /api/v1/auth/logout
   */
  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout(
    @Body() body: { sessionId: string },
    @Req() req: Request,
  ): Promise<{ message: string }> {
    if (!body.sessionId) {
      throw new BadRequestException('Session ID is required');
    }

    const user = (req as any).user;
    const ipAddress = this.getClientIp(req);
    const userAgent = req.get('user-agent') || 'unknown';

    this.logger.debug(`Logout requested by user ${user.userId}`);

    await this.authService.logout(body.sessionId, undefined, ipAddress, userAgent);

    return { message: '登出成功' };
  }

  /**
   * Sync teams from TCRT
   * POST /api/v1/auth/teams/sync
   * Requires valid JWT token
   */
  @Post('teams/sync')
  @UseGuards(AuthGuard('jwt'))
  async syncTeams(@Req() req: any): Promise<any[]> {
    const user = (req as any).user;
    const ipAddress = this.getClientIp(req);
    const userAgent = req.get('user-agent') || 'unknown';

    this.logger.debug(`Teams sync requested by user ${user.userId}`);

    // 需要 TCRT token 來取得團隊資訊
    // 通常從 session 中取得
    if (!user.tcrtToken) {
      throw new BadRequestException('TCRT token not available');
    }

    return this.authService.syncTeams(user.tcrtToken, user.userId, ipAddress, userAgent);
  }

  /**
   * Get session status
   * GET /api/v1/auth/session/status
   * Requires valid JWT token
   */
  @Get('session/status')
  @UseGuards(AuthGuard('jwt'))
  async getSessionStatus(@Req() req: Request): Promise<{
    valid: boolean;
    userId: number;
    username: string;
    role: string;
  }> {
    const user = (req as any).user;
    return {
      valid: true,
      userId: user.userId || user.sub,
      username: user.username,
      role: user.role,
    };
  }

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   * Requires valid JWT token
   */
  @Post('refresh')
  @UseGuards(AuthGuard('jwt'))
  async refreshToken(
    @Body() body: { sessionId: string },
    @Req() req: Request,
  ): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    if (!body.sessionId) {
      throw new BadRequestException('Session ID is required');
    }

    const user = (req as any).user;
    const ipAddress = this.getClientIp(req);
    const userAgent = req.get('user-agent') || 'unknown';

    this.logger.debug(`Token refresh requested by user ${user.userId}`);

    return this.authService.refreshAccessToken(
      user.userId,
      body.sessionId,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Logout all sessions for current user
   * POST /api/v1/auth/logout-all
   * Requires valid JWT token
   */
  @Post('logout-all')
  @UseGuards(AuthGuard('jwt'))
  async logoutAllSessions(
    @Body() body: { currentSessionId: string },
    @Req() req: Request,
  ): Promise<{ message: string }> {
    if (!body.currentSessionId) {
      throw new BadRequestException('Current session ID is required');
    }

    const user = (req as any).user;
    this.logger.warn(`User ${user.userId} logging out all sessions`);

    // TODO: Implement logout all sessions using SessionService
    return {
      message: 'All sessions have been invalidated',
    };
  }

  /**
   * Extract client IP address from request
   */
  private getClientIp(req: Request): string {
    const xForwardedFor = req.get('x-forwarded-for');
    if (xForwardedFor) {
      return xForwardedFor.split(',')[0].trim();
    }
    return req.ip || 'unknown';
  }
}
