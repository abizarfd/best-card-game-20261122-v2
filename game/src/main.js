// Wiring for Kebun Terakhir: input, turn flow, keyboard, screenshot
// scenes. The engine decides the rules; this file decides when the
// player may act and how the AI's turn is shown one card at a time.
import { createGame, canPlayCard, playableTargets, playCard, checkWin, playerHarvestPhase, aiHarvestPhase, startNextRound, endPlayerTurn } from './engine.js';
import { chooseAiMoves } from './ai.js';
import { initDom, renderAll, showBanner, showOverlay, hideOverlay } from './render.js';
import { setupShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || (Date.now() % 100000));

let state;
let shotMode = Boolean(shot);
if (shotMode) {
  state = setupShot(shot, seed);
} else {
  state = createGame(seed);
}

const ui = {
  selectedUid: null,
  targeting: null,
  prevHealth: null,
  canPlay(card) {
    return state.phase === 'player' && canPlayCard(state, 0, card);
  },
  onCardClick(uid) {
    if (state.phase !== 'player' || shotMode) return;
    const card = state.sides[0].hand.find((c) => c.uid === uid);
    if (!card) return;
    if (ui.selectedUid === uid) {
      ui.selectedUid = null;
      ui.targeting = null;
      renderAll(state, ui);
      return;
    }
    const targets = playableTargets(state, 0, card);
    const needsTarget =
      (card.suit === 'pest' && targets.some((t) => t.kind === 'plant')) ||
      card.id === 'pupuk';
    if (!needsTarget) {
      if (!canPlayCard(state, 0, card)) return;
      playCard(state, 0, uid, null);
      afterPlayerAction();
      return;
    }
    ui.selectedUid = uid;
    ui.targeting = { card, targets };
    renderAll(state, ui);
  },
  onBedClick(side, bed) {
    if (!ui.targeting) return;
    const t = ui.targeting.targets.find(
      (x) => (x.kind === 'plant' && x.side === side && x.bed === bed) || (x.kind === 'bed' && x.bed === bed && side === 0),
    );
    if (!t) return;
    const uid = ui.targeting.card.uid;
    ui.selectedUid = null;
    ui.targeting = null;
    playCard(state, 0, uid, t);
    afterPlayerAction();
  },
  onGardenClick(side) {
    if (!ui.targeting) return;
    const t = ui.targeting.targets.find((x) => x.kind === 'garden' && x.side === side);
    if (!t) return;
    const uid = ui.targeting.card.uid;
    ui.selectedUid = null;
    ui.targeting = null;
    playCard(state, 0, uid, t);
    afterPlayerAction();
  },
  onEndTurn() {
    if (state.phase !== 'player' || shotMode) return;
    ui.selectedUid = null;
    ui.targeting = null;
    runAiTurn();
  },
  onRestart() {
    restartGame();
  },
  onTitle() {
    showOverlay('title', state);
  },
  onStart() {
    hideOverlay();
  },
};

function afterPlayerAction() {
  renderAll(state, ui);
  if (state.combo) {
    showBanner(state.combo, 1800);
    state.combo = null;
  }
  if (checkWin(state)) {
    setTimeout(() => showOverlay(state.winner === 0 ? 'win' : 'loss', state), 500);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runAiTurn() {
  const over = playerHarvestPhase(state);
  renderAll(state, ui);
  if (state.combo) {
    showBanner(state.combo, 1800);
    state.combo = null;
  }
  if (over) {
    await sleep(600);
    showOverlay(state.winner === 0 ? 'win' : 'loss', state);
    return;
  }
  showBanner('🌻 Giliran Ratu Hama…', 1300);
  await sleep(750);
  const moves = chooseAiMoves(state);
  for (const move of moves) {
    if (state.phase === 'over') break;
    playCard(state, 1, move.uid, move.target);
    renderAll(state, ui);
    if (checkWin(state)) {
      await sleep(600);
      showOverlay(state.winner === 0 ? 'win' : 'loss', state);
      return;
    }
    await sleep(780);
  }
  await sleep(450);
  const over2 = aiHarvestPhase(state);
  renderAll(state, ui);
  if (state.combo) {
    showBanner(state.combo, 1800);
    state.combo = null;
  }
  if (over2) {
    await sleep(600);
    showOverlay(state.winner === 0 ? 'win' : 'loss', state);
    return;
  }
  startNextRound(state);
  renderAll(state, ui);
}

function restartGame() {
  state = createGame(Date.now() % 100000);
  ui.selectedUid = null;
  ui.targeting = null;
  ui.prevHealth = null;
  hideOverlay();
  renderAll(state, ui);
}

window.addEventListener('kebun-restart', restartGame);
window.addEventListener('kebun-title', () => showOverlay('title', state));
window.addEventListener('kebun-start', () => hideOverlay());

window.addEventListener('keydown', (e) => {
  if (shotMode) return;
  if (e.key >= '1' && e.key <= '7') {
    const card = state.sides[0].hand[Number(e.key) - 1];
    if (card) ui.onCardClick(card.uid);
  } else if (e.key === 'Enter') {
    ui.onEndTurn();
  } else if (e.key === 'r' || e.key === 'R') {
    restartGame();
  } else if (e.key === 'Escape') {
    showOverlay('title', state);
  }
});

// Debug hook for headless playtests: window.__kebun exposes the live
// state and the engine's own functions, nothing else.
window.__kebun = {
  get state() {
    return state;
  },
  playCard,
  endPlayerTurn,
  checkWin,
  chooseAiMoves,
  render() {
    renderAll(state, ui);
  },
};

initDom(document.getElementById('app'), ui);
renderAll(state, ui);
if (shot === 'title') {
  showOverlay('title', state);
} else if (shot === 'win') {
  showOverlay('win', state);
} else if (shot === 'loss') {
  showOverlay('loss', state);
} else if (!shotMode) {
  showOverlay('title', state);
}
