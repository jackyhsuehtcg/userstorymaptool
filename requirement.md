# User Story Map Tool 實作需求文件 (v2.0)

## 概述
本文件基於 `test.tsx` 中的 User Story Map Mockup，定義系統的功能需求。採用 BDD (Behavior-Driven Development) 風格，使用 Given-When-Then 格式描述場景。**此版本已根據建議進行修訂，引入 React Flow 作為視覺化核心，並擴充了多項關鍵功能。**

## 系統架構
- **前端框架**: React + TypeScript
- **視覺化**: **React Flow** (搭配 `dagre` 或其他佈局演算法進行自動佈局)
- **狀態管理**: **Zustand** (用於全局狀態管理，包含歷史紀錄以支援 Undo/Redo)
- **UI 組件**: Bootstrap 5.x（與 TCRT 相同版本），載入 TCRT 客製 SCSS/Design Tokens 以確保視覺與互動一致
- **資料結構**: React Flow 的 `nodes` 與 `edges` 陣列，搭配來自權限系統 (TCRT) 的 `teams` 清單
- **多語系框架**: react-i18next (或等效方案)，翻譯資源以 JSON 檔存於 `locales/<lang>.json`
- **權限與外部依賴**: 整合 TCRT (Test Case Repo Tool with Permission，路徑 `/Users/hideman/code/test_case_repo_tool_with_permission`) 的身份驗證與授權模組
- **後端框架**: NestJS (Node.js + TypeScript)，採模組化架構整合認證、授權、MongoDB 操作
- **外部 API**: 提供 RESTful API 供外部系統讀取/更新 user story map，採用 API Token 驗證
- **資料庫**: MongoDB (建議使用 replica set)，管理 user story nodes、edges、audit logs、API tokens 等資料
- **設定檔**: 以 YAML (`config/default.yaml`, `config/{env}.yaml`) 管理環境參數，包含 MongoDB 連線、TCRT OAuth、API Token 設定等
- **版本控制**: `.gitignore` 必須排除所有敏感與臨時檔 (例如 `config/*.yaml`, `*.env`, `logs/`, `tmp/`)；僅提供範本檔 `config/default.example.yaml` 供開發者複製使用
- **認證介面**: 提供登入/登出 UI，並顯示來自 TCRT 的個人檔案資訊 (姓名、Email、角色)

## 資料 Schema 與約束
- **Node 資料**: `{ id: string, type: 'storyNode', position: { x: number, y: number }, data: { team: TeamId, summary: string, description?: string, ticketIds: string[], ancestorPath: string[] } }`
  - `position` 僅在使用者拖動後更新；初始佈局會覆寫 `position`。
  - `ancestorPath` 以父節點 `id` 排序，供驗證避免循環。
  - `TeamId` 必須存在於 TCRT 回傳的 `teams` 清單中，未填或未知時需提示使用者重新同步或聯繫管理員。
- **Tree Edge 資料**: `{ id: string, source: string, target: string, type: 'tree', data: { order: number } }`
  - `order` 決定兄弟節點排序。
  - Tree Edge 僅允許一個 `target` 有一個 `source`，`target` 為根節點時不建立 Tree Edge。
- **Cross Edge 資料**: `{ id: string, source: string, target: string, type: 'cross', data: { kind: 'depends' | 'blocks' | 'relates' } }`
  - Cross Edge 不參與 dagre 佈局計算，只負責視覺化關聯。
- **Team 資料**: 透過權限系統 TCRT API 取得，介面為 `GET /api/teams` 回傳 `Array<{ id: string, labelKey: string, fallbackName: string, color?: string, descriptionKey?: string, active: boolean }>`
  - `id` 為唯一鍵，由 TCRT 管理，前端禁止自行新增/修改。
  - `labelKey` 與 `descriptionKey` 由 TCRT 提供，格式遵循 `team.<id>.name` / `team.<id>.description`。
  - `fallbackName` 作為翻譯缺失時的顯示名稱。
  - `active` 表示團隊是否可被選用，前端需遵從 TCRT 狀態。
- **佈局策略**:
  - 初始載入與新增/刪除 Tree Edge 時使用 dagre 計算佈局，並覆寫受影響節點的 `position`。
  - 使用者拖動節點後的 `position` 被視為手動優先值，除非 Tree 結構發生變動或使用者對節點選擇「重新套用佈局」。
  - dagre 計算僅以 Tree Edge 作為輸入，Cross Edge 需在結果上繪製。
