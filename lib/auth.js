const { initAuthCreds, BufferJSON, proto } = require('@whiskeysockets/baileys');
const store = require('./store');

module.exports = async function useStoreAuth(num) {
  const k = x => `${num}/${x}`;
  const enc = v => JSON.stringify(v, BufferJSON.replacer);
  const dec = s => JSON.parse(s, BufferJSON.reviver);
  const saved = (await store.get([k('creds')]))[k('creds')];
  const creds = saved ? dec(saved) : initAuthCreds();
  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const rows = await store.get(ids.map(i => k(`${type}-${i}`))), out = {};
          for (const i of ids) {
            let v = rows[k(`${type}-${i}`)];
            if (v) {
              v = dec(v);
              if (type === 'app-state-sync-key') v = proto.Message.AppStateSyncKeyData.fromObject(v);
            }
            out[i] = v || null;
          }
          return out;
        },
        set: async data => {
          const up = {}, del = [];
          for (const type in data) for (const id in data[type]) {
            const v = data[type][id], key = k(`${type}-${id}`);
            if (v) up[key] = enc(v); else del.push(key);
          }
          await Promise.all([store.set(up), store.del(del)]);
        }
      }
    },
    saveCreds: () => store.set({ [k('creds')]: enc(creds) })
  };
};
