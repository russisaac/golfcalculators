// share-link-skins (PR B): result links that reopen a read-only Skins result (share-link-design.md + the PO's 12 Nov
// additions, as in PR A): the same gc-share component (inlined verbatim), "Shared result" banner, amber error card,
// no storage, no history call while #r= is in the URL, Start your own round clears it first. Also the shared viewer
// layout for BOTH tools: Start your own round is the primary button directly under the result (first screen at
// 375x812, checked in the browser checks), Share result and Copy link are secondary links under it.
const {SITE,boot,ok,report,path,fs}=require('../lib/harness');const zlib=require('zlib');
const file=path.join(SITE,'skins.html'),sfFile=path.join(SITE,'stableford.html');const src=fs.readFileSync(file,'utf8'),sfSrc=fs.readFileSync(sfFile,'utf8');
if(!/data-src="\/gc-share\.js"/.test(src)){console.log('SKIP  no share links on this Skins page');process.exit(0);}
const URL='https://golfcalculators.com/skins',KEY='gc_skins_v2',LEGACY='golfcalculators_skins_v2';
const zipOn=w=>{w.CompressionStream=CompressionStream;w.DecompressionStream=DecompressionStream;};
const open=(o={},f=file)=>boot(f,Object.assign({url:URL},o,{beforeParse:w=>{if(o.zip!==false)zipOn(w);if(o.before)o.before(w);}}));
const txt=el=>el?el.textContent.replace(/\s+/g,' ').trim():'';
const b64u=b=>Buffer.from(b).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const linkOf=(obj,z=true)=>URL+'#r='+(z?'1z.'+b64u(zlib.deflateRawSync(Buffer.from(JSON.stringify(obj)))):'1.'+b64u(Buffer.from(JSON.stringify(obj))));
const mut=(name,a,b)=>{const s=src.replace(a,b);if(s===src)return null;const t=path.join(require('os').tmpdir(),'sls-'+name+'.html');fs.writeFileSync(t,s);return t;};
const H0=open(),E=H0.w.GCSkins,GS=H0.w.GCShare;
const sum=st=>{const r=E.compute(st);return JSON.stringify([r.balances,r.skins,r.payments,r.leftover,r.playoffWinner,r.needsPlayoff,r.played,r.total,r.playing,r.ledger.map(e=>[e.hole,e.winner,e.tied,e.strokes])]);};
const tasks=[];const later=f=>tasks.push(f);

