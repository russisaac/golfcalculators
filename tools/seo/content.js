// P3 search-depth content for the three tool pages: worked examples, rules sources,
// body links and FAQs. build.js writes it into each page's static HTML (visible FAQ and
// the JSON-LD FAQPage come from the same strings, so they always match).
// Numbers inside data-ex="..." are checked against the page's own calculator code by
// tests/suites/worked-examples.js.
const GA_PDF = 'https://static.golf.com.au/clubs/1000/uploads/resources/whs%20reference%20guide%20for%20australian%20administrators%20(1-1-2026).pdf';
const GA_CITE = `Golf Australia, <a href="${GA_PDF}" rel="noopener"><cite>WHS Official reference guide for Australian administrators, Operational Guidance &amp; Supporting Regulations</cite></a>, Edition January 2026`;
const RULE21 = 'https://www.randa.org/en/rog/the-rules-of-golf/rule-21';
const CP5 = 'https://www.randa.org/en/rog/committee-procedures/5';

module.exports = {
  GA_PDF,
  skins: {
    name: 'Golf Skins Calculator',
    how: `
  <h2 id="how-h">How it's calculated</h2>
  <p>Skins has no governing rulebook, so this calculator uses the common club format. Each hole is worth one skin and the lowest score wins it outright. If the lowest score is tied, the skin carries to the next hole. Each skin is worth the stake from every other player.</p>
  <h3>Worked example</h3>
  <p>Four players play for $5 a skin, net, with full handicaps and carryovers on. Their Daily Handicaps are Alex <span data-ex="play-0">0</span>, Blake <span data-ex="play-1">4</span>, Casey <span data-ex="play-2">8</span> and Drew <span data-ex="play-3">12</span>. Strokes go by stroke index (SI), so Drew gets one stroke on SI 1–12, Casey on SI 1–8 and Blake on SI 1–4.</p>
  <ul class="gc-learn-list">
    <li>Hole 1 (par 4, SI 5): the nets are Alex <span data-ex="h1-net-0">4</span>, Blake <span data-ex="h1-net-1">5</span>, Casey <span data-ex="h1-net-2">3</span> and Drew <span data-ex="h1-net-3">4</span>. Casey wins <span data-ex="h1-value">1</span> skin.</li>
    <li>Holes 2–4: two or more players tie for the low net on each, so <span data-ex="h5-carry">3</span> skins carry.</li>
    <li>Hole 5 (par 4, SI 9) is the carryover hole. Drew scores <span data-ex="h5-gross-3">3</span>, gets a stroke and nets <span data-ex="h5-net-3">2</span>, the only low net. He wins <span data-ex="h5-value">4</span> skins: hole 5 plus the 3 carried.</li>
  </ul>
  <p>After 18 holes Casey has <span data-ex="skins-2">2</span> skins and Drew <span data-ex="skins-3">13</span>. <span data-ex="left">3</span> skins are still carried after the last hole, so nobody wins them. Each balance is $5 × (4 × the player's skins − <span data-ex="total">15</span> skins won):</p>
  <p class="gc-learn-result">Alex <span data-ex="bal-0">−$75.00</span> · Blake <span data-ex="bal-1">−$75.00</span> · Casey <span data-ex="bal-2">−$35.00</span> · Drew <span data-ex="bal-3">+$185.00</span></p>
  <p>Alex pays Drew <span data-ex="pay-0">$75.00</span>, Blake pays Drew <span data-ex="pay-1">$75.00</span> and Casey pays Drew <span data-ex="pay-2">$35.00</span>. Tap <strong>Load example</strong> at the top to see every hole.</p>
  <p class="gc-learn-src" id="rules-source">Rules source: no governing body publishes skins rules, so this is the common club format. As with any competition, your group decides before the round how tied holes and leftover skins are settled (<a href="${CP5}" rel="noopener">R&amp;A Rules of Golf, Committee Procedures 5A(6)</a>).</p>
  <p>Playing net? <a href="/daily-handicap">Work out each player's Daily Handicap first</a>, then <a href="/stableford">count Stableford points from the same round</a>.</p>`,
    faq: [
      ['How do carryovers work in a skins game?', 'If two or more players tie for the lowest score on a hole, nobody wins that skin and it carries to the next hole, which is then worth two skins. Carries keep adding up until one player wins a hole outright. You can switch carryovers off under More options.'],
      ['Should we play net or gross skins?', 'Gross skins compare actual strokes, which suits players of similar ability. Net skins take handicap strokes off first, by stroke index, so higher handicaps can win holes. Off the low gives each player the difference between their handicap and the lowest in the group. Agree on one before you tee off.'],
      ['What happens to skins still carried after the 18th?', 'Your group decides before the round. Common choices are that nobody wins them, or that a playoff, such as a chip-off or an extra hole, decides who takes them all. Both are under More options, and the calculator asks for the playoff winner when one is needed.'],
      ['How much should a skin be worth?', 'Whatever your group agrees. Remember that each skin is paid by every other player: at $5 a skin in a four-ball, winning one skin collects $15. Small stakes keep it social, and the calculator handles any amount.'],
      ['How are skins payouts split?', 'Each player\'s balance is the stake × (number of players × their skins − total skins won), so the balances always add up to $0. The calculator then lists who pays whom, matching the biggest debts with the biggest winnings so the group needs only a few payments.'],
      ['How are handicap strokes given in net skins?', 'Players get one stroke on each hole whose stroke index is at or below their Daily Handicap, and a second on the hardest holes if it is over 18. A plus handicap gives strokes back from stroke index 18. For 9 holes, use each player\'s 9-hole Daily Handicap (from the Daily Handicap calculator), not half the 18-hole one.', {text:'Daily Handicap calculator', href:'/daily-handicap'}],
      ['Pot or pay each other?', 'Paying each other is the classic way: every skin is worth the stake from each of the other players. With a pot, everyone puts in an equal share of the skins won × the stake, and each winner takes the stake for every skin. Pot amounts are smaller: a quarter of pay-each-other in a four-ball. Choose under More options.'],
      ['Can players on different tees play skins together?', 'Yes. Each player gets shots by their own tee\'s stroke index, and a hole is decided on net score against each player\'s own par, so a net 6 on a par 5 ties a net 5 on a par 4 (Golf Australia WHS guide, January 2026, §3(I)). Turn on “Players on different tees” in setup.']
    ]
  },
  stableford: {
    name: 'Stableford Points Calculator',
    how: `
  <h2 id="how-h">How it's calculated</h2>
  <p>On each hole your handicap strokes come off your score to give a net score, which is then compared with par: net double bogey or worse scores 0 points, net bogey 1, net par 2, net birdie 3 and net eagle 4 (<a href="${RULE21}" rel="noopener">Rules of Golf, Rule 21.1b</a>). Strokes go by stroke index (SI), hardest hole first. Ties on the leaderboard are split with the Australian Countback Method: the last 9 holes, then the last 6, the last 3 and then hole by hole.</p>
  <h3>Worked example</h3>
  <p>One player with a Daily Handicap of <span data-ex="hcp">20</span> plays the first 3 holes of the calculator's standard card. A handicap of 20 gives one stroke on every hole, plus a second stroke on SI 1 and SI 2.</p>
  <ul class="gc-learn-list">
    <li>Hole 1 (par 4, SI 5): <span data-ex="st-1">1</span> stroke. A score of <span data-ex="sc-1">5</span> is net 4, a net par: <span data-ex="pt-1">2</span> points.</li>
    <li>Hole 2 (par 4, SI 3): <span data-ex="st-2">1</span> stroke. A score of <span data-ex="sc-2">4</span> is net 3, a net birdie: <span data-ex="pt-2">3</span> points.</li>
    <li>Hole 3 (par 3, SI 1): <span data-ex="st-3">2</span> strokes. A score of <span data-ex="sc-3">6</span> is net 4, a net bogey: <span data-ex="pt-3">1</span> point.</li>
  </ul>
  <p class="gc-learn-result">Total: <span data-ex="total">6</span> points from 3 holes.</p>
  <p>Two points a hole for 18 holes is 36, which means you played to your handicap.</p>
  <p class="gc-learn-src" id="rules-source">Rules source: points from the <a href="${RULE21}" rel="noopener">R&amp;A Rules of Golf, Rule 21.1b</a>. Strokes, 9-hole rounds, plus handicaps and countback from ${GA_CITE}, §3H(iii), §10C and §11.</p>
  <p>Need your strokes? <a href="/daily-handicap">Work out your Daily Handicap first</a>. Playing for money too? <a href="/skins">Settle skins from the same round</a>.</p>`,
    faq: [
      ['How do you calculate Stableford points with a handicap?', 'Take your handicap strokes off your score on each hole to get a net score, then compare it with par: net double bogey or worse 0 points, net bogey 1, net par 2, net birdie 3, net eagle 4 (Rules of Golf, Rule 21.1b). Add up the points for every hole.'],
      ['How many shots do I get on each hole?', 'Use your Daily Handicap and the stroke index on the card. You get one shot on each hole whose stroke index is at or below your Daily Handicap. Over 18, you get one on every hole plus a second from stroke index 1. A plus handicap gives shots back from stroke index 18 (Golf Australia, §10C).'],
      ['How does the Stableford countback work?', 'Golf Australia\'s default, the Australian Countback Method, compares points on the last 9 holes (10–18), then the last 6 (13–18), then the last 3 (16–18), then hole by hole from the 18th. After a shotgun start it uses the same holes, whichever hole each player started on (GA WHS guide, January 2026, §11).'],
      ['What if the whole field started on the 10th tee?', 'Then the countback uses the last nine (holes 1–9), then the last six (holes 4–9), then the last three (holes 7–9), then hole by hole from the 9th. Tick “Whole field started on the 10th tee” in setup. It applies only when everyone teed off on the 10th, not to a shotgun start.'],
      ['How does Stableford work over 9 holes?', 'Use your 9-hole Daily Handicap, which is usually about half your 18-hole one. Your shots go to the 9 holes in order of their 18-hole stroke index, lowest first. A 9-hole countback compares the last 6 holes, then the last 3, then hole by hole from the 9th (Golf Australia, §3H and §11).'],
      ['What is a good Stableford score?', 'Two points a hole is net par, so 36 points over 18 holes means you played exactly to your handicap. Anything above 36 is better than your handicap, and below 36 is worse. Over 9 holes, 18 points is playing to handicap.'],
      ['What if players are still tied after the countback?', 'If the last 9, last 6 and last 3 holes and every single hole are all level, the calculator shows the players as tied after countback (joint). Golf Australia says the Terms of the Competition should say what happens then, such as a shared prize or a playoff (WHS reference guide, January 2026, §11).'],
      ['What if players are on different tees?', 'Each player scores points from their own tee\'s par and stroke index, and no extra strokes are added for the par difference (Golf Australia WHS guide, January 2026, §3(I)). Turn on “Players on different tees” in setup, enter the second tee\'s card, and pick each player\'s tee.'],
    ]
  },
  'handicap-calculator': {
    name: 'Golf Handicap Calculator',
    how: `
  <h2 id="how-h">How it's calculated</h2>
  <p>Each round becomes a Gross Differential: (adjusted gross score − Scratch Rating − PCC) × 113 ÷ Slope Rating, rounded to one decimal place. Your GA Handicap (the World Handicap System Handicap Index) is the average of the lowest 8 of your most recent 20 differentials, rounded to one decimal place. With fewer than 20 rounds, a smaller number counts:</p>
  <ul class="gc-learn-list">
    <li>3 rounds: the lowest 1, minus 2.0. 4 rounds: the lowest 1, minus 1.0. 5 rounds: the lowest 1.</li>
    <li>6 rounds: the average of the lowest 2, minus 1.0. 7 or 8 rounds: the lowest 2.</li>
    <li>9 to 11 rounds: the lowest 3. 12 to 14: the lowest 4. 15 or 16: the lowest 5. 17 or 18: the lowest 6. 19: the lowest 7. 20: the lowest 8.</li>
  </ul>
  <h3>Worked example</h3>
  <p>Round 1: a score of <span data-ex="r1-score">92</span> off a Scratch Rating of <span data-ex="r1-cr">71.3</span> and a Slope Rating of <span data-ex="r1-sl">129</span>, with no PCC. <span data-ex="r1-score-b">92</span> − 71.3 = <span data-ex="r1-step">20.7</span>, and 20.7 × 113 ÷ 129 = <span data-ex="r1-raw">18.133</span>, so the Gross Differential is <strong data-ex="r1-diff">18.1</strong>.</p>
  <p>After <span data-ex="n">8</span> rounds the differentials are <span data-ex="diffs">18.1, 20.8, 16.4, 18.1, 21.6, 17.3, 21.8, 23.6</span>. With 7 or 8 rounds the lowest <span data-ex="count">2</span> count: <span data-ex="low">16.4 and 17.3</span>. Their average is <span data-ex="avg">16.85</span>, which rounds up to:</p>
  <p class="gc-learn-result">GA Handicap estimate <span data-ex="hi">16.9</span></p>
  <p>Round 9 lowers it if its differential is <span data-ex="beat">16.8</span> or better, because the lowest 3 of 9 rounds count from then on. Tap <strong>Load example</strong> at the top to see every round.</p>
  <p class="gc-learn-src" id="rules-source">Rules source: ${GA_CITE}, §3(B) Gross Differential, §3(C) and §3(D) the GA Handicap calculation, §3(E) rounding and the 54.0 limit; <a href="https://www.randa.org/roh/the-rules-of-handicapping/rule-5" rel="noopener">R&amp;A Rules of Handicapping, Rule 5</a>. This is an estimate: Golf Australia calculates your official GA Handicap.</p>
  <p>Got your GA Handicap? <a href="/daily-handicap">Work out your Daily Handicap for today's tees</a>, then <a href="/stableford">count your Stableford points for the round</a>.</p>`,
    faq: [
      ['How is a golf handicap calculated?', 'Each round becomes a Gross Differential: (adjusted gross score − Scratch Rating − PCC) × 113 ÷ Slope Rating, to one decimal place. Your GA Handicap is the average of the lowest 8 of your most recent 20 differentials, rounded to one decimal place (Golf Australia WHS guide, January 2026, §3(B) and §3(C)).'],
      ['What if I have fewer than 20 rounds?', 'You need at least 3. With 3 rounds the lowest counts, minus 2.0; with 4, the lowest minus 1.0; with 5, the lowest; with 6, the lowest 2 averaged, minus 1.0. Then the number counted grows: 2 at 7, 3 at 9, 4 at 12, 5 at 15, 6 at 17, 7 at 19, 8 at 20 (§3(D)).'],
      ['Is a GA Handicap the same as a Handicap Index?', 'Yes. Golf Australia calls the World Handicap System Handicap Index your GA Handicap. Your Daily Handicap is different: it is the strokes you get on one course and set of tees, worked out from your GA Handicap. Use the Daily Handicap calculator for that.', {text:'Daily Handicap calculator', href:'/daily-handicap'}],
      ['What is an adjusted gross score?', 'Your gross score with each hole capped at net double bogey: par plus 2 plus any strokes you get on that hole. If you played Stableford, it is Par + Daily Handicap + (36 − your points), which is how Golf Australia works it out (§3(B)).'],
      ['Why might my official GA Handicap differ?', 'Golf Australia also applies the soft and hard caps on how far it can rise above your Low GA Handicap, exceptional score reductions, the daily PCC and 9-hole score combining. This calculator uses only the rounds you enter, so check the Golf Australia app for your official figure.'],
      ['What is the highest handicap?', '54.0. Any calculation above that is capped at 54.0 (Golf Australia WHS guide, §3(E); Rules of Handicapping, Rule 5.3). There is no lower limit: a result below zero is a plus handicap, written with a plus sign, such as +1.2.'],
      ['How do I lower my handicap?', 'A new round lowers it only if its differential beats one that counts by enough to bring the average down. The calculator shows your next round to beat: the highest differential, and roughly the score at your last course, that would lower your estimate.']
    ]
  },
  'daily-handicap': {
    name: 'Daily Handicap Calculator',
    how: `
  <h2 id="how-h">How it's calculated</h2>
  <p>Golf Australia's formula for an 18-hole Daily Handicap is ((GA Handicap × Slope Rating ÷ 113) + (Scratch Rating − Par)) × 0.93 × Consistency Factor, rounded to the nearest whole number. The Consistency Factor is 0.9986 for men and boys and 1.0483 for women and girls.</p>
  <h3>Worked example (illustrative numbers)</h3>
  <p>These tee ratings are made up to show the maths, so use the ratings on your own scorecard. GA Handicap <span data-ex="ga">14.2</span>, Slope Rating <span data-ex="slope">128</span>, Scratch Rating <span data-ex="scratch">71</span>, Par <span data-ex="par">72</span>.</p>
  <ol class="gc-learn-list">
    <li>14.2 × 128 ÷ 113 = <span data-ex="step-1">16.085</span></li>
    <li>Scratch Rating − Par = 71 − 72 = <span data-ex="step-2">−1</span>, so 16.085 − 1 = <span data-ex="step-3">15.085</span></li>
    <li>× 0.93 = <span data-ex="step-4">14.029</span></li>
    <li>Men and boys: × 0.9986 = <span data-ex="raw-men">14.009</span>, which rounds to <strong data-ex="dh-men">14</strong></li>
    <li>Women and girls: × 1.0483 = <span data-ex="raw-women">14.707</span>, which rounds to <strong data-ex="dh-women">15</strong></li>
  </ol>
  <p>The calculator keeps full precision until the final rounding. The steps above are shown to 3 decimal places.</p>
  <p class="gc-learn-src" id="rules-source">Source: ${GA_CITE}, §3H (Daily Handicap formulas and rounding).</p>
  <p>Got your strokes? <a href="/stableford">Count your Stableford points</a>, or <a href="/skins">settle skins with your group</a>. No GA Handicap yet? <a href="/handicap-calculator">Estimate your GA Handicap from your rounds</a>.</p>`,
    faq: [
      ['What is a Daily Handicap?', 'It is the number of strokes you receive for one round on a particular course and set of tees. It comes from your GA Handicap, the tees\' Slope Rating and Scratch Rating, and Par. Your GA Handicap stays the same, but your Daily Handicap changes with the course and tees.'],
      ['How is a Daily Handicap calculated in 2026?', '((GA Handicap × Slope Rating ÷ 113) + (Scratch Rating − Par)) × 0.93 × Consistency Factor, rounded to the nearest whole number (Golf Australia WHS reference guide, Edition January 2026, §3H). The 0.93 is called the Multiplier.'],
      ['What is the Consistency Factor?', 'It is part of the Daily Handicap formula: 0.9986 for men and boys and 1.0483 for women and girls. Golf Australia says it reflects that men and boys tend to score less consistently, and it improves equity in single-gender and gender-neutral events (§3H).'],
      ['What is the 0.93 Multiplier?', 'A balancing factor. Skilled golfers are generally more consistent than less-skilled golfers, so without the Multiplier higher handicaps would have a strong advantage in handicap competitions (Golf Australia, §3H).'],
      ['How do I work out a 9-hole Daily Handicap?', 'Halve your GA Handicap and use the 9-hole ratings: (((GA Handicap ÷ 2) × 9-hole Slope Rating ÷ 113) + (9-hole Scratch Rating − 9-hole Par)) × 0.93 × Consistency Factor. It is usually about half your 18-hole Daily Handicap (§3H). Choose 9 holes in the calculator.'],
      ['Where do I find the Slope Rating and Scratch Rating?', 'They are set for each set of tees, usually printed on the scorecard or on the club\'s Daily Handicap chart near the first tee. Use the ratings for the tees you are playing (and for 9 holes, the 9-hole ratings). If in doubt, ask the pro shop.'],
      ['How does rounding work?', 'The result is rounded to the nearest whole number, and .5 rounds up: 10.5 becomes 11. For plus handicaps .5 rounds towards scratch: +0.5 is scratch and +1.5 is +1, but +1.501 is +2 (Golf Australia, §3H).']
    ]
  }
};
