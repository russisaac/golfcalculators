// v9 P2 Your courses: saved course cards by name and tee in localStorage (gc_courses_v1, shared by Skins and
// Stableford, inlined gc-courses.js); one-tap fill; today's edits never overwrite the saved card silently
// ("Update saved course?" at the end of the round); delete asks first; escaping; nothing sent anywhere.
const {SITE,boot,ok,report,path,fs}=require('../lib/harness');
const sk=path.join(SITE,'skins.html'),sf=path.join(SITE,'stableford.html');
if(!fs.existsSync(path.join(SITE,'gc-courses.js'))){console.log('SKIP  gc-courses.js not on this branch');process.exit(0);}
const CK='gc_courses_v1',src=fs.readFileSync(path.join(SITE,'gc-courses.js'),'utf8');
const txt=el=>el?el.textContent.replace(/\s+/g,' ').trim():'';
const click=(h,sel)=>{const b=h.d.querySelector(sel);if(!b)throw new Error('no '+sel);b.click();};
const saved=h=>JSON.parse(h.w.localStorage.getItem(CK)||'[]');
const PAR=[4,4,3,5,4,4,3,4,5,4,4,3,5,4,4,3,4,5],SI=[5,3,17,1,9,11,15,7,13,6,4,18,2,10,12,16,8,14];
const card=(name,tee,extra={})=>Object.assign({name,tee,holes:18,par:PAR.slice(),si:SI.slice()},extra);
for(const f of [sk,sf]){const d=fs.readFileSync(f,'utf8');const m=d.match(/<script data-src="\/gc-courses\.js">([\s\S]*?)<\/script>/);
  ok(`${path.basename(f)}: gc-courses.js inlined byte-identical`,!!m&&m[1]===src);}
