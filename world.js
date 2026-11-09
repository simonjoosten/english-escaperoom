/* =====================================================================
   World, people, boat race, island, notes room and win screen.
   Uses the globals from index.html: $, show, rnd, shuffle, me, other,
   names, conn, testMode, toHub.
   ===================================================================== */
(() => {
'use strict';

const TS = 32, VW = 640, VH = 384;
const TEAM_COLOR = { 1: '#ff5d73', 2: '#38b6ff' };
const SOLID = 'TWOHXKBd';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const send = o => { try { if (conn && conn.open) conn.send(o); } catch (e) {} };
const seeded = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };

// ---------------------------------------------------------------- images (made in Blender)
const img = {};
['boat', 'shark', 'rock_a', 'rock_b', 'p_mia', 'p_tom', 'p_lisa', 'p_finn'].forEach(n => { const i = new Image(); i.src = 'media/' + n + '.png'; img[n] = i; });
const loaded = i => i && i.complete && i.naturalWidth > 0;

// ---------------------------------------------------------------- people and their questions
const Q = (q, opts, a) => ({ q, opts, a });
const NPCS = {
  mia: { name: 'Mia', letter: 'B', scene: 'world', tx: 13, ty: 7, color: '#ff8fb1', hair: '#6b3a22', portrait: 'p_mia',
    greet: 'Hi! I am Mia. I love English! Can you answer 3 questions about pronouns for me?',
    thanks: 'Thank you! Now go and find the other people in the village.',
    pool: [
      Q('My brother is tall. ___ plays football.', ['He', 'She', 'It', 'We'], 'He'),
      Q('My sister and I are happy. ___ love music.', ['We', 'They', 'You', 'She'], 'We'),
      Q('The cat is on the sofa. ___ is sleeping.', ['It', 'He', 'They', 'We'], 'It'),
      Q('Tom and Anna are my friends. ___ are kind.', ['They', 'We', 'He', 'It'], 'They'),
      Q('My name is Mia. ___ am from Spain.', ['I', 'You', 'He', 'She'], 'I'),
      Q('Mum is in the kitchen. ___ is cooking.', ['She', 'He', 'They', 'It'], 'She'),
    ] },
  tom: { name: 'Tom', letter: 'O', scene: 'houseA', tx: 7, ty: 3, color: '#4dabf7', hair: '#2b1d14', portrait: 'p_tom',
    greet: 'Welcome to my home! I will ask you about object pronouns: me, you, him, her, it, us, them.',
    thanks: 'You were great! Good luck on your trip.',
    pool: [
      Q('Look at Anna. I can see ___.', ['her', 'she', 'he', 'they'], 'her'),
      Q('Please help ___. I am lost.', ['me', 'I', 'my', 'we'], 'me'),
      Q('Tom is my friend. I like ___.', ['him', 'he', 'his', 'they'], 'him'),
      Q('The dogs are hungry. Give ___ some food.', ['them', 'they', 'it', 'we'], 'them'),
      Q('Mum is calling you and me. She is calling ___.', ['us', 'we', 'they', 'her'], 'us'),
      Q('The ball is red. Kick ___ to me.', ['it', 'he', 'they', 'she'], 'it'),
    ] },
  lisa: { name: 'Lisa', letter: 'A', scene: 'houseB', tx: 7, ty: 3, color: '#9b7bff', hair: '#d98c2b', portrait: 'p_lisa',
    greet: 'Hello! I am Lisa and I bake bread. Can you answer 3 pronoun questions?',
    thanks: 'Thanks! Here, take some bread for the road.',
    pool: [
      Q('You and your friend are late. ___ must hurry.', ['You', 'We', 'They', 'He'], 'You'),
      Q('Lisa and I are cooks. ___ make bread.', ['We', 'They', 'She', 'I'], 'We'),
      Q('Peter is a doctor. ___ works at the hospital.', ['He', 'She', 'They', 'It'], 'He'),
      Q('I love Anna and Tom. I see ___ every day.', ['them', 'they', 'him', 'her'], 'them'),
      Q('The sun is bright. ___ is hot today.', ['It', 'He', 'She', 'We'], 'It'),
      Q('Where are you? I cannot see ___.', ['you', 'your', 'I', 'we'], 'you'),
    ] },
  finn: { name: 'Captain Finn', letter: 'T', scene: 'houseC', tx: 6, ty: 4, color: '#2f5fa8', hair: '#b9b9c6', portrait: 'p_finn',
    greet: 'Ahoy! I am Captain Finn. Answer 3 questions and I will help you with your boat.',
    thanks: 'Ahoy! The boat is waiting at the dock.',
    pool: [
      Q('The boys are in the boat. ___ are sailing.', ['They', 'We', 'He', 'It'], 'They'),
      Q('I am the captain. Everybody listens to ___.', ['me', 'I', 'we', 'they'], 'me'),
      Q('Anna is my crew. I trust ___.', ['her', 'she', 'he', 'they'], 'her'),
      Q('You and I are a team. ___ can win!', ['We', 'They', 'You', 'It'], 'We'),
      Q('The shark is big. Do not touch ___!', ['it', 'he', 'him', 'they'], 'it'),
      Q('The captain is a woman. ___ is very brave.', ['She', 'He', 'It', 'They'], 'She'),
    ] },
};
const WORD = ['B', 'O', 'A', 'T'];
let done = {};            // npc id -> true

// ---------------------------------------------------------------- scenes
const scenes = {};
const grid = (w, h, f) => Array.from({ length: h }, () => Array(w).fill(f));
const rect = (g, ch, c0, r0, c1, r1) => { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (g[r] && g[r][c] !== undefined) g[r][c] = ch; };
const lay = (g, ch, c0, r0, c1, r1) => { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (g[r] && '.f'.includes(g[r][c])) g[r][c] = ch; };
function house(sc, c, r, doorCol, door, roof) {
  for (let rr_ = 0; rr_ < 3; rr_++) for (let cc = 0; cc < 4; cc++) sc.g[r + rr_][c + cc] = 'H';
  sc.g[r + 2][doorCol] = door; sc.houses.push({ c, r, doorCol, roof });
}

function buildScenes() {
  // ---- the village (30 x 20)
  { const W = 30, H = 20, g = grid(W, H, '.');
    const sc = scenes.world = { id: 'world', g, w: W, h: H, kind: 'out', houses: [], doors: {}, lamps: [[5 * TS + 6, 5 * TS + 22], [10 * TS - 6, 8 * TS + 4], [15 * TS + 22, 9 * TS + 24], [24 * TS - 8, 7 * TS + 24]] };
    rect(g, 'T', 0, 0, W - 1, 0); rect(g, 'T', 0, H - 1, W - 1, H - 1); rect(g, 'T', 0, 0, 0, H - 1);
    rect(g, 'O', 25, 0, W - 1, H - 1); rect(g, 'S', 23, 1, 24, H - 2);
    rect(g, 'W', 16, 5, 18, 7);
    house(sc, 3, 1, 5, 'd', '#d9604a'); house(sc, 10, 1, 11, 'D', '#4a7fd9'); house(sc, 4, 9, 5, 'D', '#7a5ad9'); house(sc, 14, 12, 15, 'D', '#d99a2a');
    lay(g, 'p', 5, 4, 5, 8); lay(g, 'p', 5, 8, 22, 8); lay(g, 'p', 11, 4, 11, 8); lay(g, 'p', 13, 8, 13, 15); lay(g, 'p', 13, 15, 16, 15); lay(g, 'p', 5, 12, 5, 15); lay(g, 'p', 5, 15, 13, 15); lay(g, 'p', 22, 8, 22, 10);
    rect(g, 'P', 25, 9, 27, 10);
    [[8, 4], [9, 4], [8, 5], [20, 3], [21, 3], [20, 13], [21, 13], [8, 15], [9, 17], [2, 14], [2, 16], [18, 10], [19, 10], [22, 16], [22, 17], [12, 17], [13, 18], [16, 2], [17, 2]].forEach(([c, r]) => lay(g, 'T', c, r, c, r));
    [[7, 6], [9, 7], [15, 9], [19, 15], [3, 7], [14, 3], [12, 11], [20, 7], [7, 13], [18, 17], [10, 14]].forEach(([c, r]) => lay(g, 'f', c, r, c, r));
    sc.doors['11,3'] = { to: 'houseA', tx: 4, ty: 5 }; sc.doors['5,11'] = { to: 'houseB', tx: 4, ty: 5 }; sc.doors['15,14'] = { to: 'houseC', tx: 4, ty: 5 };
    sc.boat = { x: 28 * TS + 8, y: 9.7 * TS };
  }
  // ---- inside the houses (10 x 7)
  const inside = (id, theme, exit, decor) => {
    const W = 10, H = 7, g = grid(W, H, 'F'); rect(g, 'X', 0, 0, W - 1, 0); rect(g, 'X', 0, H - 1, W - 1, H - 1); rect(g, 'X', 0, 0, 0, H - 1); rect(g, 'X', W - 1, 0, W - 1, H - 1);
    g[H - 1][4] = 'D'; decor(g);
    scenes[id] = { id, g, w: W, h: H, kind: 'in', theme, houses: [], doors: { '4,6': exit } };
  };
  inside('houseA', { floor: '#c9a06b', floor2: '#b98d57', wall: '#7b5a8e', trim: '#4f3763', rug: '#d9604a' }, { to: 'world', tx: 11, ty: 4 },
    g => { rect(g, 'B', 2, 1, 3, 1); rect(g, 'B', 6, 1, 7, 1); rect(g, 'K', 3, 3, 4, 3); rect(g, 'R', 4, 4, 6, 5); });
  inside('houseB', { floor: '#e3c79a', floor2: '#d6b685', wall: '#d98fa6', trim: '#a8556f', rug: '#4a7fd9' }, { to: 'world', tx: 5, ty: 12 },
    g => { rect(g, 'K', 2, 2, 5, 2); rect(g, 'B', 8, 1, 8, 2); rect(g, 'B', 1, 1, 1, 1); rect(g, 'R', 3, 4, 5, 5); });
  inside('houseC', { floor: '#a98462', floor2: '#98734f', wall: '#2f5f8f', trim: '#1d3c5c', rug: '#e8b923' }, { to: 'world', tx: 15, ty: 15 },
    g => { rect(g, 'K', 3, 2, 5, 2); rect(g, 'B', 1, 1, 1, 2); rect(g, 'B', 8, 1, 8, 2); rect(g, 'R', 2, 4, 4, 5); });
  // ---- the island (16 x 10)
  { const W = 16, H = 10, g = grid(W, H, 'O'); rect(g, 'S', 1, 1, 14, 8);
    const sc = scenes.island = { id: 'island', g, w: W, h: H, kind: 'island', houses: [], doors: {}, lamps: [] };
    house(sc, 6, 1, 7, 'D', '#2f9e6e');
    [[2, 2], [13, 2], [2, 7], [13, 7], [4, 5], [11, 5], [9, 7]].forEach(([c, r]) => { g[r][c] = 'T'; });
    sc.doors['7,3'] = { ui: 'notes' };
  }
  Object.values(NPCS).forEach(n => { n.px = n.tx * TS + 16; n.py = n.ty * TS + 22; });
}

// ---------------------------------------------------------------- state
let started = false, cur = null, loopOn = false, nearTarget = null, doorCooldown = 0;
const player = { x: 0, y: 0, moving: false };
const partner = { x: 0, y: 0, tx: 0, ty: 0, seen: 0, moving: false, s: '' };
const keys = {};
let lastSend = 0, botDir = [0, 0], botTimer = 0, dlg = null, dlgOpts = [];

function setScene(id, tx, ty) {
  cur = scenes[id];
  player.x = tx * TS + 16; player.y = ty * TS + 22; player.moving = false;
  doorCooldown = performance.now() + 500;
  if (testMode) { partner.s = id; partner.x = partner.tx = player.x + 28; partner.y = partner.ty = player.y + 6; partner.seen = Infinity; }
  if (!cur.bg) buildBg(cur);
}

function solidAt(x, y) {
  const c = Math.floor(x / TS), r = Math.floor(y / TS);
  if (r < 0 || c < 0 || r >= cur.h || c >= cur.w) return true;
  return SOLID.includes(cur.g[r][c]);
}
function blocked(x, y) {
  if (solidAt(x - 6, y - 6) || solidAt(x + 6, y - 6) || solidAt(x - 6, y) || solidAt(x + 6, y)) return true;
  for (const n of Object.values(NPCS)) if (n.scene === cur.id && Math.hypot(x - n.px, y - n.py) < 15) return true;
  return false;
}
function step(o, dx, dy) {
  if (!blocked(o.x + dx, o.y)) o.x += dx;
  if (!blocked(o.x, o.y + dy)) o.y += dy;
}

// ---------------------------------------------------------------- HUD: letters + toast
function renderLetters() {
  const el = $('letters'); if (!el) return;
  el.innerHTML = WORD.map(l => {
    const npc = Object.values(NPCS).find(n => n.letter === l);
    const got = Object.keys(done).some(k => NPCS[k].letter === l);
    return `<span class="${got ? 'got' : ''}" title="${got ? '' : 'Talk to ' + npc.name}">${got ? l : '?'}</span>`;
  }).join('');
}
const allLetters = () => Object.keys(NPCS).every(k => done[k]);
let toastTimer = 0;
function toast(text, ms = 2600) {
  const t = $('toast'); t.textContent = text; t.style.display = 'block';
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.style.display = 'none'; }, ms);
}

