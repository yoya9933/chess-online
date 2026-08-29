# 楚河棋局

科技風線上中國象棋網站，支援標準象棋、揭棋、雙人房間、單機、重連、棋譜、歷史對局、PWA 與無障礙鍵盤操作。

**目前版本：v1.9.0** · 版本來源：[`VERSION`](./VERSION) / `package.json`

## 線上版本

正式站：<https://chuhe-xiangqi-online.sean8411.workers.dev>

網站頁首會顯示 `v版本號 · Git commit`。每次 `main` 部署時 GitHub Actions 會自動產生 `public/version.json`，Production 部署成功後也會自動建立同版本 Git tag 與 GitHub Release。

## 主要功能

- 標準中國象棋與揭棋模式，揭棋暗子資訊由伺服器遮罩
- 建房、邀請連結、紅黑換邊、跨裝置雙人同步與斷線重連
- 伺服器裁決認輸、協議和棋、三次重複局面、長將循環、將死與無合法著法
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
  ├─ Cloudflare Static Assets
  ├─ /api/rooms + /api/adjudication
  ├─ /api/history
  └─ /api/health
          |
          v
Cloudflare Worker
  ├─ authoritative rules + adjudication
  ├─ room lifecycle + reconnect
  ├─ security + observability
  └─ game history
          |
          v
Cloudflare D1
  ├─ rooms
  ├─ game_history
  └─ position_log
```

## 安全與同步

- 玩家席位 Token 只透過 `X-Player-Token` Header 傳送。
- 房間使用 `revision` 做 optimistic concurrency，伺服器拒絕 stale revision。
- Worker 重新驗證走法、輪次、棋子所有權、將軍狀態、勝負與循環裁決。
- 歷史對局只保存 Token 的 SHA-256 雜湊。
- API 有輸入驗證、best-effort rate limit、CSP、HSTS、frame protection 與 Request ID。

## 本機開發與測試

需要 Node.js 22 以上。

```bash
npm ci
npx wrangler d1 migrations apply chuhe-xiangqi-db --local
npm run check:version
npm test
npm run test:e2e
npm run test:browser
npm run build
```

## 部署

`main` push 後自動執行：version check → unit tests → multiplayer E2E → browser E2E → Wrangler dry-run → D1 migrations → Cloudflare deploy → Git tag + GitHub Release。

## 版本紀錄

請見 [`CHANGELOG.md`](./CHANGELOG.md) 與 GitHub Releases。

## 授權

目前尚未指定開源授權。
