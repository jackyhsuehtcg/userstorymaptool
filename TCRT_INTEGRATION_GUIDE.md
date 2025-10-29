# TCRT 認證整合實作指南

## 概述

本文件說明如何將 User Story Map Tool 與 TCRT (Test Case Repository Tool) 的認證系統整合。
基於概念驗證測試 (`test_tcrt_auth_integration.py`)，我們已確認 TCRT 使用 JWT-based 認證，
而非 OAuth2/OIDC 標準協定。

## TCRT 系統資訊

- **專案位置**: `/Users/hideman/code/test_case_repo_tool_with_permission`
- **API Base URL**: `http://localhost:9999/api` (開發環境)
- **資料庫**: SQLite (`test_case_repo.db`)
- **認證方式**: JWT Bearer Token
- **Token 有效期**: 7 天 (604800 秒)

## 認證流程

### 1. 登入流程

#### 步驟 1: 取得 Challenge (可選)

```http
POST /api/auth/challenge
Content-Type: application/json

{
  "username_or_email": "jackyhsueh"
}
```

**回應:**
```json
{
  "challenge": "a03aa31382c411e6276c...",
  "expires_at": "2025-10-29T10:11:21.927955",
  "salt": "username",
  "iterations": 100000,
  "supports_encryption": true
}
```

此步驟用於實作 Challenge-Response 加密認證，可選。如使用明文密碼登入可跳過。

#### 步驟 2: 登入

```http
POST /api/auth/login
Content-Type: application/json

{
  "username_or_email": "jackyhsueh",
  "password": "ji394ibm"
}
```

**回應:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 604800,
  "user_info": {
    "user_id": 5,
    "username": "jackyhsueh",
    "email": "cplus.jack@gmail.com",
    "full_name": "Jacky Hsueh",
    "role": "admin",
    "is_active": true
  },
  "first_login": false
}
```

### 2. Token 驗證與使用者資訊

#### 取得使用者資訊

```http
GET /api/auth/me
Authorization: Bearer {access_token}
```

**回應:**
```json
{
  "user_id": 5,
  "username": "jackyhsueh",
  "email": "cplus.jack@gmail.com",
  "full_name": "Jacky Hsueh",
  "role": "admin",
  "is_active": true,
  "permissions": {
    "user_id": 5,
    "role": "admin",
    "accessible_teams": [9],
    "team_permissions": {},
    "is_super_admin": false,
    "is_admin": true
  },
  "accessible_teams": [9],
  "lark_name": null
}
```

#### 驗證 Token 有效性

```http
POST /api/auth/validate-token
Authorization: Bearer {access_token}
```

**回應:**
```json
{
  "valid": true,
  "user_id": 5,
  "username": "jackyhsueh",
  "role": "admin",
  "jti": "74800101-36ce-483d-a6d5-43f67c2e8a90"
}
```

### 3. 登出流程

```http
POST /api/auth/logout
Authorization: Bearer {access_token}
```

**回應:**
```json
{
  "message": "成功登出"
}
```

登出後，token 會被撤銷，後續使用該 token 的請求會返回 401。

## TCRT 角色系統

### 角色定義

TCRT 定義了以下角色：

| TCRT 角色 | 說明 | Story Map 對應 |
|-----------|------|----------------|
| `SUPER_ADMIN` | 超級管理員，擁有系統所有權限 | `storymap.admin` |
| `ADMIN` | 團隊管理員，可管理團隊設定與成員 | `storymap.editor` |
| `USER` | 一般使用者，可進行 CRUD 操作 | `storymap.editor` |
| `VIEWER` | 檢視者，只能檢視 | `storymap.viewer` |

### Story Map 權限規則

基於 TCRT 角色，Story Map 應實作以下權限：

- **`storymap.admin`** (SUPER_ADMIN):
  - 可編輯所有節點與跨邊
  - 可匯入/匯出資料
  - 可管理 API Token
  - 可存取所有團隊的資料

- **`storymap.editor`** (ADMIN/USER):
  - 可編輯節點與跨邊
  - 可匯入/匯出資料
  - 無法管理 API Token
  - 僅可存取 `accessible_teams` 中的團隊

- **`storymap.viewer`** (VIEWER):
  - 僅可檢視資料
  - 可匯出 JSON
  - 無法編輯或刪除
  - 僅可檢視 `accessible_teams` 中的團隊

## 團隊資料整合

### 使用者可存取的團隊

從 `GET /api/auth/me` 的回應中取得 `accessible_teams` 陣列，
這是使用者可以存取的團隊 ID 列表。

```json
{
  "accessible_teams": [9],
  "permissions": {
    "accessible_teams": [9],
    "team_permissions": {}
  }
}
```

### 團隊詳細資料

TCRT 的團隊資料儲存在 SQLite 資料庫的 `teams` 表中：

```sql
SELECT id, name, description, is_active, created_at
FROM teams
WHERE id IN (9);
```

若需要取得完整的團隊資訊，可以：
1. 直接讀取 TCRT 資料庫（緊耦合，不推薦）
2. 在 TCRT 建立新的 API endpoint `GET /api/teams`（推薦）
3. 在 Story Map 中維護團隊資料快取，定期同步

## 實作建議

### 後端實作 (NestJS)

#### 1. 建立 TCRT 認證服務

```typescript
// src/auth/services/tcrt-auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