// ---------------------------------------------------------------- dialogue with people
function say(text, buttons, tag) {
  $('dSay').textContent = text;
  $('dTag').textContent = tag || '';
  const box = $('dOpts'); box.innerHTML = ''; dlgOpts = [];
  buttons.forEach(([label, fn], i) => {
    const b = document.createElement('button');
    b.textContent = (buttons.length > 1 ? (i + 1) + '. ' : '') + label;
    b.onclick = fn; box.appendChild(b); dlgOpts.push(b);
  });
}
function openDialog(id) {
  const n = NPCS[id];
  dlg = { id, n, step: 0, qs: shuffle(n.pool).slice(0, 3) };
  $('dialog').style.display = 'flex';
  $('dPortrait').src = 'media/' + n.portrait + '.png';
  $('dName').textContent = n.name;
  for (const k in keys) keys[k] = false;
  if (done[id]) return say(n.thanks, [['Bye!', closeDialog]]);
  say(n.greet, [["Let's go!", nextQuestion]]);
}
function closeDialog() { dlg = null; $('dialog').style.display = 'none'; }
function nextQuestion() {
  if (dlg.step >= 3) return giveLetter();
  const q = dlg.qs[dlg.step];
  say(q.q, shuffle(q.opts).map(o => [o, () => answerQuestion(o)]), `Question ${dlg.step + 1} / 3`);
}
function answerQuestion(o) {
  const q = dlg.qs[dlg.step];
  if (o === q.a) { dlg.step++; say('Correct! ✅', [[dlg.step >= 3 ? 'Next' : 'Next question', nextQuestion]]); }
  else say(`Not quite. The answer is "${q.a}". Come back and try again!`, [['OK', closeDialog]]);
}
function giveLetter() {
  const n = dlg.n; done[dlg.id] = true; renderLetters(); send({ npcDone: dlg.id });
  const extra = allLetters() ? ' You have B-O-A-T! Go to the ocean and board the boat.' : '';
  say(`Great job! Here is a letter for you: "${n.letter}".${extra}`, [['Thanks!', closeDialog]]);
}

// ---------------------------------------------------------------- interaction (press E)
function findTarget() {
  const px = player.x, py = player.y - 8;
  let best = null, bd = 50;
  for (const n of Object.values(NPCS)) if (n.scene === cur.id) { const d = Math.hypot(px - n.px, py - (n.py - 8)); if (d < bd) { bd = d; best = { type: 'npc', n, x: n.px, y: n.py }; } }
  if (cur.boat) { const d = Math.hypot(px - cur.boat.x, py - cur.boat.y); if (d < 90 && d < bd + 40) best = { type: 'boat', x: cur.boat.x, y: cur.boat.y - 10 }; }
  return best;
}
function interact() {
  if (dlg || !$('outside').classList.contains('active') || !cur) return;
  const t = findTarget(); if (!t) return;
  if (t.type === 'npc') openDialog(Object.keys(NPCS).find(k => NPCS[k] === t.n));
  else if (t.type === 'boat') {
    if (!allLetters()) toast('You need the word B-O-A-T first! Talk to everyone in the village.');
    else enterBoat();
  }
}

