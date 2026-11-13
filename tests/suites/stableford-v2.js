// Stableford rebuild (priorities-v7 P4). Every v7 test case, plus the promoter-bar flow:
// hand-calculated 4-player 18-hole round (driven through the steppers), countback at each stage
// (last 9, last 6, last 3, hole 18, joint, 10th-tee start), 9-hole countback, plus handicap and
// DH 24+, pickup, duplicate-SI warning, reload restores state, 0 type=number; also course
// quick-fill/saved courses, the plus-handicap note (PO wording), the DH round trip, share text,
// and an engine cross-check against the live page (tests/baseline) for ordinary 18-hole rounds.
const {SITE,BASE,boot,ok,report,path,fs}=require('../lib/harness');
const file=path.join(SITE,'stableford.html');const src=fs.readFileSync(file,'utf8');
if(!/data-gc="stableford-v2"/.test(src)){console.log('SKIP  legacy Stableford page (P4 not on this branch)');process.exit(0);}
const txt=el=>el?el.textContent.replace(/\s+/g,' ').trim():'';
const URL='https://golfcalculators.com/stableford';
const open=(o={})=>boot(file,Object.assign({url:URL},o));
const PAR=[4,4,3,5,4,4,3,4,5,4,4,3,5,4,4,3,4,5],SI=[5,3,1,7,9,11,13,15,17,2,4,6,8,10,12,14,16,18];

// ---- static: floor + reuse ----
{const h=open();const d=h.d;
 ok('0 input[type=number]',d.querySelectorAll('input[type=number]').length===0&&!/type="number"/.test(src));
 ok('every text input that takes numbers uses inputmode (except handicap fields, which need + and −)',[...d.querySelectorAll('input[type=text]')].every(i=>/^ph\d/.test(i.id)||i.hasAttribute('inputmode')||['pn0','cname','fill-par','fill-si'].includes(i.id)||/^pn/.test(i.id)));
 ok('uses shared gc.css (inlined block byte-identical to /gc.css)',(d.querySelector('style[data-src="/gc.css"]')||{}).textContent===fs.readFileSync(path.join(SITE,'gc.css'),'utf8'));
 ok('reuses the Skins slice-1 components (gc-stepper, sk-screen hole screen, sk-strip, gc-hero, gc-toast)',['.gc-stepper','#scr-hole.sk-screen','.sk-strip','.gc-hero','.gc-toast','.gc-seg'].every(s=>d.querySelector(s)));
 ok('nav links all three calculators',['/skins','/stableford','/daily-handicap'].every(u=>d.querySelector(`nav a[href="${u}"]`))&&!!d.querySelector('a.gc-brand[href="/"]'));
 ok('Next step card → Skins, Privacy footer',!!d.querySelector('a.next-card[href="/skins"]')&&!!d.querySelector('footer a[href="/privacy"]'));
 ok('no Calculate button: results update live',![...d.querySelectorAll('button')].some(b=>/calculate/i.test(b.textContent)));
 ok('countback source and edition cited by the result',/Australian Countback Method, Golf Australia WHS Official reference guide for Australian administrators, Edition January 2026, §11/.test(txt(h.$('result-src')))&&/Rule 21\.1b/.test(txt(h.$('result-src'))));
 ok('OG/Twitter tags present (P2)',['og:title','og:image','og:image:alt'].every(p=>d.querySelector(`meta[property="${p}"]`))&&!!d.querySelector('meta[name="twitter:image"]'));
 ok('opens on setup with 1 player and the standard card',!h.$('scr-setup').hidden&&h.w.GCStablefordUI.state().players.length===1&&h.w.GCStablefordUI.state().course.si.join()===SI.join());}

// ---- engine cross-check vs the live page (baseline c54e467) for ordinary 18-hole rounds ----
{const live=path.join(BASE,'stableford');let bad=[];const h=open();const G=h.w.GCStableford;let seed=7;const rnd=n=>{seed=(seed*1103515245+12345)%2147483648;return seed%n;};
 for(let t=0;t<25;t++){const hc=rnd(41),sc=PAR.map(p=>p-1+rnd(5));
  const L=boot(live,{url:URL});L.set('hcp',String(hc));sc.forEach((v,k)=>L.set('s'+(k+1),String(v)));L.w.calc();
  const lp=[...Array(18)].map((_,k)=>txt(L.$('p'+(k+1)))).join();
  const st=G.defaultState();st.players=[{name:'',hcp:hc}];sc.forEach((v,k)=>st.scores[k+1]=[v]);const r=G.compute(st);
  const np=[...Array(18)].map((_,k)=>String(r.rows[0].byHole[k+1].pts)).join();if(lp!==np)bad.push(hc+':'+lp+' vs '+np);}
 ok('engine = live page points for 25 random 18-hole rounds, handicaps 0–40',!bad.length,bad.slice(0,2).join(' | '));}

// ---- 4-player 18-hole round, entered with the steppers, vs hand calculations ----
// Mel 12 (1 shot SI 1–12), Sam 2 (SI 1–2), Jo 24 (2 shots SI 1–6, 1 elsewhere), Al +2 (gives back on SI 17, 18)
const GROSS=[[5,4,6,4],[5,4,6,4],[4,4,5,3],[6,4,7,5],[5,4,5,4],[4,4,6,4],[4,3,4,3],[5,4,6,4],[5,5,6,5],
 [5,4,6,4],[4,4,5,4],[3,4,4,3],[6,5,7,5],[5,4,5,5],[4,4,5,4],[3,3,5,4],[5,4,5,4],[5,5,6,5]];
