// skins-dh-return-ask: a Daily Handicap coming back to Skins (/skins?dh=7&holes=9&p=1) follows Stableford (PO, 12 Nov):
// a 9-hole DH onto a saved 18-hole round ASKS before switching (same question, wording, choices, focus; nothing set or
// switched until a choice is clicked); &holes=18 sets only the 18-hole DH and never switches the round; old links without
// &holes= are a 9-hole DH (they only came from 9-hole rounds); ?dh= without &p= is ignored. The question text is
// checked word for word against Stableford's.
const {SITE,boot,ok,report,path,fs}=require('../lib/harness');
const file=path.join(SITE,'skins.html');const src=fs.readFileSync(file,'utf8');
if(!/data-gc="skins-v2"/.test(src)||!/id="dh-prompt"/.test(src)){console.log('SKIP  no DH-return question on this Skins page');process.exit(0);}
const U='https://golfcalculators.com/skins',SU='https://golfcalculators.com/stableford',KEY='gc_skins_v2',SKEY='gc_stableford_v1';
const sfFile=path.join(SITE,'stableford.html');
const open=(o={},f=file)=>boot(f,Object.assign({url:U},o));
const txt=el=>el?el.textContent.replace(/\s+/g,' ').trim():'';
const click=(h,sel)=>{const b=h.d.querySelector(sel);if(!b)throw new Error('no '+sel);b.click();};
const E=open().w.GCSkins,SF=boot(sfFile,{url:SU}).w.GCStableford;
const saved=(players,extra={})=>JSON.stringify(Object.assign(E.defaultState(),{players,scores:{1:[4,5],2:[5,5]},screen:'hole',hole:3},extra));
const base18=saved([{name:'Mel',hcp:14,hcp9:null},{name:'Sam',hcp:20,hcp9:null}]);
const front9=saved([{name:'Mel',hcp:14,hcp9:null},{name:'Sam',hcp:20,hcp9:null}],{holes:'front'});
const st=h=>h.w.GCSkinsUI.state(),pr=h=>h.$('dh-prompt'),stored=h=>JSON.parse(h.w.localStorage.getItem(KEY));

// ---- a 9-hole DH onto a saved 18-hole round: ask ----
{ const h=open({url:U+'?dh=7&holes=9&p=1',storage:{[KEY]:base18}}),q=pr(h);
  ok('9-hole DH onto an 18-hole round: the question card shows on setup, query removed',!q.hidden&&!h.$('scr-setup').hidden&&h.w.location.search==='');
  ok('the question: "Sam’s 9-hole Daily Handicap 7: switch this round to 9 holes?"',txt(q.querySelector('h2'))==='Sam\u2019s 9-hole Daily Handicap 7: switch this round to 9 holes?',txt(q.querySelector('h2')));
  ok('three choices: Switch to front 9, Switch to back 9, Keep 18 holes (in a labelled group)',[...q.querySelectorAll('button')].map(txt).join('|')==='Switch to front 9|Switch to back 9|Keep 18 holes'&&q.querySelector('[role=group]').getAttribute('aria-labelledby')==='dhp-h');
  ok('it explains what "Keep 18 holes" does',txt(q.querySelector('p'))==='This round is set to 18 holes. If you keep 18 holes, 7 is saved as Sam\u2019s 9-hole Daily Handicap for 9-hole rounds, and this round still uses the 18-hole one.');
  ok('focus moves to the question',h.d.activeElement===q.querySelector('h2'));
  ok('no click yet: nothing set, nothing switched (memory and storage), scores kept',st(h).holes==='18'&&st(h).players[1].hcp9==null&&stored(h).holes==='18'&&stored(h).players[1].hcp9==null&&stored(h).players[1].hcp===20&&JSON.stringify(stored(h).scores)==='{"1":[4,5],"2":[5,5]}'&&txt(h.$('toast'))==='');
  const again=open({storage:{[KEY]:h.w.localStorage.getItem(KEY)}});
  ok('leaving without a choice: reopening Skins asks nothing and changed nothing',pr(again).hidden&&st(again).holes==='18'&&st(again).players[1].hcp9==null);
  click(h,'button[data-dhr=keep]');
  ok('Keep 18 holes: round stays 18, Sam\'s 9-hole DH saved as 7, 18-hole DH 20 untouched, field still 20, card gone',st(h).holes==='18'&&stored(h).players[1].hcp9===7&&stored(h).players[1].hcp===20&&h.$('ph1').value==='20'&&q.hidden);
  ok('…toast: "Sam: 9-hole DH 7 saved for 9-hole rounds; this round uses 20"',txt(h.$('toast'))==='Sam: 9-hole DH 7 saved for 9-hole rounds; this round uses 20',txt(h.$('toast')));
}
{ const h=open({url:U+'?dh=7&holes=9&p=1',storage:{[KEY]:base18}});click(h,'button[data-dhr=front]');
  ok('Switch to front 9: round front 9, Sam\'s 9-hole DH 7 in the field, 18-hole DH 20 kept, scores kept, toast "Sam: 9-hole Daily Handicap 7"',stored(h).holes==='front'&&stored(h).players[1].hcp9===7&&stored(h).players[1].hcp===20&&h.$('ph1').value==='7'&&JSON.stringify(stored(h).scores)==='{"1":[4,5],"2":[5,5]}'&&txt(h.$('toast'))==='Sam: 9-hole Daily Handicap 7'&&pr(h).hidden,txt(h.$('toast'))); }
{ const h=open({url:U+'?dh=%2B2&holes=9&p=0',storage:{[KEY]:base18}});
  ok('a plus value reads "+2" in the question',txt(pr(h).querySelector('h2'))==='Mel\u2019s 9-hole Daily Handicap +2: switch this round to 9 holes?');
  click(h,'button[data-dhr=back]');
  ok('Switch to back 9: round back 9, current hole moved into 10–18, Mel\'s 9-hole DH plus 2',stored(h).holes==='back'&&stored(h).hole>=10&&stored(h).players[0].hcp9===-2&&h.$('ph0').value==='+2'); }

