# 拾光結帳

繁體中文／英文收據辨識與餐點分帳網站。OCR 使用官方 PaddleOCR.js，在使用者的瀏覽器內完成推論。

## 開發

```bash
npm install
npm run dev
```

## 驗證

```bash
npm test
npm run build
```

## 專案結構

- `src/app/` — 事件與使用流程協調
- `src/domain/` — 收據與分帳規則
- `src/services/` — PaddleOCR.js 與影像處理
- `src/state/` — 應用狀態
- `src/ui/` — 畫面渲染
- `tests/` — 不需要瀏覽器的快速單元測試
- `docs/ARCHITECTURE.md` — 分層與依賴規則
- `docs/ACTIVE_SKILLS.md` — 本次修改採用的技能與使用邊界

正式建置會輸出到 `site-dist/`，這個資料夾由 GitHub Actions 上傳，不需要提交到 Git。

## GitHub Pages

`.github/workflows/deploy-pages.yml` 會在 `main` 分支更新後執行測試、建置與 Pages 發布。請在倉庫的 **Settings → Pages → Source** 選擇 **GitHub Actions**。

GitHub 私人倉庫的 Pages 功能取決於帳戶方案，而且 Pages 網站通常仍是公開網址。請勿將收據、API key 或其他私密資料提交到倉庫。

## OCR 說明

- 預設：`PP-OCRv5`，優先測試繁體中文與英文收據。
- 可選：`PP-OCRv6`，用於比較速度與實際收據準確度。
- 首次選圖時會下載 OCR 與模型資源；之後由瀏覽器快取。
- 低信心項目會標示為需要人工確認。
