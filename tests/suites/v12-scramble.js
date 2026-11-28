// v12 item 1 (PO batch, approved by Russ 28 Nov 2026): Scramble / Texas scramble / Ambrose team handicap at
// /scramble-handicap-calculator. Allowances verified 28 Nov 2026 against the official sources:
//  [USGA] Rules of Handicapping (effective 1 Jan 2024), Appendix C, Scramble:
//         https://www.usga.org/handicapping/roh/Content/rules/Committee%20Content/USGA/LG_R7h5.htm
//         4 players 25/20/15/10%, 3 players 30/20/10%, 2 players 35/15%, lowest to highest; example HI 8.4/12.6/23.4/31.2,
//         CR 72.3, Slope 135, par 72 -> CH 10.335.../15.353.../28.255.../37.574... -> 13.650... -> 14. Rule 6.2a rounding.
//  [GA]   Golf Australia WHS reference guide, Edition January 2026, s10(A) (Ambrose or Scramble 25/20/15/10%, 35/15%;
//         team handicaps typically to one decimal place).
// Worked examples from published sources (each cited below) run through the page's own engine AND typed into the page.
const {JSDOM}=require('jsdom');
const {SITE,boot,ok,report,path,fs}=require('../lib/harness');
const F=path.join(SITE,'scramble-handicap-calculator.html');
if(!fs.existsSync(F)){console.log('SKIP  no /scramble-handicap-calculator on this branch');process.exit(0);}
const URLP='https://golfcalculators.com/scramble-handicap-calculator';
const rd=n=>fs.readFileSync(path.join(SITE,n),'utf8');const src=rd('scramble-handicap-calculator.html');
const norm=s=>String(s||'').replace(/\s+/g,' ').trim();const words=s=>norm(s).split(' ').filter(Boolean).length;
const zip=w=>{w.CompressionStream=CompressionStream;w.DecompressionStream=DecompressionStream;};
const mk=(url=URLP,opt={})=>boot(F,{url,beforeParse(w){zip(w);if(opt.before)opt.before(w);},storage:opt.storage});
const tick=(ms=30)=>new Promise(r=>setTimeout(r,ms));
const radio=(h,name,v)=>{const r=h.d.querySelector(`input[name=${name}][value="${v}"]`);r.checked=true;h.fire(r,'change');};
const txt=e=>e?norm(e.textContent):'';
(async()=>{
const h0=mk(),G=h0.w.GCScramble;
// ---- 1. the allowance table = [USGA] Appendix C, verified 28 Nov 2026 ----
ok('USGA allowances (Appendix C, checked 28 Nov 2026): 2 = 35/15, 3 = 30/20/10, 4 = 25/20/15/10',JSON.stringify(G.USGA)==='{"2":[35,15],"3":[30,20,10],"4":[25,20,15,10]}',JSON.stringify(G.USGA));
ok('the source URL and the check date are cited in the code, the rules source and the FAQ',/LG_R7h5\.htm/.test(src.match(/<script>\n\(function \(\) \{\n\/\* Scramble[\s\S]*?\*\//)[0])&&/checked 28 Nov 2026/.test(txt(new JSDOM(src).window.document.getElementById('rules-source')))&&/USGA, checked 28 Nov 2026/.test(src));
// ---- 2. sourced worked examples (engine) ----
const C=(a)=>a.map((ch,i)=>({name:'P'+(i+1),ch}));
const EX=[
 ['[USGA] Appendix C example (HI 8.4/12.6/23.4/31.2, CR 72.3, Slope 135, par 72): 13.650 → 14','usga',null,{hi:[8.4,12.6,23.4,31.2],sl:135,cr:72.3,par:72},'13.650',14],
 ['TheGrint, "Golf handicap allowances" (2-person): 8 and 20 → 2.8 + 3.0 = 5.8 → 6','usga',[8,20],null,'5.800',6],
 ['TheGrint (4-person): 4, 10, 16, 24 → 1.0 + 2.0 + 2.4 + 2.4 = 7.8 → 8','usga',[4,10,16,24],null,'7.800',8],
 ['golfcard.app scramble calculator (4-person): 4, 10, 16, 25 → 7.9 → 8','usga',[4,10,16,25],null,'7.900',8],
 ['golfhandicapcalculator.co (3-person 30/20/10): 6, 12, 20 → 1.8 + 2.4 + 2.0 = 6.2 → 6','usga',[6,12,20],null,'6.200',6],
 ['golfdecode.com (3-person): 6, 14, 22 → 1.8 + 2.8 + 2.2 = 6.8 → 7','usga',[6,14,22],null,'6.800',7],
 ['Yarrambat GC, "How to play Ambrose" (16 Sep 2026): 7, 6, 15, 20 → 48 ÷ 8 = 6','ambrose',[7,6,15,20],null,'6.000',6],
 ['matchplay.co, Ambrose golf rules Australia (2-person ÷ 4): 10 and 18 → 28 ÷ 4 = 7','ambrose',[10,18],null,'7.000',7],
 ['scrambledeggs.golf (3-person Ambrose ÷ 6): 5, 12, 22 → 39 ÷ 6 = 6.5 → 7','ambrose',[5,12,22],null,'6.500',7],
 ['matchplay.co, scramble golf rules Australia (4-person ÷ 8): 10, 15, 20, 25 → 70 ÷ 8 = 8.75 → 9','ambrose',[10,15,20,25],null,'8.750',9]];
for(const [name,mode,chs,hi,raw,team] of EX){
  const list=hi?hi.hi.map((x,i)=>({name:'P'+i,ch:G.courseHcp(x,hi.sl,hi.cr,hi.par)})):C(chs);
  const r=G.team(list,mode);ok('example (engine): '+name,r.raw.toFixed(3)===raw&&G.roundTo(r.raw,0)===team,r.raw.toFixed(3)+' → '+G.roundTo(r.raw,0));}
{const chs=[8.4,12.6,23.4,31.2].map(x=>G.courseHcp(x,135,72.3,72));ok('[USGA] Course Handicaps 10.335…, 15.353…, 28.255…, 37.574… (Rule 6.1, unrounded)',chs.map(x=>Math.floor(x*1000)/1000).join()==='10.335,15.353,28.255,37.574',chs.join());
 const r=G.team(C(chs),'usga');ok('[USGA] shares 2.583…, 3.070…, 4.238…, 3.757…',r.sorted.map(x=>Math.floor(x.share*1000)/1000).join()==='2.583,3.07,4.238,3.757',r.sorted.map(x=>x.share).join());}
// ---- 3. examples typed into the page ----
for(const [name,mode,chs,hi,raw,team] of EX){const h=mk();
  radio(h,'size',String((chs||hi.hi).length));radio(h,'mode',mode);
  if(hi){radio(h,'kind','hi');h.set('sl',String(hi.sl));h.set('cr',hi.cr.toFixed(1));h.set('par',String(hi.par));hi.hi.forEach((v,i)=>h.set('ph'+i,v.toFixed(1)));}
  else chs.forEach((v,i)=>h.set('ph'+i,String(v)));
  ok('example typed into the page: '+name,txt(h.$('sc-out'))===String(team)&&/^Team handicap: \S+ → \S+$/.test(txt(h.$('sc-result'))),txt(h.$('sc-result')));}
{const h=mk();radio(h,'size','4');radio(h,'mode','ambrose');[10,15,20,25].forEach((v,i)=>h.set('ph'+i,String(v)));radio(h,'round','1');
 ok('one decimal place (GA §10(A) note): Ambrose 10, 15, 20, 25 → 8.75 → 8.8, and the hero says so',txt(h.$('sc-out'))==='8.8'&&/one decimal place/.test(txt(h.$('sc-rule'))),txt(h.$('sc-result')));}
// ---- 4. rounding and plus handicaps ----
ok('rounding: .5 up (Rule 6.2a): 6.5 → 7, 13.65 → 14, 5.49 → 5',G.roundTo(6.5,0)===7&&G.roundTo(13.65,0)===14&&G.roundTo(5.49,0)===5);
ok('rounding: a plus total moves toward zero (GA): +0.5 → 0 (not −0), +2.5 → +2, +2.501 → +3, +1.35 → +1',Object.is(G.roundTo(-0.5,0),0)&&G.roundTo(-2.5,0)===-2&&G.roundTo(-2.501,0)===-3&&G.roundTo(-1.35,0)===-1);
ok('one decimal: 8.75 → 8.8, 6.375 → 6.4, +0.05 → 0.0',G.roundTo(8.75,1)===8.8&&G.roundTo(6.375,1)===6.4&&Object.is(G.roundTo(-0.05,1),0));
{const r=G.team(C([-4,10]),'usga');ok('plus handicap (2-person): +4 and 10 → −1.4 + 1.5 = 0.1 → 0 (a plus counts as a negative share)',Math.abs(r.raw-0.1)<1e-9&&G.roundTo(r.raw,0)===0);}
{const h=mk();radio(h,'size','2');h.set('ph0','+3');h.set('ph1','+2');ok('plus team typed as "+3" and "+2": 35% × +3 + 15% × +2 = +1.35 → +1, shown with a plus sign',txt(h.$('sc-result'))==='Team handicap: +1.35 → +1',txt(h.$('sc-result')));}
// ---- 5. order, custom % ----
{const a=G.team(C([24,4,16,10]),'usga'),b=G.team(C([4,10,16,24]),'usga');ok('order does not matter: players are ranked lowest to highest',a.raw===b.raw&&a.sorted.map(x=>x.ch).join()==='4,10,16,24');}
{const h=mk();radio(h,'mode','custom');ok('custom % starts from the USGA allowance for the team size',['pc0','pc1','pc2','pc3'].map(i=>h.$(i).value).join()==='25,20,15,10');
 [20,15,10,5].forEach((v,i)=>h.set('pc'+i,String(v)));[4,10,16,24].forEach((v,i)=>h.set('ph'+i,String(v)));
 ok('custom 20/15/10/5 with 4, 10, 16, 24 (hand): 0.8 + 1.5 + 1.6 + 1.2 = 5.1 → 5',txt(h.$('sc-out'))==='5'&&/^20% × 4 \+ 15% × 10 \+ 10% × 16 \+ 5% × 24 = 5\.1\.$/.test(txt(h.$('sc-formula'))),txt(h.$('sc-formula')));
 h.set('pc0','150');ok('custom %: out of range shows an inline error and marks the field',/0 to 100/.test(h.$('err').textContent)&&h.$('pc0').getAttribute('aria-invalid')==='true');}
// ---- 6. the result: sentence, rule, formula with the user's numbers, per-player breakdown as the hero ----
{const h=mk();h.$('btn-example').click();const hero=h.$('hero');
 ok('Load example = the USGA example: "Team handicap: 13.65 → 14"',txt(h.$('sc-result'))==='Team handicap: 13.65 → 14',txt(h.$('sc-result')));
 const rows=[...hero.querySelectorAll('#sc-break li')].map(li=>[...li.children].map(txt).join(' '));
 ok('hero breakdown: one row per player, lowest first, name + CH × % + share',rows.length===4&&rows[0]==='Alex CH 10.34 × 25% 2.58'&&rows[3]==='Drew CH 37.57 × 10% 3.76',rows.join(' | '));
 ok('formula with the user\'s numbers',txt(h.$('sc-formula'))==='25% × 10.34 + 20% × 15.35 + 15% × 28.26 + 10% × 37.57 = 13.65.',txt(h.$('sc-formula')));
 ok('states the rounding rule (Rule 6.2a) and the Course Handicap conversion with the user\'s Slope/CR/par',/nearest whole number: \.5 rounds up/.test(txt(hero))&&/Rule 6\.2a/.test(txt(hero))&&/Index × 135 ÷ 113 \+ \(72\.3 − 72\)/.test(txt(hero)));
 ok('Load example is not a calculation: no scramble_calculate',!(h.w.dataLayer||[]).some(a=>a[0]==='event'&&a[1]==='scramble_calculate'));
 ok('Load example: the gear shows, the email card waits for a real result',h.$('gc-nl-card').hidden&&h.$('gc-gear').querySelectorAll('a').length===3);
 ok('Ambrose formula: (7 + 6 + 15 + 20) ÷ 8 = 6',(()=>{const a=mk();radio(a,'mode','ambrose');[7,6,15,20].forEach((v,i)=>a.set('ph'+i,String(v)));return txt(a.$('sc-formula'))==='(6 + 7 + 15 + 20) ÷ 8 = 6.'&&txt(a.$('sc-out'))==='6';})());}
{const h=mk();ok('before input: the hero asks for the handicaps (no result, no share buttons)',/Enter 4 handicaps/.test(txt(h.$('hero')))&&h.$('actions').hidden);
 radio(h,'kind','hi');[8,9,10,11].forEach((v,i)=>h.set('ph'+i,String(v)));ok('Handicap Index without the course: asks for Slope, Course Rating and Par',/Enter the Slope, Course Rating and Par/.test(txt(h.$('hero'))));
 h.set('sl','200');ok('bad Slope: inline error, field marked',/55 to 155/.test(h.$('err').textContent)&&h.$('sl').getAttribute('aria-invalid')==='true');}
// ---- 7. inputs: steppers, inputmode, plus, escaping, memory ----
const d0=new JSDOM(src).window.document;
ok('no input[type=number]; handicap fields are text with inputmode=decimal',!d0.querySelector('input[type=number]')&&[0,1,2,3].every(i=>d0.getElementById('ph'+i).getAttribute('type')==='text'&&d0.getElementById('ph'+i).getAttribute('inputmode')==='decimal'));
ok('every handicap and % field has −/+ stepper buttons with labels, and every field has a label',[0,1,2,3].every(i=>{const s=d0.getElementById('ph'+i).closest('.gc-stepper'),p=d0.getElementById('pc'+i).closest('.gc-stepper');return [s,p].every(x=>x&&x.querySelectorAll('button[type=button][aria-label]').length===2);})&&[...d0.querySelectorAll('main input:not([type=radio]):not([type=checkbox]):not([type=hidden]):not([name="bot-field"])')].every(e=>!!d0.querySelector(`label[for="${e.id}"]`)));
{const h=mk();const plus=h.d.querySelector('button[data-step="1"][data-i="0"]'),minus=h.d.querySelector('button[data-step="-1"][data-i="1"]');plus.click();plus.click();minus.click();
 ok('steppers: + twice from empty → 2; − from empty → +1 (a plus handicap)',h.$('ph0').value==='2'&&h.$('ph1').value==='+1',h.$('ph0').value+' '+h.$('ph1').value);
 ok('parse: "+2", "-2" and "−2" are plus 2; "12,4" is 12.4 as an Index; junk is refused',['+2','-2','\u22122'].every(t=>h.w.GCScrambleUI.parseH(t,'ch')===-2)&&h.w.GCScrambleUI.parseH('12,4','hi')===12.4&&h.w.GCScrambleUI.parseH('12.45','hi')===null&&h.w.GCScrambleUI.parseH('1e3','ch')===null&&h.w.GCScrambleUI.parseH('99','ch')===null);}
{const h=mk();h.set('pn0','<img src=x onerror="window.pwned=1">');[8,12,20,30].forEach((v,i)=>h.set('ph'+i,String(v)));
 ok('names are text, never HTML (escaped in the hero), cut to 24 characters',!h.$('hero').querySelector('img')&&!h.w.pwned&&/<img src=x onerror=/.test(txt(h.$('hero'))));
 const store=h.w.localStorage.getItem('gc_scramble_v1');h.set('pn1','Blake');
 const h2=mk(URLP,{storage:{gc_scramble_v1:h.w.localStorage.getItem('gc_scramble_v1')}});
 ok('remembers the players on this device (localStorage): names and handicaps come back after a reload',h2.$('pn1').value==='Blake'&&h2.$('ph3').value==='30'&&txt(h2.$('sc-out'))===txt(h.$('sc-out'))&&!!store);
 const h3=mk(URLP,{storage:{gc_scramble_v1:'{"v":1,"s":9,"m":"x"}'}});ok('a damaged saved state is ignored (fresh form)',h3.$('ph0').value===''&&/Enter 4 handicaps/.test(txt(h3.$('hero'))));}
// ---- 8. share card + #r= link, read-only viewer, hostile links ----
{const h=mk();h.$('btn-example').click();h.set('ph1','13');await tick();const link=await h.w.GCScrambleUI.link();
 ok('share link: https://golfcalculators.com/scramble-handicap-calculator?utm_source=share&utm_medium=link&utm_campaign=scramble#r=…',/^https:\/\/golfcalculators\.com\/scramble-handicap-calculator\?utm_source=share&utm_medium=link&utm_campaign=scramble#r=1z?\.[A-Za-z0-9_-]+$/.test(link),link);
 const t=h.w.GCScrambleUI.shareText();ok('share text: the team handicap, the method and names, the link last; plain ASCII arrows (SMS-safe)',/^Team handicap: 13\.\d+ -> 14\nUSGA 4-person scramble \(25\/20\/15\/10%\): Alex, Blake, Casey, Drew\nWork out yours: https:\/\/golfcalculators\.com\/scramble-handicap-calculator\?/.test(t),t);
 let sent=null;h.w.navigator.share=o=>{sent=o;return Promise.resolve();};h.$('btn-share').click();await tick();
 ok('Share result: navigator.share with the text; result_shared {tool:"scramble"}',!!sent&&/Team handicap/.test(sent.text)&&(h.w.dataLayer||[]).some(a=>a[0]==='event'&&a[1]==='result_shared'&&JSON.stringify(a[2])==='{"tool":"scramble"}'));
 const mine=h.w.localStorage.getItem('gc_scramble_v1');
 const v=mk(link,{storage:{gc_scramble_v1:'{"v":1,"s":2,"m":"ambrose","k":"ch","r":0,"p":[["Me",5],["You",9]]}'}});await tick(80);
 ok('viewer: the shared result, read-only (form hidden), "Shared" in the hero, revealed once drawn',v.d.documentElement.classList.contains('sc-view')&&v.d.documentElement.classList.contains('sc-ready')&&/Shared/.test(txt(v.$('hero')))&&/Team handicap: \S+ → 14/.test(txt(v.$('sc-result'))));
 ok('viewer: never overwrites the viewer\'s own saved team, and sends shared_link_opened',v.w.localStorage.getItem('gc_scramble_v1')==='{"v":1,"s":2,"m":"ambrose","k":"ch","r":0,"p":[["Me",5],["You",9]]}'&&(v.w.dataLayer||[]).some(a=>a[1]==='shared_link_opened'));
 v.$('sc-own').click();ok('Work out your own: the #r= fragment is cleared, own team back, start_own_from_viewer',v.w.location.hash===''&&!v.d.documentElement.classList.contains('sc-view')&&v.$('pn0').value==='Me'&&(v.w.dataLayer||[]).some(a=>a[1]==='start_own_from_viewer'));
 ok('own state kept by the sharer',mine===h.w.localStorage.getItem('gc_scramble_v1'));}
for(const [label,obj] of [['5 players',{v:1,s:4,m:'usga',k:'ch',r:0,p:[['a',1],['b',2],['c',3],['d',4],['e',5]]}],['unknown method',{v:1,s:2,m:'best',k:'ch',r:0,p:[['a',1],['b',2]]}],['handicap 999',{v:1,s:2,m:'usga',k:'ch',r:0,p:[['a',999],['b',2]]}],['missing handicap',{v:1,s:2,m:'usga',k:'ch',r:0,p:[['a',null],['b',2]]}],['bad course',{v:1,s:2,m:'usga',k:'hi',r:0,p:[['a',1],['b',2]],c:[9999,1,1]}],['custom 250%',{v:1,s:2,m:'custom',k:'ch',r:0,p:[['a',1],['b',2]],x:[250,0,0,0]}]]){
  const code='1.'+Buffer.from(JSON.stringify(obj)).toString('base64url');const v=mk(URLP+'#r='+code);await tick(40);
  ok(`hostile/damaged link (${label}): "can't be opened" banner, own calculator shown, nothing rendered from it`,v.d.documentElement.classList.contains('sc-err')&&!v.d.documentElement.classList.contains('sc-view')&&/can’t be opened/.test(txt(v.$('sc-shared')))&&!/Team handicap: /.test(txt(v.$('hero'))));}
{const code='1.'+Buffer.from(JSON.stringify({v:1,s:2,m:'usga',k:'ch',r:0,p:[['\u202Eevil<b>x</b>\u0007'+'y'.repeat(40),5],['B',9]]})).toString('base64url');const v=mk(URLP+'#r='+code);await tick(40);
 const n=txt(v.$('sc-break').querySelector('.sc-n'));ok('names from a link: bidi/control characters removed, HTML shown as text, cut to 24',!v.$('sc-break').querySelector('.sc-n *')&&n.startsWith('evil<b>x</b>')&&Array.from(n).length===24,n);}
{const v=mk(URLP+'#r=1z.AAAA',{before(w){delete w.DecompressionStream;}});await tick(40);ok('a 1z. link without DecompressionStream: "needs a newer browser"',/newer browser/.test(txt(v.$('sc-shared'))));}
// ---- 9. GA: scramble_calculate {mode} only ----
{const h=mk();const ev=()=>(h.w.dataLayer||[]).filter(a=>a[0]==='event').map(a=>[a[1],a[2]]);
 [14,8,22,30].forEach((v,i)=>h.set('ph'+i,String(v)));h.set('ph0','15');radio(h,'mode','ambrose');h.set('ph1','9');radio(h,'mode','usga');
 const sc=ev().filter(e=>e[0]==='scramble_calculate');
 ok('scramble_calculate: once per method per visit, exactly {mode} (usga, then ambrose)',JSON.stringify(sc)==='[["scramble_calculate",{"mode":"usga"}],["scramble_calculate",{"mode":"ambrose"}]]',JSON.stringify(sc));
 const blob=JSON.stringify([...h.w.dataLayer].map(a=>[...a])).replace(/\d{4}-\d\d-\d\dT[^"]*/g,'');
 ok('no names, handicaps or team handicap in the dataLayer',!/"(14|15|22|30|9)"|Player|team/i.test(blob.replace(/G-DH32H3GWKE|scramble[_-]?\w*/g,'')),blob.slice(0,200));
 ok('gcTrack refuses a scramble_calculate with an unknown mode or a number',h.w.gcTrack('scramble_calculate','scramble','14')===false&&h.w.gcTrack('scramble_calculate','scramble',{mode:'usga'})===false&&h.w.gcTrack('scramble_calculate','skins','usga')===false);}
{const q=boot(F,{url:'https://v12--golfcalculators.netlify.app/scramble-handicap-calculator'});[14,8,22,30].forEach((v,i)=>q.set('ph'+i,String(v)));ok('drafts/previews send nothing to GA',!(q.w.dataLayer||[]).length);}
// ---- 10. static: SEO, schema, FAQ, links, sitemap, redirects, checks.yml, gear ----
{const d=d0;const lds=[...d.querySelectorAll('script[type="application/ld+json"]')];let g=null;try{g=JSON.parse(lds[0].textContent);}catch(e){}
 const by=t=>((g||{})['@graph']||[]).find(n=>n['@type']===t);const app=by('WebApplication')||{},faq=by('FAQPage')||{};
 ok('one JSON-LD block: WebApplication + FAQPage + BreadcrumbList',lds.length===1&&!!app['@type']&&!!faq['@type']&&!!by('BreadcrumbList'));
 ok('WebApplication and FAQPage inLanguage "en" (= html lang), free (0 AUD), url = canonical',app.inLanguage==='en'&&faq.inLanguage==='en'&&d.documentElement.lang==='en'&&app.url===URLP&&app.offers&&app.offers.price===0&&(d.querySelector('link[rel=canonical]')||{}).href===URLP);
 const vis=[...d.querySelectorAll('.gc-faq-item')].map(e=>[norm(e.querySelector('h3').textContent),norm(e.querySelector('p').textContent)]),ld=(faq.mainEntity||[]).map(q=>[norm(q.name),norm(q.acceptedAnswer.text)]);
 ok('FAQ: 5–8 questions, JSON-LD = visible text, each answer ≤ 60 words',vis.length>=5&&vis.length<=8&&JSON.stringify(vis)===JSON.stringify(ld)&&vis.every(([,a])=>words(a)<=60),vis.map(([q,a])=>words(a)).join());
 ok('FAQ covers Ambrose vs Texas scramble and the 4-person allowances, citing USGA and Golf Australia with dates',vis.some(([q])=>/Ambrose and a Texas scramble/.test(q))&&vis.some(([q,a])=>/4-person/.test(q)&&/25%, 20%/.test(a)+/USGA/.test(a))&&vis.some(([,a])=>/Golf Australia.*January 2026/.test(a))&&vis.some(([,a])=>/USGA, checked 28 Nov 2026/.test(a)));
 const rs=d.getElementById('rules-source');ok('rules source links USGA Appendix C and the Golf Australia guide (Edition January 2026, §10(A))',!!rs.querySelector('a[href="https://www.usga.org/handicapping/roh/Content/rules/Committee%20Content/USGA/LG_R7h5.htm"]')&&!!rs.querySelector('a[href*="static.golf.com.au"]')&&/Edition January 2026, §10\(A\)/.test(txt(rs)));
 const ex={};for(const e of d.querySelectorAll('[data-ex]'))ex[e.getAttribute('data-ex')]=txt(e);
 const E=G.EXAMPLE,chs=E.players.map(p=>G.courseHcp(p[1],E.course.sl,E.course.cr,E.course.par)),r=G.team(C(chs),'usga'),amb=G.team(C([10,15,28,38]),'ambrose');
 const want={'hi-0':'8.4','hi-1':'12.6','hi-2':'23.4','hi-3':'31.2',cr:'72.3',sl:'135',par:'72',raw:G.fmtRaw(r.raw,0),team:String(G.roundTo(r.raw,0)),'amb-raw':G.fmtRaw(amb.raw,0),'amb-team':String(G.roundTo(amb.raw,0))};
 chs.forEach((c,i)=>want['ch-'+i]=G.fmtNum(c,2));r.sorted.forEach((x,i)=>want['share-'+i]=G.fmtNum(x.share,2));
 ok('worked example: every data-ex number = the page\'s own engine on the Load example',Object.keys(ex).length===Object.keys(want).length&&Object.keys(want).every(k=>ex[k]===want[k]),Object.keys(want).filter(k=>ex[k]!==want[k]).map(k=>k+':'+ex[k]+'≠'+want[k]).join(' '));
 ok('the Load example is the worked example (USGA Appendix C team)',E.players.map(p=>p[1]).join()==='8.4,12.6,23.4,31.2'&&E.course.sl===135&&E.course.cr===72.3&&E.course.par===72);
 const all=[...d.body.querySelectorAll('*')],h1=d.querySelector('main h1'),ctl=all.find(e=>/^(INPUT|SELECT|BUTTON|TEXTAREA)$/.test(e.tagName)&&!e.closest('header')&&all.indexOf(e)>all.indexOf(h1)&&!e.closest('.sc-shared'));
 const between=all.filter(e=>e.tagName==='P'&&all.indexOf(e)>all.indexOf(h1)&&all.indexOf(e)<all.indexOf(ctl));
 ok('calculator first: ≤ 1 line of ≤ 20 words between the H1 and the first control; the learn section below',between.length<=1&&between.every(e=>words(e.textContent)<=20)&&all.indexOf(d.querySelector('.gc-learn'))>all.indexOf(ctl),between.map(e=>words(e.textContent)).join());
 ok('same gc-header as the Handicap Index page; gc.css inlined byte-identical',d.querySelector('header').outerHTML===new JSDOM(rd('handicap-calculator.html')).window.document.querySelector('header').outerHTML&&(d.querySelector('style[data-src="/gc.css"]')||{}).textContent===rd('gc.css'));
 ok('gc-share.js and gc-ga.js inlined byte-identical',(d.querySelector('script[data-src="/gc-share.js"]')||{}).textContent===rd('gc-share.js')&&(d.querySelector('script[data-src="/gc-ga.js"]')||{}).textContent===rd('gc-ga.js'));
 ok('next-step links: Daily Handicap and Handicap Index; body copy links both with descriptive anchors',!!d.querySelector('.gc-next a[href="/daily-handicap"]')&&!!d.querySelector('.gc-next a[href="/handicap-calculator"]')&&[...d.querySelectorAll('.gc-learn p a')].filter(a=>['/daily-handicap','/handicap-calculator'].includes(a.getAttribute('href'))&&words(a.textContent)>=3).length>=2);}
{const home=new JSDOM(rd('index.html')).window.document,hi=new JSDOM(rd('handicap-calculator.html')).window.document;
 const card=home.querySelector('main .lp-cards a[href="/scramble-handicap-calculator"]');
 ok('linked from the home cards (with a one-line description) and from the Handicap Index page',!!card&&norm((card.querySelector('span')||{}).textContent).length>10&&!!hi.querySelector('main a[href="/scramble-handicap-calculator"]'));}
ok('in the sitemap',/<loc>https:\/\/golfcalculators\.com\/scramble-handicap-calculator<\/loc><lastmod>\d{4}-\d\d-\d\d<\/lastmod>/.test(rd('sitemap.xml')));
ok('/scramble-handicap-calculator.html 301s to the extensionless URL (forced)',/^\/scramble-handicap-calculator\.html\s+\/scramble-handicap-calculator\s+301!$/m.test(rd('_redirects')));
{const y=fs.existsSync(path.join(SITE,'.github/workflows/checks.yml'))?rd('.github/workflows/checks.yml'):'';const line=(y.match(/for p in \/ [^;]*; do check 200/)||[''])[0];
 ok('checks.yml: published paths (200) include /scramble-handicap-calculator',/\s\/scramble-handicap-calculator\s/.test(line+' '),line);}
{const a=JSON.parse(rd('affiliates.json'));ok('gear for scramble: rangefinder, golf balls, scorecard holder (tag golfcalc-20)',JSON.stringify(a.tools.scramble)==='["rangefinder","golf-balls","scorecard-holder"]'&&a.tag==='golfcalc-20');}
{const pv=new JSDOM(rd('privacy.html')).window.document.getElementById('usage-events');ok('/privacy lists the scramble event and that only the method is sent',/scramble team handicap is worked out \(with only the method: USGA, Ambrose or custom\)/.test(txt(pv)));}
process.exitCode=report('v12-scramble')?1:0;
})();
