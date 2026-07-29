# 楚河棋局

一款可用房間連結邀請朋友即時對弈的網頁中國象棋。

## 本機啟動

```bash
npm install
npm run dev
```

瀏覽器開啟 `http://localhost:3000`。

## 部署

目前網站前端使用 Next.js，可部署至 OpenAI Sites。原本的 Socket.IO
即時房間伺服器保留在 `server.js`，但 Sites 不執行常駐 WebSocket 服務；
Sites 版本會自動切換為本機雙人模式。

若要跨裝置即時聯機，可再接上 Supabase Realtime、Firebase 或獨立的
Socket.IO 服務。