// ---------------------------------------------------------------- keyboard
window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if ($('outside').classList.contains('active')) {
    if (dlg) {
      if (/^[1-4]$/.test(k) && dlgOpts[+k - 1]) { dlgOpts[+k - 1].click(); e.preventDefault(); }
      else if ((k === 'e' || k === 'enter' || k === ' ') && dlgOpts.length === 1) { dlgOpts[0].click(); e.preventDefault(); }
      else if (k === 'escape') closeDialog();
      return;
    }
    if (k === 'e') { interact(); e.preventDefault(); return; }
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) { keys[k] = true; e.preventDefault(); }
  } else if ($('boat').classList.contains('active')) {
    if (['arrowleft', 'arrowright', 'a', 'd'].includes(k)) { keys[k] = true; e.preventDefault(); }
  }
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
const hold = (id, k) => {
  const b = $(id); if (!b) return;
  b.addEventListener('pointerdown', e => { keys[k] = true; e.preventDefault(); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => { keys[k] = false; }));
};
[['dUp', 'arrowup'], ['dDown', 'arrowdown'], ['dLeft', 'arrowleft'], ['dRight', 'arrowright'], ['stL', 'arrowleft'], ['stR', 'arrowright']].forEach(([id, k]) => hold(id, k));
$('eBtn').addEventListener('pointerdown', e => { e.preventDefault(); if (dlg && dlgOpts.length === 1) dlgOpts[0].click(); else interact(); });

// ---------------------------------------------------------------- drawing: backgrounds (rendered once per scene)
function drawHouse(g, h) {
  const hx = h.c * TS, hy = h.r * TS;
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(hx + 2 * TS, hy + 3 * TS + 2, 2.4 * TS, 10, 0, 0, 7); g.fill();
  g.fillStyle = '#efe0c2'; g.fillRect(hx, hy + 2 * TS - 6, 4 * TS, TS + 6);
  g.fillStyle = 'rgba(0,0,0,.08)'; for (let i = 0; i < 4; i++) g.fillRect(hx, hy + 2 * TS + i * 9, 4 * TS, 1);
  g.fillStyle = '#7a4a2b'; g.fillRect(hx + 3 * TS - 6, hy - 18, 18, 38);
  g.fillStyle = '#5c3720'; g.fillRect(hx + 3 * TS - 9, hy - 22, 24, 7);
  const roof = g.createLinearGradient(0, hy - 6, 0, hy + 2 * TS); roof.addColorStop(0, h.roof); roof.addColorStop(1, 'rgba(0,0,0,.35)');
  g.fillStyle = h.roof; g.beginPath(); g.moveTo(hx - 12, hy + 2 * TS - 4); g.lineTo(hx + 28, hy - 10); g.lineTo(hx + 4 * TS - 28, hy - 10); g.lineTo(hx + 4 * TS + 12, hy + 2 * TS - 4); g.closePath(); g.fill();
  g.fillStyle = roof; g.fill();
  g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1.5;
  for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(hx - 12 + i * 3, hy + 2 * TS - 4 - i * 12); g.lineTo(hx + 4 * TS + 12 - i * 3, hy + 2 * TS - 4 - i * 12); g.stroke(); }
  g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(hx - 12, hy + 2 * TS - 6, 4 * TS + 24, 5);
  [hx + 12, hx + 3 * TS - 4].forEach(wx => {
    if (Math.abs(wx - h.doorCol * TS) < 28) return;
    g.fillStyle = '#6b3f22'; rr(g, wx - 2, hy + 2 * TS + 2, 22, 20, 3); g.fill();
    g.fillStyle = '#ffd98a'; g.fillRect(wx, hy + 2 * TS + 4, 18, 16);
    g.fillStyle = '#6b3f22'; g.fillRect(wx + 8, hy + 2 * TS + 4, 2, 16); g.fillRect(wx, hy + 2 * TS + 11, 18, 2);
  });
  const dx = h.doorCol * TS;
  g.fillStyle = '#5c3720'; rr(g, dx + 1, hy + 2 * TS - 2, TS - 2, TS + 2, 4); g.fill();
  g.fillStyle = '#9a5e38'; rr(g, dx + 4, hy + 2 * TS + 1, TS - 8, TS - 1, 3); g.fill();
  g.fillStyle = '#ffd43b'; g.beginPath(); g.arc(dx + TS - 9, hy + 2 * TS + 17, 2.2, 0, 7); g.fill();
  g.fillStyle = '#c0392b'; rr(g, dx - 2, (h.r + 3) * TS + 2, TS + 4, 10, 3); g.fill();
}

