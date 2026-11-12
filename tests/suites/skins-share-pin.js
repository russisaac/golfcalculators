// Skins result share payload (navigator.share title/text and the copy-fallback text) for the standard example is
// pinned byte for byte. The pin moved ON PURPOSE twice (PO, 12 Nov):
//  1. tests/baseline/skins-share-cbb93c8.json -> skins-share-ascii-12nov.json: plain ASCII ("−" -> "-", " · " -> " | ").
//  2. skins-share-ascii-12nov.json -> skins-share-link-12nov.json (share-link-skins): the result link replaces the plain
//     site URL and is the text's last line ("Settled at <link>"), so navigator.share gets {title, text} (no separate url),
//     exactly as on Stableford, and the copy fallback copies the same text. Nothing else moved.
// Also: with 6 or more players the per-player balance line is dropped (the link carries the detail). Skips on legacy.
const {SITE,boot,ok,report,path,fs}=require('../lib/harness');
const html=fs.readFileSync(path.join(SITE,'skins.html'),'utf8');
if(!/data-gc="skins-v2"/.test(html)){console.log('SKIP  legacy skins page: share pin not applicable');process.exit(0);}
const B=f=>JSON.parse(fs.readFileSync(path.join(__dirname,'../baseline/'+f),'utf8'));
const old=B('skins-share-cbb93c8.json'),ascii=B('skins-share-ascii-12nov.json'),want=B('skins-share-link-12nov.json');
const GSM7=/^[\n\r @£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜ§¿a-zäöñüà|^€{}\[\]~\\]*$/;
(async()=>{
const got={};const h=boot(path.join(SITE,'skins.html'),{url:'https://golfcalculators.com/skins',beforeParse(w){w.CompressionStream=CompressionStream;w.DecompressionStream=DecompressionStream;Object.defineProperty(w.navigator,'share',{value:d=>{got.share=d;return Promise.resolve();},configurable:true});}});
h.w.GCSkinsUI.loadExample();await h.w.GCSkinsUI.link();h.w.GCSkinsUI.share();await new Promise(r=>setTimeout(r,10));got.copyText=h.w._shareText;
const E=h.w.GCSkins,link=(want.share.text.match(/Settled at (\S+)$/)||[])[1]||'';
ok('share title/text byte-identical to the link pin (12 Nov)',JSON.stringify(got.share)===JSON.stringify(want.share),JSON.stringify(got.share).slice(0,120));
ok('copy-fallback text byte-identical to the pin (the same text as shared)',got.copyText===want.copyText&&want.copyText===want.share.text);
ok('the link pin is the ASCII pin\'s copy text with only the site URL replaced by the result link, and no separate url',
  ascii.copyText.replace(/Settled at https:\/\/golfcalculators\.com\/skins$/,'Settled at '+link)===want.share.text&&want.share.url===undefined&&want.share.title===ascii.share.title&&/^https:\/\/golfcalculators\.com\/skins#r=1z\.[A-Za-z0-9_-]+$/.test(link));
const asc=t=>t.replace(/\u2212/g,'-').split(' \u00b7 ').join(' | ');
ok('…and the ASCII pin is still the cbb93c8 pin with only "−" → "-" and " · " → " | "',asc(old.share.text)===ascii.share.text&&asc(old.copyText)===ascii.copyText);
const back=E.fromPayload(await h.w.GCShare.decode(link.split('#r=')[1])),ex=E.exampleState(),sum=s=>JSON.stringify((r=>[r.balances,r.skins,r.payments,r.leftover])(E.compute(s)));
ok('the pinned link reopens the example: same balances (−75 / −75 / −35 / +185), skins and payments',back&&sum(back)===sum(ex)&&JSON.stringify(E.compute(back).balances)==='[-75,-75,-35,185]',back&&sum(back));
ok('share text is entirely GSM-7 (one SMS character set, 160 per segment)',GSM7.test(got.share.text));
let bad=null;
for(let k=0;k<60&&!bad;k++){const st=E.exampleState();st.holes=['18','front','back'][k%3];st.scoring=['full','offlow','gross'][k%3];st.allowance=[100,90,75][k%3];st.carry=k%2===0;
  st.players=st.players.map((p,i)=>({name:'P'+i,hcp:(k*7+i*5)%30-5,hcp9:null}));for(let x=1;x<=18;x++)st.scores[x]=st.players.map((_,i)=>3+((x*3+i*k)%4));
  const t=E.shareText(st,E.compute(st),link);if(!GSM7.test(t))bad=t;}
ok('60 varied rounds (all hole and scoring modes, allowances, plus handicaps): share text always GSM-7 with ASCII names',!bad,bad&&bad.slice(0,100));
// 6 or more players: no per-player balance line (PO); 2-5 keep it; nothing else changes
const many=n=>{const st=E.exampleState();st.players=[...Array(n)].map((_,i)=>({name:'Bartholomew-Fitzgerald'+i,hcp:i*3,hcp9:null}));for(let x=1;x<=18;x++)st.scores[x]=st.players.map((_,i)=>3+((x*7+i*3)%5));return st;};
const bal=t=>t.split('\n').some(l=>/ \(\d+ skins?\)( \||$)/.test(l));
const rows=[2,3,4,5,6,7,8].map(n=>{const st=many(n),r=E.compute(st),t=E.shareText(st,r,link);return {n,has:bal(t),lines:t.split('\n').length,pays:r.payments.length,len:t.length};});
ok('balance line kept for 2–5 players, dropped for 6, 7 and 8',rows.every(x=>x.has===(x.n<6)),JSON.stringify(rows));
ok('…and only that line: 6+ players = header + one line per payment + the link',rows.filter(x=>x.n>=6).every(x=>x.lines===x.pays+2),JSON.stringify(rows));
const r8=rows.find(x=>x.n===8);ok(`8 long names: share text with the link is ${r8.len} chars = ${Math.ceil(r8.len/153)} GSM-7 SMS (design §4: 1,195 chars = 18 UCS-2 segments)`,r8.len<1000);
process.exit(report('skins-share-pin')?1:0);
})();
