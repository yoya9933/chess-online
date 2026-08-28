# Changelog

## v1.4.0

- 新增楚河棋局自有 `XQPGN/1` 棋譜格式，包含版本、規則、房間、紅黑玩家與結果標頭。
- 原本複製／分享棋譜會自動使用新版格式。
- 新增 `.xqg` 棋譜下載功能。
- Replay 新增進度滑桿，可直接跳到指定手數並持續顯示目前／總手數。

## v1.3.0
- 新增可安裝 PWA、Service Worker、離線首頁與更新提示。
## v1.2.0
- 統一上一步、可走位置、將軍、吃子與揭棋翻牌動畫，支援 reduced motion。
## v1.1.0
- Mobile / Responsive 2.0：棋盤優先布局、底部操作列、觸控區與橫屏布局。
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
