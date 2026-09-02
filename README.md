# 楚河棋局

科技風線上中國象棋平台。**目前版本：v1.14.9**

正式站：<https://chuhe-xiangqi-online.sean8411.workers.dev>

## 核心能力

- 標準象棋／揭棋、伺服器權威棋規、裁決與 Chess Clock 2.0
- Durable Object + WebSocket 即時通知，D1 權威狀態與 polling fallback
- 正式觀戰、單機 AI 2.0（三段難度、Minimax + Alpha-Beta）
- `XQPGN/2` 棋譜：匯出／匯入 `.xqg`、逐手局面、點選跳手、註記、分析分支
- Game State Hardening：悔棋／棋鐘／重連／重開／裁決的跨功能 regression tests
- 棋鐘支援 10/20/30 分鐘、3+2、10+5 與自訂時間；重新開局保留時間控制但重置雙方時間
- Timeout Finish Effect：時間歸零立即鎖盤，顯示「時間到／某方超時／某方勝」、專用音效，並同步給觀戰者與歷史／棋譜
- Match Panel UI：好友房間資訊、等待狀態、工具列，以及與 segmented control 同一垂直中心線的陣營選擇
- Solo Setup UI：名稱、房號與 AI 難度使用一致的暗色科技欄位，AI select 不再顯示瀏覽器原生白底外觀
- Mobile Layout Hardening：修正手機橫向跑版，並對 390／360／320px 窄螢幕提供 Header、房間工具、陣營與棋盤 fallback
- PWA shell 會刷新 enhancement loader，避免新版 UI 被舊 Service Worker cache 卡住
- 歷史對局、PWA、Responsive、Accessibility、安全與可觀測性

新版 `.xqg` 會保存完整 Replay 局面、註記與結束原因；舊 `XQPGN/1` 因原格式只有著法文字，系統只辨識而不虛構缺少的局面。

## 驗證與部署

`npm run check:version → npm test → npm run test:e2e → npm run test:browser → npm run build`

全部通過後才部署 Cloudflare，並自動建立同版本 Git tag 與 GitHub Release。

## 版本紀錄

請見 [`CHANGELOG.md`](./CHANGELOG.md) 與 GitHub Releases。