function buildBg(sc) {
  const cv = document.createElement('canvas'); cv.width = sc.w * TS; cv.height = sc.h * TS;
  const g = cv.getContext('2d'), rand = seeded(sc.id.length * 31 + 5);
  const at = (r, c) => (sc.g[r] && sc.g[r][c]) || 'O';
  if (sc.kind === 'in') {
    const th = sc.theme;
    for (let r = 0; r < sc.h; r++) for (let c = 0; c < sc.w; c++) {
      const x = c * TS, y = r * TS, ch = sc.g[r][c];
      if (ch === 'X') {
        g.fillStyle = th.wall; g.fillRect(x, y, TS, TS);
        g.fillStyle = 'rgba(255,255,255,.07)'; if (c % 2 === 0) g.fillRect(x, y, TS / 2, TS);
        if (r === 0) { g.fillStyle = th.trim; g.fillRect(x, y + TS - 6, TS, 6); }
        if (r === sc.h - 1) { g.fillStyle = th.trim; g.fillRect(x, y, TS, 6); }
        if (r === 0 && (c === 2 || c === 7)) { g.fillStyle = th.trim; rr(g, x - 2, y + 2, TS + 4, TS - 6, 4); g.fill(); g.fillStyle = '#9fd8ff'; g.fillRect(x + 2, y + 5, TS - 4, TS - 12); g.fillStyle = '#fff6'; g.fillRect(x + 4, y + 7, 8, 5); }
        continue;
      }
      g.fillStyle = (r % 2) ? th.floor : th.floor2; g.fillRect(x, y, TS, TS);
      g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y + .5); g.lineTo(x + TS, y + .5); g.moveTo(x + ((r * 13 + c * 7) % TS), y); g.lineTo(x + ((r * 13 + c * 7) % TS), y + TS); g.stroke();
      if (ch === 'R') {
        g.fillStyle = th.rug; g.fillRect(x, y, TS, TS);
        g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2;
        const nb = (dr, dc) => at(r + dr, c + dc) === 'R';
        g.beginPath();
        if (!nb(-1, 0)) { g.moveTo(x, y + 4); g.lineTo(x + TS, y + 4); } if (!nb(1, 0)) { g.moveTo(x, y + TS - 4); g.lineTo(x + TS, y + TS - 4); }
        if (!nb(0, -1)) { g.moveTo(x + 4, y); g.lineTo(x + 4, y + TS); } if (!nb(0, 1)) { g.moveTo(x + TS - 4, y); g.lineTo(x + TS - 4, y + TS); }
        g.stroke();
        g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(x + TS / 2, y + TS / 2, 6, 0, 7); g.fill();
      }
      if (ch === 'D') { g.fillStyle = '#5c3720'; g.fillRect(x + 2, y, TS - 4, TS); g.fillStyle = '#c0392b'; rr(g, x + 2, y - 8, TS - 4, 10, 3); g.fill(); }
      if (ch === 'K') { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 1, y + 6, TS, TS - 2); g.fillStyle = '#7a4a2b'; rr(g, x, y + 2, TS, TS - 4, 4); g.fill(); g.fillStyle = '#a8693c'; rr(g, x + 2, y + 3, TS - 4, TS - 12, 3); g.fill();
        if (rand() > .4) { g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 10 + rand() * 12, y + 11, 4, 0, 7); g.fill(); g.fillStyle = '#6b3f22'; g.beginPath(); g.arc(x + 10 + rand() * 12, y + 11, 2, 0, 7); g.fill(); } }
      if (ch === 'B') { g.fillStyle = '#4a2f1c'; g.fillRect(x, y - 2, TS, TS + 2); g.fillStyle = '#6b4427'; g.fillRect(x + 2, y, TS - 4, TS - 2);
        for (let row = 0; row < 2; row++) { let bx = x + 4; while (bx < x + TS - 6) { const w = 4 + rand() * 4; g.fillStyle = ['#e8394f', '#4dabf7', '#ffd43b', '#3ddc84', '#9b7bff'][Math.floor(rand() * 5)]; g.fillRect(bx, y + 3 + row * 13, w, 11); bx += w + 1; } }
        g.fillStyle = '#3a2412'; g.fillRect(x + 2, y + 14, TS - 4, 2); }
    }
  } else {
    const sandy = sc.kind === 'island';
    for (let r = 0; r < sc.h; r++) for (let c = 0; c < sc.w; c++) {
      const x = c * TS, y = r * TS, ch = sc.g[r][c];
      if (ch === 'O' || ch === 'W' || ch === 'P') {
        const deep = ch === 'O' ? 1 : 0;
        const wg = g.createLinearGradient(x, y, x, y + TS); wg.addColorStop(0, deep ? '#2f84d1' : '#4aa3e6'); wg.addColorStop(1, deep ? '#246cb3' : '#2d78bd');
        g.fillStyle = wg; g.fillRect(x, y, TS, TS);
        if (ch === 'O') { // white foam where the sea meets the beach
          g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3;
          [[0, -1, x, y, x + TS, y], [0, 1, x, y + TS, x + TS, y + TS], [-1, 0, x, y, x, y + TS], [1, 0, x + TS, y, x + TS, y + TS]].forEach(([dc, dr, x1, y1, x2, y2]) => { const n = at(r + dr, c + dc); if (n === 'S') { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); } });
        }
        if (ch === 'P') { for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#a8693c' : '#b9783f'; g.fillRect(x, y + i * 8, TS, 7); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x, y + i * 8 + 7, TS, 1); } g.fillStyle = '#5c3720'; g.fillRect(x + 2, y + 2, 2, 2); g.fillRect(x + TS - 4, y + 2, 2, 2); }
        continue;
      }
      if (ch === 'S' || (sandy && ch === 'T')) {
        g.fillStyle = (r + c) % 2 ? '#efdcA0'.toLowerCase() : '#ead89a'; g.fillRect(x, y, TS, TS);
        g.fillStyle = 'rgba(160,120,60,.25)'; for (let i = 0; i < 4; i++) g.fillRect(x + rand() * 28, y + rand() * 28, 2, 2);
        continue;
      }
      const gr = g.createLinearGradient(x, y, x, y + TS), shade = (r + c) % 2;
      gr.addColorStop(0, shade ? '#4a9a55' : '#44904f'); gr.addColorStop(1, shade ? '#3f8a4a' : '#3a8045');
      g.fillStyle = gr; g.fillRect(x, y, TS, TS);
      for (let i = 0; i < 5; i++) { const bx = x + rand() * TS, by = y + 6 + rand() * (TS - 6); g.strokeStyle = rand() > .5 ? '#5fb86b' : '#2f6f3b'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + (rand() - .5) * 3, by - 4 - rand() * 3); g.stroke(); }
      if (ch === 'p') {
        g.fillStyle = '#d4b27a'; rr(g, x - 1, y - 1, TS + 2, TS + 2, 6); g.fill(); g.fillStyle = '#c29d63';
        for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(x + 4 + rand() * 24, y + 4 + rand() * 24, 2.2, 1.6, 0, 0, 7); g.fill(); }
        g.strokeStyle = 'rgba(120,85,40,.35)'; g.lineWidth = 2;
        const isP = n => n === 'p' || n === 'D';
        if (!isP(at(r - 1, c))) { g.beginPath(); g.moveTo(x, y + 1); g.lineTo(x + TS, y + 1); g.stroke(); }
        if (!isP(at(r + 1, c))) { g.beginPath(); g.moveTo(x, y + TS - 1); g.lineTo(x + TS, y + TS - 1); g.stroke(); }
        if (!isP(at(r, c - 1))) { g.beginPath(); g.moveTo(x + 1, y); g.lineTo(x + 1, y + TS); g.stroke(); }
        if (!isP(at(r, c + 1))) { g.beginPath(); g.moveTo(x + TS - 1, y); g.lineTo(x + TS - 1, y + TS); g.stroke(); }
      }
      if (ch === 'f') {
        const cols = ['#ff8fb1', '#ffe066', '#c7a6ff', '#ffffff'];
        for (let i = 0; i < 5; i++) { const fx = x + 5 + rand() * 22, fy = y + 6 + rand() * 20; g.strokeStyle = '#2f6f3b'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx, fy + 6); g.stroke(); g.fillStyle = cols[Math.floor(rand() * cols.length)]; g.beginPath(); g.arc(fx, fy, 3, 0, 7); g.fill(); g.fillStyle = '#ffd43b'; g.beginPath(); g.arc(fx, fy, 1.1, 0, 7); g.fill(); }
      }
    }
    if (sc.id === 'world') { g.strokeStyle = '#8b8f99'; g.lineWidth = 4; rr(g, 16 * TS - 3, 5 * TS - 3, 3 * TS + 6, 3 * TS + 6, 10); g.stroke(); g.strokeStyle = '#b5b9c4'; g.lineWidth = 1.5; rr(g, 16 * TS - 3, 5 * TS - 3, 3 * TS + 6, 3 * TS + 6, 10); g.stroke(); }
    sc.houses.forEach(h => drawHouse(g, h));
  }
  sc.bg = cv;
}

