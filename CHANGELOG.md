# Changelog

## v1.0.5

- 新增真正經過本機 Wrangler + D1 HTTP 邊界的多人 E2E 測試。
- CI 現在會模擬兩個獨立玩家建房、加入、重新讀取房間、落子與跨玩家同步。
- E2E 驗證 stale revision 會被拒絕、第一手後不能換邊、雙方悔棋、重新開局與開局前交換陣營。
- E2E 驗證揭棋未揭示棋種在 HTTP 回應中保持遮罩。
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
