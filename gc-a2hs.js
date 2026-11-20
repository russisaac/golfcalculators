/* gc-a2hs.js: golfcalculators.com "Add to Home Screen" tip (v9 P5, Nov 2026). Inlined verbatim into Skins and
   Stableford as <script data-src="/gc-a2hs.js">; tests/run fails if a copy drifts from this file.
   Shown once, below a result (low on the page, so it never shifts the result when the prompt arrives late), in #a2hs: on iPhone/iPad Safari ("tap Share, then Add to Home Screen")
   or where the browser offers an install prompt (Android Chrome: beforeinstallprompt). Never when the site is
   already open from the home screen. Dismissed, installed or shown once = never again (localStorage gc_a2hs_v1).
   No service worker, no network, nothing sent anywhere. */
(function () {
  var KEY = 'gc_a2hs_v1', deferred = null, showing = false;
  function get() { try { return localStorage.getItem(KEY); } catch (e) { return 'x'; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function standalone() { return navigator.standalone === true || !!(window.matchMedia && matchMedia('(display-mode: standalone)').matches); }
  function iosSafari() {
    var ua = navigator.userAgent || '', ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return ios && /Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\/|FBAN|FBAV|Instagram|Line\//.test(ua);
  }
  function mode() { return deferred ? 'prompt' : iosSafari() ? 'ios' : null; }
  var SHARE = '<svg class="gc-a2hs-ico" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false"><path d="M10 2v10M6 6l4-4 4 4M4 9v8h12V9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function hide(el) { el.hidden = true; el.innerHTML = ''; showing = false; }
  function render() { // call after a result is on screen
    var el = document.getElementById('a2hs'); if (!el) return;
    var m = mode();
    if (!m || standalone() || (get() && !showing)) { hide(el); return; }
    if (!showing) set('shown'); // one-time: it is not offered again on a later visit
    showing = true; el.hidden = false; el.setAttribute('data-mode', m);
    el.innerHTML = '<p class="gc-a2hs-t"><strong>Keep it on your phone</strong></p>' +
      (m === 'ios' ? '<p class="gc-a2hs-p">Tap Share ' + SHARE + ' at the bottom of Safari, then <b>Add to Home Screen</b>. It opens like an app, ready for the next round.</p>' :
        '<p class="gc-a2hs-p">Add Golf Calculators to your home screen. It opens like an app, ready for the next round.</p>') +
      '<div class="gc-a2hs-b">' + (m === 'prompt' ? '<button type="button" class="gc-btn gc-btn-primary" id="a2hs-add">Add to Home Screen</button>' : '') +
      '<button type="button" class="gc-btn gc-btn-ghost" id="a2hs-no">' + (m === 'prompt' ? 'Not now' : 'Got it') + '</button></div>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#a2hs-add, #a2hs-no'), el = document.getElementById('a2hs'); if (!b || !el) return;
    if (b.id === 'a2hs-no') { set('dismissed'); hide(el); return; }
    var d = deferred; deferred = null; if (!d) { hide(el); return; }
    d.prompt(); hide(el);
    if (d.userChoice && d.userChoice.then) d.userChoice.then(function (c) { set(c && c.outcome === 'accepted' ? 'installed' : 'dismissed'); }, function () {});
  });
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; var el = document.getElementById('a2hs'); if (el && el.parentElement && !el.parentElement.closest('[hidden]')) render(); }); // a result is on screen now
  window.addEventListener('appinstalled', function () { set('installed'); deferred = null; var el = document.getElementById('a2hs'); if (el) hide(el); });
  window.GCA2HS = { render: render, mode: mode, standalone: standalone, KEY: KEY };
})();
