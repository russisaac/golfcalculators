// v11 P2 monetisation (priorities-v11 P1, PO 24 Nov): email signup + "Gear for this game" + the GA events they add.
// Proves: the "newsletter" Netlify form (footer on every page, card after a result on the four calculators) with a honeypot,
// POST only, labelled email field, unticked consent, inline errors (aria-describedby) and inline success with no navigation;
// the card shows only after an own, real result, at most once per session, never for 30 days after the x, never after a
// signup; email_signup / email_dismiss / affiliate_click / dh_calculate carry only {tool} (+ the item id) and no email,
// handicap or score ever reaches GA, a URL or storage; the gear block is built from affiliates.json, every link carries
// tag=golfcalc-20 and rel="sponsored nofollow noopener", labels are escaped, and with empty urls (fixture) it renders nothing.
const {JSDOM}=require('jsdom');const os=require('os');
const {SITE,boot,ok,report,path,fs}=require('../lib/harness');
const rd=n=>fs.readFileSync(path.join(SITE,n),'utf8');
if(!fs.existsSync(path.join(SITE,'gc-grow.js'))){console.log('SKIP  v11 monetisation not on this branch');process.exit(0);}
const pages=fs.readdirSync(SITE).filter(n=>n.endsWith('.html')).sort();
const TOOLS={'skins.html':'skins','stableford.html':'stableford','daily-handicap.html':'daily-handicap','handicap-calculator.html':'handicap'};
if(fs.existsSync(path.join(SITE,'scramble-handicap-calculator.html')))TOOLS['scramble-handicap-calculator.html']='scramble'; // v12
if(fs.existsSync(path.join(SITE,'nassau-calculator.html'))){TOOLS['match-play-handicap-calculator.html']='matchplay';TOOLS['nassau-calculator.html']='nassau';} // v13
const grow=rd('gc-grow.js'),affSrc=rd('affiliates.json'),aff=JSON.parse(affSrc);
const EMAIL='golfer.test+v11@example.com';
// ---- static markup ----
function formOk(f,tool){if(!f)return 'missing';
  const em=f.querySelector('input[name="email"]'),lab=em&&f.ownerDocument.querySelector(`label[for="${em.id}"]`),err=em&&f.ownerDocument.getElementById(em.getAttribute('aria-describedby')||'x'),hp=f.querySelector('input[name="bot-field"]'),c=f.querySelector('input[name="consent"]');
  const checks={name:f.getAttribute('name')==='newsletter',post:f.getAttribute('method')==='POST',netlify:f.getAttribute('data-netlify')==='true'&&f.getAttribute('netlify-honeypot')==='bot-field',
    formName:(f.querySelector('input[name="form-name"]')||{}).value==='newsletter',tool:(f.querySelector('input[name="tool"]')||{}).value===tool,
    honeypot:!!hp&&!!hp.closest('[hidden]')&&hp.getAttribute('tabindex')==='-1',email:!!em&&em.type==='email'&&em.getAttribute('autocomplete')==='email'&&!!lab&&!!err,
    consent:!!c&&c.type==='checkbox'&&!c.checked&&!c.hasAttribute('checked'),submit:!!f.querySelector('button[type="submit"]'),noGetAction:!/[?]/.test(f.getAttribute('action')||'')};
  const bad=Object.keys(checks).filter(k=>!checks[k]);return bad.length?bad.join(','):'';}
