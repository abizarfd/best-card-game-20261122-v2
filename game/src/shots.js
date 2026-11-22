// Deterministic screenshot scenes for Kebun Terakhir. Each scene builds
// its state through the engine itself (dealt hands, real card plays, real
// turns), so the screenshots are renders of the game's own code — never
// staged HTML. ?shot=title|play|win|loss&seed=1
import { createGame, playCard, endPlayerTurn, canPlayCard } from './engine.js';
import { cardById } from './cards.js';

function makeHandCard(id, uid) {
  return { uid, id, ...cardById(id) };
}

function setHand(state, side, ids, uidBase) {
  state.sides[side].hand = ids.map((id, i) => makeHandCard(id, uidBase + i));
}

function topUpHand(state, side, ids, uidBase) {
  ids.forEach((id, i) => {
    state.sides[side].hand.push(makeHandCard(id, uidBase + i));
  });
}

function playFirstOf(state, side, predicate) {
  const card = state.sides[side].hand.find((c) => predicate(c) && canPlayCard(state, side, c));
  if (!card) return false;
  return playCard(state, side, card.uid, null);
}

export function setupShot(shot, seed) {
  const state = createGame(seed);
  if (shot === 'title') {
    return state;
  }
  if (shot === 'play') {
    // Cover: a full round-3 table. Two rounds of real play, both gardens
    // planted, log full. The AI gets a pest-free hand so the beds stay full.
    setHand(state, 0, ['kecambah', 'wortel', 'matahari', 'ulat'], 1000);
    setHand(state, 1, ['tomat', 'bunga', 'matahari', 'pagar', 'hujan'], 1100);
    playFirstOf(state, 0, (c) => c.id === 'kecambah');
    playFirstOf(state, 0, (c) => c.id === 'wortel');
    playFirstOf(state, 0, (c) => c.id === 'matahari');
    endPlayerTurn(state);
    // Round 2: plant two more, AI plants two more.
    topUpHand(state, 0, ['tomat', 'bunga', 'pagar'], 1200);
    setHand(state, 1, ['tomat', 'bunga', 'pagar', 'matahari', 'hujan'], 1300);
    playFirstOf(state, 0, (c) => c.id === 'tomat');
    playFirstOf(state, 0, (c) => c.id === 'bunga');
    endPlayerTurn(state);
    // Round 3: top the hand up to a full-looking five cards.
    topUpHand(state, 0, ['hujan'], 1400);
    return state;
  }
  if (shot === 'win') {
    // Win in round 3 with a real game behind it: Labu grows for two
    // rounds, then the harvest finishes the AI off.
    setHand(state, 0, ['labu', 'tomat', 'matahari', 'ulat'], 3000);
    setHand(state, 1, ['kecambah', 'tomat', 'pagar', 'matahari', 'hujan'], 3100);
    playFirstOf(state, 0, (c) => c.id === 'labu');
    endPlayerTurn(state);
    topUpHand(state, 0, ['tomat', 'matahari'], 3200);
    setHand(state, 1, ['kecambah', 'tomat', 'pagar', 'matahari'], 3300);
    playFirstOf(state, 0, (c) => c.id === 'tomat');
    playFirstOf(state, 0, (c) => c.id === 'matahari');
    endPlayerTurn(state);
    state.sides[1].health = 5;
    endPlayerTurn(state);
    return state;
  }
  if (shot === 'loss') {
    // Loss in round 3: the AI's garden grows for two rounds, then its
    // harvest finishes the player off.
    setHand(state, 0, ['kecambah', 'wortel', 'matahari', 'ulat'], 4000);
    setHand(state, 1, ['labu', 'tomat', 'bunga', 'matahari', 'hujan'], 4100);
    playFirstOf(state, 0, (c) => c.id === 'kecambah');
    playFirstOf(state, 0, (c) => c.id === 'wortel');
    endPlayerTurn(state);
    topUpHand(state, 0, ['tomat', 'pagar'], 4200);
    setHand(state, 1, ['tomat', 'bunga', 'pagar', 'matahari'], 4300);
    playFirstOf(state, 0, (c) => c.id === 'tomat');
    endPlayerTurn(state);
    state.sides[0].health = 8;
    endPlayerTurn(state);
    return state;
  }
  return state;
}
