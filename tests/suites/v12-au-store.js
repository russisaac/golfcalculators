// v12 scope addition (PO, Russ 28 Nov 2026): Amazon AU tag golfcalc-22. Every gear item has an amazon.com.au search link
// (tag=golfcalc-22) beside its amazon.com one (tag=golfcalc-20). Visitors whose navigator.language is en-AU or whose Intl
// time zone is Australia/* get the AU link; everyone else the US one. An item with no AU link falls back to US.
// affiliate_click gains exactly one parameter, store: "au" or "us". Same rel="sponsored nofollow noopener". Nothing stored.
// Footer and /privacy name both stores.
const {JSDOM}=require('jsdom');
const {SITE,boot,ok,report,path,fs}=require('../lib/harness');
const rd=n=>fs.readFileSync(path.join(SITE,n),'utf8');
if(!/golfcalc-22/.test(rd('affiliates.json'))){console.log('SKIP  no AU store on this branch');process.exit(0);}
const aff=JSON.parse(rd('affiliates.json'));
const pages=fs.readdirSync(SITE).filter(n=>n.endsWith('.html')).sort();
const TOOLS={'skins.html':'skins','stableford.html':'stableford','daily-handicap.html':'daily-handicap','handicap-calculator.html':'handicap','scramble-handicap-calculator.html':'scramble'};
if(fs.existsSync(path.join(SITE,'nassau-calculator.html'))){TOOLS['match-play-handicap-calculator.html']='matchplay';TOOLS['nassau-calculator.html']='nassau';} // v13
function locale(w,lang,tz){Object.defineProperty(w.navigator,'language',{value:lang,configurable:true});const I=w.Intl;w.Intl=Object.assign(Object.create(I),{DateTimeFormat:function(){return {resolvedOptions:()=>({timeZone:tz})};}});}
const make=(n,lang,tz,html)=>{let file=path.join(SITE,n);if(html){file=path.join(require('os').tmpdir(),'v12au-'+n);fs.writeFileSync(file,html);}
  return boot(file,{url:'https://golfcalculators.com/'+n.replace('.html',''),beforeParse(w){locale(w,lang,tz);}});};
const evs=h=>[...(h.w.dataLayer||[])].map(a=>[...a]).filter(a=>a[0]==='event');
// ---- affiliates.json ----
for(const it of aff.items){const us=new URL(it.url.us),au=new URL(it.url.au);
  ok(`affiliates.json ${it.id}: au = https://www.amazon.com.au search link with tag=golfcalc-22; us kept (www.amazon.com, golfcalc-20)`,au.protocol==='https:'&&au.hostname==='www.amazon.com.au'&&au.searchParams.get('tag')==='golfcalc-22'&&us.hostname==='www.amazon.com'&&us.searchParams.get('tag')==='golfcalc-20',it.url.au);}
ok('affiliates.json: default region us, tags {us: golfcalc-20, au: golfcalc-22}',aff.region==='us'&&aff.tag==='golfcalc-20'&&JSON.stringify(aff.tags)==='{"us":"golfcalc-20","au":"golfcalc-22"}');
// ---- the selection rule (pure) ----
{const h=make('index.html','en-US','UTC'),S=h.w.GCGrow.storeFor;
 const T=[['en-AU','UTC','au'],['en-au','','au'],['EN-AU','Europe/London','au'],['en-US','Australia/Sydney','au'],['en-GB','Australia/Perth','au'],['zh-CN','Australia/Darwin','au'],['en-US','Australia/Lord_Howe','au'],
  ['en-US','America/New_York','us'],['en-GB','Europe/London','us'],['en-NZ','Pacific/Auckland','us'],['en','UTC','us'],['en-AU-x','UTC','us'],['en-US','Antarctica/Macquarie','us'],['en-US','AustraliaX/Foo','us'],['','','us'],[undefined,undefined,'us']];
 for(const [l,z,w] of T)ok(`store rule: language ${JSON.stringify(l)}, time zone ${JSON.stringify(z)} → ${w}`,S(l,z)===w);
 ok('store(): reads navigator.language and the Intl time zone (US visitor → us)',h.w.GCGrow.store()==='us');
 ok('store(): an en-AU browser → au; an Australia/Brisbane time zone with en-US → au',make('index.html','en-AU','UTC').w.GCGrow.store()==='au'&&make('index.html','en-US','Australia/Brisbane').w.GCGrow.store()==='au');}
