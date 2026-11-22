// DOM rendering for Kebun Terakhir. The engine owns the state; this file
// only turns it into HTML. Re-render is cheap: the dynamic zones are
// rebuilt on every change and CSS keyframes give the cards their weight.
import { SUITS, suitOf } from './cards.js';
import { aiIntent } from './ai.js';

export function initDom(app, ui) {
  app.innerHTML = `
  <div id="board">
    <div id="main-col">
      <div class="side-row">
        <div class="side-name"><span class="avatar">🌻</span>RATU HAMA</div>
        <div class="health-wrap">
          <div class="health-bar" id="foe-bar"><div class="health-fill foe" id="foe-fill"></div><div class="health-text" id="foe-text"></div></div>
          <span class="shield-badge" id="foe-shield" style="display:none"></span>
        </div>
        <div class="deck-pills">
          <span class="pill" id="deck-foe"></span>
          <span class="pill" id="deck-me"></span>
          <span class="round-badge" id="round-badge"></span>
        </div>
      </div>
      <div id="intent"></div>
      <div id="foe-hand"></div>
      <div id="table">
        <div id="table-label">— KEBUN TERAKHIR —</div>
        <div class="beds-row" id="foe-beds"></div>
        <div id="weather-strip"></div>
        <div class="beds-row" id="my-beds"></div>
      </div>
      <div class="side-row">
        <div class="side-name"><span class="avatar">🧑‍🌾</span>KEBUNMU</div>
        <div class="health-wrap">
          <div class="health-bar" id="my-bar"><div class="health-fill mine" id="my-fill"></div><div class="health-text" id="my-text"></div></div>
          <span class="shield-badge" id="my-shield" style="display:none"></span>
        </div>
      </div>
      <div id="energy-row"><span class="label">EMBUN</span><span id="pips"></span><span id="energy-text"></span></div>
      <div id="hand"></div>
      <div id="controls">
        <button class="btn primary" id="btn-end">🌱 AKHIRI GILIRAN ⏎</button>
        <button class="btn ghost" id="btn-restart">Ulangi (R)</button>
        <button class="btn ghost" id="btn-title">Judul (Esc)</button>
      </div>
      <div id="hint">Klik kartu untuk memainkan — kartu 1–7 lewat keyboard. Pilih Hama lalu klik tanaman lawan untuk memakannya, atau klik nyawa lawan untuk menggigit kebunnya.</div>
    </div>
    <div id="side-col">
      <div id="score-panel"></div>
      <div id="log-panel"><h3>📖 JURNAL KEBUN</h3><div id="log-entries"></div></div>
    </div>
  </div>
  <div id="banner"></div>
  <div class="overlay hidden" id="overlay"></div>`;

  document.getElementById('btn-end').addEventListener('click', () => ui.onEndTurn());
  document.getElementById('btn-restart').addEventListener('click', () => ui.onRestart());
  document.getElementById('btn-title').addEventListener('click', () => ui.onTitle());
  document.getElementById('foe-bar').addEventListener('click', () => ui.onGardenClick(1));
  document.getElementById('my-bar').addEventListener('click', () => ui.onGardenClick(0));
}

function healthBar(state, side) {
  const s = state.sides[side];
  const pct = Math.max(0, Math.round((s.health / s.maxHealth) * 100));
  const fill = document.getElementById(side === 0 ? 'my-fill' : 'foe-fill');
  const text = document.getElementById(side === 0 ? 'my-text' : 'foe-text');
  const shield = document.getElementById(side === 0 ? 'my-shield' : 'foe-shield');
  fill.style.width = pct + '%';
  text.textContent = `🌻 ${s.health} / ${s.maxHealth}`;
  if (s.shield > 0) {
    shield.style.display = '';
    shield.textContent = `🛡️ ${s.shield}`;
  } else {
    shield.style.display = 'none';
  }
}

