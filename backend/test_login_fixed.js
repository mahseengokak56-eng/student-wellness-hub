// backend/test_login_fixed.js
const fetch = (...args) => import('node-fetch').then(m => m.default(...args));
(async ()=>{
  const res = await fetch('http://localhost:5000/login', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ username: 'testuser', password: 'Test@1234' })
  });
  console.log('STATUS', res.status);
  console.log('BODY', await res.text());
})();
