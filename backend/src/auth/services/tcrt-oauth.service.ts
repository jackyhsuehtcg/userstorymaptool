import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
}

interface UserProfile {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatar?: string;
  roles: string[];
}

interface Team {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt: string;
}

/**
 * Service for integrating with TCRT OAuth/OIDC
 * Handles token exchange, user profile retrieval, and team synchronization
 */
@Injectable()
export class TcrtOAuthService {
  private readonly logger = new Logger(TcrtOAuthService.name);
  private readonly httpClient: AxiosInstance;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly tokenEndpoint: string;
  private readonly userInfoEndpoint: string;
  private readonly teamsEndpoint: string;
  private readonly authorizationEndpoint: string;

  constructor(private configService: ConfigService) {
    this.clientId = configService.get<string>('oauth.clientId') || '';
    this.clientSecret = configService.get<string>('oauth.clientSecret') || '';
    this.redirectUri = configService.get<string>('oauth.redirectUri') || '';
    this.tokenEndpoint = configService.get<string>('oauth.tokenEndpoint') || '';
    this.userInfoEndpoint = configService.get<string>('oauth.userInfoEndpoint') || '';
    this.teamsEndpoint = configService.get<string>('oauth.teamsEndpoint') || '';
    this.authorizationEndpoint = configService.get<string>('oauth.authorizationEndpoint') || '';

    // Create HTTP client with timeout and retry
    this.httpClient = axios.create({
      timeout: configService.get<number>('oauth.requestTimeout') || 10000,
      headers: {
        'User-Agent': 'StoryMapTool/1.0',
      },
    });

    // Add error logging interceptor
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => {
        this.logger.error(`OAuth request failed: ${error.message}`, error.response?.data);
        throw error;
      },
    );
  }

  /**
   * Generate authorization URL for redirecting user to TCRT login
   */
  generateAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'openid profile email',
      state,
    });

    return `${this.authorizationEndpoint}?${params.toString()}`;
  }

  /**
   * Generate PKCE code challenge for enhanced security
   */
  generatePkceChallenge(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    return { codeVerifier, codeChallenge };
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(
    code: string,
    codeVerifier?: string,
  ): Promise<TokenResponse> {
    try {
      this.logger.debug(`Exchanging authorization code for token`);

      const data: Record<string, string> = {
        grant_type: 'authorization_code',
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
      };

      // Add PKCE code verifier if provided
      if (codeVerifier) {
        data.code_verifier = codeVerifier;
      }

      const response = await this.httpClient.post(this.tokenEndpoint, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token, refresh_token, expires_in, token_type } = response.data;

      this.logger.debug(`Token exchange successful`);

      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresIn: expires_in || 3600,
        tokenType: token_type || 'Bearer',
      };
    } catch (error) {
      this.logger.error(`Token exchange failed: ${(error as Error).message}`);
      throw new Error('Failed to exchange authorization code for token');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    try {
      this.logger.debug(`Refreshing access token`);

      const response = await this.httpClient.post(
        this.tokenEndpoint,
        {
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const { access_token, refresh_token, expires_in, token_type } = response.data;

      return {
        accessToken: access_token,
        refreshToken: refresh_token || refreshToken,
        expiresIn: expires_in || 3600,
        tokenType: token_type || 'Bearer',
      };
    } catch (error) {
      this.logger.error(`Token refresh failed: ${(error as Error).message}`);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Fetch user profile from TCRT API using access token
   */
  async getUserProfile(accessToken: string): Promise<UserProfile> {
    try {
      this.logger.debug(`Fetching user profile from TCRT`);

      const response = await this.httpClient.get(this.userInfoEndpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const userData = response.data;

      // Map TCRT user data to internal format
      const profile: UserProfile = {
        id: userData.sub || userData.id,
        username: userData.preferred_username || userData.username,
        email: userData.email,
        displayName: userData.name || userData.displayName,
        avatar: userData.picture,
        roles: userData.roles || this.extractRolesFromProfile(userData),
      };

      this.logger.debug(`User profile fetched: ${profile.id}`);
      return profile;
    } catch (error) {
      this.logger.error(`Failed to fetch user profile: ${(error as Error).message}`);
      throw new Error('Failed to fetch user profile');
    }
  }

  /**
   * Fetch team list from TCRT API
   */
  async getTeams(accessToken: string): Promise<Team[]> {
    try {
      this.logger.debug(`Fetching teams from TCRT`);

      const response = await this.httpClient.get(this.teamsEndpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // Map TCRT team data to internal format
      const teams: Team[] = (response.data.teams || response.data).map((t: any) => ({
        id: t.id || t.teamId,
        name: t.name,
        description: t.description,
        active: t.active !== false,
        createdAt: t.createdAt || new Date().toISOString(),
      }));

      this.logger.debug(`Teams fetched: ${teams.length} teams`);
      return teams;
    } catch (error) {
      this.logger.error(`Failed to fetch teams: ${(error as Error).message}`);
      throw new Error('Failed to fetch teams from TCRT');
    }
  }

  /**
   * Validate access token with TCRT introspection endpoint
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      this.logger.debug(`Validating token`);

      const introspectionEndpoint = this.configService.get<string>(
        'oauth.introspectionEndpoint',
      );

      if (!introspectionEndpoint) {
        this.logger.warn(`Introspection endpoint not configured, skipping validation`);
        return true;
      }

      const response = await this.httpClient.post(
        introspectionEndpoint,
        {
          token: accessToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      return response.data.active === true;
    } catch (error) {
      this.logger.error(`Token validation failed: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Revoke token (logout)
   */
  async revokeToken(token: string, tokenTypeHint: string = 'access_token'): Promise<void> {
    try {
      this.logger.debug(`Revoking token`);

      const revocationEndpoint = this.configService.get<string>(
        'oauth.revocationEndpoint',
      );

      if (!revocationEndpoint) {
        this.logger.warn(`Revocation endpoint not configured, skipping revocation`);
        return;
      }

      await this.httpClient.post(
        revocationEndpoint,
        {
          token,
          token_type_hint: tokenTypeHint,
          client_id: this.clientId,
          client_secret: this.clientSecret,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      this.logger.debug(`Token revoked successfully`);
    } catch (error) {
      this.logger.warn(
        `Token revocation failed (non-critical): ${(error as Error).message}`,
      );
      // Don't throw - revocation failure shouldn't break logout flow
    }
  }

  /**
   * Extract storymap roles from user profile
   * Checks for roles matching pattern: storymap.*
   */
  private extractRolesFromProfile(userData: any): string[] {
    const roles: string[] = userData.roles || [];

    // Filter for story map specific roles
    return roles.filter((role: string) => role.startsWith('storymap.'));
  }

  /**
   * Check if user has storymap permission
   */
  hasStorymapPermission(roles: string[], requiredRole?: string): boolean {
    if (!Array.isArray(roles)) {
      return false;
    }

    // Check if user has any storymap.* role
    const hasAnyRole = roles.some((role) => role.startsWith('storymap.'));

    // If specific role required, check for it
    if (requiredRole) {
      return roles.includes(`storymap.${requiredRole}`);
    }

    return hasAnyRole;
  }

  /**
   * Generate state parameter for OAuth flow (CSRF protection)
   */
  generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate state parameter
   */
  validateState(state: string, storedState: string): boolean {
    return state === storedState;
  }
}
