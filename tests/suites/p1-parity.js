// P1 "calculator behaviour unchanged": run identical scenarios on the live
// baseline (live12/) and on site/, and require identical observable output.
const {SITE,BASE,boot,ok,report,path,fs}=require('../lib/harness');
const txt=el=>el?el.textContent.replace(/\s+/g,' ').trim():null;
const vals=d=>[...d.querySelectorAll('main input, main select')].map(e=>e.id+'='+(e.type==='checkbox'?e.checked:e.value)).join('|');
const isLegacySkins=f=>!/data-gc="skins-v2"/.test(fs.readFileSync(f,'utf8'));

const skinsScenarios={
  example(h){h.w.loadExample();h.w.settleUp();},
  offlow90(h){h.w.loadExample();h.set('strokesMode','offlow','change');h.set('allowance','90');h.w.settleUp();},
  front9(h){h.w.loadExample();h.set('holesMode','front','change');h.w.settleUp();},
  back9plus(h){h.set('holesMode','back','change');h.set('numPlayers','3','change');h.set('hcp1','+2');h.set('hcp2','15');h.set('hcp3','27');
    for(let x=10;x<=18;x++){h.set(`h${x}p1`,String(3+x%3));h.set(`h${x}p2`,String(4+x%2));h.set(`h${x}p3`,'5');}h.w.settleUp();},
  netMode(h){h.set('scoreMode','net','change');h.set('numPlayers','2','change');h.set('h1p1','3');h.set('h1p2','4');h.set('h2p1','4');h.set('h2p2','4');h.w.settleUp();},
  grossOnlyNoCarry(h){h.w.loadExample();h.set('scoreMode','grossonly','change');h.set('carryovers',false);h.w.settleUp();},
  playoff(h){h.w.loadExample();h.set('endRule','playoff','change');h.w.settleUp();const a=txt(h.$('settleError'));h.set('playoffWinner','2','change');h.w.settleUp();return a;},
  stakeAndNames(h){h.w.loadExample();h.set('p1','<b>Al</b>');h.set('stake','2.5');h.set('h5p4','9');h.w.settleUp();},
  partial(h){h.w.loadExample();h.set('h7p2','');h.w.settleUp();},
  newRound(h){h.w.loadExample();h.w.newRound();},
};
function observeSkins(file,name){
  const h=boot(file,{url:'https://golfcalculators.com/skins'});const extra=skinsScenarios[name](h);
  const d=h.d;const res={results:txt(h.$('results')),running:txt(h.$('running')),sticky:txt(h.$('stickyText')),incomplete:txt(h.$('incompleteWarn')),
    table:txt(h.$('scoreTable')),vals:vals(d),share:h.w._shareText,calc:JSON.stringify(h.w.calculate(false)),extra};
  const st=h.w.localStorage.getItem('golfcalculators_skins_v2');res.storage=st;
  // reload from storage
  const h2=boot(file,{url:'https://golfcalculators.com/skins',storage:{golfcalculators_skins_v2:st}});res.reload=vals(h2.d)+'#'+txt(h2.$('running'));
  return res;
}
const sfScenarios={
  defaults(h){for(let i=1;i<=18;i++)h.set('s'+i,String(3+i%4));h.w.calc();},
  plus(h){h.set('hcp','+2');for(let i=1;i<=18;i++)h.set('s'+i,'4');h.w.calc();},
  nine(h){h.set('holes','9','change');h.set('hcp','27');for(let i=1;i<=9;i++)h.set('s'+i,String(5+i%3));h.set('s4','');h.w.calc();},
  big(h){h.set('hcp','40');for(let i=1;i<=18;i++)h.set('s'+i,'7');h.w.calc();},
};
const observeSf=(file,name)=>{const h=boot(file,{url:'https://golfcalculators.com/stableford'});sfScenarios[name](h);return {out:txt(h.$('out')),table:txt(h.$('table')),vals:vals(h.d)};};
const dhScenarios={
  men18(h){h.set('gender','men','change');h.set('holes','18','change');h.set('ga','14.2');h.set('slope','128');h.set('scratch','71.4');h.set('par','72');},
  women9(h){h.set('gender','women','change');h.set('holes','9','change');h.set('ga','22.7');h.set('slope','124');h.set('scratch','35.5');h.set('par','36');},
  plus(h){h.set('ga','+1.6');h.set('slope','135');h.set('scratch','73.1');h.set('par','72');},
  invalid(h){h.set('ga','abc');h.set('slope','300');h.set('scratch','x');h.set('par','72');},
};
const observeDh=(file,name)=>{const h=boot(file,{url:'https://golfcalculators.com/daily-handicap'});dhScenarios[name](h);
  return {main:txt(h.d.querySelector('main')),vals:vals(h.d),ls:h.w.localStorage.getItem('golfcalculators_daily_hcp')};};

const pages=[['stableford',observeSf,sfScenarios],['daily-handicap',observeDh,dhScenarios]];
if(isLegacySkins(path.join(SITE,'skins.html')))pages.unshift(['skins',observeSkins,skinsScenarios]);
else ok('skins: rebuilt page detected (data-gc="skins-v2"); legacy parity skipped, engine cross-check runs in skins-v2 suite',true);
for(const [pg,obs,sc] of pages)for(const name of Object.keys(sc)){
  let a,b,err='';try{a=JSON.stringify(obs(path.join(BASE,pg),name));b=JSON.stringify(obs(path.join(SITE,pg+'.html'),name));}catch(e){err=e.message;}
  let info=err;if(!err&&a!==b){let i=0;while(a[i]===b[i])i++;info=`differs at ${i}: live="${a.slice(i-40,i+60)}" site="${b.slice(i-40,i+60)}"`;}
  ok(`${pg} unchanged vs live: ${name}`,!err&&a===b,info);
}
process.exitCode=report('p1-parity')?1:0;
