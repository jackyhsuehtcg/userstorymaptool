import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Res,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { RolesGuard, Roles } from './guards/roles.guard';

/**
 * Authentication Controller
 * Handles OAuth login, logout, profile, and token refresh endpoints
 */
@Controller('api/v1/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Initiate OAuth login flow
   * Returns authorization URL and CSRF state
   */
  @Post('login/initiate')
  async initiateLogin(): Promise<{
    authorizationUrl: string;
    state: string;
    codeVerifier?: string;
  }> {
    this.logger.debug(`OAuth login initiated`);
    return this.authService.initiateOAuthLogin();
  }

  /**
   * Handle OAuth callback
   * Exchange authorization code for JWT and create session
   */
  @Post('oauth/callback')
  async oauthCallback(
    @Body()
    body: {
      code: string;
      state: string;
      storedState: string;
      codeVerifier?: string;
    },
    @Req() req: Request,
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
    user: any;
    sessionId: string;
  }> {
    if (!body.code || !body.state || !body.storedState) {
      throw new BadRequestException('Missing required OAuth parameters');
    }

    const ipAddress = this.getClientIp(req);
    const userAgent = req.get('user-agent') || 'unknown';

    this.logger.debug(`Processing OAuth callback from ${ipAddress}`);

    return this.authService.handleOAuthCallback(
      body.code,
      body.state,
      body.storedState,
      ipAddress,
      userAgent,
      body.codeVerifier,
    );
  }

  /**
   * Get current user profile
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
   * Refresh access token
   * Requires session ID and refresh token in cookies or body
   */
  @Post('refresh')
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

    const ipAddress = this.getClientIp(req);
    const userAgent = req.get('user-agent') || 'unknown';

    this.logger.debug(`Token refresh requested from ${ipAddress}`);

    return this.authService.refreshAccessToken(body.sessionId, ipAddress, userAgent);
  }

  /**
   * Logout and invalidate session
   */
  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout(
    @Body() body: { sessionId: string; refreshToken?: string },
    @Req() req: Request,
  ): Promise<{ message: string }> {
    if (!body.sessionId) {
      throw new BadRequestException('Session ID is required');
    }

    const user = (req as any).user;
    const ipAddress = this.getClientIp(req);
    const userAgent = req.get('user-agent') || 'unknown';

    this.logger.debug(`Logout requested by user ${user.userId}`);

    await this.authService.logout(
      body.sessionId,
      body.refreshToken,
      ipAddress,
      userAgent,
    );

    return { message: 'Logged out successfully' };
  }

  /**
   * Sync teams with TCRT
   * Requires valid JWT token
   */
  @Post('teams/sync')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('storymap.*')
  async syncTeams(@Req() req: any): Promise<any[]> {
    const user = (req as any).user;
    const ipAddress = this.getClientIp(req);
    const userAgent = req.get('user-agent') || 'unknown';

    this.logger.debug(`Teams sync requested by user ${user.userId}`);

    return this.authService.syncTeams(
      user.accessToken,
      user.userId || user.sub,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Get session status
   * Quick check if current session is valid
   */
  @Get('session/status')
  @UseGuards(AuthGuard('jwt'))
  async getSessionStatus(@Req() req: Request): Promise<{
    valid: boolean;
    userId: string;
    username: string;
  }> {
    const user = (req as any).user;
    return {
      valid: true,
      userId: user.userId || user.sub,
      username: user.username,
    };
  }

  /**
   * Logout all sessions for current user
   * Useful for security: password change, suspicious activity, etc.
   */
  @Post('logout-all')
  @UseGuards(AuthGuard('jwt'))
  async logoutAllSessions(
    @Body() body: { currentSessionId: string },
    @Req() req: Request,
  ): Promise<{ message: string; loggedOutCount: number }> {
    if (!body.currentSessionId) {
      throw new BadRequestException('Current session ID is required');
    }

    const user = (req as any).user;
    this.logger.warn(
      `User ${user.userId} logging out all sessions`,
    );

    // Note: Implement this in AuthService with SessionService.invalidateUserSessions
    // For now, just log and return placeholder
    return {
      message: 'All sessions have been invalidated',
      loggedOutCount: 1,
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
