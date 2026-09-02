# 楚河棋局

科技風線上中國象棋平台。**目前版本：v1.22.3**

正式站：<https://chuhe-xiangqi-online.sean8411.workers.dev>

## 核心能力

- 標準象棋／揭棋、伺服器權威棋規、裁決與 Chess Clock 2.0
- Durable Object + WebSocket 即時通知，D1 權威狀態與 polling fallback
- 正式觀戰、單機 AI 3.0：Iterative Deepening + Alpha-Beta + Transposition Table + Quiescence Search + Move Ordering + Piece-Square Tables
- AI 三段難度搜尋上限為簡單 2 ply、普通 5 ply、困難 8 ply；依時間與節點預算採用最後完整搜尋深度，並保留揭棋暗子資訊隔離
- `XQPGN/2` 棋譜：匯出／匯入 `.xqg`、逐手局面、點選跳手、註記、分析分支；分享棋譜會優先透過 Web Share API 分享 `.xqg` 檔案，避免大型棋譜文字超過手機分享 payload 限制
- Game State Hardening：悔棋／棋鐘／重連／重開／裁決的跨功能 regression tests
- 棋鐘支援 10/20/30 分鐘、3+2、10+5 與自訂時間；重新開局保留時間控制但重置雙方時間
- Timeout Finish Effect：時間歸零立即鎖盤，顯示「時間到／某方超時／某方勝」、專用音效，並同步給觀戰者與歷史／棋譜
- Match Panel UI：好友房間資訊、等待狀態、工具列，以及與 segmented control 同一垂直中心線的陣營選擇
- Solo Setup UI：名稱、房號與 AI 難度使用一致的暗色科技欄位，AI select 不再顯示瀏覽器原生白底外觀
- Responsive：手機橫向防溢出、Header 換列、房間工具／陣營窄螢幕 fallback、棋子字級縮放已收斂到單一 `responsive.css`，不再依賴額外 hotfix 樣式檔
- PWA shell 會刷新 enhancement loader，避免新版 UI 被舊 Service Worker cache 卡住
- 歷史對局、PWA、Responsive、Accessibility、安全與可觀測性

新版 `.xqg` 會保存完整 Replay 局面、註記與結束原因；舊 `XQPGN/1` 因原格式只有著法文字，系統只辨識而不虛構缺少的局面。

AI 搜尋統計可由瀏覽器執行 `ChuhePlatform.ai.lastSearch` 查看，包括實際完成深度、nodes、quiescence nodes、TT hits/stores、cutoffs 與耗時。

## 驗證與部署

`npm run check:version → npm test → npm run test:e2e → npm run test:browser → npm run build`

全部通過後才部署 Cloudflare，並自動建立同版本 Git tag 與 GitHub Release。

## 版本紀錄

請見 [`CHANGELOG.md`](./CHANGELOG.md) 與 GitHub Releases。