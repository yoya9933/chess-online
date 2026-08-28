# Changelog

## v1.3.0

- 新增 Web App Manifest，可將楚河棋局安裝到支援 PWA 的手機／桌面瀏覽器。
- 使用既有暗金「弈」品牌圖示作為 App icon / maskable icon。
- 新增 Service Worker 靜態 shell cache；無網路時仍能打開首頁與已快取介面。
- 線上 API 不做假離線模式，對局仍需網路連線。
- 偵測新版 Service Worker 後顯示更新提示，可一鍵切換到最新版。
- 支援瀏覽器 `beforeinstallprompt` 時顯示「安裝應用程式」入口。

## v1.2.0

- 統一上一步、可走位置、將軍、吃子與揭棋翻牌動畫，支援 reduced motion。

## v1.1.0

- Mobile / Responsive 2.0：棋盤優先布局、底部操作列、44px 觸控區與橫屏布局。

## v1.0.10
- Request ID、structured logs、health endpoint 與統一錯誤 UI。
## v1.0.9
- API Security Hardening、Header Token、rate limit、CSP 與安全 Headers。
## v1.0.8
- 重連、暫離、過期席位釋放與舊房間 cleanup。
## v1.0.7
- 房間邀請、等待對手、加入提示與 loading 狀態。
## v1.0.6
- 落子、吃子、將軍、勝負音效與偏好記憶。
## v1.0.5
- Cloudflare Worker + D1 多人 E2E。
## v1.0.4
- 統一 Cloudflare Worker + D1 架構。
## v1.0.3
- 暗金品牌 favicon。
## v1.0.2
- 真實連線／重連／斷線狀態。
## v1.0.1
- 玩家 Token 改走 `X-Player-Token` Header。
