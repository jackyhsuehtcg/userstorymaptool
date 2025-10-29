import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

/**
 * TCRT 團隊同步服務
 * 從 TCRT 取得並管理團隊資訊
 */

interface TeamInfo {
  id: number | string;
  name: string;
  description?: string;
  active: boolean;
  color?: string;
  created_at?: string;
}

@Injectable()
export class TcrtTeamsSyncService {
  private readonly logger = new Logger(TcrtTeamsSyncService.name);
  private readonly httpClient: AxiosInstance;
  private readonly apiBaseUrl: string;
  private teamsCache: Map<string, { data: TeamInfo[]; timestamp: number }> = new Map();
  private readonly cacheExpiry = 10 * 60 * 1000; // 10 minutes

  constructor(private configService: ConfigService) {
    this.apiBaseUrl = configService.get<string>('tcrt.apiBaseUrl') || 'http://localhost:9999/api';

    this.httpClient = axios.create({
      baseURL: this.apiBaseUrl,
      timeout: 10000,
      headers: {
        'User-Agent': 'StoryMapTool/1.0',
      },
    });
  }

  /**
   * 從 TCRT 取得使用者可存取的團隊資訊
   * @param accessToken TCRT JWT token
   * @param forceRefresh 是否強制刷新快取
   * @returns 團隊資訊陣列
   */
  async getUserTeams(accessToken: string, forceRefresh = false): Promise<TeamInfo[]> {
    const cacheKey = `teams_${accessToken.substring(0, 20)}`;

    // 檢查快取
    if (!forceRefresh && this.teamsCache.has(cacheKey)) {
      const cached = this.teamsCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        this.logger.debug('Returning cached teams data');
        return cached.data;
      }
    }

    try {
      this.logger.debug('Fetching teams from TCRT');

      // 首先取得使用者資訊以獲得可存取的團隊列表
      const userResponse = await this.httpClient.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const userInfo = userResponse.data;
      const accessibleTeamIds = userInfo.accessible_teams || [];

      this.logger.debug(`User has access to ${accessibleTeamIds.length} teams`);

      // 如果 TCRT 提供團隊詳細資料，使用它；否則建立基本的團隊物件
      let teams: TeamInfo[] = [];

      // 嘗試從 TCRT 的其他端點取得團隊詳細資料（若可用）
      try {
        const teamsResponse = await this.httpClient.get('/teams', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        teams = teamsResponse.data;
      } catch (error: any) {
        // 若 /teams 端點不可用，建立基本的團隊物件
        this.logger.warn('TCRT /teams endpoint not available, creating basic team objects');

        teams = accessibleTeamIds.map((teamId) => ({
          id: teamId,
          name: `Team ${teamId}`,
          active: true,
        }));
      }

      // 快取結果
      this.teamsCache.set(cacheKey, {
        data: teams,
        timestamp: Date.now(),
      });

      this.logger.log(`Successfully fetched ${teams.length} teams from TCRT`);
      return teams;
    } catch (error: any) {
      this.logger.error(`Failed to fetch teams from TCRT: ${error.message}`);

      // 嘗試從快取返回過期的資料
      if (this.teamsCache.has(cacheKey)) {
        this.logger.warn('Returning expired cached teams data');
        return this.teamsCache.get(cacheKey)!.data;
      }

      throw new Error('無法從 TCRT 取得團隊資訊');
    }
  }

  /**
   * 清除特定使用者的團隊快取
   * @param accessToken TCRT JWT token
   */
  clearTeamsCache(accessToken: string): void {
    const cacheKey = `teams_${accessToken.substring(0, 20)}`;
    this.teamsCache.delete(cacheKey);
    this.logger.debug('Teams cache cleared');
  }

  /**
   * 清除所有團隊快取
   */
  clearAllTeamsCache(): void {
    this.teamsCache.clear();
    this.logger.debug('All teams cache cleared');
  }

  /**
   * 檢查使用者是否可存取特定團隊
   * @param accessibleTeams 使用者可存取的團隊 ID 列表
   * @param teamId 要檢查的團隊 ID
   * @returns 是否可存取
   */
  canAccessTeam(accessibleTeams: number[], teamId: number | string): boolean {
    return accessibleTeams.includes(Number(teamId));
  }

  /**
   * 過濾團隊列表，僅保留使用者可存取的團隊
   * @param teams 完整的團隊列表
   * @param accessibleTeams 使用者可存取的團隊 ID 列表
   * @returns 篩選後的團隊列表
   */
  filterAccessibleTeams(teams: TeamInfo[], accessibleTeams: number[]): TeamInfo[] {
    return teams.filter((team) => this.canAccessTeam(accessibleTeams, team.id));
  }

  /**
   * 驗證節點中引用的團隊是否有效
   * @param teamId 團隊 ID
   * @param accessibleTeams 使用者可存取的團隊列表
   * @param availableTeams 系統中可用的所有團隊
   * @returns 驗證結果 { valid: boolean, error?: string }
   */
  validateTeamId(
    teamId: number | string,
    accessibleTeams: number[],
    availableTeams: TeamInfo[]
  ): { valid: boolean; error?: string } {
    const numericTeamId = Number(teamId);

    // 檢查團隊是否存在
    const teamExists = availableTeams.some((team) => Number(team.id) === numericTeamId);
    if (!teamExists) {
      return {
        valid: false,
        error: `團隊 ${teamId} 不存在`,
      };
    }

    // 檢查使用者是否可存取
    if (!this.canAccessTeam(accessibleTeams, teamId)) {
      return {
        valid: false,
        error: `無權存取團隊 ${teamId}`,
      };
    }

    return { valid: true };
  }

  /**
   * 取得團隊名稱
   * @param teamId 團隊 ID
   * @param teams 團隊列表
   * @returns 團隊名稱或 fallback 值
   */
  getTeamName(teamId: number | string, teams: TeamInfo[]): string {
    const team = teams.find((t) => Number(t.id) === Number(teamId));
    return team?.name || `Team ${teamId}`;
  }
}
