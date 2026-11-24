// v10 P1: Handicap Index (GA Handicap) calculator at /handicap-calculator.
// Rule sources, checked 19 Nov 2026:
//  [GA]  Golf Australia, WHS Official reference guide for Australian administrators, Edition January 2026:
//        §3(B) Gross Differential = (AGS − (Scratch Rating + PCC)) × 113 ÷ Slope, rounded to the nearest tenth (0.35 → 0.4, +0.35 → +0.3);
//        §3(C) best 8 of the most recent 20; §3(D) table for fewer than 20 scores; §3(E) rounding, upper limit 54.0.
//        https://static.golf.com.au/clubs/1000/uploads/resources/whs%20reference%20guide%20for%20australian%20administrators%20(1-1-2026).pdf
//  [ROH] R&A / USGA Rules of Handicapping (2024), Rule 5.2a table + Clarifications 5.2a/1 and 5.2a/2 (worked examples), 5.2b, 5.3.
//        https://www.randa.org/roh/the-rules-of-handicapping/rule-5 , https://www.usga.org/handicapping/roh/Content/rules/5%202a%20For%20Fewer%20Than%2020%20Scores.htm
// The examples marked (hand) were worked by hand from those rules; the page's engine must give the same answers.
const {JSDOM}=require('jsdom');
const {SITE,boot,ok,report,path,fs}=require('../lib/harness');
const F=path.join(SITE,'handicap-calculator.html');
if(!fs.existsSync(F)){console.log('SKIP  no /handicap-calculator on this branch');process.exit(0);}
const URLP='https://golfcalculators.com/handicap-calculator';
const h0=boot(F,{url:URLP});const G=h0.w.GCHandicap;const D=a=>a.map(d=>({d}));
// 1. the table for fewer than 20 scores, exactly as [GA] §3(D) and [ROH] 5.2a
const WANT={3:[1,-2],4:[1,-1],5:[1,0],6:[2,-1],7:[2,0],8:[2,0],9:[3,0],10:[3,0],11:[3,0],12:[4,0],13:[4,0],14:[4,0],15:[5,0],16:[5,0],17:[6,0],18:[6,0],19:[7,0],20:[8,0]};
ok('WHS table (GA §3(D), ROH 5.2a): count and adjustment for 3–20 scores',JSON.stringify(G.TABLE)===JSON.stringify(WANT),JSON.stringify(G.TABLE));
// independent check: differentials n..1, so the lowest k are 1..k and the average is (k+1)/2 (hand)
const byN={3:-1.0,4:0.0,5:1.0,6:0.5,7:1.5,8:1.5,9:2.0,10:2.0,11:2.0,12:2.5,13:2.5,14:2.5,15:3.0,16:3.0,17:3.5,18:3.5,19:4.0,20:4.5};
for(const n in byN){const r=G.calc(D([...Array(+n)].map((_,i)=>+n-i)));ok(`table: ${n} scores → ${byN[n].toFixed(1)} (hand)`,r.index===byN[n],String(r.index));}
ok('fewer than 3 scores: no index yet, says how many more',G.calc(D([12,14])).index===null&&G.calc(D([12,14])).need===1&&G.calc([]).need===3);
// 2. rounding, [GA] §3(B) and §3(E) examples (a plus value is negative here)
for(const [x,w] of [[0.35,0.4],[0.3501,0.4],[0.3499,0.3],[0.55,0.6],[0.5501,0.6],[5.35,5.4],[5.3501,5.4],[5.55,5.6],[-0.35,-0.3],[-0.3501,-0.4],[-0.55,-0.5],[-0.5501,-0.6],[-5.35,-5.3],[-5.3501,-5.4],[-5.55,-5.5],[-5.5501,-5.6],[1.15,1.2],[16.85,16.9]])
  ok(`rounding (GA §3(B)/(E)): ${x<0?'+'+(-x):x} → ${w<0?'+'+(-w):w}`,G.r1(x)===w,String(G.r1(x)));
