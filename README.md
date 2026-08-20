# 楚河棋局

科技風線上象棋網站，支援雙人聯機、單機、揭棋、自訂棋局、沙盤推演、棋譜回放、悔棋、音效與走子特效。

## Cloudflare 架構

- `public/`：由 Cloudflare Static Assets 提供的前端
- `worker/`：房間 API、象棋規則與伺服器端勝負裁決
- `drizzle/`：Cloudflare D1 資料庫 migration
- `wrangler.jsonc`：Worker、Static Assets 與 D1 綁定設定

## 本機開發

```bash
npm install
npx wrangler d1 migrations apply chuhe-xiangqi-db --local
npm run dev
```

## 測試與發布

```bash
npm test
npm run build
npx wrangler d1 migrations apply chuhe-xiangqi-db --remote
npm run deploy
```

正式網站：<https://chuhe-xiangqi-online.sean8411.workers.dev>

一款可用房間連結邀請朋友即時對弈的網頁中國象棋。

## 本機啟動

```bash
npm install
npm run dev
```

瀏覽器開啟 `http://localhost:3000`。

## 部署

網站前端使用 Next.js，可部署至 OpenAI Sites。Sites 版本透過內建 D1
資料庫同步房間、玩家與棋局狀態，支援跨手機與電腦聯機。瀏覽器會定時
同步最新棋步，斷線後使用原房間連結即可重新加入。

原本的 Socket.IO 伺服器仍保留在 `server.js`，僅供傳統 Node.js 主機使用。
