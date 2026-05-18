// ===============================
// Flappy Bird (Canvas) – mit echten Assets
// OHNE Sounds
// Design: passt zu deinem MAIT Style
// ===============================

const ASSET_BASE = "./public/flappy/";

// ===============================
// DOM
// ===============================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreText = document.getElementById("scoreText");
const bestText = document.getElementById("bestText");
const statusText = document.getElementById("statusText");
const restartBtn = document.getElementById("restartBtn");
const headline = document.getElementById("headline");

// Highscore Modal
const saveScoreModal = document.getElementById("saveScoreModal");
const winText = document.getElementById("winText");
const winnerNameInput = document.getElementById("winnerName");
const saveScoreBtn = document.getElementById("saveScoreBtn");
const skipSaveBtn = document.getElementById("skipSaveBtn");

const STORAGE_WINNER = "flappy_winnerName";

// ===============================
// Responsive Canvas
// ===============================

function resizeCanvas() {
  const maxW = 520;
  const parentW = canvas.parentElement.clientWidth;

  const w = Math.min(maxW, parentW);

  canvas.width = Math.floor(w);

  // hochkant
  canvas.height = Math.floor(w * 1.25);
}

resizeCanvas();

window.addEventListener("resize", resizeCanvas);

// ===============================
// Assets
// ===============================

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

// ===============================
// Helpers
// ===============================

function scale(v) {
  return (v * canvas.width) / 520;
}

// ===============================
// State
// ===============================

let started = false;
let gameOver = false;

let score = 0;
let finalScore = 0;

let best = Number(localStorage.getItem("flappy_best") || "0");

bestText.textContent = String(best);

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

// ===============================
// Reset
// ===============================

function resetGame() {
  started = false;
  gameOver = false;

  score = 0;

  scoreText.textContent = "0";
  statusText.textContent = "Ready";
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

// ===============================
// Pipes
// ===============================

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

// ===============================
// Physics
// ===============================

function flap() {
  if (gameOver) {
    const modalOpen = saveScoreModal?.classList.contains("show");

    if (!modalOpen) {
      resetGame();
    }

    return;
  }

  if (!started) {
    started = true;

    statusText.textContent = "Go!";
    headline.textContent = "Let’s go! 🐦";
  }

  bird.vy = -scale(7.5);
}

// ===============================
// Collision
// ===============================

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

// ===============================
// END GAME
// ===============================

function endGame() {
  if (gameOver) return;

  gameOver = true;

  // Score sichern, bevor irgendetwas resettet wird
  finalScore = score;

  statusText.textContent = "Game Over";
  headline.textContent = "💀 Game Over!";

  if (finalScore > best) {
    best = finalScore;
    localStorage.setItem("flappy_best", String(best));
    bestText.textContent = String(best);
  }

  openSaveModal();
}

// ===============================
// Save Modal
// ===============================

function openSaveModal() {
  if (!saveScoreModal) return;

  if (winText) {
    winText.textContent = `Du hast ${finalScore} Punkte erreicht.`;
  }

  winnerNameInput.value = localStorage.getItem(STORAGE_WINNER) || "";

  saveScoreModal.classList.add("show");

  setTimeout(() => {
    winnerNameInput.focus();
  }, 0);
}

function closeSaveModal() {
  saveScoreModal.classList.remove("show");
}

// ===============================
// Highscore API
// ===============================

function sanitizeName(name) {
  if (typeof name !== "string") return null;

  const clean = name.trim();

  if (clean.length < 2 || clean.length > 20) {
    return null;
  }

  if (!/^[a-zA-Z0-9 äöüÄÖÜß._-]+$/.test(clean)) {
    return null;
  }

  return clean;
}

async function submitScore(name, scoreValue) {
  try {
    const res = await fetch("/.netlify/functions/flappy-submit-score", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        name,
        score: scoreValue,
      }),
    });

    return res.ok;
  } catch (e) {
    console.error(e);
    return false;
  }
}

// ===============================
// Draw Helpers
// ===============================

function drawTiled(img, y, h, xOffset) {
  const scaleY = h / img.height;

  const drawH = h;
  const drawW = img.width * scaleY;

  let x = -((xOffset % drawW) + drawW);

  while (x < canvas.width + drawW) {
    ctx.drawImage(img, x, y, drawW, drawH);

    x += drawW;
  }
}

function drawPipe(pipe) {
  const pipeImg = IMG.pipe;

  const bottomY = pipe.topH + pipe.gap;

  const bottomH = canvas.height - scale(110) - bottomY;

  // unten
  ctx.drawImage(pipeImg, pipe.x, bottomY, pipe.w, bottomH);

  // oben
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

    digits.push({
      img,
      w,
      h,
    });

    totalW += w + scale(2);
  }

  totalW -= scale(2);

  let cx = x - totalW / 2;

  for (const d of digits) {
    ctx.drawImage(d.img, cx, y, d.w, d.h);

    cx += d.w + scale(2);
  }
}

// ===============================
// Loop
// ===============================

let last = performance.now();

