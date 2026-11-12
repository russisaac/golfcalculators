// P2a Skins slice 1 (rebuilt page). Skips if site/skins.html is the legacy page.
const {SITE,BASE,boot,ok,report,path,fs}=require('../lib/harness');
const file=path.join(SITE,'skins.html');const html=fs.readFileSync(file,'utf8');
if(!/data-gc="skins-v2"/.test(html)){console.log('SKIP  legacy skins page (P1 branch): v2 suite not applicable');process.exit(0);}
const U='https://golfcalculators.com/skins';

// 1. Engine cross-check against the live page's calculate() on random rounds
{ const E=boot(file,{url:U}).w.GCSkins;let rnd=12345;const R=n=>{rnd=(rnd*1103515245+12345)%2147483648;return rnd%n;};
  let bad=[],cases=0;
  for(let t=0;t<300;t++){
    const n=2+R(7),holes=['18','front','back'][R(3)],scoring=['full','offlow','gross'][R(3)],allowance=[100,100,90,85,75,50][R(6)],carry=R(4)>0,full=R(3)>0;
    const endRule=full&&R(3)===0?'playoff':'nobody';
    const si=E.DEF_SI.slice();if(R(2))for(let i=17;i>0;i--){const j=R(i+1);[si[i],si[j]]=[si[j],si[i]];}
    const players=[...Array(n)].map((_,i)=>({name:'P'+i,hcp:R(5)===0?-R(5):R(40)}));
    const [a,b]=E.holeRange(holes);const scores={};for(let h=a;h<=b;h++){if(!full&&R(4)===0)continue;scores[h]=players.map(()=>3+R(4));}
    const st={...E.defaultState(),players,stake:String([5,2,10,2.5,1][R(5)]),holes,scoring,allowance,carry,endRule,si,scores,playoff:endRule==='playoff'?R(n):null};
    const mine=E.compute(st);
    const L=boot(path.join(BASE,'skins'),{url:U});const d=L.d,$=id=>d.getElementById(id);
    $('numPlayers').value=String(n);$('holesMode').value=holes;$('scoreMode').value=scoring==='gross'?'grossonly':'gross';$('strokesMode').value=scoring==='offlow'?'offlow':'full';$('allowance').value=String(allowance);
    L.w.updatePlayers(false,true);$('stake').value=st.stake;$('carryovers').checked=carry;$('endRule').value=endRule;L.w.updatePlayoffSelect&&L.w.updatePlayoffSelect();
    players.forEach((p,i)=>{$('p'+(i+1)).value=p.name;if($('hcp'+(i+1)))$('hcp'+(i+1)).value=p.hcp<0?'+'+(-p.hcp):String(p.hcp);});
    for(let h=a;h<=b;h++){if($('si'+h))$('si'+h).value=String(si[h-1]);players.forEach((p,i)=>{$(`h${h}p${i+1}`).value=scores[h]?String(scores[h][i]):'';});}
    if(endRule==='playoff')$('playoffWinner').value=String(st.playoff);
    const lr=L.w.calculate(false);cases++;
    const same=lr&&lr.skins.join()===mine.skins.join()&&lr.balances.every((v,i)=>Math.abs(v-mine.balances[i])<0.005);
    if(!same)bad.push(JSON.stringify({t,n,holes,scoring,allowance,carry,endRule,legacy:lr&&[lr.skins,lr.balances],mine:[mine.skins,mine.balances]}));
  }
  ok(`engine matches the live page's skins + balances on ${cases} random rounds (2–8 players, 18/F9/B9, net/off-low/gross, allowance, plus hcps, carry on/off, playoff, partial rounds)`,bad.length===0,bad.length+' mismatches '+(bad[0]||''));
}
// 2. Pure engine edge cases
{ const E=boot(file,{url:U}).w.GCSkins;const st=E.exampleState();
  ok('balances always sum to 0',Math.abs(E.compute(st).balances.reduce((a,b)=>a+b,0))<1e-9);
  const s2={...st,endRule:'playoff',playoff:null};const r2=E.compute(s2);ok('playoff rule: needs a winner when skins are carried after 18',r2.needsPlayoff&&r2.carry===3);
  const r3=E.compute({...s2,playoff:0});ok('playoff winner Alex gets the 3 carried skins',r3.skins[0]===3&&!r3.needsPlayoff,r3.skins.join());
  const r4=E.compute({...st,stake:'2.55'});ok('cent rounding (stake $2.55)',r4.balances.every(b=>Math.abs(b*100-Math.round(b*100))<1e-6)&&Math.abs(r4.balances.reduce((a,b)=>a+b,0))<0.011,r4.balances.join());
  ok('fewest transfers: 4-player example needs 3 payments',E.compute(st).payments.length===3);
  ok('strokes >18: r=20 → 2 shots on SI 1–2',E.strokesOnHole(20,1,18)===2&&E.strokesOnHole(20,2,18)===2&&E.strokesOnHole(20,3,18)===1);
}
// 3. UI on a fresh device
{ const {JSDOM}=require('jsdom');const st=new JSDOM(html).window.document;const h0=boot(file,{url:U});
  ok('first-paint markup (no JS) matches the JS render for a fresh device (no layout shift)',st.getElementById('players').innerHTML===h0.$('players').innerHTML);}
{ const h=boot(file,{url:U});const {$,d,w}=h;
  ok('fresh load shows setup screen with 4 players',!$('scr-setup').hidden&&$('scr-hole').hidden&&d.querySelectorAll('#players .sk-player').length===4);
  const inl=d.querySelector('style[data-src="/gc.css"]');
  ok('uses shared gc.css (inlined block byte-identical to /gc.css)',inl&&inl.textContent===fs.readFileSync(path.join(SITE,'gc.css'),'utf8'));
  { const before=d.getElementById('players').innerHTML;}
  ok('shared nav links all 3 calculators, Skins current',['/skins','/stableford','/daily-handicap'].every(u=>d.querySelector(`.gc-nav a[href="${u}"]`))&&d.querySelector('.gc-nav a[aria-current=page]').getAttribute('href')==='/skins');
  ok('footer Privacy link',!!d.querySelector('footer a[href="/privacy"]'));
  ok('no type=number anywhere',!/type=["']?number/i.test(html));
  ok('stake uses inputmode; handicap fields are plain text with no inputmode, so + and − can be typed (PO, 12 Nov)',$('stake').getAttribute('inputmode')&&[...d.querySelectorAll('input[id^=ph]')].every(e=>e.type==='text'&&!e.hasAttribute('inputmode')));
  ok('GA4 tag present and unchanged (G-DH32H3GWKE, single loader)',(html.match(/gtag\/js\?id=G-DH32H3GWKE/g)||[]).length===1&&/gtag\('config', 'G-DH32H3GWKE'\);/.test(html));
  ok('vanilla: no external scripts besides GA4',[...d.querySelectorAll('script[src]')].every(s=>/googletagmanager/.test(s.src)));
  // names, escaping
  h.set('pn0','Ann');h.set('pn1','<img src=x onerror="window.pwned=1">');h.set('pn2','Cat');h.set('pn3','Dee');
  $('ph2').value='+2';h.fire($('ph2'));h.fire($('ph2'),'focusout');
  ok('plus handicap typed as +2 stored as -2, shown +2',w.GCSkinsUI.state().players[2].hcp===-2&&$('ph2').value==='+2');
  d.querySelector('button[data-h="1"][data-i="3"]').click();d.querySelector('button[data-h="1"][data-i="3"]').click();
  ok('handicap stepper +2',w.GCSkinsUI.state().players[3].hcp===2);
  $('btn-start').click();
  ok('Start → hole 1 screen, one hole per screen',!$('scr-hole').hidden&&$('hole-h').textContent==='Hole 1'&&d.querySelectorAll('#scores .sk-score').length===4);
  ok('scores default to par (hole 1 par 4)',[0,1,2,3].every(i=>$('sc'+i).value==='4'));
  ok('user names escaped (no injected element, text intact)',!d.querySelector('#scores img')&&!w.pwned&&/<img src=x/.test(d.querySelector('#row1 b').textContent));
  ok('strip shows halved + carry with all on par',/Halved: carry 1 to hole 2/.test($('strip').textContent),$('strip').textContent);
  d.querySelector('button[data-sc="-1"][data-i="0"]').click();
  ok('− stepper: Ann 3, strip updates live to "Skin to Ann"',$('sc0').value==='3'&&/Skin to Ann \(3 net\)/.test($('strip').textContent),$('strip').textContent);
  $('btn-next').click();
  ok('Next → hole 2, hole 1 recorded',$('hole-h').textContent==='Hole 2'&&w.GCSkinsUI.state().scores[1].join()==='3,4,4,4');
  // par change before touching hole 2 moves defaults
  const p5=d.querySelector('input[name=par][value="5"]');p5.checked=true;h.fire(p5,'change');
  ok('changing par to 5 moves untouched scores to 5',[0,1,2,3].every(i=>$('sc'+i).value==='5'));
  $('sc1').value='4';h.fire($('sc1'));
  ok('typed score works (Bob 4 on par 5) and strip says skin + carry',/Skin to/.test($('strip').textContent),$('strip').textContent);
  $('btn-next').click();$('btn-next').click(); // holes 3 (par) recorded
  ok('strip carries: hole 3 all par → carry 1',/Skins so far: Ann 1/.test($('strip').textContent),$('strip').textContent);
  // persistence: reload
  const st=w.localStorage.getItem('gc_skins_v2');const h2=boot(file,{url:U,storage:{gc_skins_v2:st}});
  ok('reload restores players, scores and the current hole',h2.$('hole-h').textContent==='Hole 4'&&h2.w.GCSkinsUI.state().players[0].name==='Ann'&&h2.w.GCSkinsUI.state().scores[2][1]===4);
  $('btn-settle').click();
  ok('Settle now → result with hero "X pays Y" so far',!$('scr-result').hidden&&/So far · thru 3 of 18/.test($('hero').textContent)&&/pays/.test($('hero').textContent),$('hero').textContent);
  ok('result escapes names too',!d.querySelector('#hero img,#totals img,#ledger img')&&!w.pwned);
  ok('ledger has a line per hole with "why"',d.querySelectorAll('#ledger li').length===18&&/H1Ann 3 net, skin/.test($('ledger').textContent),$('ledger').textContent.slice(0,80));
  ok('next-step links to Daily Handicap and Stableford',!!d.querySelector('#scr-result .gc-next a[href="/daily-handicap"]')&&!!d.querySelector('#scr-result .gc-next a[href="/stableford"]'));
  // share: Web Share API
  let shared=null;w.navigator.share=o=>{shared=o;return Promise.resolve();};$('btn-share').click();
  ok('Share uses navigator.share with text + link back to the site',shared&&shared.url==='https://golfcalculators.com/skins'&&/pays/.test(shared.text),shared&&shared.text);
}
// 4. Share fallback copy + New round keeps players
(async()=>{ const h=boot(file,{url:U});const {$,d,w}=h;let copied=null;
  Object.defineProperty(w.navigator,'clipboard',{value:{writeText:t=>{copied=t;return Promise.resolve();}},configurable:true});
  delete w.navigator.share;
  w.GCSkinsUI.loadExample();$('btn-share').click();await new Promise(r=>setTimeout(r,20));
  ok('no Web Share → copies text with link + "Copied" toast',copied&&/Alex pays Drew \$75\.00/.test(copied)&&/Settled at https:\/\/golfcalculators\.com\/skins$/.test(copied)&&/Copied/.test($('toast').textContent),copied&&copied.split('\n').join(' | '));
  $('btn-new').click();
  const s=w.GCSkinsUI.state();
  ok('New round clears scores, keeps players + course',Object.keys(s.scores).length===0&&s.players.map(p=>p.name).join()==='Alex,Blake,Casey,Drew'&&!$('scr-hole').hidden&&$('hole-h').textContent==='Hole 1');
  // legacy migration
  const legacy=JSON.stringify({names:['Russ','Sam','Player 3'],hcps:['12','+1','7']});
  const h3=boot(file,{url:U,storage:{golfcalculators_skins_v2:legacy}});
  ok('players remembered from the previous Skins page (legacy storage)',h3.w.GCSkinsUI.state().players.map(p=>p.name+':'+p.hcp).join()==='Russ:12,Sam:-1,:7');
  // 8 players max, 2 min
  const h4=boot(file,{url:U});for(let i=0;i<6;i++)h4.$('btn-add').click();
  ok('add up to 8 players then Add disabled',h4.d.querySelectorAll('.sk-player').length===8&&h4.$('btn-add').disabled);
  // invalid stake
  const h5=boot(file,{url:U});h5.set('stake','0');h5.$('btn-start').click();
  ok('stake 0 blocks start with a fix-it message',!h5.$('scr-setup').hidden&&!h5.$('stake-err').hidden&&/Enter a stake above \$0/.test(h5.$('stake-err').textContent));
  // playoff flow
  const h6=boot(file,{url:U});h6.w.GCSkinsUI.loadExample();const e=h6.d.querySelector('input[name=endRule][value=playoff]');
  h6.w.GCSkinsUI.show('setup');e.checked=true;h6.fire(e,'change');h6.w.GCSkinsUI.show('result');
  ok('playoff: hero asks for the winner, share disabled',/Playoff for 3 skins/.test(h6.$('hero').textContent)&&h6.$('btn-share').disabled);
  h6.d.querySelector('button[data-po="3"]').click();
  ok('playoff: pick Drew → settles',/Alex pays Drew/.test(h6.$('hero').textContent)&&/Drew won the playoff for 3/.test(h6.$('hero').textContent),h6.$('hero').textContent);
  // 9 holes
  const h7=boot(file,{url:U});const b9=h7.d.querySelector('input[name=holes][value=back]');b9.checked=true;h7.fire(b9,'change');h7.$('btn-start').click();
  ok('Back 9 starts at hole 10 of 9',h7.$('hole-h').textContent==='Hole 10'&&/1 of 9/.test(h7.$('hole-of').textContent));
  // player count stepper keeps the round
  const h8=boot(file,{url:U});h8.w.GCSkinsUI.loadExample();h8.w.GCSkinsUI.show('setup');h8.$('btn-add').click();
  const s8=h8.w.GCSkinsUI.state();
  ok('+ player mid-round keeps existing scores; new player defaults to par when the hole is revisited',s8.players.length===5&&s8.scores[1].slice(0,4).join()==='4,5,4,5'&&h8.$('pcount').textContent==='5');
  h8.$('btn-less').click();const s9=h8.w.GCSkinsUI.state();
  ok('− player removes the last player and restores the example result',s9.players.length===4&&JSON.stringify(h8.w.GCSkins.compute(s9).balances)==='[-75,-75,-35,185]');
  const h10=boot(file,{url:U});h10.$('btn-less').click();h10.$('btn-less').click();
  ok('player count stops at 2 (− disabled)',h10.d.querySelectorAll('.sk-player').length===2&&h10.$('btn-less').disabled);
  // duplicate stroke index check (SI is editable per hole in slice 1)
  const h11=boot(file,{url:U});h11.$('btn-start').click();
  ok('no SI warning with the default card',h11.$('si-warn').hidden);
  for(let i=0;i<2;i++)h11.d.querySelector('button[data-si="1"]').click(); // hole 1 SI 5 -> 7 (hole 4 has SI 7)
  ok('duplicate SI on the hole screen warns with the clashing hole',!h11.$('si-warn').hidden&&/SI 7 is also on hole 4/.test(h11.$('si-warn').textContent)&&h11.$('si').getAttribute('aria-invalid')==='true',h11.$('si-warn').textContent);
  h11.$('si').value='5';h11.fire(h11.$('si'));
  ok('fixing the SI clears the warning',h11.$('si-warn').hidden);
  h11.$('si').value='7';h11.fire(h11.$('si'));h11.$('btn-settle').click();
  ok('result screen flags duplicate SIs',!h11.$('si-note').hidden&&/holes 1 and 4 share SI 7/.test(h11.$('si-note').textContent),h11.$('si-note').textContent);
  const g=h11.d.querySelector('input[name=scoring][value=gross]');h11.w.GCSkinsUI.show('setup');g.checked=true;h11.fire(g,'change');h11.w.GCSkinsUI.show('result');
  ok('gross scoring ignores SI, so no SI warning',h11.$('si-note').hidden);
  process.exitCode=report('skins-v2')?1:0;
})();
