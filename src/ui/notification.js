export function showNotification(message, duration = 3_000) {
  const region = document.querySelector('#notification-region');
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  region.replaceChildren(notification);

  window.setTimeout(() => {
    notification.classList.add('is-leaving');
    window.setTimeout(() => notification.remove(), 300);
  }, duration);
}
