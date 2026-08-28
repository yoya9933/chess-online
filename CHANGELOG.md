# Changelog

## v1.1.0

- Mobile / Responsive 2.0：手機棋局改為棋盤優先的單欄布局，棋盤依 viewport 自適應。
- 主要觸控按鈕與選單提供至少約 44px 的操作高度。
- 手機底部新增固定對局操作列，支援 safe-area insets。
- 針對小於 560px 的窄螢幕壓縮 Header、房間資訊與棋子字級。
- 新增手機橫屏短高度專用雙欄布局，讓棋盤維持在一個 viewport 內。

## v1.0.10

- 新增 `X-Request-ID`、Worker structured logs、`/api/health`、D1 / deployment diagnostics 與前端統一錯誤提示。

## v1.0.9

- 新增集中式 API security middleware、Header Token、rate limit、CSP 與常用安全 Headers。

## v1.0.8

- 新增玩家暫離／重連、過期席位釋放與 Cron 舊房間 cleanup。

## v1.0.7

- 改善房間邀請／房號複製、等待對手、加入提示與 loading / disabled 狀態。

## v1.0.6

- 新增落子、吃子、將軍、勝利與敗北音效，並保留音效設定。

## v1.0.5

- 新增 Cloudflare Worker + D1 多人 E2E，部署前驗證核心雙人流程。

## v1.0.4

- 移除停用的 Next.js / Vercel / Node hosting，統一 Cloudflare Worker + D1 架構。

## v1.0.3

- 新增暗金品牌 favicon。

## v1.0.2

- 改善真實連線／重新連線／斷線狀態。

## v1.0.1

- 玩家 Token 從 URL 移到 `X-Player-Token` Header。
