// v11 P3 leftovers: JSON-LD inLanguage matches <html lang> on every page (the handicap page said en-AU under lang="en"),
// checks.yml's published-paths list includes /handicap-calculator, and the Skins setup CSS that keeps 320px unclipped is
// in place (the measured gate, scrollWidth <= clientWidth on every setup element at 320/375, is in lib/browser-checks.js).
const {JSDOM}=require('jsdom');
const {SITE,ok,report,path,fs}=require('../lib/harness');
const rd=n=>fs.readFileSync(path.join(SITE,n),'utf8');
const pages=fs.readdirSync(SITE).filter(n=>n.endsWith('.html')).sort();
const langs=x=>{const out=[];(function walk(o){if(Array.isArray(o))o.forEach(walk);else if(o&&typeof o==='object'){if('inLanguage' in o)out.push(o.inLanguage);Object.values(o).forEach(walk);}})(x);return out;};
for(const n of pages){const d=new JSDOM(rd(n)).window.document,lang=d.documentElement.getAttribute('lang');
  const vals=[...d.querySelectorAll('script[type="application/ld+json"]')].flatMap(s=>langs(JSON.parse(s.textContent)));
  ok(`${n}: every JSON-LD inLanguage equals html lang "${lang}"`,vals.every(v=>v===lang),vals.join());}
{const d=new JSDOM(rd('handicap-calculator.html')).window.document;const vals=[...d.querySelectorAll('script[type="application/ld+json"]')].flatMap(s=>langs(JSON.parse(s.textContent)));
 ok('handicap-calculator: html lang "en" and JSON-LD inLanguage "en" (WebApplication and FAQPage)',d.documentElement.getAttribute('lang')==='en'&&vals.length===2&&vals.every(v=>v==='en'),vals.join());}
const wf=path.join(SITE,'.github/workflows/checks.yml');
if(fs.existsSync(wf)){const y=fs.readFileSync(wf,'utf8');const line=(y.match(/for p in \/ \/skins[^;]*; do check 200/)||[''])[0];
  ok('checks.yml: published paths (200) include /handicap-calculator',/\s\/handicap-calculator\s/.test(line+' '),line);}
{const s=rd('skins.html');ok('skins: setup keeps 320px unclipped (stepper values, allowance, settings stack below 360px)',/#players \.gc-stepper input\{font-size:18px\}/.test(s)&&/#allowance\{width:76px\}/.test(s)&&/@media \(max-width:359px\)\{\.sk-game\{grid-template-columns:minmax\(0,1fr\)\}/.test(s));}
{const s=rd('handicap-calculator.html');const {boot}=require('../lib/harness');
 const h=boot(path.join(SITE,'handicap-calculator.html'),{url:'https://golfcalculators.com/handicap-calculator#d=181.208.164.181.216.173.218.236'});
 ok('handicap shared view: hidden until drawn (no layout shift), 3 s failsafe, and render() reveals it',/\.hi-view:not\(\.hi-ready\) main\{visibility:hidden;animation:hi-reveal 0s 3s forwards\}/.test(s)&&h.d.documentElement.classList.contains('hi-view')&&h.d.documentElement.classList.contains('hi-ready'));}
process.exitCode=report('v11-leftovers')?1:0;
