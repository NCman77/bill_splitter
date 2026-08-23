import { calculateBill } from './calculateBill.js';
import { formatMoney } from '../../utils/format.js';

export function createSummaryText(state) {
  const bill = calculateBill(state);
  const lines = [
    '【 拾光結帳 - 分帳明細 】',
    `💰 總金額: $${formatMoney(bill.grandTotal)}`,
    '------------------------------',
  ];

  for (const person of bill.breakdowns) {
    lines.push(`👤 【${person.name}】 應付: $${formatMoney(person.grandTotal)}`);
    for (const item of person.items) {
      const splitLabel = item.splitCount > 1 ? ` (${item.splitCount}人平分)` : '';
      lines.push(`  • ${item.name}${splitLabel}: $${formatMoney(item.share)}`);
    }
    if (person.feeShare > 0) lines.push(`  • 分攤服務費: $${formatMoney(person.feeShare)}`);
    lines.push('');
  }

  if (bill.unassignedSubtotal > 0) {
    lines.push(`⚠️ 尚未分配的餐點: $${formatMoney(bill.unassignedSubtotal)}`);
  }
  lines.push('------------------------------');
  lines.push('拾光結帳 · 在瀏覽器內完成收據辨識');
  return lines.join('\n');
}
