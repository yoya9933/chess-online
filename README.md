# 楚河棋局

科技風線上中國象棋平台。**目前版本：v1.12.0**

正式站：<https://chuhe-xiangqi-online.sean8411.workers.dev>

## 核心能力

- 標準象棋／揭棋，Worker 權威棋規、暗子遮罩與完整裁決
- Durable Object + WebSocket 即時同步通知，D1 權威狀態與 polling fallback
- 伺服器棋鐘、加秒、自訂時間與逾時判負
- 正式 spectator：不佔席位、唯讀中途加入、觀戰人數與專用觀戰連結
- 建房、邀請、換邊、重連、悔棋、自訂棋局、沙盤、棋譜與歷史對局
- PWA、Responsive、Accessibility、安全 Headers、rate limit、Request ID 與 structured logs

觀戰入口使用 `?room=房號&watch=1`；伺服器會強制以 spectator 視角輸出，不會因前端 UI 修改而取得揭棋私密資訊。

## 驗證與部署

`npm run check:version → npm test → npm run test:e2e → npm run test:browser → npm run build`

全部成功才部署 Cloudflare，之後自動建立同版本 Git tag 與 GitHub Release。

## 版本紀錄

請見 [`CHANGELOG.md`](./CHANGELOG.md) 與 GitHub Releases。
