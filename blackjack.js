// ===============================
// Blackjack Phase 1
// Highscore = höchstes erreichtes Guthaben
// Design & UX wie snake.js / guess.js / hangman.js
// ===============================

const API_GET = "/.netlify/functions/blackjack-get-scores";
const API_POST = "/.netlify/functions/blackjack-submit-score";

const START_BALANCE = 1000;

// ===== DOM =====
const headline = document.getElementById("headline");
const bestInfo = document.getElementById("bestInfo");

const balanceText = document.getElementById("balanceText");
const bestBalanceText = document.getElementById("bestBalanceText");

const dealerCardsEl = document.getElementById("dealerCards");
const playerCardsEl = document.getElementById("playerCards");

const dealerValueText = document.getElementById("dealerValueText");
const playerValueText = document.getElementById("playerValueText");

const betInput = document.getElementById("betInput");
const dealBtn = document.getElementById("dealBtn");
const hitBtn = document.getElementById("hitBtn");
const standBtn = document.getElementById("standBtn");
const doubleBtn = document.getElementById("doubleBtn");
const restartBtn = document.getElementById("restartBtn");
const statusText = document.getElementById("statusText");

const chipButtons = document.querySelectorAll(".chip-btn");
const cashoutBtn = document.getElementById("cashoutBtn");

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
const STORAGE_WINNER = "blackjack_winnerName";
winnerNameInput.value = localStorage.getItem(STORAGE_WINNER) || "";

// ===== Game State =====
let deck = [];
let playerCards = [];
let dealerCards = [];

let balance = START_BALANCE;
let bestBalance = START_BALANCE;
let currentBet = 0;

let roundActive = false;
let dealerHidden = true;
let saveOpened = false;

// ===== Init =====
loadLeaderboard();
resetGame();

// ===============================
// Cards
// ===============================
function createDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const newDeck = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      newDeck.push({ suit, rank });
    }
  }

  return shuffle(newDeck);
}

function shuffle(cards) {
  const arr = [...cards];

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

function drawCard() {
  if (deck.length < 12) deck = createDeck();
  return deck.pop();
}

function handValue(cards) {
  let value = 0;
  let aces = 0;

  for (const card of cards) {
    if (card.rank === "A") {
      value += 11;
      aces++;
    } else if (["K", "Q", "J"].includes(card.rank)) {
      value += 10;
    } else {
      value += Number(card.rank);
    }
  }

  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }

  return value;
}

function isBlackjack(cards) {
  return cards.length === 2 && handValue(cards) === 21;
}

function cardValue(card) {
  if (!card) return 0;
  if (card.rank === "A") return 11;
  if (["K", "Q", "J"].includes(card.rank)) return 10;
  return Number(card.rank);
}

// ===============================
// Game Logic
// ===============================
function resetGame() {
  deck = createDeck();
  playerCards = [];
  dealerCards = [];

  balance = START_BALANCE;
  bestBalance = START_BALANCE;
  currentBet = 0;

  roundActive = false;
  dealerHidden = true;
  saveOpened = false;

  headline.textContent = "🃏 Blackjack";
  statusText.textContent = "Status: Einsatz wählen und Deal drücken.";

  updateUI();
  setActionButtons(false);
}

function startRound() {
  if (roundActive) return;

  const bet = Number(betInput.value);

  if (!Number.isInteger(bet) || bet < 10) {
    statusText.textContent = "Status: Einsatz muss mindestens 10 CHF sein.";
    betInput.focus();
    return;
  }

  if (bet > balance) {
    statusText.textContent = "Status: Du kannst nicht mehr setzen als dein Guthaben.";
    betInput.focus();
    return;
  }

  currentBet = bet;
  roundActive = true;
  dealerHidden = true;

  playerCards = [drawCard(), drawCard()];
  dealerCards = [drawCard(), drawCard()];

  headline.textContent = "Deine Entscheidung?";
  statusText.textContent = "Status: Hit oder Stand?";

  setActionButtons(true);
  updateUI();

  if (isBlackjack(playerCards)) {
    setStatus(`Status: Blackjack! +${win} CHF`, "status-win");
  }
}

function hit() {
  if (!roundActive) return;

  playerCards.push(drawCard());

  if (handValue(playerCards) > 21) {
    setStatus(`Status: Bust! -${bet} CHF`, "status-lose");
    return;
  }

  updateUI();
}

async function stand() {
  if (!roundActive) return;

  dealerHidden = false;
  updateUI();

  setActionButtons(false);
  statusText.textContent = "Status: Dealer ist dran...";

  await sleep(500);

  while (handValue(dealerCards) < 17) {
    dealerCards.push(drawCard());
    updateUI();
    await sleep(650);
  }

  const player = handValue(playerCards);
  const dealer = handValue(dealerCards);

  if (dealer > 21) finishRound("dealerBust");
  else if (player > dealer) finishRound("playerWin");
  else if (player < dealer) finishRound("dealerWin");
  else finishRound("push");
}

async function doubleDown() {
  if (!roundActive) return;

  if (balance < currentBet * 2) {
    statusText.textContent =
      "Status: Zu wenig Guthaben für Double Down.";
    return;
  }

  currentBet *= 2;

  playerCards.push(drawCard());

  if (handValue(playerCards) > 21) {
    finishRound("playerBust");
    return;
  }

  await stand();
}

