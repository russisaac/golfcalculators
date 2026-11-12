// share-link-stableford (PR A): result links that reopen a read-only Stableford result, per
// /workspace/golfcalc/prs/share-link-design.md and the PO's 12 Nov additions: gc-share component (inlined verbatim),
// #r= fragment, "1z." (deflate-raw) and "1." (plain) tags, whitelist decoding, viewer mode that never touches your
// saved round, "Shared result" banner (no sharer name), ASCII share text (GSM-7), lengths guarded at +10 %.
const {SITE,boot,ok,report,path,fs}=require('../lib/harness');const zlib=require('zlib');
const file=path.join(SITE,'stableford.html');const src=fs.readFileSync(file,'utf8');
if(!/data-src="\/gc-share\.js"/.test(src)){console.log('SKIP  no share links on this branch');process.exit(0);}
const URL='https://golfcalculators.com/stableford',KEY='gc_stableford_v1',CKEY='gc_courses_v1';
const zipOn=w=>{w.CompressionStream=CompressionStream;w.DecompressionStream=DecompressionStream;};
const open=(o={},f=file)=>boot(f,Object.assign({url:URL},o,{beforeParse:w=>{if(o.zip!==false)zipOn(w);if(o.before)o.before(w);}}));
const txt=el=>el?el.textContent.replace(/\s+/g,' ').trim():'';
const b64u=b=>Buffer.from(b).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const linkOf=(obj,z=true)=>URL+'#r='+(z?'1z.'+b64u(zlib.deflateRawSync(Buffer.from(JSON.stringify(obj)))):'1.'+b64u(Buffer.from(JSON.stringify(obj))));
const H0=open(),G=H0.w.GCStableford,GS=H0.w.GCShare;
const sum=(st)=>{const r=G.compute(st);return JSON.stringify({b:r.board.map(x=>[x.i,x.total,x.place,!!x.joint,x.cb,x.thru]),p:r.played,c:r.complete,o:r.order,h:r.rows.map(x=>r.order.map(h=>[x.byHole[h].strokes,x.byHole[h].pts]))});};
const tasks=[];const later=(f)=>tasks.push(f);

