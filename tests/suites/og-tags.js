// og-tags (priorities-v7 P2): every page's static HTML (no JS run) has the OG/Twitter tags
// (twitter:title/description/image/image:alt equal to their og: values),
// og:url equals <link rel=canonical> (extensionless https), og:image is an absolute https
// URL, and each og:image served at that path (from OG_BASE, e.g. the Deploy Preview, else a
// local Netlify-style server of this checkout) is 200 image/png, 1200x630, <= 300 KB.
const {JSDOM}=require('jsdom');const {spawn}=require('child_process');
const {SITE,ok,report,path,fs}=require('../lib/harness');
const MAX=300*1024;
const pngDims=b=>b.length>24&&b.slice(0,8).toString('hex')==='89504e470d0a1a0a'?[b.readUInt32BE(16),b.readUInt32BE(20)]:null;
const files=fs.readdirSync(SITE).filter(n=>n.endsWith('.html')).sort();
const spec=fs.existsSync(path.join(SITE,'tools/og-images/pages.json'))?JSON.parse(fs.readFileSync(path.join(SITE,'tools/og-images/pages.json'),'utf8')):[];
const images=new Map();
for(const f of files){
  const d=new JSDOM(fs.readFileSync(path.join(SITE,f),'utf8')).window.document;
  const prop=p=>{const m=d.querySelector(`meta[property="${p}"]`);return m?m.getAttribute('content'):null;};
  const name=n=>{const m=d.querySelector(`meta[name="${n}"]`);return m?m.getAttribute('content'):null;};
  const canon=(d.querySelector('link[rel=canonical]')||{getAttribute:()=>null}).getAttribute('href');
  const want=f==='index.html'?'https://golfcalculators.com/':'https://golfcalculators.com/'+f.slice(0,-5);
  const missing=['og:title','og:description','og:url','og:image','og:image:width','og:image:height','og:image:alt','og:type','og:site_name'].filter(p=>!(prop(p)||'').trim());
  for(const n of ['twitter:card','twitter:title','twitter:description','twitter:image','twitter:image:alt'])if(!(name(n)||'').trim())missing.push(n);
  ok(`${f}: all OG/Twitter tags present in static HTML`,!missing.length,missing.length?'missing '+missing.join(', '):'');
  ok(`${f}: each OG tag appears once`,['og:title','og:url','og:image','og:type'].every(p=>d.querySelectorAll(`meta[property="${p}"]`).length===1));
  ok(`${f}: canonical is the extensionless https URL`,canon===want,String(canon));
  ok(`${f}: og:url equals canonical`,prop('og:url')===canon,`${prop('og:url')} vs ${canon}`);
  ok(`${f}: twitter title/description/image/image:alt equal their og: values`,name('twitter:title')===prop('og:title')&&name('twitter:description')===prop('og:description')&&name('twitter:image')===prop('og:image')&&name('twitter:image:alt')===prop('og:image:alt'));
  ok(`${f}: each Twitter tag appears once`,['twitter:card','twitter:title','twitter:description','twitter:image','twitter:image:alt'].every(n=>d.querySelectorAll(`meta[name="${n}"]`).length===1));
  ok(`${f}: og:type=website, og:image 1200x630, twitter:card=summary_large_image`,prop('og:type')==='website'&&prop('og:image:width')==='1200'&&prop('og:image:height')==='630'&&name('twitter:card')==='summary_large_image');
  const img=prop('og:image')||'';
  ok(`${f}: og:image is an absolute https URL on golfcalculators.com ending .png`,/^https:\/\/golfcalculators\.com\/[^?#]+\.png$/.test(img),img);
  const s=spec.find(x=>x.file===f);
  ok(`${f}: tags match tools/og-images/pages.json`,!!s&&prop('og:title')===s.ogTitle&&prop('og:description')===s.ogDescription&&prop('og:url')===s.url&&img===`https://golfcalculators.com/og/${s.page}.png`,s?'':'no pages.json entry');
  if(img)images.set(f,new URL(img).pathname);
}
(async()=>{
  let base=process.env.OG_BASE,srv=null;
  if(!base){const port=8700+Math.floor(Math.random()*80);srv=spawn(process.execPath,[path.join(__dirname,'../lib/serve.js'),SITE,String(port)],{stdio:'ignore'});base='http://localhost:'+port;
    for(let i=0;i<40;i++){try{await fetch(base+'/robots.txt');break;}catch(e){await new Promise(r=>setTimeout(r,100));}}}
  base=base.replace(/\/$/,'');
  for(const [f,p] of images){
    try{const r=await fetch(base+p);const b=Buffer.from(await r.arrayBuffer());const dims=pngDims(b);
      ok(`${f}: og:image ${p} → 200 image/png 1200x630 <= 300 KB (${base.replace(/^https?:\/\//,'')})`,r.status===200&&(r.headers.get('content-type')||'').startsWith('image/png')&&dims&&dims[0]===1200&&dims[1]===630&&b.length<=MAX,
        `${r.status} ${r.headers.get('content-type')} ${dims?dims.join('x'):'not png'} ${(b.length/1024).toFixed(1)} KB`);}
    catch(e){ok(`${f}: og:image ${p} fetch`,false,e.message);}
  }
  if(srv)srv.kill();
  process.exit(report('og-tags')?1:0);
})();