function cardStatsHtml(card) {
  if (card.suit === 'plant') {
    return `<span class="bad">⚔️ Panen ${card.hasil}</span><span class="good">📈 Tumbuh ${card.tumbuh}</span>`;
  }
  if (card.suit === 'pest') {
    return `<span class="bad">🍽️ Makan ≤ ${card.eat === 99 ? '∞' : card.eat}</span><span class="bad">🦷 Gigit ${card.dmg}</span>`;
  }
  if (card.suit === 'weather') {
    return `<span class="good">🌦️ Efek 1 ronde</span><span></span>`;
  }
  if (card.id === 'pagar') {
    return `<span class="good">🛡️ Perisai ${card.shield}</span><span></span>`;
  }
  if (card.id === 'orangorangan') {
    return `<span class="good">🚫 Hama diblokir</span><span></span>`;
  }
  if (card.id === 'pupuk') {
    return `<span class="good">🌿 Tumbuh +${card.fertilize}</span><span class="good">+1 kartu</span>`;
  }
  return '<span></span><span></span>';
}

export function cardElement(card, index, state, ui) {
  const el = document.createElement('div');
  const playable = ui.canPlay(card);
  el.className = `card suit-${card.suit}` + (playable ? ' playable' : ' unplayable') + (ui.selectedUid === card.uid ? ' selected' : '');
  el.dataset.uid = card.uid;
  const suit = suitOf(card);
  el.innerHTML = `
    <div class="cost">${card.cost}</div>
    <div class="suit-tag" style="color:${suit.color}">${suit.glyph} ${suit.label}</div>
    <div class="art">${card.art}</div>
    <div class="cname">${card.name}</div>
    <div class="ctext">${card.text}</div>
    <div class="cstats">${cardStatsHtml(card)}</div>
    <div class="key">${index + 1}</div>`;
  el.addEventListener('click', () => ui.onCardClick(card.uid));
  return el;
}

function plantTile(plant, side, state, ui) {
  const el = document.createElement('div');
  el.className = 'plant-tile' + (side === 1 ? ' foe' : '');
  el.dataset.side = side;
  el.innerHTML = `
    <div class="art">${plant.art}</div>
    <div class="pname">${plant.name}</div>
    <div class="pstats"><span class="harvest">⚔️ ${plant.hasil}</span> · <span class="grow">📈 ${plant.tumbuh}</span></div>
    ${plant.duri ? `<div class="duri">🌶️ ${plant.duri}</div>` : ''}`;
  el.addEventListener('click', () => ui.onBedClick(side, state.sides[side].beds.indexOf(plant)));
  return el;
}

function bedSlot(side, index, state, ui) {
  const el = document.createElement('div');
  el.className = 'bed-slot';
  el.textContent = 'petak kosong';
  const targetable =
    ui.targeting && ui.targeting.targets.some((t) => t.kind === 'bed' && t.side === side && t.bed === index);
  if (targetable) {
    el.classList.add('targetable');
    el.textContent = 'tanam di sini';
    el.addEventListener('click', () => ui.onBedClick(side, index));
  }
  return el;
}

