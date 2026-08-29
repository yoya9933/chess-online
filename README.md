# 楚河棋局

科技風線上中國象棋平台。**目前版本：v1.13.0**

正式站：<https://chuhe-xiangqi-online.sean8411.workers.dev>

## 目前功能

- 標準象棋／揭棋、伺服器權威棋規、暗子遮罩與棋局裁決
- Durable Object + WebSocket 即時通知、D1 權威資料與 polling fallback
- 伺服器棋鐘、觀戰模式與即時觀戰人數
- 單機 AI 2.0：簡單／普通／困難、Minimax + Alpha-Beta、局面評估
- 建房、邀請、換邊、重連、悔棋、沙盤、棋譜、歷史對局
- PWA、Responsive、Accessibility、安全與可觀測性

揭棋 AI 對未揭露暗子採中性估值，不直接使用暗子真身做搜尋決策。

## 驗證與部署

`npm run check:version → npm test → npm run test:e2e → npm run test:browser → npm run build`

全部通過後才部署 Cloudflare，並自動建立 Git tag 與 GitHub Release。

## 版本紀錄

請見 [`CHANGELOG.md`](./CHANGELOG.md) 與 GitHub Releases。
