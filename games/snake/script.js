const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const finalScoreElement = document.getElementById('finalScore');

// Game settings
const gridSize = 20;
const tileCount = canvas.width / gridSize;
const gameSpeed = 100; // ms per frame

let snake = [];
let dx = 0;
let dy = 0;
let foodX;
let foodY;
let score = 0;
let highScore = localStorage.getItem('neonSnakeHighScore') || 0;
let gameLoopInterval;
let gameActive = false;

highScoreElement.textContent = highScore;

// Initialize game state
function initGame() {
  snake = [
    { x: 10, y: 10 },
    { x: 10, y: 11 },
    { x: 10, y: 12 }
  ];
  dx = 0;
  dy = -1; // Moving up initially
  score = 0;
  updateScore();
  spawnFood();
}

function spawnFood() {
  foodX = Math.floor(Math.random() * tileCount);
  foodY = Math.floor(Math.random() * tileCount);
  
  // Make sure food doesn't spawn on the snake
  for (let part of snake) {
    if (part.x === foodX && part.y === foodY) {
      spawnFood();
      return;
    }
  }
}

function updateScore() {
  scoreElement.textContent = score;
  if (score > highScore) {
    highScore = score;
    highScoreElement.textContent = highScore;
    localStorage.setItem('neonSnakeHighScore', highScore);
  }
}

function startGame() {
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  initGame();
  gameActive = true;
  gameLoopInterval = setInterval(gameLoop, gameSpeed);
}

function gameOver() {
  gameActive = false;
  clearInterval(gameLoopInterval);
  finalScoreElement.textContent = score;
  gameOverScreen.classList.remove('hidden');
}

function gameLoop() {
  moveSnake();
  if (checkCollision()) {
    gameOver();
    return;
  }
  checkFood();
  draw();
}

function moveSnake() {
  const head = { x: snake[0].x + dx, y: snake[0].y + dy };
  snake.unshift(head);
  // Tail removal is handled in checkFood() if no food eaten
}

function checkCollision() {
  const head = snake[0];
  
  // Wall collision
  if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
    return true;
  }
  
  // Self collision
  for (let i = 1; i < snake.length; i++) {
    if (head.x === snake[i].x && head.y === snake[i].y) {
      return true;
    }
  }
  
  return false;
}

function checkFood() {
  const head = snake[0];
  if (head.x === foodX && head.y === foodY) {
    score += 10;
    updateScore();
    spawnFood();
  } else {
    snake.pop(); // Remove tail if no food eaten
  }
}

function draw() {
  // Clear canvas
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw grid pattern (subtle)
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1;
  for (let i = 0; i < tileCount; i++) {
    ctx.beginPath();
    ctx.moveTo(i * gridSize, 0);
    ctx.lineTo(i * gridSize, canvas.height);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(0, i * gridSize);
    ctx.lineTo(canvas.width, i * gridSize);
    ctx.stroke();
  }
  
  // Draw food (Neon Red)
  ctx.shadowBlur = 15;
  ctx.shadowColor = '#ff2a2a';
  ctx.fillStyle = '#ff2a2a';
  ctx.beginPath();
  ctx.arc(
    foodX * gridSize + gridSize / 2, 
    foodY * gridSize + gridSize / 2, 
    gridSize / 2 - 2, 
    0, 2 * Math.PI
  );
  ctx.fill();
  
  // Reset shadow for snake to avoid excessive glow compounding
  ctx.shadowBlur = 10;
  ctx.shadowColor = '#ff7300';
  
  // Draw snake (Neon Orange)
  snake.forEach((part, index) => {
    // Head is slightly brighter/different
    ctx.fillStyle = index === 0 ? '#ff9533' : '#ff7300';
    
    // Draw rounded rects for snake parts
    ctx.beginPath();
    ctx.roundRect(
      part.x * gridSize + 1, 
      part.y * gridSize + 1, 
      gridSize - 2, 
      gridSize - 2, 
      4
    );
    ctx.fill();
  });
  
  ctx.shadowBlur = 0; // reset for next frame
}

// Controls
document.addEventListener('keydown', (e) => {
  if (!gameActive) return;
  
  // Prevent default scrolling for arrow keys
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault();
  }
  
  switch (e.key.toLowerCase()) {
    case 'arrowup':
    case 'w':
      if (dy !== 1) { dx = 0; dy = -1; }
      break;
    case 'arrowdown':
    case 's':
      if (dy !== -1) { dx = 0; dy = 1; }
      break;
    case 'arrowleft':
    case 'a':
      if (dx !== 1) { dx = -1; dy = 0; }
      break;
    case 'arrowright':
    case 'd':
      if (dx !== -1) { dx = 1; dy = 0; }
      break;
  }
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Initial draw to show grid/canvas setup
draw();
