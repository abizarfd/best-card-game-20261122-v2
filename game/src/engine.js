// Pure rules for Kebun Terakhir: no DOM here, so the same engine runs in
// the browser and in headless playtests. Every mutation pushes an event
// the UI can animate (or apply instantly in screenshot mode).
import { CARDS, buildDeck, cardById } from './cards.js';
import { makeRng, shuffleDeck } from './rng.js';
import { chooseAiMoves } from './ai.js';

export const MAX_HEALTH = 40;
export const MAX_BEDS = 4;
export const HAND_START = 4;

let uidCounter = 1;

function newSide(deck) {
  return {
    health: MAX_HEALTH,
    maxHealth: MAX_HEALTH,
    shield: 0,
    energy: 3,
    maxEnergy: 3,
    hand: [],
    deck,
    discard: [],
    beds: [null, null, null, null],
    sun: false,
    rain: false,
    drought: false,
    blockPests: false,
    played: 0,
    harvested: 0,
    eaten: 0,
  };
}

export function createGame(seed) {
  const rng = makeRng(seed);
  uidCounter = 1;
  const state = {
    seed,
    round: 1,
    phase: 'player',
    winner: null,
    winReason: '',
    log: [],
    events: [],
    combo: null,
    rng,
    sides: [newSide(shuffleDeck(buildDeck(), rng)), newSide(shuffleDeck(buildDeck(), rng))],
  };
  for (let side = 0; side < 2; side++) {
    const startCards = side === 0 ? HAND_START : HAND_START + 1;
    for (let i = 0; i < startCards; i++) drawCard(state, side);
  }
  addLog(state, 'Ronde 1 — giliranmu. Energi 3, tangan 4 kartu. Ratu Hama memulai dengan 5 kartu karena dia jalan kedua.');
  return state;
}

export function addLog(state, text) {
  state.log.push({ round: state.round, text });
  if (state.log.length > 40) state.log.shift();
}

export function addEvent(state, event) {
  state.events.push(event);
}

export function drawCard(state, side) {
  const s = state.sides[side];
  if (s.deck.length === 0) {
    s.deck = shuffleDeck(s.discard.splice(0), state.rng);
    if (s.deck.length === 0) return null;
    addLog(state, (side === 0 ? 'Kamu' : 'Ratu Hama') + ' mengocok ulang tumpukan buangan.');
  }
  const id = s.deck.pop();
  const card = { uid: uidCounter++, id, ...cardById(id) };
  s.hand.push(card);
  return card;
}

export function energyForRound(round) {
  return Math.min(3 + (round - 1), 6);
}

function freeBedIndex(side) {
  return side.beds.findIndex((bed) => bed === null);
}

export function canPlayCard(state, side, card) {
  const s = state.sides[side];
  if (state.phase === 'over') return false;
  if (card.cost > s.energy) return false;
  if (card.suit === 'plant') return freeBedIndex(s) !== -1;
  if (card.id === 'pupuk') return s.beds.some((bed) => bed !== null);
  return true;
}

export function playableTargets(state, side, card) {
  const me = state.sides[side];
  const foe = state.sides[1 - side];
  if (card.suit === 'plant') {
    const bed = freeBedIndex(me);
    return bed === -1 ? [] : [{ kind: 'bed', bed }];
  }
  if (card.suit === 'pest') {
    const targets = [];
    if (!foe.blockPests) {
      foe.beds.forEach((bed, i) => {
        if (bed && card.eat >= bed.hasil) targets.push({ kind: 'plant', side: 1 - side, bed: i });
      });
    }
    targets.push({ kind: 'garden', side: 1 - side });
    return targets;
  }
  if (card.id === 'pupuk') {
    return me.beds
      .map((bed, i) => (bed ? { kind: 'plant', side, bed: i } : null))
      .filter(Boolean);
  }
  return [{ kind: 'self' }];
}

function removeFromHand(side, uid) {
  const i = side.hand.findIndex((c) => c.uid === uid);
  if (i === -1) return null;
  return side.hand.splice(i, 1)[0];
}

export function damageGarden(state, side, amount, source) {
  const s = state.sides[side];
  let left = amount;
  if (s.shield > 0) {
    const absorbed = Math.min(s.shield, left);
    s.shield -= absorbed;
    left -= absorbed;
    addEvent(state, { type: 'shield', side, absorbed, source });
    addLog(state, `Pagar menyerap ${absorbed} kerusakan.`);
  }
  if (left > 0) {
    s.health = Math.max(0, s.health - left);
    addEvent(state, { type: 'damage', side, amount: left, source });
  }
  return left;
}

