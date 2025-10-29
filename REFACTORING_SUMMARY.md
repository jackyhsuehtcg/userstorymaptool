# Task 1-8 認證系統重構總結

## 概述

完成 Task 1-8 的重構，將認證系統從 OAuth2/OIDC 改為 TCRT 的 JWT-based 直接登入方式，
並實作完整的團隊資料同步機制。

## 重構時間線

- **開始日期**: 2025-10-29
- **完成日期**: 2025-10-29
- **提交 Commit**: `9aac636` (refactor(auth): 重構認証系統以使用 TCRT 直接登入)

## 主要變更

### 1. 新建服務

#### TcrtDirectAuthService (`backend/src/auth/services/tcrt-direct-auth.service.ts`)

實作 TCRT 直接登入的核心服務，包括：

**API 整合方法：**
- `login(usernameOrEmail, password)` - 使用帳號密碼登入，返回 JWT token
- `getChallenge(usernameOrEmail)` - 取得登入 challenge（可選，用於加密登入）
- `getUserInfo(accessToken)` - 取得使用者資訊與權限
- `validateToken(accessToken)` - 驗證 token 有效性
- `logout(accessToken)` - 登出並撤銷 token

**角色管理方法：**
- `mapTcrtRoleToStorymapRole(tcrtRole)` - 將 TCRT 角色對應至 Story Map 角色
  * SUPER_ADMIN → storymap.admin
  * ADMIN → storymap.editor
  * USER → storymap.editor
  * VIEWER → storymap.viewer
- `isAdmin(tcrtRole)` - 檢查是否為管理員
- `isSuperAdmin(tcrtRole)` - 檢查是否為超級管理員
- `canEdit(tcrtRole)` - 檢查是否有編輯權限
- `canView(tcrtRole)` - 檢查是否有檢視權限

**功能特性：**
- 安全的 HTTP 客戶端配置（超時、User-Agent）
- 詳細的錯誤處理與日誌記錄
- 自動重新映射錯誤為友善的訊息

#### TcrtTeamsSyncService (`backend/src/auth/services/tcrt-teams-sync.service.ts`)

實作團隊資料同步與驗證，包括：

**團隊同步方法：**
- `getUserTeams(accessToken, forceRefresh)` - 取得使用者可存取的團隊
  * 10 分鐘快取機制
  * 支援強制刷新
  * 失敗時返回過期快取

**快取管理方法：**
- `clearTeamsCache(accessToken)` - 清除特定使用者快取
- `clearAllTeamsCache()` - 清除所有快取

**權限驗證方法：**
- `canAccessTeam(accessibleTeams, teamId)` - 檢查團隊存取權限
- `filterAccessibleTeams(teams, accessibleTeams)` - 篩選可存取團隊
- `validateTeamId(teamId, accessibleTeams, availableTeams)` - 驗證團隊 ID 有效性
- `getTeamName(teamId, teams)` - 取得團隊名稱

**功能特性：**
- 自動快取失敗降級（返回過期快取）
- 詳細的驗證錯誤訊息
- 支援部分可用的 TCRT API（若 /teams endpoint 不可用）

### 2. 更新服務

#### AuthService (`backend/src/auth/auth.service.ts`)

**新方法（直接登入流程）：**
- `login(usernameOrEmail, password, ipAddress, userAgent)` - 完整的登入流程
  * 呼叫 TCRT 登入 API
  * 取得使用者詳細資訊
  * 角色對應與驗證
  * 建立本地 JWT token
  * 建立 session（包含 TCRT token metadata）
  * 審計記錄

- `logout(sessionId, tcrtToken, ipAddress, userAgent)` - 登出流程
  * 撤銷 TCRT token
  * 失效 session
  * 審計記錄

- `syncTeams(tcrtToken, userId, ipAddress, userAgent)` - 團隊同步
  * 呼叫 TCRT 團隊同步服務
  * 審計記錄成功/失敗

- `refreshAccessToken(userId, sessionId, ipAddress, userAgent)` - Token 刷新
  * 驗證 TCRT token 有效性
  * 建立新的本地 JWT token
  * 更新 session

- `validateTcrtToken(tcrtToken)` - TCRT token 驗證
- `getTcrtUserInfo(tcrtToken)` - 取得 TCRT 使用者資訊

**移除方法：**
- `initiateOAuthLogin()` - OAuth login 初始化
- `handleOAuthCallback()` - OAuth callback 處理

#### AuthController (`backend/src/auth/auth.controller.ts`)

