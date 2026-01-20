// ===============================
// Startseite: Top 3 Highscores pro Game
// ===============================

document.addEventListener("DOMContentLoaded", () => {
  loadAllHomeScores();
});

async function loadAllHomeScores() {
  await Promise.allSettled([
    loadTop3({
      url: "/.netlify/functions/leaderboard",
      elId: "homeGuessTop3",
      type: "guess",
    }),
    loadTop3({
      url: "/.netlify/functions/hangman-get-scores",
      elId: "homeHangmanTop3",
      type: "hangman",
    }),
    loadTop3({
      url: "/.netlify/functions/snake-get-scores",
      elId: "homeSnakeTop3",
      type: "snake",
    }),
    loadTop3({
      url: "/.netlify/functions/wordpuzzle-get-scores",
      elId: "homeWordPuzzleTop3",
      type: "wordpuzzle",
    }),
  ]);
}

async function loadTop3({ url, elId, type }) {
  const el = document.getElementById(elId);
  if (!el) return;

  el.innerHTML = "<li>Lade…</li>";

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const rows = await res.json();
    if (!Array.isArray(rows)) throw new Error("Response is not an array");

    renderTop3(el, rows, type);
  } catch (err) {
    console.error(`[HOME] ${type} failed`, url, err);
    el.innerHTML = "<li>Fehler beim Laden</li>";
  }
}

function renderTop3(el, rows, type) {
  const top = (rows || []).slice(0, 3);

  if (!top.length) {
    el.innerHTML = "<li>Noch keine Scores</li>";
    return;
  }

  const medals = ["🥇", "🥈", "🥉"];

  el.innerHTML = top
    .map((r, i) => {
      const name = (r?.name || "—").toString();

      let value = "—";

      if (type === "guess") {
        // guess: tries (oder score fallback)
        const tries = Number.isFinite(Number(r?.tries))
          ? Number(r.tries)
          : Number.isFinite(Number(r?.score))
          ? Number(r.score)
          : null;

        value = tries === null ? "—" : `${tries} Versuche`;
      } else if (type === "hangman") {
        // hangman: score (Wörter) oder wrong (Fehler)
        if (Number.isFinite(Number(r?.score))) value = `${Number(r.score)} Wörter`;
        else if (Number.isFinite(Number(r?.wrong))) value = `${Number(r.wrong)} Fehler`;
      } else if (type === "snake") {
        const s = Number.isFinite(Number(r?.score)) ? Number(r.score) : null;
        value = s === null ? "—" : `${s} Punkte`;
      } else if (type === "wordpuzzle") {
        const s = Number.isFinite(Number(r?.score)) ? Number(r.score) : null;
        value = s === null ? "—" : `${s} Wörter`;
      }

      return `<li>${medals[i]} ${escapeHtml(name)} — ${escapeHtml(value)}</li>`;
    })
    .join("");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
