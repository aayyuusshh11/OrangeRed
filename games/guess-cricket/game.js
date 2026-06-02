/**
 * HITWICKET — game.js
 * =============================================================
 * Hand cricket against an AI bot.
 * Easy mode: pure random.
 * Hard mode: frequency analysis + pattern detection (uses ONLY past balls).
 *
 * FAIRNESS GUARANTEE:
 *   botChoice is generated and locked BEFORE player choice is read.
 *   The comparison only happens after both values exist.
 * =============================================================
 */

'use strict';

/* ============================================================
   GAME CONFIGURATION
   ============================================================ */
const FORMATS = {
  'super-over': { name: 'Super Over', overs: 1, wickets: 1,  balls: 6  },
  '5-over':     { name: '5-Over',     overs: 5, wickets: 3,  balls: 30 },
  't10':        { name: 'T-10',       overs: 10, wickets: 5, balls: 60 },
};

/* ============================================================
   STATE
   ============================================================ */
let state = null;        // current game state
let selectedFormat = 'super-over';
let selectedDiff   = 'easy';

/* ============================================================
   PERSONALITY — commentary, status messages, easter eggs
   ============================================================ */
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const COMMENTARY = [
  'The bot is making things up as it goes.',
  'Textbook cricket. Nobody owns that textbook.',
  'That probably wasn\'t in the game plan.',
  'Both sides appear equally confused.',
  'Statistics were ignored on that ball.',
  'The pressure is imaginary but still real.',
  'Peak hand-cricket performance.',
  'Cricket experts are taking notes. Allegedly.',
  'Someone somewhere would be proud of that.',
  'The algorithm had no comment.',
  'Interesting technique.',
  'The crowd of zero people is on the edge.',
  'That felt intentional. Probably wasn\'t.',
];

const EASTER_EGGS = [
  'Bot: I definitely didn\'t cheat.',
  'Bot: That was lucky. For one of us.',
  'Bot: Please stop picking 6.',
  'Bot: I have no idea what I\'m doing.',
  'Bot: This algorithm seemed smarter yesterday.',
  'Bot: I was trained on vibes, not data.',
  'Bot: My creator should have studied instead.',
];

const STATUS_BATTING_SCORED = [
  (r) => `+${r}. Pure skill obviously.`,
  (r) => `+${r}. The bot didn't see that coming.`,
  (r) => `+${r}. Not bad for guessing.`,
  (r) => `+${r}. Keep this energy.`,
  (r) => `+${r} run${r !== 1 ? 's' : ''}. Calculated? Sure.`,
];

const STATUS_BATTING_FOUR = [
  'FOUR. The crowd of zero goes wild.',
  'FOUR. Textbook shot. Imaginary textbook.',
  'FOUR. That was clean.',
  'FOUR. The bot is questioning its choices.',
];

const STATUS_BATTING_SIX = [
  'SIX. Maximum. The bot needs a moment.',
  'SIX. Out of the imaginary stadium.',
  'SIX. That was disrespectful.',
  'SIX. The algorithm felt that personally.',
];

const STATUS_BATTING_OUT = [
  'OUT. That\'s unfortunate.',
  'OUT. The bot got lucky and that\'s my official statement.',
  'OUT. That felt personal.',
  'OUT. Questionable decision-making detected.',
  'OUT. The bot read your mind. Somehow.',
];

const STATUS_BATTING_DOT = [
  'Dot ball. Nothing happened. Like most meetings.',
  'Dot ball. Strategic patience or panic?',
  'Dot ball. Zero runs. Zero explanation.',
];

const STATUS_BOWLING_SCORED = [
  (r) => `Bot scores ${r}. Bowl them out.`,
  (r) => `Bot got ${r}. That was avoidable. Maybe.`,
  (r) => `Bot picks up ${r}. Interesting strategy from you.`,
];

const STATUS_BOWLING_OUT = [
  'Got \'em! The bot didn\'t expect that.',
  'OUT. The bot appears confused.',
  'Wicket! Sometimes random works.',
  'OUT. The algorithm has left the chat.',
];

const STATUS_BOWLING_BOUNDARY = [
  (r) => `Bot hit a ${r}. That\'s on you.`,
  (r) => `Bot smashes ${r}. The pressure is mounting.`,
];

