# Changelog

## v1.6.0

- CI 新增真實 Chrome / Chromium 瀏覽器 smoke test，Cloudflare deploy 前必須通過。
- Browser E2E 會啟動本機 Wrangler Worker，實際載入桌面 1440×900 與手機 390×844 viewport。
- 驗證首頁、動態 enhancement loader、PWA manifest 與「最近對局」功能確實在瀏覽器執行後出現在 DOM。
- 保留並持續執行既有雙玩家 Worker + D1 E2E，涵蓋重連身分、同步、stale revision、揭棋遮罩、悔棋、重新開局與換邊 regression。
- Browser E2E、多人 API E2E、unit tests、Wrangler build 四層驗證全部通過後才允許 production deploy。

## v1.5.0
- D1 保存已完成線上對局，玩家可查看最近 20 場並直接 Replay；只保存 Token SHA-256 雜湊。
## v1.4.0
- 新增 `XQPGN/1` 棋譜格式、`.xqg` 下載與 Replay 進度滑桿。
## v1.3.0
- 新增可安裝 PWA、Service Worker、離線首頁與更新提示。
## v1.2.0
- 統一棋局動畫與 reduced motion。
## v1.1.0
- Mobile / Responsive 2.0。
## v1.0.10
- Request ID、structured logs、health endpoint 與統一錯誤 UI。
## v1.0.9
- API Security Hardening。
## v1.0.8
- 重連、暫離、過期席位釋放與舊房間 cleanup。
## v1.0.7
- 房間 UX。
## v1.0.6
- 棋局音效。
## v1.0.5
- Cloudflare Worker + D1 多人 E2E。
## v1.0.4
- 統一 Cloudflare 架構。
## v1.0.3
- 暗金品牌 favicon。
## v1.0.2
- 真實連線狀態。
## v1.0.1
- 玩家 Token 改走 Header。
