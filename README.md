# 楚河棋局

一款免註冊、可用房間連結邀請朋友跨裝置對弈的網頁中國象棋。

目前支援標準象棋與揭棋，並包含好友連線、單機 AI、悔棋、棋譜回放、沙盤推演與自訂棋局等功能。

## 線上版本

[開啟「楚河棋局」線上版](https://chuhe-xiangqi-online.bowersbayley13783.chatgpt.site)

本專案也可自行部署至 Vercel 或 OpenAI Sites／Cloudflare runtime。

## 主要功能

- 線上好友房：輸入或建立 6 碼房間代碼，分享連結即可加入
- 紅黑方選擇與開局前換邊
- 標準中國象棋規則
- 揭棋模式
- 單機對電腦
- 悔棋請求與雙方確認
- 棋譜紀錄、回放、複製與分享
- 沙盤推演
- 自訂棋局與先行方
- 吃子紀錄與揭棋暗子資訊控制
- 音效與基本移動／將軍效果
- 斷線後重新同步房間與棋局狀態
- 玩家在線狀態 heartbeat 與寫入節流
- 自動清除超過 7 天未更新的房間

## 技術架構

目前專案採用「靜態遊戲前端 + Next/Vinext API + 資料庫」的架構。

```text
瀏覽器
├─ public/index.html
├─ public/app.js
├─ public/style.css
└─ 其他 UI / 揭棋 / 沙盤樣式與功能
        │
        │ HTTP polling / POST actions
        ▼
Next.js / Vinext API
├─ /api/rooms
└─ /api/change-side
        │
        ▼
資料庫
├─ Neon Postgres（設定 DATABASE_URL 時）
└─ Cloudflare D1（OpenAI Sites / Workers 環境）
```

目前主要遊戲 UI 仍由 `public/` 內的原生 HTML、CSS 與 JavaScript 實作；Next.js 主要負責 API、metadata 與部署整合。

### 房間同步

線上對局目前採 HTTP polling，而非正式版本的 Socket.IO WebSocket：

- 瀏覽器定期呼叫 `GET /api/rooms`
- 棋步與房間操作透過 `POST /api/rooms`
- 每次房間狀態帶有 `revision`
- 更新時使用 revision 避免兩台裝置互相覆蓋最新棋局
- 玩家 token 儲存在瀏覽器 localStorage，用於重新加入原本席位
- heartbeat 僅在需要時寫入，減少輪詢造成的資料庫更新
- 玩家加入房間時會順便清除超過 7 天未更新的舊房間

## 資料庫

主要資料目前集中在 `rooms` table，每個房間保存：

- 房間 ID
- 完整棋局 state（JSON）
- revision
- 紅方與黑方玩家 token / 名稱 / heartbeat
- 前一個 state
- 悔棋請求狀態
- 最後更新時間

Schema 與 migration 位於：

```text
db/schema.ts
drizzle/
├─ 0000_chess_rooms.sql
└─ 0001_add_undo_request.sql
```

## 本機啟動

需要：

- Node.js 18 以上
- npm（隨 Node.js 安裝）

安裝依賴並啟動開發伺服器：

```bash
npm install
npm run dev
```

預設開啟：

```text
http://localhost:3000
```

其他可用指令：

```bash
npm run build  # 建立正式版
npm run start  # 啟動已建置的正式版
```

### 使用 Neon Postgres

在專案根目錄建立 `.env.local`，或在 Vercel 專案設定環境變數：

```dotenv
DATABASE_URL=postgresql://...
```

API 偵測到 `DATABASE_URL` 後會使用 `@neondatabase/serverless` 連線 Neon Postgres。

若沒有 `DATABASE_URL`，程式會嘗試使用 Cloudflare / OpenAI Sites 環境提供的 `DB` D1 binding。

> 請勿將正式資料庫連線字串提交到 GitHub。`.env*` 已被 `.gitignore` 排除。

## 專案結構

```text
chess-online/
├─ app/
│  ├─ api/
│  │  ├─ rooms/route.js
│  │  └─ change-side/route.js
│  ├─ layout.jsx
│  └─ page.jsx
├─ api/
│  ├─ rooms.js
│  └─ change-side.js
├─ db/
│  └─ schema.ts
├─ drizzle/
│  ├─ 0000_chess_rooms.sql
│  └─ 0001_add_undo_request.sql
├─ public/
│  ├─ index.html
│  ├─ app.js
│  ├─ style.css
│  ├─ chess-ui-updates.js
│  ├─ chess-ui-updates.css
│  ├─ jieqi-covered.css
│  ├─ sandbox-pink-frame.css
│  ├─ sandbox-gomoku-architecture.js
│  └─ og.png
├─ scripts/
│  └─ copy-hosting.mjs
├─ server.js
├─ next.config.mjs
├─ vite.config.mjs
├─ vercel.json
└─ package.json
```

## 部署

### Vercel

Repository 內保留 `vercel.json`，目前 function region 設為 `sin1`。

Vercel 部署時建議設定 `DATABASE_URL`，讓 API 使用 Neon Postgres。

一般部署流程：連結此 GitHub repository、設定 `DATABASE_URL`，再使用預設的 `npm run build` 即可。

### OpenAI Sites / Cloudflare runtime

`.openai/hosting.json` 設定了 `DB` D1 binding。建置流程會由：

```bash
npm run build
```

執行 Vinext build，並透過 `scripts/copy-hosting.mjs` 整理 hosting 所需檔案。

## Legacy Socket.IO Server

`server.js` 是早期的 Express + Socket.IO 即時版本，目前不是主要線上部署架構。

它保留作為傳統 Node.js / WebSocket 架構的參考；目前正式前端則使用 `/api/rooms` 搭配 polling 同步。

若未來重新啟用 `server.js`，需要另外維護 Express 與 Socket.IO 相關 dependencies 與伺服器部署設定。

## 目前架構注意事項

目前遊戲規則主要在瀏覽器端執行，Server 已驗證玩家、回合、revision 與部分棋步資料，但尚未完全在 Server 端重新驗證所有中國象棋合法走法。

後續架構優先事項：

1. 抽出共用 game engine，讓 Server 成為棋局規則的權威來源
2. 為車、馬、炮、象、士、將、兵、將軍與揭棋建立自動測試
3. 將 `public/app.js` 逐步拆成 game engine、network、UI、AI、replay、sandbox 等模組
4. 統一重複的房間／換邊 business logic
5. 再加入計時器、觀戰、永久棋譜與更完整的 AI

## 安全性與維護狀態

- 玩家 token 只用來辨識房間席位，不是完整的帳號驗證機制。
- Server 目前尚未重新驗證所有象棋合法走法，不建議直接用於涉及獎金或競賽裁決的場景。
- 房間資料屬暫存性質；超過 7 天未更新的房間會在後續玩家加入時清除。

## 授權

目前尚未指定開源授權。
