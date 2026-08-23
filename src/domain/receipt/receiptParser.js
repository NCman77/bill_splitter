const RECEIPT_METADATA_KEYWORDS = [
  '總計', '合計', 'total', 'subtotal', '小計', '現金', '找零', '刷卡',
  'cash', 'change', '稅額', 'tax', '桌號', '桌台', '人數', '發票', '統編',
  '日期', '時間', '電話', '地址', '品名', '單價', '金額', 'amount',
];

const SERVICE_FEE_KEYWORDS = ['服務費', 'service charge', 'service fee'];
const VALID_NAME_CHARACTERS = /[A-Za-z0-9\u3400-\u9fff]/g;

export function normalizeReceiptText(text) {
  return text
    .normalize('NFKC')
    .replace(/\r/g, '')
    .replace(/[\u00a0\u2000-\u200b\u3000]/g, ' ')
    .replace(/[；;|]+/g, '\n')
    .replace(/[，,](?=\d{3}(?:\D|$))/g, '')
    .replace(/([\u3400-\u9fffA-Za-z])(?=\$?\d{2,6}(?:\.\d{1,2})?\s*$)/gm, '$1 ')
    .replace(/[ \t]+/g, ' ');
}

export function parseReceiptLine(rawLine) {
  const line = cleanReceiptLine(rawLine);
  if (line.length < 2) return undefined;

  const lowerLine = line.toLowerCase();
  const isServiceFee = SERVICE_FEE_KEYWORDS.some((keyword) => lowerLine.includes(keyword));
  if (!isServiceFee && RECEIPT_METADATA_KEYWORDS.some((keyword) => lowerLine.includes(keyword))) {
    return undefined;
  }

  const parsedValues = matchReceiptValues(line);
  if (!parsedValues) return undefined;

  const name = cleanItemName(parsedValues.name);
  if (!isValidItem({ ...parsedValues, name })) return undefined;

  return { ...parsedValues, name: name.slice(0, 40), isServiceFee };
}

export function extractReceiptFromText(text) {
  const lines = normalizeReceiptText(text)
    .split('\n')
    .map((line) => ({ text: line, score: 1, poly: undefined }));

  return extractReceiptFromLines(lines);
}

export function extractReceiptFromLines(lines) {
  const receipt = { items: [], hasServiceFee: false, rejectedLines: [] };

  for (const line of lines) {
    const normalizedLines = normalizeReceiptText(line.text ?? '').split('\n');
    for (const normalizedLine of normalizedLines) {
      if (!normalizedLine.trim()) continue;
      const parsed = parseReceiptLine(normalizedLine);
      if (!parsed) {
        if (hasTrailingPrice(normalizedLine)) receipt.rejectedLines.push(normalizedLine.trim());
        continue;
      }
      if (parsed.isServiceFee) {
        receipt.hasServiceFee = true;
        continue;
      }
      receipt.items.push({
        name: parsed.name,
        price: roundMoney(parsed.price),
        quantity: parsed.quantity,
        amount: roundMoney(parsed.price * parsed.quantity),
        confidence: normalizeConfidence(line.score),
        bbox: line.poly,
      });
    }
  }

  return receipt;
}

function cleanReceiptLine(rawLine) {
  return rawLine
    .replace(/^\s*(?:[-•●○▪◦·]+|\d+[.)、])\s*/, '')
    .replace(/\s*(?:TWD|NTD|NT\$)　?/gi, ' $')
    .trim();
}

function matchReceiptValues(line) {
  return matchPriceTimesQuantity(line)
    ?? matchLeadingQuantity(line)
    ?? matchQuantityAndUnitPrice(line)
    ?? matchTrailingColumns(line)
    ?? matchGluedPrice(line);
}

function matchPriceTimesQuantity(line) {
  const match = line.match(/^(.+?)\s+\$?(\d+(?:\.\d+)?)\s*[xX*×]\s*(\d+)\s*$/);
  if (!match) return undefined;

  const firstNumber = Number(match[2]);
  const secondNumber = Number(match[3]);
  if (firstNumber <= 50 && secondNumber > firstNumber) {
    return { name: match[1], price: secondNumber, quantity: firstNumber };
  }
  return { name: match[1], price: firstNumber, quantity: secondNumber };
}

function matchLeadingQuantity(line) {
  const match = line.match(/^(\d{1,2})\s*[xX*×]\s*(.+?)\s+\$?(\d+(?:\.\d+)?)\s*$/);
  if (!match) return undefined;
  const quantity = Number(match[1]);
  return { name: match[2], price: Number(match[3]) / quantity, quantity };
}

function matchQuantityAndUnitPrice(line) {
  const match = line.match(/^(.+?)\s+(\d{1,2})\s*[xX*×]\s*\$?(\d+(?:\.\d+)?)(?:\s*=\s*\$?(\d+(?:\.\d+)?))?\s*$/);
  if (!match) return undefined;
  const quantity = Number(match[2]);
  const lineAmount = match[4] ? Number(match[4]) : Number(match[3]) * quantity;
  return { name: match[1], price: lineAmount / quantity, quantity };
}

function matchTrailingColumns(line) {
  const match = line.match(/^(.+?[A-Za-z\u3400-\u9fff].*?)\s+((?:\$?\d+(?:\.\d+)?\s*){1,4})$/);
  if (!match) return undefined;

  const values = (match[2].match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
  const lineAmount = values.at(-1);
  const hasQuantityColumn = values.length >= 2
    && Number.isInteger(values[0])
    && values[0] >= 1
    && values[0] <= 50;
  const quantity = hasQuantityColumn ? values[0] : 1;
  return { name: match[1], price: lineAmount / quantity, quantity };
}

function matchGluedPrice(line) {
  const match = line.match(/^(.+?[A-Za-z\u3400-\u9fff])\s*\$?(\d{2,6}(?:\.\d+)?)\s*$/);
  if (!match) return undefined;
  return { name: match[1], price: Number(match[2]), quantity: 1 };
}

function cleanItemName(name) {
  return name
    .replace(/^[^A-Za-z0-9\u3400-\u9fff]+/, '')
    .replace(/[^A-Za-z0-9\u3400-\u9fff()（）&+\-.'·・ /]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isValidItem({ name, price, quantity }) {
  const compactName = name.replace(/\s/g, '');
  const validCharacterCount = (compactName.match(VALID_NAME_CHARACTERS) ?? []).length;
  const readableRatio = compactName.length ? validCharacterCount / compactName.length : 0;

  return Boolean(name)
    && validCharacterCount > 0
    && readableRatio >= 0.6
    && Number.isFinite(price)
    && price > 0
    && price < 100_000
    && Number.isInteger(quantity)
    && quantity >= 1
    && quantity <= 99;
}

function hasTrailingPrice(line) {
  return /\d{2,6}(?:\.\d+)?\s*$/.test(line)
    && !/(?:總計|合計|小計|total|subtotal|cash|change|現金|找零)/i.test(line);
}

function normalizeConfidence(score) {
  const numericScore = Number(score);
  return Number.isFinite(numericScore) ? Math.max(0, Math.min(1, numericScore)) : 0;
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