// ---- old links (no &holes=) are a 9-hole DH ----
{ const h=open({url:U+'?dh=7&p=1',storage:{[KEY]:base18}});
  ok('old link (no &holes=) onto an 18-hole round: the same question, nothing switched',!pr(h).hidden&&txt(pr(h).querySelector('h2'))==='Sam\u2019s 9-hole Daily Handicap 7: switch this round to 9 holes?'&&stored(h).holes==='18'&&stored(h).players[1].hcp9==null); }
{ const h=open({url:U+'?dh=7&p=1',storage:{[KEY]:front9}});
  ok('old link onto a 9-hole round: as before, Sam\'s 9-hole DH set directly, no question, toast "Sam: 9-hole Daily Handicap 7"',pr(h).hidden&&stored(h).holes==='front'&&stored(h).players[1].hcp9===7&&stored(h).players[1].hcp===20&&txt(h.$('toast'))==='Sam: 9-hole Daily Handicap 7'); }
{ const h=open({url:U+'?dh=7&holes=9&p=1',storage:{[KEY]:front9}});
  ok('&holes=9 onto a 9-hole round: set directly, no question',pr(h).hidden&&stored(h).holes==='front'&&stored(h).players[1].hcp9===7); }

// ---- &holes=18: only the 18-hole DH, never a switch ----
{ const h=open({url:U+'?dh=12&holes=18&p=1',storage:{[KEY]:base18}});
  ok('&holes=18 onto an 18-hole round: Sam\'s 18-hole DH 12, 9-hole DH untouched, no question, toast "Sam: Daily Handicap 12"',pr(h).hidden&&stored(h).holes==='18'&&stored(h).players[1].hcp===12&&stored(h).players[1].hcp9==null&&h.$('ph1').value==='12'&&txt(h.$('toast'))==='Sam: Daily Handicap 12',txt(h.$('toast'))); }
{ const st9=saved([{name:'Mel',hcp:14,hcp9:null},{name:'Sam',hcp:20,hcp9:9}],{holes:'back'});const h=open({url:U+'?dh=12&holes=18&p=1',storage:{[KEY]:st9}});
  ok('&holes=18 onto a 9-hole round: round stays back 9, only the 18-hole DH set (12), 9-hole DH 9 kept and still in the field',pr(h).hidden&&stored(h).holes==='back'&&stored(h).players[1].hcp===12&&stored(h).players[1].hcp9===9&&h.$('ph1').value==='9');
  ok('…toast: "Sam: 18-hole DH 12 saved for 18-hole rounds; this round uses 9"',txt(h.$('toast'))==='Sam: 18-hole DH 12 saved for 18-hole rounds; this round uses 9',txt(h.$('toast'))); }

