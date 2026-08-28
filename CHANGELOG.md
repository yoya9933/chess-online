# Changelog

## v1.7.0

- 棋盤新增 `grid/gridcell` 語意、row/column index 與完整棋格／棋子 aria-label。
- 使用方向鍵移動棋盤焦點，Enter／Space 可選子與落子；黑方視角會維持符合畫面的方向操作。
- 棋盤狀態與 toast 改為 aria-live，玩家區域新增可讀取的在線／暫離狀態。
- 新增高可見度 focus ring、forced-colors 支援與全域 reduced-motion fallback。
- 紅黑棋子除顏色外再以實線／雙線外框區分，降低只依靠顏色辨識的需求。
- Browser E2E 追加 `grid/gridcell/aria-live` 實際 DOM 檢查，另加入 accessibility regression unit tests。

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
- 錯誤處理與監控。
## v1.0.9
- Security Hardening。
## v1.0.8
- 重連與房間生命週期。
## v1.0.7
- 房間 UX。
## v1.0.6
- 棋局音效。
## v1.0.5
- Cloudflare Worker + D1 多人 E2E。
## v1.0.4
- 統一 Cloudflare 架構。
## v1.0.3
- 暗金品牌 favicon。
## v1.0.2
- 真實連線狀態。
## v1.0.1
- 玩家 Token 改走 Header。
