// P3: every number in each page's "How it's calculated" worked example (data-ex="...")
// must equal what that page's own calculator code outputs for the same inputs.
const {SITE,boot,ok,report,path,fs}=require('../lib/harness');
const txt=e=>e?e.textContent.replace(/\s+/g,' ').trim():null;
function exMap(d){const m={};for(const e of d.querySelectorAll('[data-ex]'))m[e.getAttribute('data-ex')]=txt(e);return m;}
function compare(page,ex,want){
  const keys=Object.keys(ex);
  ok(`${page}: worked example present (${keys.length} checked values)`,keys.length>0);
  const unchecked=keys.filter(k=>!(k in want));ok(`${page}: every data-ex value has a check`,!unchecked.length,unchecked.join(','));
  for(const k of Object.keys(want))ok(`${page}: ${k} = ${want[k]}`,ex[k]===String(want[k]),`page shows ${ex[k]}`);
}
const has=f=>fs.existsSync(path.join(SITE,f))&&/data-ex=/.test(fs.readFileSync(path.join(SITE,f),'utf8'));
if(!['skins.html','stableford.html','daily-handicap.html'].some(has)){console.log('SKIP  no worked examples on this branch');process.exit(0);}

// Skins: the regression example through GCSkins.compute
{const h=boot(path.join(SITE,'skins.html'),{url:'https://golfcalculators.com/skins'});const G=h.w.GCSkins;const st=G.exampleState();const r=G.compute(st);const L=r.ledger;
 const w={};r.playing.forEach((v,i)=>w['play-'+i]=v);L[0].net.forEach((v,i)=>w['h1-net-'+i]=v);
 Object.assign(w,{'h1-value':L[0].value,'h5-carry':L[4].carryIn,'h5-gross-3':L[4].gross[3],'h5-net-3':L[4].net[3],'h5-value':L[4].value,'skins-2':r.skins[2],'skins-3':r.skins[3],left:r.leftover,total:r.totalSkins});
 r.balances.forEach((v,i)=>w['bal-'+i]=G.signed(v));r.payments.forEach((p,i)=>w['pay-'+i]='$'+p.amount.toFixed(2));
 compare('skins',exMap(h.d),w);
 ok('skins: example is $5, net full handicaps, carryovers on, nobody wins leftovers',st.stake==='5'&&st.scoring==='full'&&st.carry===true&&st.endRule==='nobody'&&r.stake===5);
 ok('skins: players Alex 0, Blake 4, Casey 8, Drew 12',st.players.map(p=>p.name+' '+p.hcp).join(',')==='Alex 0,Blake 4,Casey 8,Drew 12');
 ok('skins: hole 1 won by Casey; holes 2-4 tied; hole 5 won by Drew',L[0].winner===2&&[1,2,3].every(i=>L[i].tied&&L[i].tied.length>1)&&L[4].winner===3);
 ok('skins: payments are Alex→Drew, Blake→Drew, Casey→Drew',r.payments.map(p=>r.names[p.from]+'>'+r.names[p.to]).join(',')==='Alex>Drew,Blake>Drew,Casey>Drew');
 ok('skins: stroke ranges stated (Drew SI 1–12, Casey SI 1–8, Blake SI 1–4) match strokesOnHole',[[1,4],[2,8],[3,12]].every(([i,n])=>[...Array(18)].every((_,k)=>G.strokesOnHole(r.playing[i],k+1,18)===(k+1<=n?1:0))));
}
// Stableford: the page's own engine (GCStableford on the rebuilt page, calc() on the legacy page)
{const h=boot(path.join(SITE,'stableford.html'),{url:'https://golfcalculators.com/stableford'});const ex=exMap(h.d);const hcp=+ex.hcp;const w={hcp};
 if(h.w.GCStableford){const G=h.w.GCStableford;const st=G.defaultState();st.players=[{name:'',hcp}];for(let i=1;i<=3;i++)st.scores[i]=[+ex['sc-'+i]];
  const r=G.compute(st);for(let i=1;i<=3;i++){const e=r.rows[0].byHole[i];w['sc-'+i]=ex['sc-'+i];w['st-'+i]=e.strokes;w['pt-'+i]=e.pts;}w.total=r.rows[0].total;
  compare('stableford',ex,w);
  ok('stableford: holes 1–3 on the standard card are par 4 SI 5, par 4 SI 3, par 3 SI 1',G.DEF_PAR.slice(0,3).join()==='4,4,3'&&G.DEF_SI.slice(0,3).join()==='5,3,1');
  ok('stableford: the page starts on the standard card',st.course.par.join()===G.DEF_PAR.join()&&st.course.si.join()===G.DEF_SI.join());}
 else{h.set('hcp',String(hcp));for(let i=1;i<=3;i++)h.set('s'+i,ex['sc-'+i]);h.w.calc();
  const si=h.w.eval('si'),par=h.w.eval('par');
  for(let i=1;i<=3;i++){w['sc-'+i]=ex['sc-'+i];w['st-'+i]=h.w.strokesOn(hcp,si[i-1],18);w['pt-'+i]=txt(h.$('p'+i));}
  w.total=(txt(h.$('out')).match(/(\d+)$/)||[])[1];
  compare('stableford',ex,w);
  ok('stableford: holes 1–3 on the built-in card are par 4 SI 5, par 4 SI 3, par 3 SI 1',par.slice(0,3).join()==='4,4,3'&&si.slice(0,3).join()==='5,3,1');}
}
// Daily Handicap: the page's calculate() for men and women with the illustrative numbers
{const ex=exMap(boot(path.join(SITE,'daily-handicap.html')).d);const w={ga:ex.ga,slope:ex.slope,scratch:ex.scratch,par:ex.par};
 const ga=+ex.ga,sl=+ex.slope,sc=+ex.scratch,pr=+ex.par;const s1=ga*sl/113,s3=s1+(sc-pr);
 Object.assign(w,{'step-1':s1.toFixed(3),'step-2':(sc-pr<0?'−':'')+Math.abs(sc-pr),'step-3':s3.toFixed(3),'step-4':(s3*0.93).toFixed(3)});
 for(const g of ['men','women']){const h=boot(path.join(SITE,'daily-handicap.html'),{url:'https://golfcalculators.com/daily-handicap'});
   h.set('gender',g,'change');h.set('holes','18','change');h.set('ga',ex.ga);h.set('slope',ex.slope);h.set('scratch',ex.scratch);h.set('par',ex.par);
   const m=(txt(h.$('howOut'))||'').match(/= (-?[\d.]+) → (\+?\d+)$/)||[];w['raw-'+g]=m[1];w['dh-'+g]=txt(h.$('dailyOut'));
   ok(`daily-handicap: calculator working line for ${g} ends with the same raw value and result`,m[2]===txt(h.$('dailyOut')));}
 compare('daily-handicap',ex,w);
 ok('daily-handicap: example is labelled illustrative',/illustrative/i.test(fs.readFileSync(path.join(SITE,'daily-handicap.html'),'utf8').match(/<h3>[^<]*Worked example[^<]*<\/h3>/)[0]));
}
process.exit(report('worked-examples')?1:0);
