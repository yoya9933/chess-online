# Changelog

## v1.5.0

- 已完成的線上棋局會保存到 D1 `game_history`，包含規則、紅黑玩家、勝負、完整局面與棋譜歷史。
- 歷史資料只保存玩家 Token 的 SHA-256 雜湊，不保存可用於重入席位的原始 Token。
- 新增 `/api/history`，每名玩家可讀取自己最近 20 場已完成對局。
- 首頁新增「最近對局」介面，可查看結果與時間並直接進入 Replay。
- 新增歷史 Token 雜湊測試與 D1 migration。

## v1.4.0
- 新增 `XQPGN/1` 棋譜格式、`.xqg` 下載與 Replay 進度滑桿。
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
