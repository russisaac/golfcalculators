// stableford-9hole-split: Stableford keeps each player's 18-hole and 9-hole Daily Handicap separately (as Skins
// does): 18 holes use p.hcp, 9 holes (front/back, or a 9-hole card) use p.hcp9. A missing one is prefilled from the
// other (half / twice) with a one-line "please check" note and is not stored until changed. Players saved before
// the split are migrated (the one number was the 9-hole DH if the saved round was 9 holes). A DH round trip says
// which DH it worked out (&holes=9|18); a 9-hole DH coming back onto an 18-hole round ASKS before switching the
// round to 9 holes and never switches silently (PO, 12 Nov).
const {SITE,boot,ok,report,path,fs}=require('../lib/harness');
const file=path.join(SITE,'stableford.html');const src=fs.readFileSync(file,'utf8');
if(!/data-gc="stableford-v2"/.test(src)){console.log('SKIP  legacy Stableford page: not applicable');process.exit(0);}
const URL='https://golfcalculators.com/stableford',KEY='gc_stableford_v1';
const open=(o={},f=file)=>boot(f,Object.assign({url:URL},o));
const txt=el=>el?el.textContent.replace(/\s+/g,' ').trim():'';
const click=(h,sel)=>{const b=h.d.querySelector(sel);if(!b)throw new Error('no '+sel);b.click();};
const G=open().w.GCStableford;
const SK=boot(path.join(SITE,'skins.html'),{url:'https://golfcalculators.com/skins'}).w.GCSkins;
const save=(players,extra={})=>JSON.stringify(Object.assign(G.defaultState(),{players},extra));
const st=h=>h.w.GCStablefordUI.state();
const stored=h=>JSON.parse(h.w.localStorage.getItem(KEY));
const round=(h,v)=>{const r=h.d.querySelector('input[name=round][value="'+v+'"]');r.checked=true;r.dispatchEvent(new h.w.Event('change',{bubbles:true}));};
const typeH=(h,i,v)=>{const el=h.$('ph'+i);el.focus();el.value=v;h.fire(el);h.fire(el,'focusout');};
const P=(a)=>a.map(([name,hcp,hcp9])=>({name,hcp,hcp9}));

// ---- engine ----
{ const s=Object.assign(G.defaultState(),{players:P([['A',20,12],['B',20,null],['C',-3,null],['D',null,7],['E',0,null]])});
  ok('18 holes: the 18-hole DH (20, 20, +3); a player with only a 9-hole DH 7 gets twice it (14); 0 → 0',G.compute(s).rows.map(r=>r.hcp).join()==='20,20,-3,14,0',G.compute(s).rows.map(r=>r.hcp).join());
  s.round='front';
  ok('front 9: own 9-hole DH as is (12, not 10); none yet: half (20 → 10, +3 → +2); 9-hole DH 7 → 7',G.compute(s).rows.map(r=>r.hcp).join()==='12,10,-2,7,0',G.compute(s).rows.map(r=>r.hcp).join());
  s.round='18';s.course=G.defaultCourse(9);ok('a 9-hole card uses the 9-hole DH too',G.compute(s).rows[0].hcp===12);
  const s2=Object.assign(G.defaultState(),{round:'front',players:P([['A',14,null],['B',14,6]])});
  ok('check note only for a prefilled value (A: yes, B: own 9-hole DH, no)',G.needsCheck(s2,s2.players[0])&&!G.needsCheck(s2,s2.players[1]));
  ok('check-note wording is word for word Skins\' ("Half of 18-hole DH 14: please check")',G.checkNote(s2,s2.players[0])==='Half of 18-hole DH 14: please check'&&G.checkNote(s2,s2.players[0])===SK.check9Note({hcp:14}));
  const s3=Object.assign(G.defaultState(),{players:P([['A',null,7]])});ok('18 holes from a 9-hole DH: "Twice 9-hole DH 7: please check"',G.needsCheck(s3,s3.players[0])&&G.checkNote(s3,s3.players[0])==='Twice 9-hole DH 7: please check');
  const ex=G.compute(G.exampleState());ok('the 18-hole example is unchanged (37, 37, 33, 32)',ex.board.map(r=>r.total).join()==='37,37,33,32',ex.board.map(r=>r.total).join());
}