export function playCard(state, side, uid, target) {
  const me = state.sides[side];
  const foe = state.sides[1 - side];
  const card = me.hand.find((c) => c.uid === uid);
  if (!card || !canPlayCard(state, side, card)) return false;
  const targets = playableTargets(state, side, card);
  const picked = target
    ? targets.find((t) => JSON.stringify(t) === JSON.stringify(target))
    : targets[0];
  if (!picked) return false;

  removeFromHand(me, uid);
  me.energy -= card.cost;
  me.discard.push(card.id);
  me.played += 1;
  addEvent(state, { type: 'play', side, card: { ...card }, target: picked });
  const who = side === 0 ? 'Kamu' : 'Ratu Hama';

  if (card.suit === 'plant') {
    // Beds are fungible: use the requested bed when it is still free,
    // otherwise the first free bed. (The AI plans several plants at once
    // against a board that has not moved yet, so the requested bed may
    // already be taken by the time this card is played.)
    const bedIndex =
      picked && picked.kind === 'bed' && me.beds[picked.bed] === null
        ? picked.bed
        : freeBedIndex(me);
    if (bedIndex === -1) return false;
    const plant = { uid: card.uid, id: card.id, name: card.name, art: card.art, hasil: card.hasil, tumbuh: card.tumbuh, duri: card.duri || 0 };
    me.beds[bedIndex] = plant;
    addLog(state, `${who} menanam ${card.name} (panen ${card.hasil}, tumbuh ${card.tumbuh}).`);
    return true;
  }
  if (card.suit === 'pest') {
    if (picked.kind === 'plant') {
      const victim = foe.beds[picked.bed];
      foe.beds[picked.bed] = null;
      me.eaten += 1;
      addEvent(state, { type: 'eat', side, card: { ...card }, victim: { ...victim } });
      addLog(state, `${who} memakai ${card.name} — memakan ${victim.name} lawan!`);
      if (victim.duri) {
        damageGarden(state, side, victim.duri, 'duri ' + victim.name);
        addLog(state, `Duri ${victim.name} menusuk balik: ${victim.duri} kerusakan!`);
      }
    } else {
      damageGarden(state, 1 - side, card.dmg, card.name);
      addLog(state, `${who} memakai ${card.name} — menggigit kebun lawan ${card.dmg}.`);
    }
    return true;
  }
  if (card.suit === 'weather') {
    if (card.kind === 'sun') {
      me.sun = true;
      addLog(state, `${who} memanggil Matahari Terik — panen +1.`);
    } else if (card.kind === 'rain') {
      me.rain = true;
      addLog(state, `${who} memanggil Hujan Deras — tumbuh +1.`);
    } else if (card.kind === 'storm') {
      const planted = foe.beds.map((b, i) => (b ? i : -1)).filter((i) => i >= 0);
      if (planted.length) {
        let best = planted[0];
        for (const i of planted) {
          if (foe.beds[i].hasil + foe.beds[i].tumbuh > foe.beds[best].hasil + foe.beds[best].tumbuh) best = i;
        }
        const victim = foe.beds[best];
        foe.beds[best] = null;
        addLog(state, `Badai Petir menghancurkan ${victim.name} lawan!`);
      }
      damageGarden(state, 1 - side, 2, 'Badai Petir');
    } else if (card.kind === 'drought') {
      foe.drought = true;
      addLog(state, `${who} memanggil Kemarau — tanaman lawan tidak panen giliran berikut.`);
    }
    addEvent(state, { type: 'weather', side, card: { ...card } });
    return true;
  }
  if (card.id === 'pagar') {
    me.shield += card.shield;
    addLog(state, `${who} memasang Pagar Bambu — perisai +${card.shield}.`);
    return true;
  }
  if (card.id === 'orangorangan') {
    me.blockPests = true;
    addLog(state, `${who} mendirikan Orang-orangan Sawah — hama tidak bisa memakan tanamanmu.`);
    return true;
  }
  if (card.id === 'pupuk') {
    const plant = me.beds[picked.bed];
    plant.tumbuh += card.fertilize;
    addLog(state, `${who} memupuk ${plant.name} — tumbuh +${card.fertilize}.`);
    drawCard(state, side);
    addEvent(state, { type: 'fertilize', side, plant: { ...plant } });
    return true;
  }
  return false;
}

export function resolveHarvest(state, side) {
  const me = state.sides[side];
  const foe = state.sides[1 - side];
  if (me.drought) {
    me.drought = false;
    addLog(state, (side === 0 ? 'Tanamanmu' : 'Tanaman Ratu Hama') + ' layu kemarau — tidak panen.');
    addEvent(state, { type: 'drought', side });
    return;
  }
  const combo = me.sun && me.rain;
  if (combo) {
    state.combo = 'KOMBO MEKAR! ☀️ + 🌧️';
    addLog(state, 'KOMBO MEKAR! Matahari + Hujan — semua tanaman tumbuh +2 dan kamu ambil 1 kartu!');
    addEvent(state, { type: 'combo', side });
    for (const bed of me.beds) if (bed) bed.tumbuh += 2;
    drawCard(state, side);
  }
  for (const bed of me.beds) {
    if (!bed) continue;
    const growth = bed.tumbuh + (me.rain ? 1 : 0);
    bed.hasil += growth;
    let dmg = bed.hasil + (me.sun ? 1 : 0);
    me.harvested += dmg;
    damageGarden(state, 1 - side, dmg, bed.name);
    addEvent(state, { type: 'harvest', side, plant: { ...bed }, dmg });
    addLog(state, `${bed.name} panen ${dmg} — kebun lawan -${dmg}.`);
  }
  me.sun = false;
  me.rain = false;
}