- **資料儲存 (MongoDB)**:
  - 資料庫命名為 `storymap`; 主要集合：
    - `nodes`: `{ _id: ObjectId, nodeId: string, data: NodeData, parentId?: string | null, order: number, createdAt, updatedAt }`
      - 對 `nodeId` 設唯一索引；對 `parentId, order` 建複合索引用於排序；對 `data.team` 建索引以支援 `teamId` 查詢。
      - 需額外索引 `data.summary`, `data.description` 使用全文檢索 (text index)，並對 `data.ticketIds`, `data.customTags` 建索引，以支援多條件搜尋。
    - `edges`: `{ _id, edgeId: string, from: string, to: string, kind: string, createdAt, updatedAt }`
      - 對 `edgeId` 與 `from/to` 建索引，確保快速查詢與唯一性。
    - `auditLogs`: `{ _id, actorId, action, payload, createdAt }`，保留重要操作紀錄。
    - `apiTokens`: `{ _id, name, hash, scopes, createdAt, expiresAt, revokedAt? }`，hash 使用 SHA-256。
  - 發布結構異動時需透過 migration script 更新現有資料；避免在 MongoDB 內嵌大型檔案，僅儲存節點與關係資料。

- **設定檔 (YAML)**:
  - 路徑：`config/default.yaml` 為基礎設定，`config/{env}.yaml` (例如 `config/production.yaml`) 覆蓋差異；敏感資訊透過環境變數注入或使用 `.secrets.yaml` (皆列入 `.gitignore`)。
  - 版本控制僅保留 `config/default.example.yaml` 範本檔，供開發者複製為實際設定。
  - 結構範例：

```yaml
app:
  port: 4000
  baseUrl: https://storymap.example.com
  logLevel: info

auth:
  tcrt:
    issuer: https://tcrt.example.com/auth
    clientId: STORYMAP_UI
    clientSecretEnv: STORYMAP_TCRT_SECRET  # 從環境變數讀取
    callbackUrl: https://storymap.example.com/api/auth/callback
    logoutUrl: https://tcrt.example.com/logout

database:
  mongo:
    uri: mongodb://user:pass@db-primary:27017,db-secondary:27017/storymap?replicaSet=rs0
    options:
      retryWrites: true
      w: majority

api:
  tokens:
    hashAlgorithm: sha256
    defaultExpiryDays: 90
    rateLimit:
      windowMinutes: 1
      maxRequests: 60

search:
  textIndexWeights:
    summary: 5
    description: 2
  defaultPageSize: 20
  maxPageSize: 100

ui:
  bootstrapTheme: tcrt
  savedFiltersLimit: 10
```

  - NestJS 啟動時需載入對應 YAML，並支援環境變數覆寫 (`process.env`)；禁止將密碼或 Client Secret 寫死在 YAML 中。

## 功能需求

### 1. 樹狀視覺化 (Tree Visualization)

#### 場景 1.1: 初始載入樹狀結構
**Given** 應用程式載入時，有預設的節點與邊線資料  
**When** 使用者開啟頁面  
**Then** 系統應使用佈局演算法 (如 `dagre`) 計算節點初始位置  
**And** React Flow 應根據計算好的位置渲染所有節點與邊線  
**And** 每個節點顯示為一個自訂的卡片組件 (Custom Node)  
**And** 父子關係以邊線 (Edge) 連接  

#### 場景 1.2: Tree 結構變更重新佈局
**Given** Tree Edge 被新增、刪除或重新排序 (調整 `data.order`)  
**When** `nodes` 或 `edges` 狀態更新  
**Then** 系統應以 dagre 重新計算受影響節點的佈局座標  
**And** React Flow 平滑地更新 Tree Edge 與節點位置  
**And** 使用者手動調整過的節點若未受 Tree 結構影響，保留其目前 `position`  

#### 場景 1.3: 節點卡片顯示
**Given** 節點資料 (`node.data`) 包含 id, team, summary, description, ticketIds  
**When** 渲染節點  
**Then** 卡片應顯示:  
- 上方: "{id} · {t(team.labelKey) || team.fallbackName}" (11px, muted)  
- 中間: summary (14px, font-medium, truncate)  
- 下方: 票證標籤 (支援 JIRA / TCG / TP 格式，最多 3 個，超過顯示 +N)  
**And** 卡片樣式為 rounded-xl border bg-white shadow-sm  

