# Changelog

## v1.14.7
- 修正「我的陣營」整列視覺偏上的問題：標題與紅／黑 segmented control 改成同一列、同一垂直中心線。
- 陣營區使用固定最小高度與 `align-content:center`，讓整列在區塊內真正上下置中；標題高度與按鈕基準統一為 38px，並做 2px optical adjustment。
- 同步把修正寫進主 `match-panel.css` 與覆蓋 `match-panel-align.css`，避免舊 enhancement loader 只載到其中一份時版面仍失效。
- 修正 PWA Service Worker 長期使用 `chuhe-shell-v1.14.0` cache 的問題；升級 shell cache，並讓 `enhancements-loader.js` 改成 network-first / no-store，避免新版 CSS 被舊 loader 卡住。
- 新增 regression tests，驗證陣營列垂直置中與 PWA enhancement loader cache refresh。

## v1.14.6
- 修正好友對局側欄「我的陣營」區塊未置中的版面問題。
- 強制陣營區改為單欄 grid：標題水平置中，紅／黑 segmented control 在下方完整撐滿可用寬度。
- 移除陣營標題前的裝飾圓點，避免視覺中心被圖示偏移；鎖定 badge 仍會與標題一起置中。
- 新增陣營置中 regression assertions，避免舊 `.in-game-color { display:flex }` 樣式再次覆蓋新版布局。

## v1.14.5
- 重整好友對局側欄視覺層級：房間資訊、等待／連線狀態、對局工具與陣營選擇改成一致的卡片化介面。
- 桌面側欄由 260px 擴充為 300–320px，降低按鈕與文字擁擠感，同時保留手機版單欄排列。
- 房間代碼改成可點擊的資訊列，等待對手／雙方就位／重新連線狀態改成獨立狀態膠囊與指示點。
- 對局工具按鈕統一圓角、間距、hover 與狀態樣式；音效開關與複製連結增加更清楚的視覺辨識。
- 「我的陣營」改成 segmented control，鎖定狀態改為小型 badge，不再和按鈕擠在同一列。
- 玩家列表與側欄內其他區塊同步收斂邊框、背景與圓角，並加入 mobile / reduced-motion fallback。
- 新增 Match Panel UI regression tests，驗證樣式載入順序與核心 responsive selectors。

## v1.14.4
- 新增 Timeout Finish Effect：伺服器確認超時後，棋盤中央顯示「時間到／紅方或黑方超時／勝方」的專用結束特效。
- 時間在前端歸零時立即鎖定棋盤，避免網路往返期間再送出走步；伺服器 timeout 結果回來後維持鎖定。
- 新增獨立超時音效，遵守既有全站音效開關，不與落子／吃子／將軍／一般勝負音效混用。
- 觀戰者收到 timeout 結果時會同步看到相同結束特效與明確勝負文字。
- 最近對局與 `XQPGN/2` 棋譜新增超時結束原因文字，例如「紅方超時，黑方勝」。
- Timeout 特效支援 `prefers-reduced-motion`，減少動畫模式下改為靜態淡入樣式。
- 新增 timeout finish regression tests，檢查載入順序、即時鎖盤、專用音效、觀戰顯示、歷史／棋譜結果文字與 reduced-motion 樣式。

## v1.14.3
- Chess Clock 2.0：重新開局會保留原本時間控制設定，但紅黑雙方剩餘時間完整重置，第一手後才重新啟動。
- 最後 60 秒改成 0.1 秒讀秒顯示；輪到的一方低於 30 秒時加入低時間警告，並尊重 `prefers-reduced-motion`。
- 棋鐘同步改用 request RTT 中點估算 server offset，再以平滑方式校正，降低單向網路延遲造成的顯示誤差。
- `/api/clock` 回傳的權威 clock 會直接校正前端本地狀態，並把背景同步頻率由 10 秒縮短為 5 秒、視窗重新聚焦時立即同步。
- 棋鐘設定 UX 新增 3 分 + 2 秒 preset、自訂輸入邊界修正、套用期間 disabled 狀態與同步延遲資訊。
- 新增 Clock 2.0 E2E，驗證重新開局後時間控制與雙方初始時間正確保留／重置。

## v1.14.2
- 新增 Game State Hardening regression suite，將跨功能狀態一致性納入正式 CI。
- 覆蓋悔棋＋棋鐘：接受悔棋後不返還已消耗時間，並由恢復局面的行棋方繼續計時。
- 覆蓋連續悔棋邊界與使用同一玩家 Token 重連後繼續悔棋流程。
- 覆蓋重新開局後棋鐘仍可正常重新設定，以及認輸／協議和棋與已設定棋鐘共存。
- 新增伺服器 timeout 與「剩餘時間永不因結算增加」的單元 regression tests。
- `npm run test:e2e` 現在同時執行既有多人情境與 Game State Hardening 情境。

## v1.14.1
- 修正接受悔棋後棋鐘被歷史盤面重設／消失的問題。
- 悔棋等待期間棋鐘持續計時；接受悔棋時先以伺服器時間結算當下剩餘時間，不返還任何已消耗時間。
- 棋盤回退後只切換棋鐘的 active side 到恢復局面的行棋方，並從接受悔棋當下繼續計時。
- 新增 regression test，驗證悔棋不會把紅黑任一方的剩餘時間回復成舊值。

## v1.14.0
- 棋譜升級為 `XQPGN/2`，下載檔內嵌完整逐手局面、最終局面與逐手註記。
- 新增 `.xqg` 匯入；新版棋譜可直接還原棋盤並進入 Replay。
- 新增可點選著法列表、回放跳手、逐手註記與「從此手分析」沙盤分支。
- 舊 `XQPGN/1` 仍可辨識，但因舊格式本來沒有局面資料，會明確提示無法完整還原而不偽造棋盤。

## v1.13.0
- 單機 AI 2.0：Minimax + Alpha-Beta、三段難度與揭棋保守估值。
## v1.12.0
- 正式觀戰模式與即時觀戰人數。
## v1.11.0
- 伺服器權威棋鐘。
## v1.10.0
- Durable Object + WebSocket 即時同步。
## v1.9.0
- 完整棋局裁決。
## v1.8.1
- 自動 Git tag / GitHub Release。