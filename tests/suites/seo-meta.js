// P3 seo-meta: titles/descriptions, canonical, JSON-LD (WebApplication + FAQPage matching the
// visible FAQ + BreadcrumbList, no ratings/reviews), worked example and rules source present,
// internal links (nav, body copy, Next-step cycle, home), sitemap lastmod, robots, calculator-first
// lede, and tools/seo/build.js in sync with the pages. Static HTML only (no scripts run).
const {JSDOM}=require('jsdom');const {execFileSync}=require('child_process');
const {SITE,ok,report,path,fs}=require('../lib/harness');
const TOOLS=['skins','stableford','daily-handicap'];
const files=fs.readdirSync(SITE).filter(n=>n.endsWith('.html')).sort();
const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
const words=s=>norm(s).split(' ').filter(Boolean).length;
if(!files.some(f=>/application\/ld\+json/.test(fs.readFileSync(path.join(SITE,f),'utf8')))){console.log('SKIP  no JSON-LD on this branch (P3 not present)');process.exit(0);}
const docs={};for(const f of files)docs[f]=new JSDOM(fs.readFileSync(path.join(SITE,f),'utf8')).window.document;
const meta=(d,sel)=>{const m=d.querySelector(sel);return m?m.getAttribute('content'):null;};
const titles={},descs={};
for(const f of files){const d=docs[f];const t=norm(d.title),ds=meta(d,'meta[name="description"]')||'';
  const url=f==='index.html'?'https://golfcalculators.com/':'https://golfcalculators.com/'+f.slice(0,-5);
  ok(`${f}: title ≤ 60 chars`,t.length>0&&t.length<=60,`${t.length}: ${t}`);
  ok(`${f}: description ≤ 155 chars`,ds.length>0&&ds.length<=155,String(ds.length));
  ok(`${f}: canonical = ${url}`,(d.querySelector('link[rel=canonical]')||{}).href===url);
  ok(`${f}: og:title = title, og:description = description`,meta(d,'meta[property="og:title"]')===t&&meta(d,'meta[property="og:description"]')===ds);
  const tt=meta(d,'meta[name="twitter:title"]'),td=meta(d,'meta[name="twitter:description"]');
  ok(`${f}: twitter:title = title, twitter:description = description`,tt===t&&td===ds,`${tt} | ${td}`);
  titles[t]=(titles[t]||0)+1;descs[ds]=(descs[ds]||0)+1;
  ok(`${f}: no aggregateRating or review anywhere`,!/aggregateRating|"review"|"Review"/.test(fs.readFileSync(path.join(SITE,f),'utf8')));
}
ok('titles unique across pages',Object.values(titles).every(n=>n===1));
ok('descriptions unique across pages',Object.values(descs).every(n=>n===1));
const QUERY={skins:/golf skins calculator/i,stableford:/stableford (points )?calculator/i,'daily-handicap':/daily handicap calculator/i,index:/golf calculators/i};
for(const [p,re] of Object.entries(QUERY)){const d=docs[p+'.html'];ok(`${p}: title keeps the primary query (${re.source})`,re.test(d.title));}
ok('home title is "Golf Calculators – Skins, Stableford & Daily Handicap (AU)"',docs['index.html'].title==='Golf Calculators – Skins, Stableford & Daily Handicap (AU)');