// hand calculation, hole by hole: gross − strokes = net → points
// H1 par 4 SI 5: Mel 5-1=4 2 | Sam 4=4 2 | Jo 6-2=4 2 | Al 4=4 2
// H2 par 4 SI 3: Mel 5-1=4 2 | Sam 4=4 2 | Jo 6-2=4 2 | Al 4=4 2
// H3 par 3 SI 1: Mel 4-1=3 2 | Sam 4-1=3 2 | Jo 5-2=3 2 | Al 3=3 2
// H4 par 5 SI 7: Mel 6-1=5 2 | Sam 4=4 3 | Jo 7-1=6 1 | Al 5=5 2
// H5 par 4 SI 9: Mel 5-1=4 2 | Sam 4=4 2 | Jo 5-1=4 2 | Al 4=4 2
// H6 par 4 SI 11: Mel 4-1=3 3 | Sam 4=4 2 | Jo 6-1=5 1 | Al 4=4 2
// H7 par 3 SI 13: Mel 4=4 1 | Sam 3=3 2 | Jo 4-1=3 2 | Al 3=3 2
// H8 par 4 SI 15: Mel 5=5 1 | Sam 4=4 2 | Jo 6-1=5 1 | Al 4=4 2
// H9 par 5 SI 17: Mel 5=5 2 | Sam 5=5 2 | Jo 6-1=5 2 | Al 5+1=6 1
// H10 par 4 SI 2: Mel 5-1=4 2 | Sam 4-1=3 3 | Jo 6-2=4 2 | Al 4=4 2
// H11 par 4 SI 4: Mel 4-1=3 3 | Sam 4=4 2 | Jo 5-2=3 3 | Al 4=4 2
// H12 par 3 SI 6: Mel 3-1=2 3 | Sam 4=4 1 | Jo 4-2=2 3 | Al 3=3 2
// H13 par 5 SI 8: Mel 6-1=5 2 | Sam 5=5 2 | Jo 7-1=6 1 | Al 5=5 2
// H14 par 4 SI 10: Mel 5-1=4 2 | Sam 4=4 2 | Jo 5-1=4 2 | Al 5=5 1
// H15 par 4 SI 12: Mel 4-1=3 3 | Sam 4=4 2 | Jo 5-1=4 2 | Al 4=4 2
// H16 par 3 SI 14: Mel 3=3 2 | Sam 3=3 2 | Jo 5-1=4 1 | Al 4=4 1
// H17 par 4 SI 16: Mel 5=5 1 | Sam 4=4 2 | Jo 5-1=4 2 | Al 4=4 2
// H18 par 5 SI 18: Mel 5=5 2 | Sam 5=5 2 | Jo 6-1=5 2 | Al 5+1=6 1
const HAND=[[2,2,2,2],[2,2,2,2],[2,2,2,2],[2,3,1,2],[2,2,2,2],[3,2,1,2],[1,2,2,2],[1,2,1,2],[2,2,2,1],
 [2,3,2,2],[3,2,3,2],[3,1,3,2],[2,2,1,2],[2,2,2,1],[3,2,2,2],[2,2,1,1],[1,2,2,2],[2,2,2,1]];
