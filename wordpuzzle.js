// ===============================
// Word Puzzle (2:00 Timer)
// Score = gelöste Wörter in der Zeit
// Online Leaderboard (Netlify/Upstash)
// UX wie guess/hangman/snake
// ===============================

const API_GET = "/.netlify/functions/wordpuzzle-get-scores";
const API_POST = "/.netlify/functions/wordpuzzle-submit-score";

let jsConfetti = null;

// ===== Wörter =====
const WORDS = [
  // Alltag & Orte
  "schule","urlaub","kaffee","internet","freund","familie","arbeit","natur","lernen","spielen",
  "reisen","wissen","leben","mensch","stadt","zeit","wohnung","zimmer","kuche","garten","bahnhof",
  "flughafen","supermarkt","apotheke","krankenhaus","bibliothek","restaurant","hotel","museum","park",
  "strand","berge","wald","see","insel","bruecke","strasse","platz","zentrum","nachbar","kollege",

  // Freizeit & Hobbys
  "buch","lesen","malen","tanzen","kochen","essen","trinken","wandern","laufen","schwimmen",
  "radfahren","fotografieren","zeichnen","basteln","singen","gitarre","klavier","theater","konzert",
  "festival","kino","serie","podcast","spielplatz","training","fitness","yoga","meditation","schach",
  "karten","puzzle","camping","picknick","reiseplan","abenteuerlust",

  // Technik & Digital
  "computer","handy","software","hardware","browser","daten","server","cloud","passwort","programm",
  "netzwerk","download","upload","update","backup","kamera","mikrofon","tastatur","monitor","akku",
  "ladung","adapter","kabel","router","firewall","website","frontend","backend","datenbank","api",
  "projekt","debuggen","feature","release","version","code","script","editor","github","docker",

  // Gefuehle & Eigenschaften
  "freude","angst","hoffnung","mut","ruhe","stress","kreativ","neugierig","geduldig","ehrlich",
  "freundlich","hilfsbereit","staerke","vertrauen","respekt","liebe","glueck","traurigkeit","wut",
  "zweifel","energie","motivation","disziplin","fokus","balance","neid","stolz","scham","humor",

  // Abstrakt & spannend
  "geheimnis","freiheit","zukunft","entscheidung","erfahrung","entwicklung","verantwortung",
  "moeglichkeit","herausforderung","erfolg","niederlage","ziel","plan","strategie","chance","risiko",
  "idee","vision","projektarbeit","teamwork","kommunikation","loesung","problem","fortschritt",
  "geschichte","legende","mission","raetsel","entdeckung","revolution","innovation","abenteuer"
];


// ===== Settings =====
const ROUND_SECONDS = 120;

// ===== DOM =====
const headline = document.getElementById("headline");
const bestInfo = document.getElementById("bestInfo");

const timeText = document.getElementById("timeText");
const scoreText = document.getElementById("scoreText");

const scrambleText = document.getElementById("scrambleText");
const lenText = document.getElementById("lenText");

const answerInput = document.getElementById("answerInput");
const submitBtn = document.getElementById("submitBtn");

const startBtn = document.getElementById("startBtn");
const skipBtn = document.getElementById("skipBtn");
const restartBtn = document.getElementById("restartBtn");

const statusText = document.getElementById("statusText");

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
const STORAGE_WINNER = "wordpuzzle_winnerName";
winnerNameInput.value = localStorage.getItem(STORAGE_WINNER) || "";

// ===== State =====
let currentWord = "";
let currentScramble = "";
let score = 0;

let running = false;
let ended = false;

let remaining = ROUND_SECONDS;
let timerId = null;

// ===== Init =====
loadLeaderboard();
resetRound();
render();

// ===============================
// Helpers
// ===============================
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function pickWord() {
  return WORDS[Math.floor(Math.random() * WORDS.length)].toLowerCase();
}

function shuffleWord(word) {
  const arr = word.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join("");
}

function nextPuzzle() {
  currentWord = pickWord();
  currentScramble = shuffleWord(currentWord);

  // vermeiden, dass es identisch bleibt
  let guard = 0;
  while (currentScramble === currentWord && guard < 10) {
    currentScramble = shuffleWord(currentWord);
    guard++;
  }

  scrambleText.textContent = currentScramble.toUpperCase();
  lenText.textContent = String(currentWord.length);

  answerInput.value = "";
  answerInput.focus();
}