for(const n of pages){const d=new JSDOM(rd(n)).window.document,t=TOOLS[n]||'site';
  const r=formOk(d.querySelector('footer .gc-nl-foot form.gc-nl-form'),t);
  ok(`${n}: footer signup = Netlify form "newsletter", POST, honeypot, labelled type=email + autocomplete, unticked consent, error wired by aria-describedby`,r==='',r);
  ok(`${n}: footer says "As an Amazon Associate we earn from qualifying purchases (Amazon.com.au and Amazon.com)." (v12: both stores)`,/As an Amazon Associate we earn from qualifying purchases \(Amazon\.com\.au and Amazon\.com\)\./.test(d.querySelector('footer').textContent));
  const m=rd(n).match(/<script data-src="\/gc-grow\.js">([\s\S]*?)<\/script>/);ok(`${n}: gc-grow.js inlined byte-identical`,!!m&&m[1]===grow);
  ok(`${n}: no form can send the address in a URL (no GET newsletter form)`,[...d.querySelectorAll('form.gc-nl-form')].every(f=>f.getAttribute('method')==='POST'));
  if(TOOLS[n]){const c=d.getElementById('gc-nl-card');
    ok(`${n}: result card present but hidden on load, with a 44px x and the same form`,!!c&&c.hasAttribute('hidden')&&!!c.querySelector('button.gc-nl-x[aria-label]')&&formOk(c.querySelector('form'),t)==='');
    ok(`${n}: card copy: "Get new golf game calculators first" + "Wolf, Las Vegas and Nines. One email a month, max." (v13)`,!!c&&/Get new golf game calculators first/.test(c.textContent)&&/Wolf, Las Vegas and Nines\. One email a month, max\./.test(c.textContent));
    const g=d.getElementById('gc-gear');ok(`${n}: gear slot empty and hidden on load (nothing between inputs and result, no CLS)`,!!g&&g.hasAttribute('hidden')&&!g.children.length);
    const all=[...d.body.querySelectorAll('*')],res=d.getElementById(n==='daily-handicap.html'?'result':n==='handicap-calculator.html'?'hero':'hero');
    ok(`${n}: card and gear come after the result in the page`,all.indexOf(c)>all.indexOf(res)&&all.indexOf(g)>all.indexOf(res));
    const j=rd(n).match(/<script type="application\/json" data-src="\/affiliates\.json">([\s\S]*?)<\/script>/);ok(`${n}: affiliates.json inlined byte-identical`,!!j&&j[1]===affSrc);}
}
ok('gc.css: x button and consent row are at least 44px',/\.gc-nl-x\{[^}]*width:44px;height:44px/.test(rd('gc.css'))&&/\.gc-nl-consent\{[^}]*min-height:44px/.test(rd('gc.css')));
// ---- affiliates.json ----
const ids=aff.items.map(i=>i.id);
ok('affiliates.json: ids are lowercase words (the only thing sent with affiliate_click)',ids.every(i=>/^[a-z][a-z0-9-]{0,31}$/.test(i)));
for(const it of aff.items){const u=it.url[aff.region];const U=new URL(u);
  ok(`affiliates.json ${it.id}: https://www.amazon.com link carrying tag=golfcalc-20`,U.protocol==='https:'&&U.hostname==='www.amazon.com'&&U.searchParams.get('tag')==='golfcalc-20',u);}
for(const t of Object.values(TOOLS))ok(`affiliates.json: ${t} lists 2-3 known items`,(aff.tools[t]||[]).length>=2&&aff.tools[t].length<=3&&aff.tools[t].every(i=>ids.includes(i)));
// ---- behaviour ----
const dl=h=>[...(h.w.dataLayer||[])].map(a=>[...a]);const evs=h=>dl(h).filter(a=>a[0]==='event');
function locale(w,lang='en-US',tz='UTC'){Object.defineProperty(w.navigator,'language',{value:lang,configurable:true});const I=w.Intl;w.Intl=Object.assign(Object.create(I),{DateTimeFormat:function(){return {resolvedOptions:()=>({timeZone:tz})};}});}
function make(n,{session,storage,fetchOk=true,html,lang,tz}={}){const calls=[];let file=path.join(SITE,n);
  if(html){file=path.join(os.tmpdir(),'v11-fixture-'+n);fs.writeFileSync(file,html);}
  const h=boot(file,{url:'https://golfcalculators.com/'+n.replace('.html',''),storage,beforeParse(w){
    locale(w,lang,tz);if(session)for(const k in session)w.sessionStorage.setItem(k,session[k]);
    w.fetch=(u,o)=>{calls.push({u,o});return Promise.resolve({ok:fetchOk,status:fetchOk?200:404});};w.CompressionStream=CompressionStream;w.DecompressionStream=DecompressionStream;}});
  h.calls=calls;return h;}
