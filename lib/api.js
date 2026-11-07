// Semua API pihak ketiga yang dipakai bot ada di file ini.
// Key gratis diisi lewat environment (lihat .env.example). Kalau ada API yang mati, ganti URL-nya di bawah.
const E = process.env, enc = encodeURIComponent;
const EP = {
  tiktok: E.API_TIKTOK || 'https://www.tikwm.com/api/?url=',
  aiText: E.API_AI_TEXT || 'https://text.pollinations.ai/',
  aiImage: E.API_AI_IMAGE || 'https://image.pollinations.ai/prompt/',
  short: E.API_SHORT || 'https://tinyurl.com/api-create.php?url=',
  qr: E.API_QR || 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=',
  translate: E.API_TRANSLATE || 'https://api.mymemory.translated.net/get',
  sholat: E.API_SHOLAT || 'https://api.aladhan.com/v1/timingsByCity',
  cuaca: E.API_CUACA || 'https://wttr.in/'
};
const PERSONA = 'Jawab singkat dan santai dalam bahasa Indonesia.';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = async (u, t = 'json') => {
  const r = await fetch(u, { signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw Error('HTTP ' + r.status);
  return t === 'json' ? r.json() : t === 'text' ? r.text() : Buffer.from(await r.arrayBuffer());
};
const gemini = async q => {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${E.GEMINI_MODEL || 'gemini-2.5-flash'}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': E.GEMINI_API_KEY },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: PERSONA }] }, contents: [{ role: 'user', parts: [{ text: q }] }] }),
    signal: AbortSignal.timeout(30000)
  });
  const d = await r.json();
  if (!r.ok) throw Error((d.error && d.error.message) || 'HTTP ' + r.status);
  return ((d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || []).map(p => p.text || '').join('').trim();
};
const rapid = async (host, path, body) => {
  if (!E.RAPIDAPI_KEY) throw Error('RAPIDAPI_KEY belum diisi');
  const r = await fetch(`https://${host}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'x-rapidapi-key': E.RAPIDAPI_KEY, 'x-rapidapi-host': host, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(40000)
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(d.message || 'HTTP ' + r.status);
  return d;
};
const find = (o, re) => typeof o === 'string' ? (re.test(o) ? o : null)
  : o && typeof o === 'object' ? Object.values(o).map(v => find(v, re)).find(Boolean) || null : null;

module.exports = {
  tiktok: async link => (await get(EP.tiktok + enc(link))).data,
  ai: async q => {
    if (E.GEMINI_API_KEY) {
      try { const t = await gemini(q); if (t) return t.slice(0, 1500); } catch (e) { console.log('gemini:', e.message); }
    }
    return (await get(EP.aiText + enc(PERSONA + ' ' + q), 'text')).slice(0, 1500);
  },
  image: p => get(EP.aiImage + enc(p), 'buf'),
  short: link => get(EP.short + enc(link), 'text'),
  qr: t => get(EP.qr + enc(t), 'buf'),
  translate: async (lang, t) => (await get(`${EP.translate}?q=${enc(t)}&langpair=Autodetect|${lang}`)).responseData.translatedText,
  sholat: async kota => (await get(`${EP.sholat}?city=${enc(kota)}&country=Indonesia&method=20`)).data.timings,
  cuaca: kota => get(EP.cuaca + enc(kota) + '?format=3&lang=id', 'text'),
  yt: async link => {
    const id = (link.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/) || [])[1];
    if (!id) throw Error('Link YouTube tidak valid');
    for (let i = 0; i < 15; i++) {
      const d = await rapid('youtube-mp36.p.rapidapi.com', '/dl?id=' + id);
      if (d.status === 'ok' && d.link) return d;
      if (d.status !== 'processing') throw Error(d.msg || 'Gagal mengonversi');
      await sleep(1500);
    }
    throw Error('Konversi terlalu lama, coba lagi');
  },
  media: async link => {
    const d = await rapid(E.MEDIA_API_HOST || 'social-download-all-in-one.p.rapidapi.com', E.MEDIA_API_PATH || '/v1/social/autolink', { url: link });
    const u = find(d, /^https?:\/\/\S+\.(mp4|mov|webm)(\?|$)/i) || find(d, /^https?:\/\/\S+\.(jpe?g|png|webp)(\?|$)/i);
    if (!u) throw Error('Media tidak ditemukan di link itu');
    return u;
  }
};