const HAND_TOT=[37,37,33,32],HAND_B9=[20,18,18,15];
const click=(h,sel)=>{const b=h.d.querySelector(sel);if(!b)throw new Error('no '+sel);b.click();};
{const h=open();const U=h.w.GCStablefordUI;
 for(let k=0;k<3;k++)click(h,'#btn-add');
 ['Mel','Sam','Jo','Al'].forEach((n,i)=>h.set('pn'+i,n));
 [12,2,24].forEach((v,i)=>{for(let k=0;k<v;k++)click(h,`button[data-h="1"][data-i="${i}"]`);});
 for(let k=0;k<2;k++)click(h,'button[data-h="-1"][data-i="3"]');
 ok('setup: 4 players, handicaps by stepper 12, 2, 24 and +2',U.state().players.map(p=>p.name+' '+h.w.GCStableford.fmtHcp(p.hcp)).join()==='Mel 12,Sam 2,Jo 24,Al +2'&&h.$('ph3').value==='+2');
 ok('Al +2 shows the plus note beside the field',txt(h.$('hn3'))==='Plus 2 (+2): gives back 2 strokes, starting at the highest stroke index');
 click(h,'#btn-start');ok('Start round opens hole 1',!h.$('scr-hole').hidden&&txt(h.$('hole-h'))==='Hole 1');
 let stripOk=true,defOk=true,stripBad='';
 for(let k=0;k<18;k++){const hole=k+1;
  defOk=defOk&&[0,1,2,3].every(i=>h.$('sc'+i).value===String(PAR[k]));
  GROSS[k].forEach((g,i)=>{const dlt=g-PAR[k];for(let c=0;c<Math.abs(dlt);c++)click(h,`button[data-sc="${dlt>0?1:-1}"][data-i="${i}"]`);});
  const s=txt(h.$('strip'));const want='H'+hole+': '+['Mel','Sam','Jo','Al'].map((n,i)=>n+' '+HAND[k][i]+' pt'+(HAND[k][i]===1?'':'s')).join(' ');
  const got=s.replace(/ \([^)]*\)/g,'').replace(/ ·/g,'');if(!got.startsWith(want)){stripOk=false;stripBad=got;}
  click(h,'#btn-next');}
 ok('every hole defaults each stepper to par',defOk);
 ok('live strip per hole shows each player\'s points = hand calculation',stripOk,stripBad);
 const r=h.w.GCStableford.compute(U.state());
 ok('per-hole points = hand calculation (72 values)',r.rows.every((row,i)=>HAND.every((p,k)=>row.byHole[k+1].pts===p[i])));
 ok('totals = hand calculation 37, 37, 33, 32',r.rows.map(x=>x.total).join()===HAND_TOT.join());
 ok('last-9 subtotals 20, 18, 18, 15',r.rows.map(x=>x.key[1]).join()===HAND_B9.join());
 ok('after hole 18 the leaderboard shows',!h.$('scr-result').hidden);
 const hero=txt(h.$('hero'));
 ok('podium: 1st Mel 37, 2nd Sam 37, 3rd Jo 33; 4th Al 32 below',/1st Mel 37 pts/.test(hero)&&/2nd Sam 37 pts/.test(hero)&&/3rd Jo 33 pts/.test(hero)&&/4th Al 32 pts/.test(hero),hero);
 ok('tie on 37 split by countback, holes stated: "Mel wins on countback: 20 v 18 on holes 10–18"',txt(h.$('cb-line'))==='Mel wins on countback: 20 v 18 on holes 10–18',txt(h.$('cb-line')));
 const why=[...h.d.querySelectorAll('#why details')];
 ok('per-hole why for every player (4 × 18 lines)',why.length===4&&why.every(dt=>dt.querySelectorAll('li').length===18));
 const al=why.find(dt=>/Al/.test(txt(dt.querySelector('summary'))));
 ok('why line for a plus handicap: "H9 Par 5, SI 17: 5 + 1 = net 6, net bogey · 1 pt"',!!al&&txt(al.querySelectorAll('li')[8])==='H9 Par 5, SI 17: 5 + 1 = net 6, net bogey · 1 pt',al&&txt(al.querySelectorAll('li')[8]));
 const jo=why.find(dt=>/Jo/.test(txt(dt.querySelector('summary'))));
 ok('why line for DH 24 on SI 1: "H3 Par 3, SI 1: 5 − 2 = net 3, net par · 2 pts"',txt(jo.querySelectorAll('li')[2])==='H3 Par 3, SI 1: 5 − 2 = net 3, net par · 2 pts',txt(jo.querySelectorAll('li')[2]));
 // share
 let shared=null;h.w.navigator.share=o=>{shared=o;return Promise.resolve();};click(h,'#btn-share');
 const lines=(shared&&shared.text||'').split('\n');
 ok('share: one tap calls navigator.share',!!shared&&shared.title==='Stableford result');
 ok('share text ≤ 6 lines and ends with https://golfcalculators.com/stableford',lines.length<=6&&lines[lines.length-1]===URL,lines.length+' lines');
 ok('share text has places, points and the countback',lines[1]==='1st Mel 37 pts (countback: 20 v 18 on holes 10–18)'&&lines[2]==='2nd Sam 37 pts'&&lines[4]==='4th Al 32 pts',lines.join(' / '));
 // reload restores state
 const stored=h.w.localStorage.getItem('gc_stableford_v1');const h2=open({storage:{gc_stableford_v1:stored}});
 ok('reload restores players, scores and the leaderboard screen',!h2.$('scr-result').hidden&&txt(h2.$('cb-line'))==='Mel wins on countback: 20 v 18 on holes 10–18'&&h2.w.GCStablefordUI.state().players.map(p=>p.name).join()==='Mel,Sam,Jo,Al');
 // new round keeps players and course
 h2.w.GCStablefordUI.state().course.name='Kept Course';click(h2,'#btn-new');const st2=h2.w.GCStablefordUI.state();
 ok('New round keeps players and course, clears scores, opens hole 1',Object.keys(st2.scores).length===0&&st2.players.length===4&&st2.players[3].hcp===-2&&st2.course.name==='Kept Course'&&txt(h2.$('hole-h'))==='Hole 1');
 // fallback copy
 const h3=open({storage:{gc_stableford_v1:stored}});let copied=null;
 Object.defineProperty(h3.w.navigator,'clipboard',{value:{writeText:t=>{copied=t;return Promise.resolve();}},configurable:true});delete h3.w.navigator.share;
 click(h3,'#btn-share');
 setTimeout(()=>{ok('no navigator.share: copies the same text and shows a "Copied" toast',copied===lines.join('\n')&&txt(h3.$('toast'))==='Copied'&&h3.$('toast').classList.contains('show'));finish();},20);
}

// ---- countback at each stage (points per hole, hcp 0, built from par) ----
{ // no layout shift on first load: the fresh setup screen is pre-rendered in the HTML and matches what the script renders
  const h=open({storage:{}});const g=id=>h.d.getElementById(id);
  const stat=id=>{const m=src.match(new RegExp('id="'+id+'"[^>]*>([\\s\\S]*?)</(div|b|span|p)>\\s*(<a class="sf-dhlink"|<span class="gc-muted" id="course-sum"|</div>|<label class="sk-switch")'));return m?m[1]:null;};
  const norm=t=>(t||'').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
  ok('fresh setup pre-rendered (no CLS): player row in the HTML equals the rendered row',norm(src.split('<div id="players">')[1].split('</div>\n      <a class="sf-dhlink"')[0])===norm(g('players').innerHTML));
  for(const id of ['course-name','course-sum','round-help'])ok('fresh setup pre-rendered: #'+id+' text in the HTML equals the rendered text',norm(stat(id))===norm(g(id).textContent),norm(stat(id))+' | '+norm(g(id).textContent));
}
const G=open().w.GCStableford;
function round(ptsA,ptsB,opt={}){const st=G.defaultState();st.players=[{name:'A',hcp:0},{name:'B',hcp:0}];Object.assign(st,opt.st||{});if(opt.course)st.course=opt.course;
 const hs=G.holesInPlay(st);hs.forEach((h,k)=>{const par=+st.course.par[h-1],ix=ptsA.length===18?h-1:k;st.scores[h]=[par+2-ptsA[ix],par+2-ptsB[ix]];}); // 18 values: by hole number; 9: in play order
 const r=G.compute(st);return {r,first:r.board[0],line:G.cbSentence(r,r.board[0],r.board[0].place===1&&!(r.board[0].cb&&r.board[0].cb.joint)),st};}
