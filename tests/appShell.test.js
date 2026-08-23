import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../src/app/BillSplitterApp.js', import.meta.url), 'utf8');

describe('receipt image controls', () => {
  it('provides separate native camera and image picker inputs', () => {
    expect(html).toContain('id="receipt-camera"');
    expect(html).toContain('capture="environment"');
    expect(html).toContain('for="receipt-camera"');
    expect(html).toContain('id="receipt-upload"');
    expect(html).toContain('for="receipt-upload"');
  });

  it('keeps both file inputs accessible instead of display none', () => {
    const inputs = html.match(/<input type="file"[^>]+>/g) ?? [];
    expect(inputs).toHaveLength(2);
    expect(inputs.every((input) => input.includes('class="visually-hidden"'))).toBe(true);
    expect(inputs.every((input) => !input.includes('class="hidden"'))).toBe(true);
  });

  it('wires both native inputs to the OCR handler', () => {
    expect(appSource).toContain("receiptCamera.addEventListener('change'");
    expect(appSource).toContain("receiptUpload.addEventListener('change'");
    expect(appSource).not.toContain('receiptUpload.click()');
  });
});
