// ===============================
// Number Guessing Game
// Online Leaderboard (Netlify)
// Top3 Cards + Highlight + Warm/Kalt
// ===============================

let numberToGuess = Math.floor(Math.random() * 101); // 0 - 100
let tries = 0;
let lastWinTries = null;
let lastGuess = null;

// ===== DOM =====
const headline = document.getElementById("headline");
const bestInfo = document.getElementById("bestInfo");
const displayTries = document.getElementById("displayTries");
const myNumber = document.getElementById("myNumber");
const form = document.getElementById("guessForm");

// Leaderboard Modal
const openLeaderboardBtn = document.getElementById("openLeaderboardBtn");
const closeLeaderboardBtn = document.getElementById("closeLeaderboardBtn");
const leaderboardModal = document.getElementById("leaderboardModal");
const leaderboardEl = document.getElementById("leaderboard");
const top3El = document.getElementById("top3");

// Save Score Modal (nach Gewinn)
const saveScoreModal = document.getElementById("saveScoreModal");
const winnerNameInput = document.getElementById("winnerName");
const winText = document.getElementById("winText");
const saveScoreBtn = document.getElementById("saveScoreBtn");
const skipSaveBtn = document.getElementById("skipSaveBtn");

// Warm/Kalt UI (optional, falls Element existiert)
const heatFill = document.getElementById("heatFill");
const heatText = document.getElementById("heatText");

// Name merken (für Highlight + Komfort)
const STORAGE_WINNER = "ngg_winnerName";
winnerNameInput.value = localStorage.getItem(STORAGE_WINNER) || "";

// Beim Start globales Leaderboard laden
loadLeaderboard();

// ===== Events =====
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  await guessTheNumber();
});

// Leaderboard Modal öffnen/schliessen
openLeaderboardBtn.addEventListener("click", async () => {
  leaderboardModal.classList.add("show");
  await loadLeaderboard();
});

closeLeaderboardBtn.addEventListener("click", () => {
  leaderboardModal.classList.remove("show");
});

leaderboardModal.addEventListener("click", (e) => {
  if (e.target === leaderboardModal) leaderboardModal.classList.remove("show");
});

// Save Modal Buttons
saveScoreBtn.addEventListener("click", async () => {
  const name = sanitizeName(winnerNameInput.value);
  if (!name) {
    headline.textContent = "Bitte einen gültigen Namen eingeben (2-20 Zeichen).";
    winnerNameInput.focus();
    return;
  }

  localStorage.setItem(STORAGE_WINNER, name);

  const ok = await submitScore(name, lastWinTries);
  if (ok) {
    closeSaveModal();
    await loadLeaderboard();
  }
});

skipSaveBtn.addEventListener("click", () => {
  closeSaveModal();
});

// Save Modal schliessen bei Klick auf Hintergrund
saveScoreModal.addEventListener("click", (e) => {
  if (e.target === saveScoreModal) closeSaveModal();
});

// ===============================
// Game Logic
// ===============================

async function guessTheNumber() {
  const guess = Number(myNumber.value);
  if (Number.isNaN(guess)) return;

  tries++;
  displayTries.textContent = `Versuche: ${tries}`;

  // Warm/Kalt anhand Distanz berechnen
  updateHeat(guess);

  if (guess === numberToGuess) {
    headline.textContent = "Du hast gewonnen!!! 🎉🥳🎊";

    const jsConfetti = new JSConfetti();
    jsConfetti.addConfetti();

    lastWinTries = tries;

    // Popup öffnen: Name eingeben + speichern optional
    openSaveModal();

    // Spiel resetten (direkt wieder spielbar)
    resetGame();
  } else if (guess < numberToGuess) {
    headline.textContent = "Die gesuchte Zahl ist grösser!";
  } else {
    headline.textContent = "Die gesuchte Zahl ist kleiner!";
  }

  lastGuess = guess;

  myNumber.value = "";
  myNumber.focus();
}

function resetGame() {
  numberToGuess = Math.floor(Math.random() * 101);
  tries = 0;
  lastGuess = null;
  displayTries.textContent = "Versuche: 0";
  myNumber.value = "";
  myNumber.focus();
  resetHeat();
}

function openSaveModal() {
  winText.textContent = `Du hast die Zahl in ${lastWinTries} Versuch(en) erraten. Willst du speichern?`;
  saveScoreModal.classList.add("show");
  setTimeout(() => winnerNameInput.focus(), 0);
}

function closeSaveModal() {
  saveScoreModal.classList.remove("show");
}

// ===============================
// Warm/Kalt
// ===============================

function resetHeat() {
  if (!heatFill || !heatText) return;
  heatFill.style.width = "0%";
  heatText.textContent = "—";
}

function updateHeat(guess) {
  if (!heatFill || !heatText) return;

  // Distanz 0..100 => Nähe 100..0
  const diff = Math.abs(numberToGuess - guess);
  const closeness = Math.max(0, 100 - diff); // 100 = perfekt, 0 = weit weg
  heatFill.style.width = `${closeness}%`;

  // Textstufen
  let label = "Eiskalt 🧊";
  if (diff === 0) label = "Perfekt! 🎯";
  else if (diff <= 3) label = "Brennend heiss 🔥";
  else if (diff <= 8) label = "Sehr warm 🌶️";
  else if (diff <= 15) label = "Warm 🙂";
  else if (diff <= 25) label = "Kühl 😐";

  heatText.textContent = label;
}

// ===============================
// API (Netlify Functions)
// ===============================

async function submitScore(name, triesCount) {
  try {
    const res = await fetch("/.netlify/functions/submit-score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, tries: triesCount }),
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
    const res = await fetch("/.netlify/functions/leaderboard");
    if (!res.ok) throw new Error("bad response");

    const rows = await res.json();
    renderLeaderboard(rows);

    const globalBest = rows?.[0]
      ? `Global: ${rows[0].name} (${rows[0].tries} Versuche)`
      : "Global: —";

    bestInfo.textContent = globalBest;
  } catch {
    bestInfo.textContent = "Global: —";
    if (leaderboardEl) leaderboardEl.innerHTML = "<li>Server nicht erreichbar 😕</li>";
    if (top3El) top3El.innerHTML = "";
  }
}

// ===============================
// Top3 Cards + Highlight
// ===============================

function renderLeaderboard(rows) {
  const myName = (localStorage.getItem(STORAGE_WINNER) || "").trim();

  // Top3 Cards
  if (top3El) {
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

      const rank = document.createElement("div");
      rank.className = "rank";
      rank.textContent = medals[i];

      const name = document.createElement("div");
      name.className = "name";
      name.textContent = entry ? entry.name : "—";

      const tries = document.createElement("div");
      tries.className = "tries";
      tries.textContent = entry ? `${entry.tries} Versuche` : " ";

      card.appendChild(rank);
      card.appendChild(name);
      card.appendChild(tries);
      top3El.appendChild(card);
    }
  }

  // Rest als Liste (ab Platz 4)
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
    li.textContent = `${r.name} — ${r.tries} Versuche`;

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
  if (!/^[a-zA-Z0-9 äöüÄÖÜss._-]+$/.test(clean)) return null;
  return clean;
}
