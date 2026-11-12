// usage: node lib/lh.js <url> <out.json>  -> prints a one-line JSON summary
const {execFileSync}=require('child_process');const fs=require('fs');
const [url,out]=process.argv.slice(2);
const CHROME=process.env.CHROME_PATH||'/usr/bin/google-chrome';
execFileSync(process.execPath,[require.resolve('lighthouse/cli/index.js'),url,'--only-categories=performance,accessibility,best-practices,seo','--form-factor=mobile','--chrome-flags=--headless=new --no-sandbox','--output=json','--output-path='+out,'--quiet'],{env:{...process.env,CHROME_PATH:CHROME},stdio:'inherit'});
const r=JSON.parse(fs.readFileSync(out,'utf8'));if(r.runtimeError)throw new Error(url+': '+r.runtimeError.message);const c=r.categories;
const s={url,perf:Math.round(c.performance.score*100),a11y:Math.round(c.accessibility.score*100),bp:Math.round(c['best-practices'].score*100),seo:Math.round(c.seo.score*100),
 lcpMs:Math.round(r.audits['largest-contentful-paint'].numericValue),cls:+r.audits['cumulative-layout-shift'].numericValue.toFixed(3),LCP:r.audits['largest-contentful-paint'].displayValue,FCP:r.audits['first-contentful-paint'].displayValue,CLS:r.audits['cumulative-layout-shift'].displayValue,TBT:r.audits['total-blocking-time'].displayValue,bytes:r.audits['total-byte-weight'].displayValue};
const fails=[];for(const k of Object.keys(c))for(const a of c[k].auditRefs){const au=r.audits[a.id];if(a.weight>0&&au.score!==null&&au.score<1)fails.push(`${k}:${a.id}(${au.score})`);}
s.fails=fails;console.log(JSON.stringify(s));
