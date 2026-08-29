# Changelog

## v1.10.0

- 多人房間新增 Cloudflare Durable Object + WebSocket Hibernation 即時通知層。
- D1 繼續作為棋局權威資料來源；所有走子與裁決仍經 Worker + D1 驗證後才廣播更新訊號。
- WebSocket 只傳送「房間已更新」事件，不傳玩家憑證、暗子真身或完整棋局狀態。
- WebSocket 中斷會自動重連；原有 HTTP polling 保留為 fallback。
- WebSocket 正常時背景 polling 降為前景 30 秒／背景 60 秒，降低 D1 與 API 請求量。
- 新 Durable Object namespace 使用 SQLite storage，符合目前 Cloudflare 新 namespace 要求。

## v1.9.0
- 認輸、協議和棋、三次重複局面、長將循環與完整結束原因改由伺服器裁決。
## v1.8.1
- 自動版本一致性檢查、Git tag、GitHub Release 與 release notes。
## v1.8.0
- 自適應房間同步、靜態資源 cache policy、效能診斷與 performance budget。

更早版本請查閱 Git 歷史與 GitHub Releases。
