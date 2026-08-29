# 楚河棋局

科技風線上中國象棋平台。**目前版本：v1.11.0**

正式站：<https://chuhe-xiangqi-online.sean8411.workers.dev>

## 核心能力

- 標準象棋／揭棋、伺服器權威棋規與暗子遮罩
- Durable Object + WebSocket 即時通知，D1 權威狀態，polling fallback
- 10／20／30 分鐘、加秒與自訂棋鐘；伺服器計時、逾時判負、重連不重置
- 認輸、協議和棋、重複局面與長將循環裁決
- 建房、邀請、換邊、悔棋、重連、自訂棋局、沙盤與 Replay
- D1 歷史對局、PWA、Responsive、Accessibility、安全與可觀測性

## 架構

`Browser/PWA → WebSocket(Durable Object 即時通知) + HTTP(Worker 權威操作) → D1`

WebSocket 不傳送席位 Token 或揭棋秘密資料；棋鐘與棋局勝負都由 Worker/D1 決定。

## 驗證與部署

```bash
npm ci
npm run check:version
npm test
npm run test:e2e
npm run test:browser
npm run build
```

全部通過後 GitHub Actions 才部署 Cloudflare，並自動建立同版本 Git tag 與 GitHub Release。

## 版本紀錄

請見 [`CHANGELOG.md`](./CHANGELOG.md) 與 GitHub Releases。

## 授權

目前尚未指定開源授權。
