export function formatMoney(value) {
  return new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 2 }).format(value || 0);
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
