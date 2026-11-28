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
  },
  // v12: Scramble / Texas scramble / Ambrose team handicap. Sources checked 28 Nov 2026 (see the page's engine comment).
  'match-play-handicap-calculator': {
    name: 'Match Play Handicap Calculator',
    how: `
  <h2 id="how-h">How it's calculated</h2>
  <p>Start from each player's Course Handicap for the tees being played, unrounded if you work it out from a Handicap Index (Index × Slope ÷ 113 + (Course Rating − Par)). Then apply the allowance for the format and round once, to the nearest whole number (.5 up; a plus handicap moves toward zero):</p>
  <ul class="gc-learn-list">
    <li>Singles match play, 100%: the higher player receives the difference in Course Handicap. The lower player plays off 0.</li>
    <li>Four-ball (4BBB, best-ball) match play, 90%: each player receives 90% of the difference between their Course Handicap and the lowest in the group. Since 2024 the 90% applies to the difference, not to each handicap first.</li>
    <li>Foursomes match play, 50%: the side with the higher combined Course Handicap receives half the difference between the two combined totals.</li>
    <li>Four-ball stroke play or Stableford, 85%: each player gets 85% of their own Course Handicap. Nobody plays off the low player.</li>
  </ul>
  <p>Strokes fall on the holes with the lowest stroke index: 8 strokes go on stroke index 1 to 8. A player receiving 19 gets one on every hole and a second on stroke index 1. In stroke play a plus player gives strokes back from stroke index 18.</p>
  <h3>Worked example</h3>
  <p>This is the four-ball example in Appendix C (C/2). Course Handicaps are A <span data-ex="ch-0">10</span>, B <span data-ex="ch-1">18</span>, C <span data-ex="ch-2">27</span> and D <span data-ex="ch-3">39</span>. A has the lowest, so A plays off 0 and the others take 90% of the difference from 10:</p>
  <ul class="gc-learn-list">
    <li>B: 90% × 8 = 7.2, so <span data-ex="fb-1">7</span> strokes, on stroke index 1 to 7</li>
    <li>C: 90% × 17 = 15.3, so <span data-ex="fb-2">15</span> strokes</li>
    <li>D: 90% × 29 = 26.1, so <span data-ex="fb-3">26</span> strokes: one on every hole and a second on stroke index 1 to 8</li>
  </ul>
  <p class="gc-learn-result">Singles A v B: B receives <span data-ex="singles">8</span>. Foursomes A+B v C+D: 50% × (66 − 28) = <span data-ex="foursomes">19</span> for C and D.</p>
  <p>Under the pre-2024 method (90% of each handicap, then the difference), players of 11 and 16 got 4 strokes; now it is 90% × 5 = 4.5, so <span data-ex="old-new">5</span>. Tap <strong>Load example</strong> at the top to see the four-ball version with its stroke table.</p>
  <p class="gc-learn-src" id="rules-source">Rules sources, checked 28 Nov 2026: USGA, <a href="https://www.usga.org/handicapping/roh/Content/rules/Appendix%20C%20Handicap%20Allowances.htm" rel="noopener"><cite>Rules of Handicapping, Appendix C: Handicap Allowances</cite></a>, with Clarifications C/2 and C/3 (effective 1 January 2024); The R&amp;A, <a href="https://www.randa.org/roh/appendices/appendix-c" rel="noopener"><cite>Appendix C</cite></a> (the same table and examples); USGA, <a href="https://www.usga.org/content/usga/home-page/handicapping/roh/Content/rules/Committee%20Content/USGA/LG_R7g11.htm" rel="noopener"><cite>Four-Ball Match Play (90%)</cite></a> and <a href="https://www.usga.org/handicapping/roh/Content/rules/Committee%20Content/USGA/LG_R7h2.htm" rel="noopener"><cite>Foursomes Match Play</cite></a>; USGA, <a href="https://www.usga.org/content/dam/usga/pdf/Handicap/2024%20WHS%20Reference%20for%20Clubs.pdf" rel="noopener"><cite>2024 WHS Reference for Clubs</cite></a>; ${GA_CITE}, §10(A)–(C).</p>
  <p>Need the handicaps first? <a href="/daily-handicap">Work out a Daily Handicap</a>, or <a href="/handicap-calculator">estimate a GA Handicap from recent rounds</a>.</p>`,
    faq: [
      ['How many strokes do you get in match play?', 'In singles match play the higher handicap receives the full difference in Course Handicap (100% allowance) and the lower player plays off 0. With Course Handicaps of 10 and 18, the 18 receives 8 strokes, on stroke index 1 to 8 (Rules of Handicapping, Appendix C, checked 28 Nov 2026).'],
      ['How do four-ball (4BBB) match play handicaps work since 2024?', 'Work out each player\'s Course Handicap, take the difference from the lowest in the group, then apply 90% and round. Before 2024 the 90% was applied to each handicap first. With 11 and 16 the difference is 5, 90% is 4.5, so 5 strokes; the old way gave 4. Source: USGA 2024 WHS Reference for Clubs and Appendix C, checked 28 Nov 2026.'],
      ['How are foursomes match play strokes worked out?', 'Add each side\'s Course Handicaps. The side with the higher total receives 50% of the difference, rounded once; the other side plays off 0. Course Handicaps 10 + 18 against 27 + 39 give 28 against 66, so the second side receives 19 strokes (Appendix C, C/2 Example 4).'],
      ['What allowance is used in four-ball stroke play or Stableford?', 'Each player gets 85% of their own Course Handicap, rounded. It is not worked out from the low player, because it is a stroke-play format. Course Handicaps of +4, 16, 7 and 26 become +3, 14, 6 and 22 (Appendix C, C/3).'],
      ['Should Australians enter their Daily Handicap?', 'No. A Golf Australia Daily Handicap already includes the 0.93 stroke-play multiplier and the consistency factor. Enter your GA Handicap with the Slope, Scratch Rating and Par (choose Index), or a Course Handicap before that multiplier. Golf Australia\'s guide (January 2026, §10) recommends the same match play allowances: 100% individual, 90% four-ball and 50% of combined for foursomes.'],
      ['What happens to a plus handicap in match play?', 'In match play the lowest handicap plays off 0 and everyone else receives the difference, so a plus player simply plays off 0 and the others get the extra strokes. In stroke play a plus player gives strokes back to the course, starting at stroke index 18. Allowances move a plus handicap toward zero, including when rounding.'],
      ['Do you round the Course Handicap before applying the allowance?', 'No. The allowance is applied to the unrounded Course Handicap and the result is rounded once (Rule 6.2a/1). With the USGA\'s worked-example tees (Slope 135, Course Rating 72.3, Par 72), Indexes of 8.4 and 11.4 give Course Handicaps of 10.335 and 13.919. In four-ball, 90% of the 3.584 difference is 3.23, so 3 strokes; rounding the Course Handicaps to 10 and 14 first would give 4.'],
      ['Where do the strokes fall if I receive more than 18?', 'One on every hole, then a second on the holes with the lowest stroke index. A player receiving 19 gets two strokes on stroke index 1; 26 strokes means two on stroke index 1 to 8. For 9 holes, strokes go on the 9 holes in stroke-index order.']
    ]
  },
  'nassau-calculator': {
    name: 'Nassau Golf Calculator',
    how: `
  <h2 id="how-h">How it's calculated</h2>
  <p>A Nassau is three bets at the same stake: the front nine, the back nine and the overall 18. Each is a match (holes won, halves allowed) or, if you choose aggregate, the lower total score for those holes. In 2 v 2 better ball, each side's score on a hole is the better of the two partners' scores, gross or net.</p>
  <ul class="gc-learn-list">
    <li>Automatic press (on by default): when a side goes 2 down in a bet, a new bet at the same stake starts on the next hole and runs to the end of that nine. Each bet starts at most one automatic press, and a press can itself be pressed.</li>
    <li>No press starts when the trigger is on the last hole of a nine. The overall 18 is not auto-pressed unless you switch it on under More options.</li>
    <li>The trailing side can also start a press by hand on any hole left in the nine.</li>
    <li>Net: strokes come off the low player, 90% of the difference for 2 v 2 (the four-ball match play allowance) and 100% for 1 v 1, then go on the holes with the lowest stroke index.</li>
  </ul>
  <p>Every bet won is worth the stake to the winning side. In 2 v 2 the side's result is split equally between partners, then the payments are settled in the fewest transfers, the same way as our Skins calculator.</p>
  <h3>Worked example</h3>
  <p>A $5 Nassau, 1 v 1, gross, with automatic presses. Alex wins holes 1 to 4, Blake 5 to 7, Alex 8 and 9. Alex is 2 up after hole 2, so a press starts on hole 3; Alex is 2 up on that press after hole 4, so a second press starts on hole 5; Blake goes 2 up on that one after hole 6, so a third starts on hole 7.</p>
  <ul class="gc-learn-list">
    <li>Front: Alex 3 up, +$5. Press 3–9: Alex 1 up, +$5. Press 5–9: Blake 1 up, −$5. Press 7–9: Alex 1 up, +$5.</li>
    <li>Back: Blake wins 10 and 11, the rest are halved. Blake 2 up, −$5 for Alex; the press from 12 is halved.</li>
    <li>Overall: Alex 1 up, +$5.</li>
  </ul>
  <p class="gc-learn-result">Alex <span data-ex="e2-a">+$10.00</span>, Blake <span data-ex="e2-b">−$10.00</span>: <span data-ex="e2-pay">Blake pays Alex $10.00</span>.</p>
  <p>Tap <strong>Load example</strong> at the top for a simple $5 Nassau with no presses: Alex wins the front and the overall, Blake the back, so Blake pays Alex $5.</p>
  <p class="gc-learn-src" id="rules-source">A Nassau and its presses are house conventions, not part of the Rules of Golf; the 2-down automatic press is the usual convention (as at 28 Nov 2026). Net allowances, checked 28 Nov 2026: USGA, <a href="https://www.usga.org/handicapping/roh/Content/rules/Appendix%20C%20Handicap%20Allowances.htm" rel="noopener"><cite>Rules of Handicapping, Appendix C</cite></a> (four-ball match play 90%, individual 100%).</p>`,
    faq: [
      ['What is a Nassau in golf?', 'A Nassau is three bets in one round at the same stake: the front nine, the back nine and the overall 18. A $5 Nassau puts up to $15 at stake before any presses. It is a betting game with house rules, not part of the Rules of Golf.'],
      ['How does a 2-down automatic press work?', 'When a side goes 2 down in a bet, a new bet at the same stake starts on the next hole and runs to the end of that nine. Each bet starts at most one automatic press, and none starts if the trigger is on the 9th or 18th. This is the usual convention (28 Nov 2026), so agree it on the first tee.'],
      ['Can you press a press?', 'Yes. A press is a bet in its own right, so if a side goes 2 down on a press, that press starts its own press on the next hole. Presses can chain like this to the end of the nine.'],
      ['Is the overall 18 pressed too?', 'Not by default: automatic presses run on the front and back nines only. Switch on “Auto-press the overall 18” under More options if your group presses the overall as well; those presses run to the 18th.'],
      ['What is the difference between 1 v 1 and 2 v 2 better ball?', 'In 1 v 1 each player plays their own ball against the other. In 2 v 2 better ball, each side counts the better score of its two partners on every hole. Winnings and losses are split equally between partners and then settled in the fewest payments.'],
      ['Match play or aggregate?', 'Match play counts holes won, so a blow-up hole only loses that hole. Aggregate counts total strokes for the nine or the 18, so every shot matters. With aggregate, “2 down” for an automatic press means 2 strokes behind.'],
      ['How are handicaps used in a net Nassau?', 'Strokes come off the low player. For 2 v 2 better ball the calculator uses the four-ball match play allowance, 90% of the difference in Course Handicap from the lowest player; for 1 v 1, 100% of the difference (Rules of Handicapping, Appendix C, checked 28 Nov 2026). You can change it under More options.'],
      ['Is a Nassau in the Rules of Golf?', 'No. The Rules of Golf and the Rules of Handicapping cover match play and handicap allowances, but the Nassau, its stakes and its presses are a side game played to whatever your group agrees. This calculator follows the common conventions and shows every bet so you can check it.']
    ]
  },
  'scramble-handicap-calculator': {
    name: 'Scramble Handicap Calculator',
    how: `
  <h2 id="how-h">How it's calculated</h2>
  <p>Each player needs a Course Handicap for the tees being played (in Australia, the Daily Handicap). The team handicap takes a share of each and is rounded once:</p>
  <ul class="gc-learn-list">
    <li>USGA scramble (Rules of Handicapping, Appendix C): 2 players, 35% of the lower Course Handicap plus 15% of the higher; 3 players, 30%, 20% and 10%; 4 players, 25%, 20%, 15% and 10%, from the lowest Course Handicap to the highest.</li>
    <li>Ambrose, the traditional Australian club method: add the handicaps and divide by 4 for 2 players, 6 for 3 and 8 for 4.</li>
    <li>Custom: the percentages your event's terms set, lowest handicap first.</li>
  </ul>
  <p>From a Handicap Index, Course Handicap = Index × Slope ÷ 113 + (Course Rating − Par), kept unrounded. The team total is rounded to the nearest whole number with .5 rounding up (Rule 6.2a), or to one decimal place if your event says so.</p>
  <h3>Worked example</h3>
  <p>This is the USGA's own 4-player example. The Handicap Indexes are <span data-ex="hi-0">8.4</span>, <span data-ex="hi-1">12.6</span>, <span data-ex="hi-2">23.4</span> and <span data-ex="hi-3">31.2</span>, on tees with a Course Rating of <span data-ex="cr">72.3</span>, a Slope of <span data-ex="sl">135</span> and par <span data-ex="par">72</span>. The lowest Course Handicap is 8.4 × 135 ÷ 113 + 0.3 = <span data-ex="ch-0">10.34</span>; the others are <span data-ex="ch-1">15.35</span>, <span data-ex="ch-2">28.26</span> and <span data-ex="ch-3">37.57</span>.</p>
  <ul class="gc-learn-list">
    <li>25% × 10.34 = <span data-ex="share-0">2.58</span></li>
    <li>20% × 15.35 = <span data-ex="share-1">3.07</span></li>
    <li>15% × 28.26 = <span data-ex="share-2">4.24</span></li>
    <li>10% × 37.57 = <span data-ex="share-3">3.76</span></li>
  </ul>
  <p class="gc-learn-result">Team handicap: <span data-ex="raw">13.65</span> → <span data-ex="team">14</span></p>
  <p>Played as Ambrose off whole-number handicaps of 10, 15, 28 and 38, the same team gets (10 + 15 + 28 + 38) ÷ 8 = <span data-ex="amb-raw">11.38</span>, so <span data-ex="amb-team">11</span>. Tap <strong>Load example</strong> at the top to see the USGA version worked.</p>
  <p class="gc-learn-src" id="rules-source">Rules sources, checked 28 Nov 2026: USGA, <a href="https://www.usga.org/handicapping/roh/Content/rules/Committee%20Content/USGA/LG_R7h5.htm" rel="noopener"><cite>Rules of Handicapping, Appendix C: Scramble</cite></a> (effective 1 January 2024), with Rule 6.1 (Course Handicap) and Rule 6.2a (rounding); ${GA_CITE}, §10(A) handicap allowances. Ambrose ÷ 8 is the traditional Australian club method, as in <a href="https://www.leuragolfclub.com.au/competition-rules-and-etiquette/" rel="noopener">Leura Golf Club's competition rules</a>.</p>
  <p>Need the handicaps first? <a href="/daily-handicap">Work out each player's Daily Handicap</a>, or <a href="/handicap-calculator">estimate a GA Handicap from recent rounds</a>.</p>`,
    faq: [
      ['What are the USGA scramble handicap allowances?', 'The Rules of Handicapping, Appendix C, recommends 35% of the lower Course Handicap plus 15% of the higher for 2 players; 30%, 20% and 10% for 3; and 25%, 20%, 15% and 10% for 4, from the lowest Course Handicap to the highest. Add the shares, then round the total once (USGA, checked 28 Nov 2026).'],
      ['How do you work out a 4-person scramble handicap?', 'Sort the four Course Handicaps from lowest to highest. Take 25% of the lowest, 20% of the next, 15% of the third and 10% of the highest, add them and round to the nearest whole number. The USGA\'s example team of 10.34, 15.35, 28.26 and 37.57 gets 13.65, so 14.'],
      ['What is the difference between Ambrose and a Texas scramble?', 'They work the same way: everyone hits, the team picks the best shot and all play from there. Ambrose is the Australian name, often with a minimum number of drives from each player. Its traditional handicap is the combined Daily Handicaps ÷ 4 for pairs, ÷ 6 for threes and ÷ 8 for fours.'],
      ['Does Golf Australia use ÷ 8 for Ambrose?', 'Golf Australia\'s WHS guide (January 2026, §10(A)) lists the R&A and USGA allowances for “Ambrose or Scramble”: 25/20/15/10% for 4 golfers and 35/15% for 2, with team handicaps usually to one decimal place. Many clubs still use ÷ 8. Use the method your event sheet names.'],
      ['Should I use Course Handicap or Handicap Index?', 'Course Handicap. The allowances apply to each player\'s Course Handicap for the tees played; in Australia, use the Daily Handicap. If you only know Handicap Indexes, choose Handicap Index and enter the Slope, Course Rating and Par.', {text:'Daily Handicap', href:'/daily-handicap'}],
      ['Do you round each player or the team total?', 'The team total, once. The USGA applies the percentages to unrounded Course Handicaps, adds them and rounds the total to the nearest whole number, with .5 rounding up (Rule 6.2a). Rounding each player first can put you a stroke out. A plus team handicap rounds toward zero.'],
      ['Can our event use different percentages?', 'Yes. The Appendix C allowances are recommendations for a normal field, and a committee can set its own in the terms of the competition. Choose Custom % and enter them, lowest handicap first.']
    ]
  }
};
