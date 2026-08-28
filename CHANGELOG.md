# Changelog

## v1.2.0

- 統一上一步起點／終點標記，讓最近一步更容易辨識。
- 強化可走位置與可吃子提示，並針對觸控裝置放大視覺回饋。
- 將軍中的將／帥新增一致的警示脈衝效果。
- 吃子、將軍、勝負與揭棋翻牌動畫統一 easing 與節奏。
- 完整支援 `prefers-reduced-motion`，需要時停用非必要棋局動畫。

## v1.1.0

- Mobile / Responsive 2.0：手機棋局改為棋盤優先單欄布局，新增底部操作列與橫屏布局。

## v1.0.10

- 新增 `X-Request-ID`、structured logs、`/api/health`、部署診斷與統一錯誤 UI。

## v1.0.9

- 新增 API security middleware、Header Token、rate limit、CSP 與常用安全 Headers。

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
