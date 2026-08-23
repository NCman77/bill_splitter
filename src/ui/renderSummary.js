import { escapeHtml, formatMoney } from '../utils/format.js';

export function renderSummary(elements, bill) {
  elements.grandTotal.textContent = formatMoney(bill.grandTotal);
  renderUnassignedWarning(elements.summaryWarning, bill.unassignedSubtotal);

  if (bill.breakdowns.length === 0) {
    elements.summaryList.innerHTML = '<div class="text-center text-wood/50 py-8 text-sm italic col-span-full">請先新增赴宴者與餐點。</div>';
    return;
  }

  elements.summaryList.innerHTML = bill.breakdowns.map((person) => `
    <article class="bg-paper p-4 rounded-xl wood-border shadow-sm">
      <div class="flex justify-between items-baseline border-b border-wood/20 pb-2 mb-3">
        <h3 class="font-serif text-lg text-ink font-semibold">${escapeHtml(person.name)}</h3>
        <div class="text-right">
          <span class="text-xs text-wood block">應付總額</span>
          <strong class="font-serif text-2xl text-rose">$${formatMoney(person.grandTotal)}</strong>
        </div>
      </div>
      <div class="space-y-1">
        ${renderPersonItems(person.items)}
      </div>
      ${person.feeShare > 0 ? `<div class="border-t border-wood/15 pt-2 mt-3 text-xs text-wood/70 flex justify-between"><span>分攤服務費</span><span>$${formatMoney(person.feeShare)}</span></div>` : ''}
    </article>
  `).join('');
}

function renderPersonItems(items) {
  if (items.length === 0) return '<p class="text-xs text-wood/40 italic">未選擇任何餐點</p>';
  return items.map((item) => `
    <div class="flex justify-between items-center text-xs text-wood/90 gap-2">
      <span class="truncate">${escapeHtml(item.name)}${item.quantity > 1 ? ` (x${item.quantity})` : ''}${item.splitCount > 1 ? ` · ${item.splitCount}人分` : ''}</span>
      <span class="font-serif">$${formatMoney(item.share)}</span>
    </div>
  `).join('');
}

function renderUnassignedWarning(element, amount) {
  element.classList.toggle('hidden', amount <= 0);
  element.textContent = amount > 0
    ? `還有 $${formatMoney(amount)} 的餐點尚未設定分攤對象。`
    : '';
}