#### 場景 1.4: 使用者手動拖曳節點
**Given** Tree Edge 結構未變動  
**When** 使用者拖曳節點調整位置  
**Then** React Flow 更新該節點的 `position` 並標記為手動座標  
**And** 系統僅重新計算受拖曳影響的 Cross Edge 曲線，但不呼叫 dagre  

#### 場景 1.5: 重新套用佈局
**Given** 節點被手動調整過位置  
**When** 使用者點擊「重新套用佈局」按鈕或 Tree Edge 結構變更  
**Then** 系統以 dagre 覆寫相關節點的 `position`  
**And** 清除「手動座標」標記，使後續 Tree 變更可繼續套用自動佈局  

#### 場景 1.6: Team Space 佈局
**Given** TCRT 提供的團隊清單 (active=true)  
**When** 渲染整體 Story Map  
**Then** 畫布應依團隊建立水平區塊 (Team Space/Lane)，每個空間以團隊顏色與標題顯示  
**And** 節點依其 `team` 屬性對應到 Team Space 中顯示，無需使用者手動建立  
**And** 當團隊在 TCRT 被啟用/停用時，重新同步即可更新 Team Space 結構 (停用團隊的節點需提示重新指派)  
**And** Team Space 僅負責視覺分組，不限制跨 Team Space 的節點連結或依附關係  

### 2. 節點編輯 (Node Editing)

#### 場景 2.1: 選取節點
**Given** 使用者點擊節點卡片  
**When** React Flow 的 `onNodeClick` 事件觸發  
**Then** 設定 `selectedId` 為該節點 ID  
**And** 右側編輯面板顯示該節點的編輯介面  
**And** 節點卡片透過 `node.selected` 屬性顯示選取樣式 (如 ring-2 ring-primary)  

#### 場景 2.2 ~ 2.9 (與 v1 相同，摘要如下)
- **編輯團隊/摘要/描述**: 更新 `node.data` 中的對應欄位，其中團隊下拉選單僅列出 `teams` 清單中 `active=true` 的項目，顯示文字透過 `t(labelKey)` 取得，並在選項缺失時提示管理團隊設定。
- **新增/刪除票證代碼**: 更新 `node.data.ticketIds` 陣列，可一次輸入多個 JIRA / TCG / TP 代碼，並支援批次移除。
- **新增子節點/根節點**: 在 `nodes` 陣列中新增節點，並在 `edges` 陣列中新增對應的父子邊線。
- **刪除節點**: 從 `nodes` 和 `edges` 陣列中移除該節點及其相關的所有邊線。

#### 場景 2.10: 拖放調整節點層級 (新)
**Given** 使用者按住一個節點卡片  
**When** 使用者將其拖放到另一個節點 (目標節點) 上  
**Then** 系統應先驗證目標節點不是拖曳節點的子孫、且拖曳節點非根節點  
**And** 若驗證通過，更新 Tree Edge，使拖曳節點成為目標節點的子節點，並重算受影響 Tree Edge 的 `data.order`  
**And** Dagre 僅針對相關子樹重新計算佈局，其他手動座標維持  
**When** 使用者將節點拖放到同層級插入區域  
**Then** 依插入位置更新兄弟節點的 `data.order`，並重新套用該層級佈局  

#### 場景 2.11: 拖放失敗回饋 (新)
**Given** 使用者嘗試拖放節點至非法位置 (例如拖曳根節點、或目標為自身/子孫)  
**When** 驗證失敗  
**Then** 系統應取消此次拖放，節點回到原位置  
**And** 以 toast 或 inline 提示顯示失敗原因  

### 3. 跨邊關係 (Cross-Edges)

#### 場景 3.1 & 3.2 (與 v1 相同)
- **新增/刪除跨邊關係**: 在 `edges` 陣列中新增或移除一個 `type: 'cross'` 的邊線，並驗證來源與目標節點皆存在。

