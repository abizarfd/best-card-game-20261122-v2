# 🌱 Kebun Terakhir — Best Card Game

[![make.fun bounty](https://img.shields.io/badge/make.fun-bounty-7c3aed)](https://make.fun/bounty/best-card-game-20261122-1826)
[![make.fun](https://img.shields.io/badge/made%20for-make.fun-2e9e4f)](https://make.fun)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Duel kartu kebun 1 lawan 1 melawan **Ratu Hama**. Pertahankan kebun terakhir — tanam, panen, dan makan balik sebelum kebunmu habis.

**Bounty:** [Best Card Game — make.fun](https://make.fun/bounty/best-card-game-20261122-1826) · **Site:** [make.fun](https://make.fun)

## Cara main

- Tiap ronde dapat **embun** (energi) + 1 kartu. Klik kartu — atau tekan **1–7** — untuk memainkannya.
- **🌱 Tanaman** tumbuh di petak kebunmu, lalu **panen** tiap giliran: panen naik sebesar tumbuh, lalu merusak kebun lawan.
- **☀️ Matahari + 🌧️ Hujan = KOMBO MEKAR!** Semua tanamanmu tumbuh +2 dan kamu ambil 1 kartu.
- **🐛 Hama** memakan tanaman lawan — atau menggigit kebunnya kalau tidak ada tanaman. Pilih Hama, lalu klik tanaman lawan (atau nyawa lawan).
- **🛡️ Pagar** melindungimu: Pagar Bambu menyerap kerusakan, Orang-orangan Sawah menghalau hama.
- Kebun 40 lawan 40. **Enter** = akhiri giliran, **R** = ulangi, **Esc** = judul.

Ratu Hama mengumumkan rencananya di awal tiap ronde — baca, lalu lawan balik.

## Main

```bash
node serve.ts
# buka http://localhost:8080
```

Game statis, tanpa network, main offline di desktop Chrome. Screenshots deterministik lewat `?shot=title|play|win|loss&seed=1`.

## Struktur

```
game/
  index.html        # shell
  css/style.css     # tema kebun
  src/rng.js        # RNG seeded (mulberry32)
  src/cards.js      # database 18 kartu, 4 suit
  src/engine.js     # aturan murni (tanpa DOM)
  src/ai.js         # Ratu Hama + telegraph rencana
  src/render.js     # DOM + animasi
  src/main.js       # wiring input & giliran
  src/shots.js      # skenario screenshot deterministik
```

## Lisensi

MIT — lihat [LICENSE](LICENSE).
