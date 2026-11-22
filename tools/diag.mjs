// Diagnostic: play one game verbosely to see where the AI loses.
import { createGame, playCard, endPlayerTurn, canPlayCard, playableTargets } from '../game/src/engine.js';
import { chooseAiMoves } from '../game/src/ai.js';

const state = createGame(2000);
let guard = 0;
while (state.phase !== 'over' && guard < 30) {
  guard++;
  console.log(`--- Ronde ${state.round} | Kamu ${state.sides[0].health}HP E${state.sides[0].energy} | Lawan ${state.sides[1].health}HP E${state.sides[1].energy}`);
  console.log(`  tangan kamu: ${state.sides[0].hand.map((c) => c.name + '(' + c.cost + ')').join(', ')}`);
  console.log(`  tangan lawan: ${state.sides[1].hand.map((c) => c.name + '(' + c.cost + ')').join(', ')}`);
  console.log(`  kebunmu: ${state.sides[0].beds.map((b) => (b ? b.name + ' H' + b.hasil + '/T' + b.tumbuh : '-')).join(' | ')}`);
  console.log(`  kebun lawan: ${state.sides[1].beds.map((b) => (b ? b.name + ' H' + b.hasil + '/T' + b.tumbuh : '-')).join(' | ')}`);
  // player: smart greedy like the playtest
  let played = true;
  while (played && state.phase === 'player') {
    played = false;
    const me = state.sides[0];
    const options = me.hand.filter((c) => canPlayCard(state, 0, c));
    if (!options.length) break;
    const plants = options.filter((c) => c.suit === 'plant');
    let card, target;
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
    console.log(`  KAMU main ${card.name} -> ${JSON.stringify(target)}`);
    if (playCard(state, 0, card.uid, target)) played = true;
  }
  const moves = chooseAiMoves(state);
  console.log(`  AI merencanakan ${moves.length} langkah: ${moves.map((m) => { const c = state.sides[1].hand.find((x) => x.uid === m.uid); return c ? c.name : '?'; }).join(', ')}`);
  endPlayerTurn(state);
  console.log(`  -> setelah ronde: Kamu ${state.sides[0].health}HP | Lawan ${state.sides[1].health}HP`);
}
console.log(`HASIL: pemenang = ${state.winner === 0 ? 'KAMU' : 'LAWAN'} di ronde ${state.round}`);