ok('gc-courses.js never talks to a server (no fetch, XHR, beacon, image or form)',!/fetch\(|XMLHttpRequest|sendBeacon|new Image|\.submit\(|https?:\/\//.test(src.replace(/\/\*[\s\S]*?\*\//g,'')));
// ---- Stableford ----
{const h=boot(sf,{url:'https://golfcalculators.com/stableford'});const U=h.w.GCStablefordUI;
 click(h,'#btn-course');h.set('cname','Royal Pines');h.set('ctee','Blue');
 ok('stableford: course card has a Tee field (text, optional)',h.$('ctee').type==='text'&&!h.$('ctee').required);
 click(h,'#btn-cdone');
 ok('stableford: finishing the course card saves it by name and tee',saved(h).length===1&&saved(h)[0].name==='Royal Pines'&&saved(h)[0].tee==='Blue'&&saved(h)[0].par.length===18);
 click(h,'#btn-course');h.set('ctee','Red');click(h,'[data-cp="1"][data-h="1"]');click(h,'#btn-cdone');
 ok('stableford: same course, another tee = a second saved card (Blue untouched)',saved(h).length===2&&saved(h).find(c=>c.tee==='Blue').par[0]===U.state().course.par[0]-1);
 ok('stableford: setup lists Your courses with name · tee',!h.$('saved-wrap').hidden&&/Royal Pines · Red 18 holes/.test(txt(h.$('saved')))&&/Royal Pines · Blue/.test(txt(h.$('saved'))));}
{const h=boot(sf,{url:'https://golfcalculators.com/stableford',storage:{[CK]:JSON.stringify([card('Moore Park','White')])}});const U=h.w.GCStablefordUI;
 const b=h.d.querySelector('[data-cuse="0"]');
 ok('stableford: Your courses entries are buttons at least 44px tall (gc-btn)',b&&/gc-btn/.test(b.className)&&!!h.d.querySelector('[data-cdel="0"][aria-label="Delete Moore Park · White from Your courses"]'));
 b.click();
 ok('stableford: one tap fills par and SI (and name, tee)',JSON.stringify(U.state().course.par)===JSON.stringify(PAR)&&JSON.stringify(U.state().course.si)===JSON.stringify(SI)&&txt(h.$('course-name'))==='Moore Park · White');
 // today's edit: hole 3 is a par 4 today
 click(h,'#btn-course');click(h,'[data-cp="1"][data-h="3"]');click(h,'#btn-cdone');
 ok('stableford: editing a hole today does not touch the saved card',saved(h)[0].par[2]===3&&U.state().course.par[2]===4);
 // play the round
 const s=U.state();s.players=[{name:'Mel',hcp:12,hcp9:null},{name:'Sam',hcp:2,hcp9:null}];s.scores={};for(let x=1;x<=18;x++)s.scores[x]=[5,4];U.show('result');
 ok('stableford: end of round asks "Update saved course?" naming the changed hole',!h.$('course-ask').hidden&&/Update saved course\?/.test(txt(h.$('course-ask')))&&/on hole 3\./.test(txt(h.$('course-ask'))));
 ok('stableford: the question sits after Share result (Share stays first)',h.$('share-row').compareDocumentPosition(h.$('course-ask'))&4);
 click(h,'#cask-no');
 ok('stableford: Keep saved card leaves it unchanged and the question goes away (also after reload)',saved(h)[0].par[2]===3&&h.$('course-ask').hidden&&(()=>{const h2=boot(sf,{url:'https://golfcalculators.com/stableford',storage:{gc_stableford_v1:h.w.localStorage.getItem('gc_stableford_v1'),[CK]:h.w.localStorage.getItem(CK)}});return h2.$('course-ask').hidden;})());
 click(h,'#btn-course');click(h,'[data-cs="1"][data-h="1"]');click(h,'[data-cs="-1"][data-h="1"]');click(h,'[data-cp="-1"][data-h="4"]');click(h,'#btn-cdone');U.show('result');
 ok('stableford: a further change asks again (holes 3, 4)',!h.$('course-ask').hidden&&/holes 3, 4/.test(txt(h.$('course-ask'))));
 click(h,'#cask-yes');
 ok('stableford: Update saved course writes today\'s card (still one entry)',saved(h).length===1&&saved(h)[0].par[2]===4&&saved(h)[0].par[3]===4&&h.$('course-ask').hidden);
 // delete asks first
 U.show('setup');click(h,'[data-cdel="0"]');
 ok('stableford: delete asks first (Delete / Keep), nothing deleted yet',/Delete Moore Park · White from Your courses\?/.test(txt(h.$('saved')))&&saved(h).length===1&&h.d.activeElement===h.d.querySelector('[data-cdel-yes="0"]'));
 click(h,'[data-cdel-no="0"]');ok('stableford: Keep cancels the delete',saved(h).length===1&&!!h.d.querySelector('[data-cuse="0"]'));
 click(h,'[data-cdel="0"]');click(h,'[data-cdel-yes="0"]');ok('stableford: Delete removes it and hides Your courses',saved(h).length===0&&h.$('saved-wrap').hidden);}
{const h=boot(sf,{url:'https://golfcalculators.com/stableford'});const U=h.w.GCStablefordUI;
 const s=U.state();s.course.name='Lakes';s.players=[{name:'A',hcp:0,hcp9:null},{name:'B',hcp:0,hcp9:null}];for(let x=1;x<=18;x++)s.scores[x]=[4,4];U.show('result');
 ok('stableford: a named card that was never saved is offered at the end ("Save this course?")',/Save this course\?/.test(txt(h.$('course-ask')))&&saved(h).length===0);
 click(h,'#cask-yes');ok('stableford: Save course saves it',saved(h).length===1&&saved(h)[0].name==='Lakes');}
{const h=boot(sf,{url:'https://golfcalculators.com/stableford'});const U=h.w.GCStablefordUI;U.loadExample();
 ok('stableford: an unnamed / example round is never offered for saving when unnamed',(()=>{const s=U.state();s.course.name='';U.show('result');return h.$('course-ask').hidden;})());}
// ---- Skins ----
{const evil='<img src=x onerror=alert(1)>';
 const h=boot(sk,{url:'https://golfcalculators.com/skins',storage:{[CK]:JSON.stringify([card('Moore Park','White'),card(evil,'Red'),{name:'Nine Hole',holes:9,par:[4,4,4,4,4,4,4,4,4],si:[1,2,3,4,5,6,7,8,9]}])}});const U=h.w.GCSkinsUI;
 ok('skins: Your courses lists the 18-hole cards saved from either tool (9-hole cards are Stableford only)',!h.$('saved-wrap').hidden&&h.d.querySelectorAll('[data-cuse]').length===2&&/Moore Park · White/.test(txt(h.$('saved'))));
 ok('skins: course names are escaped (no element injected)',!h.$('saved').querySelector('img')&&txt(h.$('saved')).includes(evil));
 ok('skins: the course card sits below Start round (Start stays on the first screen)',h.$('btn-start').compareDocumentPosition(h.$('course-card'))&4);
 click(h,'[data-cuse="0"]');
 ok('skins: one tap fills par and SI for all 18 holes and the name/tee',JSON.stringify(U.state().par)===JSON.stringify(PAR)&&JSON.stringify(U.state().si)===JSON.stringify(SI)&&h.$('cname').value==='Moore Park'&&h.$('ctee').value==='White');
 // play: hole 5 is a par 3 today (edited on the hole screen)
 const s=U.state();s.hole=5;U.show('hole');const r3=h.d.querySelector('input[name=par][value="3"]');r3.checked=true;h.fire(r3,'change');
 ok('skins: editing par on a hole changes today only',U.state().par[4]===3&&saved(h)[0].par[4]===4);
 for(let x=1;x<=18;x++)s.scores[x]=[4,5,4,5];U.show('result');
 ok('skins: end of round asks "Update saved course?" (hole 5)',!h.$('course-ask').hidden&&/Update saved course\?/.test(txt(h.$('course-ask')))&&/on hole 5\./.test(txt(h.$('course-ask'))));
 ok('skins: the question sits after Share result',h.$('share-row').compareDocumentPosition(h.$('course-ask'))&4);
 click(h,'#cask-yes');ok('skins: Update saved course writes the change',saved(h)[0].par[4]===3&&h.$('course-ask').hidden);
 // a 9-hole round only updates the nine played
 s.holes='back';s.par[15]=5;s.par[2]=5;U.show('result');
 ok('skins: on the back 9 only holes 10–18 are compared',/on hole 16\./.test(txt(h.$('course-ask'))));
 click(h,'#cask-yes');ok('skins: …and only those are written (hole 3 left as saved)',saved(h)[0].par[15]===5&&saved(h)[0].par[2]===3);}
{const h=boot(sk,{url:'https://golfcalculators.com/skins'});const U=h.w.GCSkinsUI;
 ok('skins: no saved courses: Your courses hidden, name and tee fields shown',h.$('saved-wrap').hidden&&!!h.$('cname')&&!!h.$('ctee'));
 h.set('cname','Lakes');h.set('ctee','Blue');const s=U.state();for(let x=1;x<=18;x++)s.scores[x]=[4,5,4,5];U.show('result');
 ok('skins: a named new course is offered at the end of an 18-hole round',/Save this course\?/.test(txt(h.$('course-ask'))));
 click(h,'#cask-no');ok('skins: Not now saves nothing and does not ask again',saved(h).length===0&&h.$('course-ask').hidden);
 const h2=boot(sk,{url:'https://golfcalculators.com/skins'});h2.set('cname','Front Only');const s2=h2.w.GCSkinsUI.state();s2.holes='front';for(let x=1;x<=9;x++)s2.scores[x]=[4,5,4,5];h2.w.GCSkinsUI.show('result');
 ok('skins: a new course is not offered after a 9-hole round (the other nine are unknown)',h2.$('course-ask').hidden);
 ok('skins: unnamed rounds are never offered',(()=>{const h3=boot(sk,{url:'https://golfcalculators.com/skins'});h3.w.GCSkinsUI.loadExample();return h3.$('course-ask').hidden;})());}
{const h=boot(sk,{url:'https://golfcalculators.com/skins',storage:{[CK]:JSON.stringify([card('Moore Park','White')])}});
 click(h,'[data-cdel="0"]');ok('skins: delete asks first',saved(h).length===1&&/Delete Moore Park · White/.test(txt(h.$('saved'))));
 click(h,'[data-cdel-yes="0"]');ok('skins: then deletes',saved(h).length===0&&h.$('saved-wrap').hidden);}
// regression anchors with a course picked and named
{const h=boot(sk,{url:'https://golfcalculators.com/skins',storage:{[CK]:JSON.stringify([card('X','')])}});const E=h.w.GCSkins;const st=E.exampleState();st.course={name:'X',tee:''};const r=E.compute(st);
 ok('skins: example still -75/-75/-35/+185 with a course name in state',r.balances.join()==='-75,-75,-35,185');
 ok('skins: share link payload carries no course name (unchanged format)',!JSON.stringify(E.toPayload(st)).includes('"X"'));}
{const h=boot(sf,{url:'https://golfcalculators.com/stableford',storage:{[CK]:JSON.stringify([card('X','')])}});const G=h.w.GCStableford,st=G.defaultState(); // PO 4-ball anchor (preview-12nov/po-verify/p4)
 const GROSS=[[5,5,4,6],[4,5,4,6],[5,4,3,5],[5,6,4,7],[4,5,4,6],[5,4,3,5],[4,3,3,5],[5,4,4,'P'],[5,6,5,7],[5,4,4,6],[4,5,4,5],[4,3,3,5],[6,5,5,7],[4,5,4,6],[5,4,3,5],[3,4,3,5],[5,4,4,6],[5,5,5,7]];
 st.players=[{name:'Mel',hcp:6,hcp9:null},{name:'Sam',hcp:14,hcp9:null},{name:'Jo',hcp:-2,hcp9:null},{name:'Pat',hcp:24,hcp9:null}];GROSS.forEach((g,i)=>st.scores[i+1]=g.slice());st.course.name='PO Lakes';st.course.tee='Blue';
 const r=G.compute(st);ok('stableford: PO 4-ball still 31/41/37/26 with a named, teed course',r.rows.map(x=>x.total).join()==='31,41,37,26',r.rows.map(x=>x.total).join());}
// bad data in storage is ignored, never crashes
{const h=boot(sk,{url:'https://golfcalculators.com/skins',storage:{[CK]:'{"oops":1'}});ok('skins: corrupt saved-course storage is ignored',h.$('saved-wrap').hidden&&!h.$('scr-setup').hidden);
 const h2=boot(sf,{url:'https://golfcalculators.com/stableford',storage:{[CK]:JSON.stringify([{name:'Bad',holes:18,par:[9],si:[1]},card('Good','')])}});ok('stableford: invalid saved cards are skipped',h2.d.querySelectorAll('[data-cuse]').length===1);}
process.exitCode=report('courses')?1:0;