// Show commentary ~25% of the time, easter eggs ~2%
function maybeShowCommentary() {
  const statusEl = document.getElementById('status-text');
  if (Math.random() < 0.02) {
    setTimeout(() => {
      statusEl.textContent = pick(EASTER_EGGS);
    }, 1800);
  } else if (Math.random() < 0.25) {
    setTimeout(() => {
      statusEl.textContent = pick(COMMENTARY);
    }, 2200);
  }
}

/* ============================================================
   BOT ENGINE
   ============================================================ */
const Bot = {
  /**
   * All choices are generated here, BEFORE playerChoice is known.
   * @param {boolean} isBatting - true when bot bats
   * @param {Object}  memory    - bot's memory (playerHistory, etc.)
   * @param {string}  diff      - 'easy' | 'hard'
   * @param {Object}  chase     - { active, runsNeeded, ballsLeft }
   * @returns {number} 0-6
   */
  generate(isBatting, memory, diff, chase) {
    // ── EASY: pure random, equal prob ──────────────────────────
    if (diff === 'easy') {
      return Math.floor(Math.random() * 7); // 0-6
    }

    // ── HARD ───────────────────────────────────────────────────
    if (isBatting) {
      return this._hardBatting();
    } else {
      return this._hardBowling(memory, chase);
    }
  },

  /**
   * Hard batting: weighted distribution for realistic scoring.
   * 0→15%, 1→15%, 2→20%, 3→10%, 4→20%, 5→5%, 6→15%
   */
  _hardBatting() {
    const table = [
      { n: 0, w: 15 },
      { n: 1, w: 15 },
      { n: 2, w: 20 },
      { n: 3, w: 10 },
      { n: 4, w: 20 },
      { n: 5, w: 5  },
      { n: 6, w: 15 },
    ];
    const total = table.reduce((s, e) => s + e.w, 0);
    let r = Math.random() * total;
    for (const entry of table) {
      r -= entry.w;
      if (r <= 0) return entry.n;
    }
    return 6;
  },

  /**
   * Hard bowling:
   *   - Base: 70% random, 30% predict most-frequent player number.
   *   - Triple-repeat: prediction chance → 50%.
   *   - Chase pressure: random 60%, predict 40%.
   */
  _hardBowling(memory, chase) {
    const hist = memory.playerHistory; // last 10 choices

    // Frequency analysis
    const freq = [0,0,0,0,0,0,0];
    for (const v of hist) freq[v]++;
    let mostFreq = 0;
    for (let i = 1; i < 7; i++) {
      if (freq[i] > freq[mostFreq]) mostFreq = i;
    }

    // Detect triple repeat in last 3 balls
    let predictChance = 0.30;
    const last3 = hist.slice(-3);
    if (last3.length === 3 && last3[0] === last3[1] && last3[1] === last3[2]) {
      predictChance = 0.50;
    }

    // Chase pressure override
    if (
      chase.active &&
      (
        (chase.ballsLeft <= 2 && chase.runsNeeded >= 6) ||
        (chase.ballsLeft <= 3 && chase.runsNeeded >= 10)
      )
    ) {
      predictChance = 0.40; // random 60%, predict 40%
    }

    // BOT commits to choice here — player has not clicked yet
    if (Math.random() < predictChance && hist.length > 0) {
      return mostFreq;
    }
    return Math.floor(Math.random() * 7);
  },
};

/* ============================================================
   GAME STATE HELPERS
   ============================================================ */
function createInningsState(batting) {
  return {
    batting,                 // 'player' | 'bot'
    runs: 0,
    wickets: 0,
    ballsFaced: 0,
    history: [],             // { playerNum, botNum, result } per ball
    currentOverBalls: [],    // balls in current over
    playerHistory: [],       // just player numbers (last 10, for bot memory)
  };
}

function initGame() {
  const fmt = FORMATS[selectedFormat];
  return {
    format: selectedFormat,
    fmt,
    diff: selectedDiff,
    phase: 'innings1',      // 'innings1' | 'innings2' | 'done'
    innings1: null,
    innings2: null,
    currentInnings: null,
    playerBatsFirst: null,  // set after toss
    maxWickets: fmt.wickets,
    maxBalls: fmt.balls,
    waiting: false,         // true while showing ball result
  };
}