// ---- gear on every calculator ----
for(const [n,tool] of Object.entries(TOOLS)){if(!fs.existsSync(path.join(SITE,n)))continue;
 for(const [who,lang,tz,store,host,tag] of [['AU by language','en-AU','UTC','au','www.amazon.com.au','golfcalc-22'],['AU by time zone','en-US','Australia/Sydney','au','www.amazon.com.au','golfcalc-22'],['US','en-GB','Europe/London','us','www.amazon.com','golfcalc-20']]){
  const h=make(n,lang,tz);h.w.GCGrow.gear(tool);const g=[...h.$('gc-gear').querySelectorAll('a')];
  ok(`${n} (${who}): ${aff.tools[tool].length} gear links to ${host} tag=${tag}, data-store ${store}, rel "sponsored nofollow noopener", new tab`,g.length===aff.tools[tool].length&&g.every(a=>{const u=new URL(a.href);return u.hostname===host&&u.searchParams.get('tag')===tag&&a.dataset.store===store&&a.getAttribute('rel')==='sponsored nofollow noopener'&&a.target==='_blank';}),g.map(a=>a.href).join(' '));
  g[0].addEventListener('click',e=>e.preventDefault());const before=evs(h).length;g[0].click();const last=evs(h).pop();
  // GA sends nothing off the production hostname, so the event goes through gcTrack on golfcalculators.com (boot url)
  ok(`${n} (${who}): a click sends affiliate_click {tool, item, store:"${store}"} and nothing else`,evs(h).length===before+1&&JSON.stringify(last)===JSON.stringify(['event','affiliate_click',{tool,item:aff.tools[tool][0],store}]),JSON.stringify(last));
  ok(`${n} (${who}): the store is never stored`,!/au|us/.test(Object.keys({...h.w.localStorage}).concat(Object.keys({...h.w.sessionStorage})).join())&&!JSON.stringify({...h.w.localStorage}).includes('amazon'));}}
// ---- fallback: an item without an AU link keeps its US link for AU visitors ----
{const fx=JSON.parse(rd('affiliates.json'));delete fx.items[0].url.au;
 const html=rd('skins.html').replace(/(<script type="application\/json" data-src="\/affiliates\.json">)[\s\S]*?(<\/script>)/,(m,a,b)=>a+JSON.stringify(fx)+b);
 const h=make('skins.html','en-AU','Australia/Sydney',html);h.w.GCGrow.gear('skins');const g=[...h.$('gc-gear').querySelectorAll('a')],one=g.find(a=>a.dataset.aff===fx.items[0].id);
 ok('fallback (fixture): an AU visitor sees the US link (store us) for an item with no AU url, AU for the rest',!!one&&new URL(one.href).hostname==='www.amazon.com'&&one.dataset.store==='us'&&g.filter(a=>a!==one).every(a=>a.dataset.store==='au'));
 const bad=JSON.parse(rd('affiliates.json'));bad.items.forEach(i=>i.url.au='javascript:alert(1)');
 const h2=make('skins.html','en-AU','UTC',rd('skins.html').replace(/(<script type="application\/json" data-src="\/affiliates\.json">)[\s\S]*?(<\/script>)/,(m,a,b)=>a+JSON.stringify(bad)+b));h2.w.GCGrow.gear('skins');
 ok('a non-https AU url is never used (falls back to the US link)',[...h2.$('gc-gear').querySelectorAll('a')].every(a=>/^https:\/\/www\.amazon\.com\//.test(a.href)&&a.dataset.store==='us'));}
// ---- gcTrack: store is required and whitelisted ----
{const h=make('index.html','en-US','UTC'),T=h.w.gcTrack;const n0=evs(h).length;
 const refused=[T('affiliate_click','skins','rangefinder'),T('affiliate_click','skins','rangefinder','uk'),T('affiliate_click','skins','rangefinder','AU'),T('affiliate_click','skins','rangefinder','golfer@example.com'),T('result_shared','skins','au')&&JSON.stringify(evs(h).pop()).includes('store')];
 ok('gcTrack: affiliate_click needs store "au" or "us"; any other store is refused; other events never carry a store',refused.every(x=>x===false)&&evs(h).length===n0+1,JSON.stringify(refused));
 T('affiliate_click','skins','rangefinder','au');ok('gcTrack: affiliate_click {tool, item, store} only',JSON.stringify(evs(h).pop())==='["event","affiliate_click",{"tool":"skins","item":"rangefinder","store":"au"}]');}
// ---- footer + privacy ----
for(const n of pages)ok(`${n}: footer Associate note names Amazon.com.au and Amazon.com`,/As an Amazon Associate we earn from qualifying purchases \(Amazon\.com\.au and Amazon\.com\)\./.test(new JSDOM(rd(n)).window.document.querySelector('footer').textContent));
{const pv=new JSDOM(rd('privacy.html')).window.document.querySelector('main').textContent.replace(/\s+/g,' ');
 ok('/privacy: both stores, how the store is chosen (language en-AU or an Australian time zone), nothing stored, and that the store is counted',/Amazon\.com\.au if your browser’s language is English \(Australia\) or its time zone is in Australia, and to Amazon\.com otherwise/.test(pv)&&/nothing is stored/.test(pv)&&/which store \(Amazon\.com\.au or Amazon\.com\)/.test(pv)&&/As an Amazon Associate \(Amazon\.com\.au and Amazon\.com\)/.test(pv));}
process.exitCode=report('v12-au-store')?1:0;
