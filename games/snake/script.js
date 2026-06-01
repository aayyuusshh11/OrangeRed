const gridCanvas = document.getElementById('gameCanvas');
const gctx = gridCanvas.getContext('2d');
const vpCanvas = document.getElementById('vpCanvas');
const vctx = vpCanvas.getContext('2d');

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const finalScoreEl = document.getElementById('finalScore');
const finalCherriesEl = document.getElementById('finalCherries');

const GRID = 20;
const BASE_SPEED = 200;
const MIN_SPEED = 70;
const SPEED_STEP = 5;

let snake, dx, dy, foodX, foodY;
let score, cherries, speed;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let loop = null;
let active = false;
let glowT = 0;
let cols, rows;
let canvasRect;

highScoreEl.textContent = highScore;

function sizeViewport() {
  vpCanvas.width = window.innerWidth;
  vpCanvas.height = window.innerHeight;
  cols = Math.floor(window.innerWidth / GRID);
  rows = Math.floor(window.innerHeight / GRID);
  canvasRect = gridCanvas.getBoundingClientRect();
}

function snakeStart() {
  var r = gridCanvas.getBoundingClientRect();
  var cx = Math.floor((r.left + r.width / 2) / GRID);
  var cy = Math.floor((r.top + r.height / 2) / GRID);
  return { x: cx, y: cy };
}

function insideCanvas(gx, gy) {
  var px = gx * GRID;
  var py = gy * GRID;
  return px >= canvasRect.left && px + GRID <= canvasRect.right &&
         py >= canvasRect.top && py + GRID <= canvasRect.bottom;
}

function init() {
  sizeViewport();
  var s = snakeStart();
  snake = [
    { x: s.x, y: s.y },
    { x: s.x, y: s.y + 1 },
    { x: s.x, y: s.y + 2 }
  ];
  dx = 0;
  dy = -1;
  score = 0;
  cherries = 0;
  speed = BASE_SPEED;
  updateUI();
  spawnFood();
  drawGridOnce();
}

function spawnFood() {
  var tries = 0;

  // grid bounds of the original canvas
  var minX = Math.ceil(canvasRect.left / GRID);
  var maxX = Math.floor((canvasRect.right - GRID) / GRID);
  var minY = Math.ceil(canvasRect.top / GRID);
  var maxY = Math.floor((canvasRect.bottom - GRID) / GRID);

  while (tries < 500) {
    if (cherries < 2) {
      // stay inside the canvas box
      foodX = minX + Math.floor(Math.random() * (maxX - minX + 1));
      foodY = minY + Math.floor(Math.random() * (maxY - minY + 1));
    } else {
      // anywhere on the viewport (with 1-cell padding from edges)
      foodX = 1 + Math.floor(Math.random() * (cols - 2));
      foodY = 1 + Math.floor(Math.random() * (rows - 2));
    }
    tries++;
    var onSnake = false;
    for (var i = 0; i < snake.length; i++) {
      if (snake[i].x === foodX && snake[i].y === foodY) { onSnake = true; break; }
    }
    if (!onSnake) break;
  }
}

function updateUI() {
  scoreEl.textContent = score;
  if (score > highScore) {
    highScore = score;
    highScoreEl.textContent = highScore;
    localStorage.setItem('snakeHighScore', highScore);
  }
}

function start() {
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  document.body.style.overflow = 'hidden';
  init();
  active = true;
  nextFrame();
}

function nextFrame() {
  loop = setTimeout(function () {
    if (!active) return;
    tick();
    nextFrame();
  }, speed);
}

function die() {
  active = false;
  clearTimeout(loop);
  document.body.style.overflow = '';
  finalScoreEl.textContent = score;
  finalCherriesEl.textContent = cherries;
  vctx.clearRect(0, 0, vpCanvas.width, vpCanvas.height);
  gameOverScreen.classList.remove('hidden');
}

