// Headless balance playtest for Kebun Terakhir: runs full games through
// the engine only (no browser), both sides playing, and reports win/loss
// and game length. Usage: node tools/playtest.mjs [count] [seedBase]
import { autoPlayGame } from '../game/src/engine.js';

const count = Number(process.argv[2] || 30);
const seedBase = Number(process.argv[3] || 1000);

let greedyWins = 0;
let randomWins = 0;
let rounds = [];
let draws = 0;
let playerHealthSum = 0;
let aiHealthSum = 0;

for (let i = 0; i < count; i++) {
  const g = autoPlayGame(seedBase + i, true);
  if (g.winner === 0) greedyWins++;
  else if (g.winner === 1) randomWins++;
  else draws++;
  rounds.push(g.rounds);
  playerHealthSum += g.playerHealth;
  aiHealthSum += g.aiHealth;
}
const avgRounds = (rounds.reduce((a, b) => a + b, 0) / rounds.length).toFixed(1);
const minRounds = Math.min(...rounds);
const maxRounds = Math.max(...rounds);
console.log(`greedy-player games: ${count}`);
console.log(`  player wins: ${greedyWins} (${((greedyWins / count) * 100).toFixed(0)}%)`);
console.log(`  ai wins: ${randomWins} (${((randomWins / count) * 100).toFixed(0)}%)`);
console.log(`  draws: ${draws}`);
console.log(`  rounds: avg ${avgRounds}, min ${minRounds}, max ${maxRounds}`);
console.log(`  avg end health: player ${Math.round(playerHealthSum / count)}, ai ${Math.round(aiHealthSum / count)}`);

// Random player as a second check: the game must still be winnable
// (and losable) when the player plays badly.
let rWins = 0;
let rRounds = [];
for (let i = 0; i < count; i++) {
  const g = autoPlayGame(seedBase + 5000 + i, false);
  if (g.winner === 0) rWins++;
  rRounds.push(g.rounds);
}
console.log(`random-player games: ${count}`);
console.log(`  player wins: ${rWins} (${((rWins / count) * 100).toFixed(0)}%)`);
console.log(`  rounds: avg ${(rRounds.reduce((a, b) => a + b, 0) / rRounds.length).toFixed(1)}`);
