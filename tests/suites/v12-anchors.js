// v12 (PO batch, approved by Russ 28 Nov 2026):
//  item 3: sitemap.xml <lastmod> = the page's real change date: the Sydney date of the last commit that changed the page,
//          skipping commits whose subject starts "inline sync:" (shared script/JSON copies only, no visible change);
//          a page with uncommitted edits counts as changed today. Needs full git history: on a shallow clone (GitHub
//          checkout) only the format and "not in the future" are checked.
//  item 2: Handicap Index anchors (PO, 24 + 28 Nov), through the real /handicap-calculator page code and its UI:
//          90/72.0/113/0, 85/71.2/125/0, 88/70.5/130/+1, 92/73.1/138/0, 84/69.8/119/-1 -> differentials
//          18.0/12.5/14.3/15.5/14.4; 5 rounds -> lowest 1, no adjustment -> 12.5; the first 3 -> 12.5 - 2.0 = 10.5.
const {execFileSync}=require('child_process');const {JSDOM}=require('jsdom');
const {SITE,boot,ok,report,path,fs}=require('../lib/harness');
const rd=n=>fs.readFileSync(path.join(SITE,n),'utf8');
// ---- item 3: sitemap lastmod ----
{const sm=rd('sitemap.xml');const ent=[...sm.matchAll(/<url><loc>([^<]+)<\/loc><lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod><\/url>/g)].map(m=>({loc:m[1],mod:m[2]}));
 const today=new Date().toLocaleDateString('en-CA',{timeZone:'Australia/Sydney'});
 ok('sitemap: every lastmod is a real date, not in the future (Sydney)',ent.length>0&&ent.every(e=>!isNaN(Date.parse(e.mod))&&e.mod<=today),ent.map(e=>e.mod).join());
 const git=(...a)=>execFileSync('git',['-C',SITE,...a],{encoding:'utf8',env:{...process.env,TZ:'Australia/Sydney'}}).trim();
 let full=false;try{full=git('rev-parse','--is-shallow-repository')==='false';}catch(e){}
 if(!full)ok('sitemap lastmod vs git history: skipped (shallow clone or no git; checked on a full clone)',true);
 else{const files=fs.readdirSync(SITE).filter(n=>n.endsWith('.html')).sort();
  for(const f of files){const d=new JSDOM(rd(f)).window.document;if(/noindex/.test((d.querySelector('meta[name="robots"]')||{content:''}).content||''))continue;
   const loc=d.querySelector('link[rel=canonical]').href,e=ent.find(x=>x.loc===loc);
   let want;if(git('status','--porcelain','--',f))want=today;
   else{const log=git('log','--format=%cd\t%s','--date=format-local:%Y-%m-%d','--',f).split('\n').filter(Boolean).map(l=>l.split('\t'));
     const hit=log.find(([,s])=>!/^inline sync:/.test(s));want=hit?hit[0]:null;}
   ok(`sitemap: ${loc} lastmod = its last real change (${want})`,!!e&&e.mod===want,e?e.mod:'not in sitemap');}}}
// ---- item 2: Handicap Index anchors ----
const HF=path.join(SITE,'handicap-calculator.html');
if(fs.existsSync(HF)){
 const R=[[90,72.0,113,0],[85,71.2,125,0],[88,70.5,130,1],[92,73.1,138,0],[84,69.8,119,-1]],DIFF=[18.0,12.5,14.3,15.5,14.4];
 const h=boot(HF,{url:'https://golfcalculators.com/handicap-calculator'}),G=h.w.GCHandicap;
 R.forEach(([s,cr,sl,pcc],i)=>ok(`HI anchor round ${i+1}: ${s} off ${cr.toFixed(1)} / ${sl}, PCC ${pcc>0?'+':''}${pcc} → differential ${DIFF[i].toFixed(1)}`,G.diffOf({s,cr,sl,pcc})===DIFF[i],String(G.diffOf({s,cr,sl,pcc}))));
 const rs=R.map(([s,cr,sl,pcc])=>({s,cr,sl,pcc}));
 const r5=G.calc(rs),r3=G.calc(rs.slice(0,3));
 ok('HI anchor: 5 rounds → lowest 1, no adjustment → 12.5',r5.index===12.5&&r5.count===1&&r5.adj===0,JSON.stringify([r5.index,r5.count,r5.adj]));
 ok('HI anchor: first 3 rounds → lowest 1 − 2.0 → 10.5',r3.index===10.5&&r3.count===1&&r3.adj===-2,JSON.stringify([r3.index,r3.count,r3.adj]));
 // the same rounds typed into the page, one at a time (the PCC field takes "+1" and "-1")
 const u=boot(HF,{url:'https://golfcalculators.com/handicap-calculator'});const out=[];
 R.forEach(([s,cr,sl,pcc])=>{u.$('score').value=String(s);u.$('cr').value=cr.toFixed(1);u.$('sl').value=String(sl);u.$('pcc').value=pcc>0?'+'+pcc:String(pcc);u.$('btn-add').click();out.push((u.$('hi-out')||{}).textContent||'');});
 ok('HI anchors typed into the page: after 3 rounds the hero shows 10.5, after 5 rounds 12.5',out[2]==='10.5'&&out[4]==='12.5',out.join(' | '));
 const diffs=[...u.d.querySelectorAll('#rounds .hi-d')].map(e=>e.firstChild.textContent);
 ok('HI anchors typed into the page: the rounds list shows 18.0, 12.5, 14.3, 15.5, 14.4, and round 2 (12.5) is the one that counts',diffs.join()==='18.0,12.5,14.3,15.5,14.4'&&[...u.d.querySelectorAll('#rounds li')].map(l=>l.classList.contains('is-count')).join()==='false,true,false,false,false',diffs.join());
}
process.exitCode=report('v12-anchors')?1:0;
