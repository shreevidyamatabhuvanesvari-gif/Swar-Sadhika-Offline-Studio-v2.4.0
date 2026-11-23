(function (w) {
  'use strict';
  const S = w.SwarSadhika;
  const DB_NAME = 'swar-sadhika-complete-v2';
  const DB_VERSION = 1;
  const STORES = ['works', 'profiles', 'avatar', 'bodyFrames', 'sessions', 'settings'];
  let dbPromise;
  const memory = Object.fromEntries(STORES.map(k => [k, new Map()]));
  let fallback = false;

  function openDB() {
    if (!('indexedDB' in w)) { fallback = true; return Promise.resolve(null); }
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      let request;
      try { request = indexedDB.open(DB_NAME, DB_VERSION); } catch (e) { fallback = true; resolve(null); return; }
      request.onupgradeneeded = () => {
        const d = request.result;
        STORES.forEach(name => { if (!d.objectStoreNames.contains(name)) d.createObjectStore(name, { keyPath: 'id' }); });
      };
      request.onsuccess = () => { const d = request.result; d.onversionchange = () => d.close(); resolve(d); };
      request.onerror = () => { fallback = true; resolve(null); };
      request.onblocked = () => { fallback = true; resolve(null); };
    });
    return dbPromise;
  }
  function fallbackSave(store, data) {
    memory[store].set(data.id, structuredCloneSafe(data));
    try { localStorage.setItem(`ss:${store}:${data.id}`, JSON.stringify(data)); } catch (_) {}
    return data;
  }
  function structuredCloneSafe(obj) { return JSON.parse(JSON.stringify(obj)); }
  async function transact(store, mode, action) {
    if (!STORES.includes(store)) throw new Error('अमान्य संग्रह: ' + store);
    const db = await openDB();
    if (!db || fallback) return action(null);
    return new Promise((resolve, reject) => {
      let tx, result;
      try { tx = db.transaction(store, mode); result = action(tx.objectStore(store)); }
      catch (e) { reject(e); return; }
      tx.oncomplete = () => resolve(result && result.result !== undefined ? result.result : result);
      tx.onerror = () => reject(tx.error || new Error('स्थानीय संग्रह त्रुटि'));
      tx.onabort = () => reject(tx.error || new Error('संग्रह कार्रवाई रद्द हुई'));
    });
  }
  const api = {
    stores: STORES.slice(),
    async put(store, value) {
      const record = { ...value }; if (!record.id) record.id = S.uid(); record.updatedAt = new Date().toISOString();
      const db = await openDB();
      if (!db || fallback) return fallbackSave(store, record);
      return new Promise((resolve, reject) => { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).put(record); tx.oncomplete = () => resolve(record); tx.onerror = () => reject(tx.error); });
    },
    async get(store, id) {
      const db = await openDB();
      if (!db || fallback) { if (memory[store].has(id)) return structuredCloneSafe(memory[store].get(id)); try { const raw = localStorage.getItem(`ss:${store}:${id}`); return raw ? JSON.parse(raw) : null; } catch (_) { return null; } }
      return new Promise((resolve, reject) => { const tx = db.transaction(store, 'readonly'); const req = tx.objectStore(store).get(id); req.onsuccess = () => resolve(req.result || null); req.onerror = () => reject(req.error); });
    },
    async all(store) {
      const db = await openDB();
      if (!db || fallback) {
        const rows = new Map(memory[store]);
        try { for (let i=0; i<localStorage.length; i++) { const k=localStorage.key(i); if (k && k.startsWith(`ss:${store}:`)) { const v=JSON.parse(localStorage.getItem(k)); rows.set(v.id,v); } } } catch (_) {}
        return Array.from(rows.values()).sort((a,b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
      }
      return new Promise((resolve, reject) => { const tx = db.transaction(store, 'readonly'); const req = tx.objectStore(store).getAll(); req.onsuccess = () => resolve((req.result || []).sort((a,b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))); req.onerror = () => reject(req.error); });
    },
    async delete(store, id) {
      const db = await openDB(); if (!db || fallback) { memory[store].delete(id); try { localStorage.removeItem(`ss:${store}:${id}`); } catch (_) {} return true; }
      return new Promise((resolve, reject) => { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).delete(id); tx.oncomplete=()=>resolve(true); tx.onerror=()=>reject(tx.error); });
    },
    async clear() {
      const db = await openDB();
      if (!db || fallback) { STORES.forEach(store => memory[store].clear()); try { const keys=[]; for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('ss:'))keys.push(k);} keys.forEach(k=>localStorage.removeItem(k)); } catch (_) {} return true; }
      return new Promise((resolve, reject) => { const tx=db.transaction(STORES,'readwrite'); STORES.forEach(store=>tx.objectStore(store).clear()); tx.oncomplete=()=>resolve(true); tx.onerror=()=>reject(tx.error); });
    },
    async exportAll(includePhoto = true) {
      const result = { format:'swar-sadhika-backup', version:2, exportedAt:new Date().toISOString(), data:{} };
      for (const store of STORES) result.data[store] = await this.all(store);
      if (!includePhoto) result.data.avatar = result.data.avatar.map(a => ({...a, photoDataUrl:null, photoExcluded:true}));
      return result;
    },
    async importAll(payload) {
      if (!payload || payload.format !== 'swar-sadhika-backup' || !payload.data || typeof payload.data !== 'object') throw new Error('यह स्वर-साधिका का मान्य बैकअप नहीं है।');
      const clean = {};
      for (const store of STORES) {
        const rows = payload.data[store];
        if (rows !== undefined && !Array.isArray(rows)) throw new Error(`बैकअप में ${store} सूची मान्य नहीं है।`);
        clean[store] = rows || [];
        if (clean[store].some(row => !row || typeof row.id !== 'string')) throw new Error(`बैकअप में ${store} रिकॉर्ड की ID अनुपस्थित है।`);
        if (store === 'avatar' && clean[store].some(row => row.photoDataUrl && !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(row.photoDataUrl))) throw new Error('बैकअप में Avatar फोटो सुरक्षित स्थानीय image data के रूप में नहीं है।');
        if (store === 'bodyFrames' && clean[store].some(row => row.thumbnail && !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(row.thumbnail))) throw new Error('बैकअप में अभ्यास-फ्रेम thumbnail सुरक्षित स्थानीय image data के रूप में नहीं है।');
      }
      await this.clear();
      for (const store of STORES) for (const row of clean[store]) await this.put(store, row);
      return true;
    },
    async counts() { const out={}; for (const store of STORES) out[store]=(await this.all(store)).length; return out; },
    async ready() { await openDB(); return !fallback && !!(await openDB()); },
    async clearSessionData() { await this.clear(); }
  };
  S.Storage = api;
})(window);
