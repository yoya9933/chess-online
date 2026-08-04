# 楚河棋局

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
Vercel deployment test