// ---------------------------------------------------------------- drawing: things that move
function drawTree(g, x, y, sway, palm) {
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x + 16, y + 29, 13, 5, 0, 0, 7); g.fill();
  if (palm) {
    g.strokeStyle = '#8a5a2b'; g.lineWidth = 5; g.beginPath(); g.moveTo(x + 16, y + 30); g.quadraticCurveTo(x + 20 + sway, y + 14, x + 16 + sway, y + 2); g.stroke();
    g.fillStyle = '#2fa84a';
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + sway * .05; g.beginPath(); g.ellipse(x + 16 + sway + Math.cos(a) * 9, y + 4 + Math.sin(a) * 5, 10, 3.5, a, 0, 7); g.fill(); }
    g.fillStyle = '#6b4423'; g.beginPath(); g.arc(x + 14 + sway, y + 6, 2.2, 0, 7); g.arc(x + 19 + sway, y + 6, 2.2, 0, 7); g.fill();
    return;
  }
  g.fillStyle = '#6b4423'; g.fillRect(x + 13, y + 16, 6, 14);
  [['#1c6a2e', 16, 12, 15], ['#238a3a', 12, 9, 11], ['#2fa84a', 19, 8, 9]].forEach(([col, ox, oy, rad]) => { g.fillStyle = col; g.beginPath(); g.arc(x + ox + sway, y + oy, rad, 0, 7); g.fill(); });
  g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(x + 11 + sway, y + 6, 5, 0, 7); g.fill();
}
function drawLamp(g, x, y, t) {
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y, 7, 3, 0, 0, 7); g.fill();
  g.fillStyle = '#3a3358'; g.fillRect(x - 1.5, y - 26, 3, 26);
  const gl = g.createRadialGradient(x, y - 28, 1, x, y - 28, 34); gl.addColorStop(0, 'rgba(255,224,130,.55)'); gl.addColorStop(1, 'rgba(255,224,130,0)');
  g.fillStyle = gl; g.fillRect(x - 36, y - 64, 72, 72);
  g.fillStyle = '#ffe28a'; g.beginPath(); g.arc(x, y - 28, 4.5 + Math.sin(t / 400) * .4, 0, 7); g.fill();
}
function drawPerson(g, x, y, color, label, moving, t, hair) {
  const swing = moving ? Math.sin(t / 90) : 0, bob = moving ? Math.abs(Math.sin(t / 90)) * 2.2 : Math.sin(t / 500) * .6;
  g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x, y, 10, 4, 0, 0, 7); g.fill();
  g.fillStyle = '#2d2650'; g.fillRect(x - 5, y - 8 + Math.max(0, swing) * -2, 4, 8); g.fillRect(x + 1, y - 8 + Math.max(0, -swing) * -2, 4, 8);
  const by = y - 17 - bob;
  g.fillStyle = color; rr(g, x - 7, by, 14, 12, 4); g.fill();
  g.fillStyle = 'rgba(0,0,0,.18)'; rr(g, x - 7, by + 6, 14, 6, 3); g.fill();
  g.fillStyle = color; g.fillRect(x - 10, by + 2 + swing * 2, 3, 8); g.fillRect(x + 7, by + 2 - swing * 2, 3, 8);
  g.fillStyle = '#ffdcb0'; g.beginPath(); g.arc(x, by - 6, 8, 0, 7); g.fill();
  g.fillStyle = hair || color; g.beginPath(); g.arc(x, by - 9, 8.4, Math.PI, 0); g.fill(); g.fillRect(x - 8.4, by - 9.6, 16.8, 2.6);
  g.fillStyle = '#2a2147'; g.beginPath(); g.arc(x - 3, by - 5, 1.3, 0, 7); g.arc(x + 3, by - 5, 1.3, 0, 7); g.fill();
  g.strokeStyle = '#2a2147'; g.lineWidth = 1.2; g.beginPath(); g.arc(x, by - 3, 3, .2, Math.PI - .2); g.stroke();
  g.fillStyle = 'rgba(255,120,140,.45)'; g.beginPath(); g.arc(x - 5.5, by - 3, 1.6, 0, 7); g.arc(x + 5.5, by - 3, 1.6, 0, 7); g.fill();
  g.font = '600 12px Fredoka, system-ui'; g.textAlign = 'center';
  const tw = g.measureText(label).width + 12;
  g.fillStyle = 'rgba(15,10,36,.7)'; rr(g, x - tw / 2, by - 33, tw, 16, 8); g.fill();
  g.fillStyle = '#fff'; g.fillText(label, x, by - 21);
}
function bubble(g, x, y, text, t) {
  g.font = '600 13px Fredoka, system-ui'; g.textAlign = 'center';
  const w = g.measureText(text).width + 40, yy = y + Math.sin(t / 250) * 2;
  g.fillStyle = 'rgba(255,255,255,.96)'; rr(g, x - w / 2, yy - 20, w, 24, 12); g.fill();
  g.beginPath(); g.moveTo(x - 5, yy + 3); g.lineTo(x, yy + 9); g.lineTo(x + 5, yy + 3); g.fill();
  g.fillStyle = '#2a2147'; rr(g, x - w / 2 + 6, yy - 16, 20, 16, 5); g.fill();
  g.fillStyle = '#fff'; g.fillText('E', x - w / 2 + 16, yy - 4);
  g.fillStyle = '#2a2147'; g.textAlign = 'left'; g.fillText(text, x - w / 2 + 30, yy - 4);
}

function camera() {
  const wp = cur.w * TS, hp = cur.h * TS;
  const cx = wp <= VW ? -(VW - wp) / 2 : clamp(player.x - VW / 2, 0, wp - VW);
  const cy = hp <= VH ? -(VH - hp) / 2 : clamp(player.y - VH / 2, 0, hp - VH);
  return [cx, cy];
}

function drawWorld(t) {
  const g = $('map').getContext('2d');
  g.fillStyle = cur.kind === 'in' ? '#120d26' : '#2d78bd'; g.fillRect(0, 0, VW, VH);
  let cx = 0, cy = 0, zoom = 1;
  g.save();
  if (cur.kind === 'in') { zoom = Math.min(VW / (cur.w * TS), VH / (cur.h * TS)); g.translate((VW - cur.w * TS * zoom) / 2, (VH - cur.h * TS * zoom) / 2); g.scale(zoom, zoom); }
  else { [cx, cy] = camera(); g.translate(-cx, -cy); }
  g.drawImage(cur.bg, 0, 0);
  // moving water highlights
  const c0 = Math.max(0, Math.floor(cx / TS)), c1 = Math.min(cur.w - 1, Math.ceil((cx + VW / zoom) / TS));
  const r0 = Math.max(0, Math.floor(cy / TS)), r1 = Math.min(cur.h - 1, Math.ceil((cy + VH / zoom) / TS));
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.5;
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const ch = cur.g[r][c]; if (ch !== 'O' && ch !== 'W') continue; const x = c * TS, y = r * TS;
    for (let i = 0; i < 2; i++) { const ox = (t / 40 + c * 17 + r * 5 + i * 15) % (TS + 12) - 6; g.beginPath(); g.moveTo(x + ox, y + 9 + i * 14); g.quadraticCurveTo(x + ox + 5, y + 5 + i * 14, x + ox + 10, y + 9 + i * 14); g.stroke(); } }
  const things = [];
  for (let r = r0; r <= Math.min(cur.h - 1, r1 + 1); r++) for (let c = c0; c <= c1; c++) if (cur.g[r][c] === 'T') things.push({ y: r * TS + 30, draw: () => drawTree(g, c * TS, r * TS, Math.sin(t / 900 + c * 1.7 + r) * 1.1, cur.kind === 'island') });
  (cur.lamps || []).forEach(([lx, ly]) => things.push({ y: ly, draw: () => drawLamp(g, lx, ly, t) }));
  if (cur.boat) things.push({ y: cur.boat.y + 30, draw: () => {
    const bx = cur.boat.x, by = cur.boat.y + Math.sin(t / 600) * 2.5;
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(bx, by + 36, 26, 10, 0, 0, 7); g.fill();
    if (loaded(img.boat)) g.drawImage(img.boat, bx - 60, by - 70, 120, 120);
    else { g.fillStyle = '#9a5b2e'; g.beginPath(); g.ellipse(bx, by, 24, 44, 0, 0, 7); g.fill(); }
  } });
  Object.values(NPCS).forEach(n => { if (n.scene === cur.id) things.push({ y: n.py, draw: () => {
    drawPerson(g, n.px, n.py, n.color, n.name, false, t, n.hair);
    const near = nearTarget && nearTarget.n === n;
    if (!near) { g.font = '700 18px Fredoka'; g.textAlign = 'center'; g.fillStyle = done[Object.keys(NPCS).find(k => NPCS[k] === n)] ? '#3ddc84' : '#ffd43b'; g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 3; const yy = n.py - 58 + Math.sin(t / 250) * 2; const sym = done[Object.keys(NPCS).find(k => NPCS[k] === n)] ? '✓' : '!'; g.strokeText(sym, n.px, yy); g.fillText(sym, n.px, yy); }
  } }); });
  things.push({ y: player.y, draw: () => drawPerson(g, player.x, player.y, TEAM_COLOR[me], names[me] || 'You', player.moving, t) });
  const showPartner = testMode ? partner.s === cur.id : (conn && conn.open && partner.seen && performance.now() - partner.seen < 4000 && partner.s === cur.id);
  if (showPartner) things.push({ y: partner.y, draw: () => drawPerson(g, partner.x, partner.y, TEAM_COLOR[other], testMode ? 'Bot' : (names[other] || 'Partner'), partner.moving, t) });
  things.sort((a, b) => a.y - b.y).forEach(o => o.draw());
  if (nearTarget && !dlg) {
    if (nearTarget.type === 'npc') bubble(g, nearTarget.x, nearTarget.y - 62, 'Press E to talk', t);
    else bubble(g, nearTarget.x, nearTarget.y - 70, allLetters() ? 'Press E to board the boat' : 'Collect B-O-A-T first', t);
  }
  if (cur.kind !== 'in') {
    for (let i = 0; i < 16; i++) {
      const fx = (i * 83 + Math.sin(t / 1400 + i * 2) * 40 + cur.w * TS) % (cur.w * TS), fy = (i * 47 + Math.cos(t / 1100 + i) * 30 + cur.h * TS) % (cur.h * TS);
      const a = .35 + .35 * Math.sin(t / 350 + i * 1.7), fg = g.createRadialGradient(fx, fy, 0, fx, fy, 9); fg.addColorStop(0, `rgba(255,240,150,${a})`); fg.addColorStop(1, 'rgba(255,240,150,0)');
      g.fillStyle = fg; g.fillRect(fx - 9, fy - 9, 18, 18);
    }
  }
  g.restore();
  const vg = g.createRadialGradient(320, 192, 150, 320, 192, 400); vg.addColorStop(0, 'rgba(10,6,30,0)'); vg.addColorStop(1, cur.kind === 'in' ? 'rgba(10,6,30,.55)' : 'rgba(10,6,30,.42)');
  g.fillStyle = vg; g.fillRect(0, 0, VW, VH);
  const nm = { world: 'The Village', houseA: "Tom's house", houseB: "Lisa's bakery", houseC: 'Harbour office', island: 'Treasure island' }[cur.id];
  g.font = '600 13px Fredoka, system-ui'; g.textAlign = 'left'; const tw = g.measureText(nm).width + 18;
  g.fillStyle = 'rgba(15,10,36,.7)'; rr(g, 10, 10, tw, 24, 12); g.fill(); g.fillStyle = '#fff'; g.fillText(nm, 19, 26);
}

