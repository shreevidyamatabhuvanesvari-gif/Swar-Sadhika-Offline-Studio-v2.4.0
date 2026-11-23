(function (w) {
  'use strict';
  const S = w.SwarSadhika = w.SwarSadhika || {};
  S.version = '2.4.0';
  S.$ = (id) => document.getElementById(id);
  S.$$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));
  S.uid = () => (w.crypto && crypto.randomUUID ? crypto.randomUUID() : 'ss-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9));
  S.toast = (message, ms = 2600) => {
    const el = S.$('toast'); if (!el) return;
    el.textContent = String(message); el.classList.add('show');
    clearTimeout(S._toastTimer); S._toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  };
  S.download = (name, blob) => {
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };
  S.safeText = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  S.formatTime = (sec) => { const n = Math.max(0, Math.floor(Number(sec) || 0)); return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`; };
  S.setMessage = (id, message, kind) => { const el = S.$(id); if (!el) return; el.textContent = message; el.dataset.kind = kind || 'info'; };
  S.readFileDataURL = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error || new Error('फ़ाइल पढ़ी नहीं जा सकी।')); reader.readAsDataURL(file);
  });
  S.readFileArrayBuffer = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error || new Error('फ़ाइल पढ़ी नहीं जा सकी।')); reader.readAsArrayBuffer(file);
  });
  S.debounce = (fn, delay = 180) => { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); }; };
  S.assert = (condition, message) => { if (!condition) throw new Error(message || 'जाँच विफल'); return true; };
})(window);
