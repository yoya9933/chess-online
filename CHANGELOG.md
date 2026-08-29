# Changelog

## v1.12.0
- 新增正式觀戰模式：不佔紅黑席位、唯讀中途加入、專用 `?watch=1` 連結。
- `/api/watch` 永遠以 spectator 視角輸出，揭棋暗子與私密吃子資訊維持遮罩。
- Durable Object WebSocket attachment 區分 player / spectator，房間即時顯示觀戰人數。
- WebSocket presence 更新與 30 秒 spectator polling fallback 並存。
- 對局工具新增「複製觀戰連結」。

## v1.11.0
- 伺服器權威棋鐘、加秒、自訂時間與逾時判負。
## v1.10.0
- Durable Object + WebSocket 即時通知與 polling fallback。
## v1.9.0
- 完整棋局裁決。
## v1.8.1
- 自動 Git tag / GitHub Release。

更早版本請查閱 GitHub Releases。
