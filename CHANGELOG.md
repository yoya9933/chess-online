# Changelog

## v1.11.0
- 新增伺服器權威棋鐘：10／20／30 分鐘、10+5 與自訂分鐘／每步加秒。
- 棋鐘時間保存在房間 state，斷線、重新整理與 WebSocket 重連都不重置。
- 每次走子前由 Worker 結算實際耗時；歸零時直接以 `timeout` 結束棋局並寫入歷史。
- 前端每 250ms 平滑顯示剩餘時間，但勝負仍由伺服器判定。
- Active WebSocket 下仍定期向 `/api/clock` 校正伺服器時間。

## v1.10.0
- Durable Object + WebSocket Hibernation 即時通知，D1 權威狀態與 polling fallback。
## v1.9.0
- 認輸、協議和棋、三次重複與長將循環伺服器裁決。
## v1.8.1
- 自動版本檢查、Git tag 與 GitHub Release。

更早版本請查閱 GitHub Releases。
