// v13 P1 (PO spec priorities-v13.md, approved by Russ 28 Nov 2026): /match-play-handicap-calculator.
// Allowances verified 28 Nov 2026 against the official sources:
//  [USGA] Rules of Handicapping (effective 1 Jan 2024), Appendix C Handicap Allowances, Clarifications C/2 and C/3:
//         https://www.usga.org/handicapping/roh/Content/rules/Appendix%20C%20Handicap%20Allowances.htm
//  [R&A]  https://www.randa.org/roh/appendices/appendix-c (same table and examples)
//  [USGA 4BM] Four-Ball Match Play (90%), unrounded worked example: .../Committee%20Content/USGA/LG_R7g11.htm
//  [USGA FS]  Foursomes Match Play, unrounded worked example: .../Committee%20Content/USGA/LG_R7h2.htm
//  [WHS24] USGA 2024 WHS Reference for Clubs: four-ball 90% applies to the difference, not to each player.
//  [GA]   Golf Australia WHS reference guide, January 2026, s10(A)-(C).
// Worked examples run through the page's own engine AND typed into the page.
const {JSDOM}=require('jsdom');
const {SITE,boot,ok,report,path,fs}=require('../lib/harness');
const F=path.join(SITE,'match-play-handicap-calculator.html');
if(!fs.existsSync(F)){console.log('SKIP  no /match-play-handicap-calculator on this branch');process.exit(0);}
const URLP='https://golfcalculators.com/match-play-handicap-calculator';
const rd=n=>fs.readFileSync(path.join(SITE,n),'utf8');const src=rd('match-play-handicap-calculator.html');
const norm=s=>String(s||'').replace(/\s+/g,' ').trim();const words=s=>norm(s).split(' ').filter(Boolean).length;
const zip=w=>{w.CompressionStream=CompressionStream;w.DecompressionStream=DecompressionStream;};
const mk=(url=URLP,opt={})=>boot(F,{url,beforeParse(w){zip(w);if(opt.confirm!==undefined)w.confirm=()=>opt.confirm;if(opt.before)opt.before(w);},storage:opt.storage});
const tick=(ms=30)=>new Promise(r=>setTimeout(r,ms));
const radio=(h,name,v)=>{const r=h.d.querySelector(`input[name=${name}][value="${v}"]`);r.checked=true;h.fire(r,'change');};
const txt=e=>e?norm(e.textContent):'';
const SI=[...Array(18)].map((_,i)=>i+1);
(async()=>{
const h0=mk(),G=h0.w.GCMatch,d0=new JSDOM(src).window.document;
// ---- 1. allowances and sources ----
ok('allowances (Appendix C, checked 28 Nov 2026): singles 100%, four-ball match 90%, foursomes 50%, four-ball stroke 85%',JSON.stringify(G.PCT)==='{"singles":100,"fourball-match":90,"foursomes":50,"fourball-stroke":85}');
const head=src.match(/<script>\n\(function \(\) \{\n\/\* Match play[\s\S]*?\*\//)[0];
ok('sources cited in the code: USGA Appendix C, R&A Appendix C, the USGA four-ball and foursomes pages, the 2024 Reference for Clubs, Golf Australia Jan 2026, checked 28 Nov 2026',
 /Appendix%20C%20Handicap%20Allowances\.htm/.test(head)&&/randa\.org\/roh\/appendices\/appendix-c/.test(head)&&/LG_R7g11\.htm/.test(head)&&/LG_R7h2\.htm/.test(head)&&/2024 WHS Reference for Clubs/.test(head)&&/January 2026/.test(head)&&/checked 28 Nov 2026/.test(head));
const rs=txt(d0.getElementById('rules-source'));
ok('rules source on the page: USGA and R&A Appendix C, C/2 and C/3, the 2024 Reference, Golf Australia, checked 28 Nov 2026',/checked 28 Nov 2026/.test(rs)&&/Appendix C/.test(rs)&&/R&A/.test(rs)&&/C\/2 and C\/3/.test(rs)&&/2024 WHS Reference for Clubs/.test(rs)&&/Golf Australia/.test(rs));
ok('roundTo and courseHcp are the scramble page\'s own helpers (same source)',(()=>{const s=rd('scramble-handicap-calculator.html');const f=n=>(src.match(new RegExp('function '+n+'\\([^\\n]*'))||[''])[0];return f('roundTo')&&f('roundTo')===(s.match(/function roundTo\([^\n]*/)||[])[0]&&f('courseHcp')===(s.match(/function courseHcp\([^\n]*/)||[])[0];})());
// ---- 2. sourced worked examples (engine) ----
const A=(f,chs,pct)=>G.allocate(f,chs,pct);
const EX=[
 ['E1 [USGA/R&A C/2 Ex 2] singles 100%: A 10, B 18 → A 0, B 8',A('singles',[10,18]).ph,[0,8]],
 ['E2 [C/2 Ex 3] four-ball match 90% of the difference: 10/18/27/39 → 0/7/15/26',A('fourball-match',[10,18,27,39]).ph,[0,7,15,26]],
 ['E3 [C/2 Ex 4] foursomes 50% of combined difference: 28 v 66 → Team 2 receives 19',A('foursomes',[10,18,27,39]).side,[0,19]],
 ['[C/3 Ex 2] four-ball match with a plus player: +4/16/7/26 → 0/18/10/27',A('fourball-match',[-4,16,7,26]).ph,[0,18,10,27]],
 ['[C/3 Ex 3] foursomes with a plus player: 12 v 33 → 10.5 → 11',A('foursomes',[-4,16,7,26]).side,[0,11]],
 ['[C/3 Ex 1] four-ball stroke play 85% (full Playing Handicap, not off the low): +4/16/7/26 → +3/14/6/22',A('fourball-stroke',[-4,16,7,26]).ph,[-3,14,6,22]],
 ['[USGA FS + spec] unrounded Index 8.4/12.6, Slope 135, CR 72.3, Par 72: singles B receives 5',A('singles',[8.4,12.6].map(x=>G.courseHcp(x,135,72.3,72))).ph,[0,5]],
 ['[spec, from the USGA tees] unrounded four-ball 8.4/12.6/11.4/15.2 → 0/5/3/7 (C is 3 from unrounded)',A('fourball-match',[8.4,12.6,11.4,15.2].map(x=>G.courseHcp(x,135,72.3,72))).ph,[0,5,3,7]],
 ['[USGA FS] foursomes 25.688 v 32.378 → 3.345 → Team 2 receives 3',A('foursomes',[8.4,12.6,11.4,15.2].map(x=>G.courseHcp(x,135,72.3,72))).side,[0,3]],
 ['[USGA 4BM] four-ball A +1.2, B 12.6, C 11.4, D 15.2 (72.3/135/72) → 0/15/14/18',A('fourball-match',[-1.2,12.6,11.4,15.2].map(x=>G.courseHcp(x,135,72.3,72))).ph,[0,15,14,18]],
 ['[WHS24] pre-2024 contrast: 11 and 16 → 90% × 5 = 4.5 → 5 now (90% of each first gave 4)',A('fourball-match',[11,16,11,11]).ph.slice(0,2),[0,5]]];
for(const [n,got,want] of EX)ok(n,JSON.stringify(got)===JSON.stringify(want),JSON.stringify(got));
ok('the old (pre-2024) method really gives 4 for 11 v 16 (so the test above proves the change)',Math.round(16*0.9)-Math.round(11*0.9)===4);
const fsr=A('foursomes',[8.4,12.6,11.4,15.2].map(x=>G.courseHcp(x,135,72.3,72)));
const tr=x=>(Math.floor(x*1000)/1000).toFixed(3);ok('[USGA FS] the working (USGA truncates with …): combined 25.688… v 32.378…, difference 6.690…, 50% = 3.345…',tr(fsr.teams[0])==='25.688'&&tr(fsr.teams[1])==='32.378'&&tr(fsr.diff)==='6.690'&&tr(fsr.raw)==='3.345');
ok('rounding C from rounded Course Handicaps (14 − 10 = 4 → 3.6 → 4) would differ: the page uses unrounded (3)',A('fourball-match',[10,15,14,18]).ph[2]===4);
// stroke placement
const ph=G.perHole;
ok('E2 placement (SI = hole number): B 7 on SI 1–7; C 15 on 1–15; D 26 = one on every hole + a second on 1–8',ph(7,SI).join('')==='111111100000000000'&&ph(15,SI).join('')==='111111111111111000'&&ph(26,SI).join('')==='222222221111111111');
ok('E3 placement: 19 = one on every hole and a second on stroke index 1',ph(19,SI).join('')==='211111111111111111'&&G.strokesText(19,SI)==='one on every hole and a second on stroke index 1');
ok('plus +3 in stroke play gives back on stroke index 18, 17 and 16',ph(-3,SI).join()==='0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,-1,-1');
ok('9 holes: 11 strokes over 9 holes = one on each and a second on SI 1–2',ph(11,[1,2,3,4,5,6,7,8,9]).join('')==='221111111');
ok('9 holes with 18-hole SIs (odd holes): strokes go by stroke-index order among those 9',ph(2,[7,1,13,3,17,9,5,15,11]).join('')==='010100000'&&G.strokesText(2,[7,1,13,3,17,9,5,15,11])==='on holes 2, 4');
ok('strokes text: 8 → "on stroke index 1–8"; 1 → "on stroke index 1"; 18 → "one on every hole"',G.strokesText(8,SI)==='on stroke index 1–8'&&G.strokesText(1,SI)==='on stroke index 1'&&G.strokesText(18,SI)==='one on every hole');
// ---- 3. typed into the page ----
{const h=mk();h.set('pn0','Alex');h.set('pn1','Blake');h.set('ph0','10');h.set('ph1','18');
 ok('E1 on the page: "Blake receives 8 strokes from Alex, on stroke index 1–8."',txt(h.$('mp-result'))==='Blake receives 8 strokes from Alex, on stroke index 1–8.',txt(h.$('mp-result')));
 const t=h.$('mp-tbl');ok('stroke table: 18 holes, SI column, a column per player; Blake has 1 on holes 1–8 and 0 after; total 8',t.tBodies[0].rows.length===18&&txt(t.tBodies[0].rows[7].cells[3])==='1'&&txt(t.tBodies[0].rows[8].cells[3])==='0'&&txt(t.tFoot.rows[0].cells[2])==='8');
 radio(h,'fmt','fourball-match');h.set('pn2','Casey');h.set('pn3','Drew');h.set('ph2','27');h.set('ph3','39');
 ok('E2 on the page: "Alex plays off 0. Strokes received: Blake 7, Casey 15, Drew 26."',txt(h.$('mp-result'))==='Alex plays off 0. Strokes received: Blake 7, Casey 15, Drew 26.',txt(h.$('mp-result')));
 ok('E2 working: 90% × (18 − 10) etc., the 2024 rule stated',/Blake 7\.2 → 7 · Casey 15\.3 → 15 · Drew 26\.1 → 26/.test(txt(h.$('mp-formula')))&&/2024 method \(90% of the difference, not 90% of each handicap\)/.test(txt(h.$('mp-rule'))));
 ok('E2 table: Drew has 2 strokes on hole 1–8 (a second stroke), 1 on 9–18',txt(h.$('mp-tbl').tBodies[0].rows[0].cells[5])==='2'&&txt(h.$('mp-tbl').tBodies[0].rows[8].cells[5])==='1');
 radio(h,'fmt','foursomes');
 ok('E3 on the page: "Casey & Drew receive 19 strokes from Alex & Blake, one on every hole and a second on stroke index 1."',txt(h.$('mp-result'))==='Casey & Drew receive 19 strokes from Alex & Blake, one on every hole and a second on stroke index 1.',txt(h.$('mp-result')));
 radio(h,'fmt','fourball-stroke');['+4','16','7','26'].forEach((v,i)=>h.set('ph'+i,v));
 ok('C/3 four-ball stroke on the page: "Playing Handicaps: Alex +3, Blake 14, Casey 6, Drew 22." and −1 on SI 16–18 for Alex',txt(h.$('mp-result'))==='Playing Handicaps: Alex +3, Blake 14, Casey 6, Drew 22.'&&txt(h.$('mp-tbl').tBodies[0].rows[17].cells[2])==='−1'&&txt(h.$('mp-tbl').tBodies[0].rows[14].cells[2])==='0',txt(h.$('mp-result')));
 radio(h,'fmt','fourball-match');
 ok('C/3 four-ball match on the page: Alex (plus) plays off 0; 18, 10, 27',txt(h.$('mp-result'))==='Alex plays off 0. Strokes received: Blake 18, Casey 10, Drew 27.');}
{const h=mk();radio(h,'fmt','fourball-match');radio(h,'kind','hi');h.set('sl','135');h.set('cr','72.3');h.set('par','72');['8.4','12.6','11.4','15.2'].forEach((v,i)=>h.set('ph'+i,v));
 ok('Index mode (unrounded CH): four-ball 0/5/3/7 and the Course Handicaps shown to 3 dp',/Player 1 plays off 0\. Strokes received: Player 2 5, Player 3 3, Player 4 7\./.test(txt(h.$('mp-result')))&&/10\.335/.test(txt(h.$('hero')))&&/13\.919/.test(txt(h.$('hero'))),txt(h.$('mp-result')));
 radio(h,'fmt','foursomes');ok('Index mode foursomes: Team 2 receives 3',/Player 3 & Player 4 receive 3 strokes from Player 1 & Player 2, on stroke index 1–3\./.test(txt(h.$('mp-result'))),txt(h.$('mp-result')));
 radio(h,'holes','9');h.set('sl','135');ok('9 holes + Index: 9-hole Course Handicap = (Index ÷ 2) × Slope ÷ 113 + (CR − Par) (help text and hero say so)',/\(Index ÷ 2\)/.test(txt(h.$('course-help')))&&h.$('mp-tbl').tBodies[0].rows.length===9);}
{const h=mk();h.set('ph0','10');h.set('ph1','11');h.d.querySelector('#more').open=true;h.set('si0','2');h.set('si1','1');
 ok('custom stroke index: SI 1 is hole 2, so the single stroke goes on hole 2',txt(h.$('mp-result'))==='Player 2 receives 1 stroke from Player 1, on stroke index 1.'&&txt(h.$('mp-tbl').tBodies[0].rows[1].cells[3])==='1'&&txt(h.$('mp-tbl').tBodies[0].rows[0].cells[3])==='0');
 h.set('si1','2');ok('a repeated stroke index is flagged, no result',/use each number once/.test(txt(h.$('err')))&&/Check the stroke index/.test(txt(h.$('hero'))));
 h.$('btn-si-reset').click();ok('Reset stroke index: back to 1–18',h.w.GCMatchUI.state().si.join()===SI.join());
 h.set('pct','80');ok('custom allowance under More options: 80% of 1 = 0.8 → 1, kicker shows 80%',/80%/.test(txt(h.$('hero')))&&h.w.GCMatchUI.state().pct===80);}
// ---- 4. live match status ----
const M=(pat,N=18)=>{const sc={};pat.split('').forEach((c,i)=>sc[i+1]=c==='A'?[4,5]:c==='B'?[5,4]:[4,4]);return G.match('singles',[0,0],SI.slice(0,N),sc,N);};
const S=(pat,N)=>G.status(M(pat,N),['Alex','Blake']);
ok('"Alex is 2 up through 6"',S('AHAHHH')==='Alex is 2 up through 6',S('AHAHHH'));
ok('"All square through 4"',S('ABAB')==='All square through 4');
ok('dormie: "Blake is 2 up, dormie 2" (2 up with 2 to play)',S('BBHHHHHHHHHHHHHH')==='Blake is 2 up, dormie 2',S('BBHHHHHHHHHHHHHH'));
ok('"Alex wins 3 & 2" (3 up with 2 to play ends the match)',S('AAAHHHHHHHHHHHH'+'H')==='Alex wins 3 & 2',S('AAAHHHHHHHHHHHHH'));
ok('the match stops when decided: holes after 3 & 2 are ignored',M('AAAHHHHHHHHHHHHHBB').thru===16);
ok('"Match halved" after 18 all square; "Alex wins 1 up" on the last',S('AB'+'H'.repeat(16))==='Match halved'&&S('A'+'H'.repeat(17))==='Alex wins 1 up');
ok('team names: "Alex & Blake are 2 up through 6", "… win 5 & 4"',G.status(M('AHAHHH'),['Alex & Blake','Casey & Drew'])==='Alex & Blake are 2 up through 6'&&G.status(M('AAAAAHHHHHHHHH'),['Alex & Blake','Casey & Drew'])==='Alex & Blake win 5 & 4');
{const sc={1:[4,5,5,5],2:[5,5,4,6]};const m=G.match('fourball-match',[0,0,0,0],SI,sc,18);ok('four-ball match: each side counts its better net ball (hole 2: 5 v 4 → side 2)',m.diff===0&&m.holes[1].win===1);}
{const sc={1:[5,5,5,5]};const m=G.match('fourball-match',[0,1,0,0],SI,sc,18);ok('net: a stroke on SI 1 wins the hole for the side (B nets 4)',m.holes[0].win===0);}
{const sc={1:[4,4,5,5],2:[5,4,4,4]};const m=G.match('fourball-stroke',[0,0,0,0],SI,sc,18);ok('four-ball stroke: better-ball net totals and "leads by 1 through 2"',m.totals.join()==='8,9'&&G.status(m,['Alex & Blake','Casey & Drew'])==='Alex & Blake lead by 1 through 2');}
// ---- 5. play the match on the page ----
{const h=mk(URLP,{confirm:false});h.set('pn0','Alex');h.set('pn1','Blake');h.set('ph0','10');h.set('ph1','12');
 h.$('btn-play').click();ok('"Play the match" opens hole 1 with steppers (inputmode numeric, never type=number); setup hidden',!h.$('play').hidden&&h.$('entry').hidden&&txt(h.$('play-h'))==='Hole 1'&&h.$('sc0').getAttribute('inputmode')==='numeric'&&!h.d.querySelector('input[type=number]'));
 ok('hole 1: Blake gets a stroke (SI 1), the note says so; strip shows the strokes',/gets a stroke/.test(txt(h.$('srow1')))&&/Blake gets 2/.test(txt(h.$('mp-strokes'))));
 const play=(a,b)=>{h.$('sc0').value=String(a);h.$('sc1').value=String(b);h.fire(h.$('sc1'));h.$('btn-next').click();};
 play(4,5);ok('after hole 1 (4 v 5 net 4): "All square through 1"',txt(h.$('mp-status'))==='All square through 1',txt(h.$('mp-status')));
 play(4,6);play(3,4);ok('"Alex is 2 up through 3"',txt(h.$('mp-status'))==='Alex is 2 up through 3',txt(h.$('mp-status')));
 const saved=JSON.parse(h.w.localStorage.getItem('gc_matchplay_v1'));ok('state saved under gc_matchplay_v1 (scores, hole, screen)',saved.sc&&saved.sc['3'].join()==='3,4'&&saved.cur===4&&saved.scr==='play');
 const r=mk(URLP,{storage:{gc_matchplay_v1:h.w.localStorage.getItem('gc_matchplay_v1')}});ok('reopen resumes the match at hole 4 with the same status',!r.$('play').hidden&&txt(r.$('play-h'))==='Hole 4'&&txt(r.$('mp-status'))==='Alex is 2 up through 3');
 h.$('btn-prev').click();h.$('btn-prev').click();h.$('btn-prev').click();h.$('btn-prev').click();ok('← back to the strokes keeps the scores',!h.$('entry').hidden&&/Continue the match/.test(txt(h.$('btn-play'))));
 radio(h,'fmt','fourball-match');ok('changing the format with scores asks first; "Cancel" keeps the format and the scores',h.w.GCMatchUI.state().fmt==='singles'&&Object.keys(h.w.GCMatchUI.state().scores).length===3&&h.d.querySelector('input[name=fmt][value=singles]').checked);
 h.w.confirm=()=>true;radio(h,'fmt','fourball-match');ok('…and OK clears them (never silently)',h.w.GCMatchUI.state().fmt==='fourball-match'&&!Object.keys(h.w.GCMatchUI.state().scores).length);}
{const h=mk();h.set('ph0','0');h.set('ph1','0');h.$('btn-play').click();
 for(let i=0;i<10;i++){h.$('sc0').value='4';h.$('sc1').value='5';h.$('btn-next').click();}
 ok('a decided match: "Player 1 wins 10 & 8", final card, share + new match',txt(h.$('mp-final-t'))==='Player 1 wins 10 & 8'&&!h.$('final').hidden&&h.$('btn-next').hidden&&!h.$('play-actions').hidden);
 const t=h.w.GCMatchUI.shareText();ok('share text after play: format, strokes sentence, the match result, the link last (ASCII)',/^Singles match play \(100%\)\nLevel match: no strokes either way\.\nPlayer 1 wins 10 & 8\nWork out yours: https:\/\/golfcalculators\.com\/match-play-handicap-calculator/.test(t),t);}
// ---- 6. share link + viewer ----
{const h=mk();h.$('btn-example').click();await tick();const link=await h.w.GCMatchUI.link();
 ok('one-tap example = Appendix C C/2 four-ball (Alex 10, Blake 18, Casey 27, Drew 39)',txt(h.$('mp-result'))==='Alex plays off 0. Strokes received: Blake 7, Casey 15, Drew 26.');
 ok('share link: /match-play-handicap-calculator?utm_source=share&utm_medium=link&utm_campaign=matchplay#r=…',/^https:\/\/golfcalculators\.com\/match-play-handicap-calculator\?utm_source=share&utm_medium=link&utm_campaign=matchplay#r=1z?\.[A-Za-z0-9_-]+$/.test(link),link);
 const v=mk(link,{storage:{gc_matchplay_v1:'{"v":1,"f":"singles","k":"ch","h":18,"p":[["Me",5],["You",9]]}'}});await tick(80);
 ok('viewer: read-only allocation (form hidden), "Shared" in the kicker, revealed once drawn',v.d.documentElement.classList.contains('mp-view')&&v.d.documentElement.classList.contains('mp-ready')&&/Shared/.test(txt(v.$('hero')))&&txt(v.$('mp-result'))==='Alex plays off 0. Strokes received: Blake 7, Casey 15, Drew 26.');
 ok('viewer never overwrites the viewer\'s own saved match; sends shared_link_opened',v.w.localStorage.getItem('gc_matchplay_v1')==='{"v":1,"f":"singles","k":"ch","h":18,"p":[["Me",5],["You",9]]}'&&(v.w.dataLayer||[]).some(a=>a[1]==='shared_link_opened'));
 v.$('mp-own').click();ok('Work out your own: fragment cleared, own match back',v.w.location.hash===''&&v.$('pn0').value==='Me');}
{const code='1.'+Buffer.from(JSON.stringify({v:1,f:'singles',k:'ch',h:18,p:[['Alex',0],['Blake',0]],sc:{1:[4,5],2:[4,5]}})).toString('base64url');const v=mk(URLP+'#r='+code);await tick(40);
 ok('a link with scores shows the match state too: "Alex is 2 up through 2"',!v.$('play').hidden&&txt(v.$('mp-final-t'))==='Alex is 2 up through 2'&&!v.$('scores').querySelector('input'));}
for(const [label,obj] of [['5 players',{v:1,f:'singles',k:'ch',h:18,p:[['a',1],['b',2],['c',3],['d',4],['e',5]]}],['unknown format',{v:1,f:'greensomes',k:'ch',h:18,p:[['a',1],['b',2]]}],['handicap 999',{v:1,f:'singles',k:'ch',h:18,p:[['a',999],['b',2]]}],['bad scores',{v:1,f:'singles',k:'ch',h:18,p:[['a',1],['b',2]],sc:{1:[4,'x']}}],['hole 40',{v:1,f:'singles',k:'ch',h:18,p:[['a',1],['b',2]],sc:{40:[4,4]}}],['__proto__',JSON.parse('{"v":1,"f":"singles","k":"ch","h":18,"p":[["a",1],["b",2]],"sc":{"__proto__":[4,4]}}')]]){
  const code='1.'+Buffer.from(JSON.stringify(obj)).toString('base64url');const v=mk(URLP+'#r='+code);await tick(40);
  ok(`hostile/damaged link (${label}): "can't be opened", nothing rendered from it`,v.d.documentElement.classList.contains('mp-err-v')&&/can’t be opened/.test(txt(v.$('mp-shared'))));}
{const code='1.'+Buffer.from(JSON.stringify({v:1,f:'singles',k:'ch',h:18,p:[['<img src=x onerror=window.pwned=1>',5],['\u202Eevil'+'y'.repeat(40),9]]})).toString('base64url');const v=mk(URLP+'#r='+code);await tick(40);
 ok('names from a link are text (escaped), controls stripped, cut to 24',!v.$('hero').querySelector('img')&&!v.w.pwned&&/<img src=x/.test(txt(v.$('hero')))&&!/\u202E/.test(txt(v.$('hero')))&&!v.$('mp-table').querySelector('img'));}
// ---- 7. GA ----
{const h=mk();const ev=()=>(h.w.dataLayer||[]).filter(a=>a[0]==='event').map(a=>[a[1],a[2]]);
 h.$('btn-example').click();ok('the example is not a calculation: no matchplay_calculate',!ev().some(e=>e[0]==='matchplay_calculate'));
 h.set('ph1','19');radio(h,'fmt','foursomes');h.set('ph0','11');radio(h,'fmt','fourball-match');
 const mp=ev().filter(e=>e[0]==='matchplay_calculate');
 ok('matchplay_calculate: once per format per visit, exactly {format}',JSON.stringify(mp)==='[["matchplay_calculate",{"format":"fourball-match"}],["matchplay_calculate",{"format":"foursomes"}]]',JSON.stringify(mp));
 const blob=JSON.stringify([...h.w.dataLayer].map(a=>[...a])).replace(/\d{4}-\d\d-\d\dT[^"]*/g,'');
 ok('no names, handicaps or scores in the dataLayer',!/Alex|Blake|Casey|Drew|"19"|"11"/.test(blob));
 ok('gcTrack refuses matchplay_calculate with an unknown format, another tool, or extra data',h.w.gcTrack('matchplay_calculate','matchplay','greensomes')===false&&h.w.gcTrack('matchplay_calculate','skins','singles')===false&&h.w.gcTrack('matchplay_calculate','matchplay',{format:'singles'})===false);}
{const q=boot(F,{url:'https://v13--golfcalculators.netlify.app/match-play-handicap-calculator'});q.set('ph0','1');q.set('ph1','5');ok('drafts/previews send nothing to GA',!(q.w.dataLayer||[]).length);}
// ---- 8. static: SEO, schema, FAQ, links, data-ex ----
{const d=d0;const lds=[...d.querySelectorAll('script[type="application/ld+json"]')];let g=null;try{g=JSON.parse(lds[0].textContent);}catch(e){}
 const by=t=>((g||{})['@graph']||[]).find(n=>n['@type']===t);const app=by('WebApplication')||{},faq=by('FAQPage')||{};
 ok('title and H1: "Match Play Handicap Calculator"',/^Match Play Handicap Calculator/.test(d.title)&&txt(d.querySelector('h1'))==='Match Play Handicap Calculator');
 ok('one JSON-LD block: WebApplication + FAQPage (+ breadcrumbs), inLanguage "en", url = canonical',lds.length===1&&app.inLanguage==='en'&&faq.inLanguage==='en'&&app.url===URLP&&(d.querySelector('link[rel=canonical]')||{}).href===URLP);
 const vis=[...d.querySelectorAll('.gc-faq-item')].map(e=>[norm(e.querySelector('h3').textContent),norm(e.querySelector('p').textContent)]),ld=(faq.mainEntity||[]).map(q=>[norm(q.name),norm(q.acceptedAnswer.text)]);
 ok('FAQ: 6–8 questions, JSON-LD = visible text, each answer ≤ 70 words (the Daily Handicap answer ≤ 120, PO-worded)',vis.length>=6&&vis.length<=8&&JSON.stringify(vis)===JSON.stringify(ld)&&vis.every(([q,a])=>words(a)<=(/Daily Handicap/.test(q)?120:70)),vis.map(([,a])=>words(a)).join());
 ok('FAQ states the 2024 four-ball change, with the date and source',vis.some(([q,a])=>/2024/.test(q)&&/2024 WHS Reference for Clubs/.test(a)&&/28 Nov 2026/.test(a)));
 const AUFAQ="Yes. Golf Australia's WHS guide (January 2026, §10B) works match play strokes from the difference between the players' Daily Handicaps, so enter each player's Daily Handicap for the tees being played (from your club chart or our Daily Handicap calculator) and choose Course Handicap. A Daily Handicap already includes Golf Australia's 0.93 multiplier and the Consistency Factor, so it is not the same number as a USGA Course Handicap and the strokes can differ by a stroke or so. To follow the USGA and R&A method instead, choose Handicap Index and enter the Slope, Scratch Rating and Par. If your competition conditions say otherwise, follow them.";
 const auV=vis.find(([q])=>/Daily Handicap/.test(q)),auL=ld.find(([q])=>/Daily Handicap/.test(q));
 ok('[GA §10B] AU FAQ on the page = the PO wording exactly: "Yes. … enter each player\'s Daily Handicap …"',!!auV&&auV[1]===AUFAQ&&auV[0]==='Should Australians enter their Daily Handicap?',auV&&auV[1].slice(0,60));
 ok('[GA §10B] AU FAQ in the FAQPage JSON-LD is identical to the visible one (and says Yes, not No)',!!auL&&auL[1]===AUFAQ&&!/^No\b/.test(auL[1]));
 ok('[GA §10B] the FAQ links "Daily Handicap calculator" to /daily-handicap',[...d.querySelectorAll('.gc-faq-item a')].some(a=>a.getAttribute('href')==='/daily-handicap'&&norm(a.textContent)==='Daily Handicap calculator'));
 ok('[GA §10B] the players help text next to the inputs is the PO wording exactly',txt(d.getElementById('players-help'))==="Course Handicap for the tees you play. In Australia, enter your Daily Handicap: Golf Australia's match play rule (§10B) works from the difference between Daily Handicaps. Plus handicap: +2.",txt(d.getElementById('players-help')));
 ok('no leftover "not your Daily Handicap" / "No." warning anywhere on the page',!/not your Daily Handicap/i.test(src)&&!vis.some(([,a])=>/^No\. A Golf Australia Daily Handicap/.test(a)));
 ok('scramble FAQ is consistent: enter each player\'s Daily Handicap, Index route follows the USGA method',(()=>{const sc=rd('scramble-handicap-calculator.html'),m=sc.match(/<h3>Should I use Course Handicap or Handicap Index\?<\/h3><p>([\s\S]*?)<\/p>/);return !!m&&/In Australia, enter each player's Daily Handicap/.test(m[1].replace(/<[^>]+>/g,''))&&/0\.93 multiplier and the Consistency Factor/.test(m[1])&&/For the USGA method, choose Handicap Index/.test(m[1])&&!/use the Daily Handicap\./.test(m[1]);})());
 ok('[should-fix] the side label wraps long names (.mp-side overflow-wrap:anywhere)',/\.mp-side\{[^}]*overflow-wrap:anywhere/.test(src));
 const ex=k=>txt(d.querySelector(`[data-ex="${k}"]`));const e2=G.allocate('fourball-match',[+ex('ch-0'),+ex('ch-1'),+ex('ch-2'),+ex('ch-3')]).ph;
 ok('worked example on the page = the engine (0/7/15/26, singles 8, foursomes 19, 11 v 16 → 5)',e2.join()===['0',ex('fb-1'),ex('fb-2'),ex('fb-3')].join()&&ex('singles')==='8'&&ex('foursomes')==='19'&&ex('old-new')==='5');
 const inputs=[...d.querySelectorAll('main input:not([type=radio]):not([type=checkbox]):not([type=hidden]):not([type=email])')];
 ok('number inputs use inputmode (never type=number)',!d.querySelector('input[type=number]')&&inputs.filter(i=>/^(ph|sl|cr|par|pct)/.test(i.id)).every(i=>/^(decimal|numeric)$/.test(i.getAttribute('inputmode'))));
 ok('related links: Nassau, Daily Handicap, Handicap Index',['/nassau-calculator','/daily-handicap','/handicap-calculator'].every(hr=>!!d.querySelector(`.gc-next a[href="${hr}"]`)));
 ok('email card after the result, hidden on load, teaser "Wolf, Las Vegas and Nines."',(()=>{const all=[...d.body.querySelectorAll('*')],c=d.getElementById('gc-nl-card');return c.hasAttribute('hidden')&&all.indexOf(c)>all.indexOf(d.getElementById('hero'))&&/Wolf, Las Vegas and Nines\. One email a month, max\./.test(c.textContent);})());
 ok('gear: affiliates.json lists matchplay',JSON.parse(rd('affiliates.json')).tools.matchplay.length===3);
 ok('sitemap, .html 301, links from home, /handicap-calculator, /scramble and /daily-handicap',/<loc>https:\/\/golfcalculators\.com\/match-play-handicap-calculator<\/loc><lastmod>\d{4}-\d\d-\d\d<\/lastmod>/.test(rd('sitemap.xml'))&&/^\/match-play-handicap-calculator\.html \/match-play-handicap-calculator 301!$/m.test(rd('_redirects'))&&['index.html','handicap-calculator.html','scramble-handicap-calculator.html','daily-handicap.html'].every(n=>rd(n).includes('href="/match-play-handicap-calculator"')));
 ok('header nav unchanged (Skins, Stableford, Daily Hcp): the new tools are not crammed into the sticky nav',[...d.querySelectorAll('.gc-nav a')].map(a=>a.getAttribute('href')).join()==='/skins,/stableford,/daily-handicap');}
{const h=mk();h.w.GCMatchUI.loadExample();h.$('btn-play').click();
 ok('[should-fix] an untouched hole shows "default 4" under each player (so Next is not a silent 4-4)',(h.$('scores').textContent.match(/default 4/g)||[]).length===4,txt(h.$('scores')).slice(0,120));
 h.d.querySelector('#scores button[data-sc="1"]').click();
 ok('… and the label goes once a score is touched',!/default 4/.test(h.$('scores').textContent));
 h.$('btn-next').click();ok('… and the next untouched hole shows it again',(h.$('scores').textContent.match(/default 4/g)||[]).length===4);}
{const h=mk();h.set('ph0','5');h.set('ph1','9');h.set('pn0','A'.repeat(24));h.set('pn1','B'.repeat(24));h.$('btn-play').click();
 ok('24-character names are text in the score rows (b wraps, overflow-wrap:anywhere in .mp-who b)',/\.mp-who b\{[^}]*overflow-wrap:anywhere/.test(src)&&txt(h.$('scores')).includes('A'.repeat(24)));}
process.exitCode=report('v13-matchplay')?1:0;
})();
