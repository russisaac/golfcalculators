// v11 P1 design uplift (DESIGN-UPLIFT.md, 24 Nov): one shared header on every page (flag + "Golf Calculators" wordmark,
// right-aligned nav; aria-current is the only per-page difference), Daily Handicap and Privacy on the shared gc.css shell
// (no .site-nav left), the DH form on the shared card/input/button/hero classes with a Load example that gives the
// 14 / 15 anchors, and the home trust row ("Rules follow WHS / Golf Australia / USGA (checked Nov 2026)") whose
// How we calculate link lands on a real section that links each tool's own "How it's calculated".
// Widths, the two-column desktop home and the first-screen positions are checked in lib/browser-checks.js (v11 P1).
const {JSDOM}=require('jsdom');
const {SITE,boot,ok,report,path,fs}=require('../lib/harness');
const rd=n=>fs.readFileSync(path.join(SITE,n),'utf8');
if(!/class="gc-word"/.test(rd('skins.html'))){console.log('SKIP  v11 design uplift not on this branch');process.exit(0);}
const pages=fs.readdirSync(SITE).filter(n=>n.endsWith('.html')).sort();
const doc=n=>new JSDOM(rd(n)).window.document;
const CUR={'index.html':'/','skins.html':'/skins','stableford.html':'/stableford','daily-handicap.html':'/daily-handicap'};
const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
// 1. header markup identical across pages once aria-current is removed
const hdr=n=>{const m=rd(n).match(/<header[ >][\s\S]*?<\/header>/);return m?m[0]:'';};
const bare=n=>hdr(n).replace(/ aria-current="page"/g,'');
const ref=bare('skins.html');
for(const n of pages)ok(`${n}: header markup identical to every other page (aria-current aside)`,bare(n)===ref,bare(n)===ref?'':bare(n).slice(0,160));
ok('exactly one <header> per page',pages.every(n=>(rd(n).match(/<header[ >]/g)||[]).length===1));
for(const n of pages){const d=doc(n),cur=[...d.querySelectorAll('header [aria-current="page"]')].map(a=>a.getAttribute('href'));
  ok(`${n}: aria-current marks its own link only`,JSON.stringify(cur)===JSON.stringify(CUR[n]?[CUR[n]]:[]),cur.join());}
{const d=doc('skins.html'),b=d.querySelector('header.gc-header .gc-header-in > a.gc-brand[href="/"]');
 ok('brand: flag + "Golf Calculators" wordmark, one link home, accessible name contains the visible words',!!b&&!!b.querySelector('img[src="/favicon.svg"][alt=""]')&&norm(b.querySelector('.gc-word').textContent)==='Golf Calculators'&&/Golf Calculators/.test(b.getAttribute('aria-label')));
 ok('nav: Skins, Stableford, Daily Hcp (no "Home" text link)',[...d.querySelectorAll('nav.gc-nav a')].map(a=>norm(a.textContent)).join('|')==='Skins|Stableford|Daily Hcp');}
const css=rd('gc.css');
ok('gc.css: nav right-aligned (justify-content:flex-end) and header sticky',/\.gc-nav\{[^}]*justify-content:flex-end/.test(css)&&/\.gc-header\{[^}]*position:sticky/.test(css));
ok('gc.css: wordmark weight 750, tight tracking, system font only (no @font-face, no font links)',/\.gc-word\{[^}]*font-weight:750[^}]*letter-spacing:-\.02em/.test(css)&&pages.every(n=>!/@font-face|fonts\.googleapis|fonts\.gstatic/.test(rd(n))));
// 2. DH and Privacy on the shared shell
for(const n of ['daily-handicap.html','privacy.html']){const d=doc(n);
  ok(`${n}: inlines gc.css byte-identical`,(d.querySelector('style[data-src="/gc.css"]')||{}).textContent===css);
  ok(`${n}: gc-main and gc-footer shell`,!!d.querySelector('main.gc-main')&&!!d.querySelector('footer.gc-footer'));}