**新端點：**
- `POST /api/v1/auth/login` - 直接登入
  * 請求：`{ username: string; password: string }`
  * 回應：JWT token + 使用者資訊 + session ID

- 更新的端點：
  * `GET /api/v1/auth/profile` - 取得個人檔案
  * `POST /api/v1/auth/logout` - 登出
  * `POST /api/v1/auth/teams/sync` - 同步團隊
  * `POST /api/v1/auth/refresh` - 刷新 token
  * `GET /api/v1/auth/session/status` - 檢查 session 狀態

**移除端點：**
- `POST /api/v1/auth/login/initiate` - OAuth 初始化
- `POST /api/v1/auth/oauth/callback` - OAuth callback

#### SessionService (`backend/src/auth/services/session.service.ts`)

**Schema 更新：**
- 新增 `metadata` 欄位（Object 型別，預設值為 {}）
- 簡化 schema（移除 OAuth 相關欄位：state, codeVerifier, refreshToken 等）

**新方法：**
- `invalidateUserSessions(userId)` - 撤銷使用者所有 session
- 改進的 session cleanup 機制（自動刪除過期 session）

**方法簽名更新：**
- `createSession()` - 新增 metadata 參數支援

### 3. 更新模組

#### AuthModule (`backend/src/auth/auth.module.ts`)

**提供者註冊：**
- 新增 `TcrtDirectAuthService`
- 新增 `TcrtTeamsSyncService`
- 移除 `TcrtOAuthService`

**匯出：**
- 新增 `TcrtDirectAuthService`
- 新增 `TcrtTeamsSyncService`

### 4. 配置更新

#### `backend/config/default.example.yaml`

**新增 TCRT 配置段：**
```yaml
tcrt:
  apiBaseUrl: http://localhost:9999/api
  requestTimeout: 10000
```

**調整 JWT 配置：**
- `expiresIn: 7d` (與 TCRT token 期限一致，604800 秒)

**調整 Session 配置：**
- `maxAge: 604800` (7 天)

## API 流程

### 登入流程

```
1. 前端: POST /api/v1/auth/login
   ├─ username: 使用者名稱
   └─ password: 密碼

2. 後端 AuthService.login()
   ├─ 呼叫 TcrtDirectAuthService.login()
   │  └─ POST http://localhost:9999/api/auth/login → TCRT JWT token
   ├─ 呼叫 TcrtDirectAuthService.getUserInfo()
   │  └─ GET http://localhost:9999/api/auth/me (Bearer token) → 使用者資訊
   ├─ 角色對應 (TCRT role → Story Map role)
   ├─ 建立本地 JWT token
   ├─ SessionService.createSession() - 儲存 TCRT token 在 metadata
   ├─ AuditService.logAuthentication() - 記錄登入
   └─ 回傳 token + 使用者資訊 + sessionId

3. 前端儲存
   ├─ localStorage: accessToken (本地 JWT)
   └─ 使用者資訊
```

### 團隊同步流程

```
1. 前端: POST /api/v1/auth/teams/sync
   └─ Bearer token (本地 JWT)

2. 後端 AuthService.syncTeams()
   ├─ 取得 TCRT token 從 session metadata
   ├─ 呼叫 TcrtTeamsSyncService.getUserTeams()
   │  ├─ 檢查快取（10 分鐘）
   │  └─ 若無快取或過期：
   │     ├─ 呼叫 TcrtDirectAuthService.getUserInfo()
   │     │  └─ GET http://localhost:9999/api/auth/me → accessible_teams
   │     └─ 試圖取得詳細團隊資訊
   ├─ AuditService.logAuthentication() - 記錄同步
   └─ 回傳團隊列表

3. 快取機制
   ├─ 快取時間: 10 分鐘
   ├─ 失敗降級: 返回過期快取
   └─ 強制刷新: forceRefresh=true
```

### Token 驗證與刷新流程

```
1. 每次 API 呼叫
   ├─ JwtStrategy 驗證本地 JWT token
   └─ 若無效 → 401 Unauthorized

2. 前端檢測到 401
   ├─ POST /api/v1/auth/refresh
   │  ├─ sessionId
   │  └─ Bearer token (過期的本地 JWT)
   
3. 後端 AuthService.refreshAccessToken()
   ├─ SessionService.getSession(sessionId) → 取得 TCRT token
   ├─ TcrtDirectAuthService.validateToken() → 驗證 TCRT token
   │  └─ POST http://localhost:9999/api/auth/validate-token
   ├─ 若 TCRT token 仍有效：
   │  ├─ 建立新的本地 JWT token
   │  ├─ SessionService.refreshSession() → 更新 session
   │  └─ 回傳新 token
   └─ 若 TCRT token 已過期：401

4. 前端
   ├─ 若刷新成功: 儲存新 token，重試原始請求
   └─ 若刷新失敗: 導向登入頁
```

