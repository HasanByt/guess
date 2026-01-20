// ===============================
// Snake Game + Highscore (Netlify/Upstash)
// Design & UX wie guess.js / hangman.js
// + Mobile Swipe Controls (Variante 2)
// ===============================

const API_GET = "/.netlify/functions/snake-get-scores";
const API_POST = "/.netlify/functions/snake-submit-score";

let jsConfetti = null;

// ===== DOM =====
const headline = document.getElementById("headline");
const bestInfo = document.getElementById("bestInfo");
const scoreText = document.getElementById("scoreText");
const speedText = document.getElementById("speedText");

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restartBtn");

// Help modal
const openHelpBtn = document.getElementById("openHelpBtn");
const helpModal = document.getElementById("helpModal");
const closeHelpBtn = document.getElementById("closeHelpBtn");

// Leaderboard modal
const openLeaderboardBtn = document.getElementById("openLeaderboardBtn");
const leaderboardModal = document.getElementById("leaderboardModal");
const closeLeaderboardBtn = document.getElementById("closeLeaderboardBtn");
const leaderboardEl = document.getElementById("leaderboard");
const top3El = document.getElementById("top3");

// Save modal
const saveScoreModal = document.getElementById("saveScoreModal");
const winText = document.getElementById("winText");
const winnerNameInput = document.getElementById("winnerName");
const skipSaveBtn = document.getElementById("skipSaveBtn");
const saveScoreBtn = document.getElementById("saveScoreBtn");

// Name merken
const STORAGE_WINNER = "snake_winnerName";
winnerNameInput.value = localStorage.getItem(STORAGE_WINNER) || "";

// ===== Game Settings =====
const GRID = 20; // 20x20
const POINTS_PER_APPLE = 10;

let cell = 20; // wird dynamisch gesetzt
let offsetX = 0;
let offsetY = 0;

// ===== Game State =====
let snake = [];
let dir = { x: 1, y: 0 }; // start right
let nextDir = { x: 1, y: 0 };
let apple = { x: 10, y: 10 };

let score = 0;
let running = false;
let paused = false;
let gameOver = false;

let lastTick = 0;
let tickMs = 140; // base speed

// RAF state (wichtig: nur 1 Loop!)
let rafId = null;

// ===== Init =====
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

loadLeaderboard();
resetGame();

// starte eine einzige Render-Schleife
rafId = requestAnimationFrame(loop);

// ===============================
// Canvas sizing (responsive)
// ===============================
function resizeCanvas() {
  const max = 520;
  const w = Math.min(max, canvas.parentElement.clientWidth);
  canvas.width = Math.floor(w);
  canvas.height = Math.floor(w);

  cell = Math.floor(canvas.width / GRID);
  const boardSize = cell * GRID;

  offsetX = Math.floor((canvas.width - boardSize) / 2);
  offsetY = Math.floor((canvas.height - boardSize) / 2);
}

// ===============================
// Game functions
// ===============================
function resetGame() {
  score = 0;
  updateHUD();

  snake = [
    { x: 8, y: 10 },
    { x: 7, y: 10 },
    { x: 6, y: 10 },
  ];

  dir = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };

  spawnApple();

  running = false;
  paused = false;
  gameOver = false;

  headline.textContent = "🐍 Snake";
  lastTick = performance.now();
  tickMs = 140;
}

function startGame() {
  if (gameOver) resetGame();
  running = true;
  paused = false;
  headline.textContent = "Let’s go! 🐍";
}

function togglePause() {
  if (!running || gameOver) return;
  paused = !paused;
  headline.textContent = paused ? "Pause ⏸️" : "Weiter! 🐍";
}

function updateSpeed() {
  const level = Math.floor(score / 50); // alle 50 Punkte schneller
  tickMs = Math.max(70, 140 - level * 10);

  const speed = (140 / tickMs).toFixed(1);
  speedText.textContent = `${speed}x`;
}

function updateHUD() {
  scoreText.textContent = String(score);
  updateSpeed();
}

function spawnApple() {
  while (true) {
    const x = Math.floor(Math.random() * GRID);
    const y = Math.floor(Math.random() * GRID);

    const onSnake = snake.some((s) => s.x === x && s.y === y);
    if (!onSnake) {
      apple = { x, y };
      return;
    }
  }
}

