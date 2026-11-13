// skins-9hole-dh: Skins uses each player's own 9-hole Daily Handicap on 9-hole rounds (GA: it is its own
// number, not half the 18-hole one), like Stableford. 18-hole and 9-hole DHs are remembered separately;
// players saved before this change (no 9-hole DH) get half the 18-hole DH as a prefill with a one-line
// "please check" note, and the stored 18-hole DH is never overwritten. Also the per-player
// "Work out 9-hole DH →" link and the DH round trip that sets that player directly.
const {SITE,boot,ok,report,path,fs}=require('../lib/harness');
const file=path.join(SITE,'skins.html');const src=fs.readFileSync(file,'utf8');
if(!/data-gc="skins-v2"/.test(src)){console.log('SKIP  legacy skins page: not applicable');process.exit(0);}
const U='https://golfcalculators.com/skins';
const open=(o={})=>boot(file,Object.assign({url:U},o));
const txt=el=>el?el.textContent.replace(/\s+/g,' ').trim():'';
const click=(h,sel)=>{const b=h.d.querySelector(sel);if(!b)throw new Error('no '+sel);b.click();};
const E=open().w.GCSkins;
const KEY='gc_skins_v2';
const saved=(players,extra={})=>JSON.stringify(Object.assign(E.defaultState(),{players},extra));

// ---- engine ----
{ const st=Object.assign(E.defaultState(),{players:[{name:'A',hcp:20,hcp9:12},{name:'B',hcp:20},{name:'C',hcp:-3,hcp9:-1},{name:'D',hcp:0,hcp9:null}],holes:'front'});
  const r=E.compute(st);
  ok('9 holes: a player\'s own 9-hole DH is used as is (20 / 12 → 12, not 10)',r.playing[0]===12,String(r.playing));
  ok('9 holes, no 9-hole DH yet: half the 18-hole DH (20 → 10), as before',r.playing[1]===10,String(r.playing));
  ok('9 holes: plus 9-hole DH +1 used as is (−1); D 0 → 0',r.playing[2]===-1&&r.playing[3]===0,String(r.playing));
  st.holes='18';const r18=E.compute(st);ok('18 holes: always the 18-hole DH (20, 20, +3, 0), the 9-hole DH is ignored',r18.playing.join()==='20,20,-3,0',String(r18.playing));
  st.holes='back';st.allowance=90;const rb=E.compute(st);ok('back 9 with 90% allowance: 12 × 0.9 → 11, 10 × 0.9 → 9',rb.playing[0]===11&&rb.playing[1]===9,String(rb.playing));
  const ex=E.compute(E.exampleState());ok('the standard 18-hole example is unchanged: −75 / −75 / −35 / +185',ex.balances.map(E.signed).join()==='−$75.00,−$75.00,−$35.00,+$185.00',ex.balances.map(E.signed).join());
}

