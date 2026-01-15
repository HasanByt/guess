// ===============================
// Hangman Game
// Online Leaderboard (Netlify)
// Gleiche UX & Sprache wie guess.js
// ===============================

// API (Netlify Functions)
const API_GET = "/.netlify/functions/hangman-get-scores";
const API_POST = "/.netlify/functions/hangman-submit-score";

// Konfetti
let jsConfetti = null;

// Wörter
const WORDS = [
  "haus",
  "schule",
  "musik",
  "urlaub",
  "kaffee",
  "internet",
  "freund",
  "familie",
  "arbeit",
  "natur",
  "lernen",
  "spielen",
  "reisen",
  "sport",
  "wissen",
  "geheimnis",
  "abenteuer",
  "freiheit",
  "zukunft",
  "kreativ",
];

const MAX_WRONG = 6;

// ===== DOM =====
const headline = document.getElementById("headline");

const wordDisplay = document.getElementById("wordDisplay");
const letterInput = document.getElementById("letterInput");
const guessBtn = document.getElementById("guessBtn");
const newGameBtn = document.getElementById("newGameBtn");

const usedLettersEl = document.getElementById("usedLetters");
const statusTextEl = document.getElementById("statusText");

const wrongCountEl = document.getElementById("wrongCount");
const maxWrongEl = document.getElementById("maxWrong");
const wordLenEl = document.getElementById("wordLen");

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

// Save score modal
const saveScoreModal = document.getElementById("saveScoreModal");
const winText = document.getElementById("winText");
const winnerNameInput = document.getElementById("winnerName");
const skipSaveBtn = document.getElementById("skipSaveBtn");
const saveScoreBtn = document.getElementById("saveScoreBtn");

if (maxWrongEl) maxWrongEl.textContent = String(MAX_WRONG);

// Name merken
const STORAGE_WINNER = "hangman_winnerName";
winnerNameInput.value = localStorage.getItem(STORAGE_WINNER) || "";

// ===== Game State =====
let secret = "";
let guessed = new Set();
let wrong = 0;
let done = false;
let winHandled = false;

// ===============================
// Game Logic
// ===============================
function pickWord() {
  return WORDS[Math.floor(Math.random() * WORDS.length)].toLowerCase();
}

function render() {
  const shown = secret
    .split("")
    .map((ch) => (guessed.has(ch) ? ch.toUpperCase() : "_"))
    .join(" ");

  wordDisplay.textContent = shown;
  wrongCountEl.textContent = String(wrong);
  wordLenEl.textContent = String(secret.length);

  const used = Array.from(guessed).sort().join(", ").toUpperCase();
  usedLettersEl.textContent = `Benutzte Buchstaben: ${used || "—"}`;

  const isWin = secret.split("").every((ch) => guessed.has(ch));
  const isLose = wrong >= MAX_WRONG;

  if (isWin) {
    done = true;
    statusTextEl.textContent = "Status: ✅ Gewonnen!";
    headline.textContent = "Du hast gewonnen!!! 🎉🥳🎊";

    // 🎉 Konfetti (wie Guess)
    if (!jsConfetti && typeof JSConfetti !== "undefined") {
      jsConfetti = new JSConfetti();
    }
    jsConfetti?.addConfetti();

    if (!winHandled) {
      winHandled = true;
      openSaveModal();
    }
  } else if (isLose) {
    done = true;
    statusTextEl.textContent = `Status: ❌ Verloren! Wort war: ${secret.toUpperCase()}`;
    headline.textContent = "Schade 😕 Versuch es nochmal!";
  } else {
    statusTextEl.textContent = "Status: —";
  }

  letterInput.disabled = done;
  guessBtn.disabled = done;

  if (!done) letterInput.focus();
}

function startGame() {
  secret = pickWord();
  guessed = new Set();
  wrong = 0;
  done = false;
  winHandled = false;

  headline.textContent = "🪢 Galgenmännchen";
  letterInput.value = "";

  render();
}

function guessLetter() {
  if (done) return;

  const raw = (letterInput.value || "").toLowerCase().trim();
  letterInput.value = "";

  if (!/^[a-z]$/.test(raw)) {
    headline.textContent = "Bitte genau einen Buchstaben (a-z) eingeben.";
    letterInput.focus();
    return;
  }

  if (guessed.has(raw)) {
    headline.textContent = "Diesen Buchstaben hast du schon benutzt.";
    letterInput.focus();
    return;
  }

  guessed.add(raw);

  if (!secret.includes(raw)) {
    wrong++;
    headline.textContent = "Leider falsch 😐";
  } else {
    headline.textContent = "Nice 🙂";
  }

  render();
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
  winText.textContent = `Du hast das Wort mit ${wrong} Fehler(n) erraten. Willst du speichern?`;
  saveScoreModal.classList.add("show");
  setTimeout(() => winnerNameInput.focus(), 0);
}

// ===============================
// API
// ===============================
async function submitScore(name, wrongCount) {
  try {
    const res = await fetch(API_POST, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, wrong: wrongCount }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      headline.textContent = `Fehler beim Speichern: ${
        err.error || res.status
      }`;
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
    if (!res.ok) throw new Error();

    const rows = await res.json();
    renderLeaderboard(rows);
  } catch {
    leaderboardEl.innerHTML = "<li>Server nicht erreichbar 😕</li>";
    top3El.innerHTML = "";
  }
}

// ===============================
// Leaderboard Rendering
// ===============================
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
      <div class="tries">${entry ? `${entry.wrong} Fehler` : ""}</div>
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

  rows.slice(3).forEach((r) => {
    const li = document.createElement("li");
    li.textContent = `${r.name} — ${r.wrong} Fehler`;

    if (myName && r.name === myName) {
      li.classList.add("highlight");
    }

    leaderboardEl.appendChild(li);
  });
}

// ===============================
// Helpers
// ===============================
function sanitizeName(name) {
  if (typeof name !== "string") return null;
  const clean = name.trim();
  if (clean.length < 2 || clean.length > 20) return null;
  if (!/^[a-zA-Z0-9 äöüÄÖÜss._-]+$/.test(clean)) return null;
  return clean;
}

// ===============================
// Events
// ===============================
guessBtn.addEventListener("click", guessLetter);
letterInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    guessLetter();
  }
});

newGameBtn.addEventListener("click", startGame);

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
closeLeaderboardBtn.addEventListener("click", () =>
  closeModal(leaderboardModal)
);
leaderboardModal.addEventListener("click", (e) => {
  if (e.target === leaderboardModal) closeModal(leaderboardModal);
});

// Save modal
saveScoreBtn.addEventListener("click", async () => {
  const name = sanitizeName(winnerNameInput.value);
  if (!name) {
    headline.textContent =
      "Bitte einen gültigen Namen eingeben (2-20 Zeichen).";
    winnerNameInput.focus();
    return;
  }

  localStorage.setItem(STORAGE_WINNER, name);

  const ok = await submitScore(name, wrong);
  if (ok) {
    closeModal(saveScoreModal);
    await loadLeaderboard();
  }
});

skipSaveBtn.addEventListener("click", () => closeModal(saveScoreModal));
saveScoreModal.addEventListener("click", (e) => {
  if (e.target === saveScoreModal) closeModal(saveScoreModal);
});

// Init
startGame();