// ---- setup: separate values ----
{ const h=open({storage:{}});click(h,'#btn-add');
  typeH(h,0,'14');typeH(h,1,'+2');
  ok('18 holes: typed 14 and +2 go to the 18-hole DH; no 9-hole DH yet',st(h).players[0].hcp===14&&st(h).players[0].hcp9===null&&st(h).players[1].hcp===-2&&st(h).players[1].hcp9===null);
  round(h,'front');
  ok('front 9: fields show the half (7, +1) with the please-check note, the plus note for +1',h.$('ph0').value==='7'&&txt(h.$('hc0'))==='Half of 18-hole DH 14: please check'&&h.$('ph1').value==='+1'&&txt(h.$('hc1'))==='Half of 18-hole DH +2: please check'&&/^Plus 1 \(\+1\)/.test(txt(h.$('hn1'))));
  ok('the prefill is not stored (9-hole DH still empty)',stored(h).players[0].hcp9===null);
  ok('notes are announced and describe the field (aria-describedby "hc0 hn0", aria-live polite)',h.$('ph0').getAttribute('aria-describedby')==='hc0 hn0'&&h.$('hc0').getAttribute('aria-live')==='polite');
  typeH(h,0,'8');
  ok('typing 8 on 9 holes sets only the 9-hole DH (8); the 18-hole DH stays 14; note clears',st(h).players[0].hcp9===8&&st(h).players[0].hcp===14&&txt(h.$('hc0'))==='');
  click(h,'button[data-h="1"][data-i="1"]');
  ok('stepper on 9 holes from the +1 prefill → 0, stored as the 9-hole DH only (18-hole stays +2)',st(h).players[1].hcp9===0&&st(h).players[1].hcp===-2&&h.$('ph1').value==='0');
  round(h,'18');
  ok('back to 18 holes: 14 and +2 again, no check notes',h.$('ph0').value==='14'&&h.$('ph1').value==='+2'&&txt(h.$('hc0'))===''&&txt(h.$('hc1'))==='');
  click(h,'button[data-h="-1"][data-i="0"]');ok('stepper on 18 holes changes only the 18-hole DH (13; 9-hole stays 8)',st(h).players[0].hcp===13&&st(h).players[0].hcp9===8);
  const later=open({storage:{[KEY]:h.w.localStorage.getItem(KEY)}});
  ok('a later visit remembers both (18: 13, +2; 9: 8, 0)',later.$('ph0').value==='13'&&(round(later,'back'),later.$('ph0').value==='8'&&later.$('ph1').value==='0'));
  click(h,'#btn-add');ok('a new player starts with 0 and no 9-hole DH',st(h).players[2].hcp===0&&st(h).players[2].hcp9===null);
  ok('the static setup row matches the rendered one (no layout shift)',(()=>{const f=open({storage:{}});const pre=new (require('jsdom').JSDOM)(src).window.document.getElementById('players').innerHTML;return pre===f.$('players').innerHTML;})());
}

// ---- migration: players saved before the split (no hcp9 key) ----
{ const old18=JSON.stringify(Object.assign(G.defaultState(),{players:[{name:'Mel',hcp:12},{name:'Al',hcp:-3}]}));
  const h=open({storage:{[KEY]:old18}});
  ok('saved on 18 holes: the number stays the 18-hole DH, 9-hole DH empty',st(h).players[0].hcp===12&&st(h).players[0].hcp9===null&&h.$('ph0').value==='12'&&txt(h.$('hc0'))==='');
  round(h,'front');ok('…on 9 holes: half (6, +2) prefilled with the please-check note',h.$('ph0').value==='6'&&txt(h.$('hc0'))==='Half of 18-hole DH 12: please check'&&h.$('ph1').value==='+2');
  ok('…and the stored 18-hole DH is never overwritten',stored(h).players[0].hcp===12&&stored(h).players[0].hcp9===null);
  const old9=JSON.stringify(Object.assign(G.defaultState(),{round:'front',players:[{name:'Mel',hcp:7}]}));
  const h2=open({storage:{[KEY]:old9}});
  ok('saved on a front 9: the number was the 9-hole DH, kept as is (7, no note)',st(h2).players[0].hcp9===7&&st(h2).players[0].hcp===null&&h2.$('ph0').value==='7'&&txt(h2.$('hc0'))==='');
  round(h2,'18');ok('…on 18 holes: twice it (14) with "Twice 9-hole DH 7: please check", not stored',h2.$('ph0').value==='14'&&txt(h2.$('hc0'))==='Twice 9-hole DH 7: please check'&&stored(h2).players[0].hcp===null);
  typeH(h2,0,'15');ok('…typing 15 sets the 18-hole DH, the 9-hole DH stays 7',st(h2).players[0].hcp===15&&st(h2).players[0].hcp9===7&&txt(h2.$('hc0'))==='');
  const old9c=JSON.stringify(Object.assign(G.defaultState(),{course:G.defaultCourse(9),players:[{name:'Mel',hcp:5}]}));
  ok('saved on a 9-hole card: kept as the 9-hole DH',st(open({storage:{[KEY]:old9c}})).players[0].hcp9===5);
}