#### 場景 3.3: 視覺化跨邊關係
**Given** `edges` 陣列中有跨邊關係的資料 (e.g., `edge.data.kind` 存在)  
**When** 渲染 SVG  
**Then** React Flow 應渲染一個自訂邊線組件 (Custom Edge)  
**And** Cross Edge 不參與 dagre 佈局，僅以節點最終 `position` 計算路徑  
**And** 根據 `edge.data.kind` 顯示不同顏色: depends=#f59e0b, blocks=#ef4444, relates=#0ea5e9  
**And** 根據是否高亮，顯示不同線寬與透明度  

#### 場景 3.4: 跨邊目標失效處理 (新)
**Given** 節點被刪除或匯入資料缺少對應節點  
**When** 渲染 Cross Edge  
**Then** 系統應自動移除指向不存在節點的 Cross Edge，並在匯入流程顯示異常摘要  

#### 場景 3.5: 跨團隊連結
**Given** 來源與目標節點位於不同 Team Space  
**When** 新增或編輯跨邊關係  
**Then** 系統應允許建立跨 Team Space 的跨邊 (例如 FE 節點連到 BE 節點)  
**And** SVG 連線需跨越 Team Space 區塊並保持既有的顏色/寬度規則  
**And** 若其中任一節點所屬團隊被 TCRT 停用，顯示警示並要求在同步後重新檢查該跨邊  

### 4. 高亮與聚焦 (Highlighting and Focus)

#### 場景 4.1: 點擊節點聚焦
**Given** 使用者點擊節點  
**When** `focusId` 狀態被設定  
**Then** 透過更新 `nodes` 和 `edges` 的 `data` 屬性或 `className`，觸發樣式變更  
**And** 高亮該節點、其祖先鏈、以及相關的跨邊鄰居  
**And** 其他節點與邊線變暗  

### 5. 視圖控制 (Viewport Control) - 已簡化

#### 場景 5.1: 互動式縮放與平移
**Given** React Flow 畫布已渲染  
**When** 使用者使用滑鼠滾輪或拖曳畫布背景  
**Then** 視圖應根據 React Flow 內建的互動進行縮放與平移  

#### 場景 5.2: 控制項按鈕
**Given** 介面上有 "Zoom In", "Zoom Out", "Fit View" 按鈕  
**When** 使用者點擊按鈕  
**Then** 系統應呼叫 `useReactFlow()` hook 提供的方法 (e.g., `zoomIn`, `zoomOut`, `fitView`) 來以程式化方式控制視圖  

### 6. 匯入與匯出功能 (Import & Export) - 已擴充

#### 場景 6.1: 匯出 JSON
**Given** `nodes` 和 `edges` 狀態存在  
**When** 點擊 "匯出 JSON" 按鈕  
**Then** 建立 payload = `{ nodes, edges }`  
**And** 觸發下載，檔名 "user-story-map-{timestamp}.json"  

#### 場景 6.2: 匯入 JSON (新)
**Given** 使用者選擇了一個符合格式的 JSON 檔案  
**When** 點擊 "匯入 JSON" 按鈕並上傳檔案  
**Then** 系統應先透過 schema 驗證檔案內容 (檢查節點/邊線/團隊欄位、版本號、循環依賴)  
**And** 驗證通過後更新 `nodes`, `edges` 狀態，並建立新的 Undo/Redo 快照  
**And** React Flow 重新渲染整個圖表，節點顯示使用匯入後的團隊資料  
**And** 同步更新 localStorage，確保重新整理後資料一致  

#### 場景 6.3: 匯入失敗處理 (新)
**Given** 使用者上傳的 JSON 檔案格式不正確或導致節點缺失  
**When** schema 驗證、Cross Edge 參照檢查或 `TeamId` 對應檢查失敗  
**Then** 系統應維持原有狀態不變  
**And** 透過對話框或 toast 顯示錯誤原因與失敗項目列表  
**And** 於錯誤訊息中提供下載檢查報告的選項 (含錯誤節點 ID)  

### 7. TCRT 團隊資訊 (新)

#### 場景 7.1: 檢視團隊清單
**Given** 使用者點擊工具列中的「團隊資訊」按鈕  
**When** 面板或對話框開啟  
**Then** 以唯讀列表顯示 TCRT 回傳的 `teams`，包含 `id`, `labelKey`, `fallbackName`, `color`, `active` 欄位  
**And** 若本地快取逾時，應即時向 TCRT 重新取得團隊清單  
**And** 顯示文字透過 `t(labelKey)` 取得，當翻譯缺失時顯示 `fallbackName` 並標記警示  
**And** 面板僅提供「重新同步」與「前往 TCRT 管理」連結，不提供新增/編輯/刪除按鈕  