function update(dt) {
  const pipeSpeed = started ? scale(2.6) : scale(1.2);

  baseX += pipeSpeed;

  // Bird
  if (started && !gameOver) {
    bird.vy += scale(0.38);

    bird.y += bird.vy;

    bird.r = Math.max(-0.55, Math.min(1.1, bird.vy / scale(10)));
  } else {
    bird.frameT += dt;

    bird.y += Math.sin(bird.frameT / 250) * scale(0.12);
  }

  // Animate
  bird.frameT += dt;

  if (bird.frameT > 120) {
    bird.frameT = 0;

    bird.frame = (bird.frame + 1) % 3;
  }

  // Pipes
  if (started && !gameOver) {
    for (const p of pipes) {
      p.x -= pipeSpeed;
    }

    const lastPipe = pipes[pipes.length - 1];

    if (lastPipe && lastPipe.x < canvas.width - scale(240)) {
      spawnPipe();
    }

    pipes = pipes.filter((p) => p.x + p.w > -scale(40));

    // Score
    for (const p of pipes) {
      if (!p.passed && p.x + p.w < bird.x) {
        p.passed = true;

        score++;

        scoreText.textContent = String(score);
      }
    }
  }

  // Bounds
  const groundY = canvas.height - scale(110);

  // Boden
  if (bird.y + scale(24) >= groundY) {
    bird.y = groundY - scale(24);

    if (started) {
      endGame();
    }
  }

  // Decke
  if (bird.y < 0) {
    bird.y = 0;
    bird.vy = 0;
  }

  // Pipes Collision
  if (started && !gameOver) {
    const birdBox = {
      x: bird.x - scale(18),
      y: bird.y - scale(14),
      w: scale(34),
      h: scale(28),
    };

    for (const p of pipes) {
      const topBox = {
        x: p.x,
        y: 0,
        w: p.w,
        h: p.topH,
      };

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

// ===============================
// Render
// ===============================

function render() {
  // BG
  drawTiled(IMG.bg, 0, canvas.height, baseX * 0.2);

  // Pipes
  for (const p of pipes) {
    drawPipe(p);
  }

  // Base
  const groundY = canvas.height - scale(110);

  drawTiled(IMG.base, groundY, scale(110), baseX);

  // Bird
  const frames = [IMG.bUp, IMG.bMid, IMG.bDown];

  const bImg = frames[bird.frame];

  ctx.save();

  ctx.translate(bird.x, bird.y);

  ctx.rotate(bird.r);

  const bw = scale(42);

  const bh = (bImg.height / bImg.width) * bw;

  ctx.drawImage(bImg, -bw / 2, -bh / 2, bw, bh);

  ctx.restore();

  // Start Message
  if (!started && !gameOver) {
    const mw = scale(240);

    const mh = (IMG.msg.height / IMG.msg.width) * mw;

    ctx.drawImage(
      IMG.msg,
      canvas.width / 2 - mw / 2,
      canvas.height * 0.18,
      mw,
      mh,
    );
  }

  // Score
  drawNumber(score, canvas.width / 2, scale(18), scale(34));

  // Game Over
  if (gameOver) {
    const ow = scale(240);

    const oh = (IMG.over.height / IMG.over.width) * ow;

    ctx.drawImage(
      IMG.over,
      canvas.width / 2 - ow / 2,
      canvas.height * 0.22,
      ow,
      oh,
    );

    ctx.save();

    ctx.font = `${Math.max(
      12,
      Math.floor(scale(14)),
    )}px Inter, system-ui, sans-serif`;

    ctx.fillStyle = "rgba(255,255,255,0.9)";

    ctx.textAlign = "center";

    ctx.fillText(
      "Tap/Space zum Neustart",
      canvas.width / 2,
      canvas.height * 0.62,
    );

    ctx.restore();
  }
}

// ===============================
// Main Loop
// ===============================

function loop(now) {
  const dt = now - last;

  last = now;

  update(dt);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  render();

  requestAnimationFrame(loop);
}

// ===============================
// Input
// ===============================

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();

    flap();
  }
});

canvas.addEventListener("pointerdown", () => flap());

restartBtn.addEventListener("click", () => resetGame());

// ===============================
// Modal Events
// ===============================

saveScoreBtn?.addEventListener("click", async () => {
  const name = sanitizeName(winnerNameInput.value);

  if (!name) {
    headline.textContent = "Bitte gültigen Namen eingeben.";

    return;
  }

  localStorage.setItem(STORAGE_WINNER, name);

  const ok = await submitScore(name, finalScore);

  if (ok) {
    headline.textContent = "Highscore gespeichert ✅";

    closeSaveModal();
  } else {
    headline.textContent = "Fehler beim Speichern 😕";
  }
});

skipSaveBtn?.addEventListener("click", () => closeSaveModal());

saveScoreModal?.addEventListener("click", (e) => {
  if (e.target === saveScoreModal) {
    closeSaveModal();
  }
});

// ===============================
// Start
// ===============================

(async function init() {
  try {
    statusText.textContent = "Loading…";

    await loadAssets();

    statusText.textContent = "Ready";

    resetGame();

    requestAnimationFrame(loop);
  } catch (e) {
    console.error(e);

    statusText.textContent = "Assets fehlen ❌";

    headline.textContent = "Fehler: Assets nicht gefunden";
  }
})();