export function renderAll(state, ui) {
  // health + shield
  healthBar(state, 1);
  healthBar(state, 0);
  if (ui.prevHealth && ui.prevHealth[0] !== state.sides[0].health) {
    const bar = document.getElementById('my-bar');
    bar.classList.remove('flash');
    void bar.offsetWidth;
    bar.classList.add('flash');
  }
  if (ui.prevHealth && ui.prevHealth[1] !== state.sides[1].health) {
    const bar = document.getElementById('foe-bar');
    bar.classList.remove('flash');
    void bar.offsetWidth;
    bar.classList.add('flash');
  }
  ui.prevHealth = [state.sides[0].health, state.sides[1].health];

  document.getElementById('deck-foe').textContent = `Dek lawan: ${state.sides[1].deck.length}`;
  document.getElementById('deck-me').textContent = `Dek kamu: ${state.sides[0].deck.length}`;
  document.getElementById('round-badge').textContent = `Ronde ${state.round}`;

  // intent
  const intent = state.phase === 'over' ? null : aiIntent(state);
  document.getElementById('intent').innerHTML = intent
    ? `<b>Rencana lawan ${intent.icon}:</b> Ratu Hama ${intent.text}`
    : '<b>Rencana lawan:</b> —';

  // foe hand backs
  const foeHand = document.getElementById('foe-hand');
  foeHand.innerHTML = '';
  state.sides[1].hand.forEach(() => {
    const back = document.createElement('div');
    back.className = 'card-back';
    back.textContent = '🌻';
    foeHand.appendChild(back);
  });
  const count = document.createElement('span');
  count.className = 'count';
  count.textContent = `${state.sides[1].hand.length} kartu`;
  foeHand.appendChild(count);

  // beds
  for (const side of [1, 0]) {
    const row = document.getElementById(side === 1 ? 'foe-beds' : 'my-beds');
    row.innerHTML = '';
    const tag = document.createElement('span');
    tag.className = 'row-tag';
    tag.textContent = side === 1 ? 'KEBUN LAWAN' : 'KEBUNMU';
    row.appendChild(tag);
    state.sides[side].beds.forEach((bed, i) => {
      if (bed) {
        const tile = plantTile(bed, side, state, ui);
        const targetable =
          ui.targeting && ui.targeting.targets.some((t) => t.kind === 'plant' && t.side === side && t.bed === i);
        if (targetable) tile.classList.add('targetable');
        row.appendChild(tile);
      } else {
        row.appendChild(bedSlot(side, i, state, ui));
      }
    });
  }

  // weather strip
  const strip = document.getElementById('weather-strip');
  const chips = [];
  if (state.sides[0].sun) chips.push('<span class="weather-chip sun">☀️ Matahari (kamu)</span>');
  if (state.sides[0].rain) chips.push('<span class="weather-chip">🌧️ Hujan (kamu)</span>');
  if (state.sides[1].sun) chips.push('<span class="weather-chip sun">☀️ Matahari (lawan)</span>');
  if (state.sides[1].rain) chips.push('<span class="weather-chip">🌧️ Hujan (lawan)</span>');
  if (state.sides[0].sun && state.sides[0].rain) chips.push('<span class="weather-chip combo">🌸 KOMBO MEKAR siap!</span>');
  if (state.sides[0].drought) chips.push('<span class="weather-chip">🏜️ Kemarau: tanamanmu tidak panen</span>');
  if (state.sides[1].drought) chips.push('<span class="weather-chip">🏜️ Kemarau: tanaman lawan tidak panen</span>');
  if (state.sides[0].blockPests) chips.push('<span class="weather-chip">🧑‍🌾 Orang-orangan melindungimu</span>');
  if (state.sides[1].blockPests) chips.push('<span class="weather-chip">🧑‍🌾 Orang-orangan melindungi lawan</span>');
  strip.innerHTML = chips.join('') || '<span style="font-size:12px;color:rgba(255,248,230,0.4)">cuaca cerah — belum ada efek lapangan</span>';

  // energy
  const me = state.sides[0];
  const pips = document.getElementById('pips');
  pips.innerHTML = '';
  for (let i = 0; i < me.maxEnergy; i++) {
    const pip = document.createElement('span');
    pip.className = 'pip' + (i < me.energy ? '' : ' off');
    pip.textContent = '💧';
    pips.appendChild(pip);
  }
  document.getElementById('energy-text').textContent = `${me.energy}/${me.maxEnergy} embun`;

  // hand
  const hand = document.getElementById('hand');
  hand.innerHTML = '';
  if (!me.hand.length) {
    const empty = document.createElement('div');
    empty.id = 'hand-empty';
    empty.textContent = 'Tangan kosong — akhiri giliran untuk ambil kartu.';
    hand.appendChild(empty);
  } else {
    me.hand.forEach((card, i) => hand.appendChild(cardElement(card, i, state, ui)));
  }

  // controls
  document.getElementById('btn-end').disabled = state.phase !== 'player';

  // score panel
  document.getElementById('score-panel').innerHTML =
    `🌻 <b>Kesehatan:</b> kamu ${me.health} · lawan ${state.sides[1].health}<br>` +
    `⚔️ <b>Panen:</b> kamu ${me.harvested} · lawan ${state.sides[1].harvested}<br>` +
    `🃏 <b>Kartu:</b> kamu ${me.played} · lawan ${state.sides[1].played}<br>` +
    `🐛 <b>Dimakan:</b> kamu ${state.sides[1].eaten} · lawan ${me.eaten}`;

  // log, newest first
  const entries = document.getElementById('log-entries');
  entries.innerHTML = [...state.log]
    .reverse()
    .map((e) => `<div class="entry"><span class="r">R${e.round} —</span> ${e.text}</div>`)
    .join('');
}

let bannerTimer = null;
export function showBanner(text, ms = 1600) {
  const banner = document.getElementById('banner');
  banner.textContent = text;
  banner.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => banner.classList.remove('show'), ms);
}