function setUIEnabled(enabled) {
  answerInput.disabled = !enabled;
  submitBtn.disabled = !enabled;
  skipBtn.disabled = !enabled;
}

// ===============================
// Round Logic
// ===============================
function resetRound() {
  score = 0;
  remaining = ROUND_SECONDS;

  running = false;
  ended = false;

  headline.textContent = "🧩 Word Puzzle";
  statusText.textContent = "Status: —";

  scoreText.textContent = "0";
  timeText.textContent = formatTime(remaining);

  stopTimer();
  setUIEnabled(false);

  currentWord = "";
  currentScramble = "";
  scrambleText.textContent = "—";
  lenText.textContent = "—";

  answerInput.value = "";
}

function startRound() {
  if (ended) resetRound();
  if (running) return;

  running = true;
  ended = false;

  headline.textContent = "Los geht’s! 🧩";
  statusText.textContent = "Status: Runde läuft…";

  setUIEnabled(true);
  nextPuzzle();
  startTimer();
}

function endRound() {
  running = false;
  ended = true;

  setUIEnabled(false);
  stopTimer();

  headline.textContent = "⏱️ Zeit vorbei!";
  statusText.textContent = `Status: Score: ${score}`;

  if (typeof JSConfetti !== "undefined") {
    if (!jsConfetti) jsConfetti = new JSConfetti();
    if (score >= 5) jsConfetti.addConfetti();
  }

  openSaveModal();
}

function startTimer() {
  stopTimer();
  timerId = setInterval(() => {
    if (!running || ended) return;

    remaining--;
    timeText.textContent = formatTime(Math.max(0, remaining));

    if (remaining <= 0) {
      endRound();
    }
  }, 1000);
}

function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
}

// ===============================
// Gameplay
// ===============================
function submitAnswer() {
  if (!running || ended) return;

  const raw = (answerInput.value || "").trim().toLowerCase();
  answerInput.value = "";

  if (!raw) {
    statusText.textContent = "Status: Bitte ein Wort eingeben.";
    answerInput.focus();
    return;
  }

  // nur a-z + (optional) äöüß? -> wir verwenden Wörter ohne
  if (!/^[a-z]+$/.test(raw)) {
    statusText.textContent = "Status: Bitte nur Buchstaben (a-z).";
    answerInput.focus();
    return;
  }

  if (raw === currentWord) {
    score++;
    scoreText.textContent = String(score);
    statusText.textContent = "Status: ✅ Richtig!";
    if (jsConfetti) jsConfetti.addConfetti();
    nextPuzzle();
  } else {
    statusText.textContent = "Status: ❌ Falsch!";
    answerInput.focus();
  }
}

function skipPuzzle() {
  if (!running || ended) return;
  statusText.textContent = "Status: Übersprungen.";
  nextPuzzle();
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
  winText.textContent = `Dein Score: ${score} Wort/Wörter in 2:00 Minuten. Speichern?`;
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

  const rest = rows.slice(3);
  if (rest.length === 0) {
    const li = document.createElement("li");
    li.textContent = "—";
    leaderboardEl.appendChild(li);
    return;
  }

  for (const r of rest) {
    const li = document.createElement("li");
    li.textContent = `${r.name} — ${r.score} Wörter`;

    if (myName && r.name === myName) li.classList.add("highlight");
    leaderboardEl.appendChild(li);
  }
}

function sanitizeName(name) {
  if (typeof name !== "string") return null;
  const clean = name.trim();
  if (clean.length < 2 || clean.length > 20) return null;
  if (!/^[a-zA-Z0-9 äöüÄÖÜß._-]+$/.test(clean)) return null;
  return clean;
}

function render() {
  timeText.textContent = formatTime(remaining);
  scoreText.textContent = String(score);
}

// ===============================
// Events
// ===============================
startBtn.addEventListener("click", startRound);
restartBtn.addEventListener("click", () => {
  resetRound();
  startRound();
});
skipBtn.addEventListener("click", skipPuzzle);

submitBtn.addEventListener("click", submitAnswer);
answerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    submitAnswer();
  }
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
