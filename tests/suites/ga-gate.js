// GA4 loads only on golfcalculators.com / www.golfcalculators.com (P2a branch).
const {SITE,boot,ok,report,path,fs}=require('../lib/harness');
const pages=fs.readdirSync(SITE).filter(n=>n.endsWith('.html')&&fs.readFileSync(path.join(SITE,n),'utf8').includes('G-DH32H3GWKE'));
const gated=pages.filter(n=>/location\.hostname === 'golfcalculators\.com'/.test(fs.readFileSync(path.join(SITE,n),'utf8')));
if(!gated.length){console.log('SKIP  GA4 not hostname-gated on this branch (P1 keeps the live tag byte-identical)');process.exit(0);}
ok('every page with GA4 is gated',gated.length===pages.length&&pages.sort().join()==='skins.html,stableford.html',pages.join());
for(const n of pages){
  for(const host of ['golfcalculators.com','www.golfcalculators.com','p2a-skins--golfcalculators.netlify.app','localhost','golfcalculators.com.evil.example','127.0.0.1']){
    const h=boot(path.join(SITE,n),{url:`https://${host}/${n.replace('.html','')}`});
    const tag=[...h.d.querySelectorAll('script[src]')].some(s=>s.src==='https://www.googletagmanager.com/gtag/js?id=G-DH32H3GWKE');
    const cfg=(h.w.dataLayer||[]).some(a=>a[0]==='config'&&a[1]==='G-DH32H3GWKE');
    const prod=host==='golfcalculators.com'||host==='www.golfcalculators.com';
    ok(`${n} on ${host}: gtag ${prod?'loads + config':'not loaded, no config'}`,prod?(tag&&cfg):(!tag&&!cfg),`tag=${tag} config=${cfg}`);
  }
}
// Shared result links (#r=…, share-link design §1): names and scores live in the fragment, so GA gets
// page_location = origin + pathname (no fragment) on those pages; other pages keep the plain config.
for(const n of pages.filter(n=>/gaStrip/.test(fs.readFileSync(path.join(SITE,n),'utf8')))){
  const pg=n.replace('.html',''),frag='#r=1z.TY7BSsNQFER_Rc76Cibvzk19uy66EVy5DFk801QLKQ2tSEH899JHEWc1zDCH';
  for(const host of ['golfcalculators.com','www.golfcalculators.com']){
    const h=boot(path.join(SITE,n),{url:`https://${host}/${pg}${frag}`});
    const cfg=(h.w.dataLayer||[]).filter(a=>a[0]==='config'&&a[1]==='G-DH32H3GWKE');
    const pl=cfg[0]&&cfg[0][2]&&cfg[0][2].page_location;
    ok(`${n} on https://${host}/${pg}#r=…: one config, page_location = https://${host}/${pg} (no fragment)`,cfg.length===1&&pl===`https://${host}/${pg}`,String(pl));
    const all=JSON.stringify([...h.w.dataLayer].map(a=>[...a]));
    ok(`${n} on ${host} #r=…: nothing pushed to the dataLayer contains the fragment`,!/#r=|TY7BSsNQ/.test(all));
    const h2=boot(path.join(SITE,n),{url:`https://${host}/${pg}`});
    const c2=(h2.w.dataLayer||[]).filter(a=>a[0]==='config');
    ok(`${n} on ${host} without a fragment: config unchanged (no page_location override)`,c2.length===1&&c2[0].length===2);
    h2.w.location.hash=frag.slice(1);h2.w.dispatchEvent(new h2.w.HashChangeEvent('hashchange'));
    const set=(h2.w.dataLayer||[]).filter(a=>a[0]==='set').pop();
    ok(`${n} on ${host}: a shared link opened later in the same tab sets page_location without the fragment`,!!set&&set[1].page_location===`https://${host}/${pg}`,set&&JSON.stringify(set[1]));
  }
  const hp=boot(path.join(SITE,n),{url:`https://${pg}--golfcalculators.netlify.app/${pg}${frag}`});
  ok(`${n} on a preview host with #r=…: still no GA at all`,!(hp.w.dataLayer||[]).some(a=>a[0]==='config'||a[0]==='set'));
}
process.exitCode=report('ga-gate')?1:0;
