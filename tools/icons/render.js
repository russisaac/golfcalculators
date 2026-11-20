#!/usr/bin/env node
// v9 P5 home-screen icons for manifest.webmanifest, rendered with headless Chrome:
//   icons/icon-192.png, icons/icon-512.png        purpose "any": favicon.svg as is (rounded, transparent corners)
//   icons/icon-maskable-192.png / -512.png        purpose "maskable": tools/icons/maskable.svg, full-bleed square,
//                                                 flag and ball inside the 80% safe zone so Android's mask never clips them
// usage (repo root, after `cd tests && npm ci`): node tools/icons/render.js     Env: CHROME_PATH
const path=require('path'),fs=require('fs');const ROOT=path.resolve(__dirname,'../..');
const {chromium}=require(path.join(ROOT,'tests/node_modules/playwright-core'));
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
 fs.mkdirSync(path.join(ROOT,'icons'),{recursive:true});
 for(const [src,out,sz,transparent] of [['favicon.svg','icons/icon-192.png',192,1],['favicon.svg','icons/icon-512.png',512,1],['tools/icons/maskable.svg','icons/icon-maskable-512.png',512,0],['tools/icons/maskable.svg','icons/icon-maskable-192.png',192,0]]){
  const p=await b.newPage({viewport:{width:sz,height:sz},deviceScaleFactor:1});
  await p.setContent(`<html><body style="margin:0;background:transparent"><img src="data:image/svg+xml;base64,${fs.readFileSync(path.join(ROOT,src)).toString('base64')}" width="${sz}" height="${sz}" style="display:block"></body></html>`);
  await p.waitForTimeout(100);await p.screenshot({path:path.join(ROOT,out),omitBackground:!!transparent,clip:{x:0,y:0,width:sz,height:sz}});await p.close();console.log('ok  '+out);}
 await b.close();})().catch(e=>{console.error(e);process.exit(2);});