ok('no .site-nav (markup or CSS) on any page',pages.every(n=>!/site-nav/.test(rd(n))));
{const d=doc('daily-handicap.html');
 ok('DH form on the shared classes: gc-card, gc-input (selects + 4 fields), gc-btn, result in gc-hero with gc-big',!!d.querySelector('.gc-card #ga')&&['gender','holes','ga','slope','scratch','par'].every(id=>d.getElementById(id).classList.contains('gc-input'))&&d.getElementById('plusToggle').classList.contains('gc-btn')&&d.getElementById('result').classList.contains('gc-hero')&&d.getElementById('dailyOut').classList.contains('gc-big'));
 ok('DH: text fields use inputmode, never type=number',['ga','slope','scratch','par'].every(id=>d.getElementById(id).getAttribute('type')==='text'&&d.getElementById(id).getAttribute('inputmode')));}
{const h=boot(path.join(SITE,'daily-handicap.html'),{url:'https://golfcalculators.com/daily-handicap'});
 h.$('dh-example').click();
 const men=h.$('dailyOut').textContent,shown=h.$('result').style.display;
 h.set('gender','women');const women=h.$('dailyOut').textContent;
 ok('DH Load example: GA 14.2, Slope 128, Scratch 71, Par 72 gives men 14 and women 15 (regression anchors)',men==='14'&&women==='15'&&shown==='block',`${men}/${women}`);
 ok('DH Load example fills the fields',h.$('ga').value==='14.2'&&h.$('slope').value==='128'&&h.$('scratch').value==='71'&&h.$('par').value==='72'&&h.$('holes').value==='18');}
// 3. Home: trust row, How we calculate section, type scale, wide layout rules
{const src=rd('index.html'),d=doc('index.html'),r=d.getElementById('lp-rules');
 ok('home: dated sources line "Rules follow WHS / Golf Australia / USGA (checked Nov 2026)"',!!r&&norm(r.querySelector('span').textContent)==='Rules follow WHS / Golf Australia / USGA (checked Nov 2026)');
 const a=r&&r.querySelector('a');const tgt=a&&d.getElementById((a.getAttribute('href')||'').replace(/^#/,''));
 ok('home: "How we calculate" links to a real section on the page (no dead link)',!!a&&norm(a.textContent)==='How we calculate'&&/^#/.test(a.getAttribute('href'))&&!!tgt&&tgt.tagName==='SECTION');
 const links=tgt?[...tgt.querySelectorAll('a')].map(x=>x.getAttribute('href')):[];
 ok('How we calculate links each tool\'s own (v12: + scramble) "How it\'s calculated" section, and each anchor exists on that page',links.length===(fs.existsSync(path.join(SITE,'nassau-calculator.html'))?7:fs.existsSync(path.join(SITE,'scramble-handicap-calculator.html'))?5:4)&&links.every(h=>{const [p,id]=h.split('#');const f=(p.slice(1)||'index')+'.html';return fs.existsSync(path.join(SITE,f))&&!!doc(f).getElementById(id);}),links.join(' '));
 ok('home: trust row sits in the hero, after the ticks and before the sample',(()=>{const all=[...d.body.querySelectorAll('*')];return r.closest('.lp-hero')&&all.indexOf(r)>all.indexOf(d.getElementById('lp-trust'))&&all.indexOf(r)<all.indexOf(d.getElementById('lp-sample'));})());
 ok('home: stronger fluid h1 (clamp 30px to 40px)',/\.lp-hero h1\{font-size:clamp\(30px,[^)]*\),40px\)/.test(src));
 ok('home: from 900px a 68rem two-column grid and 3-up tool cards (v13: six tools in two rows); nothing wider below 900px',/@media \(min-width:900px\)\{[\s\S]*?\.lp-main\{max-width:68rem[^}]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)[\s\S]*?\.lp-cards\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)\}/.test(src));}
process.exitCode=report('v11-design')?1:0;
