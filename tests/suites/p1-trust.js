// P1 trust floor: privacy page content, footer link, favicon, sitemap, GA tag unchanged.
const {SITE,BASE,ok,report,path,fs,read}=require('../lib/harness');
const {JSDOM}=require('jsdom');
const f=n=>path.join(SITE,n);const rd=n=>fs.readFileSync(f(n),'utf8');
const pages=fs.readdirSync(SITE).filter(n=>n.endsWith('.html'));
ok('privacy.html exists',fs.existsSync(f('privacy.html')));
const priv=new JSDOM(rd('privacy.html')).window.document;const ptxt=priv.querySelector('main').textContent.replace(/\s+/g,' ');
ok('privacy (1): uses Google Analytics, which sets cookies',/Google Analytics[^.]*\. Google Analytics sets cookies/.test(ptxt));
ok('privacy (2): pages viewed, device, approximate location, no names or emails',/pages you view/.test(ptxt)&&/device/.test(ptxt)&&/approximate location/.test(ptxt)&&/does not collect your name or email/.test(ptxt));
ok('privacy (3): Google processes it, including outside Australia',/Google processes this data[^.]*outside Australia/.test(ptxt));
const optout=[...priv.querySelectorAll('a')].find(a=>a.href==='https://tools.google.com/dlpage/gaoptout');
ok('privacy (4): opt-out add-on linked + blocking cookies',!!optout&&/blocking cookies/.test(ptxt));
const mail=priv.getElementById('contact-email');
ok('privacy (5): contact russ@simplifyy.com (mailto)',mail&&mail.getAttribute('href')==='mailto:russ@simplifyy.com'&&mail.textContent==='russ@simplifyy.com');
ok('privacy mentions local storage stays on device',/local storage/.test(ptxt)&&/not sent to us or to Google/.test(ptxt));
const withEmail=pages.filter(n=>rd(n).includes('russ@simplifyy.com'));
ok('contact email lives in one file only',withEmail.length===1&&withEmail[0]==='privacy.html',withEmail.join());
ok('privacy page: analytics only via the shared gc-ga.js (v9 P6, Russ approved GA on every page)',(rd('privacy.html').match(/googletagmanager/g)||[]).length===1&&/<script data-src="\/gc-ga\.js">/.test(rd('privacy.html')));
for(const n of pages){const s=rd(n);const d=new JSDOM(s).window.document;
  ok(`${n}: footer links to /privacy`,!!d.querySelector('footer a[href="/privacy"]'));
  ok(`${n}: link rel=icon /favicon.ico`,!!d.querySelector('link[rel="icon"][href="/favicon.ico"]'));}
const ico=fs.readFileSync(f('favicon.ico'));
ok('favicon.ico is a real ICO (16/32/48)',ico.readUInt16LE(0)===0&&ico.readUInt16LE(2)===1&&ico.readUInt16LE(4)>=3,`${ico.length} bytes, ${ico.readUInt16LE(4)} images`);
ok('sitemap lists /privacy',rd('sitemap.xml').includes('<loc>https://golfcalculators.com/privacy</loc>'));
ok('robots.txt unchanged',rd('robots.txt')===fs.readFileSync(path.join(BASE,'robots.txt'),'utf8'));
ok('netlify.toml present',fs.existsSync(f('netlify.toml')));
const ga=s=>(s.match(/<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-DH32H3GWKE"><\/script>\s*<script>[\s\S]*?<\/script>/)||[null])[0];
for(const [n,b] of [['skins.html','skins'],['stableford.html','stableford']]){const live=ga(read(path.join(BASE,b)));
  if(/location\.hostname === 'golfcalculators\.com'/.test(rd(n)))ok(`${n}: GA4 tag hostname-gated (P2a change; see ga-gate suite)`,true);
  else ok(`${n}: GA4 tag byte-identical to live`,live&&ga(rd(n))===live);}
// v9 P6 (Russ approved, 18 Nov): GA4 on every page through one shared, hostname-gated loader (gc-ga.js); see ga-gate.
const gaSrc=rd('gc-ga.js');for(const n of pages){const m=rd(n).match(/<script data-src="\/gc-ga\.js">([\s\S]*?)<\/script>/);ok(`${n}: GA4 only through gc-ga.js, inlined byte-identical`,!!m&&m[1]===gaSrc&&(rd(n).match(/googletagmanager/g)||[]).length===1);}
const allTracking=pages.map(n=>(rd(n).match(/googletagmanager|gtag\/js|plausible|fbq\(|clarity/g)||[]).length).reduce((a,b)=>a+b,0);
ok('no extra tracking anywhere (one GA loader per page, nothing else)',(pages.map(n=>(rd(n).match(/gtag\/js\?id=/g)||[]).length).reduce((a,b)=>a+b,0))===pages.length&&!pages.some(n=>/plausible|fbq\(|clarity/.test(rd(n))),`${allTracking} tracking refs`);
process.exitCode=report('p1-trust')?1:0;
