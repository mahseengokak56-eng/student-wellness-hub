// script.js - REPLACE the previous contents with this single file

/* ---------- Helpers ---------- */
function log(...args) { console.log('[APP]', ...args); }
function showMsg(text) { /* optional UI message; fallback to alert */ alert(text); }

/* ---------- DOM ready ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form'); // make sure only one form on login page
  if (!form) {
    log('No form found on page.');
    return;
  }

  // Prevent double-binding: remove existing listeners (defensive)
  form.replaceWith(form.cloneNode(true));
  const freshForm = document.querySelector('form');

  freshForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const usernameEl = document.getElementById('username');
    const passwordEl = document.getElementById('password');
    const username = usernameEl ? usernameEl.value.trim() : '';
    const password = passwordEl ? passwordEl.value : '';

    if (!username || !password) {
      showMsg('Please enter username and password.');
      return;
    }

    log('Submitting login for', username);

    // fetch with timeout helper
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 10000); // 10s timeout to avoid hanging

    try {
      const resp = await fetch('http://localhost:5000/login', {
        method: 'POST',
        credentials: 'include', // must include so session cookie is stored
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      log('[login] status', resp.status);

      // try to parse JSON safely
      let data = null;
      try { data = await resp.json(); } catch (err) {
        log('[login] failed to parse JSON:', err);
      }

      log('[login] response body:', data);

      if (resp.ok) {
        // success -> redirect to index.html (absolute path)
        const redirectUrl = 'http://localhost:3000/index.html';
        log('[login] login ok, redirecting to', redirectUrl);
        // using replace so user can't go back to login easily
        window.location.replace(redirectUrl);
        return;
      }

      // if not ok, show server message if available
      const msg = (data && data.message) ? data.message : `Login failed (status ${resp.status})`;
      showMsg(msg);
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        log('[login] request timed out');
        showMsg('Request timed out — server may be down or slow.');
      } else {
        log('[login] fetch error', err);
        showMsg('Server error — check backend is running and CORS settings. See console for details.');
      }
    }
  });
});
