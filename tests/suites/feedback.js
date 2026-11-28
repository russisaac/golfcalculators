// v9 P4 Feedback: a "Feedback" link in every page's footer and after each result, opening /feedback, a
// Netlify Forms form built into the static HTML (data-netlify, hidden form-name, honeypot, no third-party
// script or captcha): what worked / what didn't / what you'd want, the page filled in from ?from=, optional
// email; success page /feedback-thanks (noindex). /privacy says what the form collects and where it goes.
const {SITE,boot,ok,report,path,fs}=require('../lib/harness');const {JSDOM}=require('jsdom');
const fb=path.join(SITE,'feedback.html');
if(!fs.existsSync(fb)){console.log('SKIP  no feedback.html on this branch');process.exit(0);}
const rd=n=>fs.readFileSync(path.join(SITE,n),'utf8');const doc=n=>new JSDOM(rd(n)).window.document;
const pages=fs.readdirSync(SITE).filter(n=>n.endsWith('.html'));
const KEY={'index.html':'home','skins.html':'skins','stableford.html':'stableford','daily-handicap.html':'daily-handicap','handicap-calculator.html':'handicap-calculator','scramble-handicap-calculator.html':'scramble-handicap-calculator','privacy.html':'privacy'}; // v12: + the scramble page // v10 P1: the Handicap Index page
for(const n of pages){const d=doc(n),a=d.querySelector('footer a[href^="/feedback"]');
  ok(`${n}: footer has a Feedback link`,!!a&&a.textContent.trim()==='Feedback'&&(KEY[n]?a.getAttribute('href')==='/feedback?from='+KEY[n]:/^\/feedback$/.test(a.getAttribute('href'))),a?a.getAttribute('href'):'none');}
for(const [n,k] of [['skins.html','skins'],['stableford.html','stableford'],['daily-handicap.html','daily-handicap']]){const d=doc(n),a=d.querySelector('#fb-after a');
  const inResult=a&&(a.closest('#scr-result')||a.closest('#result'));
  ok(`${n}: "Send feedback" right after the result, with the page filled in`,!!inResult&&a.getAttribute('href')==='/feedback?from='+k);}
const d=doc('feedback.html'),f=d.querySelector('form');
ok('feedback form: name=feedback, POST, data-netlify="true", action /feedback-thanks',!!f&&f.getAttribute('name')==='feedback'&&f.getAttribute('method')==='POST'&&f.getAttribute('data-netlify')==='true'&&f.getAttribute('action')==='/feedback-thanks');
ok('feedback form: hidden form-name=feedback (Netlify needs it in the static HTML)',!!f.querySelector('input[type=hidden][name="form-name"][value="feedback"]'));
ok('feedback form: honeypot field named in netlify-honeypot, hidden from people and screen readers',f.getAttribute('netlify-honeypot')==='bot-field'&&!!f.querySelector('input[name="bot-field"]')&&!!f.querySelector('input[name="bot-field"]').closest('[hidden]'));
ok('feedback form: no third-party captcha or script (no data-netlify-recaptcha, no external src)',!f.hasAttribute('data-netlify-recaptcha')&&![...d.querySelectorAll('script[src]')].length&&!/recaptcha|hcaptcha|turnstile|tally/i.test(rd('feedback.html')));
const names=[...f.querySelectorAll('input,textarea,select')].map(e=>e.name);
ok('feedback form fields: page, worked, didnt, want, email (+ form-name, honeypot) and nothing else',JSON.stringify(names.sort())===JSON.stringify(['bot-field','didnt','email','form-name','page','want','worked']),names.join());
ok('three questions: what worked / what didn\'t / what you\'d want',/What worked\?/.test(f.textContent)&&/What didn’t\?/.test(f.textContent)&&/What would you want next\?/.test(f.textContent));
const em=d.getElementById('fb-email');ok('email is optional, type=email with inputmode=email and autocomplete',!em.required&&em.type==='email'&&em.getAttribute('inputmode')==='email'&&em.getAttribute('autocomplete')==='email');
ok('every visible field has a label',[...f.querySelectorAll('textarea,select,input:not([type=hidden])')].filter(e=>e.name!=='bot-field').every(e=>!!d.querySelector(`label[for="${e.id}"]`)));
ok('no type=number anywhere on the feedback pages',!/type="number"/.test(rd('feedback.html')+rd('feedback-thanks.html')));
ok('feedback page links to the privacy note about the form',!!d.querySelector('a[href="/privacy#feedback"]'));
for(const [from,want] of [['skins','skins'],['stableford','stableford'],['daily-handicap','daily-handicap'],['home','home'],['<script>','other'],['','other']]){
  const h=boot(fb,{url:'https://golfcalculators.com/feedback'+(from?'?from='+encodeURIComponent(from):'')});
  ok(`?from=${from||'(none)'}: page is "${want}"`,h.$('fb-page').value===want);}
{const h=boot(fb,{url:'https://golfcalculators.com/feedback?from=skins'});let sent=0;h.$('fb-form').addEventListener('submit',e=>{if(!e.defaultPrevented)sent++;e.preventDefault();});
 h.$('fb-form').dispatchEvent(new h.w.Event('submit',{cancelable:true,bubbles:true}));
 ok('an empty form is not sent: says what to do and focuses the first box',!sent&&!h.$('fb-err').hidden&&/at least one box/.test(h.$('fb-err').textContent)&&h.d.activeElement===h.$('fb-worked'));
 h.set('fb-didnt','Carry text wraps');const ev=new h.w.Event('submit',{cancelable:true,bubbles:true});h.$('fb-form').dispatchEvent(ev);
 ok('one box filled: the form goes (not blocked)',sent===1);}
const t=doc('feedback-thanks.html');
ok('thanks page: noindex, says thanks, links back to the calculators',/noindex/.test((t.querySelector('meta[name=robots]')||{}).content||'')&&/Thanks/.test(t.querySelector('h1').textContent)&&['/skins','/stableford','/daily-handicap'].every(u=>!!t.querySelector(`main a[href="${u}"]`)));
ok('feedback pages use the shared header nav and gc.css',['feedback.html','feedback-thanks.html'].every(n=>/<style data-src="\/gc.css">/.test(rd(n))&&!!doc(n).querySelector('header.gc-header nav.gc-nav')));
const pv=doc('privacy.html').querySelector('main').textContent.replace(/\s+/g,' ');
ok('privacy: says what the form collects (the three answers, the page)',/feedback form/.test(pv)&&/what worked, what didn’t and what you’d want/.test(pv)&&/the page it is about/.test(pv));
ok('privacy: email is optional',/email address only if you choose to give it/.test(pv));
ok('privacy: processed and stored by Netlify, including outside Australia, sent to us',/processed and stored by Netlify[^.]*outside Australia[^.]*sent to us/.test(pv));
ok('contact email still only on /privacy',pages.filter(n=>rd(n).includes('russ@simplifyy.com')).join()==='privacy.html');
ok('sitemap lists /feedback but not the thanks page',/<loc>https:\/\/golfcalculators\.com\/feedback<\/loc>/.test(rd('sitemap.xml'))&&!/feedback-thanks/.test(rd('sitemap.xml')));
process.exitCode=report('feedback')?1:0;