#### 場景 7.2: 導向 TCRT 管理
**Given** 使用者希望調整團隊資料  
**When** 點擊「前往 TCRT 管理」  
**Then** 系統開啟 TCRT 的團隊管理頁面 (另開視窗或分頁)  
**And** 顯示提示文字說明所有團隊 CRUD 需在 TCRT 完成  
**And** 完成操作後可返回本系統並使用「重新同步」取得最新資料，Team Space 會自動依最新團隊狀態更新  

#### 場景 7.3: 同步狀態提示
**Given** 使用者在本系統重新同步團隊清單  
**When** TCRT API 回傳成功  
**Then** 面板顯示最新資料並更新同步時間戳  
**And** 若同步時偵測到節點引用不存在的 `TeamId`，顯示警示並提供節點列表以利調整  

#### 場景 7.4: 匯入匯出一致性
**Given** 使用者匯出或匯入 JSON  
**When** 進行資料驗證  
**Then** 僅輸出節點與跨邊資料，不輸出 `teams` 清單 (由 TCRT 決定)  
**And** 匯入時需向 TCRT 驗證所有 `TeamId` 是否存在並為 `active=true`，若缺失則顯示錯誤並中止匯入  

### 8. 權限與 TCRT 整合

#### 場景 8.0: 登入介面
**Given** 使用者尚未登入  
**When** 造訪系統首頁  
**Then** 顯示登入頁，包含「以 TCRT 帳號登入」按鈕與權限說明  
**And** 點擊後導向 TCRT 的 OAuth2/OIDC 授權流程  
**And** 登入頁需支援多語系文案與錯誤提示  

#### 場景 8.1: 身份驗證流程
**Given** 使用者造訪系統且尚未登入  
**When** 請求任何受保護頁面  
**Then** 系統應導向 TCRT 的登入頁 (如 `/auth/login`)  
**And** 登入成功後，TCRT 透過 OAuth2/OIDC callback 將使用者導回本系統，並提供包含使用者資訊與角色的存取憑證 (JWT)  
**And** 本系統應驗證憑證簽章與有效期限，建立本地 session  

#### 場景 8.2: 授權與角色對應
**Given** 使用者已登入  
**When** TCRT 回傳角色清單 (例如 `storymap.admin`, `storymap.editor`, `storymap.viewer`)  
**Then** 本系統應根據角色授權：  
- `storymap.admin`: 可編輯節點、管理跨邊、匯入/匯出、存取 API Token 管理  
- `storymap.editor`: 可編輯節點與跨邊，但無法管理 API Token  
- `storymap.viewer`: 僅可檢視與匯出 JSON  
**And** 若使用者缺少任何 `storymap.*` 角色，顯示無權存取訊息  

#### 場景 8.3: 個人檔案展示
**Given** 使用者已登入  
**When** 點擊導覽列中的個人頭像或名稱  
**Then** 開啟個人檔案面板，顯示 TCRT 提供的姓名、Email、角色列表與最後登入時間  
**And** 提供「管理我的帳號 (前往 TCRT)」連結  
**And** 若 TCRT token 內含頭像 URL，顯示頭像；否則顯示預設圖示  

#### 場景 8.4: 團隊資料同步
**Given** 使用者登入後  
**When** 系統需顯示團隊下拉選單或團隊列表  
**Then** 應向 TCRT 呼叫 `GET /api/teams` (攜帶登入後取得的 access token)  
**And** 將結果快取於記憶體，最多保留 10 分鐘  
**And** 若使用者觸發「重新同步」按鈕，應強制重新呼叫 API  

#### 場景 8.5: 登出流程
**Given** 使用者已登入  
**When** 點擊「登出」按鈕  
**Then** 系統清除本地 session、localStorage 快取與快照  
**And** 導向 TCRT 的登出端點完成 SSO 登出，再返回登入頁  
**And** 顯示確認訊息提示使用者已成功登出  

