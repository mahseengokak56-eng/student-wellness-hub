// backend/test_login.js
(async () => {
  try {
    const payload = { username: "mahseen", password: "YourPass123" }; // change to an actual user you created
    const res = await fetch('http://localhost:5000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log('STATUS', res.status);
    const bodyText = await res.text();
    console.log('BODY', bodyText);
  } catch (err) {
    console.error('ERR', err && err.stack ? err.stack : err);
  }
})();
