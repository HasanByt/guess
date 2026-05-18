// ===============================
// Flappy Bird (Canvas) – mit echten Assets
// Online Leaderboard (Netlify/Upstash)
// Design & UX wie snake.js / guess.js / hangman.js
// OHNE Sounds
// ===============================

const ASSET_BASE = "./public/flappy/";

const API_GET = "/.netlify/functions/flappy-get-scores";
const API_POST = "/.netlify/functions/flappy-submit-score";

let jsConfetti = null;

// ===== DOM =====
const headline = document.getElementById("headline");
const bestInfo = document.getElementById("bestInfo");
const scoreText = document.getElementById("scoreText");
const bestText = document.getElementById("bestText");

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

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
const STORAGE_WINNER = "flappy_winnerName";
winnerNameInput.value = localStorage.getItem(STORAGE_WINNER) || "";

// Local best
const STORAGE_BEST = "flappy_best";

// ===== Assets =====
const IMG = {};

function loadImage(key, src) {
  return new Promise((resolve, reject) => {
    const im = new Image();

    im.onload = () => {
      IMG[key] = im;
      resolve();
    };

    im.onerror = reject;
    im.src = src;
  });
}

async function loadAssets() {
  const jobs = [
    loadImage("bg", ASSET_BASE + "background-day.png"),
    loadImage("base", ASSET_BASE + "base.png"),
    loadImage("pipe", ASSET_BASE + "pipe-green.png"),
    loadImage("msg", ASSET_BASE + "message.png"),
    loadImage("over", ASSET_BASE + "gameover.png"),
    loadImage("bUp", ASSET_BASE + "yellowbird-upflap.png"),
    loadImage("bMid", ASSET_BASE + "yellowbird-midflap.png"),
    loadImage("bDown", ASSET_BASE + "yellowbird-downflap.png"),
  ];

  for (let i = 0; i <= 9; i++) {
    jobs.push(loadImage("n" + i, ASSET_BASE + "numbers/" + i + ".png"));
  }

  await Promise.all(jobs);
}

// ===== Canvas sizing =====
function resizeCanvas() {
  const maxW = 520;
  const parentW = canvas.parentElement.clientWidth;
  const w = Math.min(maxW, parentW);

  canvas.width = Math.floor(w);
  canvas.height = Math.floor(w * 1.25);
}

function scale(v) {
  return (v * canvas.width) / 520;
}

// ===== Game State =====
let started = false;
let gameOver = false;
let score = 0;
let best = Number(localStorage.getItem(STORAGE_BEST) || "0") || 0;

const bird = {
  x: 0,
  y: 0,
  vy: 0,
  r: 0,
  frameT: 0,
  frame: 0,
};

let pipes = [];
let baseX = 0;
let last = performance.now();
let rafId = null;

// ===== Init =====
resizeCanvas();
window.addEventListener("resize", () => {
  resizeCanvas();
  resetGame();
});

bestText.textContent = String(best);

// ===============================
// Game functions
// ===============================
function resetGame() {
  started = false;
  gameOver = false;
  score = 0;

  scoreText.textContent = "0";
  headline.textContent = "🐦 Flappy Bird";

  bird.x = scale(120);
  bird.y = canvas.height * 0.45;
  bird.vy = 0;
  bird.r = 0;
  bird.frameT = 0;
  bird.frame = 0;

  pipes = [];
  baseX = 0;

  spawnPipe();
  spawnPipe(scale(260));
  spawnPipe(scale(520));
}

function spawnPipe(extraX = 0) {
  const gap = scale(150);
  const pipeW = scale(78);
  const minTop = scale(60);
  const maxTop = canvas.height - scale(200) - gap;

  const topH = Math.floor(minTop + Math.random() * (maxTop - minTop));

  pipes.push({
    x: canvas.width + extraX,
    w: pipeW,
    topH,
    gap,
    passed: false,
  });
}

function flap() {
  if (gameOver) {
    const modalOpen = saveScoreModal.classList.contains("show");
    if (!modalOpen) resetGame();
    return;
  }

  if (!started) {
    started = true;
    headline.textContent = "Let’s go! 🐦";
  }

  bird.vy = -scale(7.5);
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function endGame() {
  if (gameOver) return;

  gameOver = true;
  headline.textContent = "💀 Game Over!";

  if (score > best) {
    best = score;
    localStorage.setItem(STORAGE_BEST, String(best));
    bestText.textContent = String(best);
  }

  if (typeof JSConfetti !== "undefined") {
    if (!jsConfetti) jsConfetti = new JSConfetti();
    if (score >= 5) jsConfetti.addConfetti();
  }

  openSaveModal();
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
  openModal(saveScoreModal);
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
      <div class="tries">${entry ? `${entry.score} Pipes` : ""}</div>
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
    li.textContent = `${r.name} — ${r.score} Pipes`;

    if (myName && r.name === myName) {
      li.classList.add("highlight");
    }

    leaderboardEl.appendChild(li);
  }
}

// ===============================
// Render
// ===============================
function drawTiled(img, y, h, xOffset) {
  const scaleY = h / img.height;
  const drawW = img.width * scaleY;

  let x = -((xOffset % drawW) + drawW);

  while (x < canvas.width + drawW) {
    ctx.drawImage(img, x, y, drawW, h);
    x += drawW;
  }
}

function drawPipe(pipe) {
  const pipeImg = IMG.pipe;
  const bottomY = pipe.topH + pipe.gap;
  const bottomH = canvas.height - scale(110) - bottomY;

  ctx.drawImage(pipeImg, pipe.x, bottomY, pipe.w, bottomH);

  ctx.save();
  ctx.translate(pipe.x + pipe.w / 2, pipe.topH / 2);
  ctx.scale(1, -1);
  ctx.drawImage(pipeImg, -pipe.w / 2, -pipe.topH / 2, pipe.w, pipe.topH);
  ctx.restore();
}

