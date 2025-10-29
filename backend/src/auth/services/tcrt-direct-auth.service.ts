import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

/**
 * TCRT 直接認證服務
 * 實作基於 JWT 的直接登入，不使用 OAuth2/OIDC
 */

interface TcrtLoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user_info: {
    user_id: number;
    username: string;
    email?: string;
    full_name?: string;
    role: string;
    is_active: boolean;
  };
  first_login?: boolean;
}

interface TcrtUserInfo {
  user_id: number;
  username: string;
  email?: string;
  full_name?: string;
  role: string;
  is_active: boolean;
  permissions?: {
    user_id: number;
    role: string;
    accessible_teams: number[];
    team_permissions: Record<string, any>;
    is_super_admin: boolean;
    is_admin: boolean;
  };
  accessible_teams: number[];
  lark_name?: string;
}

interface TcrtTeamInfo {
  id: string | number;
  name: string;
  description?: string;
  active: boolean;
  color?: string;
  created_at?: string;
}

@Injectable()
export class TcrtDirectAuthService {
  private readonly logger = new Logger(TcrtDirectAuthService.name);
  private readonly httpClient: AxiosInstance;
  private readonly apiBaseUrl: string;
  private readonly requestTimeout: number;

  constructor(private configService: ConfigService) {
    this.apiBaseUrl = configService.get<string>('tcrt.apiBaseUrl') || 'http://localhost:9999/api';
    this.requestTimeout = configService.get<number>('tcrt.requestTimeout') || 10000;

    this.httpClient = axios.create({
      baseURL: this.apiBaseUrl,
      timeout: this.requestTimeout,
      headers: {
        'User-Agent': 'StoryMapTool/1.0',
      },
    });

    this.logger.log(`TCRT API Base URL: ${this.apiBaseUrl}`);
  }

  /**
   * 使用 TCRT 帳號密碼登入
   * @param usernameOrEmail 使用者名稱或電子郵件
   * @param password 密碼
   * @returns TCRT 登入回應，包含 JWT token
   */
  async login(usernameOrEmail: string, password: string): Promise<TcrtLoginResponse> {
    try {
      this.logger.debug(`Attempting TCRT login for user: ${usernameOrEmail}`);

      const response = await this.httpClient.post<TcrtLoginResponse>('/auth/login', {
        username_or_email: usernameOrEmail,
        password,
      });

      this.logger.log(`User ${usernameOrEmail} logged in successfully`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`TCRT login failed for ${usernameOrEmail}: ${error.message}`);

      if (error.response?.status === 401) {
        throw new UnauthorizedException('使用者名稱或密碼不正確');
      }

      throw new UnauthorizedException('TCRT 登入失敗，請稍後重試');
    }
  }

  /**
   * 取得登入 Challenge（可選，用於加密登入）
   * @param usernameOrEmail 使用者名稱或電子郵件
   * @returns Challenge 資訊
   */
  async getChallenge(usernameOrEmail: string): Promise<any> {
    try {
      this.logger.debug(`Getting challenge for user: ${usernameOrEmail}`);

      const response = await this.httpClient.post('/auth/challenge', {
        username_or_email: usernameOrEmail,
      });

      return response.data;
    } catch (error: any) {
      this.logger.warn(`Failed to get challenge: ${error.message}`);
      // Challenge is optional, return null on failure
      return null;
    }
  }

  /**
   * 取得目前登入使用者的資訊與權限
   * @param accessToken TCRT JWT token
   * @returns 使用者資訊與權限
   */
  async getUserInfo(accessToken: string): Promise<TcrtUserInfo> {
    try {
      this.logger.debug('Fetching user info from TCRT');

      const response = await this.httpClient.get<TcrtUserInfo>('/auth/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to fetch user info: ${error.message}`);

      if (error.response?.status === 401) {
        throw new UnauthorizedException('無效或過期的 token');
      }

      throw new UnauthorizedException('無法取得使用者資訊');
    }
  }

  /**
   * 驗證 Token 有效性
   * @param accessToken TCRT JWT token
   * @returns Token 是否有效
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      this.logger.debug('Validating TCRT token');

      const response = await this.httpClient.post(
        '/auth/validate-token',
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return response.data.valid === true;
    } catch (error: any) {
      this.logger.warn(`Token validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 登出並撤銷 Token
   * @param accessToken TCRT JWT token
   */
  async logout(accessToken: string): Promise<void> {
    try {
      this.logger.debug('Logging out from TCRT');

      await this.httpClient.post(
        '/auth/logout',
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      this.logger.log('TCRT logout successful');
    } catch (error: any) {
      this.logger.warn(`TCRT logout failed (non-critical): ${error.message}`);
      // 登出失敗不拋出錯誤，允許本地登出繼續進行
    }
  }

  /**
   * 將 TCRT 角色對應至 Story Map 角色
   * @param tcrtRole TCRT 角色（SUPER_ADMIN, ADMIN, USER, VIEWER）
   * @returns Story Map 角色
   */
  mapTcrtRoleToStorymapRole(tcrtRole: string): string {
    const roleMapping: Record<string, string> = {
      'SUPER_ADMIN': 'storymap.admin',
      'ADMIN': 'storymap.editor',
      'USER': 'storymap.editor',
      'VIEWER': 'storymap.viewer',
    };

    const mappedRole = roleMapping[tcrtRole] || 'storymap.viewer';
    this.logger.debug(`Mapped TCRT role '${tcrtRole}' to Story Map role '${mappedRole}'`);

    return mappedRole;
  }

  /**
   * 取得使用者可存取的團隊
   * @param userInfo TCRT 使用者資訊
   * @returns 可存取的團隊 ID 列表
   */
  getAccessibleTeams(userInfo: TcrtUserInfo): number[] {
    return userInfo.accessible_teams || [];
  }

  /**
   * 檢查使用者是否為管理員
   * @param tcrtRole TCRT 角色
   * @returns 是否為管理員（SUPER_ADMIN 或 ADMIN）
   */
  isAdmin(tcrtRole: string): boolean {
    return tcrtRole === 'SUPER_ADMIN' || tcrtRole === 'ADMIN';
  }

  /**
   * 檢查使用者是否為超級管理員
   * @param tcrtRole TCRT 角色
   * @returns 是否為超級管理員
   */
  isSuperAdmin(tcrtRole: string): boolean {
    return tcrtRole === 'SUPER_ADMIN';
  }

  /**
   * 檢查使用者是否具有編輯權限
   * @param tcrtRole TCRT 角色
   * @returns 是否具有編輯權限
   */
  canEdit(tcrtRole: string): boolean {
    return tcrtRole === 'SUPER_ADMIN' || tcrtRole === 'ADMIN' || tcrtRole === 'USER';
  }

  /**
   * 檢查使用者是否具有檢視權限（所有登入使用者皆可）
   * @param tcrtRole TCRT 角色
   * @returns 是否具有檢視權限
   */
  canView(tcrtRole: string): boolean {
    return tcrtRole === 'SUPER_ADMIN' || tcrtRole === 'ADMIN' || tcrtRole === 'USER' || tcrtRole === 'VIEWER';
  }
}
