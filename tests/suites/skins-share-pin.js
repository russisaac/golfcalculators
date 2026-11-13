// Skins result share payload (navigator.share title/text/url and the copy-fallback text) for the standard example
// is pinned byte for byte. PO, 12 Nov: all share text is plain ASCII so SMS stays GSM-7, so the pin moved ON PURPOSE
// from tests/baseline/skins-share-cbb93c8.json (p2a-skins-slice1) to tests/baseline/skins-share-ascii-12nov.json.
// The only differences allowed between the two: "−" (U+2212) → "-" and " · " → " | ". Skips on the legacy page.
const {SITE,boot,ok,report,path,fs}=require('../lib/harness');
const html=fs.readFileSync(path.join(SITE,'skins.html'),'utf8');
if(!/data-gc="skins-v2"/.test(html)){console.log('SKIP  legacy skins page: share pin not applicable');process.exit(0);}
const old=JSON.parse(fs.readFileSync(path.join(__dirname,'../baseline/skins-share-cbb93c8.json'),'utf8'));
const want=JSON.parse(fs.readFileSync(path.join(__dirname,'../baseline/skins-share-ascii-12nov.json'),'utf8'));
const got={};const h=boot(path.join(SITE,'skins.html'),{url:'https://golfcalculators.com/skins',beforeParse(w){Object.defineProperty(w.navigator,'share',{value:d=>{got.share=d;return Promise.resolve();},configurable:true});}});
h.w.GCSkinsUI.loadExample();h.w.GCSkinsUI.share();got.copyText=h.w._shareText;
ok('share title/text/url byte-identical to the ASCII pin (12 Nov)',JSON.stringify(got.share)===JSON.stringify(want.share),JSON.stringify(got.share).slice(0,120));
ok('copy-fallback text byte-identical to the ASCII pin (12 Nov)',got.copyText===want.copyText);
ok('share URL is the canonical https://golfcalculators.com/skins',got.share&&got.share.url==='https://golfcalculators.com/skins');
const asc=t=>t.replace(/\u2212/g,'-').split(' \u00b7 ').join(' | ');
ok('the new pin is the cbb93c8 pin with only "−" → "-" and " · " → " | " (nothing else moved)',asc(old.share.text)===want.share.text&&asc(old.copyText)===want.copyText&&old.share.title===want.share.title&&old.share.url===want.share.url);
// GSM 03.38 basic set plus its extension table (| ^ € { } [ ] ~ \\ count as two characters but stay GSM-7)
const GSM7=/^[\n\r @£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜ§¿a-zäöñüà|^€{}\[\]~\\]*$/;
ok('share text and copy text are entirely GSM-7 (one SMS character set, 160 per segment)',GSM7.test(got.share.text)&&GSM7.test(got.copyText));
// every hole mode / scoring mode / plus and pickup-free random rounds: no non-GSM-7 character from our own wording
const E=h.w.GCSkins;let bad=null;
for(let k=0;k<60&&!bad;k++){const st=E.exampleState();st.holes=['18','front','back'][k%3];st.scoring=['full','offlow','gross'][k%3];st.allowance=[100,90,75][k%3];st.carry=k%2===0;
  st.players=st.players.map((p,i)=>({name:'P'+i,hcp:(k*7+i*5)%30-5,hcp9:null}));for(let x=1;x<=18;x++)st.scores[x]=st.players.map((_,i)=>3+((x*3+i*k)%4));
  const t=E.shareText(st,E.compute(st));if(!GSM7.test(t))bad=t;}
ok('60 varied rounds (all hole and scoring modes, allowances, plus handicaps): share text always GSM-7 with ASCII names',!bad,bad&&bad.slice(0,100));
process.exit(report('skins-share-pin')?1:0);
