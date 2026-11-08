const B = require('@whiskeysockets/baileys'), pino = require('pino'), C = require('./commands'), store = require('./store'), useStoreAuth = require('./auth');
const makeWASocket = B.default || B, { fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = B;
const logger = pino({ level: 'silent' }), live = new Map();
const wipe = async n => { await store.del(['reg/' + n]); await store.delPrefix(n + '/'); };

async function start(num) {
  const old = live.get(num);
  if (old && old.sock) return old;
  const { state, saveCreds } = await useStoreAuth(num);
  await store.set({ ['reg/' + num]: '1' });
  const { version } = await fetchLatestBaileysVersion().catch(() => ({}));
  const sock = makeWASocket({ version, auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) }, logger, browser: ['Ubuntu', 'Chrome', '22.04.4'] });
  const s = { sock, status: 'connecting', code: null, stopped: false };
  live.set(num, s);
  sock.ev.on('creds.update', () => { if (!s.stopped) saveCreds().catch(e => console.log('creds:', e.message)); });
  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (s.stopped) return;
    if (connection === 'open') { s.status = 'online'; s.code = null; }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) { live.delete(num); wipe(num).catch(console.log); }
      else if (code === DisconnectReason.connectionReplaced) live.delete(num);
      else { s.status = 'connecting'; s.code = null; s.sock = null; setTimeout(() => start(num).catch(console.log), 2500); }
    }
  });
  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type === 'notify') messages.forEach(m => C.handle(sock, m, num).catch(e => console.log('handler:', e.message)));
  });
  sock.ev.on('group-participants.update', e => C.groupEvent(sock, e).catch(() => {}));
  if (!state.creds.registered) {
    await new Promise(r => setTimeout(r, 2500));
    s.code = await sock.requestPairingCode(num);
  }
  return s;
}

async function stop(num) {
  const s = live.get(num);
  live.delete(num);
  if (s) { s.stopped = true; try { await s.sock.logout(); } catch { try { s.sock.end(); } catch {} } }
  await wipe(num);
}

async function restoreAll() {
  for (const key of await store.keys('reg/')) {
    const n = key.slice(4), raw = (await store.get([n + '/creds']))[n + '/creds'];
    let ok = false;
    try { ok = JSON.parse(raw).registered; } catch {}
    if (ok) start(n).catch(console.log); else await wipe(n);
  }
}

module.exports = { start, stop, live, restoreAll };
