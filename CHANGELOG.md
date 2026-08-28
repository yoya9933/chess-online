# Changelog

## v1.0.6

- 擴充棋局音效為落子、吃子、將軍、勝利與敗北五種可辨識提示。
- 延用既有音效開關，設定持續儲存在 `localStorage`，重新開啟網站仍會保留偏好。
- 新增版本化 enhancement loader，後續前端增量功能可依部署 commit 自動 cache-bust 載入。

## v1.0.5

- 新增以 Cloudflare 官方 `createTestHarness()` 執行的 Worker + D1 多人端到端整合測試。
- CI 會以正式 `wrangler.jsonc` 啟動本機 Worker、套用 D1 migrations，再模擬兩個獨立玩家的核心流程。
- E2E 驗證建房／加入、Header token 身分恢復、合法走子、跨玩家同步與 stale revision 拒絕。
- E2E 驗證第一手後換邊鎖定、雙方悔棋、重新開局、開局前交換陣營與揭棋暗子遮罩。
- Cloudflare deploy 只有在 unit tests、多人 E2E 與 Wrangler build 全部通過後才執行。

## v1.0.4

- 從 `main` 移除已停用的 Next.js / Vercel / Node hosting 實作與舊建置輸出。
- 移除 `app/`、`api/`、`db/`、`dist/`、舊 hosting script、`next.config.mjs`、`server.js`、`vercel.json`。
- 正式專案結構只保留 Cloudflare Worker、D1 migrations、Static Assets 與測試。
- `dist/` 加入 `.gitignore`，避免歷史建置輸出再次被提交。

## v1.0.3

- 新增暗色科技風、暗金棋子語彙的 SVG favicon。
- 瀏覽器分頁現在會顯示「弈」品牌圖示，不再使用通用文件圖示。

## v1.0.2

- 連線狀態改為實際反映同步結果。
- 新增「重新連線中」與「連線中斷」狀態。
- 瀏覽器離線／恢復上線時會即時更新並嘗試重新同步。

## v1.0.1

- 玩家席位 Token 不再放入房間輪詢 URL。
- `/api/rooms` 與 `/api/change-side` 改以 `X-Player-Token` Header 傳送玩家憑證。