// ---------------------------------------------------------------- main loop for the world
function tick(t) {
  if (!$('outside').classList.contains('active')) { loopOn = false; return; }
  let dx = 0, dy = 0; const sp = 2.4;
  if (!dlg) {
    if (keys.arrowleft || keys.a) dx -= sp; if (keys.arrowright || keys.d) dx += sp;
    if (keys.arrowup || keys.w) dy -= sp; if (keys.arrowdown || keys.s) dy += sp;
  }
  if (dx && dy) { dx *= .707; dy *= .707; }
  const px = player.x, py = player.y;
  step(player, dx, dy);
  player.moving = Math.hypot(player.x - px, player.y - py) > .1;
  // doors
  if (performance.now() > doorCooldown) {
    const d = cur.doors[Math.floor(player.x / TS) + ',' + Math.floor((player.y - 2) / TS)];
    if (d) { if (d.ui === 'notes') { player.y += 12; loopOn = false; openNotes(); return; } setScene(d.to, d.tx, d.ty); }
  }
  // partner
  if (testMode) {
    if (t > botTimer) { botTimer = t + 800 + Math.random() * 1500; botDir = [rnd(-1, 1) * 1.2, rnd(-1, 1) * 1.2]; }
    const bx = partner.x, by = partner.y; step(partner, botDir[0], botDir[1]);
    partner.moving = Math.hypot(partner.x - bx, partner.y - by) > .05;
  } else {
    const bx = partner.x, by = partner.y;
    partner.x += (partner.tx - partner.x) * .25; partner.y += (partner.ty - partner.y) * .25;
    partner.moving = Math.hypot(partner.x - bx, partner.y - by) > .15;
    if (conn && conn.open && t - lastSend > 80) { lastSend = t; send({ pos: { x: Math.round(player.x), y: Math.round(player.y), s: cur.id } }); }
  }
  nearTarget = findTarget();
  drawWorld(t);
  requestAnimationFrame(tick);
}

function startLoop() { if (!loopOn) { loopOn = true; requestAnimationFrame(tick); } }

window.enterOutside = function () {
  if (!started) { started = true; buildScenes(); setScene('world', 5, 4); renderLetters(); }
  show('outside'); $('goOutside').style.display = 'block';
  $('dotMe').style.background = TEAM_COLOR[me]; $('dotOther').style.background = TEAM_COLOR[other];
  $('whoMe').textContent = `You: ${names[me] || 'Team ' + me} (Team ${me})`;
  $('whoOther').textContent = testMode ? `Partner bot (Team ${other})` : `Partner: ${names[other] || 'Team ' + other} (Team ${other})`;
  startLoop();
};
$('goOutside').onclick = () => window.enterOutside();
$('outBack').onclick = () => { closeDialog(); toHub(); };

// =====================================================================
//  BOAT RACE: one team steers, the other answers questions to keep moving
// =====================================================================
const BW = 480, BH = 600, BOATY = 440, GOAL = 2600;
let boat = null, boatLoop = false, boatReady = { me: false, other: false }, boatLast = 0, boatSent = 0, boatQ = null, qLock = false;
const isSteerer = () => testMode || me === 1;
const isAnswerer = () => testMode || me === 2;

function makeRocks(seed) {
  const r = seeded(seed), rocks = [];
  for (let y = 380; y < GOAL - 260; y += 150) {
    const n = r() < .45 ? 2 : 1, xs = [];
    for (let i = 0; i < n; i++) { let x, tries = 0; do { x = 60 + r() * (BW - 120); tries++; } while (xs.some(v => Math.abs(v - x) < 170) && tries < 20); xs.push(x);
      rocks.push({ x, y: y + r() * 60, r: 26 + r() * 8, v: r() < .5 ? 'a' : 'b', rot: r() * 6.28 }); }
  }
  return rocks;
}
function overlay(html) { const o = $('boatOverlay'); if (!html) { o.style.display = 'none'; return; } o.innerHTML = html; o.style.display = 'flex'; }

function enterBoat() {
  show('boat');
  $('boatRole').innerHTML = testMode ? 'Test mode: you steer with <b>&larr; &rarr;</b> AND answer the questions below.'
    : (me === 1 ? 'You are the <b>STEERER</b>: use <b>&larr; &rarr;</b> to avoid the rocks. Your partner keeps the boat moving!'
                : 'You are the <b>HELPER</b>: answer the questions fast to keep the boat moving. Your partner steers!');
  $('steerPad').style.display = isSteerer() ? 'flex' : 'none';
  $('qPanel').style.display = isAnswerer() ? 'block' : 'none';
  boat = null; boatReady.me = true;
  if (testMode) startBoat(Math.floor(Math.random() * 1e6));
  else { overlay('<h2>Waiting...</h2><p>Waiting for your partner to board the boat.</p>'); send({ boatReady: true }); maybeStart(); }
  nextBoatQ();
  if (!boatLoop) { boatLoop = true; boatLast = performance.now(); requestAnimationFrame(boatTick); }
}
function maybeStart() {
  if (testMode || !boatReady.me || !boatReady.other || me !== 1) return;
  const seed = Math.floor(Math.random() * 1e6);
  boatReady.me = boatReady.other = false;
  send({ boatStart: { seed } }); startBoat(seed);
}
function startBoat(seed) {
  boatReady.me = boatReady.other = false;
  boat = { seed, rocks: makeRocks(seed), x: BW / 2, dist: 0, speed: .8, gap: 175, hit: 0, status: 'count', cd: 3.2, tilt: 0, sx: BW / 2, flash: 0 };
  overlay('');
}
function boatStep(dt) {
  const b = boat;
  if (b.status === 'count') { b.cd -= dt; if (b.cd <= 0) b.status = 'run'; return; }
  if (b.status !== 'run') return;
  const vx = ((keys.arrowright || keys.d) ? 1 : 0) - ((keys.arrowleft || keys.a) ? 1 : 0);
  b.x = clamp(b.x + vx * 230 * dt, 44, BW - 44); b.tilt += (vx * .25 - b.tilt) * .15;
  b.speed = Math.max(0, b.speed - .08 * dt);
  b.dist += b.speed * 95 * dt;
  b.gap = Math.min(300, b.gap + (b.speed - .42) * 55 * dt);
  b.hit = Math.max(0, b.hit - dt); b.flash = Math.max(0, b.flash - dt);
  for (const r of b.rocks) {
    if (r.hit) continue;
    const sy = BOATY - (r.y - b.dist);
    if (Math.abs(sy - BOATY) < r.r + 22 && Math.abs(r.x - b.x) < r.r + 18) { r.hit = true; b.speed *= .35; b.gap -= 45; b.hit = .6; }
  }
  if (b.gap <= 0) b.status = 'lose';
  else if (b.dist >= GOAL) b.status = 'win';
}
function boatState() { const b = boat; return { x: Math.round(b.x), dist: Math.round(b.dist), speed: +b.speed.toFixed(3), gap: Math.round(b.gap), hit: +b.hit.toFixed(2), status: b.status, cd: +b.cd.toFixed(2) }; }