const tick=()=>new Promise(r=>setTimeout(r,5));
function realResult(h,n){
  if(n==='skins.html'||n==='stableford.html'){const U=h.w[n==='skins.html'?'GCSkinsUI':'GCStablefordUI'];U.loadExample();const s=U.state();s.scores[1]=s.scores[1].map(v=>v+1);U.show('result');}
  else if(n==='daily-handicap.html'){h.set('ga','12.4');h.set('slope','131');h.set('scratch','70.5');h.set('par','72');}
  else if(n==='scramble-handicap-calculator.html'){['14','8','22','30'].forEach((v,i)=>h.set('ph'+i,v));}
  else if(n==='match-play-handicap-calculator.html'){['14','8'].forEach((v,i)=>h.set('ph'+i,v));} // v13
  else if(n==='nassau-calculator.html'){h.$('btn-start').click();h.$('btn-next').click();h.$('btn-settle').click();} // v13: one hole scored, then Settle now
  else{for(const sc of ['92','95','90']){h.$('score').value=sc;h.$('cr').value='71.3';h.$('sl').value='129';h.$('btn-add').click();}}}
function example(h,n){if(n==='daily-handicap.html')h.$('dh-example').click();else if(n==='handicap-calculator.html'||n==='scramble-handicap-calculator.html'||n==='match-play-handicap-calculator.html'||n==='nassau-calculator.html')h.$('btn-example').click();else h.w[n==='skins.html'?'GCSkinsUI':'GCStablefordUI'].loadExample();}
const visible=e=>!!e&&!e.hidden&&!e.closest('[hidden]');
(async()=>{
for(const [n,tool] of Object.entries(TOOLS)){
  {const h=make(n);const c=h.$('gc-nl-card');
   ok(`${n}: no card before a result`,!visible(c));
   example(h,n);
   ok(`${n}: the example shows the gear but not the email card (the session's one card waits for a real result)`,c.hidden&&h.$('gc-gear').querySelectorAll('a').length>=2);
   realResult(h,n);
   ok(`${n}: a real own result shows the card once, and marks the session`,!c.hidden&&h.w.sessionStorage.getItem('gc_nl_shown_v1')==='1');
   const g=[...h.$('gc-gear').querySelectorAll('a')];
   ok(`${n}: gear = ${aff.tools[tool].length} links, each tag=golfcalc-20, target=_blank, rel exactly "sponsored nofollow noopener"`,g.length===aff.tools[tool].length&&g.every(a=>new URL(a.href).searchParams.get('tag')==='golfcalc-20'&&a.target==='_blank'&&a.getAttribute('rel')==='sponsored nofollow noopener'),g.map(a=>a.getAttribute('rel')).join('|'));
   ok(`${n}: gear heading "Gear for this game" and the disclosure line`,/Gear for this game/.test(h.$('gc-gear').textContent)&&/We may earn a commission from links on this page\./.test(h.$('gc-gear').textContent));
   const before=evs(h).length;g[0].addEventListener('click',e=>e.preventDefault());g[0].click();
   const last=evs(h).pop();
   ok(`${n}: a gear click sends affiliate_click {tool:"${tool}", item:"${aff.tools[tool][0]}", store:"us"} and nothing else (US visitor)`,evs(h).length===before+1&&JSON.stringify(last)===JSON.stringify(['event','affiliate_click',{tool,item:aff.tools[tool][0],store:'us'}]),JSON.stringify(last));
   // submit flows on the card
   const f=c.querySelector('form'),em=f.querySelector('input[type=email]'),cb=f.querySelector('input[name=consent]'),err=h.d.getElementById(em.getAttribute('aria-describedby'));
   em.value='not-an-email';f.dispatchEvent(new h.w.Event('submit',{cancelable:true,bubbles:true}));
   ok(`${n}: a bad address shows an inline error (aria-invalid, described) and sends nothing`,/email address/.test(err.textContent)&&em.getAttribute('aria-invalid')==='true'&&h.calls.length===0);
   em.value=EMAIL;f.dispatchEvent(new h.w.Event('submit',{cancelable:true,bubbles:true}));
   ok(`${n}: consent unticked: inline error, nothing sent`,/Tick the box/.test(err.textContent)&&h.calls.length===0);
   cb.checked=true;const href=h.w.location.href;f.dispatchEvent(new h.w.Event('submit',{cancelable:true,bubbles:true}));await tick();
   const call=h.calls[0]||{o:{}};const body=new URLSearchParams(call.o.body||'');
   ok(`${n}: one POST to / (urlencoded) with form-name=newsletter, the email, consent=yes, tool=${tool}, empty honeypot`,h.calls.length===1&&call.u==='/'&&call.o.method==='POST'&&/x-www-form-urlencoded/.test(call.o.headers['Content-Type'])&&body.get('form-name')==='newsletter'&&body.get('email')===EMAIL&&body.get('consent')==='yes'&&body.get('tool')===tool&&body.get('bot-field')==='',call.o.body);
   ok(`${n}: inline "You're in" (role=status), form hidden, no navigation`,f.hidden&&/You’re in/.test((c.querySelector('.gc-nl-ok')||{}).textContent||'')&&c.querySelector('.gc-nl-ok').getAttribute('role')==='status'&&h.w.location.href===href);
   ok(`${n}: email_signup {tool:"${tool}"} sent once`,evs(h).filter(a=>a[1]==='email_signup').length===1&&JSON.stringify(evs(h).find(a=>a[1]==='email_signup')[2])===JSON.stringify({tool}));
   const store=JSON.stringify({...h.w.localStorage})+JSON.stringify({...h.w.sessionStorage});
   ok(`${n}: the address is nowhere but the POST body: not in GA, the URL, localStorage or sessionStorage`,!JSON.stringify(dl(h)).includes('example.com')&&!h.w.location.href.includes('example')&&!store.includes('example.com')&&!store.includes('golfer'));
   ok(`${n}: dataLayer events are only known names with {tool} (+item for affiliate_click; v12 scramble_calculate: {mode} only)`,evs(h).every(a=>a.length===3&&(a[1]==='scramble_calculate'?Object.keys(a[2]).join()==='mode'&&['usga','ambrose','custom'].includes(a[2].mode):a[1]==='matchplay_calculate'?Object.keys(a[2]).join()==='format'&&['singles','fourball-match','foursomes','fourball-stroke'].includes(a[2].format):a[1]==='nassau_settle'?Object.keys(a[2]).join()==='format'&&['1v1','2v2'].includes(a[2].format):typeof a[2].tool==='string'&&Object.keys(a[2]).every(k=>k==='tool'||((k==='item'||k==='store')&&a[1]==='affiliate_click')))));}
  {const h=make(n,{session:{gc_nl_shown_v1:'1'}});realResult(h,n);ok(`${n}: already shown this session: no card`,h.$('gc-nl-card').hidden);}
  {const h=make(n,{storage:{gc_nl_done_v1:'1'}});realResult(h,n);ok(`${n}: already signed up: no card`,h.$('gc-nl-card').hidden);}
  {const h=make(n);realResult(h,n);h.$('gc-nl-card').querySelector('.gc-nl-x').click();
   const d=+h.w.localStorage.getItem('gc_nl_dismissed_v1');
   ok(`${n}: x hides the card, stores only the date, sends email_dismiss {tool}`,h.$('gc-nl-card').hidden&&Math.abs(Date.now()-d)<5000&&JSON.stringify(evs(h).pop())===JSON.stringify(['event','email_dismiss',{tool}]));}
  {const h=make(n,{storage:{gc_nl_dismissed_v1:String(Date.now()-29*864e5)}});realResult(h,n);ok(`${n}: dismissed 29 days ago: still no card`,h.$('gc-nl-card').hidden);}
  {const h=make(n,{storage:{gc_nl_dismissed_v1:String(Date.now()-31*864e5)}});realResult(h,n);ok(`${n}: dismissed 31 days ago: the card can show again`,!h.$('gc-nl-card').hidden);}
}
// footer form on a non-calculator page, honeypot, failed post
{const h=make('index.html');const f=h.d.querySelector('footer form');f.querySelector('input[type=email]').value=EMAIL;f.querySelector('input[name=consent]').checked=true;
 f.querySelector('input[name="bot-field"]').value='spam';f.dispatchEvent(new h.w.Event('submit',{cancelable:true,bubbles:true}));await tick();
 ok('honeypot filled: looks done, sends nothing, no event',h.calls.length===0&&!evs(h).some(a=>a[1]==='email_signup'));}
{const h=make('privacy.html',{fetchOk:false});const f=h.d.querySelector('footer form');f.querySelector('input[type=email]').value=EMAIL;f.querySelector('input[name=consent]').checked=true;
 f.dispatchEvent(new h.w.Event('submit',{cancelable:true,bubbles:true}));await tick();
 ok('a failed post: inline error, form kept, no email_signup',h.calls.length===1&&!f.hidden&&/didn’t go through/.test(f.querySelector('.gc-nl-err').textContent)&&!evs(h).some(a=>a[1]==='email_signup'));}
{const h=make('index.html');const f=h.d.querySelector('footer form');f.querySelector('input[type=email]').value=EMAIL;f.querySelector('input[name=consent]').checked=true;
 f.dispatchEvent(new h.w.Event('submit',{cancelable:true,bubbles:true}));await tick();
 ok('footer signup on home: tool=site, email_signup {tool:"site"}',new URLSearchParams(h.calls[0].o.body).get('tool')==='site'&&JSON.stringify(evs(h).pop())===JSON.stringify(['event','email_signup',{tool:'site'}]));}
// empty urls (fixture): the block renders nothing at all; hostile labels are text
{const empty=JSON.parse(affSrc);empty.items.forEach(i=>i.url={us:''});
 for(const n of Object.keys(TOOLS)){const html=rd(n).replace(/(<script type="application\/json" data-src="\/affiliates\.json">)[\s\S]*?(<\/script>)/,(m,a,b)=>a+JSON.stringify(empty)+b);
  const h=make(n,{html});realResult(h,n);const g=h.$('gc-gear');
  ok(`${n} with empty urls (fixture): gear renders nothing (no heading, no links, no disclosure, still hidden)`,g.hidden&&g.childNodes.length===0&&!/commission/.test(h.d.querySelector('main').textContent));}
 const evil=JSON.parse(affSrc);evil.items[0].label='<img src=x onerror="window.pwned=1">';evil.items[1].url={us:'javascript:alert(1)'};
 const html=rd('skins.html').replace(/(<script type="application\/json" data-src="\/affiliates\.json">)[\s\S]*?(<\/script>)/,(m,a,b)=>a+JSON.stringify(evil)+b);
 const h=make('skins.html',{html});realResult(h,'skins.html');const g=h.$('gc-gear');
 ok('gear labels are text, never HTML; non-https urls are dropped',!g.querySelector('img')&&/<img src=x/.test(g.textContent)&&![...g.querySelectorAll('a')].some(a=>/^javascript/i.test(a.getAttribute('href')))&&!h.w.pwned);}
// gcTrack: the new events, nothing personal gets through
{const h=make('index.html');const T=h.w.gcTrack,n0=dl(h).length;
 const bad=[T('email_signup',EMAIL),T('email_signup','site',EMAIL)&&JSON.stringify(dl(h).pop()).includes('example'),T('affiliate_click','skins','https://evil.example/?e='+EMAIL),T('affiliate_click','skins'),T('affiliate_click','skins','Rangefinder'),T('dh_calculate','14')];
 ok('gcTrack drops an email as the tool, ignores extra args except a valid affiliate item, drops bad items and unknown tools',bad.every(x=>x===false)&&dl(h).filter(a=>a[0]==='event').every(a=>Object.keys(a[2]).join()==='tool'));}
// dh_calculate: once per visit, real input only, no numbers
{const h=make('daily-handicap.html');h.$('dh-example').click();
 ok('dh_calculate: the Load example is not counted',!evs(h).some(a=>a[1]==='dh_calculate'));
 h.set('ga','12.4');h.set('slope','131');h.set('scratch','70.5');h.set('par','72');h.set('par','71');h.set('gender','women');
 const e=evs(h).filter(a=>a[1]==='dh_calculate');
 ok('dh_calculate: sent once per visit for a real Daily Handicap, exactly {tool:"daily-handicap"}',e.length===1&&JSON.stringify(e[0])==='["event","dh_calculate",{"tool":"daily-handicap"}]',JSON.stringify(e));
 const blob=JSON.stringify(dl(h)).replace(/"gtm\.[^"]*"|\d{4}-\d\d-\d\dT[^"]*/g,'');
 ok('dh_calculate: no handicap, ratings, par or result anywhere in the dataLayer',!/12\.4|131|70\.5|"(ga|slope|scratch|par|daily|gender)"/.test(blob)&&!blob.includes('"'+h.$('dailyOut').textContent+'"'),blob.slice(0,200));
}
{const h=boot(path.join(SITE,'daily-handicap.html'),{url:'https://6afd0000--golfcalculators.netlify.app/daily-handicap'});h.set('ga','12.4');h.set('slope','131');h.set('scratch','70.5');h.set('par','72');
 ok('dh_calculate: nothing at all off the production hostnames (drafts, previews)',!(h.w.dataLayer||[]).length);}