function tick() {
  snake.unshift({ x: snake[0].x + dx, y: snake[0].y + dy });

  var h = snake[0];

  // boundary depends on phase
  if (cherries < 2) {
    // restricted to the original canvas grid
    var minX = Math.ceil(canvasRect.left / GRID);
    var maxX = Math.floor((canvasRect.right - GRID) / GRID);
    var minY = Math.ceil(canvasRect.top / GRID);
    var maxY = Math.floor((canvasRect.bottom - GRID) / GRID);
    if (h.x < minX || h.x > maxX || h.y < minY || h.y > maxY) { die(); return; }
  } else {
    // full viewport
    if (h.x < 0 || h.x >= cols || h.y < 0 || h.y >= rows) { die(); return; }
  }

  for (var i = 1; i < snake.length; i++) {
    if (h.x === snake[i].x && h.y === snake[i].y) { die(); return; }
  }

  if (h.x === foodX && h.y === foodY) {
    score += 10;
    cherries++;
    speed = Math.max(MIN_SPEED, speed - SPEED_STEP);
    updateUI();
    spawnFood();
  } else {
    snake.pop();
  }

  glowT = (glowT + 0.15) % (Math.PI * 2);
  render();
}

function drawGridOnce() {
  gctx.fillStyle = '#090909';
  gctx.fillRect(0, 0, gridCanvas.width, gridCanvas.height);
  gctx.strokeStyle = '#0e0e0e';
  gctx.lineWidth = 0.5;
  var t = gridCanvas.width / GRID;
  for (var i = 0; i <= t; i++) {
    gctx.beginPath(); gctx.moveTo(i * GRID, 0); gctx.lineTo(i * GRID, gridCanvas.height); gctx.stroke();
    gctx.beginPath(); gctx.moveTo(0, i * GRID); gctx.lineTo(gridCanvas.width, i * GRID); gctx.stroke();
  }
}

function render() {
  vctx.clearRect(0, 0, vpCanvas.width, vpCanvas.height);

  // cherry
  var fx = foodX * GRID + GRID / 2;
  var fy = foodY * GRID + GRID / 2;
  var outside = !insideCanvas(foodX, foodY);

  if (outside) {
    var pulse = 0.5 + 0.5 * Math.sin(glowT);
    vctx.shadowBlur = 14 + pulse * 22;
    vctx.shadowColor = '#ff4444';
  } else {
    vctx.shadowBlur = 8;
    vctx.shadowColor = '#cc2222';
  }
  vctx.fillStyle = outside ? '#ff3333' : '#cc2222';
  vctx.beginPath();
  vctx.arc(fx, fy, GRID / 2 - 2, 0, Math.PI * 2);
  vctx.fill();

  vctx.shadowBlur = 0;
  vctx.strokeStyle = outside ? '#88ff88' : '#44aa44';
  vctx.lineWidth = 1.5;
  vctx.beginPath();
  vctx.moveTo(fx, fy - GRID / 2 + 3);
  vctx.quadraticCurveTo(fx + 5, fy - GRID / 2 - 4, fx + 8, fy - GRID / 2 - 2);
  vctx.stroke();

  // snake
  vctx.shadowBlur = 5;
  vctx.shadowColor = '#d05000';
  for (var i = 0; i < snake.length; i++) {
    vctx.fillStyle = i === 0 ? '#f08030' : '#c06020';
    vctx.beginPath();
    vctx.roundRect(snake[i].x * GRID + 1, snake[i].y * GRID + 1, GRID - 2, GRID - 2, 3);
    vctx.fill();
  }
  vctx.shadowBlur = 0;
}

document.addEventListener('keydown', function (e) {
  if (!active) return;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();

  var k = e.key.toLowerCase();
  if ((k === 'arrowup'    || k === 'w') && dy !==  1) { dx = 0;  dy = -1; }
  if ((k === 'arrowdown'  || k === 's') && dy !== -1) { dx = 0;  dy =  1; }
  if ((k === 'arrowleft'  || k === 'a') && dx !==  1) { dx = -1; dy =  0; }
  if ((k === 'arrowright' || k === 'd') && dx !== -1) { dx =  1; dy =  0; }
});

window.addEventListener('resize', function () {
  sizeViewport();
  drawGridOnce();
});

startBtn.addEventListener('click', start);
restartBtn.addEventListener('click', start);

drawGridOnce();