function finishRound(result) {
  roundActive = false;
  dealerHidden = false;
  setActionButtons(false);

  const bet = currentBet;

  if (result === "blackjack") {
    const win = Math.floor(bet * 1.5);
    balance += win;
    statusText.textContent = `Status: Blackjack! +${win} CHF`;
    headline.textContent = "Blackjack! 🎉";
  } else if (result === "playerBust") {
    balance -= bet;
    statusText.textContent = `Status: Bust! -${bet} CHF`;
    headline.textContent = "Bust! 😵";
  } else if (result === "dealerBust") {
    balance += bet;
    statusText.textContent = `Status: Dealer Bust! +${bet} CHF`;
    headline.textContent = "Gewonnen! ✅";
  } else if (result === "playerWin") {
    balance += bet;
    statusText.textContent = `Status: Gewonnen! +${bet} CHF`;
    headline.textContent = "Gewonnen! ✅";
  } else if (result === "dealerWin") {
    balance -= bet;
    statusText.textContent = `Status: Verloren! -${bet} CHF`;
    headline.textContent = "Verloren 😕";
  } else if (result === "push") {
    statusText.textContent = "Status: Push! Einsatz zurück.";
    headline.textContent = "Unentschieden.";
  }

  if (balance > bestBalance) {
    bestBalance = balance;
  }

  currentBet = 0;
  updateUI();

  if (balance <= 0) {
    balance = 0;
    updateUI();
    endGame();
  }
}

function endGame() {
  if (saveOpened) return;
  saveOpened = true;

  headline.textContent = "🏁 Spiel beendet";
  openSaveModal();
}

// ===============================
// UI
// ===============================
function updateUI() {
  balanceText.textContent = String(balance);
  bestBalanceText.textContent = String(bestBalance);

  dealerCardsEl.innerHTML = "";
  playerCardsEl.innerHTML = "";

  dealerCards.forEach((card, index) => {
    if (dealerHidden && index === 1) {
      dealerCardsEl.appendChild(createCardEl(null, true));
    } else {
      dealerCardsEl.appendChild(createCardEl(card));
    }
  });

  playerCards.forEach((card) => {
    playerCardsEl.appendChild(createCardEl(card));
  });

  dealerValueText.textContent =
    dealerHidden && dealerCards.length
      ? `${cardValue(dealerCards[0])} + ?`
      : dealerCards.length
      ? handValue(dealerCards)
      : "—";

  playerValueText.textContent = playerCards.length ? handValue(playerCards) : "—";
}

function createCardEl(card, hidden = false) {
  const div = document.createElement("div");
  div.className = "blackjack-card";

  if (hidden) {
    div.classList.add("hidden-card");
    div.textContent = "★";
    return div;
  }

  const red = card.suit === "♥" || card.suit === "♦";
  if (red) div.classList.add("red-card");

  div.innerHTML = `
    <span>${card.rank}</span>
    <strong>${card.suit}</strong>
  `;

  return div;
}

function setActionButtons(active) {
  hitBtn.disabled = !active;
  standBtn.disabled = !active;
  doubleBtn.disabled = !active;
  dealBtn.disabled = active;
  betInput.disabled = active;
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
  winText.textContent = `Dein höchstes erreichtes Guthaben war ${bestBalance} CHF. Willst du speichern?`;
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
      statusText.textContent = `Fehler beim Speichern: ${err.error || res.status}`;
      return false;
    }

    statusText.textContent = "Highscore gespeichert ✅";
    return true;
  } catch {
    statusText.textContent = "Server nicht erreichbar 😕";
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
      ? `Global: ${rows[0].name} (${rows[0].score} CHF)`
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
      <div class="tries">${entry ? `${entry.score} CHF` : ""}</div>
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
    li.textContent = `${r.name} — ${r.score} CHF`;

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
  if (!/^[a-zA-Z0-9 äöüÄÖÜß._-]+$/.test(clean)) return null;
  return clean;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setStatus(text, type = "") {
  statusText.textContent = text;

  statusText.classList.remove(
    "status-win",
    "status-lose",
    "status-push",
    "status-info"
  );

  if (type) {
    statusText.classList.add(type);
  }
}

// ===============================
// Events
// ===============================
dealBtn.addEventListener("click", startRound);
hitBtn.addEventListener("click", hit);
standBtn.addEventListener("click", stand);
doubleBtn.addEventListener("click", doubleDown);
restartBtn.addEventListener("click", resetGame);

chipButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (roundActive) return;

    const chip = Number(btn.dataset.chip);
    const current = Number(betInput.value) || 0;
    const next = current + chip;

    if (next > balance) {
      statusText.textContent =
        "Status: Einsatz kann nicht höher als dein Guthaben sein.";
      return;
    }

    betInput.value = String(next);
  });
});

cashoutBtn.addEventListener("click", () => {
  if (roundActive) {
    statusText.textContent =
      "Status: Du kannst nur zwischen den Runden speichern.";
    return;
  }

  endGame();
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
    statusText.textContent = "Bitte gültigen Namen eingeben (2-20 Zeichen).";
    winnerNameInput.focus();
    return;
  }

  localStorage.setItem(STORAGE_WINNER, name);

  const ok = await submitScore(name, bestBalance);
  if (ok) {
    closeModal(saveScoreModal);
    await loadLeaderboard();
  }
});