#### 場景 8.6: 權限失效處理
**Given** 使用者 session 仍存在  
**When** 後端 API 回應 401/403 (例如 access token 過期)  
**Then** 前端應清除本地 session，導向 TCRT 重新登入  
**And** 未儲存的編輯內容需提示使用者先匯出或暫存  

#### 場景 8.7: 審計與記錄
**Given** 使用者對節點或跨邊進行增刪改  
**When** 提交變更  
**Then** 系統應在本地紀錄操作日誌，內容包含使用者 ID (來自 TCRT token)、時間戳、操作描述  
**And** 重要操作 (匯入、API Token 發放) 應同步呼叫 TCRT 的審計 API (若可用)  

- **Bootstrap 核心**: 以 Bootstrap 5.x Grid/SVG Utilities 建構佈局，沿用 TCRT 客製化樣式。
- 左右分欄佈局，左側為圖表，右側為編輯面板。
- 根據是否選取節點，顯示編輯器或提示訊息。
- 按鈕、表單、Modal、Toast 等元件需使用 Bootstrap 元件並套用 TCRT 的客製 SCSS (字體、配色、陰影、圓角)。

### 10. 資料管理與狀態

#### 場景 10.1: 狀態初始化
**Given** 應用程式啟動  
**When** Zustand store 初始化  
**Then** 系統應先以使用者 session token 呼叫 `GET /api/v1/map` 取得最新 `nodes`, `edges`  
**And** 取得成功後更新前端狀態與 `localStorage` 快取 (供離線閱讀)  
**And** 若 API 呼叫失敗且離線快取存在，提示使用者目前顯示為快取資料  
**And** 其他 UI 狀態 (如 `selectedId`, `focusId`) 設為初始值  
**And** 系統應同時向 TCRT 發送 `GET /api/teams` 取得最新團隊清單，並於成功後更新本地快取  
**And** 若偵測到儲存版本與程式版本不一致，需執行 schema migration 或回報錯誤  

#### 場景 10.2: 資料持久化 (新)
**Given** `nodes` 或 `edges` 狀態發生任何變更  
**When** 使用者點擊「儲存」或自動儲存機制觸發  
**Then** 系統應呼叫 `PUT /api/v1/map` 將最新 `{ nodes, edges }` 上傳  
**And** 後端需使用 MongoDB transaction（或 session）同步更新 `nodes`、`edges` 集合，確保資料一致  
**And** 成功後才更新本地 `localStorage` 快取與 Undo/Redo 快照  
**And** 若 API 儲存失敗，應保留快取但顯示錯誤並提供重試，禁止覆蓋伺服端資料  
**And** 系統須記錄 TCRT 團隊資料的同步時間 (timestamp) 於 `localStorage`，僅做快取判斷，不儲存實際團隊清單  

#### 場景 10.3: 持久化抽換 (新)
**Given** 專案後續可能接入遠端 API 進行儲存  
**When** 開發者提供自訂 persistence provider  
**Then** 應透過抽象介面 (例如 `saveMap(payload)`、`loadMap()`) 取代直接存取 `localStorage`，其中 `payload` 僅包含 `nodes`, `edges`  
**And** 團隊資料仍需透過 TCRT API 取得，抽換儲存層不得影響此流程  

#### 場景 10.4: TCRT 同步失敗處理 (新)
**Given** 系統需取得最新團隊清單  
**When** 呼叫 TCRT API 失敗或逾時  
**Then** 系統應顯示警示並允許使用最後一次成功的快取 (標記為「可能過期」)  
**And** 禁止新增/刪除節點的團隊指派，直到重新同步成功  
**And** 提供重試按鈕與錯誤詳細資訊，便於管理員排查  

### 11. 復原與重做 (Undo/Redo) (新)

#### 場景 11.1: 撤銷操作
**Given** 使用者已執行一項或多項操作 (如新增節點、編輯摘要)  
**When** 使用者按下 `Ctrl+Z` 或點擊 "復原" 按鈕  
**Then** 應用程式狀態應恢復到上一個儲存的快照，包含 `nodes`, `edges`, `selectedId`, `focusId`  
**And** 需避免在尚未完成匯入流程或 schema 遷移時建立快照  

#### 場景 11.2: 重做操作
**Given** 使用者已執行撤銷操作  
**When** 使用者按下 `Ctrl+Y` 或點擊 "重做" 按鈕  
**Then** 應用程式狀態應前進到下一個儲存的快照  
**Note** 此功能可透過 Zustand 的 `zustand/middleware/temporal` 來實現，並限制快照上限 (例如 50 筆) 以控制記憶體占用。