function setDirection(nx, ny) {
  // verhindert direktes Umkehren
  if (nx === -dir.x && ny === -dir.y) return;
  nextDir = { x: nx, y: ny };
}

function tick() {
  dir = nextDir;

  const head = snake[0];
  const newHead = { x: head.x + dir.x, y: head.y + dir.y };

  // wall collision
  if (newHead.x < 0 || newHead.x >= GRID || newHead.y < 0 || newHead.y >= GRID) {
    endGame();
    return;
  }

  // self collision
  if (snake.some((s) => s.x === newHead.x && s.y === newHead.y)) {
    endGame();
    return;
  }

  snake.unshift(newHead);

  // apple?
  if (newHead.x === apple.x && newHead.y === apple.y) {
    score += POINTS_PER_APPLE;
    updateHUD();
    spawnApple();
  } else {
    snake.pop();
  }
}

function endGame() {
  running = false;
  paused = false;
  gameOver = true;

  headline.textContent = "💀 Game Over!";
  if (typeof JSConfetti !== "undefined") {
    if (!jsConfetti) jsConfetti = new JSConfetti();
    if (score >= 30) jsConfetti.addConfetti();
  }

  openSaveModal();
}

// ===============================
// Render
// ===============================
function drawCell(x, y, fillStyle) {
  ctx.fillStyle = fillStyle;
  ctx.fillRect(
    offsetX + x * cell,
    offsetY + y * cell,
    cell - 1,
    cell - 1
  );
}

function renderFrame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // board background
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(offsetX, offsetY, cell * GRID, cell * GRID);

  // apple
  drawCell(apple.x, apple.y, "rgba(255,77,109,0.95)");

  // snake body
  for (let i = snake.length - 1; i >= 0; i--) {
    const s = snake[i];
    const isHead = i === 0;
    drawCell(
      s.x,
      s.y,
      isHead ? "rgba(46,233,166,0.95)" : "rgba(124,92,255,0.9)"
    );
  }
}

function loop(now) {
  if (running && !paused && !gameOver) {
    if (now - lastTick >= tickMs) {
      lastTick = now;
      tick();
    }
  }

  renderFrame();
  rafId = requestAnimationFrame(loop);
}

// ===============================
// Modals
// ===============================
function openModal(el) {
  el.classList.add("show");
}
function closeModal(el) {
  el.classList.remove("show");
}

function openSaveModal() {
  winText.textContent = `Score: ${score}. Willst du speichern?`;
  saveScoreModal.classList.add("show");
  setTimeout(() => winnerNameInput.focus(), 0);
}

// ===============================
// Highscore API
// ===============================
async function submitScore(name, scoreValue) {
  try {
    const res = await fetch(API_POST, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, score: scoreValue }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      headline.textContent = `Fehler beim Speichern: ${err.error || res.status}`;
      return false;
    }

    headline.textContent = "Highscore gespeichert ✅";
    return true;
  } catch {
    headline.textContent = "Server nicht erreichbar 😕";
    return false;
  }
}

async function loadLeaderboard() {
  try {
    const res = await fetch(API_GET, { cache: "no-store" });
    if (!res.ok) throw new Error("bad response");

    const rows = await res.json();
    renderLeaderboard(rows);

    const globalBest = rows?.[0]
      ? `Global: ${rows[0].name} (${rows[0].score})`
      : "Global: —";

    bestInfo.textContent = globalBest;
  } catch {
    bestInfo.textContent = "Global: —";
    if (leaderboardEl) leaderboardEl.innerHTML = "<li>Server nicht erreichbar 😕</li>";
    if (top3El) top3El.innerHTML = "";
  }
}

function renderLeaderboard(rows) {
  const myName = (localStorage.getItem(STORAGE_WINNER) || "").trim();

  // Top3 cards
  top3El.innerHTML = "";
  const medals = ["🥇", "🥈", "🥉"];
  const top3 = (rows || []).slice(0, 3);

  for (let i = 0; i < 3; i++) {
    const entry = top3[i];
    const card = document.createElement("div");
    card.className = "podium";

    if (entry && myName && entry.name === myName) {
      card.classList.add("highlight");
    }

    card.innerHTML = `
      <div class="rank">${medals[i]}</div>
      <div class="name">${entry ? entry.name : "—"}</div>
      <div class="tries">${entry ? `${entry.score} Punkte` : ""}</div>
    `;

    top3El.appendChild(card);
  }

  leaderboardEl.innerHTML = "";

  if (!rows || rows.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Noch keine Scores gespeichert.";
    leaderboardEl.appendChild(li);
    return;
  }

  const rest = rows.slice(3);
  if (rest.length === 0) {
    const li = document.createElement("li");
    li.textContent = "—";
    leaderboardEl.appendChild(li);
    return;
  }

  for (const r of rest) {
    const li = document.createElement("li");
    li.textContent = `${r.name} — ${r.score} Punkte`;

    if (myName && r.name === myName) {
      li.classList.add("highlight");
    }

    leaderboardEl.appendChild(li);
  }
}

