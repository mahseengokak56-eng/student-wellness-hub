// backend/test_register.js
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
(async ()=> {
  try {
    const res = await fetch('http://localhost:5000/register', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ username: 'testuser'+Date.now(), password: 'abc123', email: 't@t.com' }),
      // no credentials needed here because node fetch is direct
    });
    const j = await res.text();
    console.log('STATUS', res.status, 'BODY', j);
  } catch (e) { console.error('ERR', e); }
})();
