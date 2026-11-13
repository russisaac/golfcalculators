// skins-plus-hcp: the Skins handicap field is plain text like Stableford's (type=text, no inputmode), so
// + and − can be typed on a phone keypad; the −/+ stepper stays. "+2", "-2" and "−2" all mean plus 2,
// with the same inline plus note (exact Stableford wording) announced via aria-live=polite and tied to
// the field with aria-describedby. Works on 18 holes (18-hole DH) and 9 holes (9-hole DH). (PO, 12 Nov)
const {SITE,boot,ok,report,path,fs}=require('../lib/harness');
const file=path.join(SITE,'skins.html');const src=fs.readFileSync(file,'utf8');
if(!/data-gc="skins-v2"/.test(src)){console.log('SKIP  legacy skins page: not applicable');process.exit(0);}
const U='https://golfcalculators.com/skins',KEY='gc_skins_v2';
const open=(o={},f=file)=>boot(f,Object.assign({url:U},o));
const SF=boot(path.join(SITE,'stableford.html'),{url:'https://golfcalculators.com/stableford'}).w.GCStableford;
const E=open().w.GCSkins;
const pre=new (require('jsdom').JSDOM)(src).window.document; // the static HTML, before any script runs
const type=(h,i,v)=>{const el=h.$('ph'+i);el.focus();el.value=v;h.fire(el);};
const blur=(h,i)=>h.fire(h.$('ph'+i),'focusout');
const note=(h,i)=>h.$('pl'+i).textContent;
const vis=(h,i)=>h.w.getComputedStyle(h.$('pl'+i)).display!=='none';
const field=(h,i)=>{const e=h.$('ph'+i),n=h.$('pl'+i);return e.type==='text'&&!e.hasAttribute('inputmode')&&(e.getAttribute('aria-describedby')||'').split(' ').includes('pl'+i)&&!!n&&n.getAttribute('aria-live')==='polite';};

// ---- markup ----
ok('static HTML: the four handicap fields are type=text with no inputmode, described by an aria-live note',[0,1,2,3].every(i=>{const e=pre.getElementById('ph'+i),n=pre.getElementById('pl'+i);return e.type==='text'&&!e.hasAttribute('inputmode')&&e.getAttribute('aria-describedby')==='pl'+i&&n&&n.getAttribute('aria-live')==='polite'&&n.textContent==='';}));
{ const h=open();
  ok('rendered: every handicap field plain text, no inputmode, aria-describedby → its plus note (aria-live=polite)',[0,1,2,3].every(i=>field(h,i)));
  ok('the −/+ stepper stays beside the field',[0,1,2,3].every(i=>h.d.querySelector('button[data-h="-1"][data-i="'+i+'"]')&&h.d.querySelector('button[data-h="1"][data-i="'+i+'"]')));
  ok('no plus note for 0 (empty and hidden)',note(h,0)===''&&!vis(h,0));
  ok('the static player rows match the script-rendered ones (no layout shift)',pre.getElementById('players').innerHTML===h.$('players').innerHTML);
}