/* ============================================================
   UI HELPERS
   ============================================================ */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  el.classList.add('active');
  // Re-trigger animation
  el.style.animation = 'none';
  el.offsetHeight; // reflow
  el.style.animation = '';
}

function setNumpadEnabled(enabled) {
  document.querySelectorAll('.num-btn').forEach(b => {
    b.classList.toggle('disabled', !enabled);
  });
}

function updateScoreboard() {
  const g = state;
  const ci = g.currentInnings;
  if (!ci) return;

  const isPlayer1stInnings = (g.phase === 'innings1');
  const playerBats = ci.batting === 'player';

  // Batting side labels & scores
  const battingLabel  = document.getElementById('batting-label');
  const battingScore  = document.getElementById('batting-score');
  const battingDetail = document.getElementById('batting-detail');
  const bowlingLabel  = document.getElementById('bowling-label');
  const bowlingScore  = document.getElementById('bowling-score');
  const bowlingDetail = document.getElementById('bowling-detail');

  battingLabel.textContent  = playerBats ? 'You' : 'Bot';
  battingScore.textContent  = ci.runs;
  const wktDisplay = `${ci.wickets} wkt${ci.wickets !== 1 ? 's' : ''}`;
  const ballsInOver = ci.ballsFaced % 6;
  const ovsComplete = Math.floor(ci.ballsFaced / 6);
  battingDetail.textContent = `${wktDisplay} · ${ovsComplete}.${ballsInOver} ov`;

  bowlingLabel.textContent = playerBats ? 'Bot' : 'You';

  if (g.phase === 'innings1') {
    bowlingScore.textContent  = '—';
    bowlingDetail.textContent = '';
  } else {
    // Show innings1 score as target context
    const i1 = g.innings1;
    bowlingScore.textContent  = i1.runs;
    bowlingDetail.textContent = `${i1.wickets} wkt${i1.wickets !== 1 ? 's' : ''}`;
  }

  // Innings badge
  document.getElementById('innings-badge').textContent =
    g.phase === 'innings1' ? '1st Innings' : '2nd Innings';

  // Over info
  const overNum = ovsComplete + 1;
  document.getElementById('over-info').textContent = `Over ${overNum}`;

  // Chase bar
  if (g.phase === 'innings2') {
    const target = g.innings1.runs + 1;
    const runsNeeded = target - ci.runs;
    const ballsLeft  = g.maxBalls - ci.ballsFaced;
    document.getElementById('chase-bar-wrap').classList.remove('hidden');
    const pct = Math.min(100, (ci.runs / g.innings1.runs) * 100) || 0;
    document.getElementById('chase-bar-fill').style.width = pct + '%';
    document.getElementById('chase-bar-text').textContent =
      runsNeeded > 0
        ? `Need ${runsNeeded} run${runsNeeded !== 1 ? 's' : ''} from ${ballsLeft} ball${ballsLeft !== 1 ? 's' : ''}`
        : 'Target reached!';
  }

  // Wickets row
  updateWicketsRow();
}

function updateWicketsRow() {
  const g = state;
  const ci = g.currentInnings;
  const row = document.getElementById('wickets-row');
  row.innerHTML = '';
  const max = g.maxWickets;
  for (let i = 0; i < max; i++) {
    const icon = document.createElement('span');
    icon.className = 'wicket-icon' + (i < ci.wickets ? ' lost' : '');
    icon.textContent = '🏏';
    row.appendChild(icon);
  }
}

function renderBall(result, num) {
  // result: 'run-N' | 'wicket'
  const pip = document.createElement('div');
  pip.className = `ball-pip ${result}`;
  pip.textContent = result === 'wicket-ball' ? 'W' : num;
  document.getElementById('balls-row').appendChild(pip);
}

function clearOverBalls() {
  document.getElementById('balls-row').innerHTML = '';
}

/* ============================================================
   BOT MEMORY (per innings)
   ============================================================ */
function getChaseInfo() {
  const g = state;
  if (g.phase !== 'innings2') return { active: false };
  const ci = g.currentInnings;
  const target    = g.innings1.runs + 1;
  const runsNeeded = target - ci.runs;
  const ballsLeft  = g.maxBalls - ci.ballsFaced;
  return { active: true, runsNeeded, ballsLeft };
}

