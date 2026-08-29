# Changelog

## v1.8.1

- 新增正式 Release Engineering：`VERSION` 與 `package.json` 版本不一致時 CI 直接失敗。
- Production Cloudflare 部署成功後，自動建立對應 `vX.Y.Z` Git tag 與 GitHub Release。
- GitHub Release 使用該次 production commit 作為 target，並自動產生 release notes。
- 新增 release regression tests，避免版本發布流程被後續修改破壞。

## v1.8.0

- 房間同步改為自適應節流：前景最多約每 2.4 秒一次，背景分頁降至約每 15 秒一次，操作後仍會強制下一次即時同步。
- 統一 `roomRequest` GET 路徑，房號保留在 query、玩家 Token 僅走 `X-Player-Token` Header。
- enhancement scripts 改為保證依序載入，避免相依功能因動態 script 競速而偶發失效。
- Worker 新增明確靜態資源 cache policy：版本資訊 no-store、App shell revalidate、JS/CSS/圖示支援 stale-while-revalidate。
- Service Worker cache 升級至 v1.8.0 並納入目前全部 UI / PWA / accessibility / performance assets。
- 新增 `window.xiangqiPerformance.snapshot()` 基礎效能診斷資訊。
- CI 新增 400 KiB JS/CSS performance budget、同步間隔與 cache policy regression tests；Browser E2E 驗證效能層確實載入。
- README 更新為目前 Cloudflare + D1 架構與 v1.8.0 功能／測試現況。

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