export function showOverlay(kind, state) {
  const overlay = document.getElementById('overlay');
  overlay.classList.remove('hidden');
  if (kind === 'title') {
    overlay.innerHTML = `
      <div class="big-glyph">🌻🧑‍🌾</div>
      <h1>KEBUN<br>TERAKHIR</h1>
      <div class="sub">Duel kartu kebun 1 lawan 1 — pertahankan kebun terakhir dari Ratu Hama sebelum dia memakan semuanya.</div>
      <div class="suit-legend">
        <div class="item"><span class="g">🌱</span><span class="dot" style="background:#2e9e4f"></span>TANAMAN</div>
        <div class="item"><span class="g">🐛</span><span class="dot" style="background:#8b4fd8"></span>HAMA</div>
        <div class="item"><span class="g">🌦️</span><span class="dot" style="background:#2b7fd4"></span>CUACA</div>
        <div class="item"><span class="g">🛡️</span><span class="dot" style="background:#c98a2b"></span>PAGAR</div>
      </div>
      <button class="btn primary" id="btn-start" style="font-size:20px;padding:14px 34px">🌱 MULAI BERKEBUN</button>
      <div class="howto"><b>Cara main:</b> tiap ronde dapat embun + 1 kartu. Klik kartu (atau tekan 1–7) untuk memainkannya. Tanaman tumbuh di petak lalu panen tiap giliran. <b>☀️ Matahari + 🌧️ Hujan = KOMBO MEKAR!</b> Hama memakan tanaman lawan — pagar melindungimu. Kebun 40 lawan 40. Enter = akhiri giliran.</div>
      <div class="fine">Game kartu orisinal • main offline • tanpa akun</div>`;
    document.getElementById('btn-start').addEventListener('click', () => {
      overlay.classList.add('hidden');
      window.dispatchEvent(new CustomEvent('kebun-start'));
    });
  } else {
    const win = kind === 'win';
    const me = state.sides[0];
    const foe = state.sides[1];
    const petals = win
      ? Array.from({ length: 14 }, (_, i) => `<span class="petal" style="left:${(i * 67) % 100}%;animation-duration:${2.4 + (i % 5) * 0.5}s;animation-delay:${(i % 7) * 0.3}s">${['🌸', '🌻', '🌱', '🌼'][i % 4]}</span>`).join('')
      : '';
    overlay.innerHTML = `
      ${win ? `<div class="petals">${petals}</div>` : ''}
      <div class="big-glyph">${win ? '🏆' : '🥀'}</div>
      <h1 class="${win ? '' : 'lose'}">${win ? 'PANEN RAYA!' : 'KEBUNMU LAYU…'}</h1>
      <div class="sub">${win ? 'Ratu Hama kabur dan kebun terakhir selamat. Panenmu tahun ini legendaris, Tukang Kebun!' : 'Ratu Hama memakan habis kebunmu. Tanahnya masih di sana — tanam lagi di ronde berikut!'}</div>
      <div class="stats-grid">
        <div class="stat-box"><div class="v">${me.health} / ${me.maxHealth}</div><div class="k">Kesehatanmu</div></div>
        <div class="stat-box"><div class="v">${foe.health} / ${foe.maxHealth}</div><div class="k">Kesehatan lawan</div></div>
        <div class="stat-box"><div class="v">${state.round}</div><div class="k">Ronde</div></div>
        <div class="stat-box"><div class="v">${me.played + foe.played}</div><div class="k">Kartu dimainkan</div></div>
      </div>
      <div>
        <button class="btn primary" id="btn-again" style="font-size:18px;padding:12px 28px">🌱 TANAM LAGI</button>
        <button class="btn ghost" id="btn-back-title" style="margin-left:10px">Kembali ke Judul</button>
      </div>
      <div class="fine">Kebun Terakhir — duel kartu kebun orisinal</div>`;
    document.getElementById('btn-again').addEventListener('click', () => {
      overlay.classList.add('hidden');
      window.dispatchEvent(new CustomEvent('kebun-restart'));
    });
    document.getElementById('btn-back-title').addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('kebun-title'));
    });
  }
}

export function hideOverlay() {
  document.getElementById('overlay').classList.add('hidden');
}
