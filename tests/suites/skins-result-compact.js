// skins-result-compact: on your own Skins result, 4 or more payments use the same compact payment lines as the shared
// viewer, so Share result stays on the first screen at 375x812 (PO, 12 Nov; the fold itself is measured in the
// browser checks for the example, 8 long names, and 8 long names with 7 payments). 1-3 payments keep the big lines.
const {SITE,boot,ok,report,path,fs}=require('../lib/harness');
const file=path.join(SITE,'skins.html');const src=fs.readFileSync(file,'utf8');
if(!/data-gc="skins-v2"/.test(src)||!/\.sk-many \.sk-pay/.test(src)){console.log('SKIP  no compact payment lines on this Skins page');process.exit(0);}
const U='https://golfcalculators.com/skins';
const h=boot(file,{url:U});const {w,$}=h;const E=w.GCSkins,UI=w.GCSkinsUI;
const L8=['Bartholomew-Fitzgerald','Maximiliana Oyelaran','Christopher-Montague','Anastasiya Wolfensohn','Wilhelmina Castellanos','Fitzwilliam Abernathy','Gwendolyn Featherstone','Montgomery Ashworth-Lee'];
const set=(players,score)=>{const s=E.exampleState();s.players=players;s.endRule='nobody';s.scores={};for(let x=1;x<=18;x++)s.scores[x]=players.map((_,i)=>score(x,i));UI.set(s);UI.show('result');return E.compute(s);};
ok('the compact rule applies on your own result too (not only in the shared viewer)',/\n  \.sk-many \.sk-pay\{display:block;font-size:var\(--fs-md\);font-weight:600;line-height:1\.35;margin-top:var\(--s1\)\}/.test(src)&&!/\.gc-view \.sk-many/.test(src));
UI.loadExample();
ok('example (3 payments): big payment lines kept, nothing else changes',!$('hero').classList.contains('sk-many')&&h.d.querySelectorAll('#hero .sk-pay').length===3&&!UI.viewing());
let r=set(L8.map((n,i)=>({name:n,hcp:i*3,hcp9:null})),(x,i)=>3+((x*7+i*3)%5));
ok(`8 long names (${r.payments.length} payments): compact lines on your own result`,r.payments.length>=4&&$('hero').classList.contains('sk-many')&&h.d.querySelectorAll('#hero .sk-pay').length===r.payments.length&&!$('btn-share').disabled);
r=set(L8.map(n=>({name:n,hcp:0,hcp9:null})),(x,i)=>x<=7?(i===7?3:5):x<=16?4:(i===x%8?3:5));
ok(`8 long names, ${r.payments.length} payments: compact lines`,r.payments.length===7&&$('hero').classList.contains('sk-many'));
r=set(L8.slice(0,4).map(n=>({name:n,hcp:0,hcp9:null})),(x,i)=>i===0?3:5);
ok(`exactly ${r.payments.length} payments: big lines (the threshold is 4)`,r.payments.length===3&&!$('hero').classList.contains('sk-many'));
r=set(L8.slice(0,5).map(n=>({name:n,hcp:0,hcp9:null})),(x,i)=>i===0?3:5);
ok(`${r.payments.length} payments: compact lines`,r.payments.length===4&&$('hero').classList.contains('sk-many'));
ok('the regression example is untouched: −75 / −75 / −35 / +185',JSON.stringify(E.compute(E.exampleState()).balances)==='[-75,-75,-35,185]');
process.exit(report('skins-result-compact')?1:0);
