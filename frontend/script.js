const BASE_URL = "https://student-wellness-hub.onrender.com";

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form') || document.querySelector('form');
  if (!form) return console.log('[APP] No login form found.');

  const cleanForm = form.cloneNode(true);
  form.parentNode.replaceChild(cleanForm, form);

  cleanForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = (document.getElementById('username') || {}).value?.trim() || '';
    const password = (document.getElementById('password') || {}).value || '';

    if (!username || !password) {
      alert('Please enter username and password.');
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const resp = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await resp.json().catch(() => null);

      if (!resp.ok) {
        alert(data?.message || `Login failed (status ${resp.status})`);
        return;
      }

      setTimeout(() => {
        window.location.href = 'index.html';
      }, 200);

    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') alert('Request timed out. Try again.');
      else alert('Server error — check backend.');
    }
  });
});