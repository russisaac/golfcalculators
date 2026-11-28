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
// Same text metrics as the GitHub runner: its fontconfig resolves system-ui / sans-serif to DejaVu Sans, while a dev box
// may use Noto Sans or Roboto (narrower). Chrome and Lighthouse (child processes) inherit this. Opt out: GC_SYSTEM_FONTS=1.
if(!process.env.FONTCONFIG_FILE&&!process.env.GC_SYSTEM_FONTS)process.env.FONTCONFIG_FILE=path.join(__dirname,'fonts-ci.conf');
const label=arg('label')||(CI?'ci':'local');const OUT=path.resolve(arg('out')||path.join(__dirname,'../out',label));fs.mkdirSync(OUT,{recursive:true});
const pages=fs.readdirSync(SITE).filter(n=>n.endsWith('.html')).sort().map(n=>[n==='index.html'?'home':n.slice(0,-5),n==='index.html'?'/':'/'+n.slice(0,-5)]);
let base=arg('url'),srv=null,fail=0;const warn=[];let isV2=false,hasShare=false,hasSkShare=false;
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
  // A scrolled check must not leave a control partly under the sticky header: axe then reports it as "partially
  // obscured" (target-size), which says where the test scrolled, not how big the target is. axe also counts any part
  // above the viewport top as unobscured, so a 48px control at -6..42 under a 49px header "has 6px". Move the page by
  // the smallest amount (up to 160px either way) after which every control is fully below the header, fully under it,
  // or fully above the viewport. Every target is still checked; only the test's resting scroll position changes.
  async function restClear(p){await p.evaluate(()=>{const hd=document.querySelector('.gc-header');if(!hd||getComputedStyle(hd).position!=='sticky'||scrollY===0)return;
    const hb=hd.getBoundingClientRect().bottom,maxY=document.documentElement.scrollHeight-innerHeight;
    const pinned=e=>{for(let a=e;a&&a!==document.body;a=a.parentElement){const ps=getComputedStyle(a).position;if(ps==='fixed'||ps==='sticky')return true;}return false;};
    const rs=[...document.querySelectorAll('a,button,input,select,textarea,summary,[role=button]')].filter(e=>e.offsetParent&&!pinned(e)).map(e=>e.getBoundingClientRect()).filter(r=>r.height>0);
    const ok=d=>rs.every(r=>{const t=r.top-d,b=r.bottom-d;return b<=0||t>=hb||(t>=0&&b<=hb);});
    if(ok(0))return;for(let k=1;k<=160;k++)for(const d of [-k,k]){const y=scrollY+d;if(y<0||y>maxY)continue;if(ok(d)){window.scrollTo(0,y);return;}}});await p.waitForTimeout(50);}
  async function check(name,w,url,prep,shot,hgt){
    const p=await page(w,hgt||812);const errs=[];p.on('pageerror',e=>errs.push(e.message));
    await p.goto(base+url,{waitUntil:'load'});if(prep)await prep(p);await p.waitForTimeout(250);
    await restClear(p);
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
  hasSkShare=await (async()=>{const p=await page(375);await p.goto(base+'/skins');const r=await p.evaluate(()=>!!(window.GCShare&&window.GCSkinsUI&&GCSkinsUI.link));await p.context().close();return r;})();
  hasShare=await (async()=>{const p=await page(375);await p.goto(base+'/stableford');const r=await p.evaluate(()=>!!window.GCShare);await p.context().close();return r;})();
  isV2=await (async()=>{const p=await page(375);await p.goto(base+'/skins');const r=await p.evaluate(()=>document.body.dataset.gc==='skins-v2');await p.context().close();return r;})();
  const midRound=async p=>{await p.evaluate(()=>{const U=GCSkinsUI;U.loadExample();const s=U.state();for(let h=7;h<=18;h++)delete s.scores[h];s.hole=7;U.show('hole');});await p.click('button[data-sc="-1"][data-i="3"]');};
  const maxData=async p=>{await p.evaluate(()=>{const s=GCSkinsUI.state();s.players=[...Array(8)].map((_,i)=>({name:'Bartholomew-Fitzgerald'+i,hcp:i===0?-10:54-i}));s.scores={};s.hole=18;GCSkinsUI.show('hole');});};
  const maxSetup=async p=>{await maxData(p);await p.evaluate(()=>GCSkinsUI.show('setup'));};
  const maxResult=async p=>{await p.evaluate(()=>{const s=GCSkinsUI.state();s.players=[...Array(8)].map((_,i)=>({name:'Bartholomew-Fitzgerald'+i,hcp:i*6}));s.scores={};for(let h=1;h<=18;h++)s.scores[h]=s.players.map((_,i)=>3+((h*7+i*3)%5));GCSkinsUI.show('result');});};
  const SKLONG8=['Bartholomew-Fitzgerald','Maximiliana Oyelaran','Christopher-Montague','Anastasiya Wolfensohn','Wilhelmina Castellanos','Fitzwilliam Abernathy','Gwendolyn Featherstone','Montgomery Ashworth-Lee'];
  const SKLONG=['Bartholomew-Fitzgerald','Maximiliana Oyelaran','Christopher-Montague','Anastasiya Wolfensohn'];
  const skLong=async(p,holes)=>{await p.evaluate(([L,ho])=>{const s=GCSkinsUI.state();s.players=L.map((n,i)=>({name:n,hcp:[12,20,24,-2][i],hcp9:null}));s.holes=ho;s.scores={};GCSkinsUI.show('setup');},[SKLONG,holes]);};
  const skAsk=async p=>{await skLong(p,'18');await p.goto(p.url().split('?')[0]+'?dh=7&holes=9&p=1',{waitUntil:'load'});};
  const hasSkAsk=await (async()=>{const p=await page(375);await p.goto(base+'/skins');const r=await p.evaluate(()=>!!document.getElementById('dh-prompt'));await p.context().close();return r;})();
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
      await check('skins setup, front 9: 9-hole DH labels, links and check notes (8 long names)',w,'/skins',async p=>{await maxSetup(p);await p.evaluate(()=>{const s=GCSkinsUI.state();s.holes='front';s.players.forEach(x=>{delete x.hcp9;});GCSkinsUI.show('setup');});},`skins-1b-setup-9holes-${w}.png`);
      await check('skins max data: result 8 players',w,'/skins',maxResult,w===320?'skins-6-maxdata-result-320-full.png':null);
      if(hasSkShare){ // share-link-skins: the read-only viewer (8 long names) and the error card
        const skViewer=async p=>{const url=await p.evaluate(async L=>{const U=GCSkinsUI;U.loadExample();const s=U.state();s.players=L.map((n,i)=>({name:n,hcp:i*3,hcp9:null}));for(let x=1;x<=18;x++)s.scores[x]=s.players.map((_,i)=>3+((x*7+i*3)%5));U.show('result');return (await U.link()).url;},SKLONG8);
          await p.evaluate(()=>localStorage.clear());await p.goto(url,{waitUntil:'load'});await p.evaluate(()=>GCSkinsUI.opened());};
        await check('skins shared result (viewer), 8 long names',w,'/skins',skViewer,`skins-7-shared-viewer-${w}.png`);
        await check('skins shared result (viewer) full page',w,'/skins',skViewer,w===375?'skins-7b-shared-viewer-375-full.png':null);
        await check('skins shared link that cannot be opened (error card)',w,'/skins#r=1z.AAAA',async p=>{await p.evaluate(()=>GCSkinsUI.opened());},`skins-8-shared-error-${w}.png`);
      }
      if(hasSkAsk){ // skins-dh-return-ask: the Stableford question on Skins (4 long names), then each answer
        await check('skins DH return: 9-hole DH onto an 18-hole round asks first',w,'/skins',skAsk,`skins-1c-dh-ask-switch-${w}.png`);
        await check('skins DH return: switched to front 9, 9-hole DH set',w,'/skins',async p=>{await skAsk(p);await p.click('button[data-dhr=front]');},`skins-1d-dh-switched-front9-${w}.png`);
        await check('skins DH return: kept 18 holes, 9-hole DH saved',w,'/skins',async p=>{await skAsk(p);await p.click('button[data-dhr=keep]');},`skins-1e-dh-kept18-${w}.png`);
        await check('skins DH return: &holes=18 onto a 9-hole round sets the 18-hole DH only',w,'/skins',async p=>{await skLong(p,'front');await p.goto(p.url().split('?')[0]+'?dh=12&holes=18&p=1',{waitUntil:'load'});},`skins-1f-dh-18-onto-9-${w}.png`);
      }
    } else if(pages.some(p=>p[0]==='skins')){
      await check('skins (legacy)',w,'/skins',null,w===375?'skins-legacy-375.png':null);
      await check('skins (legacy) example settled',w,'/skins',async p=>{await p.evaluate(()=>{loadExample();settleUp();});},null);
    }
  }
  if(isV2&&hasSkAsk){ // the question is focused and fully on the first screen; nothing set until a choice
    for(const [w,hgt] of [[375,812],[320,568]]){
      const p=await page(w,hgt);await p.goto(base+'/skins',{waitUntil:'load'});await skAsk(p);await p.waitForTimeout(150);
      const r=await p.evaluate(()=>{const c=document.getElementById('dh-prompt').getBoundingClientRect(),s=JSON.parse(localStorage.getItem('gc_skins_v2'));
        return {focus:document.activeElement&&document.activeElement.id,top:Math.round(c.top),bottom:Math.round(c.bottom),vh:innerHeight,holes:s.holes,hcp9:s.players[1].hcp9,q:document.getElementById('dhp-h').textContent};});
      const bad=r.focus!=='dhp-h'||r.bottom>r.vh||r.top<0||r.holes!=='18'||r.hcp9!=null;
      if(bad)fail=1;rows.push({name:`skins dh ask ${w}`,width:w,r});
      console.log(`${gate(bad)}  skins DH question @${w}x${hgt}: "${r.q}" focused (${r.focus}), card ${r.top}-${r.bottom}px of ${r.vh}px; before a choice: round ${r.holes}, 9-hole DH ${r.hcp9}`);
      await p.context().close();}
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
    const dhAsk=async p=>{await four(p);await p.evaluate(()=>{const s=GCStablefordUI.state();s.round='18';GCStablefordUI.show('setup');});await p.goto(p.url().split('?')[0]+'?dh=7&holes=9&p=1',{waitUntil:'load'});};
    const dhSwitched=async p=>{await dhAsk(p);await p.click('button[data-dhr=front]');};
    const courseDupe=async p=>{await p.evaluate(()=>{const s=GCStablefordUI.state();s.course.si[6]=5;GCStablefordUI.show('course',true);});};
    for(const w of [375,320]){
      await check('stableford setup: 4 long names, +2 note',w,'/stableford',four,`stableford-1-setup-${w}.png`);
      await check('stableford setup, front 9: 9-hole DH label + link beside each field',w,'/stableford',nine,`stableford-1b-setup-9holes-${w}.png`);
      await check('stableford DH return: 9-hole DH onto an 18-hole round asks first',w,'/stableford',dhAsk,`stableford-1c-dh-ask-switch-${w}.png`);
      await check('stableford DH return: switched to front 9, 9-hole DH set',w,'/stableford',dhSwitched,`stableford-1d-dh-switched-front9-${w}.png`);
      await check('stableford course card',w,'/stableford',course,`stableford-2-course-${w}.png`);
      await check('stableford course card, duplicate SI',w,'/stableford',courseDupe,w===375?'stableford-2b-course-dupe-375-full.png':null);
      await check('stableford hole entry, live strip (hole 7)',w,'/stableford',hole7,`stableford-3-hole7-strip-${w}.png`);
      await check('stableford hole entry, 4 long names + pickup',w,'/stableford',hole7long,null);
      await check('stableford result podium (example)',w,'/stableford',result,`stableford-4-podium-${w}.png`);
      await check('stableford result, countback ties',w,'/stableford',tie,`stableford-5-countback-${w}.png`);
      await check('stableford result full page, long names, why open',w,'/stableford',resultLong,w===375?'stableford-6-result-375-full.png':null);
      if(hasShare){ // share-link-stableford: the read-only viewer opened from a result link, and the error card
        const viewer=async p=>{const url=await p.evaluate(async L=>{const U=GCStablefordUI;U.loadExample();const s=U.state();s.players.forEach((x,i)=>x.name=L[i]);U.show('result');return (await U.link()).url;},LONG);
          await p.evaluate(()=>localStorage.clear());await p.goto(url,{waitUntil:'load'});await p.evaluate(()=>GCStablefordUI.opened());};
        await check('stableford shared result (viewer), 4 long names',w,'/stableford',viewer,`stableford-7-shared-viewer-${w}.png`);
        await check('stableford shared result (viewer) full page',w,'/stableford',viewer,w===375?'stableford-7b-shared-viewer-375-full.png':null);
        await check('stableford shared link that cannot be opened (error card)',w,'/stableford#r=1z.AAAA',async p=>{await p.evaluate(()=>GCStablefordUI.opened());},`stableford-8-shared-error-${w}.png`);
      }
    }
  }
  if(isSf&&hasShare){ // share-link-stableford in a real browser: CompressionStream link, viewer on the first screen, storage untouched, own round back
    for(const [w,hgt] of [[375,812],[320,568]]){
      let p=await page(w,hgt);await p.goto(base+'/stableford',{waitUntil:'load'});
      const own=await p.evaluate(async()=>{const U=GCStablefordUI;U.loadExample();const url=(await U.link()).url;const s=U.state();s.players[0].name='Me';s.screen='setup';U.set(s);return {url,saved:localStorage.getItem('gc_stableford_v1')};});
      const p0=p;p=await p0.context().newPage();await p0.close(); // a fresh page load of the link (not a same-document hash change)
      await p.addInitScript(()=>{window.__hist=[];for(const fn of ['pushState','replaceState']){const o=History.prototype[fn];History.prototype[fn]=function(...a){const before=location.hash,view=document.documentElement.classList.contains('gc-view');const r=o.apply(this,a);window.__hist.push({fn,before,after:location.hash,view});return r;};}});
      await p.goto(own.url,{waitUntil:'load'});await p.evaluate(()=>GCStablefordUI.opened());
      const r=await p.evaluate(()=>{const pod=document.querySelector('.sf-podium').getBoundingClientRect(),ban=document.getElementById('gc-shared').getBoundingClientRect();
        return {viewing:GCStablefordUI.viewing(),podBottom:Math.round(pod.bottom),ownBottom:Math.round(document.getElementById('gc-own').getBoundingClientRect().bottom),banTop:Math.round(ban.top),vh:innerHeight,saved:localStorage.getItem('gc_stableford_v1'),t:document.getElementById('gc-shared-t').textContent};});
      await p.click('#gc-own');
      const back=await p.evaluate(()=>({viewing:GCStablefordUI.viewing(),name:document.getElementById('pn0').value,hash:location.hash,focus:document.activeElement&&document.activeElement.id,hist:window.__hist}));
      const histOk=back.hist.length===1&&back.hist[0].fn==='replaceState'&&back.hist[0].view&&/^#r=/.test(back.hist[0].before)&&!/r=/.test(back.hist[0].after);
      const firstScreen=w===375?r.podBottom<=r.vh&&r.ownBottom<=r.vh:true;
      const noUtm=own.url.replace('?utm_source=share&utm_medium=link&utm_campaign=stableford',''); // v9 P6: the utm tags add 58 chars; the 300-char budget is for the link itself
      const bad=!/#r=1z\.[A-Za-z0-9_-]+$/.test(own.url)||noUtm.length>300||(noUtm!==own.url&&!/\?utm_source=share&utm_medium=link&utm_campaign=stableford#r=/.test(own.url))||!r.viewing||r.t!=='Shared result'||r.saved!==own.saved||!firstScreen||back.viewing||back.name!=='Me'||back.hash!==''||back.focus!=='setup-h'||!histOk;
      if(bad)fail=1;rows.push({name:`stableford share link ${w}`,width:w,link:own.url.length,r,back});
      console.log(`${gate(bad)}  stableford share link @${w}x${hgt}: Chrome writes a 1z. link (${noUtm.length} chars + ${own.url.length-noUtm.length} utm); it opens read-only ("${r.t}")${w===375?`, podium and Start your own round on the first screen (bottoms ${r.podBottom} and ${r.ownBottom} of ${r.vh}px)`:''}; saved round untouched; Start your own round brings "${back.name}" back, fragment cleared, query "${back.search}", focus ${back.focus}; history calls in viewer mode: ${back.hist.map(c=>c.fn+(c.view?' (first, viewer still showing)':'')+' -> hash "'+c.after+'"').join(', ')||'none'}${histOk?'':' (expected exactly one replaceState clearing #r= first)'}`);
      await p.context().close();}
  }
  if(isV2&&hasSkShare){ // share-link-skins in a real browser: fresh load of the link, history calls, storage untouched, own round back
    for(const [w,hgt] of [[375,812],[320,568]]){
      let p=await page(w,hgt);await p.goto(base+'/skins',{waitUntil:'load'});
      const own=await p.evaluate(async()=>{const U=GCSkinsUI;U.loadExample();const url=(await U.link()).url;const s=U.state();s.players[0].name='Me';s.screen='setup';U.set(s);return {url,saved:localStorage.getItem('gc_skins_v2')};});
      const p0=p;p=await p0.context().newPage();await p0.close();
      await p.addInitScript(()=>{window.__hist=[];for(const fn of ['pushState','replaceState']){const o=History.prototype[fn];History.prototype[fn]=function(...a){const before=location.hash,view=document.documentElement.classList.contains('gc-view');const r=o.apply(this,a);window.__hist.push({fn,before,after:location.hash,view});return r;};}});
      await p.goto(own.url,{waitUntil:'load'});await p.evaluate(()=>GCSkinsUI.opened());
      const r=await p.evaluate(()=>({viewing:GCSkinsUI.viewing(),heroBottom:Math.round(document.getElementById('hero').getBoundingClientRect().bottom),ownBottom:Math.round(document.getElementById('gc-own').getBoundingClientRect().bottom),vh:innerHeight,saved:localStorage.getItem('gc_skins_v2'),t:document.getElementById('gc-shared-t').textContent,hero:document.getElementById('hero').textContent}));
      await p.click('#gc-own');
      const back=await p.evaluate(()=>({viewing:GCSkinsUI.viewing(),name:document.getElementById('pn0').value,hash:location.hash,search:location.search,focus:document.activeElement&&document.activeElement.id,hist:window.__hist}));
      const histOk=back.hist.length===1&&back.hist[0].fn==='replaceState'&&back.hist[0].view&&/^#r=/.test(back.hist[0].before)&&!/r=/.test(back.hist[0].after);
      const firstScreen=w===375?r.ownBottom<=r.vh:true;
      // v9 P6: links carry ?utm_source=share&utm_medium=link&utm_campaign=skins (58 chars) before #r=; the 320-char budget
      // is for the link itself, as before P6. Start your own round must drop the utm tags as well as #r= (no stale campaign).
      const noUtm=own.url.replace('?utm_source=share&utm_medium=link&utm_campaign=skins','');
      const utmOk=noUtm===own.url||(/\?utm_source=share&utm_medium=link&utm_campaign=skins#r=/.test(own.url)&&!/utm_/.test(back.search||''));
      const bad=!/#r=1z\.[A-Za-z0-9_-]+$/.test(own.url)||noUtm.length>320||!utmOk||!r.viewing||r.t!=='Shared result'||!/Alex pays Drew/.test(r.hero)||r.saved!==own.saved||!firstScreen||back.viewing||back.name!=='Me'||back.hash!==''||back.focus!=='setup-h'||!histOk;
      if(bad)fail=1;rows.push({name:`skins share link ${w}`,width:w,link:own.url.length,linkNoUtm:noUtm.length,r,back});
      console.log(`${gate(bad)}  skins share link @${w}x${hgt}: Chrome writes a 1z. link (${own.url.length} chars); it opens read-only ("${r.t}")${w===375?`, result and Start your own round on the first screen (bottoms ${r.heroBottom} and ${r.ownBottom} of ${r.vh}px)`:''}; saved round untouched; Start your own round brings "${back.name}" back, fragment cleared, focus ${back.focus}; history calls in viewer mode: ${back.hist.map(c=>c.fn+(c.view?' (first, viewer still showing)':'')+' -> hash "'+c.after+'"').join(', ')||'none'}`);
      await p.context().close();}
  }
  const hasSkCompact=isV2&&await (async()=>{const p=await page(375);await p.goto(base+'/skins');const r=await p.evaluate(()=>[...document.styleSheets].some(ss=>{try{return [...ss.cssRules].some(r=>r.selectorText==='.sk-many .sk-pay');}catch(e){return false;}}));await p.context().close();return r;})();
  if(hasSkCompact){ // skins-result-compact (PO, 12 Nov + P3): on your own Skins result, Share result is on the first screen at 375x812, and at 320x568 with 7 payments
    const own=[['example',async p=>p.evaluate(()=>GCSkinsUI.loadExample())],
      ['8 long names',async p=>p.evaluate(L=>{const U=GCSkinsUI;U.loadExample();const s=U.state();s.players=L.map((n,i)=>({name:n,hcp:i*3,hcp9:null}));for(let x=1;x<=18;x++)s.scores[x]=s.players.map((_,i)=>3+((x*7+i*3)%5));U.set(s);U.show('result');},SKLONG8)],
      ['8 long names, 7 payments',async p=>p.evaluate(L=>{const U=GCSkinsUI;U.loadExample();const s=U.state();s.players=L.map(n=>({name:n,hcp:0,hcp9:null}));s.endRule='nobody';for(let x=1;x<=18;x++)s.scores[x]=s.players.map((_,i)=>x<=7?(i===7?3:5):x<=16?4:(i===x%8?3:5));U.set(s);U.show('result');},SKLONG8)],
      ['4 long names, 3 payments (big lines)',async p=>p.evaluate(L=>{const U=GCSkinsUI;U.loadExample();const s=U.state();s.players=L.slice(0,4).map(n=>({name:n,hcp:0,hcp9:null}));s.endRule='nobody';for(let x=1;x<=18;x++)s.scores[x]=s.players.map((_,i)=>i===0?3:5);U.set(s);U.show('result');},SKLONG8)]];
    for(const [label,mk] of own){
      const p=await page(375,812);await p.goto(base+'/skins',{waitUntil:'load'});await mk(p);await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(150);
      const r=await p.evaluate(()=>{const b=document.getElementById('btn-share').getBoundingClientRect(),h=document.getElementById('hero').getBoundingClientRect();
        return {heroBottom:Math.round(h.bottom),top:Math.round(b.top),bottom:Math.round(b.bottom),vh:innerHeight,pays:document.querySelectorAll('#hero .sk-pay').length,compact:document.getElementById('hero').classList.contains('sk-many'),enabled:!document.getElementById('btn-share').disabled,viewing:GCSkinsUI.viewing()};});
      const shot=`fold-own-skins-${label.replace(/[^a-z0-9]+/gi,'-').toLowerCase().replace(/-$/,'')}-375x812.png`;await p.screenshot({path:path.join(OUT,shot)});
      const bad=!(r.enabled&&!r.viewing&&r.bottom>0&&r.bottom<=r.vh&&r.top>=r.heroBottom);
      if(bad)fail=1;rows.push({name:`skins own result fold ${label}`,width:375,r});
      console.log(`${gate(bad)}  skins own result fold @375x812 (${label}: ${r.pays||'no'} payment lines${r.compact?', compact':''}): Share result on the first screen: result bottom ${r.heroBottom}px, button ${r.top}-${r.bottom}px of ${r.vh}px`);
      await p.context().close();}
    { // P3: Share result fully visible above the fold at 320x568 with 7 payment lines
      const [label,mk]=own[2];
      const p=await page(320,568);await p.goto(base+'/skins',{waitUntil:'load'});await mk(p);await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(150);
      const r=await p.evaluate(()=>{const b=document.getElementById('btn-share').getBoundingClientRect(),h=document.getElementById('hero').getBoundingClientRect();
        return {heroBottom:Math.round(h.bottom),top:Math.round(b.top),bottom:Math.round(b.bottom),vh:innerHeight,vw:innerWidth,docScroll:document.documentElement.scrollWidth,pays:document.querySelectorAll('#hero .sk-pay').length,compact:document.getElementById('hero').classList.contains('sk-many'),enabled:!document.getElementById('btn-share').disabled,viewing:GCSkinsUI.viewing()};});
      const shot='fold-own-skins-8-long-names-7-payments-320x568.png';await p.screenshot({path:path.join(OUT,shot)});
      const hs=r.docScroll>r.vw;
      const bad=!(r.enabled&&!r.viewing&&r.pays===7&&r.compact&&r.bottom>0&&r.bottom<=r.vh&&r.top>=r.heroBottom)||hs;
      if(bad)fail=1;rows.push({name:`skins own result fold ${label} 320x568`,width:320,r});
      console.log(`${gate(bad)}  skins own result fold @320x568 (${label}: ${r.pays||'no'} payment lines${r.compact?', compact':''}): Share result on the first screen: result bottom ${r.heroBottom}px, button ${r.top}-${r.bottom}px of ${r.vh}px${hs?' · sideways scroll':''}`);
      await p.context().close();}
    {const p=await page(320,568);await p.goto(base+'/',{waitUntil:'load'});await p.screenshot({path:path.join(OUT,'home-320x568.png')});await p.context().close();}
    for(const w of [375,320]){ // axe + screenshots of the compact own result
      await check('skins own result, 8 long names, compact payment lines',w,'/skins',own[1][1],`skins-9-own-compact-${w}.png`);
      await check('skins own result, 8 long names, 7 payments',w,'/skins',own[2][1],w===375?'skins-9b-own-compact-7pay-375.png':'skins-9b-own-compact-7pay-320.png');
    }
  }
  if(hasShare){ // PO 12 Nov, both tools: in the shared viewer, Start your own round is on the first screen at 375x812 with the longest data
    const cases=[];
    if(isSf)cases.push(['stableford','4 long names, 40-char course',async p=>p.evaluate(async L=>{const U=GCStablefordUI;U.loadExample();const s=U.state();s.players.forEach((x,i)=>x.name=L[i]);s.course.name='Royal Sydney Golf Club - Composite (Blue)';U.show('result');return (await U.link()).url;},['Bartholomew-Fitzgerald','Maximiliana Oyelaran','Christopher-Montague','Anastasiya Wolfensohn'])]);
    if(isV2&&hasSkShare){
      cases.push(['skins','8 long names',async p=>p.evaluate(async L=>{const U=GCSkinsUI;U.loadExample();const s=U.state();s.players=L.map((n,i)=>({name:n,hcp:i*3,hcp9:null}));for(let x=1;x<=18;x++)s.scores[x]=s.players.map((_,i)=>3+((x*7+i*3)%5));U.show('result');return (await U.link()).url;},SKLONG8)]);
      cases.push(['skins','8 long names, 7 payments',async p=>p.evaluate(async L=>{const U=GCSkinsUI;U.loadExample();const s=U.state();s.players=L.map((n,i)=>({name:n,hcp:0,hcp9:null}));s.endRule='nobody';for(let x=1;x<=18;x++)s.scores[x]=s.players.map((_,i)=>x<=7?(i===7?3:5):x<=16?4:(i===x%8?3:5));U.show('result');return (await U.link()).url;},SKLONG8)]);
    }
    for(const [tool,label,mk] of cases){
      let p=await page(375,812);await p.goto(base+'/'+tool,{waitUntil:'load'});const url=await mk(p);const p0=p;p=await p0.context().newPage();await p0.close();
      await p.goto(url,{waitUntil:'load'});await p.evaluate(t=>(t==='skins'?GCSkinsUI:GCStablefordUI).opened(),tool);await p.waitForTimeout(150);
      const r=await p.evaluate(()=>{const o=document.getElementById('gc-own').getBoundingClientRect(),h=document.getElementById('hero').getBoundingClientRect(),a=document.getElementById('view-actions');
        return {heroBottom:Math.round(h.bottom),ownTop:Math.round(o.top),ownBottom:Math.round(o.bottom),vh:innerHeight,next:document.getElementById('hero').nextElementSibling===a,primary:/gc-btn-primary/.test(document.getElementById('gc-own').className),pays:document.querySelectorAll('#hero .sk-pay').length};});
      const shot=`fold-shared-${tool}-${label.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}-375x812.png`;await p.screenshot({path:path.join(OUT,shot)});
      const bad=!(r.next&&r.primary&&r.ownBottom>0&&r.ownBottom<=r.vh&&r.ownTop>=r.heroBottom);
      if(bad)fail=1;rows.push({name:`${tool} shared fold ${label}`,width:375,r});
      console.log(`${gate(bad)}  ${tool} shared result fold @375x812 (${label}${r.pays?`, ${r.pays} payments`:''}): Start your own round (primary) directly under the result, on the first screen: result bottom ${r.heroBottom}px, button ${r.ownTop}-${r.ownBottom}px of ${r.vh}px`);
      await p.context().close();}
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
  { // p4b + PO 12 Nov: the next-step card is shown on Stableford setup and after the podium (result), and really hidden
    // (display:none, 0 px) on the hole-entry and course screens; Skins shows it on setup only. gc.css .gc-next{display:grid}
    // used to win over [hidden].
    const cases=[];
    if(isSf)cases.push(['stableford setup','/stableford',()=>GCStablefordUI.show('setup'),true],['stableford result (podium)','/stableford',()=>GCStablefordUI.loadExample(),true],
      ['stableford hole entry','/stableford',()=>{GCStablefordUI.loadExample();GCStablefordUI.show('hole',true);},false],['stableford course card','/stableford',()=>GCStablefordUI.show('course',true),false]);
    if(isV2)cases.push(['skins setup','/skins',()=>GCSkinsUI.show('setup'),true],['skins hole entry','/skins',()=>{GCSkinsUI.loadExample();GCSkinsUI.show('hole');},false],['skins result','/skins',()=>GCSkinsUI.loadExample(),false]);
    for(const [n,u,fn,want] of cases){const p=await page(375);await p.goto(base+u,{waitUntil:'load'});await p.evaluate(fn);
      const r=await p.evaluate(()=>{const e=document.getElementById('setup-next');return {hidden:e.hidden,display:getComputedStyle(e).display,h:Math.round(e.getBoundingClientRect().height)};});
      const bad=want?!(!r.hidden&&r.display!=='none'&&r.h>=44):!(r.hidden&&r.display==='none'&&r.h===0);if(bad)fail=1;rows.push({name:`${n} next-step card`,width:375,next:r,want});
      if(n==='stableford result (podium)'){await p.evaluate(()=>document.getElementById('setup-next').scrollIntoView({block:'end'}));await p.screenshot({path:path.join(OUT,'stableford-result-next-step-375.png')});}
      console.log(`${gate(bad)}  ${n}: next-step card ${want?'shown':'not shown'} (hidden ${r.hidden}, display ${r.display}, ${r.h}px)`);await p.context().close();}
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
  if(isV2){ // PO 12 Nov (skins-9hole-dh): Skins setup Start is in the flow too; the same scroll sweep at 375x812 and 320x568,
    // fresh, with 8 long names, and with 8 long names on the front 9 (each player's 9-hole DH link and check note showing)
    const LONG8=['Bartholomew-Fitzgerald','Maximiliana Oyelaran','Christopher-Montague','Anastasiya Wolfensohn','Konstantinos Papadopoulos','Guinevere Featherstonehaugh','Oluwaseun Adeyemi-Clarke','Wilhelmina Vanderbilt'];
    const T=['#pn0','#ph3','#ph7','#stake','input[name=holes][value="18"]+span','input[name=holes][value=front]+span','input[name=holes][value=back]+span','input[name=scoring][value=full]+span','input[name=scoring][value=offlow]+span','input[name=scoring][value=gross]+span','details.sk-more summary','#dhl7','#btn-start'];
    for(const [w,hgt] of [[375,812],[320,568]]){for(const mode of ['fresh','8long','8long-front9']){
      const p=await page(w,hgt);await p.goto(base+'/skins',{waitUntil:'load'});
      if(mode!=='fresh')await p.evaluate(([L,f9])=>{const s=GCSkinsUI.state();s.players=L.map((n,i)=>({name:n,hcp:i*3}));if(f9)s.holes='front';GCSkinsUI.show('setup');scrollTo(0,0);},[LONG8,mode==='8long-front9']);
      const r=await p.evaluate(async T=>{const max=document.documentElement.scrollHeight-innerHeight,bad=[];let n=0;const seen=new Set();
        for(let y=0;y<=max+8;y+=8){scrollTo(0,Math.min(y,max));await new Promise(r=>requestAnimationFrame(()=>r()));
          for(const q of T){const e=document.querySelector(q);if(!e||!e.offsetParent)continue;seen.add(q);const R=e.getBoundingClientRect();
            const pts=[[R.left+R.width/2,R.top+1],[R.left+R.width/2,R.bottom-1],[R.left+4,R.top+R.height/2],[R.right-4,R.top+R.height/2]].filter(([,yy])=>yy>=0&&yy<innerHeight);
            for(const [x,yy] of pts){n++;const t=document.elementFromPoint(x,yy);if(!t)continue;const own=t===e||e.contains(t)||(e.closest('label')&&t.closest('label')===e.closest('label'));
              if(!own){const cover=t.closest('.sk-actions');if(cover&&!cover.contains(e)){bad.push(q+'@y'+y);break;}}}}}
        scrollTo(0,0);const sb=Math.round(document.getElementById('btn-start').getBoundingClientRect().bottom);
        return {n,controls:seen.size,bad:[...new Set(bad.map(b=>b.split('@')[0]))],first:bad[0]||null,max,startBottom:sb,vh:innerHeight};},T);
      const firstScreen=w===375&&mode==='fresh';const bad=r.bad.length>0||(firstScreen&&r.startBottom>r.vh);if(bad)fail=1;rows.push({name:`skins setup never covered ${w}x${hgt} ${mode}`,width:w,cover:r});
      console.log(`${gate(bad)}  skins setup, ${mode==='fresh'?'fresh':mode==='8long'?'8 long names':'8 long names, front 9'}: Start bar never covers ${r.controls} controls at any scroll position @${w}x${hgt} (${r.n} points over ${r.max}px)${firstScreen?` · Start on the first screen (bottom ${r.startBottom}px of ${r.vh})`:''}${r.bad.length?' · covered: '+r.bad.join(', ')+' first '+r.first:''}`);
      await p.context().close();}}
    for(const w of [375,320]){ // each Skins player's 9-hole DH link sits right under their stepper
      const p=await page(w);await p.goto(base+'/skins',{waitUntil:'load'});
      await p.evaluate(L=>{const s=GCSkinsUI.state();s.players=L.map((n,i)=>({name:n,hcp:i*3}));s.holes='front';GCSkinsUI.show('setup');},LONG8);
      const r=await p.evaluate(()=>[...Array(8).keys()].map(i=>{const st=document.getElementById('ph'+i).closest('.gc-stepper').getBoundingClientRect(),a=document.getElementById('dhl'+i);if(!a)return {i,ok:false};const l=a.getBoundingClientRect();
        const gap=Math.round(l.top-st.bottom),ov=Math.min(l.right,st.right)-Math.max(l.left,st.left);return {i,gap,h:Math.round(l.height),ok:gap>=-4&&gap<=12&&ov>=40&&l.height>=44&&l.right<=innerWidth};}));
      const bad=r.some(x=>!x.ok);if(bad)fail=1;rows.push({name:`skins 9-hole DH link placement ${w}`,width:w,placement:r});
      console.log(`${gate(bad)}  skins 9-hole DH link right under each of 8 steppers @${w}: gaps ${[...new Set(r.map(x=>x.gap))].join('/')}px, ${[...new Set(r.map(x=>x.h))].join('/')}px tall`);
      await p.context().close();}
    // PO 12 Nov: the Skins handicap field is plain text (no inputmode) so + and − can be typed; +2, -2 and −2 all
    // mean plus 2 with Stableford's inline note (aria-live, aria-describedby). Typed with the real keyboard.
    const W2='Plus 2 (+2): gives back 2 strokes, starting at the highest stroke index';
    for(const w of [375,320]){
      const p=await page(w);await p.goto(base+'/skins',{waitUntil:'load'});const got=[];
      for(const v of ['+2','-2','\u22122']){await p.click('#ph1');await p.keyboard.press('Control+A');await p.keyboard.press('Backspace');await p.keyboard.type(v);
        got.push(await p.evaluate(()=>{const e=document.getElementById('ph1'),n=document.getElementById('pl1'),R=n.getBoundingClientRect();
          return {note:n.textContent,live:n.getAttribute('aria-live'),desc:e.getAttribute('aria-describedby'),im:e.hasAttribute('inputmode'),type:e.type,shown:R.height>0&&R.right<=innerWidth,hcp:GCSkinsUI.state().players[1].hcp};}));
        await p.keyboard.press('Tab');got[got.length-1].after=await p.$eval('#ph1',e=>e.value);}
      const bad=got.some(g=>g.note!==W2||g.live!=='polite'||!/\bpl1\b/.test(g.desc)||g.im||g.type!=='text'||!g.shown||g.hcp!==-2||g.after!=='+2');if(bad)fail=1;
      rows.push({name:`skins plus handicap typed ${w}`,width:w,typed:got});
      console.log(`${gate(bad)}  skins handicap field @${w}: type=text, no inputmode; typed +2 / -2 / −2 → plus 2 (+2 on leaving), note "${got[0].note}" visible, aria-live polite, described by pl1${bad?' · '+JSON.stringify(got):''}`);
      await p.context().close();}
    for(const w of [375,320])await check('skins setup plus note (front 9)',w,'/skins',async p=>{await p.evaluate(()=>{const s=GCSkinsUI.state();s.holes='front';s.players[0].name='Mel';s.players[1].name='Sam';s.players[1].hcp=-4;GCSkinsUI.show('setup');});
      await p.click('#ph0');await p.keyboard.press('Control+A');await p.keyboard.type('\u22122');await p.keyboard.press('Tab');await p.evaluate(()=>scrollTo(0,document.getElementById('players').getBoundingClientRect().top+scrollY-60));},`skins-plus-note-${w}.png`);
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
      const h1=[...document.querySelectorAll('h1')].find(e=>e.getBoundingClientRect().height>0)||document.querySelector('h1');const ctl=[...document.querySelectorAll('main input:not([type=hidden]),main select,main button,main textarea')].find(vis);
      const learn=document.querySelector('.gc-learn');const R=e=>e?e.getBoundingClientRect():null;const a=R(h1),c=R(ctl),l=R(learn);
      return {h1:a?Math.round(a.bottom):-1,ctl:ctl?(ctl.id||ctl.tagName.toLowerCase()):'none',ctlBottom:c?Math.round(c.bottom):-1,learnTop:l?Math.round(l.top+scrollY):null,vh:innerHeight};});
    await p.screenshot({path:path.join(OUT,`fold-${n}-375x812.png`)});
    await p.screenshot({path:path.join(OUT,`full-${n}-375.png`),fullPage:true});
    const bad=!(r.h1>0&&r.h1<=r.vh&&r.ctlBottom>0&&r.ctlBottom<=r.vh&&(r.learnTop===null||r.learnTop>=r.ctlBottom));
    if(bad)fail=1;rows.push({name:`${n} fold 375x812`,width:375,fold:r});
    console.log(`${gate(bad)}  ${n} calculator first @375x812: H1 bottom ${r.h1}px, first control #${r.ctl} bottom ${r.ctlBottom}px (viewport ${r.vh}), search content starts at ${r.learnTop===null?'n/a':r.learnTop+'px'}`);
    await p.context().close();}
  // v9 P2 Your courses: every new screen at 375x812 and 320x568 (axe, sideways scroll, screenshots)
  const hasCourses=fs.existsSync(path.join(SITE,'gc-courses.js'));
  if(hasCourses){
    const CARDS=JSON.stringify([{name:'Royal Sydney Golf Club',tee:'Blue',holes:18,par:[4,4,3,5,4,4,3,4,5,4,4,3,5,4,4,3,4,5],si:[5,3,17,1,9,11,15,7,13,6,4,18,2,10,12,16,8,14]},{name:'Moore Park',tee:'White',holes:18,par:[4,4,3,5,4,4,3,4,5,4,4,3,5,4,4,3,4,5],si:[5,3,17,1,9,11,15,7,13,6,4,18,2,10,12,16,8,14]},{name:'Bartholomew-Fitzgerald Memorial Links',tee:'Championship',holes:9,par:[4,4,3,5,4,4,3,4,5],si:[1,2,3,4,5,6,7,8,9]}]);
    const withCards=async p=>{await p.evaluate(c=>{localStorage.clear();localStorage.setItem('gc_courses_v1',c);},CARDS);await p.reload({waitUntil:'load'});};
    const skAskUpd=async p=>{await withCards(p);await p.click('[data-cuse="1"]');await p.evaluate(()=>{const U=GCSkinsUI,s=U.state();s.players=[{name:'Alex',hcp:0},{name:'Blake',hcp:4},{name:'Casey',hcp:8},{name:'Drew',hcp:12}];s.par[4]=3;s.scores={};for(let x=1;x<=18;x++)s.scores[x]=[4,5,4,5];U.show('result');});};
    const sfAskUpd=async p=>{await withCards(p);await p.click('[data-cuse="0"]');await p.evaluate(()=>{const U=GCStablefordUI,s=U.state();s.players=[{name:'Mel',hcp:12,hcp9:null},{name:'Sam',hcp:2,hcp9:null}];s.course.par[2]=4;s.scores={};for(let x=1;x<=18;x++)s.scores[x]=[5,4];U.show('result');});};
    for(const [w,hgt] of [[375,812],[320,568]]){const sz=`${w}x${hgt}`;
      await check('v9 P2 skins setup: Your courses',w,'/skins',async p=>{await withCards(p);await p.evaluate(()=>document.getElementById('course-card').scrollIntoView());},`v9-p2-skins-setup-courses-${sz}.png`,hgt);
      await check('v9 P2 skins setup: delete asks first',w,'/skins',async p=>{await withCards(p);await p.click('[data-cdel="0"]');await p.evaluate(()=>document.getElementById('course-card').scrollIntoView());},`v9-p2-skins-delete-ask-${sz}.png`,hgt);
      await check('v9 P2 skins result: Update saved course?',w,'/skins',async p=>{await skAskUpd(p);await p.evaluate(()=>document.getElementById('course-ask').scrollIntoView({block:'center'}));},`v9-p2-skins-result-update-ask-${sz}.png`,hgt);
      await check('v9 P2 stableford setup: Your courses',w,'/stableford',async p=>{await withCards(p);await p.evaluate(()=>document.getElementById('saved-wrap').scrollIntoView({block:'center'}));},`v9-p2-stableford-setup-courses-${sz}.png`,hgt);
      await check('v9 P2 stableford course card: name + tee',w,'/stableford',async p=>{await withCards(p);await p.click('[data-cuse="0"]');await p.click('#btn-course');},`v9-p2-stableford-course-card-${sz}.png`,hgt);
      await check('v9 P2 stableford result: Update saved course?',w,'/stableford',async p=>{await sfAskUpd(p);await p.evaluate(()=>document.getElementById('course-ask').scrollIntoView({block:'center'}));},`v9-p2-stableford-result-update-ask-${sz}.png`,hgt);
    }
  }
  // v9 P3 mixed tees (GA §3(I)): setup with tees, hole screen with the second tee row, result, Stableford tab 2
  const hasMixed=/id="mixed"/.test(fs.readFileSync(path.join(SITE,'skins.html'),'utf8'));
  if(hasMixed){
    const skMix=async (p,scr)=>{await p.evaluate(scr=>{localStorage.clear();const U=GCSkinsUI,s=GCSkins.exampleState();s.mixed=true;s.course={name:'Lakes',tee:'Blue'};
      s.tee2={name:'Red',par:s.par.map((v,i)=>i===0||i===5?5:v),si:s.si.slice()};s.players[1].tee=1;s.players[3].tee=1;s.screen=scr;s.hole=1;U.set(s);},scr);await p.waitForTimeout(150);};
    const sfMix=async (p,scr)=>{await p.evaluate(scr=>{localStorage.clear();const U=GCStablefordUI,s=GCStableford.exampleState();s.mixed=true;s.course.tee='Blue';
      s.course2={tee:'Red',holes:18,par:s.course.par.map((v,i)=>i===0||i===5?5:v),si:s.course.si.slice()};s.players[2].tee=1;s.screen=scr;s.hole=1;U.set(s);},scr);await p.waitForTimeout(150);};
    for(const [w,hgt] of [[375,812],[320,568]]){const sz=`${w}x${hgt}`;
      await check('v9 P3 skins setup: players on different tees',w,'/skins',async p=>{await skMix(p,'setup');await p.evaluate(()=>document.getElementById('mixed-wrap').scrollIntoView());},`v9-p3-skins-setup-tees-${sz}.png`,hgt);
      await check('v9 P3 skins hole: second tee par + SI',w,'/skins',async p=>{await skMix(p,'hole');},`v9-p3-skins-hole-tee2-${sz}.png`,hgt);
      await check('v9 P3 skins result: mixed tees',w,'/skins',async p=>{await skMix(p,'result');},`v9-p3-skins-result-${sz}.png`,hgt);
      await check('v9 P3 stableford setup: players on different tees',w,'/stableford',async p=>{await sfMix(p,'setup');await p.evaluate(()=>document.getElementById('mixed-wrap').scrollIntoView());},`v9-p3-stableford-setup-tees-${sz}.png`,hgt);
      await check('v9 P3 stableford course card: second tee tab',w,'/stableford',async p=>{await sfMix(p,'setup');await p.click('#btn-course2');},`v9-p3-stableford-course-tab2-${sz}.png`,hgt);
      await check('v9 P3 stableford hole: second tee par + SI',w,'/stableford',async p=>{await sfMix(p,'hole');},`v9-p3-stableford-hole-tee2-${sz}.png`,hgt);
      await check('v9 P3 stableford result: mixed tees',w,'/stableford',async p=>{await sfMix(p,'result');await p.evaluate(()=>{const d=document.querySelector('details.sf-why');if(d)d.open=true;});},`v9-p3-stableford-result-${sz}.png`,hgt);
    }
  }
  // v9 P4 feedback: the form (from a result link), the empty-form message, the thanks page, the link after results, the footer
  if(pages.some(p=>p[0]==='feedback')){
    for(const [w,hgt] of [[375,812],[320,568]]){const sz=`${w}x${hgt}`;
      await check('v9 P4 feedback form (from Skins)',w,'/feedback?from=skins',null,`v9-p4-feedback-form-${sz}.png`,hgt);
      await check('v9 P4 feedback form: empty send',w,'/feedback?from=stableford',async p=>{await p.click('#fb-send');await p.evaluate(()=>document.getElementById('fb-err').scrollIntoView({block:'center'}));},`v9-p4-feedback-empty-${sz}.png`,hgt);
      await check('v9 P4 feedback thanks',w,'/feedback-thanks',null,`v9-p4-feedback-thanks-${sz}.png`,hgt);
      await check('v9 P4 skins result: Send feedback',w,'/skins',async p=>{await p.evaluate(()=>{GCSkinsUI.loadExample();});await p.waitForTimeout(150);await p.evaluate(()=>document.getElementById('fb-after').scrollIntoView({block:'center'}));},`v9-p4-skins-result-feedback-${sz}.png`,hgt);
      await check('v9 P4 stableford result: Send feedback',w,'/stableford',async p=>{await p.evaluate(()=>{GCStablefordUI.loadExample();});await p.waitForTimeout(150);await p.evaluate(()=>document.getElementById('fb-after').scrollIntoView({block:'center'}));},`v9-p4-stableford-result-feedback-${sz}.png`,hgt);
      await check('v9 P4 daily-handicap result: Send feedback',w,'/daily-handicap',async p=>{await p.fill('#ga','14.2');await p.fill('#slope','128');await p.fill('#scratch','71');await p.fill('#par','72');await p.waitForTimeout(150);await p.evaluate(()=>document.getElementById('fb-after').scrollIntoView({block:'center'}));},`v9-p4-dh-result-feedback-${sz}.png`,hgt);
      await check('v9 P4 home footer: Feedback',w,'/',async p=>{await p.evaluate(()=>document.querySelector('footer').scrollIntoView({block:'end'}));},`v9-p4-home-footer-${sz}.png`,hgt);
      await check('v9 P4 privacy: feedback form section',w,'/privacy',async p=>{await p.evaluate(()=>document.getElementById('feedback').scrollIntoView());},`v9-p4-privacy-feedback-${sz}.png`,hgt);
    }
  }
  // v10 P1 Handicap Index calculator: empty, 3 rounds entered, 20 differentials pasted (rounds list), a shared #d= view;
  // and the first control + hero on the first screen at 375x812 and 320x568 (usable in 30 s).
  if(pages.some(p=>p[0]==='handicap-calculator')){
    const P20='12.1 15.4 9.8 11.2 14.7 10.5 13.3 16.0 8.9 12.6 17.2 11.9 10.1 14.0 13.8 9.5 15.1 12.4 18.3 11.0';
    const three=async p=>{for(const s of ['92','95','90']){await p.fill('#score',s);await p.fill('#cr','71.3');await p.fill('#sl','129');await p.click('#btn-add');}await p.waitForTimeout(100);};
    const paste=async p=>{await p.check('input[name=mode][value=paste]');await p.fill('#paste',P20);await p.click('#btn-paste');await p.waitForTimeout(100);};
    for(const [w,hgt] of [[375,812],[320,568]]){const sz=`${w}x${hgt}`;
      await check('v10 P1 handicap: 3 rounds entered',w,'/handicap-calculator',three,`v10-p1-handicap-3-rounds-${sz}.png`,hgt);
      await check('v10 P1 handicap: 20 pasted, hero',w,'/handicap-calculator',async p=>{await paste(p);await p.evaluate(()=>document.getElementById('hero').scrollIntoView({block:'start'}));},`v10-p1-handicap-20-hero-${sz}.png`,hgt);
      await check('v10 P1 handicap: 20 pasted, rounds list',w,'/handicap-calculator',async p=>{await paste(p);await p.evaluate(()=>document.getElementById('rounds-card').scrollIntoView({block:'start'}));},`v10-p1-handicap-20-rounds-${sz}.png`,hgt);
      await check('v10 P1 handicap: shared view',w,'/handicap-calculator?utm_source=share&utm_medium=link&utm_campaign=handicap#d=181.208.164.181.216.173.218.236',null,`v10-p1-handicap-shared-${sz}.png`,hgt);
      {const q=await page(w,hgt);await q.goto(base+'/handicap-calculator#d=181.208.164.181.216.173.218.236',{waitUntil:'load'});await q.waitForTimeout(150);
        const bv=await q.evaluate(()=>document.getElementById('bridge').getClientRects().length>0);if(bv)fail=1;
        console.log(`${gate(bv)}  v10 P1 handicap shared view @${sz}: no "Use in Daily Handicap" bridge for someone else's index`);await q.context().close();}
      const p=await page(w,hgt);await p.goto(base+'/handicap-calculator',{waitUntil:'load'});await p.waitForTimeout(150);
      const vis=await p.evaluate(()=>['actions','bridge','rounds-card'].filter(id=>{const e=document.getElementById(id);return e&&e.getClientRects().length>0;}));
      {const bad=vis.length>0;if(bad)fail=1;console.log(`${gate(bad)}  v10 P1 handicap empty @${sz}: no Share/Copy, bridge or rounds list before 3 rounds${bad?' (visible: '+vis.join(',')+')':''}`);}
      const r=await p.evaluate(()=>{const a=document.getElementById('score').getBoundingClientRect(),b=document.getElementById('btn-add').getBoundingClientRect();return {scoreTop:Math.round(a.top),addBottom:Math.round(b.bottom),vh:innerHeight};});
      const bad=!(r.scoreTop>=0&&r.addBottom<=r.vh);if(bad)fail=1;rows.push({name:`handicap fold ${sz}`,width:w,fold:r});
      console.log(`${gate(bad)}  v10 P1 handicap fold @${sz}: Score field top ${r.scoreTop}px, Add round bottom ${r.addBottom}px of ${r.vh}px (both on the first screen)`);
      await p.context().close();
    }
  }
  // v9 P5 Add to Home Screen: the one-time tip after a result (iPhone Safari wording, Android install prompt)
  if(fs.existsSync(path.join(SITE,'gc-a2hs.js'))){
    const IPH='Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
    const tip=(ui,mode)=>async p=>{await p.evaluate(([ui,mode,IPH])=>{localStorage.removeItem('gc_a2hs_v1');
      if(mode==='ios')Object.defineProperty(navigator,'userAgent',{get:()=>IPH});else{const e=new Event('beforeinstallprompt',{cancelable:true});e.prompt=()=>{};e.userChoice=Promise.resolve({outcome:'dismissed'});dispatchEvent(e);}
      window[ui].loadExample();},[ui,mode,IPH]);await p.waitForTimeout(150);await p.evaluate(()=>document.getElementById('a2hs').scrollIntoView({block:'end'}));};
    for(const [w,hgt] of [[375,812],[320,568]]){const sz=`${w}x${hgt}`;
      await check('v9 P5 skins result: Add to Home Screen tip (iPhone)',w,'/skins',tip('GCSkinsUI','ios'),`v9-p5-skins-tip-iphone-${sz}.png`,hgt);
      await check('v9 P5 skins result: Add to Home Screen tip (Android)',w,'/skins',tip('GCSkinsUI','android'),`v9-p5-skins-tip-android-${sz}.png`,hgt);
      await check('v9 P5 stableford result: Add to Home Screen tip (iPhone)',w,'/stableford',tip('GCStablefordUI','ios'),`v9-p5-stableford-tip-iphone-${sz}.png`,hgt);
      await check('v9 P5 stableford result: Add to Home Screen tip (Android)',w,'/stableford',tip('GCStablefordUI','android'),`v9-p5-stableford-tip-android-${sz}.png`,hgt);
    }
  }
  // v10 P2 Skins polish + pot: the example result's 3 payment lines are one line each at 320 and 375, smaller than the
  // hero headline; "learn more" links in How it's calculated are >= 44px tall; pot setup and pot result screenshots.
  if(/name="pay" value="pot"/.test(fs.readFileSync(path.join(SITE,'skins.html'),'utf8'))){
    const potRound=async p=>{await p.evaluate(()=>{const U=GCSkinsUI,s=U.state();s.players=['Alex','Blake','Casey','Drew'].map(n=>({name:n,hcp:0}));s.scoring='gross';s.carry=false;s.pay='pot';s.scores={};
      const c=[7,5,3,3];let h=1;c.forEach((k,i)=>{for(let j=0;j<k;j++,h++)s.scores[h]=c.map((_,x)=>x===i?3:5);});U.show('result');});await p.waitForTimeout(150);};
    for(const [w,hgt] of [[375,812],[320,568]]){const sz=`${w}x${hgt}`;
      await check('v10 P2 skins example result (polish)',w,'/skins',async p=>{await p.evaluate(()=>GCSkinsUI.loadExample());await p.waitForTimeout(150);},`v10-p2-skins-result-${sz}.png`,hgt);
      await check('v10 P2 skins pot result',w,'/skins',potRound,`v10-p2-skins-pot-result-${sz}.png`,hgt);
      await check('v10 P2 skins setup: How is a skin paid? (More options open, From a pot)',w,'/skins',async p=>{await p.click('details.sk-more summary');await p.check('input[name=pay][value=pot]');await p.evaluate(()=>document.getElementById('pay-l').scrollIntoView({block:'center'}));},`v10-p2-skins-pay-option-${sz}.png`,hgt);
      const p=await page(w,hgt);await p.goto(base+'/skins',{waitUntil:'load'});await p.evaluate(()=>GCSkinsUI.loadExample());await p.waitForTimeout(150);
      const r=await p.evaluate(()=>{const lines=[...document.querySelectorAll('#hero .sk-pay')].map(e=>{const cs=getComputedStyle(e);return {h:Math.round(e.getBoundingClientRect().height),lh:parseFloat(cs.lineHeight),fs:parseFloat(cs.fontSize),cut:e.firstElementChild.scrollWidth>e.firstElementChild.clientWidth};});
        const big=document.querySelector('#hero .gc-big'),bfs=big?parseFloat(getComputedStyle(big).fontSize):0;
        const links=[...document.querySelectorAll('#learn p a')].map(a=>Math.round(a.getBoundingClientRect().height));return {lines,bfs,links};});
      const one=r.lines.length===3&&r.lines.every(x=>x.h<=Math.ceil(x.lh)+1&&!x.cut),sub=r.lines.every(x=>x.fs<r.bfs&&x.fs<=16),tall=r.links.length>0&&r.links.every(x=>x>=44);
      const bad=!(one&&sub&&tall);if(bad)fail=1;rows.push({name:`skins polish ${sz}`,width:w,polish:r});
      console.log(`${gate(bad)}  v10 P2 skins polish @${sz}: 3 payment lines on one line each, not cut (${r.lines.map(x=>x.h+'px').join('/')}) · ${r.lines[0]&&r.lines[0].fs}px under a ${r.bfs}px headline · ${r.links.length} learn-more links ${Math.min(...r.links)}–${Math.max(...r.links)}px tall`);
      await p.context().close();
    }
  }
  // v9 P1 landing: the Skins CTA ("Playing today?") is fully on the first screen at 375x812 and 320x568,
  // and at 375x812 the sample settle-up starts on the first screen too (the payoff is visible without scrolling).
  if(pages.some(p=>p[0]==='home')){for(const [w,hgt] of [[375,812],[320,568]]){
    const p=await page(w,hgt);await p.goto(base+'/',{waitUntil:'load'});await p.waitForTimeout(200);
    const r=await p.evaluate(()=>{const c=document.getElementById('lp-cta'),s=document.querySelector('#lp-sample .lp-pay');if(!c)return null;const a=c.getBoundingClientRect(),b=s?s.getBoundingClientRect():null;
      return {ctaTop:Math.round(a.top),ctaBottom:Math.round(a.bottom),sampleTop:b?Math.round(b.top):null,sampleBottom:b?Math.round(b.bottom):null,vh:innerHeight};});
    if(!r){await p.context().close();break;}
    await p.screenshot({path:path.join(OUT,`fold-home-${w}x${hgt}.png`)});
    const bad=!(r.ctaTop>=0&&r.ctaBottom<=r.vh&&(w!==375||r.sampleBottom<=r.vh));
    if(bad)fail=1;rows.push({name:`home fold ${w}x${hgt}`,width:w,fold:r});
    console.log(`${gate(bad)}  home landing fold @${w}x${hgt}: Skins CTA ${r.ctaTop}-${r.ctaBottom}px, first sample settle-up line ${r.sampleTop}-${r.sampleBottom}px of ${r.vh}px${w===375?' (both must be on the first screen)':' (CTA must be on the first screen)'}`);
    await p.context().close();}}
  // v11 P1 design uplift: the one shared header on every page at 320/375/1280 (49px sticky bar, nav right-aligned,
  // wordmark visible at 375 and 1280, same geometry on every page; Daily Hcp starts at x >= 280 at 375), the home first
  // screen (dated sources line on screen at 375x812) and the two-column desktop home (sample right of the h1, the tool cards in one row).
  if(/class="gc-word"/.test(fs.readFileSync(path.join(SITE,'skins.html'),'utf8'))){
    for(const w of [320,375,1280]){const sig={};
      for(const [n,u] of pages){const p=await page(w,812);await p.goto(base+u,{waitUntil:'load'});await p.waitForTimeout(100);
        const r=await p.evaluate(()=>{const h=document.querySelector('header.gc-header'),inn=h.querySelector('.gc-header-in'),wm=h.querySelector('.gc-word'),links=[...h.querySelectorAll('.gc-nav a')];
          const R=e=>e.getBoundingClientRect(),hi=R(inn),last=R(links[links.length-1]),wr=R(wm);
          return {hh:Math.round(R(h).height),pos:getComputedStyle(h).position,wmVisible:wr.width>2&&wr.height>2,wmW:Math.round(wr.width),lastRight:Math.round(last.right),innRight:Math.round(hi.right),pad:parseFloat(getComputedStyle(inn).paddingRight),
            dhX:Math.round(R(links[2]).x),brandH:Math.round(R(h.querySelector('.gc-brand')).height),sw:document.documentElement.scrollWidth,vw:innerWidth,
            geo:links.map(a=>Math.round(R(a).x)+':'+Math.round(R(a).width)).join(',')+'|'+Math.round(wr.width)+'x'+Math.round(wr.height)};});
        const rightAligned=Math.abs(r.lastRight-(r.innRight-r.pad))<=1;
        const bad=!(r.hh===49&&r.pos==='sticky'&&rightAligned&&r.brandH>=44&&r.sw<=r.vw&&(w<360||r.wmVisible)&&(w!==375||r.dhX>=280));
        if(bad)fail=1;if(n!=='home'||w<900)(sig[r.geo]=sig[r.geo]||[]).push(n);rows.push({name:`v11 header ${n} ${w}`,width:w,header:r});
        if(w===375&&['daily-handicap','privacy'].includes(n))await p.screenshot({path:path.join(OUT,`v11-p1-${n}-header-375.png`),clip:{x:0,y:0,width:375,height:120}});
        console.log(`${gate(bad)}  v11 header ${n} @${w}: ${r.hh}px ${r.pos}, nav ends at ${r.lastRight}px (inner right ${r.innRight}-${r.pad}px), wordmark ${r.wmVisible?'visible '+r.wmW+'px':'hidden'}, Daily Hcp x ${r.dhX}, page ${r.sw}/${r.vw}px`);
        await p.context().close();}
      const one=Object.keys(sig).length===1;if(!one)fail=1;
      console.log(`${gate(!one)}  v11 header geometry identical on every page @${w}${w>=900?' (home has the wider desktop container)':''}${one?'':': '+JSON.stringify(sig)}`);}
    {const p=await page(375,812);await p.goto(base+'/',{waitUntil:'load'});await p.waitForTimeout(150);
      const r=await p.evaluate(()=>{const R=id=>document.getElementById(id).getBoundingClientRect(),a=document.querySelector('#lp-rules a').getBoundingClientRect();
        return {rulesBottom:Math.round(R('lp-rules').bottom),linkH:Math.round(a.height),ctaBottom:Math.round(R('lp-cta').bottom),sampleTop:Math.round(R('lp-sample').top),h1:parseFloat(getComputedStyle(document.querySelector('.lp-hero h1')).fontSize),vh:innerHeight};});
      const bad=!(r.rulesBottom<=r.vh&&r.linkH>=44&&r.sampleTop>r.ctaBottom&&r.h1>=30);if(bad)fail=1;rows.push({name:'v11 home 375',width:375,home:r});
      console.log(`${gate(bad)}  v11 home @375x812: sources line ends at ${r.rulesBottom}px (first screen), How we calculate ${r.linkH}px tall, stacked (sample ${r.sampleTop}px below CTA ${r.ctaBottom}px), h1 ${r.h1}px`);await p.context().close();}
    {const ctx=await b.newContext({viewport:{width:1280,height:800}});await ctx.route('**/.netlify/scripts/**',r=>r.abort());const p=await ctx.newPage();await p.goto(base+'/',{waitUntil:'load'});await p.waitForTimeout(150);
      const r=await p.evaluate(()=>{const R=e=>e.getBoundingClientRect(),h1=R(document.querySelector('.lp-hero h1')),sm=R(document.getElementById('lp-sample')),cards=[...document.querySelectorAll('.lp-cards a')].map(e=>Math.round(R(e).top)),m=R(document.querySelector('main'));
        return {h1Right:Math.round(h1.right),sampleX:Math.round(sm.x),sampleTop:Math.round(sm.top),cardTops:cards,mainW:Math.round(m.width),h1:parseFloat(getComputedStyle(document.querySelector('.lp-hero h1')).fontSize),sw:document.documentElement.scrollWidth,vw:innerWidth,
          lines:[...document.querySelectorAll('#lp-sample .lp-pay')].map(e=>e.textContent.replace(/\s+/g,' ').trim())};});
      await p.screenshot({path:path.join(OUT,'v11-p1-home-1280.png')});
      const bad=!(r.sampleX>r.h1Right&&(r.cardTops.length===4&&new Set(r.cardTops).size===1||r.cardTops.length===6&&new Set(r.cardTops).size===2&&r.cardTops.filter(t=>t===r.cardTops[0]).length===3)&&r.mainW>=1024&&r.mainW<=1152&&r.h1>=36&&r.sw<=r.vw&&r.lines.join('|')==='Alex pays Drew $75.00|Blake pays Drew $75.00|Casey pays Drew $35.00');
      if(bad)fail=1;rows.push({name:'v11 home 1280',width:1280,home:r});
      console.log(`${gate(bad)}  v11 home @1280: two columns (sample x ${r.sampleX} > h1 right ${r.h1Right}), cards ${r.cardTops.length===6?'in two rows of 3':'in one row'} (${r.cardTops.join('/')}), main ${r.mainW}px, h1 ${r.h1}px, sample ${r.lines.length} lines`);await ctx.close();}
    for(const [w,hgt] of [[375,812],[320,568]]){const sz=`${w}x${hgt}`;
      await check('v11 P1 daily-handicap: example result (shared hero)',w,'/daily-handicap',async p=>{await p.click('#dh-example');await p.waitForTimeout(400);await p.evaluate(()=>document.getElementById('result').scrollIntoView({block:'start'}));},`v11-p1-dh-example-result-${sz}.png`,hgt);
      {const p=await page(w,hgt);await p.goto(base+'/daily-handicap',{waitUntil:'load'});await p.click('#dh-example');await p.waitForTimeout(100);const men=await p.textContent('#dailyOut');await p.selectOption('#gender','women');await p.waitForTimeout(100);const women=await p.textContent('#dailyOut');
        const bad=!(men==='14'&&women==='15');if(bad)fail=1;console.log(`${gate(bad)}  v11 P1 daily-handicap Load example @${sz}: men ${men}, women ${women} (anchors 14/15)`);await p.context().close();}
    }
  }
  // v12: /scramble-handicap-calculator at 375x812 and 320x568: fresh input, every control open (Handicap Index + Custom %),
  // the Load example result (hero breakdown), share + email card after a real result, a shared #r= view; axe and fit on
  // each, every visible control in the calculator >= 44px tall and steppers >= 44px wide, nothing clipped. Plus home.
  if(pages.some(p=>p[0]==='scramble-handicap-calculator')){const U='/scramble-handicap-calculator';
    const allOpen=async p=>{await p.check('input[name=kind][value=hi]');await p.check('input[name=mode][value=custom]');await p.waitForTimeout(100);};
    const real=async p=>{for(const [i,v] of [[0,'14'],[1,'8'],[2,'22'],[3,'30']])await p.fill('#ph'+i,v);await p.fill('#pn0','Bartholomew-Fitzgerald');await p.waitForTimeout(150);};
    for(const [w,hgt] of [[375,812],[320,568]]){const sz=`${w}x${hgt}`;
      await check('v12 scramble: input (fresh)',w,U,null,`v12-scramble-input-${sz}.png`,hgt);
      await check('v12 scramble: all controls (Handicap Index + Custom %)',w,U,async p=>{await allOpen(p);await p.evaluate(()=>document.getElementById('course-box').scrollIntoView({block:'start'}));},`v12-scramble-input-all-${sz}.png`,hgt);
      await check('v12 scramble: Load example result (hero)',w,U,async p=>{await p.click('#btn-example');await p.waitForTimeout(150);await p.evaluate(()=>document.getElementById('hero').scrollIntoView({block:'start'}));},`v12-scramble-result-${sz}.png`,hgt);
      await check('v12 scramble: share + email card after a real result',w,U,async p=>{await real(p);await p.evaluate(()=>document.getElementById('actions').scrollIntoView({block:'start'}));},`v12-scramble-share-email-${sz}.png`,hgt);
      await check('v12 scramble: shared #r= view',w,U+'?utm_source=share&utm_medium=link&utm_campaign=scramble#r=1.eyJ2IjoxLCJzIjo0LCJtIjoidXNnYSIsImsiOiJoaSIsInIiOjAsInAiOltbIkFsZXgiLDguNF0sWyJCbGFrZSIsMTIuNl0sWyJDYXNleSIsMjMuNF0sWyJEcmV3IiwzMS4yXV0sImMiOlsxMzUsNzIuMyw3Ml19',null,`v12-scramble-shared-${sz}.png`,hgt);
      await check('v12 home',w,'/',null,`v12-home-${sz}-full.png`,hgt);
      {const p=await page(w,hgt);await p.goto(base+U,{waitUntil:'load'});await allOpen(p);await real(p);await p.fill('#sl','113');await p.fill('#cr','72.0');await p.fill('#par','72');await p.waitForTimeout(150);
        const r=await p.evaluate(()=>{const els=[...document.querySelectorAll('#entry button,#entry input,#entry .gc-seg span,#actions button')].filter(e=>e.getClientRects().length&&!(e.type==='radio'));
          const small=els.filter(e=>{const b=e.getBoundingClientRect();return b.height<44||(e.closest('.gc-stepper')&&e.tagName==='BUTTON'&&b.width<44);}).map(e=>(e.id||e.textContent.trim()||e.tagName)+' '+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height));
          const root=document.querySelector('main'),cut=[];for(const e of root.querySelectorAll('*')){if(!e.getClientRects().length||e.closest('.sr-only')||e.tagName==='INPUT')continue;if(e.clientWidth>0&&e.scrollWidth>e.clientWidth+1)cut.push(e.id||e.className||e.tagName);}
          return {n:els.length,small,cut,sw:document.documentElement.scrollWidth,vw:innerWidth,out:(document.getElementById('sc-out')||{}).textContent};});
        const bad=r.small.length>0||r.cut.length>0||r.sw>r.vw||r.out!=='11';if(bad)fail=1;rows.push({name:`v12 scramble targets ${sz}`,width:w,v12:r});
        console.log(`${gate(bad)}  v12 scramble @${sz}: ${r.n} controls, under 44px ${r.small.length}${r.small.length?' ('+r.small.slice(0,6).join(', ')+')':''}, clipped ${r.cut.length}${r.cut.length?' ('+r.cut.slice(0,5).join(', ')+')':''}, page ${r.sw}/${r.vw}px, custom result ${r.out}`);await p.context().close();}
    }
  }
  // v13: /match-play-handicap-calculator and /nassau-calculator at 375x812 and 320x568: fresh input, every control open
  // (4 players, Handicap Index, all 18 SI), the example result, the live strip mid-round, the final/settle view, a shared
  // #r= view; axe and fit on each; every visible control >= 44px tall (stepper buttons >= 44px wide), nothing clipped,
  // the sticky strip sits directly under the sticky header (no overlap, no gap) and stays inside the viewport.
  const MPSH='/match-play-handicap-calculator?utm_source=share&utm_medium=link&utm_campaign=matchplay#r=1z.HcdNDoIwEIDRu3zrMXF0QZkd6i2aLoopIaEEU3-QEO9OcPfeygdTocPopndpY86HMb7uPcKA8UePqRMemPc0OX0RPQbxXHIcEqJuzzU-04Kcqj23kmbkXIfw2wA';
  const NSSH='/nassau-calculator?utm_source=share&utm_medium=link&utm_campaign=nassau#r=1z.Rc0xCoNAEEbhu7x6CsfsqpkuuYZYiJgEokZQJCDePSBhtprHV_yzs2EqPDB0U4QJq7kN_RfhPrTvnkZYViwKU79imfDEGNu1eyG080nz5zzjcM4tHbajWB0kNkLudfEKXhGro4RGKNxKt8rt6qaZo2rSPGX6oyFpTFokLZNWfz2OHw';
  const v13radio=(name,v)=>`(()=>{const r=document.querySelector('input[name=${name}][value="${v}"]');r.checked=true;r.dispatchEvent(new Event('change',{bubbles:true}));})()`;
  const v13fit=async(p,sel)=>p.evaluate(sel=>{const els=[...document.querySelectorAll(sel)].filter(e=>e.getClientRects().length&&e.type!=='radio'&&e.type!=='checkbox'&&!e.closest('[hidden]'));
    const small=els.filter(e=>{const b=e.getBoundingClientRect();return b.height<44||(e.closest('.gc-stepper')&&e.tagName==='BUTTON'&&b.width<44);}).map(e=>(e.id||e.textContent.trim().slice(0,16)||e.tagName)+' '+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height));
    const cut=[];for(const e of document.querySelectorAll('main *')){if(!e.getClientRects().length||e.closest('.sr-only')||e.tagName==='INPUT')continue;if(e.clientWidth>0&&e.scrollWidth>e.clientWidth+1)cut.push(e.id||e.className||e.tagName);}
    return {n:els.length,small,cut,sw:document.documentElement.scrollWidth,vw:innerWidth};},sel);
  const v13strip=async(p,id)=>p.evaluate(id=>{const s=document.getElementById(id),hd=document.querySelector('.gc-header');const y=s.getBoundingClientRect().top+scrollY,room=s.parentElement.getBoundingClientRect().bottom-s.getBoundingClientRect().bottom;window.scrollTo(0,y-hd.offsetHeight+Math.max(1,Math.min(120,room-8)));
    const a=s.getBoundingClientRect(),h=hd.getBoundingClientRect();return {sticky:getComputedStyle(s).position,top:Math.round(a.top),hb:Math.round(h.bottom),right:Math.round(a.right),vw:innerWidth,h:Math.round(a.height),vh:innerHeight};},id);
  const v13log=(name,sz,r,extra,bad)=>{if(bad)fail=1;rows.push({name:`${name} ${sz}`,v13:r});console.log(`${gate(bad)}  ${name} @${sz}: ${r.n} controls, under 44px ${r.small.length}${r.small.length?' ('+r.small.slice(0,6).join(', ')+')':''}, clipped ${r.cut.length}${r.cut.length?' ('+r.cut.slice(0,5).join(', ')+')':''}, page ${r.sw}/${r.vw}px${extra}`);};
  if(pages.some(p=>p[0]==='match-play-handicap-calculator')){const U='/match-play-handicap-calculator';
    const all=async p=>{await p.evaluate(v13radio('fmt','fourball-match'));await p.evaluate(v13radio('kind','hi'));await p.evaluate(()=>{document.getElementById('more').open=true;
      ['Bartholomew-Fitzgerald','Blake','Casey','Drew'].forEach((v,i)=>{const e=document.getElementById('pn'+i);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));});
      [['ph0','8.4'],['ph1','12.6'],['ph2','23.4'],['ph3','31.2'],['sl','135'],['cr','72.3'],['par','72']].forEach(([k,v])=>{const e=document.getElementById(k);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));});});await p.waitForTimeout(150);};
    const ex=async p=>{await p.click('#btn-example');await p.waitForTimeout(150);};
    const holes=async(p,n,pat)=>{for(let i=0;i<n;i++){await p.evaluate(c=>{const v=c==='A'?[4,4,6,6]:c==='B'?[5,5,4,4]:[4,5,5,6];[0,1,2,3].forEach(k=>{const e=document.getElementById('sc'+k);if(e)e.value=String(v[k]);});document.getElementById('btn-next').click();},pat[i%pat.length]);await p.waitForTimeout(30);}};
    for(const [w,hgt] of [[375,812],[320,568]]){const sz=`${w}x${hgt}`;
      await check('v13 match play: input (fresh)',w,U,null,`v13-matchplay-input-${sz}.png`,hgt);
      await check('v13 match play: all controls (four-ball, 4 players, Handicap Index, SI grid)',w,U,async p=>{await all(p);await p.evaluate(()=>document.getElementById('more').scrollIntoView({block:'start'}));},`v13-matchplay-input-all-${sz}.png`,hgt);
      await check('v13 match play: Load example result (hero + stroke table)',w,U,async p=>{await ex(p);await p.evaluate(()=>document.getElementById('hero').scrollIntoView({block:'start'}));},`v13-matchplay-result-${sz}.png`,hgt);
      await check('v13 match play: live strip mid-round (thru 6)',w,U,async p=>{await ex(p);await p.click('#btn-play');await holes(p,6,'AAHBAH');await p.evaluate(()=>window.scrollTo(0,document.getElementById('play').getBoundingClientRect().top+scrollY-60));},`v13-matchplay-live-${sz}.png`,hgt);
      await check('v13 match play: final (won 3 & 2)',w,U,async p=>{await ex(p);await p.click('#btn-play');await holes(p,16,'AAAHHHHHHHHHHHHH');await p.evaluate(()=>document.getElementById('final').scrollIntoView({block:'center'}));},`v13-matchplay-final-${sz}.png`,hgt);
      await check('v13 match play: shared #r= view',w,MPSH,null,`v13-matchplay-shared-${sz}.png`,hgt);
      {const p=await page(w,hgt);await p.goto(base+U,{waitUntil:'load'});await all(p);const r=await v13fit(p,'#entry button,#entry input,#entry summary,#entry .gc-seg span,#actions button');
        const tbl=await p.evaluate(()=>{const t=document.getElementById('mp-table')||document.getElementById('table-card');return t?{sw:t.scrollWidth,cw:t.clientWidth}:null;});
        v13log('v13 match play controls',sz,r,'',r.small.length>0||r.cut.length>0||r.sw>r.vw);await p.context().close();}
      {const p=await page(w,hgt);await p.goto(base+U,{waitUntil:'load'});await ex(p);await p.click('#btn-play');await holes(p,6,'AAHBAH');
        const r=await v13fit(p,'#play button,#play input');const st=await p.evaluate(()=>document.getElementById('mp-status').textContent.trim());const s=await v13strip(p,'mp-strip');
        const okStrip=s.sticky==='sticky'&&Math.abs(s.top-s.hb)<=1&&s.right<=s.vw;
        v13log('v13 match play live',sz,r,` · strip "${st}" ${s.sticky} at ${s.top}px under header ${s.hb}px, ${s.h}px tall`,r.small.length>0||r.cut.length>0||r.sw>r.vw||!okStrip||st!=='Alex & Blake are 2 up through 6');await p.context().close();}
    }
  }
  if(pages.some(p=>p[0]==='nassau-calculator')){const U='/nassau-calculator';
    const all=async p=>{await p.evaluate(v13radio('fmt','2v2'));await p.evaluate(v13radio('net','1'));await p.evaluate(()=>{document.getElementById('more').open=true;
      ['Bartholomew-Fitzgerald','Ben','Christabel-Rose','Dana'].forEach((v,i)=>{const e=document.getElementById('pn'+i);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));});
      [['ph0','4'],['ph1','12'],['ph2','6'],['ph3','8'],['stake','12.50']].forEach(([k,v])=>{const e=document.getElementById(k);if(e){e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));}});});await p.waitForTimeout(150);};
    const holes=async(p,pat)=>{for(const c of pat){await p.evaluate(c=>{const v=c==='A'?[4,6,5,6]:c==='B'?[5,6,4,6]:[4,6,4,6];[0,1,2,3].forEach(k=>{const e=document.getElementById('sc'+k);if(e)e.value=String(v[k]);});document.getElementById('btn-next').click();},c);await p.waitForTimeout(30);}};
    const live=async p=>{await all(p);await p.evaluate(v13radio('net','0'));await p.click('#btn-start');await holes(p,'AAAABB');}; // 4 players, presses from holes 3 and 5 live (chain)
    for(const [w,hgt] of [[375,812],[320,568]]){const sz=`${w}x${hgt}`;
      await check('v13 nassau: setup (fresh)',w,U,null,`v13-nassau-setup-${sz}.png`,hgt);
      await check('v13 nassau: all controls (2v2 net, 4 players, More options)',w,U,async p=>{await all(p);await p.evaluate(()=>document.getElementById('more').scrollIntoView({block:'start'}));},`v13-nassau-setup-all-${sz}.png`,hgt);
      await check('v13 nassau: live strip mid-round (2v2, press chain, thru 6)',w,U,async p=>{await live(p);await p.evaluate(()=>window.scrollTo(0,document.getElementById('play').getBoundingClientRect().top+scrollY-60));},`v13-nassau-live-${sz}.png`,hgt);
      await check('v13 nassau: settle (Load example)',w,U,async p=>{await p.click('#btn-example');await p.waitForTimeout(150);await p.evaluate(()=>document.getElementById('result').scrollIntoView({block:'start'}));},`v13-nassau-settle-${sz}.png`,hgt);
      await check('v13 nassau: settle, 2v2 with presses (ledger)',w,U,async p=>{await live(p);await holes(p,'BAAHHH'+'BBHHHHHHH'.replace(/H/g,'A'));await p.waitForTimeout(100);await p.evaluate(()=>document.getElementById('ledger').scrollIntoView({block:'start'}));},`v13-nassau-settle-ledger-${sz}.png`,hgt);
      await check('v13 nassau: shared #r= view',w,NSSH,null,`v13-nassau-shared-${sz}.png`,hgt);
      {const p=await page(w,hgt);await p.goto(base+U,{waitUntil:'load'});await all(p);const r=await v13fit(p,'#entry button,#entry input,#entry summary,#entry .gc-seg span');
        v13log('v13 nassau setup controls',sz,r,'',r.small.length>0||r.cut.length>0||r.sw>r.vw);await p.context().close();}
      {const p=await page(w,hgt);await p.goto(base+U,{waitUntil:'load'});await live(p);
        const r=await v13fit(p,'#play button,#play input');const st=await p.evaluate(()=>({bets:document.querySelectorAll('#ns-bets li').length,txt:document.getElementById('ns-bets').textContent}));const s=await v13strip(p,'ns-strip');
        const okStrip=s.sticky==='sticky'&&Math.abs(s.top-s.hb)<=1&&s.right<=s.vw&&s.h<=s.vh*0.45;
        v13log('v13 nassau live',sz,r,` · strip ${st.bets} bets, ${s.sticky} at ${s.top}px under header ${s.hb}px, ${s.h}px tall of ${s.vh}`,r.small.length>0||r.cut.length>0||r.sw>r.vw||!okStrip||st.bets<4);await p.context().close();}
    }
  }
  // v11 P2 monetisation: the email card after a real result and the gear block on each calculator, the footer signup,
  // its error and success states (fetch stubbed: nothing is posted from a test), at 375x812 and 320x568, with axe and fit.
  if(fs.existsSync(path.join(SITE,'gc-grow.js'))){
    const real={skins:"(()=>{const U=GCSkinsUI;U.loadExample();const s=U.state();s.scores[1]=s.scores[1].map(v=>v+1);U.show('result');})()",
      stableford:"(()=>{const U=GCStablefordUI;U.loadExample();const s=U.state();s.scores[1]=s.scores[1].map(v=>v+1);U.show('result');})()",
      'daily-handicap':null,'handicap-calculator':null,'scramble-handicap-calculator':null,'match-play-handicap-calculator':null,
      'nassau-calculator':null};
    const result=async(p,t)=>{if(real[t])await p.evaluate(real[t]);else if(t==='daily-handicap'){await p.fill('#ga','12.4');await p.fill('#slope','131');await p.fill('#scratch','70.5');await p.fill('#par','72');}
      else if(t==='nassau-calculator'){await p.click('#btn-start');await p.click('#btn-next');await p.click('#btn-settle');}
      else if(t==='match-play-handicap-calculator'){await p.fill('#ph0','14');await p.fill('#ph1','8');}
      else if(t==='scramble-handicap-calculator'){for(const [i,v] of [[0,'14'],[1,'8'],[2,'22'],[3,'30']])await p.fill('#ph'+i,v);}
      else{for(const sc of ['92','95','90']){await p.fill('#score',sc);await p.fill('#cr','71.3');await p.fill('#sl','129');await p.click('#btn-add');}}await p.waitForTimeout(150);};
    const stub=async p=>{await p.evaluate(()=>{window.fetch=()=>Promise.resolve({ok:true,status:200});});};
    for(const [w,hgt] of [[375,812],[320,568]]){const sz=`${w}x${hgt}`;
      for(const t of ['skins','stableford','daily-handicap','handicap-calculator'].concat(['scramble-handicap-calculator','match-play-handicap-calculator','nassau-calculator'].filter(n=>pages.some(p=>p[0]===n)))){
        await check(`v11 P2 ${t}: email card after a real result`,w,'/'+t,async p=>{await result(p,t);await p.evaluate(()=>document.getElementById('gc-nl-card').scrollIntoView({block:'center'}));},`v11-p2-${t}-email-card-${sz}.png`,hgt);
        await check(`v11 P2 ${t}: gear for this game`,w,'/'+t,async p=>{await result(p,t);await p.evaluate(()=>document.getElementById('gc-gear').scrollIntoView({block:'center'}));},`v11-p2-${t}-gear-${sz}.png`,hgt);
        const p=await page(w,hgt);await p.goto(base+'/'+t,{waitUntil:'load'});await result(p,t);
        const r=await p.evaluate(()=>{const c=document.getElementById('gc-nl-card'),g=document.getElementById('gc-gear'),x=c.querySelector('.gc-nl-x').getBoundingClientRect(),btn=c.querySelector('button[type=submit]').getBoundingClientRect(),cons=c.querySelector('.gc-nl-consent').getBoundingClientRect();
          return {card:c.getClientRects().length>0,gear:g.querySelectorAll('a[rel="sponsored nofollow noopener"]').length,x:[Math.round(x.width),Math.round(x.height)],btnH:Math.round(btn.height),consH:Math.round(cons.height),sw:document.documentElement.scrollWidth,vw:innerWidth};});
        const bad=!(r.card&&r.gear>=2&&r.x[0]>=44&&r.x[1]>=44&&r.btnH>=44&&r.consH>=44&&r.sw<=r.vw);if(bad)fail=1;rows.push({name:`v11 grow ${t} ${sz}`,width:w,grow:r});
        console.log(`${gate(bad)}  v11 P2 ${t} @${sz}: card shown, ${r.gear} gear links, x ${r.x.join('x')}, Subscribe ${r.btnH}px, consent row ${r.consH}px, page ${r.sw}/${r.vw}px`);await p.context().close();
      }
      await check('v11 P2 footer signup: error state',w,'/privacy',async p=>{await p.evaluate(()=>{const f=document.querySelector('footer form');f.querySelector('input[type=email]').value='nope';f.querySelector('button[type=submit]').click();f.scrollIntoView({block:'center'});});},`v11-p2-footer-error-${sz}.png`,hgt);
      await check('v11 P2 footer signup: success state',w,'/',async p=>{await stub(p);await p.evaluate(()=>{const f=document.querySelector('footer form');f.querySelector('input[type=email]').value='a@example.com';f.querySelector('input[name=consent]').checked=true;f.querySelector('button[type=submit]').click();});await p.waitForTimeout(100);await p.evaluate(()=>document.querySelector('footer').scrollIntoView({block:'center'}));},`v11-p2-footer-success-${sz}.png`,hgt);
    }
  }
  // v11 P3 leftover: Skins setup clips nothing at 320 and 375 (fresh, 8 long names, front 9, From a pot with More options
  // open): the page never scrolls sideways and no element in the setup has scrollWidth > clientWidth (labels in segmented
  // controls, the allowance "100%", handicap values like "+10"). Player-name text fields are exempt: a long name scrolls
  // inside its own input, as any text field does. Visually hidden (.sr-only) helpers are exempt too.
  if(isV2&&/v11 leftover: nothing in the setup is cut off/.test(fs.readFileSync(path.join(SITE,'skins.html'),'utf8'))){
    const L8=JSON.stringify(SKLONG8);
    const st={fresh:'',max8:`const s=GCSkinsUI.state();s.players=${L8}.map((n,i)=>({name:n,hcp:i===0?-10:54-i}));GCSkinsUI.show('setup');`,
      'max8 front 9':`const s=GCSkinsUI.state();s.players=${L8}.map((n,i)=>({name:n,hcp:i===0?-10:54-i}));s.holes='front';GCSkinsUI.show('setup');`,
      'max8 pot, More options open':`const s=GCSkinsUI.state();s.players=${L8}.map((n,i)=>({name:n,hcp:i===0?-10:54-i}));s.pay='pot';GCSkinsUI.show('setup');`};
    for(const w of [320,375])for(const [k,js] of Object.entries(st)){const p=await page(w,812);await p.goto(base+'/skins',{waitUntil:'load'});
      await p.evaluate(js=>{if(js)(new Function(js))();document.querySelectorAll('#scr-setup details').forEach(d=>d.open=true);},js);await p.waitForTimeout(150);
      const r=await p.evaluate(()=>{const root=document.getElementById('scr-setup'),cut=[];
        for(const e of [root,...root.querySelectorAll('*')]){if(!e.getClientRects().length||e.closest('.sr-only')||/^pn\d$/.test(e.id))continue;if(e.clientWidth>0&&e.scrollWidth>e.clientWidth+1)cut.push((e.id||e.tagName.toLowerCase()+'.'+[...e.classList].join('.'))+' '+e.scrollWidth+'>'+e.clientWidth);}
        return {sw:document.documentElement.scrollWidth,vw:innerWidth,cut};});
      if(w===320&&k.includes('pot'))await p.screenshot({path:path.join(OUT,'v11-p3-skins-setup-more-320.png'),fullPage:true});
      const bad=r.sw>r.vw||r.cut.length>0;if(bad)fail=1;rows.push({name:`v11 skins setup clip ${k} ${w}`,width:w,clip:r});
      console.log(`${gate(bad)}  v11 P3 skins setup (${k}) @${w}: page ${r.sw}/${r.vw}px, clipped elements ${r.cut.length}${r.cut.length?' ('+r.cut.slice(0,5).join(', ')+')':''}`);await p.context().close();}
    for(const w of [320,375])await check('v11 P3 skins setup, More options open (8 long names, From a pot)',w,'/skins',async p=>{await p.evaluate(L=>{const s=GCSkinsUI.state();s.players=L.map((n,i)=>({name:n,hcp:i===0?-10:54-i}));s.pay='pot';GCSkinsUI.show('setup');document.querySelectorAll('#scr-setup details').forEach(d=>d.open=true);document.getElementById('allow-row').scrollIntoView({block:'center'});},SKLONG8);},`v11-p3-skins-setup-allowance-${w}.png`);
  }
  await b.close();
  const lh=[];
  // the Stableford example as a shared result link (same bytes the page writes; share-link design §3 sample)
  const SHARED='/stableford#r=1z.TY7BSsNQFER_Rc76Cibvzk19uy66EVy5DFk801QLKQ2tSEH899JHEWc1zDCH-eGb3BhfZM47jJHM5lIOyzw9jOW0xTiRaVYYF_KTsZRb4J7knlx_BuO8J6PUdM_v291n67Eq4_Sxx1hmct_zOs1Y0xqSh9wleQp5khis560csNbwqkr3O_1Wvxyx1o0IdQqPCHknSVHr9Yw91vW_bxXBMPxeAQ';
  const SKSHARED='/skins#r=1z.Tc5NbsJADEDhuzyx9CJDbEi9K-0tIhYDDC1ioIj0DyHujiZAhLwZyd88-cwvHoRvnG6LMMIxhCNOaBB2OGuEiIeqEpa9Tzh7hC98_5OzcIjlh2ptqrXa8EDoNqVZh-nLYrX-HOukicv0sUE4ZLxtec3pH6nkVlKrTSdqpXAb5tIyy3GbEL0r07Iq2zuyXr3FLp2QZmhpQU-wV-_H9IeE8dCycuojqaU1v1wB'; // the Skins example link (tests/baseline/skins-share-link-12nov.json)
  if(!noLh){for(const [n,u] of [['home','/'],['skins','/skins'],['skins-shared',SKSHARED],['stableford','/stableford'],['stableford-shared',SHARED],['privacy','/privacy'],['daily-handicap','/daily-handicap'],['handicap-calculator','/handicap-calculator'],['handicap-shared','/handicap-calculator#d=181.208.164.181.216.173.218.236'],['scramble-handicap-calculator','/scramble-handicap-calculator'],['scramble-shared','/scramble-handicap-calculator#r=1.eyJ2IjoxLCJzIjo0LCJtIjoidXNnYSIsImsiOiJoaSIsInIiOjAsInAiOltbIkFsZXgiLDguNF0sWyJCbGFrZSIsMTIuNl0sWyJDYXNleSIsMjMuNF0sWyJEcmV3IiwzMS4yXV0sImMiOlsxMzUsNzIuMyw3Ml19'],['match-play-handicap-calculator','/match-play-handicap-calculator'],['matchplay-shared',MPSH],['nassau-calculator','/nassau-calculator'],['nassau-shared',NSSH],['feedback','/feedback'],['feedback-thanks','/feedback-thanks']]){
    if(!pages.some(p=>p[0]===n)&&!(n==='stableford-shared'&&hasShare)&&!(n==='skins-shared'&&hasSkShare)&&!(n==='handicap-shared'&&pages.some(p=>p[0]==='handicap-calculator'))&&!(n==='scramble-shared'&&pages.some(p=>p[0]==='scramble-handicap-calculator'))&&!(n==='matchplay-shared'&&pages.some(p=>p[0]==='match-play-handicap-calculator'))&&!(n==='nassau-shared'&&pages.some(p=>p[0]==='nassau-calculator')))continue;
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
