# 拾光結帳架構

## 分層原則

```text
index.html
   ↓
app/BillSplitterApp        應用流程與事件協調
   ├─ state/billStore       可變狀態與使用者動作
   ├─ domain/receipt        收據解析、信心與格式驗證
   ├─ domain/splitting      分帳與文字摘要的純函式
   ├─ services/ocr          圖片前處理與 PaddleOCR.js 封裝
   └─ ui                    DOM 渲染與使用者通知
```

## 依賴規則

- `domain` 不得依賴 DOM、OCR SDK 或狀態容器。
- `services` 封裝第三方套件，其他層不直接存取 PaddleOCR。
- `ui` 只處理呈現，不負責計算應付金額。
- `state` 不存取 DOM，也不包含收據正則運算。
- `app` 是唯一可以串接上述各層的地方。

## OCR 資料流

```text
使用者圖片
  → imagePreprocessor
  → paddleOcrService
  → OCR lines: text / score / poly
  → receiptParser
  → receiptValidator
  → billStore
  → renderItems / renderSummary
```

PaddleOCR 透過動態 `import()` 延遲載入。圖片留在瀏覽器內，不傳送到本專案的伺服器。