const two=n=>Array(n).fill(2);const mod=(a,ch)=>{a=a.slice();for(const k in ch)a[k-1]=ch[k];return a;};
{let x=round(mod(two(18),{1:3,2:3,3:3,4:3,14:1,15:1,16:1,17:1}),two(18));
 ok('countback, last 9: B wins 18 v 14 on holes 10–18',x.first.name==='B'&&x.line==='B wins on countback: 18 v 14 on holes 10–18',x.line);
 x=round(mod(two(18),{10:3,13:1}),two(18));
 ok('countback, last 6 (last 9 level 18–18): B wins 12 v 11 on holes 13–18',x.first.name==='B'&&x.line==='B wins on countback: 12 v 11 on holes 13–18',x.line);
 x=round(mod(two(18),{13:3,16:1}),two(18));
 ok('countback, last 3 (last 9 and 6 level): B wins 6 v 5 on holes 16–18',x.first.name==='B'&&x.line==='B wins on countback: 6 v 5 on holes 16–18',x.line);
 x=round(mod(two(18),{16:3,18:1}),two(18));
 ok('countback, hole 18 (last 9, 6, 3 level): B wins 2 v 1 on hole 18',x.first.name==='B'&&x.line==='B wins on countback: 2 v 1 on hole 18',x.line);
 x=round(mod(two(18),{17:1,18:3}),mod(two(18),{17:2,18:2}));
 ok('countback, hole by hole: A wins 3 v 2 on hole 18 (then 17 is not needed)',x.first.name==='A'&&x.line==='A wins on countback: 3 v 2 on hole 18',x.line);
 x=round(mod(two(18),{1:3,2:1}),two(18));
 ok('countback, deep hole by hole: level until hole 2 → B wins 2 v 1 on hole 2',x.first.name==='B'&&x.line==='B wins on countback: 2 v 1 on hole 2',x.line);
 x=round(two(18),two(18));
 ok('identical cards: "Tied after countback (joint)", both =1st',x.line==='Tied after countback (joint)'&&x.r.board.every(b=>G.placeLabel(b)==='=1st'),x.line);
 x=round(mod(two(18),{1:1,2:1,3:1,4:1,14:3,15:3,16:3,17:3}),two(18),{st:{tenth:true}});
 ok('whole field off the 10th: last 9 = holes 1–9, stated as "on the last nine (holes 1–9)"',x.first.name==='B'&&x.line==='B wins on countback: 18 v 14 on the last nine (holes 1–9)',x.line);
 ok('whole field off the 10th: share text names the stage too',G.shareText(x.st,x.r).split('\n')[1]==='1st B 36 pts (countback: 18 v 14 on the last nine (holes 1–9))',G.shareText(x.st,x.r).split('\n')[1]);
 x=round(mod(two(18),{1:3,4:1}),two(18),{st:{tenth:true}}); // holes 1–9 level (18–18); hole 4 is in the last six played
 ok('whole field off the 10th, last 9 level: "last six (holes 4–9)" decides it (PO: 4–9, not 3–9)',x.first.name==='B'&&x.line==='B wins on countback: 12 v 11 on the last six (holes 4–9)',x.line);
 x=round(mod(two(18),{4:1,7:3}),two(18),{st:{tenth:true}}); // 1–9 and 4–9 level, 7–9 decides
 ok('whole field off the 10th: then "the last three (holes 7–9)"',x.first.name==='A'&&x.line==='A wins on countback: 7 v 6 on the last three (holes 7–9)',x.line);
 { const h=open({storage:{gc_stableford_v1:JSON.stringify(Object.assign(G.defaultState(),{tenth:true}))}});
   ok('setup help for a 10th-tee start: "Countback: the last nine (holes 1–9), then the last six (holes 4–9), then the last three (holes 7–9), then hole by hole from hole 9."',txt(h.$('round-help'))==='Countback: the last nine (holes 1–9), then the last six (holes 4–9), then the last three (holes 7–9), then hole by hole from hole 9.',txt(h.$('round-help')));
   const faq=[...h.d.querySelectorAll('.gc-faq-item')].find(e=>/countback work/.test(e.textContent));
   const tenthStages=G.cbStages(G.holesInPlay(Object.assign(G.defaultState(),{tenth:true}))).slice(0,3).map(hs=>G.cbRange(hs,G.holesInPlay(Object.assign(G.defaultState(),{tenth:true})))).map(t=>t.replace(/^the /,''));
   ok('countback FAQ covers a whole field off the 10th with the same stages as the calculator ('+tenthStages.join(', ')+')',!!faq&&/whole field started on the 10th tee/.test(txt(faq))&&tenthStages.every(t=>txt(faq).includes(t)),tenthStages.join(' | ')); }
 ok('10th-tee start: stages 1–9, 4–9, 7–9, then hole 9',G.cbStages(G.holesInPlay(x.st)).slice(0,4).map(s=>s[0]+'-'+s[s.length-1]).join()==='1-9,4-9,7-9,9-9');
 // three-way tie: places 1-3 all on countback
 const st=G.defaultState();st.players=[{name:'A',hcp:0},{name:'B',hcp:0},{name:'C',hcp:0}];
 const pa=mod(two(18),{1:3,10:1}),pb=two(18),pc=mod(two(18),{1:3,13:1});
 G.holesInPlay(st).forEach((h,k)=>{const p=+st.course.par[h-1];st.scores[h]=[p+2-pa[k],p+2-pb[k],p+2-pc[k]];});
 const r3=G.compute(st);
 ok('three-way tie on 36: B 1st (last 9 18 v 17), A 2nd over C (last 6 12 v 11)',r3.board.map(b=>G.placeLabel(b)+' '+b.name).join()==='1st B,2nd A,3rd C'&&G.cbSentence(r3,r3.board[0],true)==='B wins on countback: 18 v 17 on holes 10–18'&&G.cbSentence(r3,r3.board[1],false)==='A ahead of C on countback: 12 v 11 on holes 13–18');}
