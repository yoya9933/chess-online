# Changelog

## v1.9.0

- 新增伺服器裁決的認輸與和棋請求／接受／拒絕流程。
- 新增三次重複局面自動和棋，以及同側持續將軍造成循環時的長將判負。
- 勝負狀態新增明確 `result.type`：認輸、協議和棋、重複局面、長將、將死、將帥被吃與無合法著法。
- D1 新增 `position_log`，只記錄局面指紋與裁決資訊，不依賴瀏覽器自行判定循環。
- 和棋棋局也會寫入歷史對局並可進入棋譜回放。
- 首頁棋局側欄新增「提議和棋／認輸」與對手和棋請求回覆 UI。

## v1.8.1
- `VERSION` 與 `package.json` 版本一致性納入 CI。
- Production 部署成功後自動建立 Git tag、GitHub Release 與 release notes。

## v1.8.0
- 自適應房間同步、靜態資源 cache policy、效能診斷與 performance budget。
## v1.7.0
- 棋盤鍵盤操作、ARIA grid/gridcell、focus ring、在線文字、forced-colors 與非單靠紅綠辨識。
## v1.6.0
- CI 新增桌面／手機真實 Chrome Browser E2E smoke，與多人 Worker + D1 E2E 一起成為部署門檻。
## v1.5.0
- D1 保存已完成線上對局，可查看最近 20 場並 Replay；只保存 Token SHA-256 雜湊。
## v1.4.0
- `XQPGN/1` 棋譜格式、`.xqg` 下載與 Replay 進度滑桿。
## v1.3.0
- PWA、Service Worker、離線首頁與更新提示。
## v1.2.0
- 棋局 UX 2.0 與 reduced motion。
## v1.1.0
- Mobile / Responsive 2.0。
## v1.0.10
- Request ID、structured logs、health endpoint 與統一錯誤 UI。
## v1.0.9
- API Security Hardening、Header Token、rate limit、CSP 與安全 Headers。
## v1.0.8
- 重連、暫離、過期席位釋放與舊房間 cleanup。
## v1.0.7
- 房間邀請、等待對手、加入提示與 loading 狀態。
## v1.0.6
- 落子、吃子、將軍、勝負音效與偏好記憶。
## v1.0.5
- Cloudflare Worker + D1 多人 E2E。
## v1.0.4
- 統一 Cloudflare Worker + D1 架構。
## v1.0.3
- 暗金品牌 favicon。
## v1.0.2
- 真實連線／重連／斷線狀態。
## v1.0.1
- 玩家 Token 改走 `X-Player-Token` Header。