#### 場景 11.3: 快照與持久化協調 (新)
**Given** localStorage 寫入具有延遲  
**When** 使用者快速連續執行多個操作  
**Then** 快照應在操作提交時建立，而持久化寫入可延遲批次處理  
**And** 當快速 Undo/Redo 時，不得因尚未完成的寫入造成狀態回滾失敗  

### 12. 效能與邊界處理
- **量化指標**: 在 200 節點 / 250 Tree Edge / 80 Cross Edge 的資料集下，首次載入 (含 dagre 佈局) 應小於 2 秒，互動操作 (拖曳節點、切換聚焦) 每幀渲染時間維持於 16 ms 以內。
- **效能優化**: React Flow 需啟用 `onlyRenderVisibleElements` 與節流拖曳事件，Cross Edge 路徑計算應快取結果並於相關節點移動時才重新計算。
- **錯誤處理**: 匯入檔案格式錯誤、資料不一致等情況應有友善的錯誤提示，並產生詳盡錯誤報告供使用者下載。
- **資源限制**: 當節點數超過 300 時顯示警告，提示使用者可能需要縮小資料範圍或分拆圖表。

### 13. 多語系與在地化 (Localization)

#### 場景 13.1: 翻譯資源檔結構
**Given** 專案提供 `locales/<lang>.json` 翻譯檔  
**When** 系統啟動  
**Then** 需載入預設語系 (預設 `zh-TW`) 與可選語系 (`en`, `ja` 可擴充)  
**And** 翻譯檔需包含命名空間：`ui`, `team`, `messages`  
**And** `team.<teamId>.name` 與 `team.<teamId>.description` 必須對應到所有 `teams` 的 `labelKey` 與 `descriptionKey`

#### 場景 13.2: 語言切換控制
**Given** 介面提供語言切換器 (下拉或按鈕)  
**When** 使用者選擇另一語言  
**Then** 系統以非同步方式載入對應翻譯檔  
**And** 更新 UI 文案、節點卡片團隊名稱、提示訊息等  
**And** 將選擇儲存在 localStorage，以便重新載入時套用  

#### 場景 13.3: 翻譯缺失處理
**Given** 翻譯檔缺少某個 key  
**When** 呼叫 `t(labelKey)` 取得字串  
**Then** 顯示對應 `fallbackName` 或預設文字  
**And** 於 console.warn 或錯誤追蹤服務記錄缺失 key，以利補齊  

#### 場景 13.4: 動態更新翻譯資源
**Given** 開發者在翻譯檔新增或更新文字  
**When** 應用程式偵測到翻譯資源版本變更 (透過 hash 或 build timestamp)  
**Then** 若使用者當前語系受到影響，應提示重新載入或自動刷新翻譯  
**And** 確保團隊設定面板顯示的翻譯即時同步  

#### 場景 13.5: 匯出與翻譯同步
**Given** 使用者匯出 JSON  
**When** payload 建立  
**Then** 不輸出團隊清單，只記錄節點中的 `TeamId` 與當前語言資訊  
**And** 匯入端需自行向 TCRT 取得團隊翻譯  

#### 場景 13.6: i18n 測試
**Given** 測試環境  
**When** 撰寫單元或 E2E 測試  
**Then** 應覆蓋不同語系的渲染結果、語言切換流程與翻譯缺失 fallback 行為  
**And** 提供假翻譯檔協助測試 (例如 `locales/test.json`)  

### 14. 外部 API 與 Token 驗證

#### 場景 14.1: Token 管理介面
**Given** 使用者擁有 `storymap.admin` 角色  
**When** 造訪「API Token 管理」頁面  
**Then** 可查看既有 Token 清單 (僅顯示名稱與建立時間，不顯示純文字 Token)  
**And** 點擊「建立新 Token」時需輸入描述與到期日，系統產生一次性顯示的 Token 值  
**And** Token 應以雜湊 (如 SHA-256) 形式儲存在伺服端設定檔或安全儲存中  