// ---- 9-hole countback ----
{let x=round(mod(two(9),{1:3,4:1}),two(9),{st:{round:'front'}});
 ok('9 holes (front 9): last 6 = holes 4–9, B wins 12 v 11',x.line==='B wins on countback: 12 v 11 on holes 4–9',x.line);
 x=round(mod(two(9),{4:3,7:1}),two(9),{st:{round:'front'}});
 ok('9 holes (front 9): last 3 = holes 7–9',x.line==='B wins on countback: 6 v 5 on holes 7–9',x.line);
 x=round(mod(two(9),{7:3,9:1}),two(9),{st:{round:'front'}});
 ok('9 holes (front 9): then hole by hole from the 9th',x.line==='B wins on countback: 2 v 1 on hole 9',x.line);
 x=round(mod(two(9),{7:3,9:1}),two(9),{st:{round:'back'}});
 ok('9 holes (back 9): stages 13–18, 16–18, then hole by hole from the 18th',x.line==='B wins on countback: 2 v 1 on hole 18'&&G.cbStages(G.holesInPlay(x.st)).slice(0,3).map(s=>s[0]+'-'+s[s.length-1]).join()==='13-18,16-18,18-18',x.line);
 x=round(mod(two(9),{1:3,4:1}),two(9),{course:G.defaultCourse(9)});
 ok('9-hole card: last 6 = holes 4–9',x.line==='B wins on countback: 12 v 11 on holes 4–9',x.line);}

// ---- strokes: plus handicaps, DH 24+, 9 holes ranked by 18-hole SI (hand-written) ----
{const strokes=(hcp,opt)=>{const st=G.defaultState();st.players=[{name:'',hcp}];Object.assign(st,opt||{});const r=G.compute(st);return G.holesInPlay(st).map(h=>r.rows[0].byHole[h].strokes);};
 const cases=[
  ['+2 (18): gives back on SI 18 (hole 18) and SI 17 (hole 9)',-2,null,[0,0,0,0,0,0,0,0,-1,0,0,0,0,0,0,0,0,-1]],
  ['+3 (18): SI 18, 17, 16 (holes 18, 9, 17)',-3,null,[0,0,0,0,0,0,0,0,-1,0,0,0,0,0,0,0,-1,-1]],
  ['24 (18): 2 on SI 1–6 (holes 3,10,2,11,1,12), 1 elsewhere',24,null,[2,2,2,1,1,1,1,1,1,2,2,2,1,1,1,1,1,1]],
  ['40 (18): 3 on SI 1–4, 2 elsewhere',40,null,[2,3,3,2,2,2,2,2,2,3,3,2,2,2,2,2,2,2]],
  ['front 9, 5: ranks 1–5 = holes 3,2,1,4,5',5,{round:'front'},[1,1,1,1,1,0,0,0,0]],
  ['front 9, 2: holes 3 (SI 1) and 2 (SI 3), not hole 1',2,{round:'front'},[0,1,1,0,0,0,0,0,0]],
  ['front 9, +2: gives back on ranks 9 and 8 (holes 9, 8)',-2,{round:'front'},[0,0,0,0,0,0,0,-1,-1]],
  ['back 9, 3: SI 2, 4, 6 (holes 10, 11, 12)',3,{round:'back'},[1,1,1,0,0,0,0,0,0]],
  ['front 9, 12: 1 each + 2nd on ranks 1–3 (holes 3, 2, 1)',12,{round:'front'},[2,2,2,1,1,1,1,1,1]]];
 for(const [label,hcp,opt,want] of cases){const got=strokes(hcp,opt);ok('strokes '+label,got.join()===want.join(),got.join());}
 ok('points table: net eagle 4, birdie 3, par 2, bogey 1, double 0, worse 0',[[4,2],[4,3],[4,4],[4,5],[4,6],[4,9]].map(([p,n])=>G.points(p,n)).join()==='4,3,2,1,0,0'&&G.netLabel(4,2)==='net eagle'&&G.netLabel(5,2)==='net albatross');}

// ---- pickup ----
{const h=open();const U=h.w.GCStablefordUI;click(h,'#btn-add');h.set('pn0','Mel');h.set('pn1','Sam');click(h,'#btn-start');
 click(h,'button[data-pu="1"]');
 ok('pickup: button pressed, score shows P, 0 points in the strip',h.d.querySelector('button[data-pu="1"]').getAttribute('aria-pressed')==='true'&&h.$('sc1').value==='P'&&/Sam 0 pts \(pickup\)/.test(txt(h.$('strip'))),txt(h.$('strip')));
 click(h,'#btn-next');const r=h.w.GCStableford.compute(U.state());
 ok('pickup counts as a played hole worth 0 points',r.rows[1].byHole[1].pickup===true&&r.rows[1].byHole[1].pts===0&&r.rows[1].thru===1);
 click(h,'#btn-prev');click(h,'button[data-pu="1"]');
 ok('tapping Pickup again goes back to par',h.$('sc1').value==='4'&&U.state().scores[1][1]===4);
 click(h,'button[data-pu="0"]');click(h,'button[data-sc="1"][data-i="0"]');
 ok('+ after a pickup restarts from par',U.state().scores[1][0]===4);
 U.state().scores[2]=['P',4];h.w.GCStablefordUI.show('result');
 const li=[...h.d.querySelectorAll('#why details')].find(dt=>/Mel/.test(txt(dt.querySelector('summary')))).querySelectorAll('li')[1];
 ok('why line: "H2 Par 4, SI 3: Pickup · 0 pts"',txt(li)==='H2 Par 4, SI 3: Pickup · 0 pts',txt(li));}

