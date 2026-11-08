const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fs = require('fs'), U = require('./utils'), { db, save } = U;
let sharp; try { sharp = require('sharp'); } catch {}
const P = process.env.PREFIX || '!';
const OWNER = (process.env.OWNER || '').split(',').map(s => s.trim()).filter(Boolean);
const num = j => String(j || '').split('@')[0].split(':')[0];
const rnd = a => a[Math.floor(Math.random() * a.length)];
const api = require('./api');
const cmds = Object.create(null), alias = Object.create(null), games = new Map(), mc = new Map();
const add = (cat, names, usage, flags, fn) => {
  const [n, ...al] = names.split(' ');
  cmds[n] = { cat, usage, flags, fn };
  al.forEach(a => alias[a] = n);
};
const send = (c, o) => c.sock.sendMessage(c.jid, o, { quoted: c.m });
const need = () => { if (!sharp) throw Error('paket sharp belum terpasang'); };
const target = c => {
  const x = c.msg.extendedTextMessage?.contextInfo;
  return x?.mentionedJid?.[0] || x?.participant || (c.args[0] ? c.args[0].replace(/\D/g, '') + '@s.whatsapp.net' : null);
};
const media = async (c, type) => {
  const x = c.msg.extendedTextMessage?.contextInfo?.quotedMessage || c.msg;
  return x[type] ? downloadMediaMessage({ key: c.m.key, message: x }, 'buffer', {}) : null;
};
const game = (c, a, coin) => games.set(c.jid, { a: String(a).toLowerCase(), coin, t: Date.now() + 6e4 });
const RID = [['Punya gigi tapi tidak bisa menggigit, apa itu?', 'sisir'], ['Apa yang punya kaki empat tapi tidak bisa jalan?', 'meja'], ['Apa yang basah saat dipakai untuk mengeringkan?', 'handuk']];
const PV = [['Telkomsel', /^(81[1-3]|82[1-3]|85[1-3])/], ['Indosat', /^(81[4-6]|85[5-8])/], ['XL', /^(81[7-9]|859|87[78])/], ['Axis', /^83[1-8]/], ['Tri', /^89[5-9]/], ['Smartfren', /^88[1-9]/]];

add('Umum', 'menu help', '', '', c => c.reply(menu()));
add('Umum', 'ping', '', '', c => c.reply('Pong! Bot aktif.'));

add('Grup', 'tagall', 'pesan', 'ga', c => {
  const ids = c.meta.participants.map(p => p.id);
  return send(c, { text: (c.q || 'Perhatian semua!') + '\n' + ids.map(i => '@' + num(i)).join(' '), mentions: ids });
});
add('Grup', 'hidetag', 'pesan', 'ga', c => c.sock.sendMessage(c.jid, { text: c.q || '.', mentions: c.meta.participants.map(p => p.id) }));
[['kick', 'remove', 'dikeluarkan'], ['promote', 'promote', 'jadi admin'], ['demote', 'demote', 'bukan admin lagi']].forEach(([n, act, t]) =>
  add('Grup', n, '@user', 'ga', async c => {
    const j = target(c);
    if (!j) return c.reply('Tag atau balas pesan orangnya.');
    try { await c.sock.groupParticipantsUpdate(c.jid, [j], act); c.reply('@' + num(j) + ' ' + t, [j]); }
    catch { c.reply('Gagal. Pastikan bot sudah jadi admin grup.'); }
  }));
add('Grup', 'linkgrup', '', 'ga', async c => c.reply('https://chat.whatsapp.com/' + await c.sock.groupInviteCode(c.jid)));
['antilink', 'antitoxic', 'antivirtex', 'welcome'].forEach(n =>
  add('Grup', n, 'on/off', 'ga', c => {
    if (!['on', 'off'].includes(c.args[0])) return c.reply(`Pakai: ${P}${n} on atau off`);
    (db.groups[c.jid] ||= {})[n] = c.args[0] === 'on'; save();
    c.reply(n + (c.args[0] === 'on' ? ' aktif' : ' dimatikan'));
  }));

