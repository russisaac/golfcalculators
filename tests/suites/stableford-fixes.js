// Stableford fixes (P3): plus-handicap note beside the field; 9-hole strokes go by the rank of the 18-hole stroke indexes, and a
// "+" handicap is a plus handicap (strokes given back from SI 18 up, GA WHS guide §10C).
// Expected strokes are written out by hand from the built-in card, not computed by the page.
const {SITE,boot,ok,report,path,fs}=require('../lib/harness');
const file=path.join(SITE,'stableford.html');
if(!/function siRank\(/.test(fs.readFileSync(file,'utf8'))){console.log('SKIP  legacy Stableford without the P3 fixes');process.exit(0);}
const txt=el=>el?el.textContent.replace(/\s+/g,' ').trim():'';
// card: par [4,4,3,5,4,4,3,4,5,4,4,3,5,4,4,3,4,5], SI [5,3,1,7,9,11,13,15,17,2,4,6,8,10,12,14,16,18]
const PAR=[4,4,3,5,4,4,3,4,5,4,4,3,5,4,4,3,4,5];
function run(hcp,n,score){const h=boot(file,{url:'https://golfcalculators.com/stableford'});
  if(n===9)h.set('holes','9','change');h.set('hcp',hcp);for(let i=1;i<=n;i++)h.set('s'+i,String(score(i)));h.w.calc();
  const pts=[...Array(n)].map((_,k)=>txt(h.$('p'+(k+1))));const total=+(txt(h.$('out')).match(/(-?\d+)$/)||[])[1];return {h,pts,total};}
const ptsFor=(strokes,score)=>strokes.map((s,k)=>String(Math.max(0,2+PAR[k]-(score(k+1)-s))));
const cases=[
  // [label, hcp input, holes, strokes per hole (hand-written)]
  ['9 holes, 5: ranks 1-5 = holes 3,2,1,4,5 (SI 1,3,5,7,9)','5',9,[1,1,1,1,1,0,0,0,0]],
  ['9 holes, 12: one each + a second on ranks 1-3 (holes 3,2,1)','12',9,[2,2,2,1,1,1,1,1,1]],
  ['9 holes, 9: one on every hole','9',9,[1,1,1,1,1,1,1,1,1]],
  ['9 holes, 2: holes 3 (SI 1) and 2 (SI 3), not hole 1 (SI 5)','2',9,[0,1,1,0,0,0,0,0,0]],
  ['18 holes, +2: gives back on SI 18 (hole 18) and SI 17 (hole 9)','+2',18,[0,0,0,0,0,0,0,0,-1,0,0,0,0,0,0,0,0,-1]],
  ['18 holes, +1.6 rounds to +2','+1.6',18,[0,0,0,0,0,0,0,0,-1,0,0,0,0,0,0,0,0,-1]],
  ['18 holes, +0.4 rounds to 0','+0.4',18,Array(18).fill(0)],
  ['18 holes, −3 (minus sign) = +3: SI 18, 17, 16 (holes 18, 9, 17)','\u22123',18,[0,0,0,0,0,0,0,0,-1,0,0,0,0,0,0,0,-1,-1]],
  ['9 holes, +2: gives back on ranks 9 and 8 (holes 9 SI 17, 8 SI 15)','+2',9,[0,0,0,0,0,0,0,-1,-1]],
  ['18 holes, 12 unchanged: SI 1-12','12',18,[1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,0,0,0]],
  ['18 holes, 20: all + second on SI 1, 2 (holes 3, 10)','20',18,[1,1,2,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1]],
  ['bad input "abc" = 0 strokes','abc',18,Array(18).fill(0)],
];
const score=i=>3+i%3;
for(const [label,hcp,n,strokes] of cases){const r=run(hcp,n,score);const want=ptsFor(strokes,score);
  ok(`${label}: points per hole`,r.pts.join()===want.join(),`got ${r.pts.join()} want ${want.join()}`);
  ok(`${label}: total`,r.total===want.reduce((a,b)=>a+ +b,0),String(r.total));}
// strokesOn itself, both directions
{const h=boot(file);const S=(c,rank,n)=>h.w.strokesOn(c,rank,n);
 ok('strokesOn(-2, rank 18/17/16, 18) = -1/-1/0',S(-2,18,18)===-1&&S(-2,17,18)===-1&&S(-2,16,18)===0);
 ok('strokesOn(36, any, 18) = 2; strokesOn(-20, 18, 18) = -2, (-20, 1, 18) = -1',S(36,1,18)===2&&S(36,18,18)===2&&S(-20,18,18)===-2&&S(-20,1,18)===-1);
 ok('siRank over 9 = 3,2,1,4,5,6,7,8,9',[...Array(9)].map((_,k)=>h.w.siRank(k+1,9)).join()==='3,2,1,4,5,6,7,8,9');
 ok('siRank over 18 = SI',[...Array(18)].map((_,k)=>h.w.siRank(k+1,18)).join()===h.w.eval('si').join());
 ok('parseHcp: "+2"→-2, "12"→12, " 7.4 "→7.4, ""→0',h.w.parseHcp('+2')===-2&&h.w.parseHcp('12')===12&&h.w.parseHcp(' 7.4 ')===7.4&&h.w.parseHcp('')===0);}
// Plus-handicap note beside the field (aria-describedby + aria-live), updated as you type.
{const h=boot(file,{url:'https://golfcalculators.com/stableford'});const inp=h.$('hcp'),note=h.$('hcpNote');
 ok('plus note: element right after the handicap field, aria-describedby + aria-live=polite',!!note&&inp.nextElementSibling===note&&(inp.getAttribute('aria-describedby')||'').split(' ').includes('hcpNote')&&note.getAttribute('aria-live')==='polite');
 ok('plus note: empty for the default 12',note.textContent==='');
 const cases=[['+2','Plus 2 (+2): gives back 2 strokes, starting at the highest stroke index'],['-2','Plus 2 (+2): gives back 2 strokes, starting at the highest stroke index'],
   ['\u22122','Plus 2 (+2): gives back 2 strokes, starting at the highest stroke index'],['+1','Plus 1 (+1): gives back 1 stroke, starting at the highest stroke index'],
   ['+1.6','Plus 1.6 (+1.6): gives back 2 strokes, starting at the highest stroke index'],['+0.4','Plus 0.4 (+0.4): rounds to 0, so no strokes given back'],
   ['12',''],['0',''],['',''],['abc',''],['+abc','']];
 for(const [v,want] of cases){h.set('hcp',v);ok(`plus note for "${v}": ${want?'"'+want+'"':'hidden (empty)'}`,note.textContent===want,note.textContent);}
 h.set('hcp','+2');h.set('hcp','14');ok('plus note clears when the entry stops being a plus handicap',note.textContent==='');
 ok('handicap field stays a text input (no type=number, keyboard has + and -)',inp.type==='text'&&!inp.hasAttribute('inputmode'));
 const h2=boot(file,{url:'https://golfcalculators.com/stableford',beforeParse(w){}});h2.$('hcp').value='+3';h2.w.hcpNote();ok('hcpNote() is callable for a prefilled value',h2.$('hcpNote').textContent.startsWith('Plus 3 (+3)'));}
process.exitCode=report('stableford-fixes')?1:0;
