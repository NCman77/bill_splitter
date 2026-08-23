# 本次採用的技能

依據專案根目錄的 `ACTIVE_SKILLS_INDEX.md`，這次修改採用以下四項技能：

| 技能 | 使用範圍 | 本次落實方式 |
| --- | --- | --- |
| `modern-javascript-patterns` | 前端 JavaScript 重構 | 使用 ES Modules、純函式、事件委派與動態 `import()` |
| `clean-code` | 程式碼品質與可維護性 | 把狀態、商業規則、OCR、UI 與流程協調拆成獨立模組 |
| `web-performance-optimization` | OCR 大型資源的載入效能 | PaddleOCR 僅在選圖時載入，避免拖慢第一次開啟網站 |
| `github-workflow-automation` | GitHub Pages CI/CD | 推送 `main` 後自動測試、建置並發布 `site-dist/` |

## 暫不採用

- `nodejs-backend-patterns`：目前 OCR 在瀏覽器本機執行，沒有後端服務。
- `firebase` / `nosql-expert`：目前沒有登入、雲端同步或資料庫需求。
- `python-pro`：目前使用官方瀏覽器版 PaddleOCR.js，不需要 Python OCR 服務。
- `ui-ux-pro-max`：本次保留既有視覺方向，優先修復輸入與 OCR 功能。

若日後加入後端 OCR、帳號同步或重新設計介面，再啟用對應技能，避免在目前版本引入不必要的複雜度。
