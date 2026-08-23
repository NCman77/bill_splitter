import { describe, expect, it } from 'vitest';
import { extractReceiptFromLines, extractReceiptFromText } from '../src/domain/receipt/receiptParser.js';
import { validateReceipt } from '../src/domain/receipt/receiptValidator.js';

describe('receipt parser', () => {
  it('parses Traditional Chinese and English receipt formats', () => {
    const receipt = extractReceiptFromText([
      '森林雞腿排 237',
      'Iced Latte $120',
      '薯條 2 x 80',
      '紅茶 2 60 120',
      'Service fee 10% 47',
      'TOTAL 684',
    ].join('\n'));

    expect(receipt.hasServiceFee).toBe(true);
    expect(receipt.items).toMatchObject([
      { name: '森林雞腿排', quantity: 1, amount: 237 },
      { name: 'Iced Latte', quantity: 1, amount: 120 },
      { name: '薯條', quantity: 2, amount: 160 },
      { name: '紅茶', quantity: 2, amount: 120 },
    ]);
  });

  it('treats the last column as the total amount for the whole line', () => {
    const receipt = extractReceiptFromText([
      '森林雞排 2 399',
      '雞腿排 149.5 *2 $299',
    ].join('\n'));

    expect(receipt.items).toMatchObject([
      { name: '森林雞排', quantity: 2, amount: 399 },
      { name: '雞腿排', quantity: 2, amount: 299 },
    ]);
  });

  it('keeps OCR confidence and flags suspicious price lines', () => {
    const receipt = validateReceipt(extractReceiptFromLines([
      { text: '拿鐵 120', score: 0.94, poly: [[0, 0], [10, 0], [10, 5], [0, 5]] },
      { text: '#1%5 260 120', score: 0.41 },
    ]));

    expect(receipt.items[0]).toMatchObject({ name: '拿鐵', confidence: 0.94, needsReview: false });
    expect(receipt.rejectedLines).toEqual(['#1%5 260 120']);
    expect(receipt.needsReview).toBe(true);
  });
});