ok('plus values shown with a plus sign (GA): −2.5 → "+2.5", 0 → "0.0"',G.fmt(-2.5)==='+2.5'&&G.fmt(0)==='0.0'&&G.fmt(16.9)==='16.9');
// 3. Gross Differentials ([GA] §3(B), [ROH] 5.1)
ok('differential (hand): 85 off 71.3 / 125 → 13.7 × 113 ÷ 125 = 12.38 → 12.4',G.diffOf({s:85,cr:71.3,sl:125,pcc:0})===12.4);
ok('differential with PCC +1 (hand): 85 off 71.3 / 125 → (85 − 72.3) × 113 ÷ 125 = 11.48 → 11.5',G.diffOf({s:85,cr:71.3,sl:125,pcc:1})===11.5);
ok('differential = GA Stableford form (hand): 34 pts, DH 18, par 72, SR 71, slope 130 → ((36−34)+18+72−71) × 113 ÷ 130 = 18.25 → 18.3, same as AGS 92',G.r1(((36-34)+18+72-(71+0))*113/130)===18.3&&G.diffOf({s:92,cr:71,sl:130,pcc:0})===18.3);
ok('differential below zero (hand): 70 off 72.0 / 120 → −1.88 → +1.9',G.diffOf({s:70,cr:72,sl:120,pcc:0})===-1.9);
// 4. worked Handicap Index examples (≥ 6, incl. 3, 5, 8 and 20 rounds)
const EX=[
 ['ROH Clarification 5.2a/1, 3 scores: 15.3, 15.2, 16.6 → 15.2 − 2.0 = 13.2',[15.3,15.2,16.6],13.2],
 ['ROH Clarification 5.2a/2, 3 scores: 40.7, 42.4, 36.1 → 36.1 − 2.0 = 34.1',[40.7,42.4,36.1],34.1],
 ['ROH Clarification 5.2a/2, 6 scores: + 45.9, 43.6, 45.0 → avg(36.1, 40.7) − 1.0 = 37.4',[40.7,42.4,36.1,45.9,43.6,45.0],37.4],
 ['4 scores (hand): 22.0, 19.5, 24.1, 20.3 → 19.5 − 1.0 = 18.5',[22.0,19.5,24.1,20.3],18.5],
 ['5 scores (hand): 14.2, 12.8, 15.9, 13.1, 16.4 → lowest 12.8, no adjustment',[14.2,12.8,15.9,13.1,16.4],12.8],
 ['8 scores (hand, the page example): lowest 2 = 16.4, 17.3 → 16.85 → 16.9',[18.1,20.8,16.4,18.1,21.6,17.3,21.8,23.6],16.9],
 ['20 scores (hand): best 8 = 8.9 9.5 9.8 10.1 10.5 11.0 11.2 11.9 → 82.9 ÷ 8 = 10.3625 → 10.4',[12.1,15.4,9.8,11.2,14.7,10.5,13.3,16.0,8.9,12.6,17.2,11.9,10.1,14.0,13.8,9.5,15.1,12.4,18.3,11.0],10.4],
 ['20 scores (hand), oldest 8.0 counts: 79.0 ÷ 8 = 9.875 → 9.9',[8.0,15.4,9.8,11.2,14.7,10.5,13.3,16.0,8.9,12.6,17.2,11.9,10.1,14.0,13.8,9.5,15.1,12.4,18.3,11.0],9.9],
 ['21 scores (hand, GA §3(C) most recent 20): a 21st (30.0) drops the oldest 8.0 → back to 10.4',[8.0,15.4,9.8,11.2,14.7,10.5,13.3,16.0,8.9,12.6,17.2,11.9,10.1,14.0,13.8,9.5,15.1,12.4,18.3,11.0,30.0],10.4],
 ['plus handicap, 3 scores (hand): +0.5, 1.2, 2.0 → −0.5 − 2.0 = +2.5',[-0.5,1.2,2.0],-2.5],
 ['54.0 limit (GA §3(E), ROH 5.2a(i)/5.3), 3 scores: 58.0, 59.0, 60.0 → 56.0 → 54.0',[58,59,60],54]];
for(const [name,d,w] of EX){const r=G.calc(D(d));ok('example: '+name,r.index===w,String(r.index));}
{const r=G.calc(D(EX[6][1]));ok('20 scores: the 8 counting rounds are the lowest 8',r.counting.length===8&&r.counting.map(i=>r.diffs[i]).sort((a,b)=>a-b).join()==='8.9,9.5,9.8,10.1,10.5,11,11.2,11.9');}
// 5. next round to beat: the highest 1-dp differential that lowers the index
{const E=G.EXAMPLE,nx=G.nextToBeat(E),now=G.calc(E).index;
 ok('next round to beat (example, 8 → 9 rounds, lowest 3): 16.8 lowers 16.9, 16.9 does not',nx&&nx.d===16.8&&G.calc(E.concat([{d:16.8}])).index<now&&G.calc(E.concat([{d:16.9}])).index===now,JSON.stringify(nx));
 ok('…and as a score off the last round\'s ratings (70.1 / 124): 88 or better (88 → 16.3, 89 → 17.2)',G.scoreFor(16.8,70.1,124,0)===88);
 const f5=G.nextToBeat(D([14.2,12.8,15.9,13.1,16.4]));ok('5 → 6 scores: the −1.0 adjustment arrives, so any next round lowers it',f5&&f5.any===true);}
