#!/usr/bin/env node
// Renders the share images (og:image) for every page in pages.json from template.html
// into /og/<page>.png at 1200x630, then checks each is a PNG of 1200x630 and <= 300 KB.
// usage (from the repo root, after `cd tests && npm ci`):  node tools/og-images/render.js
// Env: CHROME_PATH (default /usr/bin/google-chrome).
const path=require('path'),fs=require('fs');
const ROOT=path.resolve(__dirname,'../..');
const {chromium}=require(path.join(ROOT,'tests/node_modules/playwright-core'));
const pages=require('./pages.json');
const MAX=300*1024;
function pngInfo(buf){if(buf.slice(0,8).toString('hex')!=='89504e470d0a1a0a')return null;return {w:buf.readUInt32BE(16),h:buf.readUInt32BE(20)};}
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--font-render-hinting=none']});
  const p=await b.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
  fs.mkdirSync(path.join(ROOT,'og'),{recursive:true});let bad=0;
  for(const pg of pages){
    await p.goto('file://'+path.join(__dirname,'template.html'));
    await p.evaluate(d=>{for(const k of ['kicker','title','value'])document.getElementById(k).textContent=d[k];},pg);
    await p.evaluate(()=>document.fonts.ready);
    const fit=await p.evaluate(()=>{const t=document.querySelector('.txt');return t.scrollHeight<=t.parentElement.clientHeight;});
    const out=path.join(ROOT,'og',pg.page+'.png');
    await p.screenshot({path:out,clip:{x:0,y:0,width:1200,height:630}});
    const buf=fs.readFileSync(out),i=pngInfo(buf);const ok=i&&i.w===1200&&i.h===630&&buf.length<=MAX&&fit;if(!ok)bad++;
    console.log(`${ok?'ok  ':'FAIL'} og/${pg.page}.png ${i?i.w+'x'+i.h:'not png'} ${(buf.length/1024).toFixed(1)} KB${fit?'':' (text overflows)'}`);
  }
  await b.close();process.exit(bad?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
