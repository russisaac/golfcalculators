// v10 P2: Skins "How is a skin paid?" = Each other player (default, unchanged) / From a pot, plus the v9 polish leftovers
// (hero headline over 16px payment lines, share text ≤ 6 lines, FAQ "Pot or pay each other?", 44px "learn more" links).
// Pot rule (common club format, as whygolf's "from a pot"): pot = skins won × stake; everyone puts in an equal share;
// each winner takes stake × their skins. Worked example (hand, from whygolf's pot mode): 7/5/3/3 skins at $5 → pot $90,
// $22.50 each → +12.50 / +2.50 / −7.50 / −7.50.
const {SITE,boot,ok,report,path,fs}=require('../lib/harness');
const html=fs.readFileSync(path.join(SITE,'skins.html'),'utf8');
if(!/name="pay" value="pot"/.test(html)){console.log('SKIP  no pot mode on this branch');process.exit(0);}
const opts={url:'https://golfcalculators.com/skins',beforeParse(w){w.CompressionStream=CompressionStream;w.DecompressionStream=DecompressionStream;}};
const h=boot(path.join(SITE,'skins.html'),opts);const E=h.w.GCSkins;
function wins(counts,stake){ // gross, no carry: hole k is won outright by the player whose turn it is
  const st=E.defaultState();st.players=counts.map((_,i)=>({name:['Alex','Blake','Casey','Drew','Eli','Fay'][i],hcp:0}));st.scoring='gross';st.carry=false;st.stake=String(stake);
  let hole=1;counts.forEach((c,i)=>{for(let k=0;k<c;k++,hole++)st.scores[hole]=counts.map((_,j)=>j===i?3:5);});
  for(;hole<=18;hole++)st.scores[hole]=counts.map(()=>4); // halved, no skin (carry off)
  return st;}
const sum=a=>Math.round(a.reduce((x,y)=>x+y,0)*100);
{const st=wins([7,5,3,3],5);st.pay='pot';const r=E.compute(st);
 ok('whygolf-style pot example: 7/5/3/3 skins, $5, pot → +12.50 / +2.50 / −7.50 / −7.50',JSON.stringify(r.balances)==='[12.5,2.5,-7.5,-7.5]',JSON.stringify(r.balances));
 ok('pot $90.00, $22.50 each, split evenly',r.potTotal===90&&r.share===22.5&&r.shareEven===true);
 const net=r.names.map(()=>0);r.payments.forEach(p=>{net[p.from]-=p.amount;net[p.to]+=p.amount;});
 ok('who pays whom settles every balance in the fewest payments (3 for 4 non-zero balances)',r.payments.length===3&&net.every((v,i)=>Math.abs(v-r.balances[i])<0.001),JSON.stringify(r.payments));
 const each=E.compute(Object.assign({},st,{pay:'each'}));ok('pot = pay-each-other ÷ number of players (a quarter in a four-ball)',each.balances.every((b,i)=>Math.abs(b/4-r.balances[i])<0.001),JSON.stringify(each.balances));
 const t=E.shareText(st,r,'https://golfcalculators.com/skins#r=1z.x');
 ok('share text says the pot and the share: "from a pot of $90.00 ($22.50 each)", ≤ 6 lines, link last',/from a pot of \$90\.00 \(\$22\.50 each\)/.test(t)&&t.split('\n').length<=6&&/Settled at https:\S+$/.test(t),t);}
// nets always sum to exactly $0, including pots that do not split evenly into cents
let bad=null;for(let k=0;k<300&&!bad;k++){const n=2+k%5,c=[...Array(n)].map((_,i)=>(k*7+i*11)%6);if(c.reduce((a,b)=>a+b,0)>18)continue;
  const st=wins(c,[5,2.5,1,0.35,3.33,7][k%6]);st.pay='pot';const r=E.compute(st);if(sum(r.balances)!==0||r.balances.some(b=>Math.abs(Math.round(b*100)-b*100)>1e-6)||r.balances.reduce((a,b)=>a+Math.round(b*100),0)!==0)bad=JSON.stringify({c,stake:st.stake,b:r.balances});}
ok('300 pots (2–6 players, stakes incl. $0.35 and $3.33): nets in whole cents and sum to exactly $0',!bad,bad);
{const st=wins([2,1,0],5);st.pay='pot';const r=E.compute(st);
 ok('3 players, pot $15.00 → $5.00 each: +5 / 0 / −5',JSON.stringify(r.balances)==='[5,0,-5]');
 const st2=wins([1,0,0],1);st2.pay='pot';const r2=E.compute(st2);
 ok('uneven pot ($1.00 between 3): shares 34c/33c/33c, nets +0.66 / −0.33 / −0.33, sum $0, text says "about $0.34 each"',JSON.stringify(r2.balances)==='[0.66,-0.33,-0.33]'&&r2.shareEven===false&&/about \$0\.34 each/.test(E.shareText(st2,r2,'x')),JSON.stringify(r2.balances));}
