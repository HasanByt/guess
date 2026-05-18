// ===============================
// Flappy Bird Highscore FIX
// COPY PASTE
// ===============================

// ===== API =====
const API_POST = "/.netlify/functions/flappy-submit-score";

// ===== Save Score Modal =====
const saveScoreModal = document.getElementById("saveScoreModal");
const finalScoreText = document.getElementById("finalScoreText");
const winnerNameInput = document.getElementById("winnerName");
const saveScoreBtn = document.getElementById("saveScoreBtn");
const skipSaveBtn = document.getElementById("skipSaveBtn");

const STORAGE_WINNER = "flappy_winnerName";

if (winnerNameInput) {
  winnerNameInput.value =
    localStorage.getItem(STORAGE_WINNER) || "";
}

// ===============================
// END GAME REPLACE
// ===============================

function endGame() {
  if (gameOver) return;

  gameOver = true;

  statusText.textContent = "Game Over";
  headline.textContent = "💀 Game Over!";

  if (score > best) {
    best = score;

    localStorage.setItem(
      "flappy_best",
      String(best)
    );

    bestText.textContent = String(best);
  }

  openSaveModal();
}

// ===============================
// SAVE MODAL
// ===============================

function openSaveModal() {
  if (!saveScoreModal) return;

  if (finalScoreText) {
    finalScoreText.textContent = String(score);
  }

  saveScoreModal.classList.add("show");

  setTimeout(() => {
    winnerNameInput?.focus();
  }, 0);
}

function closeSaveModal() {
  saveScoreModal?.classList.remove("show");
}

// ===============================
// SUBMIT SCORE
// ===============================

async function submitScore(name, scoreValue) {
  try {
    const res = await fetch(API_POST, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        score: scoreValue,
      }),
    });

    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({}));

      headline.textContent =
        `Fehler beim Speichern: ${
          err.error || res.status
        }`;

      return false;
    }

    headline.textContent =
      "Highscore gespeichert ✅";

    return true;
  } catch {
    headline.textContent =
      "Server nicht erreichbar 😕";

    return false;
  }
}

// ===============================
// NAME VALIDATION
// ===============================

function sanitizeName(name) {
  if (typeof name !== "string") {
    return null;
  }

  const clean = name.trim();

  if (clean.length < 2 || clean.length > 20) {
    return null;
  }

  if (
    !/^[a-zA-Z0-9 äöüÄÖÜß._-]+$/.test(clean)
  ) {
    return null;
  }

  return clean;
}

// ===============================
// EVENTS
// ===============================

saveScoreBtn?.addEventListener(
  "click",
  async () => {
    const name = sanitizeName(
      winnerNameInput.value
    );

    if (!name) {
      headline.textContent =
        "Bitte gültigen Namen eingeben.";

      winnerNameInput.focus();

      return;
    }

    localStorage.setItem(
      STORAGE_WINNER,
      name
    );

    const ok = await submitScore(
      name,
      score
    );

    if (ok) {
      closeSaveModal();
    }
  }
);

skipSaveBtn?.addEventListener(
  "click",
  () => {
    closeSaveModal();
  }
);

saveScoreModal?.addEventListener(
  "click",
  (e) => {
    if (e.target === saveScoreModal) {
      closeSaveModal();
    }
  }
);