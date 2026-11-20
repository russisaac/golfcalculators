// v9 P1 landing page: "Playing today?" hero with Skins as the primary CTA, a static sample settle-up that
// is the real Skins example result (not made-up numbers), Stableford and Daily Handicap as secondary cards,
// a one-line trust row, the shared gc.css (inlined verbatim) and nav, WebSite JSON-LD kept, no analytics.
// The above-the-fold check at 375x812 is in lib/browser-checks.js (home fold).
const {JSDOM}=require('jsdom');
const {SITE,boot,ok,report,path,fs}=require('../lib/harness');
const src=fs.readFileSync(path.join(SITE,'index.html'),'utf8');
if(!/data-gc="home-v2"/.test(src)){console.log('SKIP  landing page v2 not on this branch');process.exit(0);}
const d=new JSDOM(src).window.document;const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
const h1=d.querySelector('main h1');
ok('hero H1 is "Playing today?"',h1&&norm(h1.textContent)==='Playing today?');
const cta=d.getElementById('lp-cta');
ok('primary CTA is a gc-btn-primary link to /skins',!!cta&&cta.getAttribute('href')==='/skins'&&cta.classList.contains('gc-btn-primary')&&/skins/i.test(cta.textContent));
const all=[...d.body.querySelectorAll('*')];
ok('Skins CTA comes before the sample and the secondary cards in the document',all.indexOf(cta)<all.indexOf(d.getElementById('lp-sample'))&&all.indexOf(cta)<all.indexOf(d.querySelector('.lp-cards')));
ok('only one primary button on the page (Skins is the star)',d.querySelectorAll('.gc-btn-primary').length===1);
const trust=d.getElementById('lp-trust');const tt=norm(trust&&trust.textContent).toLowerCase();
ok('trust row says free, no sign-up, works on your phone',/free/.test(tt)&&/no sign-up/.test(tt)&&/works on your phone/.test(tt),tt);
const cards=[...d.querySelectorAll('.lp-cards a')];
ok('secondary cards: Stableford and Daily Handicap, each with a one-line description',cards.length===2&&['/stableford','/daily-handicap'].every(h=>cards.some(a=>a.getAttribute('href')===h&&norm((a.querySelector('span')||{}).textContent).length>10)));
ok('nav links all three calculators',['/skins','/stableford','/daily-handicap'].every(h=>d.querySelector(`nav.gc-nav a[href="${h}"]`)));
ok('shared gc.css inlined byte-identical',(d.querySelector('style[data-src="/gc.css"]')||{}).textContent===fs.readFileSync(path.join(SITE,'gc.css'),'utf8'));
ok('sample uses the Skins hero style (gc-hero) and is labelled as a sample',!!d.querySelector('#lp-sample .gc-hero')&&/sample/i.test(norm(d.querySelector('#lp-sample figcaption').textContent)));
// the sample is the real Skins example settle-up
const lines=[...d.querySelectorAll('#lp-sample .lp-pay')].map(p=>norm(p.textContent));
const sk=boot(path.join(SITE,'skins.html'),{url:'https://golfcalculators.com/skins'});
const E=sk.w.GCSkins,st=E.exampleState(),r=E.compute(st);
const want=r.payments.map(p=>`${r.names[p.from]} pays ${r.names[p.to]} $${p.amount.toFixed(2)}`);
ok('sample settle-up = the Skins calculator\'s own example result',JSON.stringify(lines)===JSON.stringify(want),lines.join(' | ')+' vs '+want.join(' | '));
ok('sample kicker matches the Skins stake ($5.00 a skin)',/\$5\.00 a skin/.test(norm(d.querySelector('#lp-sample .gc-kicker').textContent))&&String(st.stake)==='5');
ok('regression anchor still holds (-75/-75/-35/+185)',r.balances.join()==='-75,-75,-35,185');
const lds=[...d.querySelectorAll('script[type="application/ld+json"]')];let g=null;try{g=JSON.parse(lds[0].textContent);}catch(e){}
ok('WebSite JSON-LD kept',lds.length===1&&g&&g['@type']==='WebSite'&&g.url==='https://golfcalculators.com/');
ok('no third-party scripts; the only analytics is the shared, hostname-gated gc-ga.js (v9 P6)',!/<script[^>]+\ssrc=/.test(src)&&(src.match(/googletagmanager/g)||[]).length===1&&src.includes('<script data-src="/gc-ga.js">'));
ok('no inline event handlers / no JS needed to render',!/\son[a-z]+=/.test(src));
ok('footer links /privacy',!!d.querySelector('footer a[href="/privacy"]'));
process.exitCode=report('landing')?1:0;
