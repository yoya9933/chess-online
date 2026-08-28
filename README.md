# 楚河棋局

科技風線上中國象棋網站，支援雙人聯機、單機、揭棋、自訂棋局、沙盤推演、棋譜回放、悔棋、音效與走子特效。

**目前版本：v1.0.5** · 版本來源：[`VERSION`](./VERSION) / `package.json`

## 線上版本

正式站：<https://chuhe-xiangqi-online.sean8411.workers.dev>

網站頁首會顯示 `v版本號 · Git commit`；點擊版本資訊可直接開啟該次部署對應的 GitHub commit。每次部署時 GitHub Actions 會自動產生 `public/version.json`，記錄版本、完整 SHA 與部署時間。

## 主要功能

- 標準中國象棋與揭棋模式
- 暗金揭棋暗子與資訊遮罩
- 建立房間、分享連結、雙人同步對弈
- 單機對電腦
- 開局前切換／交換紅黑方
- 吃子紀錄、悔棋、自訂棋局
- 沙盤推演與棋譜回放
- 移動、吃子、將軍與將殺效果
- heartbeat、席位逾時回收與舊房間清理
- 實際同步狀態顯示與離線／重新連線提示

## 正式架構

```text
Browser
  ├─ Cloudflare Static Assets (public/)
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

`main` 已移除停用的 Next.js / Vercel / Node hosting 實作；歷史版本仍可從 Git commit 查閱。

## 安全與同步

- 玩家席位 token 儲存在瀏覽器 `localStorage`，API 透過 `X-Player-Token` Header 傳送，不放在 URL。
- 每個房間使用 `revision` 做 optimistic concurrency，降低不同裝置互相覆蓋棋局的風險。
- Worker 會在伺服器端重新驗證走法、輪次、棋子所有權、將軍狀態與勝負，不直接信任瀏覽器送回的棋盤。
- 揭棋未翻開棋種只保留在 D1；公開狀態會遮罩暗子，暗吃真實棋種只對吃子方顯示。

## 本機開發

需要 Node.js 18 以上。

```bash
npm install
npx wrangler d1 migrations apply chuhe-xiangqi-db --local
npm run dev
```

## 測試

```bash
npm test
npm run test:e2e
npm run build
```

- `npm test`：執行象棋規則單元測試。
- `npm run test:e2e`：使用 Cloudflare `createTestHarness()` 載入正式 Wrangler 設定、套用本機 D1 migrations，並模擬兩名玩家完成多人核心流程。
- `npm run build`：執行 `wrangler deploy --dry-run`，驗證 Worker、Static Assets 與設定。

多人 E2E 覆蓋：建房／加入、Header token 身分恢復、合法走子、跨玩家同步、stale revision、開局後換邊鎖定、雙方悔棋、重新開局、開局前交換陣營，以及揭棋暗子遮罩。

## 部署

`main` push 後由 GitHub Actions 自動：

```text
npm ci
→ unit tests
→ multiplayer E2E (Cloudflare test harness + D1)
→ wrangler deploy --dry-run
→ D1 migrations --remote
→ wrangler deploy
```

正式 Cloudflare 設定：

- Worker：`chuhe-xiangqi-online`
- Static Assets：`./public`
- D1 binding：`DB`
- D1 database：`chuhe-xiangqi-db`

## 專案結構

```text
chess-online/
├─ .github/workflows/deploy-cloudflare.yml
├─ public/
│  ├─ index.html
│  ├─ favicon.svg
│  ├─ app.js
│  ├─ connection-status.js
│  ├─ style.css
│  ├─ jieqi-covered.css
│  ├─ chess-ui-updates.css
│  ├─ chess-ui-updates.js
│  ├─ sandbox-pink-frame.css
│  ├─ sandbox-gomoku-architecture.js
│  ├─ og.png
│  └─ version.json
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
├─ e2e/
│  └─ multiplayer.mjs
├─ CHANGELOG.md
├─ VERSION
├─ wrangler.jsonc
├─ package.json
└─ package-lock.json
```

## 版本紀錄

請見 [`CHANGELOG.md`](./CHANGELOG.md)。

## 授權

目前尚未指定開源授權。