// ---- DH round trip: which DH, and ask before switching to 9 holes ----
const base18=save(P([['Mel',14,null],['Sam',20,null]]),{scores:{1:[5,6],2:[4,5]}});
{ const h=open({url:URL+'?dh=7&holes=9&p=1',storage:{[KEY]:base18}});const pr=h.$('dh-prompt');
  ok('9-hole DH back onto a saved 18-hole round: asks first (round still 18, nothing set yet)',!pr.hidden&&st(h).round==='18'&&st(h).players[1].hcp9===null&&stored(h).round==='18');
  ok('the question: "Sam’s 9-hole Daily Handicap 7: switch this round to 9 holes?"',txt(pr.querySelector('h2'))==='Sam\u2019s 9-hole Daily Handicap 7: switch this round to 9 holes?',txt(pr.querySelector('h2')));
  ok('three choices: Switch to front 9, Switch to back 9, Keep 18 holes',[...pr.querySelectorAll('button')].map(txt).join('|')==='Switch to front 9|Switch to back 9|Keep 18 holes');
  ok('it explains what "Keep 18 holes" does',/If you keep 18 holes, 7 is saved as Sam’s 9-hole Daily Handicap for 9-hole rounds, and this round still uses the 18-hole one\./.test(txt(pr)));
  ok('focus moves to the question',h.d.activeElement===pr.querySelector('h2'));
  ok('the ?dh= query is removed from the address',h.w.location.search==='');
  click(h,'button[data-dhr=keep]');
  ok('Keep 18 holes: round stays 18, Sam\'s 9-hole DH saved as 7, 18-hole DH 20 untouched, field still 20',st(h).round==='18'&&st(h).players[1].hcp9===7&&st(h).players[1].hcp===20&&h.$('ph1').value==='20'&&pr.hidden);
  ok('…with a toast saying so',txt(h.$('toast'))==='Sam: 9-hole Daily Handicap 7 saved for 9-hole rounds; this round uses the 18-hole DH 20',txt(h.$('toast')));
}
{ const h=open({url:URL+'?dh=7&holes=9&p=1',storage:{[KEY]:base18}});click(h,'button[data-dhr=front]');
  ok('Switch to front 9: round front, Sam\'s 9-hole DH 7 in the field, toast, scores kept',st(h).round==='front'&&st(h).players[1].hcp9===7&&st(h).players[1].hcp===20&&h.$('ph1').value==='7'&&txt(h.$('toast'))==='Sam: 9-hole Daily Handicap 7'&&JSON.stringify(st(h).scores)==='{"1":[5,6],"2":[4,5]}'&&h.$('dh-prompt').hidden);
  ok('…Mel (no 9-hole DH) shows the half, 7, with the please-check note',h.$('ph0').value==='7'&&txt(h.$('hc0'))==='Half of 18-hole DH 14: please check');
}
{ const h=open({url:URL+'?dh=6&holes=9&p=0',storage:{[KEY]:base18}});click(h,'button[data-dhr=back]');ok('Switch to back 9: round back',st(h).round==='back'&&st(h).players[0].hcp9===6);}
{ const h=open({url:URL+'?dh=%2B1&holes=9',storage:{[KEY]:base18}});const pr=h.$('dh-prompt');
  ok('no player given: the round question first ("9-hole Daily Handicap +1: …")',txt(pr.querySelector('h2'))==='9-hole Daily Handicap +1: switch this round to 9 holes?'&&!pr.querySelector('[data-dh]'));
  click(h,'button[data-dhr=keep]');
  ok('…then which player: "Use 9-hole Daily Handicap +1 for:", round still 18',txt(pr.querySelector('h2'))==='Use 9-hole Daily Handicap +1 for:'&&st(h).round==='18'&&pr.querySelectorAll('[data-dh]').length===3&&h.d.activeElement===pr.querySelector('h2'));
  click(h,'button[data-dh="0"]');ok('…picking Mel saves +1 as her 9-hole DH only',st(h).players[0].hcp9===-1&&st(h).players[0].hcp===14&&st(h).round==='18');
}
{ const h=open({url:URL+'?dh=7&holes=9',storage:{[KEY]:base18}});click(h,'button[data-dhr=front]');click(h,'button[data-dh=x]');
  ok('switch then "Not now": round is front 9 (the user chose it), nothing set',st(h).round==='front'&&st(h).players.every(p=>p.hcp9===null)&&h.$('dh-prompt').hidden);}
{ const h=open({url:URL+'?dh=7&holes=9&p=1',storage:{[KEY]:base18}});
  ok('never silently: without a click the saved round stays 18 holes, even after reloading',st(h).round==='18'&&st(open({storage:{[KEY]:h.w.localStorage.getItem(KEY)}})).round==='18');}
{ const h=open({url:URL+'?dh=7&holes=9&p=1',storage:{[KEY]:save(P([['Mel',14,null],['Sam',20,null]]),{round:'front'})}});
  ok('9-hole DH onto a 9-hole round: set directly, no question',h.$('dh-prompt').hidden&&st(h).players[1].hcp9===7&&txt(h.$('toast'))==='Sam: 9-hole Daily Handicap 7');}
{ const h=open({url:URL+'?dh=7&holes=9&p=0',storage:{[KEY]:save(P([['Mel',14,null]]),{course:G.defaultCourse(9)})}});
  ok('9-hole DH onto a 9-hole card: set directly',h.$('dh-prompt').hidden&&st(h).players[0].hcp9===7);}
{ const h=open({url:URL+'?dh=15&holes=18&p=0',storage:{[KEY]:save(P([['Mel',14,6]]),{round:'front'})}});
  ok('18-hole DH onto a 9-hole round: sets the 18-hole DH only, round stays front 9, toast says so',h.$('dh-prompt').hidden&&st(h).round==='front'&&st(h).players[0].hcp===15&&st(h).players[0].hcp9===6&&h.$('ph0').value==='6'&&txt(h.$('toast'))==='Mel: Daily Handicap 15 saved for 18-hole rounds; this round uses the 9-hole DH 6',txt(h.$('toast')));}
{ const h=open({url:URL+'?dh=16&holes=18&p=0',storage:{[KEY]:base18}});ok('18-hole DH onto an 18-hole round: set directly',st(h).players[0].hcp===16&&txt(h.$('toast'))==='Mel: Daily Handicap 16');}
{ const h=open({url:URL+'?dh=16&p=0',storage:{[KEY]:base18}});ok('an old link with no &holes=: taken as this round\'s DH (as before)',st(h).players[0].hcp===16&&h.$('dh-prompt').hidden);}

