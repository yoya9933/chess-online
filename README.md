# 楚河棋局

科技風線上中國象棋網站，支援雙人聯機、單機、揭棋、自訂棋局、沙盤推演、棋譜回放、悔棋、音效與走子特效。

**目前版本：v1.0.0** · 版本來源：[`VERSION`](./VERSION) / `package.json`

## 線上版本

正式站：<https://chuhe-xiangqi-online.sean8411.workers.dev>

網站頁首會顯示 `v版本號 · Git commit`；點擊版本資訊可直接開啟該次部署對應的 GitHub commit。部署時間與完整 commit SHA 由 GitHub Actions 自動寫入 `public/version.json`。

## 主要功能

- 標準中國象棋與揭棋模式
- 暗金揭棋棋子樣式與暗子資訊遮罩
- 建立房間、分享連結、雙人同步對弈
- 單機對電腦
- 開局前切換／交換紅黑方
- 吃子紀錄；揭棋暗子真身只對吃子方可見
- 悔棋請求與雙方確認
- 自訂棋局
- 沙盤推演與棋譜回放
- 移動、吃子、將軍與將殺效果
- 玩家 heartbeat、席位逾時回收與房間清理

## 正式架構

目前 `main` 以 Cloudflare 為主要部署架構：

```text
Browser
  ├─ static assets -> public/
  ├─ /api/rooms
  └─ /api/change-side
          |
          v
Cloudflare Worker
  ├─ worker/index.js
  ├─ worker/rooms.js
  ├─ worker/change-side.js
  └─ worker/rules.js
          |
          v
Cloudflare D1
  └─ rooms
```

- `public/`：Cloudflare Static Assets，包含目前最新版 UI。
- `worker/`：房間 API、換邊 API 與伺服器端象棋規則驗證。
- `drizzle/`：D1 schema migrations。
- `wrangler.jsonc`：Worker、Static Assets 與 D1 binding 設定。
- `app/`、`api/`、`vercel.json`：保留舊的 Next/Vercel 實作供歷史參考，不是目前正式 Cloudflare 部署入口。

## 版本資訊

- `VERSION` 與 `package.json` 保存正式語意版本，目前為 `1.0.0`。
- `public/version.json` 保存網站可讀取的版本 metadata。
- 每次 `main` 自動部署時，GitHub Actions 會把當下完整 `GITHUB_SHA` 與 UTC 部署時間寫入 `public/version.json`。
- 網頁頁首顯示短 SHA，方便從正式站直接追到實際部署的 Git commit。

## Cloudflare 設定

`wrangler.jsonc` 使用：

- Worker：`chuhe-xiangqi-online`
- Static Assets：`./public`
- D1 binding：`DB`
- D1 database：`chuhe-xiangqi-db`

正式 API 由 Worker 攔截 `/api/*`，其他請求交由 Static Assets 回應。

## 本機開發

需要 Node.js 18 以上。

```bash
npm install
npx wrangler d1 migrations apply chuhe-xiangqi-db --local
npm run dev
```

Wrangler 預設開發網址通常會顯示在終端機中。

## 測試

```bash
npm test
npm run build
```

- `npm test`：執行 Worker 象棋規則測試。
- `npm run build`：執行 `wrangler deploy --dry-run`，檢查 Worker 與設定是否可建置。

## 部署

第一次部署或有新的 migration 時：

```bash
npm install
npx wrangler d1 migrations apply chuhe-xiangqi-db --remote
npm run deploy
```

一般只修改前端或 Worker 程式碼時：

```bash
npm run deploy
```

## 揭棋

揭棋開局時，除將／帥外的棋子會依原始位置保留走法，但真實棋種隨機打亂並以暗子顯示。暗子移動後揭開。

目前暗子外觀使用 `public/jieqi-covered.css`，採黑色底、暗金邊框與暗金紋路。

伺服器只把未揭開棋子的真實棋種保存在 D1；傳給玩家的公開盤面會遮罩暗子。被吃掉的暗子也只讓吃子方看到真實棋種。

## 房間同步與資料

- 每個房間都有 `revision`，更新採 optimistic concurrency，避免兩台裝置覆蓋彼此狀態。
- 玩家 token 儲存在瀏覽器 `localStorage`，用於重新辨識原本席位。
- heartbeat 寫入有節流，避免輪詢造成大量 D1 writes。
- 席位長時間未活動後可被新玩家接手。
- 玩家加入房間時會順便清理超過 7 天未更新的舊房間。

## 安全性

Cloudflare Worker 會重新驗證實際走子，而不是直接信任瀏覽器送回的棋盤：

- 確認輪到該玩家
- 確認來源棋子屬於該玩家
- 依象棋／揭棋規則驗證走法
- 避免走完後己方將帥仍被攻擊
- 由伺服器重新產生下一個棋盤、吃子資訊與勝負狀態

玩家 token 仍屬輕量房間身分識別，不是完整帳號登入機制。

## 專案結構

```text
chess-online/
├─ VERSION
├─ public/
│  ├─ index.html
│  ├─ app.js
│  ├─ style.css
│  ├─ version.json
│  ├─ jieqi-covered.css
│  ├─ chess-ui-updates.css
│  ├─ chess-ui-updates.js
│  ├─ sandbox-pink-frame.css
│  ├─ sandbox-gomoku-architecture.js
│  └─ og.png
├─ worker/
│  ├─ index.js
│  ├─ rooms.js
│  ├─ change-side.js
│  └─ rules.js
├─ drizzle/
│  ├─ 0000_chess_rooms.sql
│  └─ 0001_add_undo_request.sql
├─ test/
│  └─ rules.test.js
├─ wrangler.jsonc
├─ package.json
└─ package-lock.json
```

## 授權

目前尚未指定開源授權。
