// Ratu Hama, the AI opponent. Her policy is greedy and readable on
// purpose: the table shows her intent at the start of every round, so the
// player can read her plan and counter it (judge criterion 2).
import { canPlayCard, playableTargets } from './engine.js';

function plantThreat(side) {
  return side.beds.reduce((sum, bed) => sum + (bed ? bed.hasil + bed.tumbuh : 0), 0);
}

function strongestPlantIndex(side) {
  let best = -1;
  let bestScore = -1;
  side.beds.forEach((bed, i) => {
    if (!bed) return;
    const score = bed.hasil + bed.tumbuh;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}

// What the table shows before her turn: one honest line about her plan.
export function aiIntent(state) {
  const me = state.sides[1];
  const foe = state.sides[0];
  const hasPest = me.hand.some((c) => c.suit === 'pest');
  const hasSun = me.hand.some((c) => c.id === 'matahari');
  const hasRain = me.hand.some((c) => c.id === 'hujan');
  const foePlant = strongestPlantIndex(foe) !== -1;
  if (hasSun && hasRain && me.energy >= 2) {
    return { text: 'menyiapkan KOMBO MEKAR ☀️+🌧️ — hentikan dia atau pasang pagar!', icon: '🌦️' };
  }
  if (hasPest && foePlant && plantThreat(foe) >= 5) {
    return { text: 'akan memakan tanaman terkuatmu — lindungi dengan Orang-orangan!', icon: '🐛' };
  }
  if (plantThreat(foe) >= 8) {
    return { text: 'kebunmu terlalu subur — dia akan menyerang panenmu.', icon: '⚔️' };
  }
  if (me.hand.some((c) => c.suit === 'plant') && me.beds.some((b) => b === null)) {
    return { text: 'menanam kebunnya sendiri — jangan biarkan dia tumbuh.', icon: '🌱' };
  }
  return { text: 'mengintai… dia menunggu celahmu.', icon: '👁️' };
}

// Greedy move list, best first. The engine plays them in order while the
// AI still has energy; the UI animates one card at a time.
export function chooseAiMoves(state) {
  const me = state.sides[1];
  const foe = state.sides[0];
  const moves = [];
  let energy = me.energy;
  const hand = [...me.hand];

  const take = (card, target) => {
    if (card.cost > energy) return false;
    if (!canPlayCard(state, 1, card)) return false;
    // No target matching here: moves are planned against a board that has
    // not moved yet, so a target that is free now may be taken by an
    // earlier planned move. The engine re-validates each move at play
    // time (playCard) and skips one that no longer applies; plants fall
    // back to the first free bed.
    moves.push({ uid: card.uid, target: target || null });
    energy -= card.cost;
    const i = hand.indexOf(card);
    if (i >= 0) hand.splice(i, 1);
    return true;
  };

  // 1. Combo first — but only when she has plants to grow: sun + rain
  // with no beds is two energy for one card, a bad trade.
  const sun = hand.find((c) => c.id === 'matahari');
  const rain = hand.find((c) => c.id === 'hujan');
  const hasPlants = me.beds.some((b) => b !== null);
  if (sun && rain && energy >= 2 && hasPlants) {
    take(sun, { kind: 'self' });
    take(rain, { kind: 'self' });
  }

  // 2. Eat the player's strongest plant she CAN eat. Eating denies a
  // whole harvest, so she eats whenever a good meal is on the table —
  // a pest that cannot swallow the biggest plant still eats the best
  // edible one.
  const pest = hand
    .filter((c) => c.suit === 'pest')
    .sort((a, b) => b.dmg - a.dmg)[0];
  if (pest && energy >= pest.cost) {
    let bestEdible = -1;
    let bestScore = -1;
    foe.beds.forEach((bed, i) => {
      if (!bed || bed.hasil > pest.eat) return;
      const score = bed.hasil + bed.tumbuh;
      if (score > bestScore) {
        bestScore = score;
        bestEdible = i;
      }
    });
    if (bestEdible !== -1 && !foe.blockPests && bestScore >= 3) {
      take(pest, { kind: 'plant', side: 0, bed: bestEdible });
    } else if (foe.health <= pest.dmg + 3) {
      take(pest, { kind: 'garden', side: 0 });
    }
  }

  // 3. Storm the strongest plant when she has one and plants to kill.
  const storm = hand.find((c) => c.id === 'badai');
  if (storm && energy >= storm.cost && strongestPlantIndex(foe) !== -1) {
    take(storm, { kind: 'self' });
  }

  // 4. Plant her own garden, best value per energy first. Track beds locally:
  // moves are planned before any of them is played, so the real board
  // still shows every bed free.
  const bedsTaken = new Set();
  const plants = hand
    .filter((c) => c.suit === 'plant')
    .sort((a, b) => (b.hasil + b.tumbuh) / b.cost - (a.hasil + a.tumbuh) / a.cost);
  for (const plant of plants) {
    if (energy < plant.cost) continue;
    let bed = -1;
    for (let i = 0; i < me.beds.length; i++) {
      if (me.beds[i] === null && !bedsTaken.has(i)) {
        bed = i;
        break;
      }
    }
    if (bed === -1) break;
    if (take(plant, { kind: 'bed', bed })) bedsTaken.add(bed);
  }

  // 5. Fertilize her fastest grower.
  const pupuk = hand.find((c) => c.id === 'pupuk');
  if (pupuk && energy >= pupuk.cost) {
    let best = -1;
    let bestGrow = -1;
    me.beds.forEach((bed, i) => {
      if (bed && bed.tumbuh > bestGrow) {
        bestGrow = bed.tumbuh;
        best = i;
      }
    });
    if (best !== -1) take(pupuk, { kind: 'plant', side: 1, bed: best });
  }

  // 6. Fence when the player's garden is out-harvesting hers.
  const pagar = hand.find((c) => c.id === 'pagar');
  if (pagar && energy >= pagar.cost && plantThreat(foe) >= 6) {
    take(pagar, { kind: 'self' });
  }

  // 7. Spend leftover energy on weather — but sun or rain only feed
  // plants she already has; a lone weather card with empty beds is a
  // wasted turn.
  for (const id of ['matahari', 'hujan', 'kemarau']) {
    const w = hand.find((c) => c.id === id);
    if (!w || energy < w.cost) continue;
    if (id !== 'kemarau' && !me.beds.some((b) => b !== null) && !bedsTaken.size) continue;
    take(w, { kind: 'self' });
  }
  const guard = hand.find((c) => c.id === 'orangorangan');
  if (guard && energy >= guard.cost && plantThreat(foe) >= 5) {
    take(guard, { kind: 'self' });
  }

  return moves;
}