// 6. the page: add rounds, paste, storage, bridge, viewer, GA, escaping
const fire=(h,id)=>h.$(id).click();
{const h=boot(F,{url:URLP});
 ok('starts with "Add 3 rounds", no Share, no bridge',/Add 3 rounds/.test(h.$('hero').textContent)&&h.$('actions').hidden&&h.$('bridge').hidden);
 for(const [s,cr,sl] of [[92,'71.3',129],[95,'71.3',129]]){h.$('score').value=s;h.$('cr').value=cr;h.$('sl').value=sl;fire(h,'btn-add');}
 ok('two rounds: "Add 1 more round"; Scratch and Slope stay filled for the next round',/Add 1 more round/.test(h.$('hero').textContent)&&h.$('cr').value==='71.3'&&h.$('sl').value==='129'&&h.$('score').value==='');
 h.$('score').value='90';fire(h,'btn-add');
 ok('three rounds: index 16.4 − 2.0 = 14.4 in the hero, basis "lowest of 3, −2.0"',h.$('hi-out').textContent==='14.4'&&/lowest of 3, \u22122\.0/.test(h.$('hero').textContent),h.$('hero').textContent);
 ok('the counting round is highlighted and labelled (not colour alone)',h.d.querySelectorAll('#rounds li.is-count').length===1&&/Counts/.test(h.d.querySelector('#rounds li.is-count').textContent));
 ok('bridge to Daily Handicap with the index prefilled',!h.$('bridge').hidden&&h.$('bridge').getAttribute('href')==='/daily-handicap?ga=14.4'&&/Use 14\.4 in Daily Handicap/.test(h.$('bridge').textContent));
 h.$('score').value='9x';fire(h,'btn-add');ok('a bad score says what to enter and adds nothing',/adjusted gross score/.test(h.$('round-err').textContent)&&h.w.GCHandicapUI.state().rounds.length===3);
 h.$('score').value='88';h.$('sl').value='200';fire(h,'btn-add');ok('slope outside 55–155 is refused',/Slope/.test(h.$('round-err').textContent)&&h.w.GCHandicapUI.state().rounds.length===3);
 const saved=JSON.parse(h.w.localStorage.getItem('gc_handicap_v1'));ok('rounds are remembered on this device (localStorage)',saved.rounds.length===3&&saved.rounds[0].s===92);
 const h2=boot(F,{url:URLP,storage:{gc_handicap_v1:JSON.stringify(saved)}});ok('reload: the same rounds and index come back',h2.$('hi-out').textContent==='14.4'&&h2.d.querySelectorAll('#rounds li').length===3);
 h2.d.querySelector('[data-del="2"]').click();ok('delete a round (44px × button, labelled)',h2.d.querySelectorAll('#rounds li').length===2&&/Add 1 more/.test(h2.$('hero').textContent));}
{const h=boot(F,{url:URLP});h.$('paste').value='12.1, 15.4 9.8\n11.2 14.7 10.5 13.3 16.0 8.9 12.6 17.2 11.9 10.1 14.0 13.8 9.5 15.1 12.4 18.3 11.0';fire(h,'btn-paste');
 ok('paste 20 Gross Differentials (spaces, commas, new lines): 10.4, "best 8 of 20", 8 highlighted',h.$('hi-out').textContent==='10.4'&&/best 8 of 20/.test(h.$('hero').textContent)&&h.d.querySelectorAll('#rounds li.is-count').length===8);
 h.$('paste').value='1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23';fire(h,'btn-paste');
 ok('more than 20 pasted: only the latest 20 are kept',h.w.GCHandicapUI.state().rounds.length===20&&h.w.GCHandicapUI.state().rounds[0].d===4);
 h.$('paste').value='+0.5 1.2 2.0';fire(h,'btn-paste');ok('plus differential pasted as +0.5 → index +2.5, and the DH link carries +2.5',h.$('hi-out').textContent==='+2.5'&&h.$('bridge').getAttribute('href')==='/daily-handicap?ga=%2B2.5');
 h.$('paste').value='12 <img src=x onerror=alert(1)> 14';fire(h,'btn-paste');
 ok('hostile paste: refused with a plain-text message, no element injected',!!h.$('paste-err').textContent&&!h.d.querySelector('#paste-err img')&&!h.d.querySelector('#rounds img')&&h.$('hi-out').textContent==='+2.5');}
