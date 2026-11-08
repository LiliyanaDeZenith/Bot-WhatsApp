const a = require('assert'), path = require('path');
process.chdir(require('os').tmpdir());
const U = require(path.join(__dirname, '../lib/utils'));
a.ok(U.toxic('dasar anjing lu')); a.ok(!U.toxic('selamat pagi'));
a.ok(U.link('cek https://chat.whatsapp.com/AbC123xyz')); a.ok(!U.link('halo'));
a.ok(U.virtex('x'.repeat(5000))); a.ok(!U.virtex('halo'));
a.strictEqual(U.calc('2+3*4'), 14); a.strictEqual(U.calc('process.exit()'), null); a.strictEqual(U.calc('1/0'), null);
let hit = false; for (let i = 0; i < 7; i++) hit = U.spam('t'); a.ok(hit); a.ok(!U.spam('lain'));
a.strictEqual(U.gain('x@s.whatsapp.net', 60).lv, 2);
console.log('semua tes lolos');

const api = require(path.join(__dirname, '../lib/api')), seen = [];
globalThis.fetch = async u => (seen.push(u), { ok: true, json: async () => ({ data: { play: 'v', timings: {} }, responseData: { translatedText: 'ok' } }), text: async () => 'x', arrayBuffer: async () => new ArrayBuffer(1) });
(async () => {
  await api.tiktok('https://vt.tiktok.com/abc'); await api.ai('halo'); await api.image('kucing'); await api.short('https://a.com');
  await api.qr('hi'); await api.translate('en', 'pagi'); await api.sholat('Bandung'); await api.cuaca('Medan');
  a.strictEqual(seen.length, 8); a.ok(seen.every(u => u.startsWith('https://')));
  a.ok(seen[0].includes(encodeURIComponent('https://vt.tiktok.com/abc')));
  console.log('tes api.js lolos');
})();