// ---- DH page says which DH it worked out ----
{ for(const [hl,want] of [['18','18'],['9','9']]){const d=boot(path.join(SITE,'daily-handicap.html'),{url:'https://golfcalculators.com/daily-handicap?from=stableford'+(hl==='9'?'&holes=9&p=1':'')});
    d.set('ga','14.2');d.set('slope','128');d.set('scratch',hl==='9'?'35.5':'71');d.set('par',hl==='9'?'36':'72');
    const href=d.$('sfBack').getAttribute('href');ok(`DH page on ${hl} holes links back with &holes=${want} (${href})`,new RegExp('^/stableford\\?dh=[^&]+&holes='+want+(hl==='9'?'&p=1':'')+'$').test(href),href);}
  const d=boot(path.join(SITE,'daily-handicap.html'),{url:'https://golfcalculators.com/daily-handicap?from=stableford&holes=9&p=1'});d.set('holes','18','change');
  d.set('ga','14.2');d.set('slope','128');d.set('scratch','71');d.set('par','72');ok('…switched to 18 on the DH page: &holes=18',/&holes=18&p=1$/.test(d.$('sfBack').getAttribute('href')),d.$('sfBack').getAttribute('href'));
}

// ---- mutation checks ----
const mut=(name,a,b)=>{const s=src.replace(a,b);if(s===src)return null;const t=path.join(require('os').tmpdir(),'sf-split-'+name+'.html');fs.writeFileSync(t,s);return t;};
{ const f=mut('one',"var hcp = hcpFor(st, p), byHole","var hcp = parseHcp(p.hcp), byHole");const E=f&&open({},f).w.GCStableford;
  const s=Object.assign(G.defaultState(),{round:'front',players:P([['A',20,12]])});ok('mutation: scoring 9 holes off the 18-hole DH is caught',f&&E.compute(s).rows[0].hcp!==12);}
{ const f=mut('silent',"if (pendingDH.p != null && !(pendingDH.nine && !nineHole(S))) dhSet","if (pendingDH.p != null && (pendingDH.nine && !nineHole(S) ? (S.round = 'front') : true)) dhSet");const h=f&&open({url:URL+'?dh=7&holes=9&p=1',storage:{[KEY]:base18}},f);
  ok('mutation: switching to 9 holes without asking is caught (page still runs)',f&&h.w.GCStablefordUI&&!(h.$('dh-prompt').hidden===false&&st(h).round==='18'));}
{ const f=mut('prefill',"if (nineHole(S)) p.hcp9 = v; else p.hcp = v;","p.hcp = v;");const h=f&&open({storage:{[KEY]:save(P([['A',14,null]]),{round:'front'})}},f);if(h)typeH(h,0,'8');
  ok('mutation: a 9-hole value written into the 18-hole DH is caught',f&&!(st(h).players[0].hcp===14&&st(h).players[0].hcp9===8));}
process.exit(report('stableford-9hole-split')?1:0);
