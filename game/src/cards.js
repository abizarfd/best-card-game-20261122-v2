// Card database for Kebun Terakhir. Four suits, each told apart by colour
// AND shape, never by text alone:
//   TANAMAN (plant)  - green  - leaf sprout   - grows on a bed, harvests damage
//   HAMA    (pest)   - purple - bug           - eats an enemy plant, or bites the garden
//   CUACA   (weather)- blue   - sun / cloud   - field effect for the round
//   PAGAR   (fence)  - amber  - shield        - protects the garden and the beds
// A card's id is stable; a deck is a list of ids, so the engine never
// needs the DOM to know what a card does.

export const SUITS = {
  plant: { label: 'TANAMAN', color: '#2e9e4f', dark: '#1c5c30', glyph: '🌱' },
  pest: { label: 'HAMA', color: '#8b4fd8', dark: '#552a8f', glyph: '🐛' },
  weather: { label: 'CUACA', color: '#2b7fd4', dark: '#174a80', glyph: '🌦️' },
  fence: { label: 'PAGAR', color: '#c98a2b', dark: '#7a5414', glyph: '🛡️' },
};

export const CARDS = {
  // ---- plants: cost, hasil (harvest damage), tumbuh (growth per harvest) ----
  kecambah: { id: 'kecambah', name: 'Kecambah', suit: 'plant', cost: 1, hasil: 1, tumbuh: 1, art: '🌱', text: 'Tumbuh 1, panen 1. Murah dan rajin.' },
  wortel: { id: 'wortel', name: 'Wortel Cepat', suit: 'plant', cost: 1, hasil: 2, tumbuh: 1, art: '🥕', text: 'Tumbuh 1, panen 2. Cepat besar.' },
  tomat: { id: 'tomat', name: 'Tomat Manis', suit: 'plant', cost: 2, hasil: 2, tumbuh: 1, art: '🍅', text: 'Tumbuh 1, panen 2. Andalan kebun.' },
  bunga: { id: 'bunga', name: 'Bunga Matahari', suit: 'plant', cost: 2, hasil: 1, tumbuh: 2, art: '🌻', text: 'Tumbuh 2, panen 1. Makin lama makin gila.' },
  labu: { id: 'labu', name: 'Labu Raksasa', suit: 'plant', cost: 3, hasil: 4, tumbuh: 1, art: '🎃', text: 'Tumbuh 1, panen 4. Berat, tapi panennya besar.' },
  cabai: { id: 'cabai', name: 'Cabai Api', suit: 'plant', cost: 3, hasil: 3, tumbuh: 1, art: '🌶️', text: 'Tumbuh 1, panen 3. Duri: hama yang memakannya kena 3 kerusakan.' },
  // ---- pests: eat = biggest plant stat it can swallow, dmg = bite when no plant ----
  tikus: { id: 'tikus', name: 'Tikus Kebun', suit: 'pest', cost: 1, eat: 2, dmg: 2, art: '🐀', text: 'Makan 1 tanaman (panen ≤ 2). Kalau tidak ada, gigit kebun 2.' },
  ulat: { id: 'ulat', name: 'Ulat Rakus', suit: 'pest', cost: 2, eat: 99, dmg: 3, art: '🐛', text: 'Makan 1 tanaman apa saja. Kalau tidak ada, gigit kebun 3.' },
  belalang: { id: 'belalang', name: 'Belalang Kawanan', suit: 'pest', cost: 3, eat: 3, dmg: 5, art: '🦗', text: 'Makan 1 tanaman (panen ≤ 3). Kalau tidak ada, gigit kebun 5.' },
  // ---- weather: field effects for the round ----
  matahari: { id: 'matahari', name: 'Matahari Terik', suit: 'weather', cost: 1, kind: 'sun', art: '☀️', text: 'Matahari: semua tanamanmu panen +1 di panen ini. + Hujan = KOMBO MEKAR!' },
  hujan: { id: 'hujan', name: 'Hujan Deras', suit: 'weather', cost: 1, kind: 'rain', art: '🌧️', text: 'Hujan: semua tanamanmu tumbuh +1 di panen ini. + Matahari = KOMBO MEKAR!' },
  badai: { id: 'badai', name: 'Badai Petir', suit: 'weather', cost: 3, kind: 'storm', art: '⛈️', text: 'Petir menghancurkan 1 tanaman lawan terkuat dan merusak kebunnya 2.' },
  kemarau: { id: 'kemarau', name: 'Kemarau Panjang', suit: 'weather', cost: 2, kind: 'drought', art: '🏜️', text: 'Tanaman lawan tidak panen di giliran berikutnya.' },
  // ---- fences ----
  pagar: { id: 'pagar', name: 'Pagar Bambu', suit: 'fence', cost: 2, shield: 5, art: '🎋', text: 'Perisai 5: menyerap 5 kerusakan ke kebunmu.' },
  orangorangan: { id: 'orangorangan', name: 'Orang-orangan Sawah', suit: 'fence', cost: 1, blockPests: true, art: '🧑‍🌾', text: 'Hama lawan tidak bisa memakan tanamanmu sampai giliranmu berikutnya.' },
  // ---- care ----
  pupuk: { id: 'pupuk', name: 'Pupuk Ajaib', suit: 'fence', cost: 1, fertilize: 1, art: '💩', text: 'Pilih 1 tanamanmu: tumbuh +1, lalu ambil 1 kartu.' },
};

export function cardById(id) {
  return CARDS[id];
}

// One 30-card garden deck. Both sides use the same recipe; the shuffle
// and the hands make every game different.
export function buildDeck() {
  const recipe = [
    ['kecambah', 3], ['wortel', 1], ['tomat', 3], ['bunga', 3],
    ['labu', 2], ['cabai', 2],
    ['tikus', 1], ['ulat', 3], ['belalang', 2],
    ['matahari', 2], ['hujan', 1], ['badai', 1], ['kemarau', 1],
    ['pagar', 2], ['orangorangan', 1],
    ['pupuk', 2],
  ];
  const deck = [];
  for (const [id, count] of recipe) {
    for (let i = 0; i < count; i++) deck.push(id);
  }
  return deck;
}

export function suitOf(card) {
  return SUITS[card.suit];
}
