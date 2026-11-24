/* gc-grow.js: golfcalculators.com email signup + "Gear for this game" (v11, Nov 2026). Inlined verbatim into every page as
   <script data-src="/gc-grow.js">; tests/run fails if a copy drifts from this file.
   - Newsletter forms (footer on every page, and the card after a result on the four calculators) post to Netlify Forms
     ("newsletter", honeypot bot-field) with fetch: inline "You're in", inline errors, no page jump. The address goes only
     in the POST body to this site; never into a URL, storage or analytics.
   - The card after a result: shown at most once per browser session, never again for 30 days after the x, never after a
     signup (localStorage keeps only a date or a flag).
   - Gear: built from the inlined affiliates.json, only items with a url for the region; with none it renders nothing.
     Links open a new tab with rel="sponsored nofollow noopener"; a click sends affiliate_click {tool, item id}. */
(function () {
  var DISMISS = 'gc_nl_dismissed_v1', DONE = 'gc_nl_done_v1', SESSION = 'gc_nl_shown_v1', DAYS30 = 30 * 864e5, shownHere = false;
  function get(st, k) { try { return window[st].getItem(k); } catch (e) { return null; } }
  function put(st, k, v) { try { window[st].setItem(k, v); } catch (e) {} }
  function track(name, tool, item) { if (window.gcTrack) window.gcTrack(name, tool, item); }
  function toolOf(form) { var t = form.querySelector('input[name="tool"]'); return t ? t.value : 'site'; }
  function body(form) {
    var out = [];
    for (var i = 0; i < form.elements.length; i++) {
      var el = form.elements[i];
      if (!el.name || el.disabled || (el.type === 'checkbox' && !el.checked) || el.type === 'submit') continue;
      out.push(encodeURIComponent(el.name) + '=' + encodeURIComponent(el.value));
    }
    return out.join('&');
  }
  function say(form, msg) {
    var err = form.querySelector('.gc-nl-err'), em = form.querySelector('input[type="email"]');
    err.textContent = msg;
    if (msg) em.setAttribute('aria-invalid', 'true'); else em.removeAttribute('aria-invalid');
  }
  function done(form) {
    put('localStorage', DONE, '1');
    var ok = document.createElement('p');
    ok.className = 'gc-nl-ok'; ok.setAttribute('role', 'status'); ok.tabIndex = -1;
    ok.textContent = 'You\u2019re in. Watch for one email a month, at most.';
    form.hidden = true; form.parentNode.insertBefore(ok, form.nextSibling);
    try { ok.focus({ preventScroll: true }); } catch (e) {}
  }
  function submit(e) {
    var form = e.target;
    if (!form.matches || !form.matches('form.gc-nl-form')) return;
    e.preventDefault();
    var em = form.querySelector('input[type="email"]'), consent = form.querySelector('input[name="consent"]'), btn = form.querySelector('button[type="submit"]');
    var v = (em.value || '').trim();
    if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(v)) { say(form, 'Enter an email address like name@example.com.'); em.focus(); return; }
    if (consent && !consent.checked) { say(form, 'Tick the box to say we can email you.'); consent.focus(); return; }
    say(form, '');
    var hp = form.querySelector('input[name="bot-field"]');
    if (hp && hp.value) { done(form); return; } // a bot filled the hidden field: look done, send nothing
    btn.disabled = true;
    fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body(form) })
      .then(function (r) { if (!r.ok) throw new Error('status ' + r.status); done(form); track('email_signup', toolOf(form)); })
      .catch(function () { btn.disabled = false; say(form, 'That didn\u2019t go through. Check your connection and try again.'); });
  }
  document.addEventListener('submit', submit);
  document.addEventListener('click', function (e) {
    var x = e.target.closest && e.target.closest('.gc-nl-x');
    if (x) {
      var card = x.closest('.gc-nl-card'); card.hidden = true;
      put('localStorage', DISMISS, String(Date.now()));
      track('email_dismiss', toolOf(card.querySelector('form')));
      return;
    }
    var a = e.target.closest && e.target.closest('a[data-aff]');
    if (a) track('affiliate_click', a.getAttribute('data-tool'), a.getAttribute('data-aff'));
  });
  function cardAllowed() {
    if (get('localStorage', DONE)) return false;
    var d = +get('localStorage', DISMISS);
    if (d && Date.now() - d < DAYS30) return false;
    return shownHere || !get('sessionStorage', SESSION);
  }
  function gear(tool) {
    var box = document.getElementById('gc-gear'), cfg = null, src = document.querySelector('script[data-src="/affiliates.json"]');
    if (!box || box.childNodes.length) return;
    try { cfg = JSON.parse(src.textContent); } catch (e) { return; }
    var byId = {}; (cfg.items || []).forEach(function (it) { byId[it.id] = it; });
    var list = ((cfg.tools || {})[tool] || []).map(function (id) { return byId[id]; }).filter(function (it) {
      var u = it && it.url && it.url[cfg.region]; return u && /^https:\/\//.test(u) && /^[a-z][a-z0-9-]{0,31}$/.test(it.id);
    }).slice(0, 3);
    if (!list.length) return; // nothing to show: no heading, no disclosure, no box
    var h = document.createElement('h2'); h.textContent = 'Gear for this game'; box.appendChild(h);
    var ul = document.createElement('ul'); ul.className = 'gc-gear-list';
    list.forEach(function (it) {
      var li = document.createElement('li'), a = document.createElement('a'), b = document.createElement('strong'), s = document.createElement('span');
      a.href = it.url[cfg.region]; a.target = '_blank'; a.rel = 'sponsored nofollow noopener';
      a.setAttribute('data-aff', it.id); a.setAttribute('data-tool', tool);
      b.textContent = it.label + ' \u2197'; s.textContent = it.note || '';
      a.appendChild(b); a.appendChild(s); li.appendChild(a); ul.appendChild(li);
    });
    box.appendChild(ul);
    var p = document.createElement('p'); p.className = 'gc-gear-disc'; p.textContent = cfg.disclosure || 'We may earn a commission from links on this page.';
    box.appendChild(p);
    box.hidden = false;
  }
  window.GCGrow = {
    // call when a calculator shows the user's own result
    result: function (tool) {
      var card = document.getElementById('gc-nl-card');
      if (card && cardAllowed()) { card.hidden = false; shownHere = true; put('sessionStorage', SESSION, '1'); }
      gear(tool);
    },
    gear: gear, cardAllowed: cardAllowed, KEYS: { DISMISS: DISMISS, DONE: DONE, SESSION: SESSION }
  };
})();