/* ============================================================
   CORE BALL RESOLUTION
   ============================================================ */
function playBall(playerChoice) {
  const g = state;
  const ci = g.currentInnings;

  // ── 1. BOT GENERATES CHOICE FIRST (before playerChoice is used) ──
  const isBotBatting = ci.batting === 'bot';
  const botChoice = Bot.generate(
    isBotBatting,
    { playerHistory: ci.playerHistory.slice(-10) },
    g.diff,
    getChaseInfo()
  );
  // botChoice is now locked. playerChoice was already set by the click.

  // ── 2. RECORD PLAYER'S HISTORY (for hard mode future reference) ──
  ci.playerHistory.push(playerChoice);
  if (ci.playerHistory.length > 10) ci.playerHistory.shift();

  // ── 3. DETERMINE RESULT ──
  let isOut = (playerChoice === botChoice);
  let runsScored = 0;

  if (!isOut) {
    // Runs scored: batting team's choice counts
    runsScored = isBotBatting ? botChoice : playerChoice;
    ci.runs += runsScored;
  } else {
    ci.wickets++;
  }

  ci.ballsFaced++;
  ci.currentOverBalls.push({ playerChoice, botChoice, isOut, runsScored });

  // Clear over after 6 balls
  if (ci.ballsFaced % 6 === 0) {
    ci.currentOverBalls = [];
    clearOverBalls();
  }

  // ── 4. UPDATE HISTORY RECORD ──
  ci.history.push({ playerChoice, botChoice, isOut, runsScored });

  // ── 5. SHOW OUTCOME ──
  showBallOutcome(playerChoice, botChoice, isOut, runsScored, isBotBatting);
  updateScoreboard();
  renderBall(
    isOut ? 'wicket-ball' : `run-${runsScored}`,
    isOut ? 'W' : runsScored
  );

  // ── 6. CHECK INNINGS END ──
  const inningsOver = checkInningsEnd(ci, g);
  return inningsOver;
}

function checkInningsEnd(ci, g) {
  const allOut   = ci.wickets >= g.maxWickets;
  const allBalls = ci.ballsFaced >= g.maxBalls;

  // In innings2: check if batting team has passed target
  if (g.phase === 'innings2') {
    const target = g.innings1.runs + 1;
    if (ci.runs >= target) return true; // won by chasing
  }

  return allOut || allBalls;
}

function showBallOutcome(playerNum, botNum, isOut, runsScored, isBotBatting) {
  const outEl    = document.getElementById('out-player');
  const botEl    = document.getElementById('out-bot');
  const resultEl = document.getElementById('outcome-result');

  outEl.textContent = playerNum;
  botEl.textContent = botNum;

  // Remove all state classes
  [outEl, botEl, resultEl].forEach(el => {
    el.classList.remove('scored', 'wicket', 'boundary');
  });

  if (isOut) {
    outEl.classList.add('wicket');
    botEl.classList.add('wicket');
    resultEl.classList.add('wicket');
    resultEl.textContent = 'OUT!';
    // Shake the scoreboard
    document.querySelector('.scoreboard').classList.add('shake');
    setTimeout(() => document.querySelector('.scoreboard').classList.remove('shake'), 400);
  } else {
    outEl.classList.add('scored');
    botEl.classList.add('scored');
    if (runsScored === 4 || runsScored === 6) {
      resultEl.classList.add('boundary');
      resultEl.textContent = runsScored === 6 ? 'SIX!' : 'FOUR!';
    } else if (runsScored === 0) {
      resultEl.textContent = '· dot';
      outEl.classList.remove('scored');
      outEl.classList.add('wicket');
      botEl.classList.remove('scored');
    } else {
      resultEl.classList.add('scored');
      resultEl.textContent = `+${runsScored}`;
    }
  }

  // Status — with personality
  const statusEl = document.getElementById('status-text');
  if (isBotBatting) {
    if (isOut) {
      statusEl.textContent = pick(STATUS_BOWLING_OUT);
    } else if (runsScored === 4 || runsScored === 6) {
      statusEl.textContent = pick(STATUS_BOWLING_BOUNDARY)(runsScored);
    } else {
      statusEl.textContent = pick(STATUS_BOWLING_SCORED)(runsScored);
    }
  } else {
    if (isOut) {
      statusEl.textContent = pick(STATUS_BATTING_OUT);
    } else if (runsScored === 6) {
      statusEl.textContent = pick(STATUS_BATTING_SIX);
    } else if (runsScored === 4) {
      statusEl.textContent = pick(STATUS_BATTING_FOUR);
    } else if (runsScored === 0) {
      statusEl.textContent = pick(STATUS_BATTING_DOT);
    } else {
      statusEl.textContent = pick(STATUS_BATTING_SCORED)(runsScored);
    }
  }

  // Maybe show commentary or easter egg after a delay
  maybeShowCommentary();
}

