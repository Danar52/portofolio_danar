/**
 * theme.js — Dark Mode Toggle
 * Runs early (in <head>) to avoid Flash of Unstyled Content.
 * Persists user preference across pages via localStorage.
 */

// Apply saved theme immediately before the page renders
(function () {
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark-mode-pending');
  }
})();

document.addEventListener('DOMContentLoaded', () => {
  // Apply dark-mode to body based on saved preference
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
  }
  document.documentElement.classList.remove('dark-mode-pending');

  const toggleBtn = document.getElementById('darkModeToggle');
  if (!toggleBtn) return;

  const icon = toggleBtn.querySelector('i');

  // Sync icon to current state
  function syncIcon() {
    const isDark = document.body.classList.contains('dark-mode');
    if (icon) {
      icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
    toggleBtn.setAttribute('data-tooltip', isDark ? 'Light Mode' : 'Dark Mode');
  }

  syncIcon();

  toggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    syncIcon();
  });
});
