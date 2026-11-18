// v9 P3 Mixed tees (Golf Australia WHS guide, Jan 2026, §3(I)): players on different tees each use their own tee's
// par and stroke index; skins compare net scores relative to each player's own par; Stableford points come from
// each player's own card; no par-difference strokes are added. Off = byte-for-byte the old rules and link format.
const {SITE,boot,ok,report,path,fs}=require('../lib/harness');
const sk=path.join(SITE,'skins.html'),sf=path.join(SITE,'stableford.html');
const txt=el=>el?el.textContent.replace(/\s+/g,' ').trim():'';
const later=f=>f().catch(e=>{ok('async: '+e.message,false);}).then(()=>{process.exitCode=report('mixed-tees')?1:0;});
const PAR=[4,4,3,5,4,4,3,4,5,4,4,3,5,4,4,3,4,5],SI=[5,3,17,1,9,11,15,7,13,6,4,18,2,10,12,16,8,14];
const PAR2=[5,4,3,5,4,5,3,4,5,4,4,3,5,4,5,3,4,5],SI2=[3,5,17,1,9,13,15,7,11,6,4,18,2,10,12,16,8,14];
later(async()=>{
// ---------- Skins engine ----------
{const h=boot(sk,{url:'https://golfcalculators.com/skins'});const E=h.w.GCSkins;
 const st=E.defaultState();st.players=[{name:'Man',hcp:0},{name:'Woman',hcp:0,tee:1}];st.scoring='gross';st.par=PAR.slice();st.si=SI.slice();
 st.mixed=true;st.course={name:'Lakes',tee:'Blue'};st.tee2={name:'Red',par:PAR2.slice(),si:SI2.slice()};
 st.scores={1:[5,6]};
 let r=E.compute(st),e=r.ledger[0];
 ok('§3(I) skins: a 6 on her par 5 ties his 5 on his par 4 (both 1 over own par): no skin, carries',r.mixed&&e.played&&e.tied&&e.tied.length===2&&e.rel.join()==='1,1');
 st.scores={1:[5,5]};r=E.compute(st);
 ok('§3(I) skins: her 5 on a par 5 beats his 5 on a par 4 (level v 1 over)',r.ledger[0].winner===1);
 st.mixed=false;r=E.compute(st);
 ok('off: same scores compare raw (tie on 5) - the old rule',!!r.ledger[0].tied&&!r.mixed);
 // own stroke index: 1 shot, hole 1 is SI 3 for Red but SI 5 for Blue; hole 2 is SI 3 for Blue
 const s2=E.defaultState();s2.players=[{name:'A',hcp:1},{name:'B',hcp:1,tee:1}];s2.par=PAR.slice();s2.si=SI.slice();s2.mixed=true;s2.course={name:'',tee:''};s2.tee2={name:'',par:PAR2.slice(),si:SI2.slice().map((v,i)=>i===3?1:v)};
 s2.tee2.si[3]=1;s2.si[3]=1;s2.scores={4:[5,5]};
 let r2=E.compute(s2);ok('each player gets shots by their own tee\'s SI (1 shot each on SI 1)',r2.ledger[3].strokes.join()==='1,1');
 s2.tee2.si=SI2.slice();s2.tee2.si[3]=2;s2.tee2.si[0]=1;r2=E.compute(s2);
 ok('…and when SI 1 is a different hole on the second tee, only that player\'s shot moves',r2.ledger[3].strokes.join()==='1,0'&&r2.ledger[0].strokes.join()==='0,1');
 ok('no par-difference strokes are added (playing handicaps unchanged by tee)',r2.playing.join()==='1,1');
 // anchor unchanged
 const ex=E.exampleState();ok('anchor: Skins example -75/-75/-35/+185 (mixed off)',E.compute(ex).balances.join()==='-75,-75,-35,185');
 const ex2=E.exampleState();ex2.mixed=true;ex2.tee2={name:'Same',par:ex2.par.slice(),si:ex2.si.slice()};ex2.course={name:'',tee:''};
 ok('anchor: mixed on with an identical second card and nobody on it still -75/-75/-35/+185',E.compute(ex2).balances.join()==='-75,-75,-35,185');
 ok('off: share payload has no tees key and 4-field player rows (format unchanged)',(()=>{const p=E.toPayload(ex);return p.tees===undefined&&p.pl.every(r=>r.length===4);})());
 // round trip with tee data
 const pay=E.toPayload(st.mixed?st:(st.mixed=true,st)),raw=await h.w.GCShare.encode(pay),back=E.fromPayload(await h.w.GCShare.decode(raw));
 ok('share round trip keeps both tee cards and each player\'s tee',back&&back.mixed&&back.tee2.name==='Red'&&back.tee2.par.join()===PAR2.join()&&back.players[1].tee===1&&back.course.tee==='Blue'&&JSON.stringify(E.compute(back).skins)===JSON.stringify(E.compute(st).skins));
 const bad=[Object.assign({},pay,{tees:'x'}),Object.assign({},pay,{tees:Object.assign({},pay.tees,{par:'9'.repeat(18)})}),Object.assign({},pay,{tees:Object.assign({},pay.tees,{si:'<'.repeat(18)})}),
  Object.assign({},pay,{pl:pay.pl.map(r=>r.slice(0,4))}),Object.assign({},pay,{pl:pay.pl.map(r=>r.slice(0,4).concat([2]))}),Object.assign({},pay,{tees:Object.assign({},pay.tees,{b:{}})})];
 ok('hostile / malformed tee payloads are rejected (bad tees, par, SI, missing or out-of-range player tee)',bad.every(b=>E.fromPayload(JSON.parse(JSON.stringify(b)))===null));
 const evil=Object.assign({},pay,{tees:Object.assign({},pay.tees,{b:'<img src=x onerror=alert(1)>'})});const ev=E.fromPayload(JSON.parse(JSON.stringify(evil)));
 h.w.GCSkinsUI.set(ev);ok('tee names from a link are escaped on screen (no element injected)',!h.d.querySelector('#scr-result img, #scr-setup img'));}
// ---------- Skins UI ----------
{const h=boot(sk,{url:'https://golfcalculators.com/skins'});
 ok('skins: setup has "Players on different tees" (off by default) citing §3(I)',!h.$('mixed').checked&&/§3\(I\)/.test(txt(h.$('mixed-help')))&&h.$('tee2-box').hidden);
 h.set('mixed',true);
 ok('skins: turning it on shows the second tee card and a tee choice under each player',!h.$('tee2-box').hidden&&h.d.querySelectorAll('input[name^="pt"]').length===8);
 ok('skins: second tee name is a text field with inputmode-free text (not type=number)',h.$('t2name').type==='text');
 h.set('t2name','Red');const r1=h.d.querySelector('input[name="pt1"][value="1"]');r1.click();
 ok('skins: picking a player\'s tee stores it',h.w.GCSkinsUI.state().players[1].tee===1);
 h.w.GCSkinsUI.show('hole');
 ok('skins: hole screen shows the second tee\'s par and SI row, labelled by tee',!h.$('tee2-row').hidden&&/Red/.test(txt(h.$('tee2-row'))));
 h.d.querySelector('input[name="par2"][value="5"]').click();
 ok('skins: second-tee par on the hole screen edits the second card only',h.w.GCSkinsUI.state().tee2.par[0]===5&&h.w.GCSkinsUI.state().par[0]===4);
 h.w.GCSkinsUI.show('setup');h.set('mixed',false);
 ok('skins: turning it off hides it again and the round is the old rules',h.$('tee2-box').hidden&&!h.w.GCSkins.isMixed(h.w.GCSkinsUI.state()));}
// ---------- Stableford engine ----------
{const h=boot(sf,{url:'https://golfcalculators.com/stableford'});const G=h.w.GCStableford;
 const st=G.defaultState();st.players=[{name:'Man',hcp:0,hcp9:null},{name:'Woman',hcp:0,hcp9:null,tee:1}];st.course.tee='Blue';
 st.course.par=PAR.slice();st.course.si=SI.slice();st.mixed=true;st.course2={tee:'Red',holes:18,par:PAR2.slice(),si:SI2.slice()};st.scores={1:[6,6]};
 let r=G.compute(st);
 ok('§3(I) stableford: points from each player\'s own par (6 on par 4 = 0, 6 on par 5 = 1)',r.rows[0].byHole[1].pts===0&&r.rows[1].byHole[1].pts===1&&r.rows[1].byHole[1].par===5);
 st.players.forEach(p=>p.hcp=1);st.course2.si[0]=1;st.course.si[0]=5;r=G.compute(st);
 ok('stableford: shots by own SI (SI 1 on hole 1 for Red only)',r.rows[1].byHole[1].strokes===1&&r.rows[0].byHole[1].strokes===0);
 st.mixed=false;r=G.compute(st);ok('off: everyone on the first card (old rule)',r.rows[1].byHole[1].par===4);
 st.mixed=true;st.course2.si=SI2.slice();
 const pay=G.toPayload(st),back=G.fromPayload(JSON.parse(JSON.stringify(await h.w.GCShare.decode(await h.w.GCShare.encode(pay)))));
 ok('stableford: share round trip keeps both cards and tees, same totals',back&&back.mixed&&back.course2.tee==='Red'&&back.players[1].tee===1&&G.compute(back).rows.map(x=>x.total).join()===G.compute(st).rows.map(x=>x.total).join());
 const bad=[Object.assign({},pay,{tees:[]}),Object.assign({},pay,{tees:Object.assign({},pay.tees,{par:'4'})}),Object.assign({},pay,{pl:pay.pl.map(r=>r.slice(0,3).concat(['1']))})];
 ok('stableford: malformed tee payloads are rejected',bad.every(b=>G.fromPayload(JSON.parse(JSON.stringify(b)))===null));
 const dup=G.defaultState();dup.mixed=true;dup.course2={tee:'Red',holes:18,par:PAR.slice(),si:SI.slice()};dup.course2.si[1]=dup.course2.si[0];
 ok('per-tee SI check: a duplicate on the second card is caught on that card only',!G.siProblems(dup.course2).ok&&G.siProblems(dup.course).ok);
 const off=G.defaultState();off.players=[{name:'A',hcp:3,hcp9:null},{name:'B',hcp:0,hcp9:null}];
 ok('off: share payload has no tees key and 3-field player rows (format unchanged)',(()=>{const p=G.toPayload(off);return p.tees===undefined&&p.pl.every(r=>r.length===3);})());
 const s4=G.defaultState(),GROSS=[[5,5,4,6],[4,5,4,6],[5,4,3,5],[5,6,4,7],[4,5,4,6],[5,4,3,5],[4,3,3,5],[5,4,4,'P'],[5,6,5,7],[5,4,4,6],[4,5,4,5],[4,3,3,5],[6,5,5,7],[4,5,4,6],[5,4,3,5],[3,4,3,5],[5,4,4,6],[5,5,5,7]];
 s4.players=[{name:'Mel',hcp:6,hcp9:null},{name:'Sam',hcp:14,hcp9:null},{name:'Jo',hcp:-2,hcp9:null},{name:'Pat',hcp:24,hcp9:null}];GROSS.forEach((g,i)=>s4.scores[i+1]=g.slice());
 ok('anchor: PO 4-ball 31/41/37/26 (mixed off)',G.compute(s4).rows.map(x=>x.total).join()==='31,41,37,26');
 s4.mixed=true;s4.course2={tee:'Red',holes:18,par:PAR2.slice(),si:SI2.slice()};
 ok('anchor: mixed on, nobody on the second tee: still 31/41/37/26',G.compute(s4).rows.map(x=>x.total).join()==='31,41,37,26');}
// ---------- Stableford UI ----------
{const h=boot(sf,{url:'https://golfcalculators.com/stableford'});const U=h.w.GCStablefordUI;
 ok('stableford: setup has "Players on different tees" (off) citing §3(I)',!h.$('mixed').checked&&/§3\(I\)/.test(txt(h.$('mixed-help')))&&h.$('tee2-box').hidden);
 h.set('mixed',true);
 ok('stableford: on = second tee summary + a tee choice per player',!h.$('tee2-box').hidden&&!!h.d.querySelector('input[name="pt0"][value="1"]'));
 h.$('btn-course2').click();
 ok('stableford: "Edit second tee" opens the course card on the second tab',!h.$('ctab-wrap').hidden&&h.d.querySelector('input[name="ctab"][value="1"]').checked);
 h.set('ctee','Red');h.d.querySelector('[data-cp="1"][data-h="1"]').click();
 ok('stableford: editing on tab 2 changes the second card only (tee name and par)',U.state().course2.tee==='Red'&&U.state().course2.par[0]===5&&U.state().course.par[0]===4&&!U.state().course.tee);
 h.d.querySelector('input[name="ctab"][value="0"]').click();
 ok('stableford: tab 1 shows the first card again',h.$('ctee').value===''&&h.$('cp1').value==='4');
 U.state().course2.si[1]=U.state().course2.si[0];U.show('hole');
 ok('stableford: hole screen shows the second tee row and a per-tee SI warning naming the tee',!h.$('tee2-row').hidden&&/Red/.test(txt(h.$('tee2-row')))&&!h.$('si-warn').hidden&&/^Red: /.test(txt(h.$('si-warn'))));}
// ---------- FAQ cites §3(I) ----------
for(const f of [sk,sf]){const d=fs.readFileSync(f,'utf8');const m=d.match(/<script type="application\/ld\+json">([\s\S]*?"FAQPage"[\s\S]*?)<\/script>/);
 ok(`${path.basename(f)}: FAQ answers the different-tees question citing Golf Australia §3(I)`,!!m&&/different tees/i.test(m[1])&&/3\(I\)/.test(m[1]));}
});
