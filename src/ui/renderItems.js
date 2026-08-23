import { escapeHtml, formatMoney } from '../utils/format.js';

const EMPTY_ITEMS_MESSAGE = '尚無餐點資料，請貼上文字、上傳收據或手動新增。';

export function renderItems(elements, state) {
  const subtotal = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  elements.itemsSubtotal.textContent = formatMoney(subtotal);

  if (state.items.length === 0) {
    elements.itemsList.innerHTML = `<div class="text-center text-wood/50 py-8 text-sm italic">${EMPTY_ITEMS_MESSAGE}</div>`;
    return;
  }

  elements.itemsList.innerHTML = state.items
    .map((item) => renderItem(item, state.people))
    .join('');
}

function renderItem(item, people) {
  const total = item.price * item.quantity;
  return `
    <article class="bg-white p-3 sm:p-4 rounded-xl border ${item.needsReview ? 'border-rose/50' : 'border-wood/20'} shadow-sm flex flex-col gap-3">
      <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div class="flex-1 flex flex-wrap gap-2 items-center w-full">
          <input
            type="text"
            value="${escapeHtml(item.name)}"
            data-action="update-item"
            data-field="name"
            data-item-id="${item.id}"
            class="item-name-input flex-1 min-w-[130px] bg-transparent border-b border-wood/30 focus:border-accent focus:outline-none py-1 text-ink font-medium"
            aria-label="餐點品名"
          />
          <label class="flex items-center gap-1 text-sm text-wood">
            <span>$</span>
            <input type="number" value="${item.price}" min="0" step="0.01" data-action="update-item" data-field="price" data-item-id="${item.id}" class="w-20 bg-transparent border-b border-wood/30 py-1 text-right text-ink font-serif" aria-label="單價" />
          </label>
          <label class="flex items-center gap-1 text-xs text-wood">
            <span>x</span>
            <input type="number" value="${item.quantity}" min="1" data-action="update-item" data-field="quantity" data-item-id="${item.id}" class="w-12 bg-transparent border-b border-wood/30 py-1 text-center text-ink font-serif" aria-label="數量" />
          </label>
          <strong class="text-sm font-serif text-ink min-w-[70px] text-right">$${formatMoney(total)}</strong>
        </div>
        <div class="flex items-center justify-between w-full sm:w-auto gap-2">
          ${renderAssigneeSelector(item, people)}
          <button type="button" data-action="remove-item" data-item-id="${item.id}" class="text-wood/40 hover:text-rose px-2 text-xl" aria-label="刪除${escapeHtml(item.name)}">&times;</button>
        </div>
      </div>
      ${renderReviewMessage(item)}
    </article>
  `;
}

function renderAssigneeSelector(item, people) {
  const isAllSelected = people.length > 0 && item.assignees.length === people.length;
  const selectedPeople = people.filter((person) => item.assignees.includes(person.id));
  const label = selectedPeople.length === 0
    ? '尚未設定成員'
    : isAllSelected
      ? `全桌平分 (${people.length}人)`
      : selectedPeople.map((person) => escapeHtml(person.name)).join('、');

  return `
    <div class="relative dropdown-container">
      <button type="button" data-action="toggle-dropdown" data-item-id="${item.id}" class="min-w-[130px] max-w-[220px] border border-dashed border-wood/40 rounded-lg p-2 text-xs text-left bg-paper/50 hover:border-accent" aria-expanded="false">
        ${label}
      </button>
      <div id="dropdown-${item.id}" class="dropdown-menu hidden absolute right-0 top-full mt-1 w-52 bg-white border border-wood/20 shadow-lg rounded-lg overflow-y-auto max-h-56 z-20 py-1">
        <button type="button" data-action="toggle-assignee" data-item-id="${item.id}" data-person-id="ALL" class="w-full px-3 py-2 text-xs font-semibold text-left hover:bg-paper text-matcha border-b border-wood/10">
          全桌全體成員均分 ${isAllSelected ? '✓' : ''}
        </button>
        ${people.map((person) => `
          <button type="button" data-action="toggle-assignee" data-item-id="${item.id}" data-person-id="${person.id}" class="w-full px-3 py-2 text-xs text-left hover:bg-paper ${item.assignees.includes(person.id) ? 'text-accent font-medium' : 'text-ink'}">
            ${escapeHtml(person.name)} ${item.assignees.includes(person.id) ? '✓' : ''}
          </button>
        `).join('') || '<span class="block px-3 py-2 text-xs text-wood/50">請先新增赴宴者</span>'}
      </div>
    </div>
  `;
}

function renderReviewMessage(item) {
  if (!item.needsReview) return '';
  return `<p class="text-xs text-rose">辨識信心 ${Math.round(item.confidence * 100)}%，請確認品名與金額。</p>`;
}
