/* gc-ga.js: golfcalculators.com Google Analytics 4 (G-DH32H3GWKE), v9 P6, Nov 2026. Inlined verbatim into every page
   as <script data-src="/gc-ga.js">; tests/run fails if a copy drifts from this file.
   - Loads only on the production hostnames (golfcalculators.com, www.): previews, drafts and localhost send nothing.
   - page_location is always origin + path + the utm_* parameters only: never the #fragment (shared result links
     carry names and scores in #r=) and never other query values (such as a handicap passed back with ?dh=).
   - Four anonymous events, each with one parameter, the tool ("skins" or "stableford"): round_settled,
     result_shared, shared_link_opened, start_own_from_viewer. Anything else is dropped. */
(function () {
  var ID = 'G-DH32H3GWKE', ON = location.hostname === 'golfcalculators.com' || location.hostname === 'www.golfcalculators.com';
  var EVENTS = ['round_settled', 'result_shared', 'shared_link_opened', 'start_own_from_viewer'], TOOLS = ['skins', 'stableford'];
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
  window.gcTrack = function (name, tool) {
    if (!ON || EVENTS.indexOf(name) < 0 || TOOLS.indexOf(tool) < 0) return false;
    gtag('event', name, { tool: tool });
    return true;
  };
})();
