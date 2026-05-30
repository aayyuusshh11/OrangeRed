document.addEventListener('DOMContentLoaded', () => {
  // Screens
  const startScreen = document.getElementById('startScreen');
  const gameScreen = document.getElementById('gameScreen');
  
  // Elements
  const difficultyButtons = document.querySelectorAll('.diff-btn');
  const attemptsCountEl = document.getElementById('attemptsCount');
  const hintMessageEl = document.getElementById('hintMessage');
  const guessInput = document.getElementById('guessInput');
  const submitBtn = document.getElementById('submitBtn');
  const playAgainBtn = document.getElementById('playAgainBtn');
  const gameControls = document.getElementById('gameControls');

  // Game State
  let targetNumber = 0;
  let attempts = 0;
  let isGameOver = false;

  // Initialize Difficulty Selection
  difficultyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const digits = parseInt(btn.getAttribute('data-digits'));
      startGame(digits);
    });
  });

  function startGame(digits) {
    // Generate Random Number
    if (digits === 2) {
      // 10 to 99
      targetNumber = Math.floor(Math.random() * 90) + 10;
    } else {
      // 100 to 999
      targetNumber = Math.floor(Math.random() * 900) + 100;
    }

    // Reset State
    attempts = 0;
    isGameOver = false;
    updateAttemptsDisplay();
    
    // Reset UI
    hintMessageEl.textContent = "I'm thinking of a number...";
    hintMessageEl.className = "hint-message";
    guessInput.value = '';
    guessInput.disabled = false;
    submitBtn.disabled = false;
    gameControls.classList.add('hidden');

    // Switch Screens
    startScreen.classList.add('hidden');
    
    // Tiny delay to allow display flex to apply before opacity transition
    setTimeout(() => {
      gameScreen.classList.remove('hidden');
      guessInput.focus();
    }, 50);
  }

  function handleGuess() {
    if (isGameOver) return;

    const guessVal = guessInput.value.trim();
    
    if (!guessVal || isNaN(guessVal)) {
      setHint("Please enter a valid number!", "hint-lower");
      return;
    }

    const guess = parseInt(guessVal);
    attempts++;
    updateAttemptsDisplay();

    // Check guess against target
    if (guess === targetNumber) {
      handleWin();
    } else if (guess < targetNumber) {
      setHint("Higher! Try a larger number.", "hint-higher");
      guessInput.value = '';
      guessInput.focus();
    } else {
      setHint("Lower! Try a smaller number.", "hint-lower");
      guessInput.value = '';
      guessInput.focus();
    }
  }

  function handleWin() {
    isGameOver = true;
    setHint(`Correct! You guessed it in ${attempts} attempts!`, "hint-correct");
    guessInput.disabled = true;
    submitBtn.disabled = true;
    gameControls.classList.remove('hidden');
  }

  function setHint(message, className) {
    hintMessageEl.textContent = message;
    // Remove old classes and add new one
    hintMessageEl.className = "hint-message";
    // Trigger reflow to restart animation if same class
    void hintMessageEl.offsetWidth;
    hintMessageEl.classList.add(className);
  }

  function updateAttemptsDisplay() {
    attemptsCountEl.textContent = attempts;
  }

  // Event Listeners for Game Play
  submitBtn.addEventListener('click', handleGuess);

  guessInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleGuess();
    }
  });

  playAgainBtn.addEventListener('click', () => {
    gameScreen.classList.add('hidden');
    setTimeout(() => {
      startScreen.classList.remove('hidden');
    }, 400);
  });
});