### 登出流程

```
1. 前端: POST /api/v1/auth/logout
   ├─ sessionId
   └─ Bearer token (本地 JWT)

2. 後端 AuthService.logout()
   ├─ SessionService.getSession(sessionId) → 取得 TCRT token
   ├─ TcrtDirectAuthService.logout()
   │  └─ POST http://localhost:9999/api/auth/logout → 撤銷 TCRT token
   │     (失敗不中斷流程)
   ├─ SessionService.invalidateSession(sessionId) → 失效本地 session
   ├─ AuditService.logAuthentication() - 記錄登出
   └─ 回傳確認訊息

3. 前端
   ├─ 清除 localStorage
   └─ 導向登入頁
```

## 安全設計

### Token 管理
- **TCRT Token**: 僅存於伺服器 session metadata，不洩漏給前端
- **本地 JWT**: 作為前端驗證憑證，自動簽名與驗證
- **Token 有效期**: 
  - TCRT token: 7 天（由 TCRT 決定）
  - 本地 JWT: 7 天（與 TCRT token 一致）
  - Session: 7 天

### 權限驗證
- **角色對應**: 根據 TCRT 角色自動對應至 Story Map 角色
- **每次請求**: JwtStrategy 驗證本地 JWT token 與角色
- **團隊存取**: 使用者只能存取 TCRT 授權的團隊

### 審計記錄
- 所有登入/登出/token 操作均記錄
- 包含使用者、時間戳、IP 地址、User-Agent

## 向後相容性

### 移除項目
- OAuth2/OIDC 流程（不再支援）
- `TcrtOAuthService`（已棄用）
- OAuth 相關端點

### 需要更新的項目
- **前端登入頁**: 從 OAuth flow 改為直接帳號密碼登入
- **前端 HTTP 攔截器**: 
  - 檢查 Bearer token 是否有效
  - 自動處理 token 刷新（401 時）
  - token 失敗時導向登入頁

## 測試清單

### 單元測試
- [ ] TcrtDirectAuthService.login() - 成功與失敗情況
- [ ] TcrtDirectAuthService.mapTcrtRoleToStorymapRole() - 所有角色對應
- [ ] TcrtTeamsSyncService.getUserTeams() - 快取與刷新
- [ ] AuthService.login() - 完整登入流程
- [ ] AuthService.refreshAccessToken() - token 刷新

### 整合測試
- [ ] 登入流程 (TCRT → 本地 session → JWT token)
- [ ] 登出流程 (撤銷 TCRT token → 失效 session)
- [ ] Token 驗證流程 (過期 → 自動刷新)
- [ ] 團隊同步流程 (快取 → 過期 → 重新取得)
- [ ] 權限檢查 (不同角色的存取控制)

### E2E 測試
- [ ] 完整登入-使用-登出流程
- [ ] 跨瀏覽器分頁 token 同步
- [ ] Session 過期與重新登入
- [ ] 多次登入與登出

## 已知限制

1. **TCRT Teams API**: 
   - 目前 TCRT 可能沒有單獨的 `/api/teams` endpoint
   - 解決方案: 使用 `/api/auth/me` 的 `accessible_teams` 取得團隊 ID
   - 需要與 TCRT 合作實作完整的團隊 API 或共享資料庫存取

2. **Token 過期處理**:
   - TCRT token 與本地 JWT 都設為 7 天
   - 無法自動延長有效期
   - 需要重新登入

3. **多實例部署**:
   - Session 儲存於 MongoDB
   - 需要確保 MongoDB 在多實例部署中可用
   - 考慮使用 Redis 快取團隊資料以提高效能

## 下一步工作

1. [ ] 更新前端登入頁面以支援直接帳號密碼登入
2. [ ] 實作前端 HTTP 攔截器與 token 自動刷新
3. [ ] 撰寫完整的整合測試
4. [ ] 部署到測試環境進行 E2E 測試
5. [ ] 與 TCRT 協商實作完整的 Teams API
6. [ ] 實作快取層 (Redis) 優化效能

## 參考資源

- TCRT 專案: `/Users/hideman/code/test_case_repo_tool_with_permission`
- TCRT 認證實作: `/app/api/auth.py` (Python/FastAPI)
- 概念驗證腳本: `test_tcrt_auth_integration.py`
- TCRT 整合指南: `TCRT_INTEGRATION_GUIDE.md`
