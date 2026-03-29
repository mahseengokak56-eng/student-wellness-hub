// backend/create_test_user.js
const fetch = (...args) => import('node-fetch').then(m => m.default(...args));
(async () => {
  const res = await fetch('http://localhost:5000/create-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'testuser', password: 'Test@1234', email: 'test@example.com' })
  });
  console.log('STATUS', res.status, 'BODY', await res.text());
})();