// GA on every page, the same way (production hostname loads the one tag; DH and privacy included)
for(const n of pages){const h=boot(path.join(SITE,n),{url:'https://golfcalculators.com/'+(n==='index.html'?'':n.replace('.html',''))});
  const tags=[...h.d.querySelectorAll('script[src]')].filter(s=>s.src==='https://www.googletagmanager.com/gtag/js?id=G-DH32H3GWKE');
  ok(`${n}: loads gc-ga.js on golfcalculators.com (one gtag for G-DH32H3GWKE, config queued) through the shared inline copy`,tags.length===1&&dl(h).some(a=>a[0]==='config')&&rd(n).includes('<script data-src="/gc-ga.js">'));}
// privacy
{const pv=new JSDOM(rd('privacy.html')).window.document.querySelector('main').textContent.replace(/\s+/g,' ');
 ok('/privacy: newsletter collects email only, stored by Netlify Forms, how to unsubscribe (reply or email the contact address)',/collect your email address only/.test(pv)&&/Netlify Forms/.test(pv)&&/To unsubscribe, reply to any email from us, or email the address under Contact/.test(pv));
 ok('/privacy: affiliate disclosure, Amazon Associate line naming both stores (v12)',/We may earn a commission from links/.test(pv)&&/As an Amazon Associate \(Amazon\.com\.au and Amazon\.com\) we earn from qualifying purchases\./.test(pv));
 const ue=(rd('privacy.html').match(/<p id="usage-events">([^<]*)<\/p>/)||[])[1]||'';
 ok('/privacy event list names the new events (Daily Handicap worked out, email signup/dismiss, gear click) and says never an email address',/Daily Handicap is worked out/.test(ue)&&/signs up for or dismisses the email updates/.test(ue)&&/gear link is clicked/.test(ue)&&/never an email address/.test(ue));}
process.exitCode=report('v11-monetisation')?1:0;
})();