// ===============================
// Helpers
// ===============================
function sanitizeName(name) {
  if (typeof name !== "string") return null;
  const clean = name.trim();
  if (clean.length < 2 || clean.length > 20) return null;
  // FIX: ß war bei dir kaputt -> richtig:
  if (!/^[a-zA-Z0-9 äöüÄÖÜß._-]+$/.test(clean)) return null;
  return clean;
}

// ===============================
// Events
// ===============================

// Keyboard (Arrow Keys + WASD)
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();

  if (k === "arrowup" || k === "w") {
    setDirection(0, -1);
  } else if (k === "arrowdown" || k === "s") {
    setDirection(0, 1);
  } else if (k === "arrowleft" || k === "a") {
    setDirection(-1, 0);
  } else if (k === "arrowright" || k === "d") {
    setDirection(1, 0);
  }
});




startBtn.addEventListener("click", startGame);
pauseBtn.addEventListener("click", togglePause);
restartBtn.addEventListener("click", () => {
  resetGame();
  startGame();
});

// Help modal
openHelpBtn.addEventListener("click", () => openModal(helpModal));
closeHelpBtn.addEventListener("click", () => closeModal(helpModal));
helpModal.addEventListener("click", (e) => {
  if (e.target === helpModal) closeModal(helpModal);
});

// Leaderboard modal
openLeaderboardBtn.addEventListener("click", async () => {
  leaderboardModal.classList.add("show");
  await loadLeaderboard();
});
closeLeaderboardBtn.addEventListener("click", () => closeModal(leaderboardModal));
leaderboardModal.addEventListener("click", (e) => {
  if (e.target === leaderboardModal) closeModal(leaderboardModal);
});

// Save modal
skipSaveBtn.addEventListener("click", () => closeModal(saveScoreModal));
saveScoreModal.addEventListener("click", (e) => {
  if (e.target === saveScoreModal) closeModal(saveScoreModal);
});

saveScoreBtn.addEventListener("click", async () => {
  const name = sanitizeName(winnerNameInput.value);
  if (!name) {
    headline.textContent = "Bitte einen gültigen Namen eingeben (2-20 Zeichen).";
    winnerNameInput.focus();
    return;
  }

  localStorage.setItem(STORAGE_WINNER, name);

  const ok = await submitScore(name, score);
  if (ok) {
    closeModal(saveScoreModal);
    await loadLeaderboard();
  }
});

// ===============================
// 📱 Mobile Swipe Controls (nur während Spiel)
// ✅ Swipe funktioniert nur wenn: running=true, paused=false, gameOver=false
// ===============================
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener(
  "touchstart",
  (e) => {
    if (!running || paused || gameOver) return;

    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
  },
  { passive: true }
);

canvas.addEventListener(
  "touchmove",
  (e) => {
    if (!running || paused || gameOver) return;
    e.preventDefault(); // verhindert Scrollen beim Swipen
  },
  { passive: false }
);

canvas.addEventListener(
  "touchend",
  (e) => {
    if (!running || paused || gameOver) return;

    const t = e.changedTouches[0];
    const dxSwipe = t.clientX - touchStartX;
    const dySwipe = t.clientY - touchStartY;

    const absX = Math.abs(dxSwipe);
    const absY = Math.abs(dySwipe);

    // minimale Swipe-Distanz
    if (Math.max(absX, absY) < 20) return;

    if (absX > absY) {
      // horizontal
      if (dxSwipe > 0) setDirection(1, 0);  // →
      else setDirection(-1, 0);             // ←
    } else {
      // vertikal
      if (dySwipe > 0) setDirection(0, 1);  // ↓
      else setDirection(0, -1);             // ↑
    }
  },
  { passive: true }
);
