// Browser checks: axe (WCAG 2.2 AA + best-practice) at 375 and 320px on every page,
// tap targets, horizontal scroll, Skins setup clearance, calculator-first fold check (375x812),
// screenshots, Lighthouse mobile.
// usage: node lib/browser-checks.js [--ci] [--url=https://preview...] [--label=name] [--out=dir] [--no-lh]
//   default (strict): fail on any axe violation, h-scroll, <24px control, JS error, Skins setup overlap,
//                     or Lighthouse < 95 in any category on home/skins/stableford/privacy.
//   --ci (PR gate, priorities-v7 P1): fail on axe serious/critical (WCAG 2.2 AA) at 375 and 320,
//                     any sideways scroll at 320/375, any input[type=number] on a rebuilt page
//                     (legacy allowlist: Skins while it is the legacy page; Stableford removed in P4),
//                     Lighthouse mobile Performance < 95, Accessibility < 95, LCP > 2.5 s or CLS > 0.1
//                     (median of 3 runs when the first run misses a budget), and the calculator-first
//                     fold check on skins/stableford/daily-handicap (P3).
//                     Everything else (minor/moderate axe, <24px controls, Skins setup clearance) is WARN.
// Env: SITE (checkout to serve and list pages from; default repo root), CHROME_PATH.
const {chromium}=require('playwright-core');const {AxeBuilder}=require('@axe-core/playwright');
const {spawn,execFileSync}=require('child_process');const fs=require('fs');const path=require('path');
const arg=k=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?a.split('=').slice(1).join('='):null;};
const CI=process.argv.includes('--ci'),noLh=process.argv.includes('--no-lh');
const SITE=path.resolve(process.env.SITE||path.join(__dirname,'../..'));
const CHROME=process.env.CHROME_PATH||'/usr/bin/google-chrome';
const label=arg('label')||(CI?'ci':'local');const OUT=path.resolve(arg('out')||path.join(__dirname,'../out',label));fs.mkdirSync(OUT,{recursive:true});
const pages=fs.readdirSync(SITE).filter(n=>n.endsWith('.html')).sort().map(n=>[n==='index.html'?'home':n.slice(0,-5),n==='index.html'?'/':'/'+n.slice(0,-5)]);
let base=arg('url'),srv=null,fail=0;const warn=[];let isV2=false;
const legacyNumberOK=name=>!isV2&&/^skins/.test(name); // type=number allowlist: only the legacy Skins page (Stableford rebuilt in P4)
const gate=(bad,msg)=>{if(bad){fail=1;}return bad?'FAIL':'PASS';};
(async()=>{
  if(!base){const port=8790+Math.floor(Math.random()*100);srv=spawn(process.execPath,[path.join(__dirname,'serve.js'),SITE,String(port)],{stdio:'ignore'});base='http://localhost:'+port;await new Promise(r=>setTimeout(r,700));}
  base=base.replace(/\/$/,'');
  console.log(`browser checks: ${base} · pages ${pages.map(p=>p[1]).join(' ')} · mode ${CI?'ci':'strict'} · out ${OUT}`);
  const b=await chromium.launch({executablePath:CHROME,args:['--no-sandbox']});
  const rows=[];
  // Netlify injects a feedback drawer (/.netlify/scripts/cdp, a fixed iframe) into Deploy Preview URLs only;
  // block it so previews are tested as production serves them.
  async function page(w,h=812){const ctx=await b.newContext({viewport:{width:w,height:h},isMobile:true,hasTouch:true,deviceScaleFactor:2});await ctx.route('**/.netlify/scripts/**',r=>r.abort());return ctx.newPage();}
  async function check(name,w,url,prep,shot){
    const p=await page(w);const errs=[];p.on('pageerror',e=>errs.push(e.message));
    await p.goto(base+url,{waitUntil:'load'});if(prep)await prep(p);await p.waitForTimeout(250);
    const ax=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']).analyze();
    const m=await p.evaluate(()=>{const els=[...document.querySelectorAll('a,button,input,select,textarea,summary,[role=button]')].filter(e=>e.offsetParent&&getComputedStyle(e).visibility!=='hidden');
      const inline=e=>e.tagName==='A'&&getComputedStyle(e).display==='inline';
      let u24=[],u44=[];for(const e of els){if(e.type==='radio'||e.type==='checkbox'&&e.closest('.gc-seg'))continue;const r=e.getBoundingClientRect();const id=(e.id||e.tagName.toLowerCase())+(e.textContent.trim()?':'+e.textContent.trim().slice(0,14):'');
        if(!inline(e)&&(r.width<24||r.height<24))u24.push(id+` ${Math.round(r.width)}x${Math.round(r.height)}`);if(!inline(e)&&r.height<44)u44.push(id);}
      const inner=[...document.querySelectorAll('body *')].filter(e=>{const s=getComputedStyle(e);return /(auto|scroll)/.test(s.overflowX)&&e.scrollWidth>e.clientWidth+1;}).map(e=>e.id||e.className||e.tagName);
      return {controls:els.length,under24:u24,pct44:els.length?Math.round(100*(els.length-u44.length)/els.length):100,docScroll:document.documentElement.scrollWidth,vw:innerWidth,innerScroll:inner,typeNumber:document.querySelectorAll('input[type=number]').length};});
    if(shot)await p.screenshot({path:path.join(OUT,shot),fullPage:shot.includes('full')});
    const v=ax.violations.map(x=>({id:x.id,impact:x.impact,nodes:x.nodes.length,eg:String(x.nodes[0].target)}));
    const serious=v.filter(x=>x.impact==='serious'||x.impact==='critical');
    const hs=m.docScroll>m.vw||m.innerScroll.length>0;
    const tnBad=m.typeNumber>0&&!legacyNumberOK(name);
    const strictBad=v.length||hs||errs.length||m.under24.length||tnBad;
    const bad=CI?(serious.length>0||hs||tnBad):strictBad;
    if(CI&&strictBad&&!bad)warn.push(`${name}@${w}`);
    rows.push({name,width:w,axe:v,hscroll:hs,innerScroll:m.innerScroll,controls:m.controls,pct44:m.pct44,under24:m.under24,typeNumber:m.typeNumber,jsErrors:errs,shot:shot?path.join(OUT,shot):null});
    console.log(`${gate(bad)}${CI&&strictBad&&!bad?' (WARN)':''}  ${name} @${w}: axe ${v.length} (serious/critical ${serious.length})${v.length?' '+v.map(x=>`${x.impact}:${x.id}(${x.nodes})`).join('; '):''} · sideways scroll ${hs}${hs?` (page ${m.docScroll}px in ${m.vw}px${m.innerScroll.length?', inner scroller '+m.innerScroll.join(','):''})`:''} · controls ${m.controls}, ≥44px ${m.pct44}%, <24px ${m.under24.length} · type=number ${m.typeNumber}${m.typeNumber&&!tnBad?' (legacy allowlist)':''}${errs.length?' · JS errors '+errs.join('|'):''}`);
    await p.context().close();
  }
  isV2=await (async()=>{const p=await page(375);await p.goto(base+'/skins');const r=await p.evaluate(()=>document.body.dataset.gc==='skins-v2');await p.context().close();return r;})();
  const midRound=async p=>{await p.evaluate(()=>{const U=GCSkinsUI;U.loadExample();const s=U.state();for(let h=7;h<=18;h++)delete s.scores[h];s.hole=7;U.show('hole');});await p.click('button[data-sc="-1"][data-i="3"]');};
  const maxData=async p=>{await p.evaluate(()=>{const s=GCSkinsUI.state();s.players=[...Array(8)].map((_,i)=>({name:'Bartholomew-Fitzgerald'+i,hcp:i===0?-10:54-i}));s.scores={};s.hole=18;GCSkinsUI.show('hole');});};
  const maxSetup=async p=>{await maxData(p);await p.evaluate(()=>GCSkinsUI.show('setup'));};
  const maxResult=async p=>{await p.evaluate(()=>{const s=GCSkinsUI.state();s.players=[...Array(8)].map((_,i)=>({name:'Bartholomew-Fitzgerald'+i,hcp:i*6}));s.scores={};for(let h=1;h<=18;h++)s.scores[h]=s.players.map((_,i)=>3+((h*7+i*3)%5));GCSkinsUI.show('result');});};
  const shotName={home:'home-375.png',privacy:'privacy-375-full.png',stableford:'stableford-375-full.png'};
  for(const w of [375,320]){
    for(const [n,u] of pages){if(n==='skins')continue;await check(n,w,u,null,w===375?shotName[n]||null:null);}
    if(isV2){
      await check('skins setup (fresh)',w,'/skins',null,`skins-1-setup-${w}.png`);
      await check('skins hole entry, mid-round strip (hole 7)',w,'/skins',midRound,`skins-2-hole7-strip-${w}.png`);
      await check('skins result card (example)',w,'/skins',async p=>{await p.evaluate(()=>GCSkinsUI.loadExample());},`skins-3-result-${w}.png`);
      await check('skins result full page',w,'/skins',async p=>{await p.evaluate(()=>GCSkinsUI.loadExample());},w===375?'skins-4-result-375-full.png':null);
      await check('skins max data: 8 players, long names, hole 18',w,'/skins',maxData,w===320?'skins-5-maxdata-hole-320.png':null);
      await check('skins max data: setup 8 players',w,'/skins',maxSetup,null);
      await check('skins max data: result 8 players',w,'/skins',maxResult,w===320?'skins-6-maxdata-result-320-full.png':null);
    } else if(pages.some(p=>p[0]==='skins')){
      await check('skins (legacy)',w,'/skins',null,w===375?'skins-legacy-375.png':null);
      await check('skins (legacy) example settled',w,'/skins',async p=>{await p.evaluate(()=>{loadExample();settleUp();});},null);
    }
  }
  // Stableford rebuild (P4): every screen at 375 and 320, incl. 4 long names (max data)
  const isSf=await (async()=>{const p=await page(375);await p.goto(base+'/stableford');const r=await p.evaluate(()=>document.body.dataset.gc==='stableford-v2');await p.context().close();return r;})();
  if(isSf){
    const LONG=['Bartholomew-Fitzgerald','Maximiliana Oyelaran','Christopher-Montague','Anastasiya Wolfensohn'];
    const four=async p=>{await p.evaluate(L=>{const U=GCStablefordUI;const s=U.state();s.players=[{name:L[0],hcp:12},{name:L[1],hcp:2},{name:L[2],hcp:24},{name:L[3],hcp:-2}];U.show('setup');},LONG);};
    const hole7=async p=>{await p.evaluate(L=>{const U=GCStablefordUI;U.loadExample();const s=U.state();s.players.forEach((x,i)=>x.name=L?L[i]:x.name);for(let h=8;h<=18;h++)delete s.scores[h];s.hole=7;U.show('hole',true);},null);await p.click('button[data-sc="-1"][data-i="0"]');await p.evaluate(()=>scrollTo(0,0));};
    const hole7long=async p=>{await p.evaluate(L=>{const U=GCStablefordUI;U.loadExample();const s=U.state();s.players.forEach((x,i)=>x.name=L[i]);for(let h=8;h<=18;h++)delete s.scores[h];s.hole=7;U.show('hole',true);},LONG);await p.click('button[data-pu="3"]');};
    const result=async p=>{await p.evaluate(()=>GCStablefordUI.loadExample());};
    const resultLong=async p=>{await p.evaluate(L=>{GCStablefordUI.loadExample();const s=GCStablefordUI.state();s.players.forEach((x,i)=>x.name=L[i]);GCStablefordUI.show('result');document.querySelectorAll('#why details').forEach(d=>d.open=true);},LONG);};
    const tie=async p=>{await p.evaluate(()=>{const U=GCStablefordUI,G=GCStableford;const s=G.defaultState();s.course.name='Countback demo';s.players=[{name:'Mel',hcp:0},{name:'Sam',hcp:0},{name:'Jo',hcp:0},{name:'Al',hcp:0}];
      const pts=[[2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],[3,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2],[3,2,2,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2],[2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1]];
      for(let h=1;h<=18;h++)s.scores[h]=pts.map(a=>s.course.par[h-1]+2-a[h-1]);s.screen='result';U.set(s);});};
    const course=async p=>{await p.evaluate(()=>GCStablefordUI.show('course',true));};
    const nine=async p=>{await four(p);await p.evaluate(()=>{const s=GCStablefordUI.state();s.round='front';GCStablefordUI.show('setup');});};
    const courseDupe=async p=>{await p.evaluate(()=>{const s=GCStablefordUI.state();s.course.si[6]=5;GCStablefordUI.show('course',true);});};
    for(const w of [375,320]){
      await check('stableford setup: 4 long names, +2 note',w,'/stableford',four,`stableford-1-setup-${w}.png`);
      await check('stableford setup, front 9: 9-hole DH label + link beside each field',w,'/stableford',nine,`stableford-1b-setup-9holes-${w}.png`);
      await check('stableford course card',w,'/stableford',course,`stableford-2-course-${w}.png`);
      await check('stableford course card, duplicate SI',w,'/stableford',courseDupe,w===375?'stableford-2b-course-dupe-375-full.png':null);
      await check('stableford hole entry, live strip (hole 7)',w,'/stableford',hole7,`stableford-3-hole7-strip-${w}.png`);
      await check('stableford hole entry, 4 long names + pickup',w,'/stableford',hole7long,null);
      await check('stableford result podium (example)',w,'/stableford',result,`stableford-4-podium-${w}.png`);
      await check('stableford result, countback ties',w,'/stableford',tie,`stableford-5-countback-${w}.png`);
      await check('stableford result full page, long names, why open',w,'/stableford',resultLong,w===375?'stableford-6-result-375-full.png':null);
    }
  }
  if(isSf){ // PO 12 Nov: on 9 holes each player's "Work out 9-hole DH" link sits right under their handicap stepper (one tap away)
    for(const w of [375,320]){
      const p=await page(w);await p.goto(base+'/stableford',{waitUntil:'load'});
      await p.evaluate(()=>{const s=GCStablefordUI.state();s.players=[{name:'Bartholomew-Fitzgerald',hcp:6},{name:'Maximiliana Oyelaran',hcp:1},{name:'Christopher-Montague',hcp:12},{name:'Anastasiya Wolfensohn',hcp:-1}];s.round='front';GCStablefordUI.show('setup');});
      const r=await p.evaluate(()=>[0,1,2,3].map(i=>{const st=document.getElementById('ph'+i).closest('.gc-stepper').getBoundingClientRect(),a=document.getElementById('dhl'+i);if(!a)return {i,ok:false,why:'missing'};const l=a.getBoundingClientRect();
        const gap=Math.round(l.top-st.bottom),ov=Math.min(l.right,st.right)-Math.max(l.left,st.left);return {i,gap,h:Math.round(l.height),ok:gap>=-4&&gap<=12&&ov>=40&&l.height>=44&&l.right<=innerWidth};}));
      const bad=r.some(x=>!x.ok);if(bad)fail=1;rows.push({name:`stableford 9-hole DH link placement ${w}`,width:w,placement:r});
      console.log(`${gate(bad)}  stableford 9-hole DH link right under each stepper @${w}: ${r.map(x=>`P${x.i+1} gap ${x.gap}px, ${x.h}px tall`).join('; ')}`);
      await p.context().close();}
  }
  if(isSf){ // PO 12 Nov (p4b): every course-card par and SI value field has a hit area of at least 44x44 px, with no sideways scroll
    for(const w of [375,320]){
      const p=await page(w);await p.goto(base+'/stableford',{waitUntil:'load'});await p.evaluate(()=>GCStablefordUI.show('course',true));
      const r=await p.evaluate(()=>{const f=[...document.querySelectorAll('#holes input')];const small=f.filter(e=>{const R=e.getBoundingClientRect();return R.width<44||R.height<44;}).map(e=>e.id);
        const R=f[0].getBoundingClientRect();return {n:f.length,small,w:Math.round(R.width),h:Math.round(R.height),sw:document.documentElement.scrollWidth,vw:innerWidth};});
      const bad=!(r.n===36&&!r.small.length&&r.sw<=r.vw);if(bad)fail=1;rows.push({name:`stableford course value fields ${w}`,width:w,fields:r});
      console.log(`${gate(bad)}  stableford course card: all ${r.n} par/SI value fields >= 44x44 (${r.w}x${r.h}) @${w}, page ${r.sw}px wide${r.small.length?' · small: '+r.small.join(','):''}`);
      await p.context().close();}
  }
  if(isSf){ // PO 12 Nov (p4b): at every scroll position, the Start bar (.sk-actions) may not cover the hole-count radios,
    // the 10th-tee switch, Edit course or the last player's 9-hole DH link on setup (fresh 18 holes, and 4 long names on the front 9).
    // Passing under the sticky site header at the top while scrolling is normal and not counted.
    const T=['input[name=round][value="18"]+span','input[name=round][value=front]+span','input[name=round][value=back]+span','#tenth-wrap','#btn-course','#dhl3','#btn-start'];
    for(const [w,hgt] of [[375,812],[320,568]]){for(const mode of ['fresh','front9']){
      const p=await page(w,hgt);await p.goto(base+'/stableford',{waitUntil:'load'});
      if(mode==='front9')await p.evaluate(()=>{const s=GCStablefordUI.state();s.players=[{name:'Bartholomew-Fitzgerald',hcp:6},{name:'Maximiliana Oyelaran',hcp:1},{name:'Christopher-Montague',hcp:12},{name:'Anastasiya Wolfensohn',hcp:-1}];s.round='front';GCStablefordUI.show('setup');});
      const r=await p.evaluate(async T=>{const max=document.documentElement.scrollHeight-innerHeight,bad=[];let n=0;
        for(let y=0;y<=max+8;y+=8){scrollTo(0,Math.min(y,max));await new Promise(r=>requestAnimationFrame(()=>r()));
          for(const q of T){const e=document.querySelector(q);if(!e||!e.offsetParent)continue;const R=e.getBoundingClientRect();
            const pts=[[R.left+R.width/2,R.top+1],[R.left+R.width/2,R.bottom-1],[R.left+4,R.top+R.height/2],[R.right-4,R.top+R.height/2]].filter(([,yy])=>yy>=0&&yy<innerHeight);
            for(const [x,yy] of pts){n++;const t=document.elementFromPoint(x,yy);if(!t)continue;const own=t===e||e.contains(t)||(e.closest('label')&&t.closest('label')===e.closest('label'));
              if(!own){const cover=t.closest('.sk-actions');if(cover&&!cover.contains(e)){bad.push(q+'@y'+y+' by '+(cover.className||cover.tagName));break;}}}}}
        return {n,bad:[...new Set(bad.map(b=>b.split('@')[0]))],first:bad[0]||null,max};},T);
      const bad=r.bad.length>0;if(bad)fail=1;rows.push({name:`stableford setup never covered ${w}x${hgt} ${mode}`,width:w,cover:r});
      console.log(`${gate(bad)}  stableford setup, ${mode==='fresh'?'fresh 18 holes':'4 long names, front 9'}: Start bar never covers ${T.length} controls at any scroll position @${w}x${hgt} (${r.n} points over ${r.max}px)${bad?' · covered: '+r.bad.join(', ')+' first '+r.first:''}`);
      await p.context().close();}}
  }
  if(pages.some(p=>p[0]==='daily-handicap')){ // PO 12 Nov: "(effective 2 Oct 2025)" never wraps mid-phrase, and never causes sideways scroll
    for(const w of [375,320]){
      const p=await page(w);await p.goto(base+'/daily-handicap',{waitUntil:'load'});
      const r=await p.evaluate(()=>{const s=document.querySelector('p.lede .nowrap');return {found:!!s,lines:s?new Set([...s.getClientRects()].map(x=>Math.round(x.top))).size:0,sw:document.documentElement.scrollWidth,vw:innerWidth,right:s?Math.round(s.getBoundingClientRect().right):0};});
      const lede=await p.$('p.lede');if(w===375&&lede)await lede.screenshot({path:path.join(OUT,'dh-date-line-375.png')});
      const bad=!(r.found&&r.lines===1&&r.sw<=r.vw&&r.right<=r.vw);if(bad)fail=1;rows.push({name:`daily-handicap date phrase ${w}`,width:w,nowrap:r});
      console.log(`${gate(bad)}  daily-handicap "(effective 2 Oct 2025)" on one line @${w}: ${r.lines} line, ends at ${r.right}px, page ${r.sw}px wide (viewport ${r.vw})`);
      await p.context().close();}
  }
  if(isV2){ // setup clearance: sticky Start bar must not cover setup controls
    const sel=['#btn-add','#btn-less','#pn0','#pn3','#ph3','#stake','input[name=holes][value=back]+span','input[name=scoring][value=gross]+span','details.sk-more summary','#btn-start'];
    for(const [w,hgt] of [[375,812],[320,568]]){
      const p=await page(w,hgt);await p.goto(base+'/skins',{waitUntil:'load'});
      const res=await p.evaluate(({sel,fold})=>sel.map(s=>{const e=document.querySelector(s);if(!e)return {s,ok:false,hit:'missing',y:-1};const hitAt=()=>{const r=e.getBoundingClientRect();const t=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {ok:!!t&&(t===e||e.contains(t)||(!!e.closest('label')&&t.closest('label')===e.closest('label'))),hit:t?(t.id||t.tagName):'none',y:Math.round(r.top)};};
        let a=hitAt();if(!fold){e.scrollIntoView({block:'nearest'});a=hitAt();window.scrollTo(0,0);}return {s,...a};}),{sel,fold:w===375});
      await p.screenshot({path:path.join(OUT,`skins-setup-fold-${w}x${hgt}.png`)});
      const bad=res.filter(r=>!r.ok).length>0;if(CI&&bad)warn.push(`clearance ${w}x${hgt}`);
      rows.push({name:`skins setup clearance ${w}x${hgt}`,width:w,clearance:res});
      console.log(`${CI?(bad?'WARN':'PASS'):gate(bad)}  skins setup clearance @${w}x${hgt} (${w===375?'all visible and uncovered with no scrolling':'each control uncovered after scrollIntoView'}): ${res.map(r=>`${r.s}→${r.ok?'ok':'covered by '+r.hit}@y${r.y}`).join(', ')}`);
      await p.context().close();}
  }
  // P3 fold check at 375x812, fresh load: the H1 and the first calculator control are fully in the
  // first viewport, and the search content (.gc-learn: how it's calculated, FAQ) starts below that control.
  for(const [n,u] of pages.filter(p=>['skins','stableford','daily-handicap'].includes(p[0]))){
    const p=await page(375,812);await p.goto(base+u,{waitUntil:'load'});await p.waitForTimeout(250);
    const r=await p.evaluate(()=>{const vis=e=>e&&e.offsetParent&&getComputedStyle(e).visibility!=='hidden';
      const h1=document.querySelector('h1');const ctl=[...document.querySelectorAll('main input:not([type=hidden]),main select,main button,main textarea')].find(vis);
      const learn=document.querySelector('.gc-learn');const R=e=>e?e.getBoundingClientRect():null;const a=R(h1),c=R(ctl),l=R(learn);
      return {h1:a?Math.round(a.bottom):-1,ctl:ctl?(ctl.id||ctl.tagName.toLowerCase()):'none',ctlBottom:c?Math.round(c.bottom):-1,learnTop:l?Math.round(l.top+scrollY):null,vh:innerHeight};});
    await p.screenshot({path:path.join(OUT,`fold-${n}-375x812.png`)});
    await p.screenshot({path:path.join(OUT,`full-${n}-375.png`),fullPage:true});
    const bad=!(r.h1>0&&r.h1<=r.vh&&r.ctlBottom>0&&r.ctlBottom<=r.vh&&(r.learnTop===null||r.learnTop>=r.ctlBottom));
    if(bad)fail=1;rows.push({name:`${n} fold 375x812`,width:375,fold:r});
    console.log(`${gate(bad)}  ${n} calculator first @375x812: H1 bottom ${r.h1}px, first control #${r.ctl} bottom ${r.ctlBottom}px (viewport ${r.vh}), search content starts at ${r.learnTop===null?'n/a':r.learnTop+'px'}`);
    await p.context().close();}
  await b.close();
  const lh=[];
  if(!noLh){for(const [n,u] of [['home','/'],['skins','/skins'],['stableford','/stableford'],['privacy','/privacy'],['daily-handicap','/daily-handicap']]){
    if(!pages.some(p=>p[0]===n))continue;
    const runLh=i=>{const out=path.join(OUT,`lh-${n}${i?'-run'+(i+1):''}.json`);const r=JSON.parse(execFileSync(process.execPath,[path.join(__dirname,'lh.js'),base+u,out],{encoding:'utf8'}).trim().split('\n').pop());r.report=out;return r;};
    const budget=x=>x.perf>=95&&x.a11y>=95&&x.lcpMs<=2500&&x.cls<=0.1;
    let runs=[runLh(0)];if(!budget(runs[0]))runs.push(runLh(1),runLh(2));
    const med=k=>{const a=runs.map(r=>r[k]).sort((x,y)=>x-y);return a[Math.floor(a.length/2)];};
    const s=runs.length===1?runs[0]:{...runs.find(r=>r.perf===med('perf')),perf:med('perf'),a11y:med('a11y'),lcpMs:med('lcpMs'),cls:med('cls')};
    s.page=n;s.runs=runs.length;lh.push(s);
    const ciBad=!budget(s);const strictBad=ciBad||(['skins','stableford','privacy','home'].includes(n)&&[s.bp,s.seo].some(x=>x<95));
    const bad=CI?ciBad:strictBad;if(bad)fail=1;if(CI&&strictBad&&!bad)warn.push('lighthouse '+n);
    console.log(`${bad?'FAIL':(CI&&strictBad?'WARN':'PASS')}  Lighthouse mobile ${n}${s.runs>1?' (median of 3)':''}: perf ${s.perf} · a11y ${s.a11y} · best-practices ${s.bp} · SEO ${s.seo} · LCP ${(s.lcpMs/1000).toFixed(2)} s · CLS ${s.cls} · TBT ${s.TBT} · ${s.bytes}${s.fails.length?' · below-1 audits: '+s.fails.join(', '):''}`);}}
  fs.writeFileSync(path.join(OUT,'summary.json'),JSON.stringify({base,site:SITE,mode:CI?'ci':'strict',when:new Date().toString(),rows,lighthouse:lh,warnings:warn},null,1));
  if(warn.length)console.log(`WARN  non-gating findings (strict mode would fail): ${warn.join(', ')}`);
  console.log(`${fail?'BROWSER CHECKS FAILED':'BROWSER CHECKS PASSED'} · saved to ${OUT}`);if(srv)srv.kill();process.exit(fail);
})().catch(e=>{console.error(e);if(srv)srv.kill();process.exit(2);});
