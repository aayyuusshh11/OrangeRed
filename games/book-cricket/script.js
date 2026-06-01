document.addEventListener('DOMContentLoaded', () => {
  // Game State
  const state = {
    player: {
      runs: 0,
      wickets: 0,
      isBatting: true
    },
    bot: {
      runs: 0,
      wickets: 0,
      isBatting: false
    },
    target: null,
    isFlipping: false,
    gameOver: false
  };

  // DOM Elements
  const els = {
    playerRuns: document.getElementById('player-runs'),
    playerWickets: document.getElementById('player-wickets'),
    botRuns: document.getElementById('bot-runs'),
    botWickets: document.getElementById('bot-wickets'),
    playerCard: document.querySelector('.player-score'),
    botCard: document.querySelector('.bot-score'),
    
    flipBtn: document.getElementById('flip-btn'),
    statusMsg: document.getElementById('game-status'),
    
    bookVisual: document.querySelector('.book-visual'),
    pageResult: document.querySelector('.page-result'),
    currentPage: document.getElementById('current-page'),
    runOutcome: document.getElementById('run-outcome'),
    
    modal: document.getElementById('game-over-modal'),
    modalTitle: document.getElementById('modal-title'),
    modalMsg: document.getElementById('modal-message'),
    restartBtn: document.getElementById('restart-btn')
  };

  // Valid runs based on last digit. 0 means out.
  // Book pages usually have all digits, but standard book cricket often uses 0,2,4,6,8.
  // We'll generate random even numbers for simplicity (0, 2, 4, 6, 8).
  const validLastDigits = [0, 2, 4, 6, 8];

  // Initialization
  function initGame() {
    state.player.runs = 0;
    state.player.wickets = 0;
    state.player.isBatting = true;
    
    state.bot.runs = 0;
    state.bot.wickets = 0;
    state.bot.isBatting = false;
    
    state.target = null;
    state.gameOver = false;
    state.isFlipping = false;

    updateUI();
    els.modal.classList.add('hidden');
    els.bookVisual.classList.remove('open');
    els.pageResult.classList.add('hidden');
    els.statusMsg.textContent = "Your turn! Flip the book to score.";
    els.statusMsg.classList.remove('danger');
    els.flipBtn.disabled = false;
  }

  // Core Logic
  function flipBook() {
    if (state.isFlipping || state.gameOver) return;
    
    // Determine active player
    const isPlayerTurn = state.player.isBatting;
    
    state.isFlipping = true;
    if (isPlayerTurn) {
      els.flipBtn.disabled = true;
    }

    // Animation start
    els.bookVisual.classList.remove('open');
    els.pageResult.classList.add('hidden');
    
    // Force reflow
    void els.bookVisual.offsetWidth;
    els.bookVisual.classList.add('animating');

    setTimeout(() => {
      els.bookVisual.classList.remove('animating');
      els.bookVisual.classList.add('open');
      
      // Calculate result
      const result = generatePageResult();
      displayResult(result);
      
      setTimeout(() => {
        processResult(result, isPlayerTurn);
      }, 1000);

    }, 400); // Wait for shake animation
  }

  function generatePageResult() {
    // Generate a random page number up to 500
    // To ensure the last digit is from our valid array, we construct it
    const base = Math.floor(Math.random() * 50) * 10; // 0, 10, 20... 490
    const lastDigit = validLastDigits[Math.floor(Math.random() * validLastDigits.length)];
    const pageNum = base + lastDigit || 2; // Avoid page 0
    return { pageNum, lastDigit };
  }

  function displayResult(result) {
    els.currentPage.textContent = result.pageNum;
    
    if (result.lastDigit === 0) {
      els.runOutcome.textContent = "W";
      els.runOutcome.classList.add('out');
    } else {
      els.runOutcome.textContent = result.lastDigit;
      els.runOutcome.classList.remove('out');
    }
    
    els.pageResult.classList.remove('hidden');
  }

  function processResult(result, isPlayerTurn) {
    const activeStats = isPlayerTurn ? state.player : state.bot;
    
    if (result.lastDigit === 0) {
      // Wicket
      activeStats.wickets = 1; // 1 wicket per innings
      updateUI();
      
      els.statusMsg.textContent = "OUT!";
      els.statusMsg.classList.add('danger');
      
      setTimeout(() => {
        handleInningsEnd(isPlayerTurn);
      }, 1500);
      
    } else {
      // Runs
      activeStats.runs += result.lastDigit;
      updateUI();
      
      els.statusMsg.textContent = isPlayerTurn ? `Great! ${result.lastDigit} runs.` : `Bot scores ${result.lastDigit}.`;
      els.statusMsg.classList.remove('danger');
      
      // Check win condition if chasing
      if (!isPlayerTurn && activeStats.runs > state.target) {
        state.gameOver = true;
        setTimeout(() => endGame(), 1000);
        return;
      }
      
      // Reset flip state
      state.isFlipping = false;
      if (isPlayerTurn) {
        els.flipBtn.disabled = false;
      } else {
        // Bot plays again
        setTimeout(() => {
          if (!state.gameOver) flipBook();
        }, 1200);
      }
    }
  }

  function handleInningsEnd(wasPlayerTurn) {
    if (wasPlayerTurn) {
      // Player out, bot's turn
      state.player.isBatting = false;
      state.bot.isBatting = true;
      state.target = state.player.runs;
      
      updateUI();
      els.statusMsg.textContent = `Target is ${state.target + 1}. Bot is batting...`;
      els.statusMsg.classList.remove('danger');
      els.flipBtn.disabled = true; // Player can't click during bot turn
      
      // Close book visual briefly before bot starts
      els.bookVisual.classList.remove('open');
      els.pageResult.classList.add('hidden');
      
      state.isFlipping = false;
      
      // Start bot turn
      setTimeout(() => {
        flipBook();
      }, 2000);
      
    } else {
      // Bot out, game over
      state.gameOver = true;
      state.isFlipping = false;
      endGame();
    }
  }

  function endGame() {
    let title = "";
    let message = "";
    
    if (state.player.runs > state.bot.runs) {
      title = "You Won!";
      message = `You beat the bot by ${state.player.runs - state.bot.runs} runs!`;
      els.modalTitle.style.background = "linear-gradient(135deg, #00ff88, #00b3ff)";
    } else if (state.bot.runs > state.player.runs) {
      title = "You Lost!";
      message = `The bot chased down your target and won.`;
      els.modalTitle.style.background = "linear-gradient(135deg, var(--brand-red), #990000)";
    } else {
      title = "It's a Tie!";
      message = `Both scored ${state.player.runs} runs. What a match!`;
      els.modalTitle.style.background = "linear-gradient(135deg, #aaaaaa, #555555)";
    }
    
    els.modalTitle.textContent = title;
    els.modalMsg.textContent = message;
    els.modalTitle.style.webkitBackgroundClip = "text";
    els.modalTitle.style.webkitTextFillColor = "transparent";
    
    els.modal.classList.remove('hidden');
  }

  function updateUI() {
    els.playerRuns.textContent = state.player.runs;
    els.playerWickets.textContent = `W: ${state.player.wickets}`;
    els.botRuns.textContent = state.bot.runs;
    els.botWickets.textContent = `W: ${state.bot.wickets}`;
    
    if (state.player.isBatting) {
      els.playerCard.classList.add('active-turn');
      els.botCard.classList.remove('active-turn');
      els.playerCard.querySelector('.turn-indicator').textContent = 'Batting';
      els.botCard.querySelector('.turn-indicator').textContent = 'Waiting';
    } else if (state.bot.isBatting) {
      els.botCard.classList.add('active-turn');
      els.playerCard.classList.remove('active-turn');
      els.botCard.querySelector('.turn-indicator').textContent = 'Batting';
      els.playerCard.querySelector('.turn-indicator').textContent = 'Finished';
    }
  }

  // Event Listeners
  els.flipBtn.addEventListener('click', flipBook);
  els.restartBtn.addEventListener('click', initGame);

  // Start game
  initGame();
});