// ---- one component for both tools ----
const share=fs.readFileSync(path.join(SITE,'gc-share.js'),'utf8');
ok('gc-share.js inlined verbatim in Skins AND Stableford (byte-identical to /gc-share.js)',[file,sfFile].every(f=>{const h=boot(f,{url:'https://golfcalculators.com/'});return (h.d.querySelector('script[data-src="/gc-share.js"]')||{}).textContent===share;}));
const block=s=>(s.match(/  \/\* gc-share viewer:[\s\S]*?\/\* \/gc-share viewer \*\/\n/)||[''])[0];
ok('viewer CSS block identical in both pages (banner, amber error card, actions, .gc-own-only)',block(src).length>200&&block(src)===block(sfSrc));
const banner=s=>(s.match(/<div class="gc-card sk-pad gc-shared"[^\n]*<\/div>\n<div class="gc-shared-wait" aria-hidden="true"><\/div>/)||[''])[0].replace(/(gc-shared-h1">)[^<]*/,'$1');
ok('banner markup identical in both pages (only the error card\'s sr-only H1 names the tool)',banner(src).length>100&&banner(src)===banner(sfSrc)&&/gc-shared-h1">Golf skins calculator</.test(src));
const acts=s=>(s.match(/<div class="gc-view-actions" id="view-actions">.*?<\/div><\/div>/)||[''])[0];
ok('viewer actions identical in both pages: Start your own round (primary), then Share result and Copy link (secondary links)',acts(src)===acts(sfSrc)&&/gc-btn-primary gc-btn-block" id="gc-own">Start your own round<\/button><div class="gc-view-links"><button type="button" class="gc-btn gc-btn-ghost" id="gc-reshare">Share result<\/button><button type="button" class="gc-btn gc-btn-ghost" id="gc-copy">Copy link</.test(acts(src)));
ok('…pre-rendered directly under the result (#hero) on both pages',[src,sfSrc].every(s=>/<div class="gc-hero" id="hero"><\/div>\n  <div class="gc-view-actions" id="view-actions">/.test(s)));
ok('a head script marks #r= pages before first paint; GA page_location stripped (same as Stableford)',/<script>if \(\/\^#r=\/\.test\(location\.hash\)\) document\.documentElement\.classList\.add\('gc-view', 'gc-wait'\)/.test(src)&&/gtag\('config', 'G-DH32H3GWKE', gaStrip\(\)\)/.test(src));

// ---- round trip: 300 random rounds per tag ----
const rnd=(()=>{let s=4242;return n=>{s=(s*1103515245+12345)%2147483648;return s%n;};})();
function randomState(){const st=E.defaultState();const n=2+rnd(7);
  st.players=[...Array(n)].map((_,i)=>({name:['Alex','','Blake-Jo','Ngọc Anh','Zoë 😀','Casey'][rnd(6)],hcp:rnd(6)===0?-(1+rnd(9)):rnd(55),hcp9:rnd(2)?null:rnd(6)===0?-(1+rnd(5)):rnd(28)}));
  st.stake=['5','2.50','$10','0.5','20'][rnd(5)];st.holes=['18','front','back'][rnd(3)];st.scoring=['full','offlow','gross'][rnd(3)];st.allowance=50+5*rnd(11);st.carry=!!rnd(2);
  st.endRule=rnd(2)?'playoff':'nobody';st.playoff=rnd(3)===0?rnd(n):null;st.par=st.par.map(()=>3+rnd(3));
  const si=[...Array(18).keys()].map(x=>x+1);for(let i=17;i>0;i--){const j=rnd(i+1);[si[i],si[j]]=[si[j],si[i]];}st.si=si;if(rnd(8)===0)st.si[3]=st.si[4];
  const rg=E.holeRange(st.holes),upto=rnd(4)===0?rg[0]+rnd(9):rg[1];
  for(let h=rg[0];h<=rg[1];h++){if(h>upto)continue;st.scores[h]=st.players.map(()=>rnd(14)===0?null:1+rnd(15));}
  return st;}
let fails=[],count=0;
const rt=async plain=>{const W=open({zip:!plain}).w;for(let k=0;k<300;k++){const st=randomState();const pay=W.GCSkins.toPayload(st);const tag=await W.GCShare.encode(pay,plain);
  const back=W.GCSkins.fromPayload(await W.GCShare.decode(tag));count++;
  if(!back||sum(back)!==sum(st)||!tag.startsWith(plain?'1.':'1z.'))fails.push([k,plain,!back?'null':JSON.stringify(st).slice(0,300)]);}};
later(async()=>{await rt(false);await rt(true);ok('round trip: 600 random rounds (300 per tag; 2–8 players, 18/front/back, full/off-the-low/gross, allowance 50–100, carry on/off, playoff decided or not, plus 18- and 9-hole DHs, part-played, duplicate SI): same compute()',fails.length===0&&count===600,JSON.stringify(fails.slice(0,2)));});

// ---- lengths and share text ----
const LONG8=['Bartholomew-Fitzgerald','Maximiliana Oyelaran','Christopher-Montague','Anastasiya Wolfensohn','Wilhelmina Castellanos','Fitzwilliam Abernathy','Gwendolyn Featherstone','Montgomery Ashworth-Lee'];
const long8=()=>{const st=E.exampleState();st.players=LONG8.map((n,i)=>({name:n,hcp:i*3,hcp9:null}));for(let x=1;x<=18;x++)st.scores[x]=st.players.map((_,i)=>3+((x*7+i*3)%5));return st;};
later(async()=>{const W=open().w;const ex=URL+'#r='+await W.GCShare.encode(E.toPayload(E.exampleState()));const l8=URL+'#r='+await W.GCShare.encode(E.toPayload(long8()));
  ok(`length: the example link is ${ex.length} chars (under 300)`,ex.length<=300,ex.length);
  ok(`length: 8 long names is ${l8.length} chars (design 442, limit 486)`,l8.length<=486,l8.length);
  const GSM7=/^[\n\r @£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜ§¿a-zäöñüà|^€{}\[\]~\\]*$/;
  const t=E.shareText(long8(),E.compute(long8()),l8);ok(`8 long names: share text is GSM-7, ends with the link, no balance line: ${t.length} chars`,GSM7.test(t)&&t.endsWith('Settled at '+l8)&&!/ skins?\)/.test(t),t);
});

// ---- viewer ----
const mine=JSON.stringify(Object.assign(E.defaultState(),{players:[{name:'Me',hcp:9,hcp9:null},{name:'You',hcp:3,hcp9:null}],scores:{1:[4,5]},screen:'hole',hole:2}));
later(async()=>{const ex=E.exampleState(),link=linkOf(E.toPayload(ex)),reads=[];
  const h=open({url:link,storage:{[KEY]:mine,[LEGACY]:'{"names":["Old"]}'},before:w=>{const gi=w.Storage.prototype.getItem;w.Storage.prototype.getItem=function(k){reads.push(k);return gi.call(this,k);};}});
  await h.w.GCSkinsUI.opened();const U=h.w.GCSkinsUI,cl=h.d.documentElement.classList,cs=el=>h.w.getComputedStyle(el).display;
  ok('a 1z. link opens the read-only Skins result: settle-up hero, totals and ledger, no setup',U.viewing()&&!h.$('scr-result').hidden&&h.$('scr-setup').hidden&&/Alex pays Drew \$75\.00/.test(txt(h.$('hero')))&&h.d.querySelectorAll('#ledger li').length===19);
  ok('banner: "Shared result" / "Read-only, as entered by the scorer." (no sharer name), role=status',txt(h.$('gc-shared-t'))==='Shared result'&&txt(h.$('gc-shared-p'))==='Read-only, as entered by the scorer.'&&h.$('gc-shared').getAttribute('role')==='status'&&cs(h.$('gc-shared'))==='block'&&cl.contains('gc-view')&&!cl.contains('gc-wait'));
  ok('Start your own round sits directly under the result (next element after #hero), primary; Share result and Copy link are secondary links',h.$('hero').nextElementSibling===h.$('view-actions')&&cs(h.$('view-actions'))==='grid'&&/gc-btn-primary/.test(h.$('gc-own').className)&&/gc-btn-ghost/.test(h.$('gc-reshare').className)&&/gc-btn-ghost/.test(h.$('gc-copy').className));
  ok('Edit scores, New round, the primary Share button, the playoff picker and "saved on this device" are hidden',['own-actions','share-row','playoff'].every(id=>cs(h.$(id))==='none')&&[...h.d.querySelectorAll('#scr-result .gc-own-only')].every(e=>cs(e)==='none'));
  ok('your saved round (and the legacy key) were never read while opening the link',!reads.includes(KEY)&&!reads.includes(LEGACY),reads.join());
  let shared=null;h.w.navigator.share=o=>{shared=o;return Promise.resolve();};h.$('gc-reshare').click();await new Promise(r=>setTimeout(r,5));
  ok('Share result (secondary) re-shares the same link, unchanged, as the last line',!!shared&&shared.text.split('\n').pop()==='Settled at '+link&&shared.url===undefined,shared&&shared.text);
  let copied=null;Object.defineProperty(h.w.navigator,'clipboard',{value:{writeText:t=>{copied=t;return Promise.resolve();}},configurable:true});h.$('gc-copy').click();await new Promise(r=>setTimeout(r,5));
  ok('Copy link copies exactly the link',copied===link,copied);
  ok('localStorage byte-identical after opening, sharing and copying',h.w.localStorage.getItem(KEY)===mine&&h.w.localStorage.getItem(LEGACY)==='{"names":["Old"]}'&&h.w.localStorage.length===2);
  const re=open({url:link,storage:{[KEY]:mine}});await re.w.GCSkinsUI.opened();ok('reload (same URL) stays in viewer mode',re.w.GCSkinsUI.viewing()&&!re.$('scr-result').hidden);
  h.$('gc-own').click();
  ok('Start your own round: your own saved round is back (setup, "Me"), fragment gone, focus on the H1',!U.viewing()&&!h.$('scr-setup').hidden&&h.$('pn0').value==='Me'&&h.w.location.hash===''&&h.d.activeElement===h.$('setup-h')&&!cl.contains('gc-view'));
  ok('…the banner and viewer actions are gone and your own buttons are back',cs(h.$('gc-shared'))==='none'&&cs(h.$('view-actions'))==='none'&&(h.w.GCSkinsUI.show('result'),cs(h.$('own-actions'))!=='none'&&cs(h.$('share-row'))!=='none'));
  ok('…your saved round is unchanged apart from the screen',JSON.parse(h.w.localStorage.getItem(KEY)).players[0].name==='Me'&&JSON.parse(h.w.localStorage.getItem(KEY)).scores[1][1]===5);
  const h2=open({storage:{[KEY]:mine}});h2.w.location.hash='#r='+link.split('#r=')[1];h2.w.dispatchEvent(new h2.w.HashChangeEvent('hashchange'));await h2.w.GCSkinsUI.opened();
  ok('a link opened later in the same tab (hashchange) enters viewer mode',h2.w.GCSkinsUI.viewing()&&h2.w.localStorage.getItem(KEY)===mine);
  h2.w.location.hash='';h2.w.dispatchEvent(new h2.w.HashChangeEvent('hashchange'));
  ok('hashchange to no #r= leaves viewer mode and shows your setup',!h2.w.GCSkinsUI.viewing()&&!h2.$('scr-setup').hidden&&h2.$('pn0').value==='Me');
  const p=open({url:linkOf(E.toPayload(ex),false),zip:false});await p.w.GCSkinsUI.opened();ok('a "1." link opens without CompressionStream',p.w.GCSkinsUI.viewing());
  const pe=open({zip:false});pe.w.GCSkinsUI.loadExample();const l2=await pe.w.GCSkinsUI.link();ok('no CompressionStream: the page writes a "1." link',/#r=1\.[A-Za-z0-9_-]+$/.test(l2.url));
  const nb=open({url:link,zip:false});await nb.w.GCSkinsUI.opened();
  ok('a 1z. link without DecompressionStream: "This link needs a newer browser", Start your own round under the banner, no links',txt(nb.$('gc-shared-t'))==='This link needs a newer browser'&&nb.$('gc-shared').nextElementSibling===nb.$('view-actions')&&nb.w.getComputedStyle(nb.$('gc-own')).display!=='none'&&nb.w.getComputedStyle(nb.d.querySelector('.gc-view-links')).display==='none');
  // 9-hole round with 9-hole DHs, off the low, 90 %
  const st=E.exampleState();st.holes='back';st.scoring='offlow';st.allowance=90;st.players=st.players.map((x,i)=>Object.assign({},x,{hcp9:[1,3,-2,6][i]}));
  const hb=open({url:linkOf(E.toPayload(st))});await hb.w.GCSkinsUI.opened();
  ok('back 9, off the low, 90 %, own 9-hole DHs (one plus): same result as the app',sum(hb.w.GCSkinsUI.state())===sum(st)&&hb.d.querySelectorAll('#ledger li').length>=9);
  // playoff decided / not decided
  const po=E.exampleState();po.endRule='playoff';po.playoff=1;const hp=open({url:linkOf(E.toPayload(po))});await hp.w.GCSkinsUI.opened();
  ok('a decided playoff shows the winner',/Blake won the playoff for 3 carried skins/.test(txt(hp.$('hero'))));
  po.playoff=null;const hn=open({url:linkOf(E.toPayload(po))});await hn.w.GCSkinsUI.opened();
  ok('an undecided playoff: read-only wording, no picker, Share result disabled',/The playoff winner has not been entered yet\./.test(txt(hn.$('hero')))&&hn.w.getComputedStyle(hn.$('playoff')).display==='none'&&hn.$('gc-reshare').disabled);
  // 8 long names: compact payment lines in the viewer (4+ payments) so Start your own round stays on the first screen
  const h8=open({url:linkOf(E.toPayload(long8()))});await h8.w.GCSkinsUI.opened();
  ok('8 long names (4+ payments): the viewer hero uses compact payment lines (.sk-many; fold measured in the browser checks)',h8.$('hero').classList.contains('sk-many')&&h8.d.querySelectorAll('#hero .sk-pay').length>=4&&/\.gc-view \.sk-many \.sk-pay\{display:block;font-size:var\(--fs-md\)/.test(src));
  // XSS + bidi
  const x=E.exampleState();x.players[0].name='<img src=x onerror="window.pwned=1">';x.players[1].name='\u202Eevil\u2066';
  const hx=open({url:linkOf(E.toPayload(x))});await hx.w.GCSkinsUI.opened();
  ok('names from a link render as text only (cut to 24), bidi controls removed',!hx.d.querySelector('#hero img,#totals img,#ledger img,#gc-shared img')&&!hx.w.pwned&&txt(hx.$('totals')).includes('<img src=x onerror="wind')&&/evil/.test(txt(hx.$('totals')))&&!/[\u202E\u2066]/.test(hx.d.body.textContent));
});

// ---- hostile links ----
const okPay=E.toPayload(E.exampleState());const mod=f=>{const o=JSON.parse(JSON.stringify(okPay));f(o);return o;};const fr=o=>linkOf(o).split('#')[1];
const hostile=[['bad base64','#r=1z.@@@@'],['unknown tag','#r=2z.'+linkOf(okPay).split('1z.')[1]],['no tag','#r='+b64u(Buffer.from(JSON.stringify(okPay)))],
  ['truncated 1z.',linkOf(okPay).slice(0,-30).split('#')[1]],['over 4,096 chars','#r=1.'+'A'.repeat(4200)],
  ['deflate bomb (1 MB)','#r=1z.'+b64u(zlib.deflateRawSync(Buffer.from('{"v":1,"t":"sk"'+' '.repeat(1<<20)+'}')))],
  ['invalid UTF-8','#r=1.'+b64u(Buffer.from([0x7b,0xff,0xfe,0x7d]))],['JSON array','#r=1.'+b64u(Buffer.from('[1,2]'))],
  ['wrong version',fr(mod(o=>o.v=2))],['wrong tool (Stableford link)',fr(mod(o=>o.t='sf'))],
  ['stake 0',fr(mod(o=>o.$='0'))],['stake "$5"',fr(mod(o=>o.$='$5'))],['stake a number',fr(mod(o=>o.$=5))],['allowance 40',fr(mod(o=>o.a=40))],['allowance 95.5',fr(mod(o=>o.a=95.5))],
  ['round "9"',fr(mod(o=>o.r='9'))],['scoring "x"',fr(mod(o=>o.m='x'))],['carry 2',fr(mod(o=>o.c=2))],['end rule "x"',fr(mod(o=>o.e='x'))],
  ['playoff index 4 (4 players)',fr(mod(o=>o.o=4))],['playoff "1"',fr(mod(o=>o.o='1'))],
  ['par 7',fr(mod(o=>o.par='7'+o.par.slice(1)))],['SI 19 ("j")',fr(mod(o=>o.si='j'+o.si.slice(1)))],['17 holes of SI',fr(mod(o=>o.si=o.si.slice(1)))],
  ['handicap 60',fr(mod(o=>o.pl[0][1]=60))],['handicap 12.5',fr(mod(o=>o.pl[0][1]=12.5))],['9-hole DH "7"',fr(mod(o=>o.pl[0][2]='7'))],
  ['1 player',fr(mod(o=>o.pl=o.pl.slice(0,1)))],['9 players',fr(mod(o=>{while(o.pl.length<9)o.pl.push(o.pl[0]);}))],
  ['score "p" (no pickups in Skins)',fr(mod(o=>o.pl[0][3]='p'+o.pl[0][3].slice(1)))],['score "z"',fr(mod(o=>o.pl[0][3]='z'+o.pl[0][3].slice(1)))],
  ['player row of 3',fr(mod(o=>o.pl[0]=o.pl[0].slice(0,3)))],['name not a string',fr(mod(o=>o.pl[0][0]={toString:1}))]];
later(async()=>{const bad=[];for(const [label,frag] of hostile){const h=open({url:URL+(frag.startsWith('#')?frag:'#'+frag),storage:{[KEY]:mine}});await h.w.GCSkinsUI.opened();
    const good=!h.w.GCSkinsUI.viewing()&&txt(h.$('gc-shared-t'))==='This result link can\u2019t be opened'&&['setup','hole','result'].every(s=>h.$('scr-'+s).hidden)&&!h.d.documentElement.classList.contains('gc-wait')
      &&h.w.localStorage.getItem(KEY)===mine&&h.$('hero').innerHTML===''&&h.$('gc-shared').nextElementSibling===h.$('view-actions')&&h.w.getComputedStyle(h.$('gc-own')).display!=='none'
      &&[...h.d.querySelectorAll('h1')].filter(e=>h.w.getComputedStyle(e).display!=='none'&&!e.closest('[hidden]')).length===1;
    if(!good)bad.push(label);}
  ok(`${hostile.length} hostile links (encoding, size, deflate bomb, UTF-8, wrong version/tool, stake/allowance/round/scoring/carry/end rule/playoff, par/SI, handicaps, player count, scores, row shape, types): amber error card, Start your own round under it, nothing half-rendered, storage untouched, one h1`,bad.length===0,bad.join(', '));
  const pj='{"v":1,"t":"sk","__proto__":{"polluted":1},"constructor":{"prototype":{"p2":1}},'+JSON.stringify(okPay).slice(1);
  const h=open({url:URL+'#r=1.'+b64u(Buffer.from(pj))});await h.w.GCSkinsUI.opened();
  ok('"__proto__" and "constructor" keys are ignored (no prototype pollution; the link still opens)',h.w.GCSkinsUI.viewing()&&h.w.Object.prototype.polluted===undefined&&h.w.Object.prototype.p2===undefined);
  const extra=open({url:linkOf(Object.assign({},okPay,{zz:'<script>',screen:'setup'}))});await extra.w.GCSkinsUI.opened();
  ok('unknown keys are ignored (state rebuilt field by field)',extra.w.GCSkinsUI.viewing()&&extra.w.GCSkinsUI.state().zz===undefined&&!extra.$('scr-result').hidden);
  const dup=open({url:linkOf(mod(o=>o.si='33'+o.si.slice(2)))});await dup.w.GCSkinsUI.opened();
  ok('a duplicate SI still opens, with the app\'s usual warning',dup.w.GCSkinsUI.viewing()&&!dup.$('si-note').hidden,txt(dup.$('si-note')));
});

// ---- history in viewer mode (GA closed in code, as on Stableford) ----
const spy=log=>w=>{for(const fn of ['pushState','replaceState']){const o=w.History.prototype[fn];w.History.prototype[fn]=function(...a){const before=w.location.hash,view=w.document.documentElement.classList.contains('gc-view');
  const r=o.apply(this,a);log.push({fn,before,after:w.location.hash,view});return r;};}};
async function histFlow(f){const log=[],link=linkOf(okPay),u=URL+'?dh=7&holes=9&p=0#r='+link.split('#r=')[1];
  const h=open({url:u,storage:{[KEY]:mine},before:spy(log)},f);await h.w.GCSkinsUI.opened();
  h.w.navigator.share=()=>Promise.resolve();h.$('gc-reshare').click();Object.defineProperty(h.w.navigator,'clipboard',{value:{writeText:()=>Promise.resolve()},configurable:true});h.$('gc-copy').click();
  await new Promise(r=>setTimeout(r,5));const beforeOwn=log.length;h.$('gc-own').click();const own=log.slice(beforeOwn);
  const e=open({url:URL+'#r=1z.AAAA',storage:{[KEY]:mine},before:spy(log)},f);await e.w.GCSkinsUI.opened();const be=log.length;e.$('gc-own').click();const ownErr=log.slice(be);
  return {log,beforeOwn,own,ownErr,dhRan:JSON.parse(h.w.localStorage.getItem(KEY)).players[0].hcp9!=null};}
later(async()=>{const r=await histFlow();
  ok('viewer mode: no history call while the link is open (opening with ?dh=&holes=&p=, Share result, Copy link); the DH return does not run',r.beforeOwn===0&&!r.dhRan,JSON.stringify(r.log.slice(0,r.beforeOwn)));
  ok('pushState never called; every history call leaves location.hash without r=',r.log.every(c=>c.fn!=='pushState'&&!/r=/.test(c.after))&&r.log.length>=2,JSON.stringify(r.log));
  ok('Start your own round clears the fragment first (one replaceState while the viewer still shows), result and error card',[r.own,r.ownErr].every(o=>o.length===1&&o[0].view&&/^#r=/.test(o[0].before)&&o[0].after===''),JSON.stringify([r.own,r.ownErr]));
  const f1=mut('ownorder',"GCShare.clearHash(); leaveShared(true);","leaveShared(true); GCShare.clearHash();");const m1=await histFlow(f1);
  ok('mutation: clearing the fragment after leaving the viewer is caught',f1&&!m1.own.every(c=>c.view));
  const f2=mut('dhguard',"  if (RAW != null) return; // a shared result link is open: leave your round alone\n","");const m2=await histFlow(f2);
  ok('mutation: letting the DH return run on a #r= page is caught',f2&&(m2.log.some(c=>/r=/.test(c.after))||m2.beforeOwn>0));
  let f=mut('save',"function save() { if (VIEW || RAW != null) return; try","function save() { try");const hs=open({url:linkOf(okPay),storage:{[KEY]:mine}},f);await hs.w.GCSkinsUI.opened();
  ok('mutation: dropping the viewer storage guard is caught (saved round overwritten)',f&&hs.w.localStorage.getItem(KEY)!==mine);
  f=mut('stake',"!/^\\d{1,7}(\\.\\d{1,6})?$/.test(st$) || ","");const hm=f&&open({url:linkOf(mod(o=>o.$='1e400'))},f);if(hm)await hm.w.GCSkinsUI.opened();
  ok('mutation: skipping the stake check is caught (a "1e400" stake opens)',f&&hm.w.GCSkinsUI.viewing());
});

(async()=>{for(const t of tasks){try{await t();}catch(e){ok('suite step threw: '+e.message,false,e.stack&&e.stack.split('\n')[1]);}}process.exit(report('share-link-skins')?1:0);})();
