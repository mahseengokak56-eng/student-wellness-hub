// script.js — clean single login handler + robust redirect
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form') || document.querySelector('form');
  if (!form) return console.log('[APP] No login form found.');

  // replace node to remove previous listeners
  const cleanForm = form.cloneNode(true);
  form.parentNode.replaceChild(cleanForm, form);

  cleanForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = (document.getElementById('username') || {}).value?.trim() || '';
    const password = (document.getElementById('password') || {}).value || '';
    if (!username || !password) { alert('Please enter username and password.'); return; }

    console.log('[APP] Submitting login for', username);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const resp = await fetch('http://localhost:5000/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      console.log('[APP] login response status:', resp.status);
      const data = await resp.json().catch(() => null);
      console.log('[APP] login response body:', data);

      if (!resp.ok) {
        alert(data?.message || `Login failed (status ${resp.status})`);
        return;
      }

      // ——— REDIRECT ———
      // try relative redirect first (works for Live Server and npx serve)
      setTimeout(() => {
        console.log('[APP] Redirecting (relative) -> index.html');
        window.location.href = 'index.html';
      }, 200);

    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') alert('Request timed out. Try again.');
      else { console.error('[APP] Login fetch error:', err); alert('Server error — check backend console.'); }
    }
  });
});
