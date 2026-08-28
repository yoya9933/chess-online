# 楚河棋局

科技風線上中國象棋網站，支援標準象棋、揭棋、雙人房間、單機、重連、棋譜、歷史對局、PWA 與無障礙鍵盤操作。

**目前版本：v1.8.0** · 版本來源：[`VERSION`](./VERSION) / `package.json`

## 線上版本

正式站：<https://chuhe-xiangqi-online.sean8411.workers.dev>

網站頁首會顯示 `v版本號 · Git commit`。每次 `main` 部署時 GitHub Actions 會自動產生 `public/version.json`，記錄版本、完整 Git SHA 與部署時間。

## 主要功能

- 標準中國象棋與揭棋模式，揭棋暗子資訊由伺服器遮罩
- 建房、邀請連結、紅黑換邊、跨裝置雙人同步與斷線重連
- 單機對電腦、自訂棋局、沙盤推演、悔棋與重新開局
- 落子／吃子／將軍／勝負音效與棋局動畫
- `XQPGN/1` 棋譜、`.xqg` 下載、Replay 進度跳轉
- D1 保存已完成棋局，可查看自己的最近對局並直接回放
- PWA 安裝、離線首頁與新版本更新提示
- 手機／橫屏 responsive、鍵盤棋盤操作、ARIA 與 reduced-motion
- Request ID、structured logs、health endpoint、API rate limit 與安全 Headers
- 自適應同步與靜態資源 cache policy，降低背景輪詢與重複傳輸

## 正式架構

```text
Browser / PWA
  ├─ Cloudflare Static Assets (public/)
  ├─ /api/rooms
  ├─ /api/change-side
  ├─ /api/history
  └─ /api/health
          |
          v
Cloudflare Worker
  ├─ rules + authoritative move validation
  ├─ room lifecycle + reconnect
  ├─ security + observability
  └─ game history
          |
          v
Cloudflare D1
  ├─ rooms
  └─ game_history
```

`main` 已移除舊 Next.js / Vercel / Node hosting runtime，正式架構只保留 Cloudflare Worker + D1 + Static Assets。

## 安全與同步

- 玩家席位 Token 儲存在瀏覽器 `localStorage`，API 透過 `X-Player-Token` Header 傳送，不放在正式網路請求 URL。
- 房間使用 `revision` 做 optimistic concurrency，伺服器拒絕 stale revision。
- Worker 重新驗證走法、輪次、棋子所有權、將軍狀態與勝負，不信任前端直接送回的結果。
- 歷史對局只保存 Token 的 SHA-256 雜湊，不保存可重入席位的原始 Token。
- API 有輸入驗證、best-effort rate limit、CSP、HSTS、frame protection 與 Request ID。

## 本機開發

需要 Node.js 22 以上（Wrangler 目前版本要求）。

```bash
npm ci
npx wrangler d1 migrations apply chuhe-xiangqi-db --local
npm run dev
```

## 測試

```bash
npm test
npm run test:e2e
npm run test:browser
npm run build
```

- `npm test`：棋規、房間生命週期、安全、監控、歷史、無障礙與效能 budget 單元測試。
- `npm run test:e2e`：Cloudflare test harness + D1 模擬兩名玩家的核心多人流程。
- `npm run test:browser`：啟動本機 Wrangler，使用 Chrome / Chromium 驗證桌面與手機真實頁面。
- `npm run build`：`wrangler deploy --dry-run`。

多人 regression 覆蓋建房／加入、Header Token、走子同步、stale revision、揭棋遮罩、悔棋、重新開局與換邊。Browser smoke 同時驗證 PWA、最近對局、ARIA 棋盤與效能層載入。

## 部署

`main` push 後自動執行：

```text
npm ci
→ unit tests
→ multiplayer E2E
→ browser E2E
→ wrangler deploy --dry-run
→ D1 migrations --remote
→ Cloudflare Worker deploy
```

正式 Cloudflare 設定：

- Worker：`chuhe-xiangqi-online`
- Static Assets：`./public`
- D1 binding：`DB`
- D1 database：`chuhe-xiangqi-db`
- Cron：定期清除長期未使用房間

## 專案結構

```text
chess-online/
├─ .github/workflows/        # CI / production deploy
├─ public/                   # UI、PWA、responsive、accessibility、performance
├─ worker/                   # rooms、rules、security、lifecycle、history、observability
├─ drizzle/                  # D1 migrations
├─ test/                     # unit / regression tests
├─ e2e/                      # Worker+D1 E2E / browser smoke
├─ CHANGELOG.md
├─ VERSION
├─ wrangler.jsonc
└─ package.json
```

## 版本紀錄

請見 [`CHANGELOG.md`](./CHANGELOG.md)。

## 授權

目前尚未指定開源授權。