function boatTick(t) {
  if (!$('boat').classList.contains('active')) { boatLoop = false; return; }
  const dt = Math.min(.05, (t - boatLast) / 1000); boatLast = t;
  if (boat) {
    if (isSteerer()) { boatStep(dt); if (!testMode && conn && conn.open && t - boatSent > 66) { boatSent = t; send({ boat: boatState() }); } }
    else boat.hit = Math.max(0, boat.hit - dt);
    boat.sx += (boat.x - boat.sx) * .06;
    if ((boat.status === 'win' || boat.status === 'lose') && !boat.finished) { boat.finished = true; if (isSteerer() && !testMode) send({ boat: boatState() }); finishBoat(); }
    drawBoat(t);
  }
  requestAnimationFrame(boatTick);
}
function finishBoat() {
  if (boat.status === 'win') {
    overlay('<h2>You made it! &#127965;&#65039;</h2><p>Land ahead! Let\'s go to the island...</p>');
    setTimeout(() => { overlay(''); boat = null; started && setScene('island', 7, 6); show('outside'); startLoop(); toast('Welcome to Treasure Island! Walk into the hut.', 4000); }, 2600);
  } else {
    overlay('<h2>The shark got you! &#129416;</h2><p>Keep the boat moving next time.</p><button class="b1" id="retryBoat" style="padding:14px 26px">Try again</button>');
    $('retryBoat').onclick = () => { overlay(''); enterBoat(); };
  }
}

function drawBoat(t) {
  const g = $('boatCv').getContext('2d'), b = boat;
  const grad = g.createLinearGradient(0, 0, 0, BH); grad.addColorStop(0, '#1d6fb8'); grad.addColorStop(1, '#2d8fd6'); g.fillStyle = grad; g.fillRect(0, 0, BW, BH);
  g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 2;
  for (let i = 0; i < 14; i++) { const y = (i * 52 + b.dist * .9) % (BH + 40) - 20, x = (i * 97) % BW; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 18, y - 7, x + 36, y); g.quadraticCurveTo(x + 54, y + 7, x + 72, y); g.stroke(); }
  // the island at the end
  const gy = BOATY - (GOAL - b.dist);
  if (gy > -380) {
    g.fillStyle = '#efdc9f'; g.beginPath(); g.ellipse(BW / 2, gy - 60, 330, 170, 0, 0, 7); g.fill();
    g.fillStyle = '#3f8a4a'; g.beginPath(); g.ellipse(BW / 2, gy - 90, 240, 110, 0, 0, 7); g.fill();
    for (let i = 0; i < 5; i++) drawTree(g, 60 + i * 80, gy - 130 + (i % 2) * 20, Math.sin(t / 700 + i), true);
  }
  // rocks
  b.rocks.forEach(r => { const sy = BOATY - (r.y - b.dist); if (sy < -60 || sy > BH + 60) return; const im = img['rock_' + r.v], s = r.r * 3.1;
    g.save(); g.translate(r.x, sy); g.rotate(r.rot); if (loaded(im)) g.drawImage(im, -s / 2, -s / 2, s, s); else { g.fillStyle = '#7b8190'; g.beginPath(); g.arc(0, 0, r.r, 0, 7); g.fill(); } g.restore(); });
  // wake
  for (let k = 0; k < 9; k++) { g.fillStyle = `rgba(255,255,255,${.28 - k * .03})`; g.beginPath(); g.ellipse(b.x + Math.sin(t / 300 + k) * 4, BOATY + 38 + k * 20, 16 + k * 3, 9, 0, 0, 7); g.fill(); }
  // shark
  const sy = BOATY + 60 + b.gap * .9;
  if (sy < BH + 90) {
    const sx = b.sx + Math.sin(t / 380) * 16;
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(sx, sy + 10, 40, 16, 0, 0, 7); g.fill();
    if (loaded(img.shark)) g.drawImage(img.shark, sx - 85, sy - 95, 170, 170); else { g.fillStyle = '#6f90ad'; g.beginPath(); g.ellipse(sx, sy, 22, 60, 0, 0, 7); g.fill(); }
  }
  // boat
  g.save(); g.translate(b.x, BOATY + Math.sin(t / 250) * 2); g.rotate(b.tilt * .5);
  if (loaded(img.boat)) g.drawImage(img.boat, -62, -72, 124, 124); else { g.fillStyle = '#9a5b2e'; g.beginPath(); g.ellipse(0, 0, 26, 46, 0, 0, 7); g.fill(); }
  g.restore();
  if (b.hit > 0) { g.fillStyle = `rgba(255,60,60,${b.hit * .6})`; g.fillRect(0, 0, BW, BH); }
  // danger
  if (b.status === 'run' && b.gap < 90) { g.fillStyle = `rgba(255,0,0,${.12 + .1 * Math.sin(t / 120)})`; g.fillRect(0, 0, BW, BH); g.font = '700 30px Fredoka'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.strokeStyle = '#c00'; g.lineWidth = 5; g.strokeText('SHARK! KEEP MOVING!', BW / 2, 90); g.fillText('SHARK! KEEP MOVING!', BW / 2, 90); }
  // HUD
  g.fillStyle = 'rgba(10,6,30,.55)'; rr(g, 14, 12, BW - 28, 20, 10); g.fill();
  g.fillStyle = '#3ddc84'; rr(g, 16, 14, Math.max(8, (BW - 32) * clamp(b.dist / GOAL, 0, 1)), 16, 8); g.fill();
  g.font = '600 12px Fredoka'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText('Island', BW - 40, 27);
  g.fillStyle = 'rgba(10,6,30,.55)'; rr(g, BW - 34, 60, 20, 220, 10); g.fill();
  const sp = clamp(b.speed, 0, 1); g.fillStyle = sp > .5 ? '#3ddc84' : (sp > .25 ? '#ffd43b' : '#ff5d73'); rr(g, BW - 32, 62 + 216 * (1 - sp), 16, Math.max(8, 216 * sp), 8); g.fill();
  g.font = '600 11px Fredoka'; g.fillStyle = '#fff'; g.fillText('SPEED', BW - 24, 296);
  if (b.status === 'count') { g.font = '700 90px Fredoka'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 8; const n = Math.max(1, Math.ceil(b.cd)); const txt = b.cd > 3 ? '' : String(n); g.strokeText(txt, BW / 2, 280); g.fillText(txt, BW / 2, 280); }
}

// questions for the helper
function nextBoatQ() {
  if (!isAnswerer()) return;
  const all = Object.values(NPCS).flatMap(n => n.pool);
  boatQ = all[Math.floor(Math.random() * all.length)]; qLock = false;
  $('bq').textContent = boatQ.q;
  const box = $('bopts'); box.innerHTML = '';
  shuffle(boatQ.opts).forEach(o => { const bt = document.createElement('button'); bt.textContent = o; bt.onclick = () => answerBoat(bt, o); box.appendChild(bt); });
}
function answerBoat(btn, o) {
  if (qLock) return; qLock = true;
  const good = o === boatQ.a;
  btn.classList.add(good ? 'right' : 'wrong');
  const v = good ? .5 : -.1;
  if (isSteerer()) { if (boat && boat.status === 'run') boat.speed = clamp(boat.speed + v, 0, 1); } else send({ boost: v });
  setTimeout(nextBoatQ, good ? 250 : 700);
}

