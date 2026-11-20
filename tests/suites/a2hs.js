// v9 P5 Add to Home Screen: manifest.webmanifest (name, 192/512 icons, maskable, standalone, theme colour, start_url /),
// apple-touch-icon + iOS meta on every page, and a dismissible one-time tip after a result: iPhone Safari
// ("tap Share, then Add to Home Screen") or the browser's install prompt (Android: beforeinstallprompt).
// No service worker. Never shown when already opened from the home screen.
const {SITE,boot,ok,report,path,fs}=require('../lib/harness');const {JSDOM}=require('jsdom');
if(!fs.existsSync(path.join(SITE,'manifest.webmanifest'))){console.log('SKIP  no manifest on this branch');process.exit(0);}
const rd=n=>fs.readFileSync(path.join(SITE,n),'utf8');
const png=n=>{const b=fs.readFileSync(path.join(SITE,n));return b.slice(0,8).toString('hex')==='89504e470d0a1a0a'?[b.readUInt32BE(16),b.readUInt32BE(20),b[25]]:null;};
let M=null;try{M=JSON.parse(rd('manifest.webmanifest'));}catch(e){}
ok('manifest.webmanifest parses',!!M);
ok('netlify.toml serves the manifest as application/manifest+json',/for = "\/manifest\.webmanifest"\s*\n\s*\[headers\.values\]\s*\n\s*Content-Type = "application\/manifest\+json/.test(rd('netlify.toml')));
ok('manifest: name and short_name',M.name==='Golf Calculators'&&!!M.short_name&&M.short_name.length<=12);
ok('manifest: opens standalone at the home page (start_url /, scope /)',M.display==='standalone'&&M.start_url==='/'&&M.scope==='/');
ok('manifest: theme colour #166534 (the site accent) and a background colour',M.theme_color==='#166534'&&/^#[0-9a-f]{6}$/i.test(M.background_color));
const ic=(sz,pur)=>(M.icons||[]).find(i=>i.sizes===sz&&i.purpose===pur);
for(const [sz,pur] of [['192x192','any'],['512x512','any'],['192x192','maskable'],['512x512','maskable']]){const i=ic(sz,pur),d=i&&png(i.src.slice(1));
  ok(`manifest icon ${sz} ${pur}: a real PNG of that size`,!!i&&i.type==='image/png'&&!!d&&d[0]+'x'+d[1]===sz,i?i.src:'missing');}
{const d=png('icons/icon-maskable-512.png');ok('maskable icon is full-bleed (opaque, no transparent corners)',d&&d[2]===2);}
ok('no service worker anywhere',!fs.readdirSync(SITE).some(n=>/sw\.js|service-?worker/i.test(n))&&!fs.readdirSync(SITE).filter(n=>n.endsWith('.html')).some(n=>/serviceWorker/.test(rd(n)))&&!/serviceWorker/.test(rd('gc-a2hs.js')));
for(const n of fs.readdirSync(SITE).filter(n=>n.endsWith('.html'))){const d=new JSDOM(rd(n)).window.document,q=s=>d.querySelector(s);
  ok(`${n}: manifest, apple-touch-icon, theme-color and iOS web-app meta`,!!q('link[rel=manifest][href="/manifest.webmanifest"]')&&!!q('link[rel=apple-touch-icon][href="/apple-touch-icon.png"]')&&(q('meta[name=theme-color]')||{}).content==='#166534'&&(q('meta[name=apple-mobile-web-app-capable]')||{}).content==='yes'&&!!q('meta[name=apple-mobile-web-app-title]'));}
{const d=png('apple-touch-icon.png');ok('apple-touch-icon.png is 180x180',d&&d[0]===180&&d[1]===180);}
const src=rd('gc-a2hs.js');
for(const n of ['skins.html','stableford.html']){const m=rd(n).match(/<script data-src="\/gc-a2hs\.js">([\s\S]*?)<\/script>/);ok(`${n}: gc-a2hs.js inlined byte-identical`,!!m&&m[1]===src);}
ok('gc-a2hs.js talks to no server',!/fetch\(|XMLHttpRequest|sendBeacon|new Image|https?:\/\//.test(src.replace(/\/\*[\s\S]*?\*\//g,'').replace(/http:\/\/www\.w3\.org\/2000\/svg/g,'')));
const IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const CRIOS='Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0 Mobile/15E148 Safari/604.1';
const ANDROID='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36';
const DESK='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
const bootUA=(f,ua,opts={})=>boot(path.join(SITE,f),{url:'https://golfcalculators.com/'+f.replace('.html',''),storage:opts.storage,beforeParse(w){Object.defineProperty(w.navigator,'userAgent',{get:()=>ua});
  w.matchMedia=q=>({matches:!!opts.standalone&&/standalone/.test(q),addListener(){},removeListener(){}});if(opts.navStandalone)Object.defineProperty(w.navigator,'standalone',{get:()=>true});}});
const UI=h=>h.w.GCSkinsUI||h.w.GCStablefordUI;
for(const f of ['skins.html','stableford.html']){
  {const h=bootUA(f,IPHONE);ok(`${f} iPhone Safari: no tip on setup`,h.$('a2hs').hidden);
   UI(h).loadExample();const t=h.$('a2hs');
   ok(`${f} iPhone Safari: after a result, the tip says Share then Add to Home Screen`,!t.hidden&&t.dataset.mode==='ios'&&/Tap Share/.test(t.textContent)&&/Add to Home Screen/.test(t.textContent)&&!!h.$('a2hs-no'));
   ok(`${f}: the tip sits after Share result (Share stays first)`,!!(h.$('share-row').compareDocumentPosition(t)&4));
   ok(`${f}: marked as shown at once (one-time)`,h.w.localStorage.getItem('gc_a2hs_v1')==='shown');
   UI(h).show('hole');UI(h).show('result');ok(`${f}: still there for the rest of this visit`,!t.hidden);
   h.$('a2hs-no').click();ok(`${f}: Got it hides it`,t.hidden&&h.w.localStorage.getItem('gc_a2hs_v1')==='dismissed');
   const h2=bootUA(f,IPHONE,{storage:{gc_a2hs_v1:'shown',[f==='skins.html'?'gc_skins_v1':'gc_stableford_v1']:h.w.localStorage.getItem(f==='skins.html'?'gc_skins_v1':'gc_stableford_v1')||''}});UI(h2).loadExample();
   ok(`${f}: never shown again on a later visit`,h2.$('a2hs').hidden);}
  {const h=bootUA(f,IPHONE,{navStandalone:true});UI(h).loadExample();ok(`${f}: not shown when already opened from the home screen (iOS)`,h.$('a2hs').hidden);}
  {const h=bootUA(f,ANDROID,{standalone:true});const e=new h.w.Event('beforeinstallprompt');e.prompt=()=>{};UI(h).loadExample();h.w.dispatchEvent(e);ok(`${f}: not shown in standalone display mode (Android)`,h.$('a2hs').hidden);}
  {const h=bootUA(f,CRIOS);UI(h).loadExample();ok(`${f}: Chrome on iPhone gets no Safari instructions`,h.$('a2hs').hidden);}
  {const h=bootUA(f,DESK);UI(h).loadExample();ok(`${f}: desktop with no install prompt: no tip`,h.$('a2hs').hidden);}
  {const h=bootUA(f,ANDROID);let prompted=0;const e=new h.w.Event('beforeinstallprompt',{cancelable:true});e.prompt=()=>{prompted++;};e.userChoice=Promise.resolve({outcome:'accepted'});
   h.w.dispatchEvent(e);ok(`${f} Android: the browser's own mini-bar is held back (preventDefault) and nothing shows on setup`,e.defaultPrevented&&h.$('a2hs').hidden);
   UI(h).loadExample();const t=h.$('a2hs');ok(`${f} Android: after a result, an "Add to Home Screen" button`,!t.hidden&&t.dataset.mode==='prompt'&&!!h.$('a2hs-add'));
   h.$('a2hs-add').click();
   ok(`${f} Android: the button opens the browser's install prompt and hides the tip`,prompted===1&&t.hidden);
   setTimeout(()=>ok(`${f} Android: accepted = remembered as installed`,h.w.localStorage.getItem('gc_a2hs_v1')==='installed'),0);}
}
// viewer of a shared link sees it too (a new visitor), but the round is not affected
{const h=bootUA('skins.html',IPHONE);const E=h.w.GCSkins;ok('anchor: Skins example still -75/-75/-35/+185',E.compute(E.exampleState()).balances.join()==='-75,-75,-35,185');}
setTimeout(()=>{process.exitCode=report('a2hs')?1:0;},50);