for(const p of TOOLS){const f=p+'.html',d=docs[f],url='https://golfcalculators.com/'+p;
  const lds=[...d.querySelectorAll('script[type="application/ld+json"]')];ok(`${p}: exactly one JSON-LD block`,lds.length===1);
  let g=null;try{g=JSON.parse(lds[0].textContent);}catch(e){}ok(`${p}: JSON-LD parses`,!!g);if(!g)continue;
  const graph=g['@graph']||[];const by=t=>graph.find(n=>n['@type']===t);
  ok(`${p}: @graph has WebApplication, FAQPage, BreadcrumbList`,g['@context']==='https://schema.org'&&!!by('WebApplication')&&!!by('FAQPage')&&!!by('BreadcrumbList'));
  const app=by('WebApplication')||{};
  ok(`${p}: WebApplication fields`,app.url===url&&!!app.name&&app.applicationCategory==='SportsApplication'&&app.operatingSystem==='Any'&&app.offers&&app.offers.price===0&&app.offers.priceCurrency==='AUD'&&app.inLanguage==='en-AU',JSON.stringify(app).slice(0,200));
  const bc=(by('BreadcrumbList')||{}).itemListElement||[];
  ok(`${p}: BreadcrumbList Home → tool`,bc.length===2&&bc[0].item==='https://golfcalculators.com/'&&bc[1].item===url&&bc[0].position===1&&bc[1].position===2);
  const ldFaq=((by('FAQPage')||{}).mainEntity||[]).map(q=>[norm(q.name),norm(q.acceptedAnswer&&q.acceptedAnswer.text)]);
  const visFaq=[...d.querySelectorAll('.gc-faq-item')].map(e=>[norm(e.querySelector('h3').textContent),norm(e.querySelector('p').textContent)]);
  ok(`${p}: 5–8 visible FAQ questions`,visFaq.length>=5&&visFaq.length<=8,String(visFaq.length));
  ok(`${p}: FAQ JSON-LD text = visible FAQ text`,JSON.stringify(ldFaq)===JSON.stringify(visFaq));
  const long=visFaq.filter(([,a])=>words(a)>60);ok(`${p}: every FAQ answer ≤ 60 words`,!long.length,long.map(([q,a])=>q+' '+words(a)).join('; '));
  ok(`${p}: H2 "How it's calculated" with a worked example`,[...d.querySelectorAll('h2')].some(h=>norm(h.textContent)==="How it's calculated")&&d.querySelectorAll('[data-ex]').length>3&&/Worked example/.test(d.body.textContent));
  const src=d.getElementById('rules-source');ok(`${p}: rules source with a link`,!!src&&!!src.querySelector('a[href^="https://"]'));
  const near=[...d.querySelectorAll('a[href="#how-h"]')];ok(`${p}: source/how-it's-calculated line near the result`,near.length>=1);
  const others=TOOLS.filter(x=>x!==p).map(x=>'/'+x);
  const navLinks=[...d.querySelectorAll('nav a')].map(a=>a.getAttribute('href'));
  ok(`${p}: nav links to the other two`,others.every(o=>navLinks.includes(o)),navLinks.join(' '));
  const body=[...d.querySelectorAll('.gc-learn p a')].filter(a=>others.includes(a.getAttribute('href')));
  ok(`${p}: body copy links to the other two with descriptive anchors`,others.every(o=>body.some(a=>a.getAttribute('href')===o&&words(a.textContent)>=3)),body.map(a=>a.textContent).join(' | '));
  if(p==='skins')ok('skins: says "common club format"',/common club format/.test(d.body.textContent));
  if(p==='skins'){const it=[...d.querySelectorAll('.gc-faq-item')].find(e=>/9 holes/.test(e.querySelector('p').textContent));const l=it&&it.querySelector('p a');
    ok('skins: the 9-hole FAQ answer links to the Daily Handicap calculator',!!l&&l.getAttribute('href')==='/daily-handicap'&&norm(l.textContent)==='Daily Handicap calculator',it?norm(it.querySelector('h3').textContent):'no 9-hole answer');}
  if(p==='daily-handicap'){const a=d.querySelector('p.lede a');ok('daily-handicap: "effective 2 Oct 2025" links to the Golf Australia article it came from',!!a&&norm(a.textContent)==='2 Oct 2025'&&a.getAttribute('href')==='https://www.golfaustralia.com.au/news/australian-rules-of-handicapping-updated-with-launch-of-golf-australias-new-digital-platform-620524'&&/\(effective 2 Oct 2025\)/.test(norm(a.closest('p').textContent)));
    const nw=a.closest('.nowrap');ok('daily-handicap: "effective 2 Oct 2025" kept on one line (a short white-space:nowrap span around the phrase)',!!nw&&norm(nw.textContent)==='effective 2 Oct 2025)'&&/\.nowrap\{white-space:nowrap\}/.test(d.documentElement.innerHTML));}
  if(p==='daily-handicap')ok('daily-handicap: cites the GA WHS guide, Edition January 2026, §3H, with the PDF link',/Edition January 2026, §3H/.test(src.textContent)&&!!src.querySelector('a[href*="static.golf.com.au"]'));
  // calculator first: between the H1 and the first control, at most one short line (≤ 20 words)
  const all=[...d.body.querySelectorAll('*')];const h1=d.querySelector('main h1');const ctl=all.find(e=>/^(INPUT|SELECT|BUTTON|TEXTAREA)$/.test(e.tagName)&&!e.closest('header')&&all.indexOf(e)>all.indexOf(h1));
  const between=all.filter(e=>e.tagName==='P'&&all.indexOf(e)>all.indexOf(h1)&&all.indexOf(e)<all.indexOf(ctl));
  ok(`${p}: calculator first (≤ 1 line of ≤ 20 words between H1 and the first control)`,!!h1&&!!ctl&&between.length<=1&&between.every(e=>words(e.textContent)<=20),between.map(e=>words(e.textContent)+'w').join(','));
  ok(`${p}: all new content sits below the calculator`,all.indexOf(d.querySelector('.gc-learn'))>all.indexOf(ctl));
}
// Next-step cycle DH → Stableford → Skins → DH
ok('Next step: daily-handicap → stableford',!!docs['daily-handicap.html'].querySelector('a.next-card[href="/stableford"]'));
ok('Next step: stableford → skins',!!docs['stableford.html'].querySelector('a.next-card[href="/skins"]'));
ok('Next step: skins → daily-handicap',!!docs['skins.html'].querySelector('.gc-next a[href="/daily-handicap"]'));
{const cards=[...docs['index.html'].querySelectorAll('main a.card')];ok('home links all three tools with a one-line description',TOOLS.every(t=>cards.some(a=>a.getAttribute('href')==='/'+t&&norm((a.querySelector('p')||{}).textContent).length>10)));}
// sitemap + robots
{const sm=fs.readFileSync(path.join(SITE,'sitemap.xml'),'utf8');const urls=[...sm.matchAll(/<url><loc>([^<]+)<\/loc><lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod><\/url>/g)].map(m=>m[1]);
 const canon=files.map(f=>docs[f].querySelector('link[rel=canonical]').href);
 ok('sitemap lists every canonical URL, each with lastmod',canon.every(c=>urls.includes(c))&&urls.length===(sm.match(/<url>/g)||[]).length,urls.join(' '));
 ok('robots.txt references the sitemap',/^Sitemap: https:\/\/golfcalculators\.com\/sitemap\.xml$/m.test(fs.readFileSync(path.join(SITE,'robots.txt'),'utf8')));}
// generator in sync
if(fs.existsSync(path.join(SITE,'tools/seo/build.js'))){let inSync=true;try{execFileSync(process.execPath,[path.join(SITE,'tools/seo/build.js'),'--check'],{stdio:'pipe'});}catch(e){inSync=false;}ok('pages match tools/seo/build.js output (content.js + pages.json)',inSync);}
process.exit(report('seo-meta')?1:0);