// =====================================================================
//  NOTES ROOM (inside the hut) and the final code
// =====================================================================
const NOTES = [
  { word: 'I', team: 1, q: '___ am happy today.', opts: ['I', 'You', 'He', 'It'], a: 'I', digit: 7 },
  { word: 'SHE', team: 2, q: 'Maria is my aunt. ___ is a nurse.', opts: ['She', 'He', 'It', 'We'], a: 'She', digit: 2 },
  { word: 'IT', team: 1, q: 'The moon is bright. ___ is beautiful.', opts: ['It', 'He', 'They', 'She'], a: 'It', digit: 9 },
  { word: 'WE', team: 2, q: 'You and I are friends. ___ play together.', opts: ['We', 'They', 'You', 'He'], a: 'We', digit: 4 },
  { word: 'THEY', team: 1, q: 'Sam and Lee are twins. ___ look the same.', opts: ['They', 'We', 'He', 'It'], a: 'They', digit: 1 },
  { word: 'HIM', team: 2, q: 'I know Peter. I often see ___.', opts: ['him', 'he', 'his', 'they'], a: 'him', digit: 6 },
  { word: 'HER', team: 1, q: 'Look at Mia! Please give ___ the book.', opts: ['her', 'she', 'he', 'they'], a: 'her', digit: 3 },
  { word: 'US', team: 2, q: 'Mum loves you and me. She loves ___.', opts: ['us', 'we', 'them', 'him'], a: 'us', digit: 8 },
];
const CODE = NOTES.map(n => n.digit).join('');
let noteDone = [], noteOpen = -1;

function openNotes() {
  show('notes'); renderNotes();
}
function renderNotes() {
  $('codeMsg').textContent = ''; $('noteMsg').textContent = '';
  $('notesHelp').textContent = testMode ? 'Test mode: you can solve all the notes.' : `You are Team ${me}: solve the notes with your colour. Your partner solves the others. Turn them ALL over to find the code!`;
  const grid = $('noteGrid'); grid.innerHTML = '';
  NOTES.forEach((n, i) => {
    const d = document.createElement('div');
    const mine = testMode || n.team === me;
    d.className = `note t${n.team}${noteDone[i] ? ' flip' : ''}${!mine && !noteDone[i] ? ' locked' : ''}`;
    d.style.setProperty('--rot', ((i * 37) % 7 - 3) + 'deg');
    d.innerHTML = `<div class="in"><div class="f"><div style="font-size:1.5rem">${n.word}</div><small style="color:#7a5a20">${mine ? 'tap to solve' : 'Team ' + n.team}</small></div><div class="b">${n.digit}</div></div>`;
    d.onclick = () => { if (noteDone[i]) return; if (!mine) { $('noteMsg').textContent = `That note is for Team ${n.team}.`; return; } openNotePuzzle(i); };
    grid.appendChild(d);
  });
  const all = NOTES.every((_, i) => noteDone[i]);
  $('codeBox').style.display = all ? 'block' : 'none';
  if (all) $('codeText').textContent = CODE.split('').join(' ');
}
function openNotePuzzle(i) {
  noteOpen = i; const n = NOTES[i];
  $('npWord').textContent = n.word; $('npQ').textContent = n.q; $('npMsg').textContent = '';
  const box = $('npOpts'); box.innerHTML = '';
  shuffle(n.opts).forEach(o => { const b = document.createElement('button'); b.textContent = o; b.onclick = () => {
    if (o === n.a) { $('notePuzzle').style.display = 'none'; solveNote(i, true); }
    else { b.classList.add('wrong'); $('npMsg').textContent = 'Not quite. Try again!'; }
  }; box.appendChild(b); });
  $('notePuzzle').style.display = 'grid';
}
function solveNote(i, mineSolved) {
  noteDone[i] = true; if (mineSolved) send({ noteDone: i });
  if ($('notes').classList.contains('active')) setTimeout(renderNotes, mineSolved ? 150 : 0);
}
$('npClose').onclick = () => { $('notePuzzle').style.display = 'none'; };
$('notesBack').onclick = () => { setScene('island', 7, 5); show('outside'); startLoop(); };
$('codeGo').onclick = () => {
  if ($('codeIn').value.replace(/\D/g, '') === CODE) { send({ win: true }); showWin(); }
  else $('codeMsg').textContent = 'That is not the right code. Check the notes!';
};

// =====================================================================
//  WIN
// =====================================================================
function showWin() {
  $('winNames').textContent = (names[1] || 'Team 1') + ' + ' + (names[2] || 'Team 2');
  show('win');
  const box = $('confetti'); box.innerHTML = '';
  for (let i = 0; i < 70; i++) { const c = document.createElement('i'); c.style.left = Math.random() * 100 + '%'; c.style.background = ['#ff5d73', '#ffd43b', '#38b6ff', '#3ddc84', '#9b7bff'][i % 5]; c.style.animationDelay = Math.random() * 2.5 + 's'; c.style.animationDuration = 2.5 + Math.random() * 2.5 + 's'; box.appendChild(c); }
}
$('playAgain').onclick = () => location.reload();

// =====================================================================
//  Network messages from the partner
// =====================================================================
window.onNet = d => {
  if (d.pos) { partner.tx = d.pos.x; partner.ty = d.pos.y; partner.s = d.pos.s; if (!partner.seen || partner.s !== d.pos.s) { partner.x = d.pos.x; partner.y = d.pos.y; } partner.seen = performance.now(); }
  if (d.npcDone && NPCS[d.npcDone]) { done[d.npcDone] = true; renderLetters(); if ($('outside').classList.contains('active')) toast(`Your partner found the letter "${NPCS[d.npcDone].letter}"!`); }
  if (d.noteDone !== undefined) solveNote(d.noteDone, false);
  if (d.win) showWin();
  if (d.boatReady) { boatReady.other = true; maybeStart(); }
  if (d.boatStart) { boatReady.me = boatReady.other = false; if (!$('boat').classList.contains('active')) enterBoatSilent(); startBoat(d.boatStart.seed); }
  if (d.boat && boat) { Object.assign(boat, d.boat); }
  if (d.boost !== undefined && boat && boat.status === 'run' && isSteerer()) boat.speed = clamp(boat.speed + d.boost, 0, 1);
};
function enterBoatSilent() { show('boat'); $('steerPad').style.display = isSteerer() ? 'flex' : 'none'; $('qPanel').style.display = isAnswerer() ? 'block' : 'none'; nextBoatQ(); if (!boatLoop) { boatLoop = true; boatLast = performance.now(); requestAnimationFrame(boatTick); } }
window.onNetOpen = c => {
  Object.keys(done).forEach(k => c.send({ npcDone: k }));
  noteDone.forEach((v, i) => { if (v) c.send({ noteDone: i }); });
};

// ---------------------------------------------------------------- test mode: skip to the next level
window.skipLevel = function () {
  if (!testMode) return;
  const act = document.querySelector('.screen.active').id;
  if (['hub', 'safe', 'cross', 'wsearch'].includes(act)) {            // level 1: the safes
    safeUnlocked = true; safeDone[1] = safeDone[2] = true; enterSafe(); return;
  }
  if (act === 'keyScene' || act === 'doorScene') { outsideOpen = true; window.enterOutside(); return; }
  if (act === 'outside') {
    if (dlg) closeDialog();
    if (!allLetters()) { Object.keys(NPCS).forEach(k => { done[k] = true; }); renderLetters(); toast('Test: you now have B-O-A-T!'); return; }   // level 2: the people
    if (cur.id !== 'island') { setScene('island', 7, 6); toast('Test: skipped the boat race.'); return; }                               // level 3: the boat
    NOTES.forEach((_, i) => { noteDone[i] = true; }); openNotes(); return;                                                           // level 4: the notes
  }
  if (act === 'boat') { if (boat && boat.status !== 'win') { boat.dist = GOAL; boat.speed = 1; } return; }
  if (act === 'notes') { NOTES.forEach((_, i) => { noteDone[i] = true; }); renderNotes(); if ($('codeBox').style.display === 'block') showWin(); return; }
};
$('skipLevel').onclick = () => window.skipLevel();
setInterval(() => {
  const act = document.querySelector('.screen.active');
  $('skipLevel').style.display = testMode && act && ['hub', 'safe', 'cross', 'wsearch', 'keyScene', 'doorScene', 'outside', 'boat', 'notes'].includes(act.id) ? 'block' : 'none';
}, 300);

window.resetWorld = function () {
  done = {}; noteDone = []; started = false; cur = null; boat = null; dlg = null;
  boatReady = { me: false, other: false };
  partner.seen = 0; partner.s = '';
  renderLetters();
};
renderLetters();
window.__dbg = { player, partner, keys, NPCS, scenes, setScene: (...a) => setScene(...a), get cur() { return cur; }, get done() { return done; }, get boat() { return boat; }, interact, enterBoat, startBoat, openNotes, noteDone: () => noteDone };
})();