// ---- setup: labels, links, notes ----
{ const h=open({storage:{[KEY]:saved([{name:'Mel',hcp:12},{name:'Sam',hcp:+0},{name:'Jo',hcp:24},{name:'Al',hcp:-2}])}});
  const lbl=i=>h.$('ph'+i).getAttribute('aria-label');
  ok('18 holes: "Daily handicap", no per-player DH links or notes',txt(h.$('hcp-col'))==='Daily handicap'&&/^Mel daily handicap \(\+ for plus\)$/.test(lbl(0))&&!h.d.querySelector('.sk-dhlink')&&!h.d.querySelector('.sk-hcpnote'));
  ok('18 holes: fields show the 18-hole DH (12, 0, 24, +2)',[0,1,2,3].map(i=>h.$('ph'+i).value).join()==='12,0,24,+2');
  h.d.querySelector('input[name=holes][value=front]').click();
  ok('front 9: column, field and group labels say "9-hole Daily Handicap"',txt(h.$('hcp-col'))==='9-hole Daily Handicap'&&lbl(0)==='Mel 9-hole Daily Handicap (+ for plus)'&&h.$('ph0').closest('.gc-stepper').getAttribute('aria-label')==='Mel 9-hole Daily Handicap',lbl(0));
  ok('front 9: each player\'s "Work out 9-hole DH →" sits right after their stepper, in the same row, for that player',[0,1,2,3].every(i=>{const a=h.$('dhl'+i);return !!a&&a.closest('.sk-player')===h.$('ph'+i).closest('.sk-player')&&a.previousElementSibling===h.$('ph'+i).closest('.gc-stepper')&&a.getAttribute('href')==='/daily-handicap?from=skins&holes=9&p='+i&&txt(a)==='Work out 9-hole DH →'&&/^Work out .+’s 9-hole Daily Handicap$/.test(a.getAttribute('aria-label'));}));
  ok('saved before 9-hole DHs: prefilled with half the 18-hole DH (6, 0, 12, +1)',[0,1,2,3].map(i=>h.$('ph'+i).value).join()==='6,0,12,+1',[0,1,2,3].map(i=>h.$('ph'+i).value).join());
  ok('one-line "please check" note on each prefilled field ("Half of 18-hole DH 12: please check"), none for DH 0',txt(h.$('hn0'))==='Half of 18-hole DH 12: please check'&&txt(h.$('hn2'))==='Half of 18-hole DH 24: please check'&&txt(h.$('hn3'))==='Half of 18-hole DH +2: please check'&&txt(h.$('hn1'))==='',[0,1,2,3].map(i=>txt(h.$('hn'+i))).join(' | '));
  ok('the note is announced and described: aria-live=polite, field aria-describedby',h.$('hn0').getAttribute('aria-live')==='polite'&&h.$('ph0').getAttribute('aria-describedby').split(' ').includes('hn0'));
  const S=()=>h.w.GCSkinsUI.state();
  ok('prefill is not stored: 9-hole DH stays empty and the 18-hole DH is untouched',S().players.every(p=>p.hcp9==null)&&S().players.map(p=>p.hcp).join()==='12,0,24,-2');
  click(h,'button[data-h="1"][data-i="0"]');
  ok('stepping Mel\'s 9-hole DH: 6 → 7 is stored as the 9-hole DH, note cleared, 18-hole DH still 12',S().players[0].hcp9===7&&S().players[0].hcp===12&&h.$('ph0').value==='7'&&txt(h.$('hn0'))==='');
  h.set('ph2','11');ok('typing Jo\'s 9-hole DH 11: stored as the 9-hole DH, note cleared, 18-hole DH still 24',S().players[2].hcp9===11&&S().players[2].hcp===24&&txt(h.$('hn2'))==='');
  h.d.querySelector('input[name=holes][value="18"]').click();
  ok('back to 18 holes: fields show the 18-hole DHs again (12, 0, 24, +2)',[0,1,2,3].map(i=>h.$('ph'+i).value).join()==='12,0,24,+2'&&txt(h.$('hcp-col'))==='Daily handicap'&&!h.d.querySelector('.sk-dhlink'));
  click(h,'button[data-h="-1"][data-i="0"]');ok('stepping on 18 holes changes only the 18-hole DH (12 → 11; 9-hole stays 7)',S().players[0].hcp===11&&S().players[0].hcp9===7);
  const later=open({storage:{[KEY]:h.w.localStorage.getItem(KEY)}});const L=later.w.GCSkinsUI.state();
  ok('later visit: both remembered separately (Mel 11 / 7, Jo 24 / 11, Sam and Al with no 9-hole DH yet)',L.players[0].hcp===11&&L.players[0].hcp9===7&&L.players[2].hcp===24&&L.players[2].hcp9===11&&L.players[1].hcp9==null&&L.players[3].hcp9==null);
  later.d.querySelector('input[name=holes][value=back]').click();
  ok('later visit, back 9: entered 9-hole DHs shown without a note; Al still prefilled +1 with the note',later.$('ph0').value==='7'&&txt(later.$('hn0'))===''&&later.$('ph3').value==='+1'&&txt(later.$('hn3'))==='Half of 18-hole DH +2: please check');
  click(later,'#btn-add');ok('a new player starts with no 9-hole DH (0, no note)',later.w.GCSkinsUI.state().players[4].hcp9===null&&later.$('ph4').value==='0'&&txt(later.$('hn4'))==='');
}
// gross: no handicap fields, links or notes
{ const h=open({storage:{[KEY]:saved([{name:'A',hcp:12},{name:'B',hcp:4}],{holes:'front',scoring:'gross'})}});
  ok('gross on 9 holes: no handicap field, link or note',!h.$('ph0')&&!h.d.querySelector('.sk-dhlink')&&!h.d.querySelector('.sk-hcpnote')); }

