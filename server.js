require('dotenv').config();
const express = require('express'), path = require('path'), crypto = require('crypto');
const bot = require('./lib/bot'), store = require('./lib/store'), U = require('./lib/utils');
const app = express(), PORT = process.env.PORT || 3000, MAX = +process.env.MAX_BOTS || 5;
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
const digits = v => String(v || '').replace(/\D/g, '');
const tk = n => n + '/token';
const saved = async n => (await store.get([tk(n)]))[tk(n)] || null;

app.get('/health', (req, res) => res.send('ok'));

app.post('/api/pair', async (req, res) => {
  try {
    const n = digits(req.body.number);
    if (!/^\d{8,15}$/.test(n)) return res.status(400).json({ error: 'Nomor tidak valid. Pakai kode negara, contoh 628123456789.' });
    const old = await saved(n);
    if (old && req.body.token !== old) return res.status(409).json({ error: 'Nomor ini sudah terdaftar di server ini.' });
    if (!old && bot.live.size >= MAX) return res.status(429).json({ error: 'Server penuh, coba lagi nanti.' });
    const s = await bot.start(n);
    for (let i = 0; i < 24 && !s.code && s.status !== 'online'; i++) await new Promise(r => setTimeout(r, 500));
    const token = old || crypto.randomBytes(8).toString('hex');
    await store.set({ [tk(n)]: token });
    res.json({ status: s.status, code: s.code, token });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/status/:n', (req, res) => {
  const s = bot.live.get(digits(req.params.n));
  res.json({ status: s ? s.status : 'off', code: s ? s.code : null });
});

app.post('/api/stop', async (req, res) => {
  try {
    const n = digits(req.body.number), old = await saved(n);
    if (!old || req.body.token !== old) return res.status(403).json({ error: 'Token tidak cocok.' });
    await bot.stop(n);
    res.json({ status: 'off' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

process.on('unhandledRejection', e => console.log('error:', e && e.message));
(async () => {
  await U.load();
  app.listen(PORT, () => { console.log('Web jalan di port ' + PORT); bot.restoreAll().catch(console.log); });
})();
