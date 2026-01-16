// ===============================
// Startseite: Top 3 Highscores laden + Medaillen
// ===============================

// WICHTIG: Passe diese 3 GET-Endpoints an deine echten Functions an,
// falls deine Dateinamen anders heissen.
const API_GUESS_GET = "/.netlify/functions/get-scores";
const API_HANGMAN_GET = "/.netlify/functions/hangman-get-scores";
const API_SNAKE_GET = "/.netlify/functions/snake-get-scores";

const MEDALS = ["🥇", "🥈", "🥉"];

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderTop3(listEl, rows, valueKey, suffix) {
  listEl.innerHTML = "";

  const safe = Array.isArray(rows) ? rows : [];

  if (safe.length === 0) {
    listEl.innerHTML = "<li>—</li>";
    return;
  }

  safe.slice(0, 3).forEach((r, i) => {
    const name = escapeHtml(r?.name ?? "—");
    const val = Number(r?.[valueKey]);
    const valueText = Number.isFinite(val) ? `${val} ${suffix}` : "";

    const li = document.createElement("li");
    li.innerHTML = `
      <span class="medal">${MEDALS[i]}</span>
      <span class="player">${name}</span>
      <span class="value">${valueText}</span>
    `;
    listEl.appendChild(li);
  });
}

async function loadOne(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`Fetch failed: ${url}`);
  return r.json();
}

async function loadHomeHighscores() {
  const guessEl = document.getElementById("homeGuessTop3");
  const hangmanEl = document.getElementById("homeHangmanTop3");
  const snakeEl = document.getElementById("homeSnakeTop3");

  if (!guessEl || !hangmanEl || !snakeEl) return;

  try {
    const [guessRows, hangmanRows, snakeRows] = await Promise.all([
      loadOne(API_GUESS_GET),
      loadOne(API_HANGMAN_GET),
      loadOne(API_SNAKE_GET),
    ]);

    // Guess: tries
    renderTop3(guessEl, guessRows, "tries", "Vers.");

    // Hangman: wenn du aktuell score=Wörter nutzt:
    // -> valueKey = "score"
    // Falls du noch wrong nutzt, dann: valueKey="wrong" und suffix="Fehler"
    renderTop3(hangmanEl, hangmanRows, "score", "Wörter");

    // Snake: score
    renderTop3(snakeEl, snakeRows, "score", "Pkt.");
  } catch (e) {
    // Fallback bei Fehlern
    guessEl.innerHTML = "<li>Fehler beim Laden</li>";
    hangmanEl.innerHTML = "<li>Fehler beim Laden</li>";
    snakeEl.innerHTML = "<li>Fehler beim Laden</li>";
    console.warn(e);
  }
}

document.addEventListener("DOMContentLoaded", loadHomeHighscores);