// ---- component ----
ok('gc-share.js inlined verbatim (byte-identical to /gc-share.js)',(H0.d.querySelector('script[data-src="/gc-share.js"]')||{}).textContent===fs.readFileSync(path.join(SITE,'gc-share.js'),'utf8'));
ok('the banner is pre-rendered in the HTML (no layout shift), hidden unless a #r= link is open',/<div class="gc-card sk-pad gc-shared" id="gc-shared" role="status"><h1 class="sr-only gc-shared-h1">Stableford calculator<\/h1><h2 id="gc-shared-t">Shared result<\/h2><p id="gc-shared-p">Read-only, as entered by the scorer\.<\/p><\/div>/.test(src)&&H0.w.getComputedStyle(H0.$('gc-shared')).display==='none');
ok('a head script marks #r= pages before first paint (setup never flashes)',/<script>if \(\/\^#r=\/\.test\(location\.hash\)\) document\.documentElement\.classList\.add\('gc-view', 'gc-wait'\)/.test(src));
ok('fromHash: only "#r=<payload>"',GS.fromHash('#r=1z.abc')==='1z.abc'&&GS.fromHash('#x=1')===null&&GS.fromHash('#r=1.a&x=2')===null&&GS.fromHash('')===null);
ok('cleanText: NFC, strips C0/C1 and bidi controls, trims, cuts to N code points',GS.cleanText('  Zoe\u0301\u202E\u0007 ',24)==='Zo\u00e9'&&GS.cleanText('\u2066A\u2069B\u200F',24)==='AB'&&GS.cleanText('😀'.repeat(30),24)==='😀'.repeat(24)&&GS.cleanText(42,24)==='');
ok('gsm(): · – — − → ’ … × become ASCII',GS.gsm('a · b – c — d − e → f ’ g … h ×')==='a - b - c - d - e -> f \' g ... h x');

// ---- round trip: 300 random rounds, both tags ----
const rnd=(()=>{let s=12345;return n=>{s=(s*1103515245+12345)%2147483648;return s%n;};})();
function randomState(k){const st=G.defaultState();const nine=rnd(5)===0;st.course=G.defaultCourse(nine?9:18);const H=st.course.holes;
  st.course.name=['','Royal Test','Long Reef – Blue','Course 😀'][rnd(4)];st.course.par=st.course.par.map(()=>3+rnd(4));
  const si=[...Array(H).keys()].map(x=>x+1);for(let i=H-1;i>0;i--){const j=rnd(i+1);[si[i],si[j]]=[si[j],si[i]];}st.course.si=si;
  st.round=nine?'18':['18','front','back'][rnd(3)];st.tenth=st.round==='18'&&!nine&&rnd(3)===0;
  const n=1+rnd(4);st.players=[...Array(n)].map((_,i)=>({name:['Mel','Sam','','Jo-Ann','Ngọc Anh'][rnd(5)],hcp:rnd(6)===0?-(1+rnd(5)):rnd(54)+(rnd(8)===0?0.5:0),hcp9:rnd(3)===0?rnd(28):null}));
  const upto=rnd(4)===0?rnd(H):H;
  for(let h=1;h<=H;h++){if(h>upto&&rnd(2))continue;st.scores[h]=st.players.map(()=>rnd(15)===0?'P':rnd(12)===0?null:1+rnd(11));}
  return st;}
let fails=[],count=0;
const rt=async(plain)=>{const W=open({zip:!plain}).w;for(let k=0;k<300;k++){const st=randomState(k);const pay=W.GCStableford.toPayload(st);const tag=await W.GCShare.encode(pay,plain);
  const back=W.GCStableford.fromPayload(await W.GCShare.decode(tag));count++;
  if(!back||sum(back)!==sum(st)||!tag.startsWith(plain?'1.':'1z.'))fails.push([k,plain,!back?'null':JSON.stringify(st).slice(0,400)]);}};
later(async()=>{await rt(false);await rt(true);ok(`round trip: 600 random rounds (300 per tag; 1–4 players, 18/front/back/10th tee/9-hole card, plus and .5 handicaps, pickups, part-played): decode(encode(state)) gives the same compute()`,fails.length===0&&count===600,JSON.stringify(fails.slice(0,3)));});

// ---- lengths (+10 % guard on the design's measured cases) ----
later(async()=>{const W=open().w,E=W.GCStableford;const ex=E.exampleState();const t=URL+'#r='+await W.GCShare.encode(E.toPayload(ex));
  ok(`length: the example link is ${t.length} chars (design 262, limit 288)`,t.length<=288,t.length);
  const lg=E.exampleState();lg.course.name='Royal Sydney Golf Club – Composite (Blu';['Bartholomew-Fitzgerald','Maximiliana Oyelaran','Christopher-Montague','Anastasiya Wolfensohn'].forEach((n,i)=>lg.players[i].name=n);
  const t2=URL+'#r='+await W.GCShare.encode(E.toPayload(lg));ok(`length: 4 long names + 40-char course is ${t2.length} chars (design 382, limit 420)`,t2.length<=420,t2.length);
  const sh=E.shareText(ex,E.compute(ex),t);const GSM7=/^[\n\r @£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜ§¿a-zäöñüà|^€{}\[\]~\\]*$/;
  ok(`example share text with the link is all GSM-7: ${sh.length} chars = ${Math.ceil(sh.length/153)} SMS (was 6 as UCS-2)`,GSM7.test(sh)&&sh.split('\n').pop()===t,sh.length);
  let bad=null;for(let k=0;k<200&&!bad;k++){const st=randomState(k);st.course.name=['','Royal Test','Long Reef – Blue'][k%3];st.players.forEach((p,i)=>p.name=['Mel','Sam','Jo-Ann','Al'][i]);const s=E.shareText(st,E.compute(st),t);if(!GSM7.test(s))bad=s;}
  ok('200 random rounds (ASCII names): share text always GSM-7, incl. "–" in a course name, countback ranges and 10th-tee wording',!bad,bad);
});

// ---- viewer ----
const mine=JSON.stringify(Object.assign(G.defaultState(),{players:[{name:'Me',hcp:9,hcp9:null}],course:Object.assign(G.defaultCourse(18),{name:'My Club'}),scores:{1:[4],2:[5]},screen:'hole',hole:3}));
const courses=JSON.stringify([{name:'My Club',holes:18,par:G.DEF_PAR,si:G.DEF_SI}]);
later(async()=>{const ex=G.exampleState();const link=linkOf(G.toPayload(ex));const reads=[];
  const h=open({url:link,storage:{[KEY]:mine,[CKEY]:courses},before:w=>{const gi=w.Storage.prototype.getItem;w.Storage.prototype.getItem=function(k){reads.push(k);return gi.call(this,k);};}});
  await h.w.GCStablefordUI.opened();const U=h.w.GCStablefordUI,cl=h.d.documentElement.classList;
  ok('a 1z. link opens the read-only result: podium and countback line, no setup',U.viewing()&&!h.$('scr-result').hidden&&h.$('scr-setup').hidden&&txt(h.$('cb-line'))==='Mel wins on countback: 20 v 18 on holes 10–18');
  ok('banner: "Shared result" / "Read-only, as entered by the scorer." (no sharer name), role=status, shown',txt(h.$('gc-shared-t'))==='Shared result'&&txt(h.$('gc-shared-p'))==='Read-only, as entered by the scorer.'&&h.$('gc-shared').getAttribute('role')==='status'&&h.w.getComputedStyle(h.$('gc-shared')).display==='block'&&cl.contains('gc-view')&&!cl.contains('gc-wait'));
  ok('Edit scores, New round and its note are hidden; Start your own round and Copy link are shown',['own-actions','new-note'].every(id=>h.w.getComputedStyle(h.$(id)).display==='none')&&h.w.getComputedStyle(h.$('view-actions')).display==='grid'&&txt(h.$('gc-own'))==='Start your own round'&&txt(h.$('gc-copy'))==='Copy link');
  ok('the per-hole why is there for every player',h.d.querySelectorAll('#why details').length===4);
  ok('your saved round was never read while opening the link',!reads.includes(KEY)&&!reads.includes(CKEY),reads.join());
  let shared=null;h.w.navigator.share=o=>{shared=o;return Promise.resolve();};h.$('btn-share').click();await new Promise(r=>setTimeout(r,5));
  ok('Share re-shares the same link, unchanged',!!shared&&shared.text.split('\n').pop()===link&&shared.text.split('\n')[0]==='Stableford - Example card - 18 holes',shared&&shared.text);
  let copied=null;Object.defineProperty(h.w.navigator,'clipboard',{value:{writeText:t=>{copied=t;return Promise.resolve();}},configurable:true});h.$('gc-copy').click();await new Promise(r=>setTimeout(r,5));
  ok('Copy link copies exactly the link',copied===link,copied);
  ok('localStorage byte-identical after opening, sharing and copying',h.w.localStorage.getItem(KEY)===mine&&h.w.localStorage.getItem(CKEY)===courses&&h.w.localStorage.length===2);
  const re=open({url:link,storage:{[KEY]:mine}});await re.w.GCStablefordUI.opened();ok('reload (same URL) stays in viewer mode',re.w.GCStablefordUI.viewing()&&!re.$('scr-result').hidden);
  h.$('gc-own').click();
  ok('Start your own round: your own saved round is back (setup, "Me", My Club), fragment gone, focus on the H1',!U.viewing()&&!h.$('scr-setup').hidden&&h.$('pn0').value==='Me'&&txt(h.$('course-name'))==='My Club'&&h.w.location.hash===''&&h.d.activeElement===h.$('setup-h')&&!cl.contains('gc-view'));
  ok('…and the banner and viewer buttons are gone',h.w.getComputedStyle(h.$('gc-shared')).display==='none'&&h.w.getComputedStyle(h.$('view-actions')).display==='none'&&h.w.getComputedStyle(h.$('own-actions')).display!=='none');
  ok('…your saved round is still byte-identical (only the screen is now setup)',JSON.parse(h.w.localStorage.getItem(KEY)).players[0].name==='Me'&&JSON.parse(h.w.localStorage.getItem(KEY)).scores[2][0]===5);
  // hashchange in, then out
  const h2=open({storage:{[KEY]:mine}});h2.w.location.hash='#r='+link.split('#r=')[1];h2.w.dispatchEvent(new h2.w.HashChangeEvent('hashchange'));await h2.w.GCStablefordUI.opened();
  ok('a link opened later in the same tab (hashchange) enters viewer mode',h2.w.GCStablefordUI.viewing()&&h2.w.localStorage.getItem(KEY)===mine);
  h2.w.location.hash='';h2.w.dispatchEvent(new h2.w.HashChangeEvent('hashchange'));
  ok('hashchange to no #r= leaves viewer mode and shows your setup',!h2.w.GCStablefordUI.viewing()&&!h2.$('scr-setup').hidden&&h2.$('pn0').value==='Me');
  // plain tag without compression support, and a 1z. link without decompression support
  const p=open({url:linkOf(G.toPayload(ex),false),zip:false});await p.w.GCStablefordUI.opened();ok('a "1." link opens without CompressionStream',p.w.GCStablefordUI.viewing());
  const pe=open({zip:false});pe.w.GCStablefordUI.loadExample();const l2=await pe.w.GCStablefordUI.link();ok('no CompressionStream: the page writes a "1." link',/#r=1\.[A-Za-z0-9_-]+$/.test(l2.url));
  const nb=open({url:link,zip:false});await nb.w.GCStablefordUI.opened();
  ok('a 1z. link on a browser without DecompressionStream: "This link needs a newer browser" + Start your own round',txt(nb.$('gc-shared-t'))==='This link needs a newer browser'&&nb.w.getComputedStyle(nb.$('gc-own')).display!=='none'&&nb.w.getComputedStyle(nb.$('gc-copy')).display==='none');
  // a part-played front 9 with a pickup and a plus handicap
  const st=G.defaultState();st.round='front';st.players=[{name:'Al',hcp:-2,hcp9:-1},{name:'Bo',hcp:20,hcp9:null}];st.scores={1:[4,'P'],2:[3,6],3:[5,5]};
  const hp=open({url:linkOf(G.toPayload(st))});await hp.w.GCStablefordUI.opened();
  ok('part-played front 9 with a pickup and a plus 9-hole DH: "thru 3", same points as the app',/thru 3/.test(txt(hp.$('hero')))&&sum(hp.w.GCStablefordUI.state())===sum(st)&&/Pickup · 0 pts/.test(txt(hp.$('why'))));
  // XSS + bidi in names, via a link
  const x=G.exampleState();x.players[0].name='<img src=x onerror="window.pwned=1">';x.players[1].name='\u202Eevil\u2066';x.course.name='<b>bold</b>';
  const hx=open({url:linkOf(G.toPayload(x))});await hx.w.GCStablefordUI.opened();
  ok('names from a link render as text only (no element injected anywhere; cut to 24 characters), bidi controls removed',!hx.d.querySelector('#hero img,#why img,#hero b,#gc-shared img')&&!hx.w.pwned&&txt(hx.$('hero')).includes('<img src=x onerror="wind')&&/evil/.test(txt(hx.$('hero')))&&!/[\u202E\u2066]/.test(hx.d.body.textContent));
});

// ---- hostile links: each lands on the error card, nothing rendered from the input ----
const okPay=G.toPayload(G.exampleState());const mod=f=>{const o=JSON.parse(JSON.stringify(okPay));f(o);return o;};
const hostile=[
  ['bad base64','#r=1z.@@@@'],['unknown tag','#r=2z.'+linkOf(okPay).split('1z.')[1]],['no tag','#r='+b64u(Buffer.from(JSON.stringify(okPay)))],
  ['truncated 1z.',linkOf(okPay).slice(0,-30).split('#')[1]],['over 4,096 chars','#r=1.'+'A'.repeat(4200)],
  ['deflate bomb (1 MB of spaces)','#r=1z.'+b64u(zlib.deflateRawSync(Buffer.from('{"v":1,"t":"sf"'+' '.repeat(1<<20)+'}')))],
  ['invalid UTF-8','#r=1.'+b64u(Buffer.from([0x7b,0xff,0xfe,0x7d]))],['JSON array','#r=1.'+b64u(Buffer.from('[1,2]'))],['not JSON','#r=1.'+b64u(Buffer.from('v=1'))],
  ['wrong version',linkOf(mod(o=>o.v=2)).split('#')[1]],['wrong tool (Skins link)',linkOf(mod(o=>o.t='sk')).split('#')[1]],
  ['par 7',linkOf(mod(o=>o.par='7'+o.par.slice(1))).split('#')[1]],['SI 0',linkOf(mod(o=>o.si='0'+o.si.slice(1))).split('#')[1]],
  ['17 holes of par',linkOf(mod(o=>o.par=o.par.slice(1))).split('#')[1]],['handicap 60',linkOf(mod(o=>o.pl[0][1]=60)).split('#')[1]],
  ['handicap 12.25',linkOf(mod(o=>o.pl[0][1]=12.25)).split('#')[1]],['handicap "12"',linkOf(mod(o=>o.pl[0][1]='12')).split('#')[1]],
  ['5 players',linkOf(mod(o=>o.pl.push(o.pl[0]))).split('#')[1]],['0 players',linkOf(mod(o=>o.pl=[])).split('#')[1]],
  ['score "z"',linkOf(mod(o=>o.pl[0][2]='z'+o.pl[0][2].slice(1))).split('#')[1]],['name not a string',linkOf(mod(o=>o.pl[0][0]={toString:1})).split('#')[1]],
  ['round "x"',linkOf(mod(o=>o.r='x')).split('#')[1]]];
later(async()=>{const bad=[];for(const [label,frag] of hostile){const h=open({url:URL+(frag.startsWith('#')?frag:'#'+frag),storage:{[KEY]:mine}});await h.w.GCStablefordUI.opened();
    const good=!h.w.GCStablefordUI.viewing()&&txt(h.$('gc-shared-t'))==='This result link can\u2019t be opened'&&txt(h.$('gc-shared-p'))==='It is incomplete or from a newer version of the calculator.'
      &&['setup','course','hole','result'].every(s=>h.$('scr-'+s).hidden)&&!h.d.documentElement.classList.contains('gc-wait')&&h.w.localStorage.getItem(KEY)===mine&&h.$('hero').innerHTML===''&&h.w.getComputedStyle(h.$('gc-own')).display!=='none'
      &&[...h.d.querySelectorAll('h1')].filter(e=>h.w.getComputedStyle(e).display!=='none'&&!e.closest('[hidden]')).length===1;
    if(!good)bad.push(label);}
  ok(`${hostile.length} hostile links (bad base64, unknown/no tag, truncated, >4,096, deflate bomb, bad UTF-8, non-object, wrong version/tool, out-of-range par/SI/handicap/players/scores, wrong types): error card, Start your own round, nothing half-rendered, storage untouched, exactly one h1 (sr-only)`,bad.length===0,bad.join(', '));
  // prototype pollution
  const pj='{"v":1,"t":"sf","__proto__":{"polluted":1},"constructor":{"prototype":{"p2":1}},'+JSON.stringify(okPay).slice(1);
  const h=open({url:URL+'#r=1.'+b64u(Buffer.from(pj))});await h.w.GCStablefordUI.opened();
  ok('"__proto__" and "constructor" keys are ignored (no prototype pollution; the link still opens)',h.w.GCStablefordUI.viewing()&&h.w.Object.prototype.polluted===undefined&&h.w.Object.prototype.p2===undefined&&h.w.GCStablefordUI.state().polluted===undefined);
  const extra=open({url:linkOf(Object.assign({},okPay,{zz:'<script>',screen:'setup'}))});await extra.w.GCStablefordUI.opened();
  ok('unknown keys are ignored (state is rebuilt field by field)',extra.w.GCStablefordUI.viewing()&&extra.w.GCStablefordUI.state().zz===undefined&&!extra.$('scr-result').hidden);
  const dup=open({url:linkOf(mod(o=>o.si='11'+o.si.slice(2)))});await dup.w.GCStablefordUI.opened();
  ok('a duplicate SI still opens, with the app\'s usual warning',dup.w.GCStablefordUI.viewing()&&!dup.$('si-note').hidden&&/SI 1/.test(txt(dup.$('si-note'))),txt(dup.$('si-note')));
});

// ---- privacy ----
ok('/privacy: the PO\'s sentence on shared result links',(()=>{const p=fs.readFileSync(path.join(SITE,'privacy.html'),'utf8');return p.includes('<p id="shared-links">Shared result links carry the names and scores inside the link itself; they are never sent to or stored by us and are stripped from analytics.</p>');})());

// ---- mutation checks ----
const mut=(name,a,b)=>{const s=src.replace(a,b);if(s===src)return null;const t=path.join(require('os').tmpdir(),'sl-'+name+'.html');fs.writeFileSync(t,s);return t;};
later(async()=>{const link=linkOf(G.toPayload(G.exampleState()));
  let f=mut('save',"function save() { if (VIEW || RAW != null) return; try","function save() { try");let h=open({url:link,storage:{[KEY]:mine}},f);await h.w.GCStablefordUI.opened();
  ok('mutation: dropping the viewer storage guard is caught (saved round overwritten)',f&&h.w.localStorage.getItem(KEY)!==mine);
  f=mut('bidi',"\\u200E\\u200F\\u202A-\\u202E\\u2066-\\u2069",'');const xs=G.exampleState();xs.players[1].name='\u202Eevil';h=open({url:linkOf(G.toPayload(xs))},f);await h.w.GCStablefordUI.opened();
  ok('mutation: keeping bidi controls in names is caught',f&&/\u202E/.test(h.d.body.textContent));
  f=mut('range',"hv < HMIN || hv > HMAX ||","");h=open({url:linkOf(mod(o=>o.pl[0][1]=60))},f);await h.w.GCStablefordUI.opened();
  ok('mutation: skipping the handicap range check is caught (a 60 link opens)',f&&h.w.GCStablefordUI.viewing());
});

(async()=>{for(const t of tasks){try{await t();}catch(e){ok('suite step threw: '+e.message,false,e.stack&&e.stack.split('\n')[1]);}}process.exit(report('share-link-stableford')?1:0);})();
