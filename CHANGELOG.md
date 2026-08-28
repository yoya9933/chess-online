# Changelog

## v1.0.10

- 每個 Worker request 都會產生或沿用 `X-Request-ID`，API 錯誤可用短 ID 對照 Cloudflare Workers Logs。
- Worker 新增 JSON structured request / error logs，不記錄玩家 Token。
- 新增 `/api/health`，回報 Worker、D1 與部署版本 / commit / deployedAt 診斷資訊。
- 前端新增統一錯誤提示面板，API 失敗時會顯示可追查的錯誤代碼。
- 新增 observability 單元測試。

## v1.0.9

- 新增集中式 Worker security middleware，統一驗證 API room/token/action/content-type/body size。
- 玩家 Token 必須透過 `X-Player-Token` Header 傳送，前端 room API 不再依賴 JSON body token。
- 加入每 Token / API route 的 best-effort rate limit，過量請求回傳 429 與 `Retry-After`。
- 全站回應加入 CSP、HSTS、`nosniff`、frame protection、Referrer Policy 與 Permissions Policy。
- 新增安全層單元測試，驗證 Token 格式與主要安全 Headers。

## v1.0.8

- 玩家席位新增 online / 暫離狀態，短暫斷線時保留原本紅黑方席位。
- 過期席位會在後續房間同步時自動釋放，避免幽靈玩家長期佔位。
- 原玩家重新連線後會嘗試恢復先前席位與棋局狀態。
- Worker 新增每 6 小時執行的 Cron cleanup，定期刪除超過 7 天且雙方皆不活躍的舊房間。
- 新增房間生命週期單元測試。

## v1.0.7

- 房間代碼可點擊／鍵盤操作直接複製，並提供明確成功提示。
- 邀請連結按鈕加入成功狀態與複製失敗提示。
- 新增等待對手／雙方已就位的房間狀態，以及新玩家加入提示。
- 建房、重新開局、悔棋、換邊、自訂棋局與走子同步期間會顯示 loading / disabled 狀態，避免重複送出。

## v1.0.6

- 擴充棋局音效為落子、吃子、將軍、勝利與敗北五種可辨識提示。
- 延用既有音效開關，設定持續儲存在 `localStorage`，重新開啟網站仍會保留偏好。
- 新增版本化 enhancement loader，後續前端增量功能可依部署 commit 自動 cache-bust 載入。

## v1.0.5

- 新增以 Cloudflare 官方 `createTestHarness()` 執行的 Worker + D1 多人端到端整合測試。
- CI 模擬兩名玩家完成建房、加入、走子、同步、換邊、悔棋、重新開局與揭棋暗子遮罩。

## v1.0.4

- 從 `main` 移除停用的 Next.js / Vercel / Node hosting 實作與舊建置輸出，只保留 Cloudflare Worker + D1 正式架構。

## v1.0.3

- 新增暗色科技風、暗金棋子語彙的 SVG favicon。

## v1.0.2

- 連線狀態改為實際反映同步結果，加入重新連線與斷線狀態。

## v1.0.1

- 玩家席位 Token 不再放入房間輪詢 URL，改以 `X-Player-Token` Header 傳送。
