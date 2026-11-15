// html-redirects (P3): .html URLs 301 to the extensionless canonicals via Netlify _redirects.
// force (!) so the real .html files do not shadow the redirect. No rule may send a clean URL
// back to a .html path (that would loop with pretty-URL serving). Query strings stay forwarded
// because destinations have no '?'; browsers keep #r= fragments across the 301.
const {SITE,ok,report,path,fs}=require('../lib/harness');
const file=path.join(SITE,'_redirects');
if(!fs.existsSync(file)){console.log('SKIP  no _redirects on this branch (P3 not present)');process.exit(0);}
const text=fs.readFileSync(file,'utf8');
const rules=text.split(/\n/).map(l=>l.replace(/#.*$/,'').trim()).filter(Boolean).map(l=>{
  const p=l.split(/\s+/);return {from:p[0],to:p[1],status:p[2]||'',force:/\!$/.test(p[2]||'')};
});
const want={
  '/index.html':'/',
  '/skins.html':'/skins',
  '/stableford.html':'/stableford',
  '/daily-handicap.html':'/daily-handicap',
  '/privacy.html':'/privacy'
};
for(const [from,to] of Object.entries(want)){
  const r=rules.find(x=>x.from===from);
  ok(`${from} 301 to ${to} (forced)`,!!r&&r.to===to&&r.status.replace('!','')==='301'&&r.force);
  ok(`${from}: destination has no '?' (query strings stay forwarded)`,!!r&&!/\?/.test(r.to));
}
ok('every listed .html URL has a redirect',Object.keys(want).every(f=>rules.some(r=>r.from===f)));
ok('no redirect sends a clean URL back to a .html path (loop guard)',!rules.some(r=>!/\.html$/i.test(r.from)&&/\.html$/i.test(r.to.split('?')[0])));
ok('clean destinations are the canonical paths, not .html',Object.values(want).every(to=>!/\.html$/i.test(to)));
const toml=fs.readFileSync(path.join(SITE,'netlify.toml'),'utf8');
ok('netlify.toml still 404s /tests, /tools and /.github (unpublished)',['/tests/*','/tools/*','/.github/*'].every(p=>toml.includes(`from = "${p}"`)&&/status = 404/.test(toml)));
process.exit(report('html-redirects')?1:0);
