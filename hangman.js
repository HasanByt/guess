// ===============================
// Hangman Game (Endless Run)
// Score = geschaffte Wörter
// Spiel endet erst bei 6 Fehlern gesamt
// Online Leaderboard (Netlify) – UX wie guess.js
// ===============================

// API (Netlify Functions)
const API_GET = "/.netlify/functions/hangman-get-scores";
const API_POST = "/.netlify/functions/hangman-submit-score";

// Konfetti
let jsConfetti = null;

// Wörter
const WORDS = [
  // Alltag
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
  "leben",
  "mensch",
  "stadt",
  "land",
  "zeit",

  // Freizeit & Lifestyle
  "kino",
  "buch",
  "lesen",
  "malen",
  "tanzen",
  "kochen",
  "essen",
  "trinken",
  "spazieren",
  "wandern",
  "spielen",
  "lachen",
  "denken",

  // Technik & Digital
  "computer",
  "handy",
  "software",
  "hardware",
  "browser",
  "daten",
  "server",
  "cloud",
  "passwort",
  "programm",

  // Gefühle & Eigenschaften
  "freude",
  "angst",
  "hoffnung",
  "mut",
  "ruhe",
  "stress",
  "kreativ",
  "neugierig",
  "geduldig",
  "ehrlich",

  // Abstrakt & spannend
  "geheimnis",
  "abenteuer",
  "freiheit",
  "zukunft",
  "entscheidung",
  "erfahrung",
  "entwicklung",
  "verantwortung",
  "moeglichkeit",
  "herausforderung",
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

// Optional (wenn du es in der HTML ergänzt):
// <span id="scoreWords">0</span>
const scoreWordsEl = document.getElementById("scoreWords");

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

// ===== Run State =====
let secret = "";
let guessed = new Set();

// global über die ganze Runde
let wrongTotal = 0;

// Score: geschaffte Wörter
let scoreWords = 0;

// Status
let done = false; // true nur bei GameOver
let wordLocked = false; // kurzer Lock beim Wort-Übergang

// ===============================
// Game Logic
// ===============================
function pickWord() {
  return WORDS[Math.floor(Math.random() * WORDS.length)].toLowerCase();
}

function startNewWord() {
  secret = pickWord();
  guessed = new Set();
  wordLocked = false;

  letterInput.value = "";
  render();
}

function startRun() {
  wrongTotal = 0;
  scoreWords = 0;
  done = false;
  wordLocked = false;

  if (scoreWordsEl) scoreWordsEl.textContent = String(scoreWords);

  headline.textContent = "🪢 Galgenmännchen";
  statusTextEl.textContent = "Status: —";

  startNewWord();
}

function render() {
  const shown = secret
    .split("")
    .map((ch) => (guessed.has(ch) ? ch.toUpperCase() : "_"))
    .join(" ");

  wordDisplay.textContent = shown;
  wrongCountEl.textContent = String(wrongTotal);
  wordLenEl.textContent = String(secret.length);

  const used = Array.from(guessed).sort().join(", ").toUpperCase();
  usedLettersEl.textContent = `Benutzte Buchstaben: ${used || "—"}`;

  const isWin = secret.split("").every((ch) => guessed.has(ch));
  const isLose = wrongTotal >= MAX_WRONG;

  if (isLose) {
    done = true;
    statusTextEl.textContent = `Status: ❌ Game Over! Score: ${scoreWords}`;
    headline.textContent = "💀 Game Over!";
    openSaveModal(); // speichern erst am Ende
  } else if (isWin) {
    // Wort geschafft -> Score +1, nächstes Wort
    scoreWords++;
    if (scoreWordsEl) scoreWordsEl.textContent = String(scoreWords);

    statusTextEl.textContent = `Status: ✅ Wort geschafft! Score: ${scoreWords}`;
    headline.textContent = "Nice! ✅ Neues Wort...";

    // 🎉 Konfetti (wie Guess) beim Wort geschafft
    if (!jsConfetti && typeof JSConfetti !== "undefined") {
      jsConfetti = new JSConfetti();
    }
    jsConfetti?.addConfetti();

    // kurzer Übergang
    wordLocked = true;
    letterInput.disabled = true;
    guessBtn.disabled = true;

    setTimeout(() => {
      if (!done) startNewWord();
    }, 650);

    return;
  } else {
    statusTextEl.textContent = `Status: Score: ${scoreWords}`;
  }

  // Eingabe sperren nur bei GameOver oder Übergang
  const disabled = done || wordLocked;
  letterInput.disabled = disabled;
  guessBtn.disabled = disabled;

  if (!disabled) letterInput.focus();
}

function guessLetter() {
  if (done || wordLocked) return;

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
    wrongTotal++;
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
  // Save-Modal nur bei GameOver
  winText.textContent = `Run beendet. Score: ${scoreWords} geschaffte Wort/Wörter. Willst du speichern?`;
  saveScoreModal.classList.add("show");
  setTimeout(() => winnerNameInput.focus(), 0);
}

// ===============================
// API
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
      <div class="tries">${entry ? `${entry.score} Wörter` : ""}</div>
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
    li.textContent = `${r.name} — ${r.score} Wörter`;

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
  // FIX: ß statt "ss" in der Regex
  if (!/^[a-zA-Z0-9 äöüÄÖÜß._-]+$/.test(clean)) return null;
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

// "Neues Wort" wird jetzt "Neue Runde"
newGameBtn.addEventListener("click", startRun);

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

  const ok = await submitScore(name, scoreWords);
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
startRun();
