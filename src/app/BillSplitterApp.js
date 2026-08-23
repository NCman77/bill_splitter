import { extractReceiptFromLines, extractReceiptFromText } from '../domain/receipt/receiptParser.js';
import { validateReceipt } from '../domain/receipt/receiptValidator.js';
import { calculateBill } from '../domain/splitting/calculateBill.js';
import { createSummaryText } from '../domain/splitting/createSummaryText.js';
import { preprocessReceiptImage } from '../services/ocr/imagePreprocessor.js';
import { recognizeReceipt } from '../services/ocr/paddleOcrService.js';
import { renderItems } from '../ui/renderItems.js';
import { renderPeople } from '../ui/renderPeople.js';
import { renderSummary } from '../ui/renderSummary.js';
import { showNotification } from '../ui/notification.js';

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export class BillSplitterApp {
  #elements;
  #lastOcrBatchId;
  #store;

  constructor(store) {
    this.#store = store;
    this.#elements = getRequiredElements();
  }

  start() {
    this.#bindEvents();
    this.#store.subscribe((state) => this.#render(state));
  }

  #bindEvents() {
    this.#elements.personForm.addEventListener('submit', (event) => this.#addPerson(event));
    this.#elements.peopleList.addEventListener('click', (event) => this.#handlePeopleClick(event));
    this.#elements.parseTextButton.addEventListener('click', () => this.#parseManualText());
    this.#elements.uploadButton.addEventListener('click', () => this.#elements.receiptUpload.click());
    this.#elements.receiptUpload.addEventListener('change', (event) => this.#handleImageUpload(event));
    this.#elements.reparseOcrButton.addEventListener('click', () => this.#reparseOcrText());
    this.#elements.addItemButton.addEventListener('click', () => this.#addManualItem());
    this.#elements.loadScenarioButton.addEventListener('click', () => this.#loadScenario());
    this.#elements.itemsList.addEventListener('click', (event) => this.#handleItemsClick(event));
    this.#elements.itemsList.addEventListener('change', (event) => this.#handleItemChange(event));
    this.#elements.serviceFeeToggle.addEventListener('change', (event) => this.#store.setServiceFeeEnabled(event.target.checked));
    this.#elements.serviceFeePercent.addEventListener('change', (event) => this.#store.setServiceFeePercent(event.target.value));
    this.#elements.copySummaryButton.addEventListener('click', () => this.#copySummary());
    document.addEventListener('click', (event) => this.#closeDropdowns(event));
  }

  #render(state) {
    renderPeople(this.#elements, state.people);
    renderItems(this.#elements, state);
    renderSummary(this.#elements, calculateBill(state));
    this.#elements.serviceFeeToggle.checked = state.serviceFee.enabled;
    this.#elements.serviceFeePercent.disabled = !state.serviceFee.enabled;
    this.#elements.serviceFeePercent.value = state.serviceFee.percent;
  }

  #addPerson(event) {
    event.preventDefault();
    if (!this.#store.addPerson(this.#elements.personName.value)) return;
    this.#elements.personName.value = '';
    this.#elements.personName.focus();
  }

  #handlePeopleClick(event) {
    const button = event.target.closest('[data-action="remove-person"]');
    if (!button) return;
    if (!this.#store.removePerson(button.dataset.personId)) {
      showNotification('至少需要保留一位赴宴者。');
    }
  }

  #parseManualText() {
    const text = this.#elements.manualText.value;
    if (!text.trim()) {
      showNotification('請先貼上餐點明細。');
      return;
    }
    const receipt = validateReceipt(extractReceiptFromText(text));
    if (!this.#addParsedReceipt(receipt)) return;
    this.#elements.manualText.value = '';
  }

  async #handleImageUpload(event) {
    const [file] = event.target.files;
    event.target.value = '';
    if (!file || !this.#isValidImage(file)) return;

    this.#setOcrLoading(true, '前處理收據圖片…', '校正尺寸與對比');
    try {
      const { canvas } = await preprocessReceiptImage(file);
      const recognition = await recognizeReceipt(canvas, {
        modelVersion: this.#elements.ocrModel.value,
        onStatus: (status, detail) => this.#setOcrStatus(status, detail),
      });
      const rawText = recognition.lines.map((line) => line.text).join('\n');
      const receipt = validateReceipt(extractReceiptFromLines(recognition.lines));
      this.#showOcrResult(rawText, receipt, recognition.metrics);
      if (this.#addParsedReceipt(receipt, { isOcr: true })) {
        showNotification(`成功辨識 ${receipt.items.length} 項餐點。`);
      }
    } catch (error) {
      console.error('PaddleOCR failed:', error);
      this.#showOcrError(error);
    } finally {
      this.#setOcrLoading(false);
    }
  }

  #isValidImage(file) {
    if (!file.type.startsWith('image/')) {
      showNotification('請選擇圖片檔案。');
      return false;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      showNotification('圖片不可超過 20 MB。');
      return false;
    }
    return true;
  }

  #addParsedReceipt(receipt, options = {}) {
    if (receipt.items.length === 0) {
      showNotification(receipt.warnings[0] ?? '找不到餐點與價格。');
      return false;
    }
    const replaceBatchId = options.replaceOcr ? this.#lastOcrBatchId : undefined;
    const batchId = this.#store.addReceipt(receipt, { replaceBatchId });
    if (options.isOcr || options.replaceOcr) this.#lastOcrBatchId = batchId;
    document.querySelector('#items-heading').scrollIntoView({ behavior: 'smooth' });
    return true;
  }

  #showOcrResult(rawText, receipt, metrics) {
    this.#elements.ocrDebugContainer.classList.remove('hidden');
    this.#elements.ocrDebugText.value = rawText;
    this.#elements.ocrConfidence.textContent = `平均信心 ${Math.round(receipt.averageConfidence * 100)}% · ${Math.round(metrics.totalMs ?? 0)}ms`;
    this.#elements.ocrWarnings.textContent = receipt.warnings.join('；');
  }

  #showOcrError(error) {
    this.#elements.ocrDebugContainer.classList.remove('hidden');
    this.#elements.ocrDebugText.value = '';
    this.#elements.ocrConfidence.textContent = '辨識失敗';
    this.#elements.ocrWarnings.textContent = error instanceof Error ? error.message : String(error);
    showNotification('PaddleOCR 無法完成辨識，請檢查網路後重試。');
  }

  #reparseOcrText() {
    const receipt = validateReceipt(extractReceiptFromText(this.#elements.ocrDebugText.value));
    if (!this.#addParsedReceipt(receipt, { replaceOcr: true })) return;
    this.#elements.ocrWarnings.textContent = '';
    this.#elements.ocrConfidence.textContent = '已人工確認';
    showNotification('已替換原本的 OCR 餐點，不會重複新增。');
  }

  #addManualItem() {
    this.#store.addManualItem();
    requestAnimationFrame(() => {
      const inputs = this.#elements.itemsList.querySelectorAll('.item-name-input');
      inputs.item(inputs.length - 1)?.select();
    });
  }

  #loadScenario() {
    this.#lastOcrBatchId = undefined;
    this.#store.loadScenario();
    showNotification('已載入範例餐點與分攤情境。');
  }

  #handleItemsClick(event) {
    const control = event.target.closest('[data-action]');
    if (!control) return;
    const { action, itemId, personId } = control.dataset;

    if (action === 'remove-item') this.#store.removeItem(itemId);
    if (action === 'toggle-assignee') this.#store.toggleAssignee(itemId, personId);
    if (action === 'toggle-dropdown') this.#toggleDropdown(control, itemId);
  }

  #handleItemChange(event) {
    const input = event.target.closest('[data-action="update-item"]');
    if (!input) return;
    this.#store.updateItem(input.dataset.itemId, input.dataset.field, input.value);
  }

  #toggleDropdown(button, itemId) {
    const menu = document.querySelector(`#dropdown-${CSS.escape(itemId)}`);
    const willOpen = menu.classList.contains('hidden');
    this.#hideAllDropdowns();
    menu.classList.toggle('hidden', !willOpen);
    button.setAttribute('aria-expanded', String(willOpen));
  }

  #closeDropdowns(event) {
    if (!event.target.closest('.dropdown-container')) this.#hideAllDropdowns();
  }

  #hideAllDropdowns() {
    document.querySelectorAll('.dropdown-menu').forEach((menu) => menu.classList.add('hidden'));
    document.querySelectorAll('[data-action="toggle-dropdown"]').forEach((button) => button.setAttribute('aria-expanded', 'false'));
  }

  async #copySummary() {
    const state = this.#store.getState();
    if (state.people.length === 0 || state.items.length === 0) {
      showNotification('請先新增赴宴者與餐點。');
      return;
    }
    try {
      await navigator.clipboard.writeText(createSummaryText(state));
      showNotification('已複製詳細分帳資訊。');
    } catch {
      showNotification('瀏覽器無法寫入剪貼簿，請確認網站權限。');
    }
  }

  #setOcrLoading(isLoading, status = '', detail = '') {
    this.#elements.ocrOverlay.classList.toggle('hidden', !isLoading);
    this.#elements.uploadButton.disabled = isLoading;
    this.#elements.ocrModel.disabled = isLoading;
    if (status) this.#setOcrStatus(status, detail);
  }

  #setOcrStatus(status, detail) {
    this.#elements.ocrStatus.textContent = status;
    this.#elements.ocrSubStatus.textContent = detail;
  }
}