/* ============================================================
   INNINGS TRANSITION
   ============================================================ */
function startInnings2() {
  const g = state;
  g.phase = 'innings2';

  // Swap roles
  const batting2 = g.innings1.batting === 'player' ? 'bot' : 'player';
  g.innings2 = createInningsState(batting2);
  g.currentInnings = g.innings2;

  // Update UI
  document.getElementById('innings-badge').textContent = '2nd Innings';
  clearOverBalls();
  updateScoreboard();

  const i1 = g.innings1;
  const target = i1.runs + 1;
  const batter  = batting2 === 'player' ? 'You' : 'Bot';
  const outEl = document.getElementById('out-player');
  const botEl = document.getElementById('out-bot');
  const resEl = document.getElementById('outcome-result');
  [outEl, botEl, resEl].forEach(el => el.classList.remove('scored', 'wicket', 'boundary'));
  outEl.textContent = '?';
  botEl.textContent = '?';
  resEl.textContent  = '';

  document.getElementById('status-text').textContent =
    `${batter} need${batting2 === 'player' ? '' : 's'} ${target} to win. No pressure.`;

  if (batting2 === 'player') {
    setNumpadEnabled(true);
  } else {
    playBotInnings();
  }
}

/* ============================================================
   BOT AUTO-PLAY (when bot bats in innings)
   ============================================================ */
async function playBotInnings() {
  setNumpadEnabled(false);
  const g = state;
  const ci = g.currentInnings;

  const playOneBall = () => {
    if (g.phase === 'done') return;

    // Bot bats: player must "bowl" by clicking a number.
    // So actually player always clicks — bot bats or bowls based on role.
    // Reveal instruction
    document.getElementById('status-text').textContent =
      'Your turn to bowl. Pick wisely. Or don\'t.';
    setNumpadEnabled(true);
  };

  playOneBall();
}

/* ============================================================
   END GAME
   ============================================================ */
