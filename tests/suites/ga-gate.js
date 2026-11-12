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
process.exitCode=report('ga-gate')?1:0;