// DH prefill from the bridge
for(const [q,w] of [['ga=14.4','14.4'],['ga=%2B2.5','+2.5'],['ga=+2.5','+2.5'],['ga=abc','']]){const d=boot(path.join(SITE,'daily-handicap.html'),{url:'https://golfcalculators.com/daily-handicap?'+q});
  ok(`/daily-handicap?${q}: GA Handicap field = "${w}"`,d.$('ga').value===w,d.$('ga').value);}
// share + viewer
(async()=>{
 const h=boot(F,{url:URLP,beforeParse(w){w.navigator.share=d=>{w._shared=d;return Promise.resolve();};}});
 h.$('paste').value='18.1 20.8 16.4 18.1 21.6 17.3 21.8 23.6';fire(h,'btn-paste');fire(h,'btn-share');await new Promise(r=>setTimeout(r,5));
 const t=h.w._shared&&h.w._shared.text||'';const lines=t.split('\n');const link=lines[lines.length-1].replace(/^.*?(https:\S+)$/,'$1');
 ok('one-tap share: navigator.share with the index, ≤ 6 lines, the link last',/My estimated GA Handicap: 16\.9/.test(t)&&lines.length<=6&&/^https:\/\/golfcalculators\.com\/handicap-calculator\?utm_source=share&utm_medium=link&utm_campaign=handicap#d=181\.208\.164\.181\.216\.173\.218\.236$/.test(link),t);
 ok('share text says it is an estimate (GA calculates the official one)',/Golf Australia calculates the official one/.test(t));
 const v=boot(F,{url:link});
 ok('the link opens a read-only view with the same index; nothing saved',v.w.GCHandicapUI.viewing()&&v.$('hi-out').textContent==='16.9'&&!v.d.querySelector('[data-del]')&&v.w.localStorage.getItem('gc_handicap_v1')===null&&v.d.documentElement.classList.contains('hi-view'));
 v.$('hi-own').click();ok('"Work out your own" leaves the view and clears the fragment',!v.w.GCHandicapUI.viewing()&&v.w.location.hash===''&&/Add 3 rounds/.test(v.$('hero').textContent));
 for(const bad of ['#d=1.2','#d=999.1.2','#d=1.2.x','#d='+Array(22).fill(100).join('.')]){const b=boot(F,{url:URLP+bad});ok(`damaged link ${bad.slice(0,16)}…: not a view`,!b.w.GCHandicapUI.viewing()&&!b.d.documentElement.classList.contains('hi-view'));}
 // GA on production: hi_calculate once, with only {tool:"handicap"}; never the scores, differentials or the index
 const p=boot(F,{url:URLP});const dl=()=>[...(p.w.dataLayer||[])].map(a=>[...a]);const ev=()=>dl().filter(a=>a[0]==='event');
 fire(p,'btn-example');ok('Load example is not counted as hi_calculate',!ev().length);
 fire(p,'btn-clear');for(const s of [92,95,90]){p.$('score').value=s;p.$('cr').value='71.3';p.$('sl').value='129';fire(p,'btn-add');}
 p.$('score').value='99';fire(p,'btn-add');
 ok('hi_calculate sent once, as ["event","hi_calculate",{"tool":"handicap"}]',ev().length===1&&JSON.stringify(ev()[0])==='["event","hi_calculate",{"tool":"handicap"}]',JSON.stringify(ev()));
 const blob=JSON.stringify(dl()).replace(/"gtm\.[^"]*"|\d{4}-\d\d-\d\dT[^"]*/g,'');ok('nothing sent to GA contains a score, differential or index',!/\b(92|95|90|99|71\.3|129|14\.4|16\.4)\b/.test(blob),blob.slice(0,200));
 const q=boot(F,{url:'https://handicap--golfcalculators.netlify.app/handicap-calculator'});q.$('paste').value='1 2 3';fire(q,'btn-paste');ok('drafts/previews send nothing',!(q.w.dataLayer||[]).length);
 // static page checks
 const src=fs.readFileSync(F,'utf8'),d=new JSDOM(src).window.document,norm=s=>String(s||'').replace(/\s+/g,' ').trim();
 ok('title keeps the primary query "golf handicap calculator", ≤ 60 chars',/golf handicap calculator/i.test(d.title)&&d.title.length<=60,d.title);
 ok('no input[type=number]; every text input has inputmode',!d.querySelector('input[type=number]')&&[...d.querySelectorAll('input[type=text],textarea')].every(i=>i.getAttribute('inputmode')));
 ok('every input has a label',[...d.querySelectorAll('input:not([type=radio]):not([type=hidden]),textarea')].every(i=>d.querySelector(`label[for="${i.id}"]`)||i.getAttribute('aria-label')||i.closest('label')));
 ok('shared gc.css inlined byte-identical; shared header nav links the three calculators',(d.querySelector('style[data-src="/gc.css"]')||{}).textContent===fs.readFileSync(path.join(SITE,'gc.css'),'utf8')&&['/skins','/stableford','/daily-handicap'].every(u=>d.querySelector(`header nav.gc-nav a[href="${u}"]`)));
 const lds=[...d.querySelectorAll('script[type="application/ld+json"]')];let g=null;try{g=JSON.parse(lds[0].textContent);}catch(e){}
 const by=t=>((g||{})['@graph']||[]).find(n=>n['@type']===t);
 ok('one JSON-LD block: WebApplication + FAQPage + BreadcrumbList',lds.length===1&&!!by('WebApplication')&&!!by('FAQPage')&&!!by('BreadcrumbList')&&by('WebApplication').url===URLP);
 const vis=[...d.querySelectorAll('.gc-faq-item')].map(e=>[norm(e.querySelector('h3').textContent),norm(e.querySelector('p').textContent)]),ld=(by('FAQPage').mainEntity||[]).map(q=>[norm(q.name),norm(q.acceptedAnswer.text)]);
 ok('FAQ: 5–7 questions, JSON-LD = visible text, each answer ≤ 60 words',vis.length>=5&&vis.length<=7&&JSON.stringify(vis)===JSON.stringify(ld)&&vis.every(([,a])=>a.split(' ').length<=60),String(vis.length));
 ok('GA wording: "estimate" and "Golf Australia calculates your official GA Handicap" near the result',/estimate/i.test(d.getElementById('result').textContent)&&/Golf Australia calculates your official GA Handicap/.test(d.getElementById('result').textContent));
 const src2=d.getElementById('rules-source');ok('rules source cites the GA WHS guide (Edition January 2026, §3(B)–(E)) and the Rules of Handicapping, with links',/Edition January 2026/.test(src2.textContent)&&/§3\(B\)/.test(src2.textContent)&&!!src2.querySelector('a[href*="static.golf.com.au"]')&&!!src2.querySelector('a[href*="randa.org/roh"]'));
 ok('next-step links: Daily Handicap and Stableford',!!d.querySelector('.gc-next a[href="/daily-handicap"]')&&!!d.querySelector('.gc-next a[href="/stableford"]'));
 ok('in the sitemap',/<loc>https:\/\/golfcalculators\.com\/handicap-calculator<\/loc>/.test(fs.readFileSync(path.join(SITE,'sitemap.xml'),'utf8')));
 ok('linked from home and from Daily Handicap',!!new JSDOM(fs.readFileSync(path.join(SITE,'index.html'),'utf8')).window.document.querySelector('main a[href="/handicap-calculator"]')&&!!new JSDOM(fs.readFileSync(path.join(SITE,'daily-handicap.html'),'utf8')).window.document.querySelector('main a[href="/handicap-calculator"]'));
 ok('/handicap-calculator.html 301s to the extensionless URL',/^\/handicap-calculator\.html\s+\/handicap-calculator\s+301!$/m.test(fs.readFileSync(path.join(SITE,'_redirects'),'utf8')));
 ok('/privacy mentions the Handicap Index event',/Handicap Index is worked out/.test(fs.readFileSync(path.join(SITE,'privacy.html'),'utf8')));
})().catch(e=>ok('flow: '+e.stack,false)).then(()=>{process.exitCode=report('handicap-index')?1:0;});
