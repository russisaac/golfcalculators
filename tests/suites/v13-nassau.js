// v13 P2 (PO spec priorities-v13.md, approved by Russ 28 Nov 2026): /nassau-calculator.
// A Nassau is a house game, not in the Rules of Golf; the conventions (2-down auto press on the nines, chained presses,
// no press on the last hole of a nine, at most one automatic press per bet) are the PO's, dated 28 Nov 2026.
// Worked examples E1-E3 are the PO's verification set; net allowances reuse Appendix C (four-ball 90%, singles 100%).
const {JSDOM}=require('jsdom');
const {SITE,boot,ok,report,path,fs}=require('../lib/harness');
const F=path.join(SITE,'nassau-calculator.html');
if(!fs.existsSync(F)){console.log('SKIP  no /nassau-calculator on this branch');process.exit(0);}
const URLP='https://golfcalculators.com/nassau-calculator';
const rd=n=>fs.readFileSync(path.join(SITE,n),'utf8');const src=rd('nassau-calculator.html');
const norm=s=>String(s||'').replace(/\s+/g,' ').trim();const words=s=>norm(s).split(' ').filter(Boolean).length;
const zip=w=>{w.CompressionStream=CompressionStream;w.DecompressionStream=DecompressionStream;};
const mk=(url=URLP,opt={})=>boot(F,{url,beforeParse(w){zip(w);if(opt.confirm!==undefined)w.confirm=()=>opt.confirm;},storage:opt.storage});
const tick=(ms=30)=>new Promise(r=>setTimeout(r,ms));
const radio=(h,name,v)=>{const r=h.d.querySelector(`input[name=${name}][value="${v}"]`);r.checked=true;h.fire(r,'change');};
const txt=e=>e?norm(e.innerHTML.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ')):'';
const SI=[...Array(18)].map((_,i)=>i+1);
const sc=pat=>{const o={};pat.split('').forEach((c,i)=>o[i+1]=c==='A'?[4,5]:c==='B'?[5,4]:[4,4]);return o;}; // winner 4, loser 5, half 4-4
const g=o=>Object.assign({f:'1v1',stake:5,game:'match',net:false,strokes:[0,0],si:SI,auto:false,overall:false,minLeft:1,manual:[],scores:{}},o);
const bets=r=>r.bets.map(b=>b.id+'('+b.start+'-'+b.end+')'+b.diff).join(' ');
(async()=>{
const h0=mk(),N=h0.w.GCNassau,d0=new JSDOM(src).window.document;
const run=o=>N.nassau(g(o));
// ---- 1. PO worked examples (engine) ----
{const r=run({scores:sc('AAAABABAB'+'ABBABABAB')});
 ok('E1 $5 1v1 gross, no presses: front A 3 up, back B 1 up, overall A 2 up',bets(r)==='F(1-9)3 B(10-18)-1 O(1-18)2',bets(r));
 ok('E1 balances A +$5, B −$5; payment: B pays A $5',r.bal.join()==='5,-5'&&JSON.stringify(r.payments)==='[{"from":1,"to":0,"amount":5}]');}
{const r=run({auto:true,scores:sc('AAAABBBAA'+'BBHHHHHHH')});
 ok('E2 presses: PF from 3, PF2 from 5, PF3 from 7 (chained), PB from 12; overall not pressed by default',bets(r)==='F(1-9)3 B(10-18)-2 O(1-18)1 Fp(3-9)1 Fpp(5-9)-1 Fppp(7-9)1 Bp(12-18)0',bets(r));
 ok('E2 press start events: after hole 2 → 3, after 4 → 5, after 6 → 7, after 11 → 12',r.events.map(e=>e.hole+'>'+e.start).join()==='2>3,4>5,6>7,11>12');
 ok('E2 totals A +$10, B −$10; B pays A $10',r.bal.join()==='10,-10'&&JSON.stringify(r.payments)==='[{"from":1,"to":0,"amount":10}]');}
{const r=run({auto:true,overall:true,scores:sc('AAAABBBAA'+'BBHHHHHHH')});
 ok('E2 note: with overall auto-press on, a press also starts on hole 3 and runs to 18',r.bets.some(b=>b.id==='Op'&&b.start===3&&b.end===18));}
{const o={};const F9=[[4,5],[5,5],[4,5],[5,4],[4,5],[5,4],[4,5],[5,4],[4,5]],B9=[[5,4],[5,4],[4,5],[5,4],[5,4],[4,5],[5,4],[4,5],[5,4]];
 F9.concat(B9).forEach((p,i)=>o[i+1]=[p[0],p[0]+2,p[1],p[1]+2]);
 const r=run({f:'2v2',stake:10,strokes:[0,0,0,0],scores:o});
 ok('E3 $10 2v2 better ball: front Blue 2 up, back Red 3 up, overall Red 1 up',bets(r)==='F(1-9)2 B(10-18)-3 O(1-18)-1',bets(r));
 ok('E3 side result Red +$10, split: Alex −$5, Ben −$5, Chris +$5, Dana +$5',r.sideBal.join()==='-10,10'&&r.bal.join()==='-5,-5,5,5');
 ok('E3 fewest payments: Alex pays Chris $5, Ben pays Dana $5',JSON.stringify(r.payments)==='[{"from":0,"to":2,"amount":5},{"from":1,"to":3,"amount":5}]');}
// ---- 2. more sourced/convention tests ----
{const o={1:[5,5,5,5]};const gross=run({f:'2v2',strokes:[0,0,0,0],scores:o}),net=run({f:'2v2',net:true,strokes:N.strokes([4,4,12,12],90),scores:o});
 ok('2v2 net: strokes off the low player at 90% (4/12/6/8 → 0/7/2/4)',N.strokes([4,12,6,8],90).join()==='0,7,2,4');
 ok('2v2 net: a stroke on SI 1 changes hole 1 (4/4/12/12 → 0/0/7/7: gross halved → net won by side 2)',gross.holes[0].win===-1&&net.holes[0].win===1&&net.holes[0].side.join()==='5,4'&&net.bets[0].diff===-1,JSON.stringify(net.holes[0]));}
{const r=run({scores:sc('AB'.repeat(4)+'H'+'AB'.repeat(4)+'H')});ok('a halved Nassau: every bet all square, no payments',r.bets.every(b=>b.diff===0)&&!r.payments.length&&r.bal.every(v=>v===0));}
{const r=run({manual:[6],scores:sc('BHHHHAAHH'+'H'.repeat(9))});
 ok('manual press from hole 6 (trailing side presses): runs 6–9 and is won 2 up by A',r.bets.some(b=>b.id==='M6'&&b.start===6&&b.end===9&&b.diff===2&&b.manual));
 ok('manual press money: front A 1 up +$5, press +$5, back halved, overall A 1 up +$5 → B pays A $15',r.bal.join()==='15,-15');}
{const r=run({auto:true,scores:sc('HHHHHHHAA'+'H'.repeat(9))});ok('no press when the trigger is on the last hole of a nine (2 down after 9)',!r.bets.some(b=>b.id==='Fp'));}
{const r=run({auto:true,scores:sc('HHHHHHAAH'+'H'.repeat(9))});ok('2 down after hole 8: a one-hole press on 9 (min holes left 1)',r.bets.some(b=>b.id==='Fp'&&b.start===9&&b.end===9));
 const r2=run({auto:true,minLeft:2,scores:sc('HHHHHHAAH'+'H'.repeat(9))});ok('min holes left 2: no press on hole 9',!r2.bets.some(b=>b.id==='Fp'));}
{const r=run({auto:true,scores:sc('AAAAAAAAA'+'H'.repeat(9))});ok('going 3, 4, 5 down starts no second press from the same bet (one auto press per bet; the press itself chains)',r.bets.filter(b=>b.parent==='F').length===1);}
{const r=run({game:'agg',scores:{1:[3,6],2:[5,4]}});ok('aggregate: bets count strokes (front A by 2 after 4+... = 8 v 10)',r.bets[0].diff===2&&r.bets[2].diff===2);}
{const r=run({stake:5.05,f:'2v2',strokes:[0,0,0,0],scores:(()=>{const o={};for(let i=1;i<=18;i++)o[i]=[4,4,5,5];return o;})()});
 ok('2v2 odd cents: $5.05 stake, $15.15 a side splits $7.58 + $7.57 (odd cent to the first partner); balances add to $0',r.bal.join()==='7.58,7.57,-7.58,-7.57'&&Math.abs(r.bal.reduce((a,b)=>a+b,0))<1e-9,r.bal.join());}
ok('fewest payments = the Skins rule (largest debtor pays largest creditor): 4 balances → 2 payments',JSON.stringify(N.fewest([10,-5,5,-10]))==='[{"from":3,"to":0,"amount":10},{"from":1,"to":2,"amount":5}]');
ok('fewest payments code is the Skins page\'s, line for line',(()=>{const k=rd('skins.html'),body=s=>(s.match(/var cr = \[\], dr = \[\];[\s\S]*?cr\.sort\(byAmt\); dr\.sort\(byAmt\);\n  \}/)||[''])[0].replace(/\s+/g,'');return body(src)&&body(src)===body(k);})());
// ---- 3. on the page: E2 typed hole by hole with the live strip ----
{const h=mk();h.set('pn0','Alex');h.set('pn1','Blake');h.$('btn-start').click();
 ok('Start hole 1: setup hidden, hole 1 with steppers (inputmode numeric), the strip is visible',h.$('entry').hidden&&!h.$('play').hidden&&txt(h.$('play-h'))==='Hole 1'&&h.$('sc0').getAttribute('inputmode')==='numeric'&&!h.d.querySelector('input[type=number]'));
 const play=c=>{h.$('sc0').value=c==='A'?'4':c==='B'?'5':'4';h.$('sc1').value=c==='A'?'5':c==='B'?'4':'4';h.$('btn-next').click();};
 'AA'.split('').forEach(play);
 ok('after hole 2: "Press started on hole 3" announced in the strip',/Press started on hole 3/.test(txt(h.$('ns-news'))),txt(h.$('ns-news')));
 ok('strip: "Front: Alex 2 up Press (3–9): — Back: — Overall: Alex 2 up" (all bets listed)',txt(h.$('ns-bets'))==='Front: Alex 2 up Press (3–9): — Back: — Overall: Alex 2 up',txt(h.$('ns-bets')));
 'AABBBAA'.split('').forEach(play);
 ok('after the front nine: Front Alex 3 up; presses 3–9 Alex 1 up, 5–9 Blake 1 up, 7–9 Alex 1 up',txt(h.$('ns-bets')).startsWith('Front: Alex 3 up Press (3–9): Alex 1 up Press (5–9): Blake 1 up Press (7–9): Alex 1 up Back: —'),txt(h.$('ns-bets')));
 const saved=JSON.parse(h.w.localStorage.getItem('gc_nassau_v1'));ok('state saved under gc_nassau_v1 (scores, hole, screen)',Object.keys(saved.sc).length===9&&saved.cur===10&&saved.scr==='play');
 const r=mk(URLP,{storage:{gc_nassau_v1:h.w.localStorage.getItem('gc_nassau_v1')}});ok('reopen resumes at hole 10 with the same strip',txt(r.$('play-h'))==='Hole 10'&&/Press \(7–9\): Alex 1 up/.test(txt(r.$('ns-bets'))));
 'BBHHHHHHH'.split('').forEach(play);
 ok('after 18: the settle screen: "Blake pays Alex $10.00"',!h.$('result').hidden&&txt(h.$('ns-pays'))==='Blake pays Alex $10.00',txt(h.$('ns-pays')));
 ok('ledger: each bet with its result; balances with a real minus (−$10.00)',/Press \(12–18\): all square/.test(txt(h.$('ledger')))&&/halved, \$0/.test(txt(h.$('ledger')))&&txt(h.$('ns-bal'))==='Alex +$10.00 Blake −$10.00');
 const t=h.w.GCNassauUI.shareText(),lines=t.split('\n');
 ok('share text: ≤ 6 lines, bets and presses, the payment, the link last (ASCII)',lines.length<=6&&lines[0]==='Nassau $5.00: Alex v Blake (gross, match play, 2-down presses)'&&/^Front Alex 3 up; Press \(3-9\) Alex 1 up; Press \(5-9\) Blake 1 up; Press \(7-9\) Alex 1 up$/.test(lines[1])&&lines[4]==='Blake pays Alex $10.00'&&/^https:\/\/golfcalculators\.com\/nassau-calculator/.test(lines[5])&&!/[^\x00-\x7f]/.test(t),t);}
{const h=mk();h.$('btn-start').click();h.$('btn-next').click();h.$('btn-next').click();h.$('btn-prev').click();h.$('btn-prev').click();h.$('btn-prev').click();
 radio(h,'fmt','2v2');ok('changing 1v1 → 2v2 with scores asks first and clears them only on OK',h.w.GCNassauUI.state().fmt==='2v2'&&!Object.keys(h.w.GCNassauUI.state().scores).length);}
{const h=mk(URLP,{confirm:false});h.$('btn-start').click();h.$('btn-next').click();h.$('btn-prev').click();h.$('btn-prev').click();radio(h,'fmt','2v2');
 ok('"Cancel" keeps the format and the scores',h.w.GCNassauUI.state().fmt==='1v1'&&Object.keys(h.w.GCNassauUI.state().scores).length===1);}
{const h=mk();radio(h,'fmt','2v2');['Alex','Ben','Chris','Dana'].forEach((v,i)=>h.set('pn'+i,v));h.set('stake','10');h.$('btn-start').click();
 const F9=[[4,5],[5,5],[4,5],[5,4],[4,5],[5,4],[4,5],[5,4],[4,5]],B9=[[5,4],[5,4],[4,5],[5,4],[5,4],[4,5],[5,4],[4,5],[5,4]];
 radio(h,'fmt','2v2');F9.concat(B9).forEach(p=>{h.$('sc0').value=p[0];h.$('sc1').value=p[0]+2;h.$('sc2').value=p[1];h.$('sc3').value=p[1]+2;h.$('btn-next').click();});
 ok('E3 on the page (auto presses off? no: on by default, so presses count too) settles in fewest payments',!h.$('result').hidden&&h.$('ns-pays').querySelectorAll('.ns-pay').length>=1);
 h.$('btn-back').click();h.$('btn-prev').click();
 const s=h.w.GCNassauUI.state();s.ap=0;h.w.GCNassauUI.render();h.$('btn-settle').click();
 ok('E3 with presses off: "Alex pays Chris $5.00", "Ben pays Dana $5.00"',txt(h.$('ns-pays'))==='Alex pays Chris $5.00 Ben pays Dana $5.00',txt(h.$('ns-pays')));}
{const h=mk();h.$('btn-start').click();['5','4'].forEach((v,i)=>{h.$('sc'+i).value=v;});h.$('btn-next').click();
 ok('manual press button: shows when someone is down in a live bet, "Press from hole 2 to 9"',!h.$('btn-press').hidden&&txt(h.$('btn-press'))==='Press from hole 2 to 9');
 h.$('btn-press').click();ok('pressing adds a manual press from hole 2; the button now cancels it',h.w.GCNassauUI.state().manual.join()==='2'&&/Cancel the press from hole 2/.test(txt(h.$('btn-press'))));
 h.$('btn-next').click();ok('the manual press appears in the strip once its first hole is scored',/Press \(2–9\): all square/.test(txt(h.$('ns-bets'))),txt(h.$('ns-bets')));}
// ---- 4. example, share link, viewer, hostile links ----
{const h=mk();h.$('btn-example').click();await tick();
 ok('one-tap example = E1: settle shows "Blake pays Alex $5.00"',!h.$('result').hidden&&txt(h.$('ns-pays'))==='Blake pays Alex $5.00');
 const link=await h.w.GCNassauUI.link();
 ok('share link: /nassau-calculator?utm_source=share&utm_medium=link&utm_campaign=nassau#r=…',/^https:\/\/golfcalculators\.com\/nassau-calculator\?utm_source=share&utm_medium=link&utm_campaign=nassau#r=1z?\.[A-Za-z0-9_-]+$/.test(link),link);
 const own='{"v":1,"f":"1v1","n":["Me","You"],"st":2,"net":0,"g":"match","ap":1,"po":0,"ml":1}';
 const v=mk(link,{storage:{gc_nassau_v1:own}});await tick(80);
 ok('viewer: the settled Nassau, read-only, revealed once drawn; own saved game untouched',v.d.documentElement.classList.contains('ns-view')&&v.d.documentElement.classList.contains('ns-ready')&&txt(v.$('ns-pays'))==='Blake pays Alex $5.00'&&/shared/.test(txt(v.$('hero')))&&v.w.localStorage.getItem('gc_nassau_v1')===own&&v.$('entry').hidden&&v.$('play').hidden);
 v.$('ns-own').click();ok('Start your own: fragment cleared, own players back',v.w.location.hash===''&&v.$('pn0').value==='Me');}
for(const [label,obj] of [['bad format',{v:1,f:'3v3',n:['a','b'],st:5,net:0,g:'match',ap:1,po:0,ml:1}],['negative stake',{v:1,f:'1v1',n:['a','b'],st:-5,net:0,g:'match',ap:1,po:0,ml:1}],['scores wrong length',{v:1,f:'1v1',n:['a','b'],st:5,net:0,g:'match',ap:1,po:0,ml:1,sc:{1:[4,4,4]}}],['hole 19',{v:1,f:'1v1',n:['a','b'],st:5,net:0,g:'match',ap:1,po:0,ml:1,sc:{19:[4,4]}}],['names not strings',{v:1,f:'1v1',n:[{},'b'],st:5,net:0,g:'match',ap:1,po:0,ml:1}]]){
  const code='1.'+Buffer.from(JSON.stringify(obj)).toString('base64url');const v=mk(URLP+'#r='+code);await tick(40);
  ok(`hostile/damaged link (${label}): "can't be opened"`,v.d.documentElement.classList.contains('ns-err-v')&&/can’t be opened/.test(txt(v.$('ns-shared'))));}
{const code='1.'+Buffer.from(JSON.stringify({v:1,f:'1v1',n:['<img src=x onerror=window.pwned=1>','B'],st:5,net:0,g:'match',ap:1,po:0,ml:1,sc:{1:[4,5]}})).toString('base64url');const v=mk(URLP+'#r='+code);await tick(40);
 ok('names from a link are text, never HTML',!v.$('result').querySelector('img')&&!v.w.pwned&&/<img src=x/.test(txt(v.$('hero'))));}
// ---- 5. GA ----
{const h=mk();const ev=()=>(h.w.dataLayer||[]).filter(a=>a[0]==='event').map(a=>[a[1],a[2]]);
 h.$('btn-example').click();ok('the example is not a settle: no nassau_settle',!ev().some(e=>e[0]==='nassau_settle'));
 h.$('btn-back').click();h.$('btn-settle').click();h.$('btn-back').click();h.$('btn-settle').click();
 const ns=ev().filter(e=>e[0]==='nassau_settle');ok('nassau_settle: once per format per visit, exactly {format:"1v1"}',JSON.stringify(ns)==='[["nassau_settle",{"format":"1v1"}]]',JSON.stringify(ns));
 const blob=JSON.stringify([...h.w.dataLayer].map(a=>[...a]));ok('no names, scores or money in the dataLayer',!/Alex|Blake|\$|"5"|5\.00/.test(blob.replace(/\d{4}-\d\d-\d\dT[^"]*/g,'')));
 ok('gcTrack refuses nassau_settle with another format/tool or extra data',h.w.gcTrack('nassau_settle','nassau','3v3')===false&&h.w.gcTrack('nassau_settle','skins','1v1')===false&&h.w.gcTrack('nassau_settle','nassau',{format:'1v1'})===false);}
// ---- 6. static ----
{const d=d0;const lds=[...d.querySelectorAll('script[type="application/ld+json"]')];let gr=null;try{gr=JSON.parse(lds[0].textContent);}catch(e){}
 const by=t=>((gr||{})['@graph']||[]).find(n=>n['@type']===t);const app=by('WebApplication')||{},faq=by('FAQPage')||{};
 ok('title and H1: "Nassau Golf Calculator"',/^Nassau Golf Calculator/.test(d.title)&&txt(d.querySelector('h1'))==='Nassau Golf Calculator');
 ok('JSON-LD WebApplication + FAQPage, inLanguage "en", url = canonical',lds.length===1&&app.inLanguage==='en'&&faq.inLanguage==='en'&&app.url===URLP&&(d.querySelector('link[rel=canonical]')||{}).href===URLP);
 const vis=[...d.querySelectorAll('.gc-faq-item')].map(e=>[norm(e.querySelector('h3').textContent),norm(e.querySelector('p').textContent)]),ld=(faq.mainEntity||[]).map(q=>[norm(q.name),norm(q.acceptedAnswer.text)]);
 ok('FAQ: 6–8 questions, JSON-LD = visible, each ≤ 70 words',vis.length>=6&&vis.length<=8&&JSON.stringify(vis)===JSON.stringify(ld)&&vis.every(([,a])=>words(a)<=70),vis.map(([,a])=>words(a)).join());
 const has=re=>vis.some(([q,a])=>re.test(q+' '+a));
 ok('FAQ covers: what a Nassau is, the 2-down auto press (dated convention), pressing a press, 1v1 v 2v2, match v aggregate, net 90%, not in the Rules of Golf',has(/What is a Nassau/)&&has(/2-down automatic press.*convention \(28 Nov 2026\)/)&&has(/press a press/)&&has(/1 v 1 and 2 v 2/)&&has(/Match play or aggregate/)&&has(/90%.*checked 28 Nov 2026/)&&has(/not part of the Rules of Golf|Is a Nassau in the Rules of Golf/));
 const ex=k=>txt(d.querySelector(`[data-ex="${k}"]`));const r=N.nassau(g({auto:true,scores:sc('AAAABBBAA'+'BBHHHHHHH')}));
 ok('worked example on the page = the engine (E2: +$10.00 / −$10.00, Blake pays Alex $10.00)',ex('e2-a')==='+$10.00'&&ex('e2-b')==='−$10.00'&&ex('e2-pay')==='Blake pays Alex $10.00'&&r.bal[0]===10);
 ok('related links: Skins and match play; /skins and home link here',!!d.querySelector('.gc-next a[href="/skins"]')&&!!d.querySelector('.gc-next a[href="/match-play-handicap-calculator"]')&&rd('skins.html').includes('href="/nassau-calculator"')&&rd('index.html').includes('href="/nassau-calculator"'));
 ok('sitemap + .html 301',/<loc>https:\/\/golfcalculators\.com\/nassau-calculator<\/loc>/.test(rd('sitemap.xml'))&&/^\/nassau-calculator\.html \/nassau-calculator 301!$/m.test(rd('_redirects')));
 ok('email card after the result (settle) only, teaser "Wolf, Las Vegas and Nines."; gear lists nassau',(()=>{const all=[...d.body.querySelectorAll('*')],c=d.getElementById('gc-nl-card');return c.hasAttribute('hidden')&&all.indexOf(c)>all.indexOf(d.getElementById('hero'))&&/Wolf, Las Vegas and Nines\./.test(c.textContent);})()&&JSON.parse(rd('affiliates.json')).tools.nassau.length===3);
 ok('the live strip is sticky under the header (always visible while scoring)',/\.ns-strip\{position:sticky;top:\d+px/.test(src));}
process.exitCode=report('v13-nassau')?1:0;
})();