// ---- the pre-rendered 18-hole setup still equals what the script renders (no layout shift) ----
{ const h=open({storage:{}});const norm=t=>(t||'').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
  const m=src.match(/<div id="players">([\s\S]*?)<\/div><\/div>\n/);
  ok('fresh setup: pre-rendered player rows equal the rendered rows',!!m&&norm(m[1]+'</div>')===norm(h.$('players').innerHTML)); }

// ---- DH round trip ----
{ const d=boot(path.join(SITE,'daily-handicap.html'),{url:'https://golfcalculators.com/daily-handicap?from=skins&holes=9&p=2'});
  ok('DH page from a Skins player\'s 9-hole link opens on 9 holes',d.$('holes').value==='9');
  d.set('ga','14.2');d.set('slope','128');d.set('scratch','35.5');d.set('par','36');
  const back=d.$('sfBack').getAttribute('href'),v=decodeURIComponent((back.match(/dh=([^&]+)/)||[])[1]||'');
  ok('…and links back to Skins with the value and the player ('+back+')',!d.$('sfBack').hidden&&/^\/skins\?dh=[^&]+&p=2$/.test(back)&&txt(d.$('sfBackT'))==='Use '+v+' in Skins →'&&/Back to your Skins round, set for that player\./.test(txt(d.$('sfBack'))),back);
  const d2=boot(path.join(SITE,'daily-handicap.html'),{url:'https://golfcalculators.com/daily-handicap?from=stableford'});d2.set('ga','14.2');d2.set('slope','128');d2.set('scratch','71');d2.set('par','72');
  ok('Stableford return unchanged (/stableford?dh=14, "Use 14 in Stableford →")',d2.$('sfBack').getAttribute('href')==='/stableford?dh=14'&&txt(d2.$('sfBackT'))==='Use 14 in Stableford →');
  const st=saved([{name:'Mel',hcp:12},{name:'Sam',hcp:4},{name:'Jo',hcp:24},{name:'Al',hcp:-2}],{holes:'front'});
  const h=open({url:U+'?dh='+encodeURIComponent(v)+'&p=2',storage:{[KEY]:st}});const P=h.w.GCSkinsUI.state().players;
  ok('back in Skins with &p=2: Jo\'s 9-hole DH is set directly ('+v+'), 18-hole DH still 24, toast, note gone, query removed',P[2].hcp9===+v&&P[2].hcp===24&&h.$('ph2').value===v&&txt(h.$('hn2'))===''&&txt(h.$('toast'))==='Jo: 9-hole Daily Handicap '+v&&h.w.location.search==='',txt(h.$('toast')));
  const h2=open({url:U+'?dh=7&p=9',storage:{[KEY]:st}});ok('an out-of-range &p= changes nothing',h2.w.GCSkinsUI.state().players.every(p=>p.hcp9==null)&&h2.w.location.search==='');
  const h3=open({url:U+'?dh=7&p=0',storage:{[KEY]:saved([{name:'Mel',hcp:12},{name:'Sam',hcp:4}])}});ok('a return to an 18-hole round switches it to the front 9 (the link only exists on 9 holes) and sets the 9-hole DH',h3.w.GCSkinsUI.state().holes==='front'&&h3.w.GCSkinsUI.state().players[0].hcp9===7&&h3.w.GCSkinsUI.state().players[0].hcp===12); }

// ---- copy ----
{ const h=open();const it=[...h.d.querySelectorAll('.gc-faq-item')].find(e=>/strokes given in net skins/.test(txt(e.querySelector('h3'))));
  ok('Skins FAQ: 9 holes use each player\'s 9-hole Daily Handicap, not half the 18-hole one, with the DH link',!!it&&/For 9 holes, use each player's 9-hole Daily Handicap \(from the Daily Handicap calculator\), not half the 18-hole one\./.test(txt(it))&&it.querySelector('a[href="/daily-handicap"]'));
  ok('no Skins copy still says the 9-hole handicap is halved',!/(handicap is halved|and it is halved)/i.test(src)); }
process.exitCode=report('skins-9hole-dh')?1:0;
