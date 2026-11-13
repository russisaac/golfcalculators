// Shared jsdom helpers for the golfcalc suites.
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');
// SITE: the site checkout under test (default: this repo's root).
// BASE: the behaviour baseline = live source at c54e467 (tests/baseline), override with BASELINE=dir.
const SITE=path.resolve(process.env.SITE||path.join(__dirname,'../..'));
const BASE=path.resolve(process.env.BASELINE||path.join(__dirname,'../baseline'));
function resolveFile(file){return fs.existsSync(file)?file:(fs.existsSync(file+'.html')?file+'.html':file);}
function read(file){return fs.readFileSync(resolveFile(file),'utf8').replace(/<script[^>]*\/\.netlify\/[^>]*><\/script>/g,'');}
function boot(file,{url='https://golfcalculators.com/',storage,beforeParse}={}){
  const html=read(file);
  const dom=new JSDOM(html,{runScripts:'dangerously',url,pretendToBeVisual:true,beforeParse(w){
    w.confirm=()=>true;w.alert=()=>{};w.scrollTo=()=>{};w.Element.prototype.scrollIntoView=function(){};
    if(storage)for(const k in storage)w.localStorage.setItem(k,storage[k]);if(beforeParse)beforeParse(w);}});
  const w=dom.window,d=w.document,$=id=>d.getElementById(id);
  const fire=(el,t='input')=>el.dispatchEvent(new w.Event(t,{bubbles:true}));
  const set=(id,v,t)=>{const el=$(id);if(el.type==='checkbox')el.checked=!!v;else el.value=v;fire(el,t||(el.tagName==='SELECT'||el.type==='checkbox'?'change':'input'));};
  return {dom,w,d,$,fire,set};
}
let results=[];
function ok(name,cond,info=''){results.push({name,pass:!!cond,info});}
function report(suite){let f=0;for(const r of results){if(!r.pass)f++;console.log(`${r.pass?'PASS':'FAIL'}  ${r.name}${r.info?'  ['+r.info+']':''}`);}
  console.log(`-- ${suite}: ${results.length-f}/${results.length} passed`);results=[];return f;}
module.exports={SITE,BASE,boot,read,resolveFile,ok,report,path,fs};