// ---- course: steppers, quick-fill, SI validation, saved courses ----
{const h=open();const U=h.w.GCStablefordUI;click(h,'#btn-course');
 ok('course screen: par and SI steppers for every hole, no type=number',h.d.querySelectorAll('#holes li').length===18&&h.d.querySelectorAll('#holes .gc-stepper').length===36);
 click(h,'button[data-cp="1"][data-h="1"]');ok('par stepper: hole 1 par 4 → 5',U.state().course.par[0]===5&&h.$('cp1').value==='5');
 h.set('fill-par','4 4 3 5 4 4 3 4 5 4 4 3 5 4 4 3 4 5');click(h,'#btn-fill-par');ok('quick-fill par from pasted "4 4 3 5 …"',U.state().course.par.join()===PAR.join()&&h.$('cp1').value==='4');
 h.set('fill-si','5 3 1 7 9');click(h,'#btn-fill-si');ok('quick-fill with the wrong count explains the fix',/Found 5 numbers for stroke index; a 18-hole card needs 18\./.test(txt(h.$('fill-err'))),txt(h.$('fill-err')));
 h.set('fill-si','1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18');click(h,'#btn-fill-si');ok('quick-fill SI with commas',U.state().course.si.join()===[...Array(18)].map((_,k)=>k+1).join());
 click(h,'button[data-cs="1"][data-h="1"]');
 const msg=txt(h.$('si-err'));
 ok('duplicate SI: inline fix message on the course screen',!h.$('si-err').hidden&&msg==='SI 2 is on holes 1 and 2. Missing: SI 1. Each stroke index 1–18 goes on one hole only, so check the card.',msg);
 ok('duplicate SI: both holes marked invalid',h.$('cs1').getAttribute('aria-invalid')==='true'&&h.$('cs2').getAttribute('aria-invalid')==='true'&&h.$('cs3').getAttribute('aria-invalid')==='false');
 h.set('cname','Royal Test');click(h,'#btn-csave');ok('cannot save a course with an invalid SI',/Fix the stroke index first/.test(txt(h.$('fill-err')))&&!h.w.localStorage.getItem('gc_courses_v1'));
 click(h,'#btn-cdone');ok('setup warns about the SI problem before the round',!h.$('setup-si').hidden&&/SI 2 is on holes 1 and 2/.test(txt(h.$('setup-si'))));
 click(h,'#btn-start');ok('hole screen warns about the duplicate SI',!h.$('si-warn').hidden&&txt(h.$('si-warn'))==='SI 2 is also on hole 2. Each hole needs a different stroke index, so check the card.');
 h.w.GCStablefordUI.show('result');ok('result notes the duplicate SI',!h.$('si-note').hidden&&/SI 2 is on holes 1 and 2/.test(txt(h.$('si-note'))));
 h.w.GCStablefordUI.show('course');click(h,'button[data-cs="-1"][data-h="1"]');ok('fixing it clears the message',h.$('si-err').hidden);
 click(h,'#btn-csave');ok('course saved by name',JSON.parse(h.w.localStorage.getItem('gc_courses_v1'))[0].name==='Royal Test');
 // 9-hole card: SI 1-9
 h.set('fill-par','443544345');const rad=h.d.querySelector('input[name="choles"][value="9"]');rad.checked=true;rad.dispatchEvent(new h.w.Event('change',{bubbles:true}));
 ok('9-hole card: 9 rows, SI 1–9',U.state().course.holes===9&&h.d.querySelectorAll('#holes li').length===9&&txt(h.$('si-max'))==='9');
 h.set('fill-par','443544345');click(h,'#btn-fill-par');ok('quick-fill par as "443544345" on a 9-hole card',U.state().course.par.join()==='4,4,3,5,4,4,3,4,5');
 h.set('fill-si','1 2 3 4 5 6 7 8 10');click(h,'#btn-fill-si');ok('9-hole card rejects SI 10',/Stroke index must be 1 to 9/.test(txt(h.$('fill-err'))));
 h.set('cs9','10');ok('9-hole card: typing SI 10 flags hole 9 (use 1–9)',/hole 9 has SI 10 \(use 1–9\)/i.test(txt(h.$('si-err'))),txt(h.$('si-err')));
 // re-pick saved course in a new session
 const h2=open({storage:{gc_courses_v1:h.w.localStorage.getItem('gc_courses_v1')}});
 ok('saved courses listed on setup',!h2.$('saved-wrap').hidden&&/Royal Test \(18\)/.test(txt(h2.$('saved'))));
 h2.set('saved','0','change');ok('re-picking a saved course loads its name, par and SI',h2.w.GCStablefordUI.state().course.name==='Royal Test'&&h2.w.GCStablefordUI.state().course.si[0]===1&&txt(h2.$('course-name'))==='Royal Test');}

