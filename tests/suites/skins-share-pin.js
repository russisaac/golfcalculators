// Skins result share payload (navigator.share title/text/url and the copy-fallback text)
// for the standard example must stay byte-identical to p2a-skins-slice1 @ cbb93c8
// (fixture tests/baseline/skins-share-cbb93c8.json). Skips on the legacy Skins page.
const {SITE,boot,ok,report,path,fs}=require('../lib/harness');
const html=fs.readFileSync(path.join(SITE,'skins.html'),'utf8');
if(!/data-gc="skins-v2"/.test(html)){console.log('SKIP  legacy skins page: share pin not applicable');process.exit(0);}
const want=JSON.parse(fs.readFileSync(path.join(__dirname,'../baseline/skins-share-cbb93c8.json'),'utf8'));
const got={};const h=boot(path.join(SITE,'skins.html'),{url:'https://golfcalculators.com/skins',beforeParse(w){Object.defineProperty(w.navigator,'share',{value:d=>{got.share=d;return Promise.resolve();},configurable:true});}});
h.w.GCSkinsUI.loadExample();h.w.GCSkinsUI.share();got.copyText=h.w._shareText;
ok('share title/text/url byte-identical to cbb93c8',JSON.stringify(got.share)===JSON.stringify(want.share),JSON.stringify(got.share).slice(0,120));
ok('copy-fallback text byte-identical to cbb93c8',got.copyText===want.copyText);
ok('share URL is the canonical https://golfcalculators.com/skins',got.share&&got.share.url==='https://golfcalculators.com/skins');
process.exit(report('skins-share-pin')?1:0);
