// Skins regression: the standard example (Alex 0, Blake 4, Casey 8, Drew 12,
// $5/skin, full handicaps, carryovers on, nobody wins leftover carry) must
// settle to -75 / -75 / -35 / +185 (audit-notes.md, raw/t.js).
const {SITE,boot,ok,report,path,fs}=require('../lib/harness');
const file=path.join(SITE,'skins.html');const v2=/data-gc="skins-v2"/.test(fs.readFileSync(file,'utf8'));
const want=[-75,-75,-35,185];
const h=boot(file,{url:'https://golfcalculators.com/skins'});
if(!v2){
  h.w.loadExample();h.w.settleUp();const r=h.w.calculate(false);
  ok('legacy page: example balances -75/-75/-35/+185',JSON.stringify(r.balances)===JSON.stringify(want),r.balances.join());
  ok('legacy page: skins 0/0/2/13',r.skins.join()==='0,0,2,13',r.skins.join());
  ok('legacy page: payments shown',/Alex pays Drew \$75\.00.*Blake pays Drew \$75\.00.*Casey pays Drew \$35\.00/.test(h.$('results').textContent));
}else{
  const E=h.w.GCSkins;const st=E.exampleState();const r=E.compute(st);
  ok('v2 engine: example balances -75/-75/-35/+185',JSON.stringify(r.balances)===JSON.stringify(want),r.balances.join());
  ok('v2 engine: skins 0/0/2/13, 3 carried after 18',r.skins.join()==='0,0,2,13'&&r.carry===3,r.skins.join()+' carry '+r.carry);
  ok('v2 engine: fewest transfers',r.payments.map(p=>`${p.from}>${p.to}:${p.amount}`).join()==='0>3:75,1>3:75,2>3:35',JSON.stringify(r.payments));
  // through the UI
  h.w.GCSkinsUI.loadExample();h.w.GCSkinsUI.show('result');
  const hero=h.$('hero').textContent.replace(/\s+/g,' ');
  ok('v2 UI: hero shows "Alex pays Drew $75.00" etc.',/Alex pays Drew \$75\.00/.test(hero)&&/Blake pays Drew \$75\.00/.test(hero)&&/Casey pays Drew \$35\.00/.test(hero),hero.slice(0,160));
  const tot=h.$('totals').textContent.replace(/\s+/g,' ');
  ok('v2 UI: net totals with real minus (−$75.00 … +$185.00)',/Alex\s*0 skins\s*−\$75\.00/.test(tot)&&/Blake\s*0 skins\s*−\$75\.00/.test(tot)&&/Casey\s*2 skins\s*−\$35\.00/.test(tot)&&/Drew\s*13 skins\s*\+\$185\.00/.test(tot),tot);
}
process.exitCode=report('skins-regression')?1:0;
