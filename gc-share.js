/* gc-share.js: golfcalculators.com shared result links (v1, Nov 2026). Inlined verbatim into each calculator
   page as <script data-src="/gc-share.js"> (like gc.css); tests/run fails if a copy drifts from this file.
   A result link is https://golfcalculators.com/<tool>#r=<tag>.<payload>. The data sits in the #fragment, which
   browsers never send to the server, so names and scores never reach Netlify, a CDN, a Referer or a preview
   crawler. Tags: "1z." = v1, deflate-raw then base64url; "1." = v1, plain base64url (no CompressionStream).
   Everything decoded is treated as hostile: size caps, strict base64url, fatal UTF-8, JSON.parse only; each
   page then rebuilds its state field by field from a whitelist (never Object.assign). */
(function () {
  var MAX = 4096, CAP = 16384;
  function err(code) { var e = new Error(code); e.code = code; return e; }
  function b64u(bytes) {
    var s = '', i;
    for (i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, Array.prototype.slice.call(bytes, i, i + 0x8000));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function unb64u(str) {
    if (!/^[A-Za-z0-9_-]+$/.test(str) || str.length % 4 === 1) return null;
    var b = str.replace(/-/g, '+').replace(/_/g, '/'), s, u, i;
    while (b.length % 4) b += '=';
    try { s = atob(b); } catch (e) { return null; }
    u = new Uint8Array(s.length);
    for (i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    return u;
  }
  function pump(bytes, stream, cap) { // write all bytes through a (De)CompressionStream; stop past cap bytes out
    var w = stream.writable.getWriter(), r = stream.readable.getReader(), parts = [], n = 0;
    w.write(bytes).catch(function () {}); w.close().catch(function () {});
    return new Promise(function (res, rej) {
      (function next() {
        r.read().then(function (x) {
          if (x.done) { var out = new Uint8Array(n), o = 0; parts.forEach(function (p) { out.set(p, o); o += p.length; }); return res(out); }
          n += x.value.length;
          if (n > cap) { r.cancel().catch(function () {}); return rej(err('bad')); }
          parts.push(x.value); next();
        }, function () { rej(err('bad')); });
      })();
    });
  }
  function canZip() { return typeof CompressionStream === 'function'; }
  function encode(obj, plain) { // -> Promise of "1z.<payload>" (or "1.<payload>")
    var bytes = new TextEncoder().encode(JSON.stringify(obj));
    if (!plain && canZip()) return pump(bytes, new CompressionStream('deflate-raw'), Infinity).then(function (z) { return '1z.' + b64u(z); });
    return Promise.resolve('1.' + b64u(bytes));
  }
  function decode(raw) { // -> Promise of the parsed JSON object; rejects with code 'bad' or 'browser'
    return new Promise(function (res, rej) {
      if (typeof raw !== 'string' || raw.length > MAX) return rej(err('bad'));
      var m = /^(1z?)\.([A-Za-z0-9_-]+)$/.exec(raw);
      if (!m) return rej(err('bad'));
      var bytes = unb64u(m[2]);
      if (!bytes) return rej(err('bad'));
      var zipped = m[1] === '1z';
      if (zipped && typeof DecompressionStream !== 'function') return rej(err('browser'));
      if (!zipped && bytes.length > CAP) return rej(err('bad'));
      (zipped ? pump(bytes, new DecompressionStream('deflate-raw'), CAP) : Promise.resolve(bytes)).then(function (b) {
        var o;
        try { o = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(b)); } catch (e) { return rej(err('bad')); }
        if (!o || typeof o !== 'object' || Array.isArray(o)) return rej(err('bad'));
        res(o);
      }, rej);
    });
  }
  function fromHash(hash) { var m = /^#r=([^&#]*)$/.exec(hash || ''); return m ? m[1] : null; } // r= is the only key
  function get(o, k) { return Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined; } // own keys only
  function cleanText(s, max) { // NFC, no C0/C1 or bidi controls, trimmed, at most max code points
    if (typeof s !== 'string') return '';
    if (s.normalize) s = s.normalize('NFC');
    s = s.replace(/[\u0000-\u001F\u007F-\u009F\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim();
    return Array.from(s).slice(0, max).join('').trim();
  }
  function gsm(text) { // share text in plain ASCII where we wrote it, so SMS stays GSM-7 (PO, 12 Nov)
    return String(text).replace(/\s*\u00B7\s*/g, ' - ').replace(/[\u2013\u2014\u2212]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
      .replace(/\u2192/g, '->').replace(/\u2026/g, '...').replace(/\u00D7/g, 'x').replace(/\u00A0/g, ' ');
  }
  var TEXT = { title: 'Shared result', line: 'Read-only, as entered by the scorer.',
    bad: ['This result link can\u2019t be opened', 'It is incomplete or from a newer version of the calculator.'],
    browser: ['This link needs a newer browser', 'Update your browser to see this result, or start your own round.'] };
  function banner(mode) { // mode: 'ok' | 'bad' | 'browser'; the banner is pre-rendered in the page (no layout shift)
    var t = document.getElementById('gc-shared-t'), p = document.getElementById('gc-shared-p'), x = mode === 'ok' ? [TEXT.title, TEXT.line] : TEXT[mode] || TEXT.bad;
    if (t) t.textContent = x[0];
    if (p) p.textContent = x[1];
    var h = document.documentElement.classList;
    h.add('gc-view'); h.remove('gc-wait'); h.toggle('gc-view-err', mode !== 'ok');
  }
  function leave() { var h = document.documentElement.classList; h.remove('gc-view', 'gc-wait', 'gc-view-err'); }
  window.GCShare = { encode: encode, decode: decode, fromHash: fromHash, get: get, cleanText: cleanText, gsm: gsm, banner: banner, leave: leave,
    TEXT: TEXT, MAX: MAX, CAP: CAP, b64u: b64u, unb64u: unb64u };
})();
