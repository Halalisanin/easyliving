document.addEventListener('click', async (e) => {
  const logoutBtn = e.target.closest('#logoutBtn');
  if (!logoutBtn) return;
  e.preventDefault();
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  } catch { window.location.href = '/login'; }
});