// ---- ignored ----
{ const h=open({url:U+'?dh=7&holes=9',storage:{[KEY]:base18}});
  ok('?dh= without &p= is ignored: no question, nothing changed, query removed',pr(h).hidden&&h.w.localStorage.getItem(KEY)!==null&&stored(h).holes==='18'&&stored(h).players.every(p=>p.hcp9==null)&&h.w.location.search===''); }
{ const h=open({url:U+'?dh=7&holes=9&p=5',storage:{[KEY]:base18}});
  ok('an out-of-range &p= is ignored',pr(h).hidden&&stored(h).players.every(p=>p.hcp9==null)); }
{ const h=open({url:U+'?dh=abc&holes=9&p=1',storage:{[KEY]:base18}});
  ok('a non-number ?dh= is ignored',pr(h).hidden&&stored(h).players.every(p=>p.hcp9==null)&&h.w.location.search===''); }

// ---- parity with Stableford: the same words, choices, explanation and toasts ----
{ const sfSaved=JSON.stringify(Object.assign(SF.defaultState(),{players:[{name:'Mel',hcp:14,hcp9:null},{name:'Sam',hcp:20,hcp9:null}],round:'18'}));
  const run=(f,url,storage)=>{const h=boot(f,{url,storage});const q=h.$('dh-prompt');return {h,q:txt(q.querySelector('h2')),p:txt(q.querySelector('p')),b:[...q.querySelectorAll('button')].map(b=>txt(b)+'='+b.getAttribute('data-dhr')).join('|'),focus:h.d.activeElement===q.querySelector('h2'),cls:[...q.querySelectorAll('button')].map(b=>b.className).join('|')};};
  for(const [label,qs] of [['?dh=7&holes=9&p=1','?dh=7&holes=9&p=1'],['?dh=+2 (plus), Mel','?dh=%2B2&holes=9&p=0']]){ // (old links without &holes= differ on purpose: Skins' only came from 9-hole rounds, Stableford's mean "this round's DH")
    const a=run(file,U+qs,{[KEY]:base18}),b=run(sfFile,SU+qs,{[SKEY]:sfSaved});
    ok(`question text matches Stableford word for word (${label}): heading, explanation, choices, button styles, focus`,a.q===b.q&&a.p===b.p&&a.b===b.b&&a.cls===b.cls&&a.focus&&b.focus&&a.q.length>0,JSON.stringify({skins:a.q,sf:b.q}));}
  const toastOf=(f,url,storage,sel)=>{const h=boot(f,{url,storage});h.d.querySelector(sel).click();return txt(h.$('toast'));};
  for(const sel of ['button[data-dhr=keep]','button[data-dhr=front]']){const a=toastOf(file,U+'?dh=7&holes=9&p=1',{[KEY]:base18},sel),b=toastOf(sfFile,SU+'?dh=7&holes=9&p=1',{[SKEY]:sfSaved},sel);
    ok(`toast after "${sel.match(/=(\w+)/)[1]}" matches Stableford ("${a}")`,a===b&&a.length>0,JSON.stringify([a,b]));}
}

// ---- 375 px: the card's CSS is there (layout checked in the browser checks) ----
ok('question card styles: accent card, one choice per row',/\.sk-prompt\{background:var\(--accent-soft\);border:1px solid var\(--accent-line\)\}/.test(src)&&/\.sk-prompt \.sk-ask\{display:grid;grid-template-columns:1fr;gap:var\(--s2\)\}/.test(src));

// ---- mutation checks ----
const mut=(name,a,b)=>{const s=src.replace(a,b);if(s===src)return null;const t=path.join(require('os').tmpdir(),'sdr-'+name+'.html');fs.writeFileSync(t,s);return t;};
{ let f=mut('silent',"if (!(pendingDH.nine && !isNine(S))) dhSet","if (true) dhSet");const h=f&&boot(f,{url:U+'?dh=7&holes=9&p=1',storage:{[KEY]:base18}});
  ok('mutation: setting it without asking is caught',f&&!(pr(h).hidden===false&&JSON.parse(h.w.localStorage.getItem(KEY)).players[1].hcp9==null));
  f=mut('h18',"nine: hq !== '18'","nine: true");const h2=f&&boot(f,{url:U+'?dh=12&holes=18&p=1',storage:{[KEY]:base18}});
  ok('mutation: treating &holes=18 as a 9-hole DH is caught',f&&!(pr(h2).hidden&&JSON.parse(h2.w.localStorage.getItem(KEY)).players[1].hcp===12)); }

process.exit(report('skins-dh-return-ask')?1:0);