function getRequiredElements() {
  const elementIds = {
    personForm: 'person-form', personName: 'new-person-name',
    peopleCount: 'people-count', peopleList: 'people-list',
    manualText: 'manual-text-input', parseTextButton: 'parse-text-button',
    uploadButton: 'upload-button', receiptUpload: 'receipt-upload', ocrModel: 'ocr-model',
    ocrOverlay: 'loading-ocr', ocrStatus: 'ocr-status', ocrSubStatus: 'ocr-sub-status',
    ocrDebugContainer: 'ocr-debug-container', ocrDebugText: 'ocr-debug-text',
    ocrConfidence: 'ocr-confidence', ocrWarnings: 'ocr-warnings',
    reparseOcrButton: 'reparse-ocr-button', loadScenarioButton: 'load-scenario-button',
    addItemButton: 'add-item-button', itemsList: 'items-list', itemsSubtotal: 'items-subtotal',
    serviceFeeToggle: 'service-fee-toggle', serviceFeePercent: 'global-fee-percent',
    summaryList: 'summary-list', summaryWarning: 'summary-warning',
    grandTotal: 'grand-total', copySummaryButton: 'copy-summary-button',
  };
  return Object.fromEntries(Object.entries(elementIds).map(([name, id]) => [name, requireElement(id)]));
}

function requireElement(id) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing required element: #${id}`);
  return element;
}