// default mode unchanged (regression anchors)
{const r=E.compute(E.exampleState());ok('default is "each other player"; the example still settles −75 / −75 / −35 / +185',E.defaultState().pay==='each'&&JSON.stringify(r.balances)==='[-75,-75,-35,185]'&&r.pot===false);}
// links: pay only on pot links; old links (no key) are each-other; anything else is refused
(async()=>{
 const ex=E.exampleState(),P=E.toPayload(ex);ok('each-other link payload has no "pay" key (old links unchanged)',!('pay' in JSON.parse(JSON.stringify(P))));
 const pot=E.exampleState();pot.pay='pot';const Q=JSON.parse(JSON.stringify(E.toPayload(pot)));ok('pot link payload carries pay:"pot"',Q.pay==='pot');
 const back=E.fromPayload(Q);ok('pot link reopens as a pot result with the same balances',back&&back.pay==='pot'&&JSON.stringify(E.compute(back).balances)===JSON.stringify(E.compute(pot).balances));
 ok('old link (no pay) opens as each other player',E.fromPayload(JSON.parse(JSON.stringify(P))).pay==='each');
 ok('hostile pay value is refused (error card)',E.fromPayload(Object.assign({},Q,{pay:'<img>'}))===null&&E.fromPayload(Object.assign({},Q,{pay:1}))===null);
 // the viewer of a pot link
 const link='https://golfcalculators.com/skins#r='+(await h.w.GCShare.encode(Q));const v=boot(path.join(SITE,'skins.html'),Object.assign({},opts,{url:link}));await v.w.GCSkinsUI.opened();
 ok('the #r= viewer shows the pot (kicker and the "everyone puts in" line)',v.w.GCSkinsUI.viewing()&&/pot \$/.test(v.$('hero').textContent)&&/everyone puts in/.test(v.$('hero').textContent),v.$('hero').textContent);
 // UI: the option, persistence, the hero
 const u=boot(path.join(SITE,'skins.html'),opts);
 ok('setup has "How is a skin paid?" with Each other player (checked) and From a pot',/How is a skin paid\?/.test(u.$('pay-l').textContent)&&u.d.querySelector('input[name=pay][value=each]').checked&&!!u.d.querySelector('input[name=pay][value=pot]'));
 const pr=u.d.querySelector('input[name=pay][value=pot]');pr.checked=true;pr.dispatchEvent(new u.w.Event('change',{bubbles:true}));
 ok('choosing From a pot is saved and the help line explains it',u.w.GCSkinsUI.state().pay==='pot'&&JSON.parse(u.w.localStorage.getItem('gc_skins_v2')).pay==='pot'&&/equal share/.test(u.$('pay-help').textContent));
 const u2=boot(path.join(SITE,'skins.html'),Object.assign({},opts,{storage:{gc_skins_v2:u.w.localStorage.getItem('gc_skins_v2')}}));ok('reload: From a pot still chosen',u2.d.querySelector('input[name=pay][value=pot]').checked&&u2.w.GCSkinsUI.state().pay==='pot');
 const s=u.w.GCSkinsUI.state(),w=wins([7,5,3,3],5);s.players=w.players;s.scoring='gross';s.carry=false;s.scores=w.scores;u.w.GCSkinsUI.show('result');
 ok('pot result hero: "Alex wins $12.50, Blake $2.50", then the payments, then "Pot $90.00: everyone puts in $22.50."',/Alex wins \$12\.50, Blake \$2\.50/.test(u.$('hero').querySelector('.gc-big').textContent)&&u.$('hero').querySelectorAll('.sk-pay').length===3&&/Pot \$90\.00: everyone puts in \$22\.50\./.test(u.$('hero').textContent),u.$('hero').textContent);
 ok('"How it works" line describes the pot',/equal share into the pot/.test(u.$('how-pay').textContent));
 const x=boot(path.join(SITE,'skins.html'),opts);x.w.GCSkinsUI.loadExample();
 ok('example hero: headline "Drew wins $185.00" (30px gc-big) over 3 payment lines',x.$('hero').querySelector('.gc-big').textContent==='Drew wins $185.00'&&x.$('hero').querySelectorAll('.sk-pay').length===3);
 ok('polish: payment lines are 16px (fs-md), not the 22px of headings, and do not wrap (one line, ellipsis)',/\.sk-pay\{[^}]*font-size:var\(--fs-md\)/.test(html)&&/\.sk-pay span:first-child\{[^}]*white-space:nowrap/.test(html)&&!/\.sk-pay\{[^}]*font-size:var\(--fs-lg\)/.test(html));
 ok('polish: "learn more" links get 44px tap areas (inline, 13px padding top and bottom)',/\.gc-learn a\{display:inline;padding:13px 0\}/.test(html));
 const faq=[...x.d.querySelectorAll('.gc-faq-item h3')].map(e=>e.textContent);ok('FAQ "Pot or pay each other?"',faq.includes('Pot or pay each other?'));
})().catch(e=>ok('flow: '+e.stack,false)).then(()=>{process.exitCode=report('skins-pot')?1:0;});
