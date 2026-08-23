import { escapeHtml } from '../utils/format.js';

export function renderPeople(elements, people) {
  elements.peopleCount.textContent = `共 ${people.length} 人`;
  elements.peopleList.innerHTML = people.map((person) => `
    <div class="flex items-center bg-white border border-wood/20 rounded-full pl-3 pr-1 py-1 shadow-sm">
      <span class="text-sm font-medium mr-2 text-ink">${escapeHtml(person.name)}</span>
      <button
        type="button"
        data-action="remove-person"
        data-person-id="${person.id}"
        class="text-wood/50 hover:text-rose hover:bg-rose/10 rounded-full w-6 h-6"
        aria-label="移除${escapeHtml(person.name)}"
      >&times;</button>
    </div>
  `).join('');
}
