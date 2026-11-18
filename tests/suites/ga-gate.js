// GA4 (G-DH32H3GWKE) through the shared gc-ga.js on EVERY page (v9 P6, Russ approved 18 Nov; was P2a: skins + stableford).
// Proves: (1) the hostname gate: GA loads only on golfcalculators.com / www., never on previews, drafts or localhost;
// (2) page_location never has a #fragment (shared #r= links hold names and scores) and keeps only utm_* query values;
// (3) the four events carry only {tool}: no player names, scores, amounts, handicaps or #r= data in any payload;
// (4) share links carry ?utm_source=share&utm_medium=link&utm_campaign=<tool> outside the #r= fragment, and still open.
const {SITE,boot,ok,report,path,fs}=require('../lib/harness');
const pages=fs.readdirSync(SITE).filter(n=>n.endsWith('.html')).sort();
const ID='G-DH32H3GWKE',src=fs.readFileSync(path.join(SITE,'gc-ga.js'),'utf8');
const withGA=pages.filter(n=>fs.readFileSync(path.join(SITE,n),'utf8').includes(ID));
ok('GA4 is on every page (home, Daily Handicap, privacy, feedback, calculators)',withGA.join()===pages.join()&&['index.html','daily-handicap.html','privacy.html','skins.html','stableford.html'].every(n=>withGA.includes(n)),withGA.join());
for(const n of pages){const m=fs.readFileSync(path.join(SITE,n),'utf8').match(/<script data-src="\/gc-ga\.js">([\s\S]*?)<\/script>/);ok(`${n}: gc-ga.js inlined byte-identical`,!!m&&m[1]===src);}
ok('gc-ga.js: the gate is the exact production hostnames',/var ID = 'G-DH32H3GWKE', ON = location\.hostname === 'golfcalculators\.com' \|\| location\.hostname === 'www\.golfcalculators\.com';/.test(src));
const tagOf=h=>[...h.d.querySelectorAll('script[src]')].some(s=>s.src==='https://www.googletagmanager.com/gtag/js?id='+ID);
const dl=h=>[...(h.w.dataLayer||[])].map(a=>[...a]);
const url=(host,n,rest='')=>`https://${host}/${n==='index.html'?'':n.replace('.html','')}${rest}`;
for(const n of pages){
  for(const host of ['golfcalculators.com','www.golfcalculators.com','p6-analytics--golfcalculators.netlify.app','6afd0000--golfcalculators.netlify.app','localhost','golfcalculators.com.evil.example','127.0.0.1']){
    const h=boot(path.join(SITE,n),{url:url(host,n)});const prod=/^(www\.)?golfcalculators\.com$/.test(host);
    const cfg=dl(h).some(a=>a[0]==='config');
    ok(`${n} on ${host}: gtag ${prod?'loads + config':'not loaded, nothing queued'}`,prod?(tagOf(h)&&cfg):(!tagOf(h)&&!dl(h).length&&h.w.gcTrack('round_settled','skins')===false),`tag=${tagOf(h)} queued=${dl(h).length}`);
  }
  // page_location: no fragment, ever; only utm_* query values survive
  for(const rest of ['','#r=1z.TY7BSsNQFER_Rc76Cibvzk19','?utm_source=share&utm_medium=link&utm_campaign=skins#r=1z.TY7BSsNQ','?dh=12&holes=18&p=1','?from=skins&utm_campaign=x<y']){
    const h=boot(path.join(SITE,n),{url:url('golfcalculators.com',n,rest)});const c=dl(h).filter(a=>a[0]==='config');const pl=c[0]&&c[0][2]&&c[0][2].page_location;
    const base=url('golfcalculators.com',n);const want=/utm_source=share/.test(rest)?base+'?utm_source=share&utm_medium=link&utm_campaign=skins':base;
    ok(`${n} at ${rest||'(plain URL)'}: one config, page_location = ${want.replace('https://golfcalculators.com','')||'/'} (no fragment, no other query)`,c.length===1&&pl===want,String(pl));
    ok(`${n} at ${rest||'(plain)'}: nothing queued contains the fragment or other query values`,!/#r=|TY7BSsNQ|dh=12|from=skins/.test(JSON.stringify(dl(h))));
  }
}
// hashchange / popstate to a shared link later in the same tab
for(const n of ['skins.html','stableford.html']){const h=boot(path.join(SITE,n),{url:url('golfcalculators.com',n)});
  h.w.location.hash='r=1z.TY7BSsNQFER';h.w.dispatchEvent(new h.w.HashChangeEvent('hashchange'));
  const set=dl(h).filter(a=>a[0]==='set').pop();ok(`${n}: a shared link opened later in the same tab sets page_location without the fragment`,!!set&&set[1].page_location===url('golfcalculators.com',n),set&&JSON.stringify(set[1]));}
// gcTrack whitelist
{const h=boot(path.join(SITE,'index.html'),{url:'https://golfcalculators.com/'});const T=h.w.gcTrack,before=dl(h).length;
 const bad=[T('round_settled','Alex'),T('custom','skins'),T('result_shared','skins&player=Alex'),T('round_settled',{tool:'skins',name:'Alex'})];
 ok('gcTrack drops unknown events and tools (nothing queued)',bad.every(x=>x===false)&&dl(h).length===before);
 ok('gcTrack queues exactly ["event", name, {tool}]',T('result_shared','stableford')===true&&JSON.stringify(dl(h).pop())==='["event","result_shared",{"tool":"stableford"}]');}
// the real flows on production: settle, share, copy, open a shared link, start your own; inspect every payload
const NAMES=['Alex','Blake','Casey','Drew','Mel','Sam','Jo','Al'];
const EVENTS=['round_settled','result_shared','shared_link_opened','start_own_from_viewer'];
const later=[];
for(const [n,tool,UI] of [['skins.html','skins','GCSkinsUI'],['stableford.html','stableford','GCStablefordUI']]){later.push((async()=>{
  const h=boot(path.join(SITE,n),{url:url('golfcalculators.com',n),beforeParse(w){w.CompressionStream=CompressionStream;w.DecompressionStream=DecompressionStream;w.navigator.share=d=>{w._shared=d;return Promise.resolve();};}});
  const U=h.w[UI];const ev=()=>dl(h).filter(a=>a[0]==='event');
  U.loadExample();ok(`${n}: Load example is not counted as a settled round`,!ev().some(a=>a[1]==='round_settled'));
  const s=U.state();s.players.forEach((p,i)=>p.name=NAMES[i]);s.scores[1]=s.scores[1].map(v=>v+1);U.show('result');U.show('hole');U.show('result');
  ok(`${n}: an own result counts once as round_settled {tool}`,ev().filter(a=>a[1]==='round_settled').length===1);
  await U.link();U.share();await new Promise(r=>setTimeout(r,10));
  Object.defineProperty(h.w.navigator,'clipboard',{value:{writeText:t=>{h.w._copied=t;return Promise.resolve();}},configurable:true});await U.copyLink();
  ok(`${n}: Share and Copy link each send result_shared {tool}`,ev().filter(a=>a[1]==='result_shared').length===2);
  const link=h.w._copied;const u=new h.w.URL(link);
  ok(`${n}: the share link has ?utm_source=share&utm_medium=link&utm_campaign=${tool} in the query, outside the #r= fragment`,u.search==='?utm_source=share&utm_medium=link&utm_campaign='+tool&&/^#r=1z?\./.test(u.hash)&&!/utm_/.test(u.hash),link);
  ok(`${n}: the shared text ends with that same link`,h.w._shared.text.split('\n').pop().endsWith(link));
  // open it as a friend
  const v=boot(path.join(SITE,n),{url:link,beforeParse(w){w.CompressionStream=CompressionStream;w.DecompressionStream=DecompressionStream;}});await v.w[UI].opened();
  ok(`${n}: the utm link still opens the shared result (viewer)`,v.w[UI].viewing()&&!v.$('scr-result').hidden);
  const vev=()=>dl(v).filter(a=>a[0]==='event');
  ok(`${n}: opening it sends shared_link_opened {tool}, and no round_settled`,vev().length===1&&vev()[0][1]==='shared_link_opened');
  const cfg=dl(v).find(a=>a[0]==='config');ok(`${n}: the viewer's page_location keeps the utm tags and drops #r=`,cfg[2].page_location===url('golfcalculators.com',n,'?utm_source=share&utm_medium=link&utm_campaign='+tool));
  v.$('gc-own').click();
  ok(`${n}: Start your own round sends start_own_from_viewer {tool} after the fragment is gone, and the utm tags go too`,vev().pop()[1]==='start_own_from_viewer'&&v.w.location.hash===''&&v.w.location.search==='');
  // every payload anywhere
  for(const [who,hh] of [['scorer',h],['viewer',v]]){const all=dl(hh),evs=all.filter(a=>a[0]==='event');
    ok(`${n} (${who}): every event is one of the four, with exactly {tool:"${tool}"}`,evs.length>0&&evs.every(a=>a.length===3&&EVENTS.includes(a[1])&&JSON.stringify(a[2])===JSON.stringify({tool})),JSON.stringify(evs));
    const blob=JSON.stringify(all);
    ok(`${n} (${who}): no names, scores, amounts or #r= data in anything sent to GA`,!NAMES.some(x=>blob.includes(x))&&!/\$|\d+\.\d\d|#r=|1z\.|"(scores|players|pl|stake|amount|hcp)"/.test(blob.replace(/"gtm\.[^"]*"|"js",\{\}|\d{4}-\d\d-\d\dT[^"]*/g,'')),blob.slice(0,300));}
})());}
{const pv=fs.readFileSync(path.join(SITE,'privacy.html'),'utf8');const m=pv.match(/<p id="usage-events">([^<]*)<\/p>/);
 ok('/privacy: one line on the anonymous events (settled, shared, opened, start own; only the calculator; no names, scores or amounts)',!!m&&/round is settled/.test(m[1])&&/result is shared/.test(m[1])&&/shared result is opened/.test(m[1])&&/starts their own round/.test(m[1])&&/never names, scores or amounts/.test(m[1]));
 ok('/privacy: no longer says only "some pages" use Google Analytics',!/Some pages on golfcalculators\.com use Google Analytics/.test(pv));}
Promise.all(later).catch(e=>ok('flow: '+e.message,false)).then(()=>{process.exitCode=report('ga-gate')?1:0;});
