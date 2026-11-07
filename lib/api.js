// Semua API pihak ketiga yang dipakai bot ada di file ini.
// Semua endpoint di bawah ini GRATIS dan TIDAK MEMERLUKAN API KEY.
// AI menggunakan endpoint OpenAI-compatible gratis dari Pollinations.
const E = process.env, enc = encodeURIComponent;
const EP = {
  tiktok: 'https://www.tikwm.com/api/?url=',                         // gratis, keyless
  aiText: 'https://text.pollinations.ai/openai',                    // OpenAI-compatible, keyless
  aiImage: 'https://image.pollinations.ai/prompt/',                 // gratis, keyless
  short: 'https://tinyurl.com/api-create.php?url=',                 // gratis, keyless
  qr: 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=', // gratis, keyless
  translate: 'https://api.mymemory.translated.net/get',             // gratis, keyless
  sholat: 'https://api.aladhan.com/v1/timingsByCity',               // gratis, keyless
  cuaca: 'https://wttr.in/',                                        // gratis, keyless
  cobalt: 'https://api.cobalt.tools/api/json'                       // gratis, keyless (YouTube & sosial media)
};
const PERSONA = 'Jawab singkat dan santai dalam bahasa Indonesia.';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = async (u, t = 'json') => {
  const r = await fetch(u, { signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw Error('HTTP ' + r.status);
  return t === 'json' ? r.json() : t === 'text' ? r.text() : Buffer.from(await r.arrayBuffer());
};

// --- AI: OpenAI-compatible gratis (Pollinations) ---
const ai = async q => {
  const res = await fetch(EP.aiText, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai',
      messages: [
        { role: 'system', content: PERSONA },
        { role: 'user', content: q }
      ]
    }),
    signal: AbortSignal.timeout(30000)
  });
  const data = await res.json();
  if (!res.ok) throw Error(data.error?.message || 'HTTP ' + res.status);
  return (data.choices?.[0]?.message?.content || '').trim().slice(0, 1500);
};

// --- Cobalt: unduhan YouTube & sosial media gratis ---
const cobalt = async (url, audio = false) => {
  const res = await fetch(EP.cobalt, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ url, isAudioOnly: audio }),
    signal: AbortSignal.timeout(30000)
  });
  const data = await res.json();
  if (data.status === 'error') throw Error(data.text || 'Cobalt error');
  if (!data.url) throw Error('URL media tidak ditemukan');
  return data.url;
};

module.exports = {
  tiktok: async link => (await get(EP.tiktok + enc(link))).data,
  ai,
  image: p => get(EP.aiImage + enc(p), 'buf'),
  short: link => get(EP.short + enc(link), 'text'),
  qr: t => get(EP.qr + enc(t), 'buf'),
  translate: async (lang, t) => (await get(`${EP.translate}?q=${enc(t)}&langpair=Autodetect|${lang}`)).responseData.translatedText,
  sholat: async kota => (await get(`${EP.sholat}?city=${enc(kota)}&country=Indonesia&method=20`)).data.timings,
  cuaca: kota => get(EP.cuaca + enc(kota) + '?format=3&lang=id', 'text'),

  // YouTube audio (MP3)
  yt: async link => {
    const id = (link.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/) || [])[1];
    if (!id) throw Error('Link YouTube tidak valid');
    const url = await cobalt(link, true);
    return { status: 'ok', link: url, title: 'YouTube Audio' };
  },

  // Unduhan sosial media umum (TikTok, IG, FB, dll.) via Cobalt
  media: async link => {
    return await cobalt(link, false);
  }
};
