# Changelog

## v1.0.2

- 連線狀態改為實際反映同步結果。
- 新增「重新連線中」與「連線中斷」狀態。
- 瀏覽器離線／恢復上線時會即時更新並嘗試重新同步。

## v1.0.1

- 玩家席位 Token 不再放入房間輪詢 URL。
- `/api/rooms` 與 `/api/change-side` 改以 `X-Player-Token` Header 傳送玩家憑證。