function drawNumber(n, x, y, size) {
  const str = String(n);
  let totalW = 0;
  const digits = [];

  for (const ch of str) {
    const img = IMG["n" + ch];
    const h = size;
    const w = (img.width / img.height) * h;

    digits.push({ img, w, h });
    totalW += w + scale(2);
  }

  totalW -= scale(2);

  let cx = x - totalW / 2;

  for (const d of digits) {
    ctx.drawImage(d.img, cx, y, d.w, d.h);
    cx += d.w + scale(2);
  }
}

function renderFrame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawTiled(IMG.bg, 0, canvas.height, baseX * 0.2);

  for (const p of pipes) drawPipe(p);

  const groundY = canvas.height - scale(110);
  drawTiled(IMG.base, groundY, scale(110), baseX);

  const frames = [IMG.bUp, IMG.bMid, IMG.bDown];
  const bImg = frames[bird.frame];

  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.r);

  const bw = scale(42);
  const bh = (bImg.height / bImg.width) * bw;

  ctx.drawImage(bImg, -bw / 2, -bh / 2, bw, bh);
  ctx.restore();

  if (!started && !gameOver) {
    const mw = scale(240);
    const mh = (IMG.msg.height / IMG.msg.width) * mw;

    ctx.drawImage(
      IMG.msg,
      canvas.width / 2 - mw / 2,
      canvas.height * 0.18,
      mw,
      mh
    );
  }

  drawNumber(score, canvas.width / 2, scale(18), scale(34));

  if (gameOver) {
    const ow = scale(240);
    const oh = (IMG.over.height / IMG.over.width) * ow;

    ctx.drawImage(
      IMG.over,
      canvas.width / 2 - ow / 2,
      canvas.height * 0.22,
      ow,
      oh
    );

    ctx.save();
    ctx.font = `${Math.max(12, Math.floor(scale(14)))}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.textAlign = "center";
    ctx.fillText("Tap/Space zum Neustart", canvas.width / 2, canvas.height * 0.62);
    ctx.restore();
  }
}

function update(dt) {
  const pipeSpeed = started ? scale(2.6) : scale(1.2);
  baseX += pipeSpeed;

  if (started && !gameOver) {
    bird.vy += scale(0.38);
    bird.y += bird.vy;
    bird.r = Math.max(-0.55, Math.min(1.1, bird.vy / scale(10)));
  } else {
    bird.frameT += dt;
    bird.y += Math.sin(bird.frameT / 250) * scale(0.12);
  }

  bird.frameT += dt;
  if (bird.frameT > 120) {
    bird.frameT = 0;
    bird.frame = (bird.frame + 1) % 3;
  }

  if (started && !gameOver) {
    for (const p of pipes) p.x -= pipeSpeed;

    const lastPipe = pipes[pipes.length - 1];
    if (lastPipe && lastPipe.x < canvas.width - scale(240)) {
      spawnPipe();
    }

    pipes = pipes.filter((p) => p.x + p.w > -scale(40));

    for (const p of pipes) {
      if (!p.passed && p.x + p.w < bird.x) {
        p.passed = true;
        score++;
        scoreText.textContent = String(score);
      }
    }
  }

  const groundY = canvas.height - scale(110);

  if (bird.y + scale(24) >= groundY) {
    bird.y = groundY - scale(24);
    if (started) endGame();
  }

  if (bird.y < 0) {
    bird.y = 0;
    bird.vy = 0;
  }

  if (started && !gameOver) {
    const birdBox = {
      x: bird.x - scale(18),
      y: bird.y - scale(14),
      w: scale(34),
      h: scale(28),
    };

    for (const p of pipes) {
      const topBox = { x: p.x, y: 0, w: p.w, h: p.topH };
      const bottomBox = {
        x: p.x,
        y: p.topH + p.gap,
        w: p.w,
        h: groundY - (p.topH + p.gap),
      };

      if (rectsOverlap(birdBox, topBox) || rectsOverlap(birdBox, bottomBox)) {
        endGame();
        break;
      }
    }
  }
}

function loop(now) {
  const dt = now - last;
  last = now;

  update(dt);
  renderFrame();

  rafId = requestAnimationFrame(loop);
}

// ===============================
// Helpers
// ===============================
function sanitizeName(name) {
  if (typeof name !== "string") return null;
  const clean = name.trim();
  if (clean.length < 2 || clean.length > 20) return null;
  if (!/^[a-zA-Z0-9 äöüÄÖÜß._-]+$/.test(clean)) return null;
  return clean;
}

// ===============================
// Events
// ===============================
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    flap();
  }
});

canvas.addEventListener("pointerdown", () => flap());

restartBtn.addEventListener("click", () => {
  closeModal(saveScoreModal);
  resetGame();
});

// Help modal
openHelpBtn.addEventListener("click", () => openModal(helpModal));
closeHelpBtn.addEventListener("click", () => closeModal(helpModal));
helpModal.addEventListener("click", (e) => {
  if (e.target === helpModal) closeModal(helpModal);
});

// Leaderboard modal
openLeaderboardBtn.addEventListener("click", async () => {
  openModal(leaderboardModal);
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
// Start
// ===============================
(async function init() {
  try {
    await loadAssets();
    await loadLeaderboard();
    resetGame();

    rafId = requestAnimationFrame(loop);
  } catch (e) {
    console.error(e);
    headline.textContent = "Fehler: Assets nicht gefunden";
  }
})();