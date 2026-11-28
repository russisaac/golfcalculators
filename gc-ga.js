/* gc-ga.js: golfcalculators.com Google Analytics 4 (G-DH32H3GWKE), v9 P6, Nov 2026. Inlined verbatim into every page
   as <script data-src="/gc-ga.js">; tests/run fails if a copy drifts from this file.
   - Loads only on the production hostnames (golfcalculators.com, www.): previews, drafts and localhost send nothing.
   - page_location is always origin + path + the utm_* parameters only: never the #fragment (shared result links
     carry names and scores in #r=) and never other query values (such as a handicap passed back with ?dh=).
   - Anonymous events, each with one parameter, the tool ("skins", "stableford", "handicap", "daily-handicap", or "site"
     for a page that is not a calculator): round_settled, result_shared, shared_link_opened, start_own_from_viewer,
     hi_calculate (v10: a Handicap Index was worked out; never the scores, differentials or the index itself),
     dh_calculate (v11: a Daily Handicap was worked out; never the handicap, ratings or result), email_signup and
     email_dismiss (v11: never the email address). affiliate_click (v11) adds one more parameter, item: the gear id
     from affiliates.json (lowercase letters, digits and hyphens only), and (v12) store: "au" or "us", the Amazon store
     the link went to. The tool may also be "scramble" (v12).
     scramble_calculate (v12: a scramble or Ambrose team handicap was worked out) carries one parameter only, mode:
     "usga", "ambrose" or "custom"; never the tool, names, handicaps or the team handicap.
     v13: the tool may also be "matchplay" or "nassau". matchplay_calculate (match play strokes were worked out) carries
     one parameter only, format: "singles", "fourball-match", "foursomes" or "fourball-stroke"; nassau_settle (a Nassau
     was settled) carries one parameter only, format: "1v1" or "2v2". Never names, handicaps, scores or money.
     Anything else is dropped. */
(function () {
  var ID = 'G-DH32H3GWKE', ON = location.hostname === 'golfcalculators.com' || location.hostname === 'www.golfcalculators.com';
  var EVENTS = ['round_settled', 'result_shared', 'shared_link_opened', 'start_own_from_viewer', 'hi_calculate', 'dh_calculate', 'email_signup', 'email_dismiss', 'affiliate_click', 'scramble_calculate', 'matchplay_calculate', 'nassau_settle'],
    TOOLS = ['skins', 'stableford', 'handicap', 'daily-handicap', 'scramble', 'matchplay', 'nassau', 'site'], ITEM = /^[a-z][a-z0-9-]{0,31}$/, MODES = ['usga', 'ambrose', 'custom'], STORES = ['au', 'us'],
    FORMATS = { matchplay_calculate: ['matchplay', ['singles', 'fourball-match', 'foursomes', 'fourball-stroke']], nassau_settle: ['nassau', ['1v1', '2v2']] };
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  function pageLocation() {
    var keep = (location.search || '').replace(/^\?/, '').split('&').filter(function (kv) { return /^utm_(source|medium|campaign|term|content)=[A-Za-z0-9_.-]*$/.test(kv); });
    return location.origin + location.pathname + (keep.length ? '?' + keep.join('&') : '');
  }
  if (ON) {
    window.gtag = gtag;
    var tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
    document.head.appendChild(tag);
    gtag('js', new Date());
    gtag('config', ID, { page_location: pageLocation() });
    var reset = function () { gtag('set', { page_location: pageLocation() }); };
    addEventListener('popstate', reset);
    addEventListener('hashchange', reset);
  }
  window.gcTrack = function (name, tool, item, store) {
    if (name === 'scramble_calculate') { // v12: {mode} only
      if (!ON || tool !== 'scramble' || MODES.indexOf(item) < 0) return false;
      gtag('event', name, { mode: item });
      return true;
    }
    if (Object.prototype.hasOwnProperty.call(FORMATS, name)) { // v13: {format} only
      var F = FORMATS[name];
      if (!ON || tool !== F[0] || typeof item !== 'string' || F[1].indexOf(item) < 0) return false;
      gtag('event', name, { format: item });
      return true;
    }
    if (!ON || EVENTS.indexOf(name) < 0 || TOOLS.indexOf(tool) < 0) return false;
    var p = { tool: tool };
    if (name === 'affiliate_click') { if (typeof item !== 'string' || !ITEM.test(item) || STORES.indexOf(store) < 0) return false; p.item = item; p.store = store; }
    gtag('event', name, p);
    return true;
  };
})();