#### 場景 14.2: API 驗證流程
**Given** 外部系統持有有效 Token  
**When** 對 `GET /api/v1/map` 發送請求，並在 `Authorization: Bearer <token>` 標頭附上 Token  
**Then** 系統應驗證 Token 雜湊、有效期限與啟用狀態  
**And** 通過後回傳目前的 `nodes`, `edges` JSON 資料 (不含團隊清單)  
**And** 於 response header 加入 `X-Source-Locale` 表示目前語系  

#### 場景 14.3: 更新 API
**Given** 外部系統需更新 Map 內容  
**When** 對 `PUT /api/v1/map` 發送請求，內含 `{ nodes, edges }`  
**Then** 系統應驗證 Token 具備 `storymap.admin` 或 `storymap.editor` 權限  
**And** 檢查輸入資料 schema，若包含未知 `TeamId` 則向 TCRT 驗證  
**And** 更新成功後建立審計紀錄 (含 Token 名稱、操作者帳號、差異摘要)  

#### 場景 14.4: Token 吊銷與輪替
**Given** 管理者在 Token 管理頁面選擇某 Token  
**When** 點擊「停用」  
**Then** Token 狀態設為 revoked，所有後續 API 請求應回傳 401  
**And** 系統建議管理者通知使用該 Token 的外部系統並提供新 Token  

#### 場景 14.5: API 限速與錯誤處理
**Given** 外部系統在短時間內多次呼叫 API  
**When** 請求超過速率限制 (例如 60 req/min)  
**Then** 系統應回傳 429 並在 header 提供重試時間  
**And** 若驗證失敗或資料 schema 錯誤，應回傳 4xx 與明確錯誤訊息，並於審計紀錄中保存  

#### 場景 14.6: 節點查詢 API
**Given** 外部系統或前端需要查詢節點資料  
**When** 呼叫 `GET /api/v1/nodes`  
**Then** API 應支援以下查詢參數 (可複合使用)：
  - `teamId` (單選或多選)
  - `summary` / `description` 關鍵字 (全文搜尋)
  - `ticketId` (精確 or fuzzy，支援 JIRA / TCG / TP 格式)
  - `createdFrom`, `createdTo`, `updatedFrom`, `updatedTo`
  - `hasCrossEdges` (boolean)
  - `customTags` (陣列)
  - `ancestorId` (搜尋特定父層下的節點)
**And** 支援分頁與排序 (依更新時間、團隊、摘要字母等)
**And** 回傳資料應包含節點核心欄位與可選的父層資訊摘要  
**And** 若查詢特定節點，`GET /api/v1/nodes/:id` 回傳該節點詳細資料與直接子節點 ID 列表；節點不存在時回傳 404  

## 測試建議
- **單元測試**: 測試 Zustand store 中的 actions、自訂的佈局邏輯。
- **整合測試**: 測試節點/邊線操作後，`localStorage` 和畫面是否正確同步。
- **E2E 測試**: 模擬使用者完整流程，如：匯入 -> 編輯 -> 拖放 -> 匯出。
- **團隊資訊同步測試**: 驗證 TCRT 團隊清單同步、快取逾時、缺失 `TeamId` 警示等行為。
- **API 與權限測試**: 驗證 TCRT 權限導流、Token 驗證、API 速率限制與審計紀錄是否符合規格。
- **節點搜尋面板** (Bootstrap Accordion)：
  - 位置：右側編輯區上方新增「搜尋節點」區塊，採 Bootstrap Accordion 顯示。
  - 提供以下 filter 欄位 (可單獨或複合搜尋)：
    - 關鍵字：針對 Summary/Description 的全文搜尋輸入框。
    - Team：多選下拉 (來源為 TCRT 團隊清單)。
    - 票證 ID：可輸入 JIRA / TCG / TP 任一格式 (單一或多個，用逗號分隔，支援部分匹配)。
    - 自訂標籤 (Custom Tags)：多選 Chips/Select。
    - 建立時間/更新時間：Bootstrap Date Range Picker。
    - 父層節點：下拉選擇祖先節點或輸入節點 ID。
    - 是否存在跨邊關係：Toggle Switch。
  - 搜尋結果以表格呈現 (Bootstrap Table)，顯示節點 ID、Summary、Team、最後更新、跨邊數量，並提供「導覽至節點」按鈕。
  - 支援儲存與載入常用搜尋條件 (Saved Filters)，以使用者帳號儲存在 MongoDB。
