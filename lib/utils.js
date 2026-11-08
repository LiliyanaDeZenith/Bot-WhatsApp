const fs = require('fs'), store = require('./store');
const db = { users: {}, banned: [], groups: {}, warns: {}, cfg: {} };
let timer;
const load = async () => {
  let raw;
  try { raw = (await store.get(['data'])).data; } catch (e) { console.log('muat data gagal:', e.message); }
  try { Object.assign(db, JSON.parse(raw || fs.readFileSync('data.json'))); } catch {}
};
const save = () => {
  const s = JSON.stringify(db);
  try { fs.writeFileSync('data.json', s); } catch {}
  clearTimeout(timer);
  timer = setTimeout(() => store.set({ data: s }).catch(e => console.log('simpan gagal:', e.message)), 500);
  timer.unref();
};
const hits = new Map();
const spam = (id, max = 6, ms = 8000) => {
  const n = Date.now(), a = (hits.get(id) || []).filter(t => n - t < ms);
  a.push(n); hits.set(id, a);
  return a.length > max;
};
const toxic = t => /\b(anjing|anjir|babi|bangsat|bajingan|kontol|memek|goblok|tolol|asu)\b/i.test(t);
const link = t => /chat\.whatsapp\.com\/[A-Za-z0-9]+/i.test(t);
const virtex = t => t.length > 4000 || /[\u0300-\u036f\u200b-\u200f\u202a-\u202e]{20,}/.test(t);
const calc = e => {
  if (!/^[\d+\-*/().%\s]+$/.test(e) || e.length > 40) return null;
  try { const r = Function('"use strict";return(' + e + ')')(); return Number.isFinite(r) ? r : null; } catch { return null; }
};
const user = j => db.users[j] ||= { xp: 0, lv: 1, coin: 100, inv: [], daily: 0 };
const gain = (j, xp = 5) => {
  const u = user(j); u.xp += xp;
  while (u.xp >= u.lv * 50) { u.xp -= u.lv * 50; u.lv++; u.coin += 50; }
  save(); return u;
};
module.exports = { db, save, load, spam, toxic, link, virtex, calc, user, gain };
