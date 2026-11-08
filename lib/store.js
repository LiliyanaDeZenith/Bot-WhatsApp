const fs = require('fs'), E = process.env;

function local() {
  let mem = {}, t;
  try { mem = JSON.parse(fs.readFileSync('store.json')); } catch {}
  const flush = () => { clearTimeout(t); t = setTimeout(() => fs.writeFileSync('store.json', JSON.stringify(mem)), 500); t.unref(); };
  const keys = async p => Object.keys(mem).filter(k => k.startsWith(p));
  return {
    get: async ids => Object.fromEntries(ids.filter(i => i in mem).map(i => [i, mem[i]])),
    set: async rows => { Object.assign(mem, rows); flush(); },
    del: async ids => { ids.forEach(i => delete mem[i]); flush(); },
    delPrefix: async p => { (await keys(p)).forEach(k => delete mem[k]); flush(); },
    keys
  };
}

function cloud() {
  const sb = require('@supabase/supabase-js').createClient(E.SUPABASE_URL, E.SUPABASE_KEY, { auth: { persistSession: false } });
  const T = 'kv', ok = ({ data, error }) => { if (error) throw Error(error.message); return data; };
  const part = (ids, n = 80) => Array.from({ length: Math.ceil(ids.length / n) }, (_, i) => ids.slice(i * n, i * n + n));
  return {
    get: async ids => {
      const o = {};
      for (const c of part(ids)) for (const r of ok(await sb.from(T).select('id,value').in('id', c))) o[r.id] = r.value;
      return o;
    },
    set: async rows => {
      const a = Object.entries(rows).map(([id, value]) => ({ id, value }));
      if (a.length) ok(await sb.from(T).upsert(a));
    },
    del: async ids => { for (const c of part(ids)) ok(await sb.from(T).delete().in('id', c)); },
    delPrefix: async p => { ok(await sb.from(T).delete().like('id', p + '%')); },
    keys: async p => ok(await sb.from(T).select('id').like('id', p + '%')).map(r => r.id)
  };
}

module.exports = E.SUPABASE_URL && E.SUPABASE_KEY ? cloud() : local();
