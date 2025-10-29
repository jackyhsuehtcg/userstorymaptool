# Node ID 生成和顯示改進總結

## 改進內容

### 背景問題
- 原始實現使用 `Date.now()` 生成 Node ID
- 在同一毫秒內快速創建多個節點時存在 ID 碰撞風險
- Node ID 在卡片上顯示過於突兀（"ID: a1b2c3d4"）

### 實施方案

#### 1. ID 生成改進
**文件**: `frontend/src/utils/id.ts` (新建)

```typescript
generateNodeId(): string
- 使用 crypto.randomUUID() 生成 UUID v4
- 格式: "node-{uuid}" 例如: "node-f9ba07f0-4f80-4a31-a871-ed5dd04c8fbe"
- 保證全局唯一性
```

**優勢**:
- ✅ 真正的加密安全隨機性
- ✅ 無時間戳碰撞問題
- ✅ 符合業界標準 (UUID v4)
- ✅ 無需額外依賴（原生 browser API）

#### 2. ID 顯示改進
**文件**: `frontend/src/components/NodeCard.tsx` 和 `NodeCard.scss`

**方式**:
- 移除顯眼的 "ID" 標籤
- 在卡片上顯示 6 字符的十六進制編碼 (最後 6 位)
- 例如: `4c8fbe` 而不是 `ID: f9ba07f0`
- Hover 時顯示完整 UUID 的 tooltip
- 背景顏色改為 transparent，只在 hover 時突出

**UI 改變**:
```
之前: [ID a1b2c3d] (灰色背景，突兀)
之後: 4c8fbe (透明背景，低調，hover 時柔和)
```

#### 3. 完整 ID 參考
**位置**: EditPanel.tsx (無需修改)
- 編輯面板繼續顯示完整 Node ID
- 便於用戶複製和參考

### 驗證結果

#### 構建驗證
- ✅ TypeScript 編譯: 0 錯誤
- ✅ Vite 構建: 成功 (1.33s)
- ✅ 無警告信息

#### 功能驗證
實時測試創建節點:

| 測試項目 | 結果 | 備註 |
|---------|------|------|
| UUID 生成 | ✅ | 真正的 UUID v4 格式 |
| ID 唯一性 | ✅ | 2 個節點有不同 UUID |
| 顯示效果 | ✅ | 6 字符十六進制顯示 |
| Tooltip | ✅ | Hover 時顯示完整 UUID |
| 編輯面板 | ✅ | 顯示完整 ID |

#### 實際例子
```
節點 1: node-f9ba07f0-4f80-4a31-a871-ed5dd04c8fbe → 顯示 "4c8fbe"
節點 2: node-8f72610e-8b36-4dc1-b9e2-200b4712cec2 → 顯示 "12cec2"
```

### 代碼統計
- 新增文件: `frontend/src/utils/id.ts` (46 行)
- 修改: `Toolbar.tsx` (+1 行導入, -1 行舊代碼)
- 修改: `NodeCard.tsx` (+1 行導入, -2 行 ID 顯示)
- 修改: `NodeCard.scss` (25 行新樣式)
- 總計: ~40 行淨增加

### Git 提交
```
Commit: 0837f1d
feat: improve Node ID generation with UUID v4 and subtle display
```

### 相容性
- ✅ 向前相容: 使用 UUID 替換 Date.now() ID 不影響現有邏輯
- ✅ 無破壞性更改: ID 仍在 node 對象中以相同名稱存儲
- ✅ 跨瀏覽器: crypto.randomUUID() 在現代瀏覽器中原生支援

### 後續改進建議
1. 如果需要兼容舊版本，可考慮遷移脚本
2. 可在 EditPanel 中添加 "Copy ID" 按鈕方便複製
3. 可考慮為不同類型的 ID（邊線、團隊等）添加前綴區分