export function checkWin(state) {
  const [p, a] = state.sides;
  if (a.health <= 0 && p.health <= 0) {
    state.winner = p.health === a.health ? 0 : p.health > a.health ? 0 : 1;
    state.winReason = 'seri kesehatan — kebun yang lebih subur menang';
  } else if (a.health <= 0) {
    state.winner = 0;
    state.winReason = 'kebun Ratu Hama habis';
  } else if (p.health <= 0) {
    state.winner = 1;
    state.winReason = 'kebunmu habis';
  }
  if (state.winner !== null) {
    state.phase = 'over';
    addEvent(state, { type: 'win', winner: state.winner, reason: state.winReason });
    addLog(state, state.winner === 0 ? 'PANEN RAYA! Kebunmu menang!' : 'Kebunmu layu… Ratu Hama menang.');
  }
  return state.winner !== null;
}

export function endPlayerTurn(state) {
  if (state.phase !== 'player') return;
  state.phase = 'ai';
  addLog(state, '— Kamu mengakhiri giliran. Tanamanmu panen. —');
  resolveHarvest(state, 0);
  if (checkWin(state)) return;
  aiTakeTurn(state);
  if (checkWin(state)) return;
  startNextRound(state);
}

// Step-wise turn flow for the UI, so the AI's cards can be animated one
// at a time instead of appearing all at once. Same rules, same order.
export function playerHarvestPhase(state) {
  state.phase = 'ai';
  addLog(state, '— Kamu mengakhiri giliran. Tanamanmu panen. —');
  resolveHarvest(state, 0);
  return checkWin(state);
}

export function aiHarvestPhase(state) {
  resolveHarvest(state, 1);
  return checkWin(state);
}

export function startNextRound(state) {
  state.round += 1;
  state.phase = 'player';
  const me = state.sides[0];
  const foe = state.sides[1];
  me.maxEnergy = energyForRound(state.round);
  me.energy = me.maxEnergy;
  foe.maxEnergy = energyForRound(state.round);
  foe.energy = foe.maxEnergy;
  me.blockPests = false;
  drawCard(state, 0);
  drawCard(state, 1);
  addLog(state, `Ronde ${state.round} — giliranmu. Energi ${me.energy}, ambil 1 kartu.`);
}

export function aiTakeTurn(state) {
  state.sides[1].blockPests = false;
  const moves = chooseAiMoves(state);
  addLog(state, '— Giliran Ratu Hama. —');
  for (const move of moves) {
    if (state.phase === 'over') break;
    playCard(state, 1, move.uid, move.target);
    if (checkWin(state)) return;
  }
  resolveHarvest(state, 1);
}

// Headless autoplay for balance testing: both sides play greedily.
export function autoPlayGame(seed, playerGreedy = true) {
  const state = createGame(seed);
  let guard = 0;
  while (state.phase !== 'over' && guard < 200) {
    guard += 1;
    const me = state.sides[0];
    let played = true;
    while (played && state.phase === 'player') {
      played = false;
      const options = me.hand.filter((c) => canPlayCard(state, 0, c));
      if (!options.length) break;
      let card;
      let target;
      if (playerGreedy) {
        // Smart greedy: plant first (best value per cost), then eat the
        // strongest enemy plant, then spend on anything else.
        const plants = options.filter((c) => c.suit === 'plant');
        if (plants.length) {
          card = plants.sort((a, b) => (b.hasil + b.tumbuh) / b.cost - (a.hasil + a.tumbuh) / a.cost)[0];
          target = playableTargets(state, 0, card)[0];
        } else {
          const pests = options.filter((c) => c.suit === 'pest');
          if (pests.length) {
            card = pests.sort((a, b) => b.dmg - a.dmg)[0];
            const targets = playableTargets(state, 0, card);
            target = targets.find((t) => t.kind === 'plant') || targets[0];
          } else {
            card = options.sort((a, b) => b.cost - a.cost)[0];
            target = playableTargets(state, 0, card)[0];
          }
        }
      } else {
        card = options[Math.floor(state.rng() * options.length)];
        const targets = playableTargets(state, 0, card);
        target = targets[Math.floor(state.rng() * targets.length)];
      }
      if (playCard(state, 0, card.uid, target)) played = true;
    }
    if (state.phase === 'player') endPlayerTurn(state);
  }
  return {
    seed,
    winner: state.winner,
    rounds: state.round,
    playerHealth: state.sides[0].health,
    aiHealth: state.sides[1].health,
    playerPlayed: state.sides[0].played,
    aiPlayed: state.sides[1].played,
    playerHarvested: state.sides[0].harvested,
    aiHarvested: state.sides[1].harvested,
  };
}

export { CARDS };