// ---- players: 1–4, plus note, DH round trip ----
{const h=open();const U=h.w.GCStablefordUI;
 ok('1 player minimum',h.$('btn-less').disabled);for(let k=0;k<5;k++)click(h,'#btn-add');ok('4 players maximum',U.state().players.length===4&&h.$('btn-add').disabled);
 const note=h.$('hn0'),inp=h.$('ph0');
 ok('plus note: right after the stepper field, aria-describedby + aria-live=polite',(inp.getAttribute('aria-describedby')||'')==='hn0'&&note.getAttribute('aria-live')==='polite'&&inp.closest('.sk-player')===note.parentElement);
 const cases=[['+2','Plus 2 (+2): gives back 2 strokes, starting at the highest stroke index'],['-2','Plus 2 (+2): gives back 2 strokes, starting at the highest stroke index'],['\u22122','Plus 2 (+2): gives back 2 strokes, starting at the highest stroke index'],
  ['+1','Plus 1 (+1): gives back 1 stroke, starting at the highest stroke index'],['+0.4','Plus 0.4 (+0.4): rounds to 0, so no strokes given back'],['12',''],['0','']];
 for(const [v,want] of cases){h.set('ph0',v);ok(`plus note for "${v}": ${want?'"'+want+'"':'hidden (empty)'}`,txt(note)===want,txt(note));}
 h.set('ph0','0');click(h,'button[data-h="-1"][data-i="0"]');ok('stepper below 0 gives +1 and the note',inp.value==='+1'&&txt(note)==='Plus 1 (+1): gives back 1 stroke, starting at the highest stroke index');
 inp.dispatchEvent(new h.w.Event('focusout',{bubbles:true}));ok('note survives leaving the field',txt(h.$('hn0'))==='Plus 1 (+1): gives back 1 stroke, starting at the highest stroke index');
 ok('handicap field is a text input without inputmode (keyboard keeps + and −)',inp.type==='text'&&!inp.hasAttribute('inputmode'));
 ok('"Work out my DH" goes to /daily-handicap?from=stableford',h.$('dh-link').getAttribute('href')==='/daily-handicap?from=stableford');
 const st=h.w.localStorage.getItem('gc_stableford_v1');
 const h2=open({url:URL+'?dh=%2B2',storage:{gc_stableford_v1:st}});
 ok('back from DH with ?dh=+2: asks which player',!h2.$('dh-prompt').hidden&&/Use Daily Handicap \+2 for:/.test(txt(h2.$('dh-prompt')))&&h2.d.querySelectorAll('#dh-prompt button[data-dh]').length===5);
 ok('the ?dh= query is removed from the address',h2.w.location.search==='');
 click(h2,'#dh-prompt button[data-dh="2"]');
 ok('picking Player 3 sets +2, shows the plus note and a toast',h2.w.GCStablefordUI.state().players[2].hcp===-2&&h2.$('ph2').value==='+2'&&txt(h2.$('hn2'))==='Plus 2 (+2): gives back 2 strokes, starting at the highest stroke index'&&/Daily Handicap \+2 set for Player 3/.test(txt(h2.$('toast')))&&h2.$('dh-prompt').hidden);
 const d1=boot(path.join(SITE,'daily-handicap.html'),{url:'https://golfcalculators.com/daily-handicap?from=stableford'});
 d1.set('ga','14.2');d1.set('slope','128');d1.set('scratch','71');d1.set('par','72');
 ok('DH page from Stableford: "Use 14 in Stableford →" (14.2 / 128 / 71 / 72 → 14) links back with the value',!d1.$('sfBack').hidden&&d1.$('sfBack').getAttribute('href')==='/stableford?dh=14'&&txt(d1.$('sfBackT'))==='Use 14 in Stableford →',d1.$('sfBack').getAttribute('href'));
 const d2=boot(path.join(SITE,'daily-handicap.html'),{url:'https://golfcalculators.com/daily-handicap'});
 d2.set('ga','14.2');d2.set('slope','128');d2.set('scratch','71');d2.set('par','72');ok('DH page opened directly: no Stableford link',d2.$('sfBack').hidden);
 const d3=boot(path.join(SITE,'daily-handicap.html'),{url:'https://golfcalculators.com/daily-handicap?from=stableford'});
 d3.set('ga','+4');d3.set('slope','140');d3.set('scratch','74');d3.set('par','72');ok('DH plus result goes back as ?dh=%2B…',/^\/stableford\?dh=%2B\d+$/.test(d3.$('sfBack').getAttribute('href')),d3.$('sfBack').getAttribute('href'));}