interface TcrtLoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user_info: {
    user_id: number;
    username: string;
    email: string;
    full_name: string;
    role: string;
    is_active: boolean;
  };
  first_login: boolean;
}

interface TcrtUserInfo {
  user_id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  permissions: {
    accessible_teams: number[];
    is_super_admin: boolean;
    is_admin: boolean;
  };
  accessible_teams: number[];
}

@Injectable()
export class TcrtAuthService {
  private readonly httpClient: AxiosInstance;
  private readonly apiBaseUrl: string;

  constructor(private configService: ConfigService) {
    this.apiBaseUrl = configService.get<string>('tcrt.apiBaseUrl');
    this.httpClient = axios.create({
      baseURL: this.apiBaseUrl,
      timeout: 10000,
    });
  }

  /**
   * 使用 TCRT 帳號密碼登入
   */
  async login(usernameOrEmail: string, password: string): Promise<TcrtLoginResponse> {
    try {
      const response = await this.httpClient.post<TcrtLoginResponse>('/auth/login', {
        username_or_email: usernameOrEmail,
        password,
      });

      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new UnauthorizedException('使用者名稱或密碼不正確');
      }
      throw new Error('TCRT 登入失敗');
    }
  }

  /**
   * 取得使用者資訊
   */
  async getUserInfo(accessToken: string): Promise<TcrtUserInfo> {
    try {
      const response = await this.httpClient.get<TcrtUserInfo>('/auth/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      throw new UnauthorizedException('無效的 access token');
    }
  }

  /**
   * 驗證 token 有效性
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
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
    } catch (error) {
      return false;
    }
  }

  /**
   * 登出
   */
  async logout(accessToken: string): Promise<void> {
    try {
      await this.httpClient.post(
        '/auth/logout',
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
    } catch (error) {
      // 登出失敗不拋出錯誤
      console.warn('TCRT logout failed:', error.message);
    }
  }

  /**
   * 將 TCRT 角色對應至 Story Map 角色
   */
  mapTcrtRoleToStorymapRole(tcrtRole: string): string {
    const roleMapping = {
      'SUPER_ADMIN': 'storymap.admin',
      'ADMIN': 'storymap.editor',
      'USER': 'storymap.editor',
      'VIEWER': 'storymap.viewer',
    };

    return roleMapping[tcrtRole] || 'storymap.viewer';
  }
}
```

#### 2. 更新認證控制器

```typescript
// src/auth/auth.controller.ts
import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { TcrtAuthService } from './services/tcrt-auth.service';
import { JwtService } from '@nestjs/jwt';
import { SessionService } from './services/session.service';

@Controller('auth')
export class AuthController {
  constructor(
    private tcrtAuthService: TcrtAuthService,
    private jwtService: JwtService,
    private sessionService: SessionService,
  ) {}

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    // 1. 使用 TCRT 登入
    const tcrtResponse = await this.tcrtAuthService.login(
      body.username,
      body.password,
    );

    // 2. 取得使用者詳細資訊
    const userInfo = await this.tcrtAuthService.getUserInfo(
      tcrtResponse.access_token,
    );

    // 3. 建立本地 JWT token
    const storymapRole = this.tcrtAuthService.mapTcrtRoleToStorymapRole(
      userInfo.role,
    );

    const payload = {
      sub: userInfo.user_id,
      username: userInfo.username,
      email: userInfo.email,
      role: storymapRole,
      tcrtRole: userInfo.role,
      teams: userInfo.accessible_teams,
    };

    const localToken = this.jwtService.sign(payload);

    // 4. 儲存 session（包含 TCRT token）
    await this.sessionService.createSession({
      userId: userInfo.user_id,
      localToken,
      tcrtToken: tcrtResponse.access_token,
      expiresAt: new Date(Date.now() + tcrtResponse.expires_in * 1000),
    });

    return {
      access_token: localToken,
      expires_in: tcrtResponse.expires_in,
      user: {
        id: userInfo.user_id,
        username: userInfo.username,
        email: userInfo.email,
        fullName: userInfo.full_name,
        role: storymapRole,
        tcrtRole: userInfo.role,
        teams: userInfo.accessible_teams,
      },
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req) {
    const session = await this.sessionService.getSession(req.user.sub);
    
    if (session?.tcrtToken) {
      await this.tcrtAuthService.logout(session.tcrtToken);
    }

    await this.sessionService.invalidateSession(req.user.sub);

    return { message: '登出成功' };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    return req.user;
  }
}
```

### 前端實作 (React + TypeScript)

#### 1. 認證服務

```typescript
// src/services/authService.ts
import axios from 'axios';

interface LoginResponse {
  access_token: string;
  expires_in: number;
  user: {
    id: number;
    username: string;
    email: string;
    fullName: string;
    role: string;
    tcrtRole: string;
    teams: number[];
  };
}

class AuthService {
  private apiBaseUrl = '/api';

  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await axios.post<LoginResponse>(`${this.apiBaseUrl}/auth/login`, {
      username,
      password,
    });

    // 儲存 token
    localStorage.setItem('access_token', response.data.access_token);
    localStorage.setItem('user', JSON.stringify(response.data.user));

    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await axios.post(`${this.apiBaseUrl}/auth/logout`);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    }
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getUser(): any {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

export default new AuthService();
```

#### 2. HTTP 攔截器

```typescript
// src/services/httpClient.ts
import axios from 'axios';
import authService from './authService';

const httpClient = axios.create({
  baseURL: '/api',
});

// Request interceptor - 加入 token
httpClient.interceptors.request.use((config) => {
  const token = authService.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - 處理 401
httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      authService.logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default httpClient;
```

## 配置說明

### 後端配置 (config/default.yaml)

```yaml
tcrt:
  apiBaseUrl: http://localhost:9999/api
  requestTimeout: 10000

jwt:
  secret: ${JWT_SECRET}
  expiresIn: 7d

session:
  maxAge: 604800  # 7 days, same as TCRT
```

### 環境變數 (.env)

```env
# TCRT Integration
TCRT_API_BASE_URL=http://localhost:9999/api

# JWT Secret for local tokens
JWT_SECRET=your-secret-key-here
```

## 測試

使用提供的測試腳本驗證整合：

```bash
python3 test_tcrt_auth_integration.py
```

測試帳號：
- Username: `jackyhsueh`
- Password: `ji394ibm`

## 注意事項

1. **Token 安全**: TCRT token 應安全儲存，不要暴露在前端
2. **Token 刷新**: TCRT token 有效期為 7 天，需要實作刷新機制或重新登入
3. **權限驗證**: 每次 API 請求都應驗證使用者權限
4. **團隊資料**: 團隊資料應從 TCRT 取得，避免不一致
5. **錯誤處理**: 妥善處理 TCRT API 失敗情況，提供 fallback 機制

## 後續工作

1. [ ] 移除現有的 OAuth2/OIDC 實作
2. [ ] 實作 TCRT Direct Login Service
3. [ ] 更新前端登入頁面
4. [ ] 實作團隊資料同步機制
5. [ ] 建立完整的權限守門系統
6. [ ] 撰寫整合測試
7. [ ] 更新部署文件

## 參考資源

- TCRT 專案: `/Users/hideman/code/test_case_repo_tool_with_permission`
- 概念驗證腳本: `test_tcrt_auth_integration.py`
- TCRT 認證實作: `/app/api/auth.py` (Python/FastAPI)
- TCRT 認證服務: `/app/auth/auth_service.py`
