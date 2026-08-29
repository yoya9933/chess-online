# 楚河棋局

科技風線上中國象棋平台。**目前版本：v1.14.2**

正式站：<https://chuhe-xiangqi-online.sean8411.workers.dev>

## 核心能力

- 標準象棋／揭棋、伺服器權威棋規、裁決與棋鐘
- Durable Object + WebSocket 即時通知，D1 權威狀態與 polling fallback
- 正式觀戰、單機 AI 2.0（三段難度、Minimax + Alpha-Beta）
- `XQPGN/2` 棋譜：匯出／匯入 `.xqg`、逐手局面、點選跳手、註記、分析分支
- Game State Hardening：悔棋／棋鐘／重連／重開／裁決的跨功能 regression tests
- 歷史對局、PWA、Responsive、Accessibility、安全與可觀測性

新版 `.xqg` 會保存完整 Replay 局面與註記；舊 `XQPGN/1` 因原格式只有著法文字，系統只辨識而不虛構缺少的局面。

## 驗證與部署

`npm run check:version → npm test → npm run test:e2e → npm run test:browser → npm run build`

全部通過後才部署 Cloudflare，並自動建立同版本 Git tag 與 GitHub Release。

## 版本紀錄

請見 [`CHANGELOG.md`](./CHANGELOG.md) 與 GitHub Releases。