// ---- 9 holes: "9-hole Daily Handicap" label and each player's DH link beside the field (PO, 12 Nov) ----
{const h=open({storage:{}});const four=()=>{for(let k=0;k<3;k++)click(h,'#btn-add');};four();
 const lbl=i=>h.$('ph'+i).getAttribute('aria-label'),grp=i=>h.$('ph'+i).closest('.gc-stepper').getAttribute('aria-label');
 ok('18 holes: field reads "Daily handicap", one shared "Work out my DH" link, no per-player links',txt(h.$('hcp-col'))==='Daily handicap'&&/daily handicap \(\+ for plus\)$/.test(lbl(0))&&!h.$('dh-link').hidden&&!h.d.querySelector('.sf-dhrow'));
 h.d.querySelector('input[name=round][value=front]').click();
 ok('front 9: column and every field labelled "9-hole Daily Handicap"',txt(h.$('hcp-col'))==='9-hole Daily Handicap'&&[0,1,2,3].every(i=>lbl(i)==='Player '+(i+1)+' 9-hole Daily Handicap (+ for plus)'&&grp(i)==='Player '+(i+1)+' 9-hole Daily Handicap'),lbl(0));
 const placed=[0,1,2,3].every(i=>{const a=h.$('dhl'+i),row=h.$('ph'+i).closest('.sk-player');return !!a&&a.closest('.sk-player')===row&&a.previousElementSibling===h.$('ph'+i).closest('.gc-stepper')&&a.getAttribute('href')==='/daily-handicap?from=stableford&holes=9&p='+i&&a.getAttribute('aria-label')==='Work out Player '+(i+1)+'\u2019s 9-hole Daily Handicap'&&txt(a)==='Work out 9-hole DH →';});
 ok('front 9: each player\'s "Work out 9-hole DH →" sits right after their handicap stepper, in the same row, and opens the 9-hole DH for that player',placed);
 ok('front 9: the shared link is hidden (one link per field instead)',h.$('dh-link').hidden);
 h.d.querySelector('input[name=round][value=back]').click();ok('back 9: still "9-hole Daily Handicap" with per-player links',txt(h.$('hcp-col'))==='9-hole Daily Handicap'&&h.d.querySelectorAll('.sf-dhrow').length===4);
 h.d.querySelector('input[name=round][value="18"]').click();ok('back to 18 holes: label and shared link switch back',txt(h.$('hcp-col'))==='Daily handicap'&&!h.$('dh-link').hidden&&!h.d.querySelector('.sf-dhrow')&&/^Player 1 daily handicap/.test(lbl(0)));
 const st9=Object.assign(G.defaultState(),{course:Object.assign(G.defaultCourse(),{holes:9,par:G.DEF_PAR.slice(0,9),si:[3,2,1,4,5,6,7,8,9]})});
 const h9=open({storage:{gc_stableford_v1:JSON.stringify(st9)}});ok('9-hole course card: "9-hole Daily Handicap" and the link beside the field',txt(h9.$('hcp-col'))==='9-hole Daily Handicap'&&!!h9.$('dhl0')&&h9.$('dh-link').hidden);
 // the 9-hole link round trip goes straight to that player
 const d=boot(path.join(SITE,'daily-handicap.html'),{url:'https://golfcalculators.com/daily-handicap?from=stableford&holes=9&p=2'});
 ok('DH page from a player\'s 9-hole link opens on 9 holes',d.$('holes').value==='9');
 d.set('ga','14.2');d.set('slope','128');d.set('scratch','35.5');d.set('par','36');
 const back=d.$('sfBack').getAttribute('href'),v=decodeURIComponent((back.match(/dh=([^&]+)/)||[])[1]||'');
 ok('…and links back with the value and the player ('+back+')',!d.$('sfBack').hidden&&/^\/stableford\?dh=[^&]+&p=2$/.test(back)&&txt(d.$('sfBackT'))==='Use '+v+' in Stableford →',back);
 h.d.querySelector('input[name=round][value=front]').click();
 const h2=open({url:URL+'?dh='+encodeURIComponent(v)+'&p=2',storage:{gc_stableford_v1:h.w.localStorage.getItem('gc_stableford_v1')}});
 ok('back in Stableford with &p=2: Player 3 gets it directly (no prompt), with a toast',h2.w.GCStablefordUI.state().players[2].hcp===+v&&h2.$('ph2').value===v&&h2.$('dh-prompt').hidden&&txt(h2.$('toast'))==='Player 3: 9-hole Daily Handicap '+v&&h2.w.location.search==='',txt(h2.$('toast')));
 const h3=open({url:URL+'?dh=7&p=9',storage:{gc_stableford_v1:h.w.localStorage.getItem('gc_stableford_v1')}});ok('an out-of-range &p= falls back to asking which player',!h3.$('dh-prompt').hidden);}

// ---- later visits: remembered players and course prefill setup (PO, 12 Nov) ----
{const h=open({storage:{}});click(h,'#btn-add');click(h,'#btn-add');
 h.set('pn0','Mel');h.set('pn1','Sam');h.set('pn2','Jo');h.set('ph0','12');h.set('ph1','+2');h.set('ph2','24');
 click(h,'#btn-course');h.set('cname','Long Reef');h.set('fill-par','4 4 3 5 4 4 3 4 5 4 4 3 5 4 4 3 4 4');click(h,'#btn-fill-par');click(h,'#btn-cdone-top');
 const later=open({storage:{gc_stableford_v1:h.w.localStorage.getItem('gc_stableford_v1'),gc_courses_v1:h.w.localStorage.getItem('gc_courses_v1')||'[]'}});
 const g=id=>later.$(id);
 ok('later visit: setup prefilled with 3 remembered players (names and handicaps)',!g('scr-setup').hidden&&txt(g('pcount'))==='3'&&['pn0','pn1','pn2'].map(i=>g(i).value).join()==='Mel,Sam,Jo'&&['ph0','ph1','ph2'].map(i=>g(i).value).join()==='12,+2,24',['pn0','pn1','pn2','ph0','ph1','ph2'].map(i=>g(i)&&g(i).value).join());
 ok('later visit: the +2 note is shown again for the remembered plus handicap',txt(g('hn1'))==='Plus 2 (+2): gives back 2 strokes, starting at the highest stroke index');
 ok('later visit: the remembered course card prefills (name, par 71)',txt(g('course-name'))==='Long Reef'&&txt(g('course-sum'))==='18 holes · par 71',txt(g('course-name'))+' / '+txt(g('course-sum')));}

// ---- 1-player round and empty states ----
{const h=open();click(h,'#btn-start');click(h,'#btn-board');ok('leaderboard before any full hole is honest',/Stableford/.test(txt(h.$('hero'))));
 const h2=open();h2.set('pn0','Solo');click(h2,'#btn-start');ok('1 player: strip shows the running total',/Total 2 pts thru 1/.test(txt(h2.$('strip'))),txt(h2.$('strip')));click(h2,'#btn-next');
 h2.w.GCStablefordUI.show('result');ok('1 player: hero is the player and points',/Solo 2 pts/.test(txt(h2.$('hero'))),txt(h2.$('hero')));}

// ---- escaping ----
{const h=open();h.set('pn0','<img src=x onerror=alert(1)>');h.w.GCStablefordUI.show('setup');click(h,'#btn-start');click(h,'#btn-next');h.w.GCStablefordUI.show('result');
 ok('player names are escaped everywhere',!h.d.querySelector('#scr-hole img, #hero img, #why img, #players img'));}

let finished=false;function finish(){if(finished)return;finished=true;process.exitCode=report('stableford-v2')?1:0;}
setTimeout(finish,500);