add('Media', 'tiktok tt download', 'link', '', async c => {
  const d = await api.tiktok(c.args[0] || '');
  if (!d || !d.play) return c.reply('Link TikTok tidak valid atau video tidak ditemukan.');
  return send(c, { video: { url: d.play }, caption: d.title || '' });
});
add('Media', 's sticker', '', '', async c => {
  need();
  const b = await media(c, 'imageMessage');
  if (!b) return c.reply(`Kirim atau balas foto dengan ${P}s`);
  return send(c, { sticker: await sharp(b).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp().toBuffer() });
});
add('Media', 'toimg', '', '', async c => {
  need();
  const b = await media(c, 'stickerMessage');
  if (!b) return c.reply(`Balas stiker dengan ${P}toimg`);
  return send(c, { image: await sharp(b).png().toBuffer() });
});
add('Media', 'ts', 'teks', '', async c => {
  need();
  const t = c.q.slice(0, 24).replace(/[<>&]/g, '');
  if (!t) return c.reply(`Pakai: ${P}ts teksnya`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><text x="256" y="290" font-size="${Math.min(96, 900 / t.length)}" font-family="sans-serif" font-weight="bold" text-anchor="middle" fill="#fff" stroke="#000" stroke-width="4" paint-order="stroke">${t}</text></svg>`;
  return send(c, { sticker: await sharp(Buffer.from(svg)).webp().toBuffer() });
});

add('AI', 'ai', 'pertanyaan', '', async c => c.q ? c.reply(await api.ai(c.q)) : c.reply(`Pakai: ${P}ai pertanyaanmu`));
add('AI', 'img', 'deskripsi', '', async c => {
  if (!c.q) return c.reply(`Pakai: ${P}img deskripsi gambar`);
  return send(c, { image: await api.image(c.q), caption: c.q });
});
add('Game', 'math', '', '', c => {
  const x = 5 + ~~(Math.random() * 40), y = 2 + ~~(Math.random() * 20), o = rnd(['+', '-', '*']);
  game(c, U.calc(`${x}${o}${y}`), 30);
  c.reply(`Berapa ${x} ${o} ${y}? Jawab dalam 60 detik.`);
});
add('Game', 'tebak', '', '', c => { const [q, a] = rnd(RID); game(c, a, 40); c.reply(q + ' (60 detik)'); });
add('Game', 'suit', 'batu/gunting/kertas', '', c => {
  const o = ['batu', 'gunting', 'kertas'], me = (c.args[0] || '').toLowerCase(), bot = rnd(o);
  if (!o.includes(me)) return c.reply(`Pilih: ${P}suit batu, gunting, atau kertas`);
  const w = o[(o.indexOf(me) + 1) % 3] === bot;
  if (w) { U.user(c.from).coin += 20; save(); }
  c.reply(`Aku pilih ${bot}. ${me === bot ? 'Seri.' : w ? 'Kamu menang +20 koin!' : 'Kamu kalah.'}`);
});
add('Game', 'slot', 'taruhan', '', c => {
  const u = U.user(c.from), b = Math.max(10, parseInt(c.args[0]) || 10);
  if (u.coin < b) return c.reply(`Koin kurang. Cek ${P}me`);
  const s = [0, 0, 0].map(() => rnd(['🍒', '🍋', '🔔', '7️⃣'])), n = new Set(s).size;
  const d = n === 1 ? b * 4 : n === 2 ? b : -b;
  u.coin += d; save();
  c.reply(s.join(' ') + '\n' + (d > 0 ? 'Menang +' + d : 'Kalah ' + d) + ' koin');
});
add('RPG', 'me profile', '', '', c => {
  const u = U.user(c.from);
  c.reply(`Level ${u.lv} (${u.xp}/${u.lv * 50} xp)\nKoin ${u.coin}\nInventory: ${u.inv.slice(-10).join(', ') || 'kosong'}`);
});
add('RPG', 'daily', '', '', c => {
  const u = U.user(c.from), left = u.daily + 864e5 - Date.now();
  if (left > 0) return c.reply('Klaim lagi dalam ' + Math.ceil(left / 36e5) + ' jam.');
  u.daily = Date.now(); u.coin += 100; u.inv.push('kotak harian'); save();
  c.reply('+100 koin dan 1 kotak harian.');
});
add('Fun', 'quote', '', '', c => c.reply(rnd(['Pelan-pelan asal sampai.', 'Gagal itu biasa, berhenti itu pilihan.', 'Kerjakan sekarang, nanti ada versi yang lebih baik.'])));
add('Fun', 'pantun', '', '', c => c.reply(rnd([
  'Kalau ada sumur di ladang,\nBoleh kita menumpang mandi.\nKalau ada umurku panjang,\nBoleh kita berjumpa lagi.',
  'Buah cempedak di luar pagar,\nAmbil galah tolong jolokkan.\nSaya budak baru belajar,\nKalau salah tolong tunjukkan.'])));

add('Tools', 'cekno', 'nomor', '', async c => {
  const n = (c.args[0] || '').replace(/\D/g, '').replace(/^(62|0)/, '');
  if (!n) return c.reply(`Pakai: ${P}cekno 0812xxxx`);
  const [r] = await c.sock.onWhatsApp('62' + n + '@s.whatsapp.net');
  c.reply(`+62${n}\nOperator: ${(PV.find(p => p[1].test(n)) || [])[0] || 'tidak diketahui'}\nWhatsApp: ${r && r.exists ? 'terdaftar' : 'tidak terdaftar'}`);
});
add('Tools', 'short', 'link', '', async c => c.reply(await api.short(c.args[0] || '')));
add('Tools', 'qr', 'teks atau link', '', async c => c.q
  ? send(c, { image: await api.qr(c.q) })
  : c.reply(`Pakai: ${P}qr teks atau link`));
add('Tools', 'tr', 'kode teks', '', async c => {
  const [l, ...t] = c.args;
  if (!t.length) return c.reply(`Pakai: ${P}tr en selamat pagi`);
  c.reply(await api.translate(l, t.join(' ')));
});
add('Tools', 'remind', 'menit pesan', '', c => {
  const m = parseFloat(c.args[0]), t = c.args.slice(1).join(' ');
  if (!(m > 0 && m <= 1440) || !t) return c.reply(`Pakai: ${P}remind 30 minum obat`);
  setTimeout(() => c.reply('Pengingat: ' + t).catch(() => {}), m * 6e4);
  c.reply(`Oke, diingatkan ${m} menit lagi.`);
});
add('Tools', 'sholat', 'kota', '', async c => {
  const k = c.q || 'Jakarta';
  const t = await api.sholat(k);
  c.reply(`Jadwal sholat ${k}\n` + [['Subuh', 'Fajr'], ['Dzuhur', 'Dhuhr'], ['Ashar', 'Asr'], ['Maghrib', 'Maghrib'], ['Isya', 'Isha']].map(([a, b]) => `${a} ${t[b]}`).join('\n'));
});
add('Tools', 'cuaca', 'kota', '', async c => c.reply(await api.cuaca(c.q || 'Jakarta')));

add('Owner', 'bc', 'pesan', 'o', async c => {
  const ids = Object.keys(db.users).filter(j => j.endsWith('@s.whatsapp.net'));
  for (const j of ids) { await c.sock.sendMessage(j, { text: c.q }).catch(() => {}); await new Promise(r => setTimeout(r, 1500)); }
  c.reply('Terkirim ke ' + ids.length + ' user.');
});
add('Owner', 'ban', 'nomor', 'o', c => {
  const n = num(target(c));
  if (!n) return c.reply('Tag atau tulis nomornya.');
  if (!db.banned.includes(n)) db.banned.push(n);
  save(); c.reply('Diblokir: ' + n);
});
add('Owner', 'unban', 'nomor', 'o', c => {
  const n = num(target(c));
  db.banned = db.banned.filter(x => x !== n); save();
  c.reply('Dibuka: ' + n);
});
add('Owner', 'chatai', 'on/off', 'o', c => { db.cfg.chatai = c.args[0] !== 'off'; save(); c.reply('Balasan AI di chat pribadi: ' + (db.cfg.chatai ? 'aktif' : 'mati')); });
add('Owner', 'restart', '', 'o', async c => { await c.reply('Restart...'); process.exit(0); });
add('Owner', 'backup', '', 'o', c => { save(); return send(c, { document: fs.readFileSync('data.json'), fileName: 'data.json', mimetype: 'application/json' }); });

function menu() {
  const g = {};
  for (const [n, c] of Object.entries(cmds)) (g[c.cat] ||= []).push(P + n + (c.usage ? ` <${c.usage}>` : ''));
  return '*Menu bot*\n\n' + Object.entries(g).map(([k, v]) => `*${k}*\n${v.join('\n')}`).join('\n\n');
}

async function getMeta(sock, j) {
  const c = mc.get(j);
  if (c && Date.now() - c.t < 6e4) return c.d;
  const d = await sock.groupMetadata(j);
  mc.set(j, { t: Date.now(), d });
  return d;
}

async function handle(sock, m, botNum) {
  const jid = m.key.remoteJid;
  if (!m.message || jid === 'status@broadcast') return;
  const fromMe = m.key.fromMe, isGroup = jid.endsWith('@g.us');
  const from = fromMe ? botNum + '@s.whatsapp.net' : m.key.participant || jid;
  const msg = m.message.ephemeralMessage?.message || m.message;
  const text = (msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption || msg.videoMessage?.caption || '').trim();
  const owners = OWNER.length ? OWNER : [db.cfg.owner ||= botNum];
  const isOwner = owners.includes(num(from)), isCmd = text.startsWith(P);
  if ((fromMe && !isCmd) || (db.banned.includes(num(from)) && !isOwner) || (!isOwner && U.spam(from))) return;
  const reply = (t, mentions) => sock.sendMessage(jid, { text: t, mentions }, { quoted: m });
  const meta = isGroup ? await getMeta(sock, jid) : null;
  const isAdmin = isOwner || !!(meta && meta.participants.some(p => p.admin && [p.id, p.phoneNumber, p.jid].some(x => x && num(x) === num(from))));
  const g = db.groups[jid] || {};

  if (isGroup && !fromMe && !isAdmin) {
    const bad = g.antilink && U.link(text) ? 'link grup' : g.antitoxic && U.toxic(text) ? 'kata kasar' : g.antivirtex && U.virtex(text) ? 'pesan bug' : null;
    if (bad) {
      await sock.sendMessage(jid, { delete: m.key }).catch(() => {});
      const k = jid + from, w = db.warns[k] = (db.warns[k] || 0) + 1;
      save();
      if (w >= 3) {
        db.warns[k] = 0;
        await sock.groupParticipantsUpdate(jid, [from], 'remove').catch(() => {});
        return reply(`@${num(from)} dikeluarkan karena 3x peringatan.`, [from]);
      }
      return reply(`@${num(from)} jangan kirim ${bad}. Peringatan ${w}/3`, [from]);
    }
  }

  if (!isGroup && !fromMe && !db.users[from]) {
    U.user(from); save();
    await reply(`Halo! Aku bot WhatsApp yang aktif 24 jam. Ketik ${P}menu untuk lihat semua perintah.`);
  }
  const gm = games.get(jid);
  if (gm && !isCmd) {
    if (Date.now() > gm.t) games.delete(jid);
    else if (text.toLowerCase() === gm.a) { games.delete(jid); U.user(from).coin += gm.coin; save(); return reply(`Benar! +${gm.coin} koin`); }
  }
  if (!isCmd) {
    if (!isGroup && !fromMe && text && db.cfg.chatai !== false) await reply(await api.ai(text).catch(() => `Ketik ${P}menu untuk lihat perintah.`));
    return;
  }

  const [name, ...args] = text.slice(P.length).split(/\s+/);
  const key = name.toLowerCase(), cmd = cmds[alias[key] || key];
  if (!cmd) return;
  if (cmd.flags.includes('g') && !isGroup) return reply('Perintah ini khusus grup.');
  if (cmd.flags.includes('a') && !isAdmin) return reply('Perintah ini khusus admin grup.');
  if (cmd.flags.includes('o') && !isOwner) return reply('Perintah ini khusus owner bot.');
  try { await cmd.fn({ sock, m, msg, jid, from, args, q: args.join(' '), isGroup, meta, reply }); U.gain(from); }
  catch (e) { console.log(key, e.message); reply('Gagal: ' + e.message); }
}

async function groupEvent(sock, { id, participants, action }) {
  if ((db.groups[id] || {}).welcome === false || !['add', 'remove'].includes(action)) return;
  for (const p of participants) {
    const j = p.id || p;
    await sock.sendMessage(id, { text: action === 'add' ? `Selamat datang @${num(j)}! Baca aturan grup dulu ya.` : `@${num(j)} keluar dari grup. Sampai jumpa.`, mentions: [j] });
  }
}

module.exports = { handle, groupEvent };

require('./downloader')(add, send, api);
