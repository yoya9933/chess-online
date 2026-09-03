# Changelog

## v1.24.1
- Opening Book 改為 transposition-aware：同一組已知開局著法即使順序不同，或中間插入其他合法發展著，仍會匹配到最深的已知定式節點。
- 同時命中多條同深度定式時會合併候選著與權重，再交由既有合法著生成器過濾，避免為每種走子順序重複維護棋譜。
- 新增跨對局 Opening Book 選擇記憶：簡單／普通不連續重複同一節點的上一著，困難則將重複著權重降至 25%，保留棋力但增加可見變化。
- Opening Book 僅在前 12 ply 內啟用，超出或無合法棋譜候選時自動回到 AI 搜尋；揭棋仍完全不套用標準象棋開局書。
- `ChuhePlatform.ai.lastDecision` 的 Opening Book 決策新增 `matchedBy: sequence | transposition` 與 `repeatAvoided` 診斷欄位。
- PWA shell 升級至 v1.24.1。

## v1.22.3
- Ponytail cleanup：先重用既有樣式再刪除重複層，不新增 dependency、不改產品功能。
- 刪除 `match-panel-align.css`；其陣營垂直置中規則早已完整存在 `match-panel.css`，不再維護兩份相同 CSS。
- 將 `mobile-hardening.css` 的有效規則收斂進 `responsive.css`，並讓 `responsive.css` 成為最後載入的 responsive layer，移除一個額外 stylesheet request 與 PWA cache asset。
- 合併重複的棋盤寬度、手機棋子字級、Header 與窄螢幕 fallback 規則；保留 390／360／320px Browser E2E 與原有 regression coverage。
- 更新 loader、Service Worker、tests 與 browser smoke，明確驗證被刪除的 hotfix assets 不會再次加入。
- PWA shell 升級至 v1.22.3。

## v1.22.2
- 修正手機「分享棋譜」把完整 XQPGN/2 JSON 直接塞進 Web Share 文字 payload 而可能被 Android 分享 Intent 拒絕的問題。
- 支援時優先使用 Web Share API 分享 `.xqg` 檔案；不支援檔案分享時先複製完整棋譜，再分享簡短訊息與網址。
- Clipboard 不可用時保留 copy fallback；使用者取消分享不視為錯誤，真正失敗時顯示可操作的替代提示。
- PWA shell 升級至 v1.22.2。

## v1.22.1
- 修正手機版棋子中文字在窄螢幕下相對圓形棋子過大的問題；560px 以下由原本最高約 5.6vw 改為 `clamp(14px, 4.4vw, 21px)`。
- 棋子文字固定 `line-height: 1`、單行置中並限制溢出，避免「車／馬／象／士／將／炮／兵」等字形碰出或穿過棋子圓框。
- 同步在 `responsive.css` 與最後載入的 `mobile-hardening.css` 套用規則，降低舊樣式或載入順序造成回歸的風險。
- 新增 Mobile Piece Typography regression assertions，驗證 390／360／320px 手機版會載入新的棋子字級與溢出保護。
- PWA shell 升級至 v1.22.1，確保手機不會繼續使用舊的 responsive CSS 快取。

## v1.22.0
- AI 3.0：將單機電腦從固定深度 Minimax 升級為 Iterative Deepening + Alpha-Beta，每次只採用完整搜尋完成的深度，超出時間／節點預算時保留上一層可靠結果。
- 新增 Transposition Table，快取局面分數、深度、bound flag 與最佳著；TT key 對揭棋暗子只使用公開的包裝走法身份，不包含隱藏真實棋種。
- 新增 Quiescence Search，在一般搜尋葉節點繼續計算吃子序列與被將軍時的應對，降低「剛吃到子就停止搜尋」造成的 horizon effect。
- 新增 Move Ordering：TT 最佳著、MVV-LVA 類吃子排序、將軍著、killer moves、history heuristic 與中央化提示，提升 Alpha-Beta 剪枝效率。
- 新增 Piece-Square Tables，讓車、炮、馬、兵、仕相與將帥的局面評估納入位置價值；揭棋未翻暗子不套用真實棋種位置表。
- 難度搜尋上限調整為簡單 2 ply、普通 5 ply、困難 8 ply，並加入各級時間／節點／quiescence／TT 預算；殘局與低分支局面可實際完成更深搜尋。
- 新增 `ChuheAI.getLastSearchStats()` 與 `ChuhePlatform.ai.lastSearch`，可查看完成深度、nodes、qNodes、TT hits/stores、cutoffs 與搜尋耗時。
- 新增 AI 3.0 regression tests：迭代加深、TT、PST 中央化、quiescence 避免毒兵、三段難度，以及揭棋暗子真身資訊隔離。
- PWA shell 升級至 v1.22.0，確保新版 `ai-core.js` / `ai-client.js` 不會被舊快取固定。

## v1.14.9
- 修正手機版橫向跑版：限制首頁大型 `XIANGQI // ONLINE ARENA` 裝飾文字在 viewport 內，不再把 `scrollWidth` 撐出螢幕。
- 新增最後載入的 `mobile-hardening.css`，統一限制主容器、棋盤、房間面板、棋鐘、分析與工具列的 `min-width` / `max-width`。
- 560px 以下 Header 改為可換列 grid，版本資訊獨立一列；380px 以下將入局選項、房間工具與陣營選擇改為單欄 fallback。
- 棋盤手機寬度改以父容器 `100%` 為準，避免 `vw` 與 safe-area / main padding 疊加造成超寬。
- Browser E2E smoke 新增 390、360、320px 三種手機 viewport，並驗證 `mobile-hardening.css` 已載入。
- PWA shell 升級至 v1.14.9 並預快取 `mobile-hardening.css`。

## v1.14.8
- 重整單機／入局表單欄位風格，讓「你的稱呼」「房間代碼」與「AI 難度」使用一致的暗色科技介面。
- AI 難度移除瀏覽器原生白底 select 外觀，改成深色選單、自訂青色箭頭、hover / focus glow 與暗色 option。
- 名稱與房號輸入改為 46px 高圓角欄位，統一邊框、背景、placeholder、focus ring 與手機版觸控高度。
- 更新 PWA shell 至 v1.14.8 並預快取 `solo-setup.css`，確保新版表單樣式不會被舊快取卡住。
- 新增 Solo Setup UI regression tests，驗證樣式載入順序、select 去原生化與 PWA cache generation。

## v1.14.7
- 修正「我的陣營」整列視覺偏上的問題：標題與紅／黑 segmented control 改成同一列、同一垂直中心線。
- 陣營區使用固定最小高度與 `align-content:center`，讓整列在區塊內真正上下置中；標題高度與按鈕基準統一為 38px，並做 2px optical adjustment。
- 同步把修正寫進主 `match-panel.css` 與覆蓋 `match-panel-align.css`，避免舊 enhancement loader 只載到其中一份時版面仍失效。
- 修正 PWA Service Worker 長期使用 `chuhe-shell-v1.14.0` cache 的問題；升級 shell cache，並讓 `enhancements-loader.js` 改成 network-first / no-store，避免新版 CSS 被舊 loader 卡住。
- 新增 regression tests，驗證陣營列垂直置中與 PWA enhancement loader cache refresh。

## v1.14.6
- 修正好友對局側欄「我的陣營」區塊未置中的版面問題。
- 強制陣營區改為單欄 grid：標題水平置中，紅／黑 segmented control 在下方完整撐滿可用寬度。
- 移除陣營標題前的小圓點，避免視覺中心被圖示偏移；鎖定 badge 仍會與標題一起置中。
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