function endGame() {
  const g = state;
  g.phase = 'done';
  setNumpadEnabled(false);

  const i1 = g.innings1;
  const i2 = g.innings2;

  const playerBatsFirst = g.playerBatsFirst;

  // Determine player and bot scores
  let playerRuns, playerWkts, botRuns, botWkts;
  if (playerBatsFirst) {
    playerRuns = i1.runs; playerWkts = i1.wickets;
    botRuns    = i2.runs; botWkts    = i2.wickets;
  } else {
    botRuns    = i1.runs; botWkts    = i1.wickets;
    playerRuns = i2.runs; playerWkts = i2.wickets;
  }

  let trophy, headline, sub, win;

  const margin = Math.abs(playerRuns - botRuns);
  if (playerRuns > botRuns) {
    trophy   = '🏆';
    headline = 'You Win!';
    sub      = margin === 1
      ? 'Won by 1 run. Your heartrate is probably still elevated.'
      : `Won by ${margin} runs. The bot will not recover from this.`;
    win      = 'player';
  } else if (botRuns > playerRuns) {
    trophy   = '💀';
    headline = 'Bot Wins.';
    sub      = margin === 1
      ? 'Lost by 1 run. That one\'s going to haunt you.'
      : `Lost by ${margin} runs. The bot sends its regards.`;
    win      = 'bot';
  } else {
    trophy   = '🤝';
    headline = 'It\'s a Tie.';
    sub      = 'Exactly equal. The universe couldn\'t pick a side either.';
    win      = 'tie';
  }

  document.getElementById('result-trophy').textContent   = trophy;
  document.getElementById('result-headline').textContent = headline;
  document.getElementById('result-sub').textContent      = sub;

  // Build fun stats from game history
  const allPlayerChoices = [...g.innings1.history, ...(g.innings2 ? g.innings2.history : [])]
    .map(h => g.innings1.batting === 'player' ? h.playerChoice : h.playerChoice);
  const freq = [0,0,0,0,0,0,0];
  allPlayerChoices.forEach(n => freq[n]++);
  const favNum = freq.indexOf(Math.max(...freq));
  const timesPicked6 = freq[6];
  const timesPicked4 = freq[4];
  const totalBalls = allPlayerChoices.length;

  const funStats = [
    { label: 'Favourite number today', val: favNum },
    { label: 'Times you trusted 6', val: timesPicked6 },
    { label: 'Times you trusted 4', val: timesPicked4 },
    { label: 'Total questionable decisions', val: totalBalls },
  ];
  // Pick 2 random fun stats
  const shuffled = funStats.sort(() => Math.random() - 0.5).slice(0, 2);

  // Scorecard
  const sc = document.getElementById('result-scorecard');
  sc.innerHTML = `
    <div class="scorecard-row">
      <span class="scorecard-label">Format</span>
      <span class="scorecard-val">${g.fmt.name}</span>
    </div>
    <div class="scorecard-row">
      <span class="scorecard-label">Difficulty</span>
      <span class="scorecard-val">${g.diff === 'easy' ? 'Chill Bot' : 'Pattern Hunter'}</span>
    </div>
    <div class="scorecard-divider"></div>
    <div class="scorecard-row">
      <span class="scorecard-label">Your Score</span>
      <span class="scorecard-val">${playerRuns}/${playerWkts}</span>
    </div>
    <div class="scorecard-row">
      <span class="scorecard-label">Bot's Score</span>
      <span class="scorecard-val">${botRuns}/${botWkts}</span>
    </div>
    <div class="scorecard-divider"></div>
    ${shuffled.map(s => `
    <div class="scorecard-row">
      <span class="scorecard-label">${s.label}</span>
      <span class="scorecard-val">${s.val}</span>
    </div>`).join('')}
  `;

  setTimeout(() => showScreen('screen-result'), 900);
}

/* ============================================================
   TOSS LOGIC
   ============================================================ */
let tossWonByPlayer = false;

function runToss(playerCall) {
  const coin = document.getElementById('coin');
  const result = Math.random() < 0.5 ? 'heads' : 'tails';
  const playerWins = playerCall === result;

  // Determine final rotation
  const finalDeg = result === 'heads' ? 0 : 180;
  coin.style.setProperty('--coin-final', `${finalDeg + 1440}deg`);

  // Animate
  coin.classList.remove('landed-heads', 'landed-tails', 'flipping');
  void coin.offsetWidth;
  coin.classList.add('flipping');

  // Disable call buttons
  document.getElementById('toss-call-btns').classList.add('hidden');

  setTimeout(() => {
    coin.classList.remove('flipping');
    coin.classList.add(result === 'heads' ? 'landed-heads' : 'landed-tails');

    tossWonByPlayer = playerWins;
    const resultText = document.getElementById('toss-result-text');
    resultText.textContent = result === 'heads' ? '🪙 Heads!' : '🪙 Tails!';

    const winnerLabel = document.getElementById('toss-winner-label');
    if (playerWins) {
      winnerLabel.textContent = 'You won the toss! Choose to bat or bowl:';
    } else {
      // Bot chooses randomly
      const botChoice = Math.random() < 0.5 ? 'bat' : 'bowl';
      winnerLabel.textContent = `Bot won the toss and chose to ${botChoice} first.`;
      tossWonByPlayer = false;

      // Auto-select for bot and hide choice buttons
      setTimeout(() => {
        beginGame(botChoice === 'bat' ? false : true); // playerBatsFirst
      }, 1500);
    }

    document.getElementById('toss-result-block').classList.remove('hidden');

    if (!playerWins) {
      document.getElementById('toss-choice-btns').classList.add('hidden');
    }
  }, 1500);
}

/* ============================================================
   BEGIN GAME
   ============================================================ */
