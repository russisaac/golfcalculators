/* gc-courses.js: golfcalculators.com "Your courses" (v1, Nov 2026). Inlined verbatim into skins.html and
   stableford.html as <script data-src="/gc-courses.js">; tests/run fails if a copy drifts from this file.
   Saved course cards live in this browser's localStorage only (key gc_courses_v1, shared by both tools), by
   course name and tee. No server, nothing is sent anywhere. A saved card is only replaced when the golfer says
   so ("Update saved course?"); today's edits change today's round only. */
(function () {
  var KEY = 'gc_courses_v1', MAX = 20;
  function str(v, n) { return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '').trim().slice(0, n); }
  function clean(c) { // whitelist rebuild of one card; null if it is not a usable card
    if (!c || typeof c !== 'object') return null;
    var name = str(c.name, 40), holes = +c.holes === 9 ? 9 : 18;
    if (!name) return null;
    var nums = function (a, lo, hi) { return Array.isArray(a) && a.length === holes && a.every(function (x) { return +x === Math.round(+x) && +x >= lo && +x <= hi; }) ? a.map(Number) : null; };
    var par = nums(c.par, 3, 6), si = nums(c.si, 1, holes);
    if (!par || !si) return null;
    return { name: name, tee: str(c.tee, 20), holes: holes, par: par, si: si };
  }
  function key(c) { return str(c && c.name, 40).toLowerCase() + '|' + str(c && c.tee, 20).toLowerCase(); }
  function label(c) { return str(c.name, 40) + (str(c.tee, 20) ? ' \u00b7 ' + str(c.tee, 20) : ''); }
  function list() {
    try { var a = JSON.parse(localStorage.getItem(KEY) || '[]'); if (!Array.isArray(a)) return []; var seen = {}, out = [];
      a.forEach(function (x) { var c = clean(x); if (c && !seen[key(c)]) { seen[key(c)] = 1; out.push(c); } }); return out; } catch (e) { return []; }
  }
  function write(a) { try { localStorage.setItem(KEY, JSON.stringify(a.slice(0, MAX))); return true; } catch (e) { return false; } }
  function find(c) { var k = key(c), a = list(); for (var i = 0; i < a.length; i++) if (key(a[i]) === k) return a[i]; return null; }
  function put(c) { var x = clean(c); if (!x) return null; var k = key(x); write([x].concat(list().filter(function (y) { return key(y) !== k; }))); return x; }
  function remove(k) { var a = list(), b = a.filter(function (y) { return key(y) !== k; }); write(b); return a.length !== b.length; }
  function diff(a, b) { // holes whose par or SI differ (1-based); null if the cards are not comparable
    if (!a || !b || +a.holes !== +b.holes) return null; var out = [];
    for (var i = 0; i < a.par.length; i++) if (+a.par[i] !== +b.par[i] || +a.si[i] !== +b.si[i]) out.push(i + 1);
    return out;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  // "Your courses" list: one tap fills the card (data-cuse=<index in list()>), a delete asks first (data-cdel, then
  // data-cdel-yes / data-cdel-no). Course names are escaped (they are typed by the golfer).
  function listHtml(cards, asking) {
    return '<ul class="gc-courses">' + cards.map(function (c, i) {
      var l = esc(label(c));
      if (asking === key(c)) return '<li class="gc-courses-ask"><span id="cdq' + i + '">Delete <b>' + l + '</b> from Your courses?</span>' +
        '<span class="gc-courses-yn" role="group" aria-labelledby="cdq' + i + '"><button type="button" class="gc-btn gc-btn-secondary" data-cdel-yes="' + i + '">Delete</button><button type="button" class="gc-btn gc-btn-ghost" data-cdel-no="' + i + '">Keep</button></span></li>';
      return '<li><button type="button" class="gc-btn gc-btn-secondary gc-courses-use" data-cuse="' + i + '"><b>' + l + '</b> <span>' + c.holes + ' holes · par ' + par(c) + '</span></button>' +
        '<button type="button" class="gc-btn gc-btn-ghost gc-courses-del" data-cdel="' + i + '" aria-label="Delete ' + l + ' from Your courses">✕</button></li>';
    }).join('') + '</ul>';
  }
  function par(c) { return c.par.reduce(function (s, x) { return s + x; }, 0); }
  window.GCCourses = { KEY: KEY, clean: clean, key: key, label: label, list: list, find: find, put: put, remove: remove, diff: diff, par: par, listHtml: listHtml, esc: esc };
})();