// ---- +2, -2, −2 ----
const W2=SF.plusNote(-2);
ok('wording source: Stableford\'s note for plus 2',W2==='Plus 2 (+2): gives back 2 strokes, starting at the highest stroke index',W2);
ok('engine plusNote is word-for-word Stableford\'s (−10 … 54)',[...Array(65)].map((_,k)=>k-10).every(v=>E.plusNote(v)===SF.plusNote(v)));
for(const [v,label] of [['+2','+2'],['-2','-2 (hyphen)'],['\u22122','−2 (minus sign)']]){
  const h=open();type(h,1,v);
  const live=note(h,1);blur(h,1);
  ok(`typing ${label}: stored as plus 2 (−2), note shown while typing`,h.w.GCSkinsUI.state().players[1].hcp===-2&&live===W2&&vis(h,1),live);
  ok(`typing ${label}: on leaving the field it reads +2 and the note stays`,h.$('ph1').value==='+2'&&note(h,1)===W2);
  ok(`typing ${label}: the round gives back 2 (playing handicap −2)`,E.compute(h.w.GCSkinsUI.state()).playing[1]===-2);
}
{ const h=open();type(h,0,'+1');ok('+1: "gives back 1 stroke" (singular)',note(h,0)==='Plus 1 (+1): gives back 1 stroke, starting at the highest stroke index',note(h,0));
  type(h,0,'12');ok('back to 12: note clears',note(h,0)===''&&h.w.GCSkinsUI.state().players[0].hcp===12);
  type(h,0,'+');ok('a lone "+" mid-typing keeps the last value and its (empty) note',h.w.GCSkinsUI.state().players[0].hcp===12&&note(h,0)==='');
  type(h,0,'+3');type(h,0,'+');ok('…and keeps a plus note while you retype',note(h,0)===SF.plusNote(-3));
  type(h,0,'+15');blur(h,0);ok('+15 clamps to the +10 floor, note says plus 10',h.$('ph0').value==='+10'&&note(h,0)===SF.plusNote(-10));
}
// ---- stepper ----
{ const h=open();const lo=h.d.querySelector('button[data-h="-1"][data-i="2"]'),hi=h.d.querySelector('button[data-h="1"][data-i="2"]');
  lo.click();ok('stepper − from 0 → +1, plus note appears',h.$('ph2').value==='+1'&&note(h,2)===SF.plusNote(-1));
  lo.click();ok('stepper − again → +2',h.$('ph2').value==='+2'&&note(h,2)===W2);
  hi.click();hi.click();ok('stepper + back to 0 → note clears',h.$('ph2').value==='0'&&note(h,2)==='');
}
// ---- reload ----
{ const st=Object.assign(E.defaultState(),{players:[{name:'Ann',hcp:-2,hcp9:null},{name:'Bo',hcp:10,hcp9:null}]});
  const h=open({storage:{[KEY]:JSON.stringify(st)}});
  ok('a saved plus 2 reopens as +2 with its note',h.$('ph0').value==='+2'&&note(h,0)===W2&&note(h,1)==='');
}
// ---- 9 holes ----
{ const st=Object.assign(E.defaultState(),{holes:'front',players:[{name:'Ann',hcp:6,hcp9:3},{name:'Bo',hcp:-4,hcp9:null}]});
  const h=open({storage:{[KEY]:JSON.stringify(st)}});
  ok('9 holes: field described by the plus note and the 9-hole check note',h.$('ph0').getAttribute('aria-describedby')==='pl0 hn0'&&field(h,0));
  ok('9 holes: a prefilled +2 (half of +4) shows the plus note and the please-check note',h.$('ph1').value==='+2'&&note(h,1)===W2&&h.$('hn1').textContent==='Half of 18-hole DH +4: please check');
  type(h,0,'\u22121');blur(h,0);const p=h.w.GCSkinsUI.state().players[0];
  ok('9 holes: −1 typed sets the 9-hole DH to plus 1, the 18-hole DH (6) is untouched',p.hcp9===-1&&p.hcp===6&&h.$('ph0').value==='+1'&&note(h,0)===SF.plusNote(-1));
  const r=h.d.querySelector('input[name=holes][value="18"]');r.checked=true;h.fire(r,'change');
  ok('back to 18 holes: field shows the 18-hole DH 6, plus note clears',h.$('ph0').value==='6'&&note(h,0)==='');
}
// ---- gross ----
{ const h=open();const g=h.d.querySelector('input[name=scoring][value=gross]');g.checked=true;h.fire(g,'change');
  ok('gross scoring: no handicap fields and no plus notes',!h.$('ph0')&&!h.$('pl0'));
}
// ---- mutation checks: the suite catches regressions ----
const mut=(name,a,b)=>{const t=path.join(require('os').tmpdir(),'skins-mut-'+name+'.html');const s=src.replace(a,b);if(s===src)return null;fs.writeFileSync(t,s);return t;};
{ const f=mut('minus',"/^[+\\-−]?\\d{1,2}$/.test(v)","/^[+\\-]?\\d{1,2}$/.test(v)");
  const h=f&&open({},f);if(h){type(h,0,'\u22122');}
  ok('mutation: dropping − from the accepted signs is caught (−2 no longer stored)',f&&h.w.GCSkinsUI.state().players[0].hcp!==-2);
}
{ const f=mut('inputmode','type="text" autocomplete="off" aria-label="\' + nm','type="text" inputmode="numeric" autocomplete="off" aria-label="\' + nm');
  const h=f&&open({},f);ok('mutation: putting inputmode back is caught',f&&!field(h,0));
}
{ const f=mut('note',"setPlusNote(i);\n}","\n}");
  const h=f&&open({},f);if(h)h.d.querySelector('button[data-h="-1"][data-i="0"]').click();
  ok('mutation: not refreshing the note on a stepper change is caught',f&&note(h,0)!==SF.plusNote(-1));
}
process.exit(report('skins-plus-hcp')?1:0);
