#!/usr/bin/env node
// Writes P3 search content into the static HTML (run from anywhere; no dependencies):
//  - <title>, meta description, og:title/og:description, twitter:title/description and og/twitter image alt from
//    tools/og-images/pages.json (one source, so they stay in sync);
//  - on skins/stableford/daily-handicap: the "How it's calculated" section, rules source,
//    body links and visible FAQ from content.js between <!-- seo:content:start/end -->, and
//    one JSON-LD @graph (WebApplication, FAQPage from the same FAQ strings, BreadcrumbList)
//    between <!-- seo:jsonld:start/end -->. No ratings or reviews.
// usage: node tools/seo/build.js [--check]   (--check: exit 1 if any page would change)
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'../..');
const pages=require('../og-images/pages.json');const C=require('./content.js');
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const escText=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const between=(s,tag,body)=>{const a=`<!-- seo:${tag}:start -->`,b=`<!-- seo:${tag}:end -->`;const i=s.indexOf(a),j=s.indexOf(b);if(i<0||j<i)throw new Error('missing markers '+tag);return s.slice(0,i+a.length)+body+s.slice(j);};
const setMeta=(s,re,val,label)=>{if(!re.test(s))throw new Error('missing '+label);return s.replace(re,(m,p1,_v,p3)=>p1+esc(val)+p3);};
let changed=0;
for(const p of pages){
  const f=path.join(ROOT,p.file);let s=fs.readFileSync(f,'utf8');const before=s;
  s=s.replace(/<title>[^<]*<\/title>/,`<title>${escText(p.ogTitle)}</title>`);
  s=setMeta(s,/(<meta name="description" content=")([^"]*)(">)/,p.ogDescription,'description');
  s=setMeta(s,/(<meta property="og:title" content=")([^"]*)(">)/,p.ogTitle,'og:title');
  s=setMeta(s,/(<meta property="og:description" content=")([^"]*)(">)/,p.ogDescription,'og:description');
  s=setMeta(s,/(<meta name="twitter:title" content=")([^"]*)(">)/,p.ogTitle,'twitter:title');
  s=setMeta(s,/(<meta name="twitter:description" content=")([^"]*)(">)/,p.ogDescription,'twitter:description');
  s=setMeta(s,/(<meta property="og:image:alt" content=")([^"]*)(">)/,p.alt,'og:image:alt');
  s=setMeta(s,/(<meta name="twitter:image:alt" content=")([^"]*)(">)/,p.alt,'twitter:image:alt');
  const c=C[p.page];
  if(c){
    const faqHtml=`\n  <h2 id="faq-h">Frequently asked questions</h2>\n`+c.faq.map(([q,a])=>`  <div class="gc-faq-item"><h3>${escText(q)}</h3><p>${escText(a)}</p></div>`).join('\n')+'\n';
    s=between(s,'content',c.how+'\n'+faqHtml);
    const ld={'@context':'https://schema.org','@graph':[
      {'@type':'WebApplication','@id':p.url+'#app','name':c.name,'url':p.url,'description':p.ogDescription,'applicationCategory':'SportsApplication','operatingSystem':'Any','offers':{'@type':'Offer','price':0,'priceCurrency':'AUD'},'inLanguage':'en-AU'},
      {'@type':'FAQPage','@id':p.url+'#faq','url':p.url,'inLanguage':'en-AU','mainEntity':c.faq.map(([q,a])=>({'@type':'Question','name':q,'acceptedAnswer':{'@type':'Answer','text':a}}))},
      {'@type':'BreadcrumbList','@id':p.url+'#breadcrumb','itemListElement':[{'@type':'ListItem','position':1,'name':'Home','item':'https://golfcalculators.com/'},{'@type':'ListItem','position':2,'name':c.name,'item':p.url}]}]};
    s=between(s,'jsonld',`\n<script type="application/ld+json">\n${JSON.stringify(ld,null,1).replace(/</g,'\\u003c')}\n</script>\n`);
  }
  if(s!==before){changed++;if(!process.argv.includes('--check'))fs.writeFileSync(f,s);console.log((process.argv.includes('--check')?'would update ':'updated ')+p.file);}
}
if(process.argv.includes('--check')&&changed){console.error('pages are out of date: run node tools/seo/build.js');process.exit(1);}
console.log(changed?`${changed} page(s) ${process.argv.includes('--check')?'stale':'written'}`:'all pages up to date');
