# 楚河棋局

科技風線上中國象棋網站，支援標準象棋、揭棋、雙人房間、單機、即時同步、棋譜、歷史對局、PWA 與無障礙鍵盤操作。

**目前版本：v1.10.0**

正式站：<https://chuhe-xiangqi-online.sean8411.workers.dev>

## 目前能力

- 標準象棋／揭棋，伺服器權威走法驗證與暗子遮罩
- Cloudflare Durable Object + WebSocket 即時房間更新，D1 為權威狀態，polling 自動 fallback
- 建房、邀請、換邊、斷線重連、悔棋、重新開局、自訂棋局
- 認輸、協議和棋、三次重複、長將循環、將死與無合法著法裁決
- 單機 AI、棋譜、Replay、沙盤、D1 歷史對局
- PWA、手機／橫屏、ARIA、鍵盤操作、reduced-motion
- CSP、安全 Headers、rate limit、Request ID、structured logs、health endpoint

## 架構

```text
Browser / PWA
  ├─ WebSocket → RoomRealtime Durable Object（即時通知）
  ├─ HTTP API → Cloudflare Worker（驗證／裁決）
  └─ Static Assets
                  |
                  v
        Cloudflare D1
        rooms / game_history / position_log
```

WebSocket 不承載權威棋局狀態，只通知客戶端立即重新同步；因此 WebSocket 斷線或 Worker 部署造成連線重建時，HTTP polling 仍可維持棋局正確性。

## 測試

```bash
npm ci
npm run check:version
npm test
npm run test:e2e
npm run test:browser
npm run build
```

Production 只有在 version check、unit、Worker+D1 E2E、Chrome browser E2E 與 Wrangler build 全數成功後才部署；部署成功後自動建立 Git tag 與 GitHub Release。

## 本機開發

```bash
npx wrangler d1 migrations apply chuhe-xiangqi-db --local
npm run dev
```

需要 Node.js 22 以上。

## 版本紀錄

請見 [`CHANGELOG.md`](./CHANGELOG.md) 與 GitHub Releases。

## 授權

目前尚未指定開源授權。