function beginGame(playerBatsFirst) {
  state = initGame();
  state.playerBatsFirst = playerBatsFirst;

  // Set up innings 1
  const batting1 = playerBatsFirst ? 'player' : 'bot';
  state.innings1 = createInningsState(batting1);
  state.currentInnings = state.innings1;

  showScreen('screen-game');

  // Diff badge
  const badge = document.getElementById('diff-badge');
  badge.textContent = selectedDiff === 'easy' ? 'Chill Bot' : 'Pattern Hunter';
  badge.className   = `diff-badge ${selectedDiff}`;

  // Chase bar hidden for innings1
  document.getElementById('chase-bar-wrap').classList.add('hidden');

  updateScoreboard();
  clearOverBalls();

  // Reset outcome display
  document.getElementById('out-player').textContent = '?';
  document.getElementById('out-bot').textContent    = '?';
  document.getElementById('outcome-result').textContent = '';
  ['out-player','out-bot','outcome-result'].forEach(id => {
    document.getElementById(id).classList.remove('scored','wicket','boundary');
  });

  if (batting1 === 'player') {
    document.getElementById('status-text').textContent = 'You\'re batting. Pick a number and hope for the best.';
    setNumpadEnabled(true);
  } else {
    document.getElementById('status-text').textContent = 'Bot\'s batting. Pick a number to bowl.';
    setNumpadEnabled(true);
  }
}

/* ============================================================
   NUM PAD CLICK HANDLER
   ============================================================ */
function handlePlayerClick(num) {
  const g = state;
  if (!g || g.waiting || g.phase === 'done') return;

  // Flash selected
  const btn = document.getElementById(`num-${num}`);
  btn.classList.add('selected');
  setTimeout(() => btn.classList.remove('selected'), 200);

  setNumpadEnabled(false);
  g.waiting = true;

  // Play the ball
  const inningsOver = playBall(num);

  if (inningsOver) {
    if (g.phase === 'innings1') {
      g.waiting = false;
      setTimeout(() => {
        startInnings2();
      }, 1200);
    } else {
      g.waiting = false;
      setTimeout(endGame, 1200);
    }
  } else {
    // Allow next ball after a short display delay
    setTimeout(() => {
      g.waiting = false;
      setNumpadEnabled(true);
    }, 600);
  }
}

/* ============================================================
   DOM SETUP & EVENT LISTENERS
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {

  // ── FORMAT SELECTION ──
  document.querySelectorAll('#format-group .toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#format-group .toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedFormat = btn.dataset.value;
    });
  });

  // ── DIFFICULTY SELECTION ──
  document.querySelectorAll('#diff-group .toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#diff-group .toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedDiff = btn.dataset.value;
    });
  });

  // ── START TOSS ──
  document.getElementById('btn-start-toss').addEventListener('click', () => {
    showScreen('screen-toss');
  });

  // ── TOSS CALLS ──
  document.getElementById('call-heads').addEventListener('click', () => runToss('heads'));
  document.getElementById('call-tails').addEventListener('click', () => runToss('tails'));

  // ── BAT / BOWL CHOICE ──
  document.getElementById('choose-bat').addEventListener('click', () => {
    beginGame(true);
  });
  document.getElementById('choose-bowl').addEventListener('click', () => {
    beginGame(false);
  });

  // ── NUMBER PAD ──
  document.querySelectorAll('.num-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('disabled')) return;
      handlePlayerClick(parseInt(btn.dataset.num, 10));
    });
  });

  // ── PLAY AGAIN ──
  document.getElementById('btn-play-again').addEventListener('click', () => {
    // Reset toss screen
    const coin = document.getElementById('coin');
    coin.classList.remove('flipping', 'landed-heads', 'landed-tails');
    document.getElementById('toss-call-btns').classList.remove('hidden');
    document.getElementById('toss-result-block').classList.add('hidden');
    document.getElementById('toss-choice-btns').classList.remove('hidden');
    document.getElementById('toss-result-text').textContent = '';
    document.getElementById('toss-winner-label').textContent = '';
    showScreen('screen-landing');
  });

  // ── KEYBOARD SUPPORT ──
  document.addEventListener('keydown', e => {
    const k = e.key;
    if (['0','1','2','3','4','5','6'].includes(k)) {
      const btn = document.getElementById(`num-${k}`);
      if (btn && !btn.classList.contains('disabled')) {
        handlePlayerClick(parseInt(k, 10));
      }
    }
  });
});
