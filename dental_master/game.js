'use strict';
/* СТОМАТОЛОГ: МАСТЕР КЛИНИКИ — мобильная игра (тач, 1080x1920) */
const VIEW_W = 1080, VIEW_H = 1920;
const canvas = document.getElementById('cv');
const ctx = canvas.getContext('2d');

/* ---------- масштабирование ---------- */
function resize() {
  const s = Math.min(innerWidth / VIEW_W, innerHeight / VIEW_H);
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.style.width = VIEW_W * s + 'px';
  canvas.style.height = VIEW_H * s + 'px';
  canvas.width = Math.round(VIEW_W * s * dpr);
  canvas.height = Math.round(VIEW_H * s * dpr);
  ctx.setTransform(s * dpr, 0, 0, s * dpr, 0, 0);
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 200));
resize();

/* ---------- ассеты ---------- */
const IMG = {};
(function load() {
  const list = [['bg', 'assets/bg_clinic.jpg'], ['p1', 'assets/patient1.jpg'],
    ['p2', 'assets/patient2.jpg'], ['p3', 'assets/patient3.jpg'], ['logo', 'assets/logo.jpg']];
  list.forEach(([k, src]) => {
    const im = new Image();
    im.onload = im.onerror = () => { IMG[k] = (im.complete && im.naturalWidth) ? im : null; };
    im.src = src;
  });
})();

/* ---------- сохранение ---------- */
const SAVE_KEY = 'dental_master_v1';
let save = { unlocked: 1, stars: {} };
try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) {}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

/* ---------- звук ---------- */
let AC = null;
function beep(freq = 660, dur = 0.09, type = 'sine', vol = 0.12) {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, AC.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + dur);
    o.connect(g); g.connect(AC.destination);
    o.start(); o.stop(AC.currentTime + dur);
  } catch (e) {}
}
const sndTap = () => beep(520, 0.06, 'triangle');
const sndGood = () => { beep(660, 0.09); setTimeout(() => beep(880, 0.12), 90); };
const sndBad = () => beep(170, 0.22, 'sawtooth', 0.10);

/* ---------- утилиты рисования ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function text(s, x, y, size = 40, col = '#10333f', align = 'center', weight = 800) {
  ctx.font = weight + ' ' + size + "px -apple-system,'Segoe UI',Roboto,Arial,sans-serif";
  ctx.fillStyle = col; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}
function wrap(s, x, y, size, col, maxW, lh, align = 'center', weight = 600) {
  ctx.font = weight + ' ' + size + "px -apple-system,'Segoe UI',Roboto,Arial,sans-serif";
  ctx.fillStyle = col; ctx.textAlign = align; ctx.textBaseline = 'top';
  const words = String(s).split(' ');
  let line = '', yy = y;
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, yy); yy += lh; line = w; }
    else line = t;
  }
  if (line) ctx.fillText(line, x, yy);
  return yy + lh - y;
}
function coverImage(im, x, y, w, h) {
  if (!im) return false;
  const s = Math.max(w / im.width, h / im.height);
  const iw = im.width * s, ih = im.height * s;
  ctx.drawImage(im, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  return true;
}
function star(x, y, r, col) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.45 : r;
    ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath(); ctx.fillStyle = col; ctx.fill();
}

/* ---------- кнопки ---------- */
let buttons = [];
function btn(x, y, w, h, label, cb, opt = {}) {
  const b = Object.assign({ x, y, w, h, label, cb, fs: 44, col: '#12a0b6', txt: '#ffffff', r: 28 }, opt);
  buttons.push(b);
  ctx.save();
  if (b.disabled) ctx.globalAlpha = 0.45;
  rr(x, y, w, h, b.r);
  ctx.fillStyle = b.col; ctx.fill();
  if (b.ring) { ctx.lineWidth = 5; ctx.strokeStyle = '#ffffff'; ctx.stroke(); }
  ctx.restore();
  const lines = String(label).split('\n');
  const lh = b.fs * 1.1;
  lines.forEach((ln, i) => text(ln, x + w / 2, y + h / 2 + (i - (lines.length - 1) / 2) * lh, b.fs, b.txt, 'center', 800));
}
function hitButton(x, y) {
  for (let i = buttons.length - 1; i >= 0; i--) {
    const b = buttons[i];
    if (!b.disabled && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}

/* ---------- частицы ---------- */
let parts = [];
function burst(x, y, col, n = 14) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 320;
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 100, life: 0.7 + Math.random() * 0.5, col, r: 4 + Math.random() * 8 });
  }
}
function updateParts(dt) {
  parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; p.life -= dt; });
  parts = parts.filter(p => p.life > 0);
}
function drawParts() {
  parts.forEach(p => { ctx.globalAlpha = clamp(p.life, 0, 1); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fillStyle = p.col; ctx.fill(); });
  ctx.globalAlpha = 1;
}

/* ---------- зуб (векторный) ---------- */
function toothShape(x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x - s * 0.42, y - s * 0.5);
  ctx.bezierCurveTo(x - s * 0.55, y - s * 0.52, x - s * 0.55, y - s * 0.15, x - s * 0.5, y + s * 0.05);
  ctx.bezierCurveTo(x - s * 0.47, y + s * 0.3, x - s * 0.4, y + s * 0.5, x - s * 0.22, y + s * 0.5);
  ctx.bezierCurveTo(x - s * 0.12, y + s * 0.5, x - s * 0.08, y + s * 0.35, x, y + s * 0.32);
  ctx.bezierCurveTo(x + s * 0.08, y + s * 0.35, x + s * 0.12, y + s * 0.5, x + s * 0.22, y + s * 0.5);
  ctx.bezierCurveTo(x + s * 0.4, y + s * 0.5, x + s * 0.47, y + s * 0.3, x + s * 0.5, y + s * 0.05);
  ctx.bezierCurveTo(x + s * 0.55, y - s * 0.15, x + s * 0.55, y - s * 0.52, x + s * 0.42, y - s * 0.5);
  ctx.bezierCurveTo(x + s * 0.3, y - s * 0.58, x - s * 0.3, y - s * 0.58, x - s * 0.42, y - s * 0.5);
  ctx.closePath();
}
function drawTooth(x, y, s, st = {}) {
  ctx.save();
  if (st.rot) { ctx.translate(x, y); ctx.rotate(st.rot); ctx.translate(-x, -y); }
  toothShape(x, y, s);
  const g = ctx.createLinearGradient(x, y - s, x, y + s);
  g.addColorStop(0, st.lit ? '#fff8dd' : '#ffffff');
  g.addColorStop(1, st.lit ? '#ffe9a8' : '#dfe9ee');
  ctx.fillStyle = st.removed ? 'rgba(255,255,255,0.15)' : g;
  ctx.fill();
  ctx.lineWidth = s * 0.05; ctx.strokeStyle = '#9fb2bd'; ctx.stroke();
  if (st.pulpGlow) { // пульпит
    ctx.save(); toothShape(x, y, s * 0.55); ctx.clip();
    ctx.shadowColor = '#ff3b30'; ctx.shadowBlur = s * 0.25;
    ctx.beginPath(); ctx.arc(x, y - s * 0.05, s * 0.22, 0, 7);
    ctx.fillStyle = st.xray ? '#ff3b30' : 'rgba(255,90,80,0.35)'; ctx.fill();
    ctx.restore();
  }
  if (st.caries) {
    ctx.beginPath(); ctx.arc(st.cx, st.cy, s * 0.13, 0, 7);
    ctx.fillStyle = st.xray ? '#3a2410' : 'rgba(80,50,25,0.75)'; ctx.fill();
  }
  if (st.crack && st.xray) {
    ctx.beginPath(); ctx.moveTo(x - s * 0.25, y - s * 0.4);
    ctx.lineTo(x - s * 0.05, y + s * 0.1); ctx.lineTo(x - s * 0.18, y + s * 0.42);
    ctx.lineWidth = s * 0.035; ctx.strokeStyle = '#5b6b76'; ctx.stroke();
  }
  if (st.crown) { // коронка
    ctx.save(); toothShape(x, y, s); ctx.clip();
    toothShape(x, y - s * 0.18, s * 1.12); ctx.fillStyle = '#f6fbff'; ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/* ---------- уровни (мета) ---------- */
const LEVELS = [
  { id: 1, title: 'Диагностика', icon: '🔎', patient: 'Ирина, 28', avatar: 'p1',
    complaint: 'Зуб ноет по ночам и реагирует на холодное.',
    fact: 'Рентген выявляет скрытый кариес, трещины и пульпит. Осмотр + снимок = точный диагноз.',
    hint: 'Найдите все больные зубы. Переключайтесь в рентген-режим, чтобы видеть скрытые проблемы!' },
  { id: 2, title: 'Анестезия', icon: '💉', patient: 'Ирина, 28', avatar: 'p1',
    complaint: 'Очень боюсь укола. Лечить будем нижний моляр.',
    fact: 'Для нижних моляров лучше всего проводниковая анестезия — она блокирует весь нерв челюсти.',
    hint: '1) Выберите правильную технику. 2) Попадите в точку введения. 3) Остановите дозу в зелёной зоне.' },
  { id: 3, title: 'Лечение кариеса', icon: '🦷', patient: 'Тимур, 10', avatar: 'p2',
    complaint: 'На зубе чёрная точка, заедает сладкое.',
    fact: 'Кариес удаляют бором до здоровых тканей, затем полость послойно заполняют световым композитом.',
    hint: 'Держите бор только на тёмных участках! Затем нанесите композит и засветите лампой.' },
  { id: 4, title: 'Лечение пульпита', icon: '🧬', patient: 'Олег, 42', avatar: 'p3',
    complaint: 'Острая боль, не спал ночь. Пульпит!',
    fact: 'Канал очищают эндодонтическими файлами, промывают антисептиком и пломбируют гуттаперчей до апекса.',
    hint: 'Ведите файл внутри канала, не задевая стенки. Поймайте капли антисептика и идеально запломбируйте.' },
  { id: 5, title: 'Удаление зуба', icon: '🪥', patient: 'Олег, 42', avatar: 'p3',
    complaint: 'Зуб разрушен под корень — спасти нельзя.',
    fact: 'Зуб расшатывают, разрыхляя связку: плавные движения влево-вправо, затем извлечение — без рывков!',
    hint: 'Качайте зуб свайпами влево-вправо (плавно!), затем резко потяните вверх.' },
  { id: 6, title: 'Имплантация', icon: '⚙️', patient: 'Ирина, 28', avatar: 'p1',
    complaint: 'Хочу новый зуб вместо удалённого.',
    fact: 'Имплант ввинчивают с моментом 25–45 Н·см. Сверла используют по возрастанию диаметра.',
    hint: 'Просверлите ложе на нужную глубину, выберите свёрла по порядку, вкрутите имплант до зелёного момента и поставьте коронку.' },
];
const lvlById = id => LEVELS.find(l => l.id === id);

/* ---------- состояние ---------- */
let screen = 'menu';
let screenArg = null;
let game = null;
let result = null;
function go(sc, arg) { screen = sc; screenArg = arg; }

/* ---------- ввод ---------- */
let pDown = false, px = 0, py = 0, lastPx = 0, lastPy = 0;
function toGame(e) {
  const r = canvas.getBoundingClientRect();
  return [ (e.clientX - r.left) * VIEW_W / r.width, (e.clientY - r.top) * VIEW_H / r.height ];
}
canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  const [x, y] = toGame(e);
  pDown = true; px = lastPx = x; py = lastPy = y;
  const b = hitButton(x, y);
  if (b) {
    sndTap(); b.cb();
    if (screen !== 'game') return; // вне игры кнопка поглощает нажатие
  }
  if (screen === 'game' && game && game.down) game.down(x, y);
  else if (SCREENS[screen] && SCREENS[screen].down) SCREENS[screen].down(x, y);
});
canvas.addEventListener('pointermove', e => {
  if (!pDown) return;
  const [x, y] = toGame(e);
  const dx = x - lastPx, dy = y - lastPy;
  px = x; py = y;
  if (screen === 'game' && game && game.move) game.move(x, y, dx, dy);
  lastPx = x; lastPy = y;
});
addEventListener('pointerup', () => {
  pDown = false;
  if (screen === 'game' && game && game.up) game.up();
});

/* ================= СЦЕНЫ ================= */
const SCREENS = {};

/* ---------- МЕНЮ ---------- */
let menuT = 0;
SCREENS.menu = {
  update(dt) { menuT += dt; },
  draw() {
    if (IMG.bg) coverImage(IMG.bg, 0, 0, VIEW_W, VIEW_H);
    else { ctx.fillStyle = '#0e3d49'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
    ctx.fillStyle = 'rgba(12,48,58,0.45)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // плавающие зубики
    for (let i = 0; i < 6; i++) {
      const fx = (i * 200 + 120 + Math.sin(menuT * 0.7 + i) * 40) % VIEW_W;
      const fy = (i * 320 + 150 + Math.cos(menuT * 0.5 + i * 2) * 60) % VIEW_H;
      ctx.globalAlpha = 0.10; drawTooth(fx, fy, 90); ctx.globalAlpha = 1;
    }
    if (IMG.logo) { ctx.save(); ctx.beginPath(); ctx.arc(540, 430, 220, 0, 7); ctx.clip(); coverImage(IMG.logo, 320, 210, 440, 440); ctx.restore(); ctx.lineWidth = 10; ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.arc(540, 430, 220, 0, 7); ctx.stroke(); }
    else drawTooth(540, 430, 320);
    text('СТОМАТОЛОГ', 540, 740, 92, '#ffffff');
    text('Мастер клиники', 540, 825, 46, '#a9e3ee', 'center', 600);
    const total = Object.values(save.stars).reduce((a, b) => a + b, 0);
    text('★ ' + total + ' из 18', 540, 895, 36, '#ffd94d');
    btn(240, 1020, 600, 120, 'Играть', () => go('map'), { fs: 52 });
    btn(240, 1180, 600, 100, 'Об игре', () => go('about'), { col: '#0e5a68', fs: 38 });
    text('6 этапов лечения: от диагностики до имплантации', 540, 1360, 30, '#cfeef5', 'center', 600);
  }
};

/* ---------- ОБ ИГРЕ ---------- */
SCREENS.about = {
  draw() {
    ctx.fillStyle = '#0e3d49'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text('Об игре', 540, 160, 54, '#ffffff');
    wrap('Образовательный симулятор стоматолога, созданный вместе с врачом-стоматологом. Пройдите весь путь: поставьте диагноз по рентгену, выберите технику анестезии, удалите кариес, вылечите пульпит, аккуратно удалите зуб и установите имплант с коронкой.', 90, 240, 34, '#cfeef5', 900, 52, 'left');
    wrap('Следите за комфортом пациента: ошибки и боль снижают его. За точность и скорость вы получаете до трёх звёзд на уровень.', 90, 700, 34, '#cfeef5', 900, 52, 'left');
    wrap('Важно: игра — не медицинская инструкция. Все процедуры должен выполнять только врач!', 90, 1000, 30, '#ffd94d', 900, 48, 'left');
    btn(240, 1700, 600, 110, 'Назад', () => go('menu'), { col: '#0e5a68' });
  }
};

/* ---------- КАРТА УРОВНЕЙ ---------- */
SCREENS.map = {
  draw() {
    ctx.fillStyle = '#0e3d49'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text('Выбор этапа', 540, 140, 54, '#ffffff');
    const done = Object.values(save.stars).filter(s => s > 0).length;
    text('Прогресс: ' + done + '/6 этапов', 540, 205, 32, '#a9e3ee');
    LEVELS.forEach((l, i) => {
      const col = i % 2 ? 700 : 260;
      const y = 320 + i * 240;
      const locked = l.id > save.unlocked;
      const st = save.stars[l.id] || 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 6;
      if (i < 5) { ctx.beginPath(); ctx.moveTo(col + 80, y + 40); ctx.lineTo((i % 2 ? 260 : 700) + 80, y + 240 + 40); ctx.stroke(); }
      ctx.globalAlpha = locked ? 0.45 : 1;
      ctx.beginPath(); ctx.arc(col + 80, y + 40, 78, 0, 7);
      ctx.fillStyle = locked ? '#38505c' : '#12a0b6'; ctx.fill();
      ctx.lineWidth = 7; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      if (locked) {
        ctx.strokeStyle = '#cfd8dd'; ctx.lineWidth = 9;
        ctx.strokeRect(col + 50, y + 30, 60, 52);
        ctx.beginPath(); ctx.arc(col + 80, y + 22, 24, Math.PI, 0); ctx.stroke();
      } else {
        text(l.icon, col + 80, y + 44, 62, '#ffffff');
      }
      const ta = i % 2 ? 'right' : 'left';
      const tx = i % 2 ? col + 20 : col + 140;
      text('Этап ' + l.id, tx, y - 18, 28, '#7fc6d4', ta);
      text(l.title, tx, y + 34, 42, '#ffffff', ta);
      for (let s2 = 0; s2 < 3; s2++)
        star(tx + (ta === 'left' ? s2 * 52 + 26 : -s2 * 52 - 26), y + 105, 22, s2 < st ? '#ffd94d' : 'rgba(255,255,255,0.18)');
      ctx.globalAlpha = 1;
      if (!locked) btn(col + 12, y - 30, 136, 140, '', () => go('card', l.id), { col: 'rgba(0,0,0,0)', txt: 'rgba(0,0,0,0)' });
      // широкая зона нажатия
      if (!locked) buttons[buttons.length - 1] = Object.assign(buttons[buttons.length - 1], { x: 60, w: 960 });
    });
    btn(180, 1790, 720, 100, 'Меню', () => go('menu'), { col: '#0e5a68', fs: 40 });
  }
};

/* ---------- КАРТОЧКА ПАЦИЕНТА ---------- */
SCREENS.card = {
  draw() {
    const l = lvlById(screenArg);
    if (IMG.bg) coverImage(IMG.bg, 0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = 'rgba(12,48,58,0.55)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // аватар
    const av = IMG[l.avatar];
    if (av) { ctx.save(); ctx.beginPath(); ctx.arc(540, 330, 190, 0, 7); ctx.clip(); coverImage(av, 350, 140, 380, 380); ctx.restore(); ctx.lineWidth = 9; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(540, 330, 190, 0, 7); ctx.stroke(); }
    text(l.patient, 540, 590, 52, '#ffffff');
    rr(140, 650, 800, 150, 26);
    ctx.fillStyle = '#ffffff'; ctx.fill();
    wrap('«' + l.complaint + '»', 540, 690, 36, '#0e3d49', 700, 50);
    text('Этап ' + l.id + ': ' + l.title, 540, 880, 56, '#ffd94d');
    rr(90, 950, 900, 300, 30);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
    text('💡 Знаете ли вы?', 540, 1010, 34, '#a9e3ee');
    wrap(l.fact, 140, 1060, 32, '#ffffff', 800, 46, 'left');
    rr(90, 1290, 900, 250, 30);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
    text('Задание', 540, 1350, 34, '#a9e3ee');
    wrap(l.hint, 140, 1400, 32, '#ffffff', 800, 46, 'left');
    btn(240, 1620, 600, 120, 'Начать!', () => startLevel(l.id), { fs: 50, col: '#27ae60' });
    btn(320, 1770, 440, 90, 'К карте', () => go('map'), { col: '#0e5a68', fs: 34 });
  }
};

/* ---------- HUD для игры ---------- */
function drawHUD(l) {
  rr(40, 40, 1000, 120, 30);
  ctx.fillStyle = 'rgba(10,38,48,0.85)'; ctx.fill();
  text(l.icon + ' ' + l.title, 80, 88, 34, '#ffffff', 'left');
  // комфорт
  text('Комфорт', 80, 132, 24, '#a9e3ee', 'left', 700);
  rr(230, 114, 420, 36, 18);
  ctx.fillStyle = '#27434e'; ctx.fill();
  const c = game.comfort / 100;
  rr(230, 114, Math.max(20, 420 * c), 36, 18);
  ctx.fillStyle = c > 0.5 ? '#2ecc71' : c > 0.25 ? '#f39c12' : '#e74c3c'; ctx.fill();
  text(Math.round(game.comfort) + '%', 680, 133, 30, '#ffffff', 'left');
  // время
  const tl = Math.max(0, game.timeLeft);
  text('⏱ ' + tl.toFixed(0) + 'с', 880, 100, 34, tl < 10 ? '#ff8d80' : '#ffffff', 'center');
  text('Счёт: ' + Math.round(game.score), 880, 138, 26, '#a9e3ee');
}
function gameBaseBG() {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, '#12546500'.slice(0, 7)); // fallback
  ctx.fillStyle = '#0e3d49'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc((i * 173) % 1080, 380 + i * 220, 130, 0, 7); ctx.fill(); }
}
function hurt(dtAmount, x, y) {
  game.comfort = clamp(game.comfort - dtAmount, 0, 100);
  if (x !== undefined) burst(x, y, '#ff8d80', 6);
  if (game.comfort <= 0 && !game.over) failLevel();
}
function winLevel() {
  if (game.over) return;
  game.over = true;
  const l = lvlById(game.levelId);
  const bonus = game.comfort * 5 + Math.max(0, game.timeLeft) * 10;
  game.score += bonus;
  let stars = 1;
  if (game.comfort >= 82 && game.timeLeft > game.totalTime * 0.25) stars = 3;
  else if (game.comfort >= 55) stars = 2;
  save.stars[l.id] = Math.max(save.stars[l.id] || 0, stars);
  save.unlocked = Math.max(save.unlocked, Math.min(6, l.id + 1));
  persist();
  sndGood();
  setTimeout(() => go('result', { l, stars, score: Math.round(game.score) }), 350);
}
function failLevel() {
  if (game.over) return;
  game.over = true;
  sndBad();
  setTimeout(() => go('fail', lvlById(game.levelId)), 350);
}
function baseGame(levelId, time) {
  return { levelId, totalTime: time, timeLeft: time, comfort: 100, score: 0, t: 0, over: false, msgT: 0, msg: '' };
}
function say(g, s, col) { g.msg = s; g.msgCol = col || '#ffffff'; g.msgT = 2.6; }
function drawMsg(g) {
  if (g.msgT > 0) {
    ctx.globalAlpha = clamp(g.msgT, 0, 1);
    rr(90, 200, 900, 80, 24);
    ctx.fillStyle = 'rgba(10,38,48,0.9)'; ctx.fill();
    text(g.msg, 540, 242, 34, g.msgCol);
    ctx.globalAlpha = 1;
  }
}

/* ---------- УРОВЕНЬ 1: ДИАГНОСТИКА ---------- */
function levelDiag() {
  const g = baseGame(1, 70);
  g.xray = false;
  const probs = ['caries', 'caries', 'pulpitis', 'crack', 'ok', 'ok', 'ok', 'ok'];
  for (let i = probs.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [probs[i], probs[j]] = [probs[j], probs[i]]; }
  g.teeth = [];
  for (let i = 0; i < 8; i++) {
    const x = 150 + i * 111 + (i % 2 ? 14 : -14);
    const y = 620 + Math.sin(i / 7 * Math.PI) * -70 + (i % 2 ? 26 : 0);
    g.teeth.push({ x, y: y + 60, s: 150, prob: probs[i], found: false, shake: 0 });
  }
  g.update = dt => {
    g.t += dt; g.timeLeft -= dt;
    g.msgT -= dt;
    g.teeth.forEach(t => t.shake = Math.max(0, t.shake - dt * 4));
    if (g.timeLeft <= 0 && !g.over) failLevel();
    if (g.teeth.every(t => t.prob === 'ok' || t.found) && !g.over) { g.score += 50; winLevel(); }
  };
  g.down = (x, y) => {
    for (const t of g.teeth) {
      if (Math.abs(x - t.x) < t.s * 0.55 && Math.abs(y - t.y) < t.s * 0.6) {
        if (t.prob !== 'ok' && !t.found) {
          t.found = true; g.score += 100; sndGood();
          burst(t.x, t.y, '#2ecc71');
          say(g, t.prob === 'caries' ? 'Кариес найден!' : t.prob === 'pulpitis' ? 'Пульпит! Нерв воспалён.' : 'Трещина эмали!', '#7dffb0');
        } else if (t.found) {
          say(g, 'Уже отмечено ✓');
        } else {
          t.shake = 1; hurt(12, t.x, t.y); sndBad();
          say(g, 'Этот зуб здоров — больно же!', '#ff9d90');
        }
        return;
      }
    }
  };
  g.draw = () => {
    gameBaseBG();
    // рот
    rr(90, 480, 900, 520, 260);
    ctx.fillStyle = '#a3354a'; ctx.fill();
    rr(130, 520, 820, 440, 220);
    ctx.fillStyle = '#641f2e'; ctx.fill();
    g.teeth.forEach(t => {
      const ox = t.shake ? Math.sin(g.t * 40) * 8 * t.shake : 0;
      drawTooth(t.x + ox, t.y, t.s, {
        caries: t.prob === 'caries' && (!t.found || g.xray), cx: t.x + ox + t.s * 0.2, cy: t.y - t.s * 0.15,
        pulpGlow: t.prob === 'pulpitis', crack: t.prob === 'crack', xray: g.xray
      });
      if (t.found) {
        ctx.beginPath(); ctx.arc(t.x, t.y, t.s * 0.62, 0, 7);
        ctx.lineWidth = 8; ctx.strokeStyle = '#2ecc71'; ctx.stroke();
        text('✓', t.x, t.y - t.s * 0.75, 40, '#2ecc71');
      }
    });
    if (g.xray) { ctx.fillStyle = 'rgba(20,90,160,0.18)'; ctx.fillRect(0, 200, VIEW_W, VIEW_H - 200); text('РЕНТГЕН-РЕЖИМ', 540, 330, 38, '#9fd8ff'); }
    const left = g.teeth.filter(t => t.prob !== 'ok' && !t.found).length;
    text('Найдено проблем: ' + (4 - left) + ' / 4', 540, 370, 40, '#ffffff');
    btn(140, 1060, 800, 110, g.xray ? '📷 Выключить рентген' : '📷 Рентген', () => { g.xray = !g.xray; say(g, g.xray ? 'Видны скрытые проблемы' : 'Обычный осмотр'); }, { fs: 40 });
    wrap('Подсказка: без снимка пульпит виден лишь как лёгкое покраснение, а трещину не заметить вовсе.', 540, 1230, 30, '#a9d6e2', 900, 44);
    drawMsg(g);
  };
  return g;
}

/* ---------- УРОВЕНЬ 2: АНЕСТЕЗИЯ ---------- */
function levelAnesth() {
  const g = baseGame(2, 75);
  g.phase = 1;
  g.attempts = 0;
  g.aimX = 0; g.aimDone = false; g.aimScore = 0;
  g.dose = 0; g.doseRun = false; g.doseDone = false;
  const techniques = ['Аппликационная', 'Инфильтрационная', 'Проводниковая', 'Внутрисвязочная'];
  g.choose = (name, bx, by) => {
    if (name === 'Проводниковая') {
      g.score += 60; g.phase = 2;
      say(g, 'Верно! Блокада нижнего альвеолярного нерва.', '#7dffb0');
      sndGood();
    } else {
      g.attempts++;
      g.score = Math.max(0, g.score - 20);
      hurt(18, bx + 200, by);
      sndBad();
      const hints = {
        'Аппликационная': 'Гель на слизистую — только для снятия чувствительности укола.',
        'Инфильтрационная': 'Подходит для верхних зубов — у моляра внизу слишком плотная кость.',
        'Внутрисвязочная': 'Хороша как дополнение, но не для всего моляра.',
      };
      say(g, hints[name] || 'Подумайте ещё!', '#ff9d90');
    }
  };
  g.update = dt => {
    g.t += dt; g.timeLeft -= dt; g.msgT -= dt;
    if (g.phase === 2 && !g.aimDone) g.aimX = 540 + 330 * Math.sin(g.t * 2.2);
    if (g.phase === 3 && g.doseRun && !g.doseDone) {
      g.dose += dt * 45;
      if (g.dose >= 100) { g.dose = 100; finishDose(); }
    }
    if (g.timeLeft <= 0 && !g.over) failLevel();
  };
  function finishDose() {
    g.doseDone = true; g.doseRun = false;
    if (g.dose >= 55 && g.dose <= 80) { g.score += 120; say(g, 'Доза идеальна! Зуб онемел.', '#7dffb0'); sndGood(); setTimeout(winLevel, 900); }
    else if (g.dose < 55) { g.score += 40; hurt(10); say(g, 'Мало анестетика — пациент чувствует боль!', '#ff9d90'); setTimeout(winLevel, 1100); }
    else { g.score += 50; hurt(12); say(g, 'Передозировка! Лицо онемеет надолго…', '#ff9d90'); setTimeout(winLevel, 1100); }
  }
  g.down = (x, y) => {
    if (g.phase === 2 && !g.aimDone) {
      const targetX = 540, targetY = 760;
      const d = Math.abs(g.aimX - targetX);
      g.aimDone = true;
      if (d < 90) { g.score += 120; say(g, 'Идеальное попадание в точку введения!', '#7dffb0'); burst(targetX, targetY, '#2ecc71'); sndGood(); }
      else if (d < 220) { g.score += 60; hurt(8, g.aimX, y); say(g, 'Попали рядом — онемение слабее.', '#ffe08a'); }
      else { hurt(20, g.aimX, y); say(g, 'Мимо точки! Пациенту больно.', '#ff9d90'); sndBad(); }
      setTimeout(() => { g.phase = 3; g.doseRun = true; }, 1000);
    }
  };
  g.draw = () => {
    gameBaseBG();
    if (g.phase === 1) {
      rr(90, 340, 900, 210, 28);
      ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fill();
      text('Клинический случай', 540, 395, 34, '#a9e3ee');
      wrap('Пульпит НИЖНЕГО моляра. Пациент боится укола. Какую технику анестезии выберете?', 540, 440, 36, '#ffffff', 820, 50);
      const pos = [[140, 620], [560, 620], [140, 800], [560, 800]];
      techniques.forEach((tn, i) => btn(pos[i][0], pos[i][1], 380, 140, tn, (ev) => g.choose(tn, pos[i][0], pos[i][1]), { fs: 32, col: '#0e5a68' }));
      wrap('Подсказка: нижняя челюсть — плотная кость, инфильтрация там плохо проникает.', 540, 1030, 30, '#a9d6e2', 900, 44);
    } else {
      // десна
      rr(120, 560, 840, 400, 200);
      ctx.fillStyle = '#e8919b'; ctx.fill();
      drawTooth(340, 700, 170); drawTooth(740, 700, 170);
      if (g.phase === 2) {
        const tx = 540, ty = 760;
        ctx.beginPath(); ctx.arc(tx, ty, 90, 0, 7); ctx.lineWidth = 6; ctx.strokeStyle = '#ffffff'; ctx.stroke();
        ctx.beginPath(); ctx.arc(tx, ty, 55, 0, 7); ctx.fillStyle = 'rgba(46,204,113,0.5)'; ctx.fill();
        if (!g.aimDone) {
          // шприц
          const ax = g.aimX;
          ctx.save(); ctx.translate(ax, ty - 260); ctx.rotate(0.05);
          ctx.fillStyle = '#c9d4dc'; rr(-18, -140, 36, 240, 14); ctx.fill();
          ctx.fillStyle = '#5b6b76'; rr(-40, -190, 80, 60, 12); ctx.fill();
          ctx.fillStyle = '#dfe8ee'; ctx.beginPath(); ctx.moveTo(-6, 100); ctx.lineTo(6, 100); ctx.lineTo(0, 190); ctx.closePath(); ctx.fill();
          ctx.restore();
          text('Нажмите на экран в момент, когда игла над точкой!', 540, 430, 36, '#ffffff');
        }
      } else if (g.phase === 3) {
        text('Введите анестетик: остановите дозу', 540, 430, 40, '#ffffff');
        text('в ЗЕЛЁНОЙ зоне кнопкой СТОП', 540, 480, 34, '#a9e3ee');
        rr(300, 560, 120, 520, 30);
        ctx.fillStyle = '#27434e'; ctx.fill();
        ctx.fillStyle = 'rgba(46,204,113,0.55)';
        const zy = 1080 - (80 / 100) * 520, zy2 = 1080 - (55 / 100) * 520;
        ctx.fillRect(302, zy, 116, zy2 - zy);
        const hy = 1080 - (g.dose / 100) * 520;
        if (g.dose > 0) { rr(302, hy, 116, 1080 - hy, 24); ctx.fillStyle = '#5ec2e8'; ctx.fill(); }
        text(g.dose.toFixed(0) + '%', 540, 700, 44, '#ffffff');
        btn(600, 800, 340, 120, 'СТОП', finishDose, { fs: 46, col: '#e74c3c' });
      }
    }
    drawMsg(g);
  };
  return g;
}

/* ---------- УРОВЕНЬ 3: КАРИЕС ---------- */
function levelCaries() {
  const g = baseGame(3, 80);
  const base = [{ dx: -120, dy: -140, r: 70 }, { dx: 90, dy: -60, r: 85 }, { dx: -20, dy: 110, r: 75 }];
  g.spots = base.map(s => ({ dx: s.dx, dy: s.dy, r: s.r, clean: 0 }));
  g.phase = 1; g.drill = false; g.fillTaps = 0; g.lamp = 0; g.lampOn = false; g.lampDone = false;
  const TX = 540, TY = 760, TS = 640;
  g.down = (x, y) => {
    g.tapX = x; g.tapY = y;
    if (g.phase === 1) g.drill = true;
  };
  g.move = (x, y) => { g.tapX = x; g.tapY = y; };
  g.up = () => { g.drill = false; };
  g.update = dt => {
    g.t += dt; g.timeLeft -= dt; g.msgT -= dt;
    if (g.phase === 1 && g.drill && g.tapX !== undefined) {
      let drilling = false;
      for (const s of g.spots) {
        if (s.clean < 1 && Math.hypot(g.tapX - (TX + s.dx), g.tapY - (TY + s.dy)) < s.r + 26) {
          s.clean = clamp(s.clean + dt * 1.1, 0, 1);
          drilling = true;
          g.score += dt * 60;
          if (Math.random() < 0.35) burst(g.tapX, g.tapY, '#caa56a', 2);
          if (s.clean >= 1) { sndGood(); burst(TX + s.dx, TY + s.dy, '#ffffff', 10); say(g, 'Участок очищен!'); }
        }
      }
      if (!drilling && Math.hypot(g.tapX - TX, g.tapY - TY) < TS * 0.55) {
        hurt(dt * 16, g.tapX, g.tapY);
        if (Math.random() < 0.1) say(g, 'Бор задел здоровую эмаль — осторожно!', '#ff9d90');
      }
      if (g.spots.every(s => s.clean >= 1)) { g.phase = 2; g.drill = false; say(g, 'Кариес удалён! Нанесите композит: 5 нажатий по полости.', '#7dffb0'); }
    }
    if (g.phase === 3 && g.lampOn && !g.lampDone) {
      g.lamp += dt;
      if (g.lamp >= 3) { g.lampDone = true; g.lampOn = false; g.score += 100; say(g, 'Пломба засвечена и блестит!', '#7dffb0'); setTimeout(winLevel, 700); }
    }
    if (g.timeLeft <= 0 && !g.over) failLevel();
  };
  g.downTap = null;
  const origDown = g.down;
  g.down = (x, y) => {
    if (g.phase === 2) {
      for (const s of g.spots)
        if (Math.hypot(x - (TX + s.dx), y - (TY + s.dy)) < s.r + 40) {
          if (g.fillTaps < 5) { g.fillTaps++; g.score += 20; sndTap(); burst(x, y, '#9fd8ff', 5); }
          if (g.fillTaps >= 5) { g.phase = 3; say(g, 'Теперь зажмите УФ-лампу на 3 секунды!'); }
          return;
        }
      say(g, 'Композит кладут в очищенную полость');
    } else origDown(x, y);
  };
  g.draw = () => {
    gameBaseBG();
    // зуб крупно
    drawTooth(TX, TY, TS, { lit: g.phase === 3 && g.lampOn });
    g.spots.forEach((s, i) => {
      const alpha = 1 - s.clean;
      if (alpha > 0.02) {
        ctx.beginPath(); ctx.arc(TX + s.dx, TY + s.dy, s.r * (0.7 + 0.3 * (1 - s.clean)), 0, 7);
        ctx.fillStyle = 'rgba(70,42,20,' + alpha.toFixed(2) + ')'; ctx.fill();
      }
      if (g.phase >= 2) {
        const layers = clamp(g.fillTaps - i, 0, 2);
        if (layers > 0 || g.phase >= 3) {
          ctx.beginPath(); ctx.arc(TX + s.dx, TY + s.dy, s.r * 0.72, 0, 7);
          ctx.fillStyle = g.phase === 3 && g.lamp >= 3 ? '#f4faff' : 'rgba(158,216,255,0.85)'; ctx.fill();
        }
      }
    });
    if (g.phase === 1 && g.drill && g.tapX !== undefined) {
      ctx.save(); ctx.translate(g.tapX, g.tapY);
      ctx.rotate(g.t * 18);
      ctx.fillStyle = '#8fa3b2'; rr(-9, -190, 18, 150, 8); ctx.fill();
      ctx.fillStyle = '#54657a'; rr(-26, -250, 52, 70, 14); ctx.fill();
      ctx.fillStyle = '#dfe8ee';
      ctx.beginPath(); ctx.moveTo(-14, -40); ctx.lineTo(14, -40); ctx.lineTo(0, 26); ctx.closePath(); ctx.fill();
      ctx.rotate(-g.t * 36);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-22, -8); ctx.lineTo(22, 8); ctx.moveTo(-22, 8); ctx.lineTo(22, -8); ctx.stroke();
      ctx.restore();
    }
    // прогресс
    if (g.phase === 1) {
      const done = g.spots.reduce((a, s) => a + s.clean, 0) / 3;
      rr(190, 1300, 700, 40, 20); ctx.fillStyle = '#27434e'; ctx.fill();
      rr(190, 1300, 700 * done, 40, 20); ctx.fillStyle = '#2ecc71'; ctx.fill();
      text('Очистка кариеса: ' + Math.round(done * 100) + '%', 540, 1270, 34, '#ffffff');
    } else if (g.phase === 2) {
      text('Композит: ' + g.fillTaps + ' / 5 слоёв', 540, 1270, 40, '#ffffff');
    } else {
      text(g.lampOn ? 'Засвечиваем… ' + Math.max(0, 3 - g.lamp).toFixed(1) : 'Зажмите кнопку УФ-лампы!', 540, 1270, 38, '#ffffff');
      btn(340, 1350, 400, 120, '💡 УФ-лампа', () => {}, { fs: 36, col: g.lampOn ? '#f39c12' : '#0e5a68' });
      buttons[buttons.length - 1].cb = () => {};
      // управление лампой — отдельной зоной удержания
      bHold.rect = { x: 340, y: 1350, w: 400, h: 120 };
      ctx.beginPath(); ctx.arc(880, 1410, 60, 0, 7); ctx.lineWidth = 10; ctx.strokeStyle = '#27434e'; ctx.stroke();
      ctx.beginPath(); ctx.arc(880, 1410, 60, -Math.PI / 2, -Math.PI / 2 + clamp(g.lamp / 3, 0, 1) * Math.PI * 2);
      ctx.strokeStyle = '#f39c12'; ctx.stroke();
    }
    drawMsg(g);
  };
  const bHold = { rect: null };
  const _down = g.down, _up = g.up;
  g.down = (x, y) => {
    if (g.phase === 3 && bHold.rect && x >= bHold.rect.x && x <= bHold.rect.x + bHold.rect.w && y >= bHold.rect.y && y <= bHold.rect.y + bHold.rect.h) { g.lampOn = true; return; }
    _down(x, y);
  };
  g.up = () => { g.lampOn = false; _up(); };
  return g;
}

/* ---------- УРОВЕНЬ 4: ПУЛЬПИТ (эндо) ---------- */
function levelPulp() {
  const g = baseGame(4, 90);
  g.phase = 1; g.clean = 0; g.grab = false; g.fy = 620; g.fx = 540;
  g.drops = []; g.dropT = 0; g.dropsGot = 0;
  g.fill = 0; g.filling = false; g.fillDone = false;
  const canalX = y => 540 + 45 * Math.sin((y - 560) / 720 * Math.PI);
  const canalW = y => lerp(120, 64, clamp((y - 560) / 820, 0, 1));
  const INSIDE = (fx, fy) => fy >= 570 && fy <= 1380 && Math.abs(fx - canalX(fy)) < canalW(fy) / 2 - 10;
  g.down = (x, y) => {
    if (g.phase === 1 && y > 480 && y < 1500) { g.grab = true; g.fx = x; g.fy = clamp(y, 580, 1390); }
    if (g.phase === 2) {
      for (const d of g.drops) if (!d.hit && Math.hypot(x - d.x, y - d.y) < 70) { d.hit = true; g.dropsGot++; g.score += 25; sndGood(); burst(d.x, d.y, '#5ec2e8', 8); }
    }
  };
  g.move = (x, y, dx, dy) => {
    if (g.phase === 1 && g.grab) {
      const pf = g.fy;
      g.fx = x; g.fy = clamp(y, 580, 1390);
      if (INSIDE(g.fx, g.fy)) {
        const moved = Math.abs(g.fy - pf) + Math.abs(dx) * 0.3;
        if (moved > 0.5) {
          g.clean = clamp(g.clean + moved * 0.0016, 0, 1);
          g.score += moved * 0.15;
          if (Math.random() < 0.2) burst(g.fx, g.fy, '#ffe9a8', 1);
        }
      } else if (g.fy > 570 && g.fy < 1380) {
        if (g.t - (g.lastHurt || -1) > 0.25) {
          g.lastHurt = g.t;
          hurt(Math.abs(dy) * 0.01 + 3, g.fx, g.fy);
          if (Math.random() < 0.3) say(g, 'Файл упирается в стенку канала!', '#ff9d90');
        }
      }
      if (g.clean >= 1) { g.phase = 2; g.grab = false; say(g, 'Канал очищен! Поймайте капли антисептика.', '#7dffb0'); sndGood(); }
    }
  };
  g.up = () => { g.grab = false; g.filling = false; };
  g.update = dt => {
    g.t += dt; g.timeLeft -= dt; g.msgT -= dt;
    if (g.phase === 2) {
      g.dropT -= dt;
      if (g.dropT <= 0 && g.drops.filter(d => !d.hit && d.y < 1500).length < 4) { g.dropT = 0.55; g.drops.push({ x: 300 + Math.random() * 480, y: 480, vy: 240 + Math.random() * 120, hit: false }); }
      g.drops.forEach(d => { if (!d.hit) d.y += d.vy * dt; });
      const missed = g.drops.filter(d => !d.hit && d.y >= 1500);
      if (missed.length) { missed.forEach(d => d.hit = true); hurt(missed.length * 5); }
      if (g.dropsGot >= 6) { g.phase = 3; say(g, 'Антисептика хватит! Пломбируем: удерживайте и отпустите гуттаперчу в зелёной зоне.'); }
    }
    if (g.phase === 3 && g.filling && !g.fillDone) {
      g.fill += dt * 30;
      if (g.fill >= 112) { g.fill = 112; endFill(); }
    }
    if (g.timeLeft <= 0 && !g.over) failLevel();
  };
  function endFill() {
    if (g.fillDone) return;
    g.fillDone = true;
    if (g.fill >= 92 && g.fill <= 102) { g.score += 150; say(g, 'Канал запломбирован идеально — до апекса!', '#7dffb0'); sndGood(); setTimeout(winLevel, 800); }
    else if (g.fill < 92) { g.score += 40; hurt(10); say(g, 'Недопломбировка — в канале останутся бактерии.', '#ff9d90'); setTimeout(winLevel, 1100); }
    else { g.score += 55; hurt(10); say(g, 'Материал вышел за апекс — будет ныть.', '#ff9d90'); setTimeout(winLevel, 1100); }
  }
  g.draw = () => {
    gameBaseBG();
    // зуб в разрезе
    rr(340, 400, 400, 1080, 190);
    ctx.fillStyle = '#f4f9fa'; ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = '#9fb2bd'; ctx.stroke();
    rr(385, 445, 310, 990, 150);
    ctx.fillStyle = '#f0d9a6'; ctx.fill();
    // канал
    ctx.save();
    ctx.beginPath();
    for (let y = 570; y <= 1380; y += 16) ctx[y === 570 ? 'moveTo' : 'lineTo'](canalX(y) - canalW(y) / 2, y);
    for (let y = 1380; y >= 570; y -= 16) ctx.lineTo(canalX(y) + canalW(y) / 2, y);
    ctx.closePath();
    if (g.phase >= 3) {
      ctx.fillStyle = '#f7efd9'; ctx.fill();
      ctx.save(); ctx.clip();
      rr(430, 1390 - g.fill / 100 * 860 - 20, 220, g.fill / 100 * 860 + 40, 30);
      ctx.fillStyle = '#f0a35e'; ctx.fill();
      ctx.restore();
    } else ctx.fillStyle = g.phase === 1 ? '#e23b3b' : '#f7efd9', ctx.fill();
    ctx.restore();
    // апекс-зона при пломбировке
    if (g.phase === 3) {
      ctx.beginPath(); ctx.arc(canalX(1330), 1340, 46, 0, 7);
      ctx.fillStyle = 'rgba(46,204,113,0.4)'; ctx.fill();
      text('🎯', canalX(1330), 1340, 40, '#ffffff');
    }
    // файл
    if (g.phase === 1) {
      ctx.fillStyle = '#4a5f73'; rr(g.fx - 16, g.fy - 330, 32, 120, 12); ctx.fill();
      ctx.fillStyle = '#c3ccd6'; rr(g.fx - 5, g.fy - 220, 10, 236, 5); ctx.fill();
      ctx.fillStyle = '#8fa3b2';
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(g.fx - 9, g.fy - 24 - i * 14); ctx.lineTo(g.fx + 9, g.fy - 16 - i * 14); ctx.lineTo(g.fx + 9, g.fy - 6 - i * 14); ctx.lineTo(g.fx - 9, g.fy - 14 - i * 14); ctx.closePath(); ctx.fill(); }
      rr(240, 1560, 600, 40, 20); ctx.fillStyle = '#27434e'; ctx.fill();
      rr(240, 1560, 600 * g.clean, 40, 20); ctx.fillStyle = '#2ecc71'; ctx.fill();
      text('Очистка канала: ' + Math.round(g.clean * 100) + '%', 540, 1530, 34, '#ffffff');
    } else if (g.phase === 2) {
      text('Поймано капель: ' + g.dropsGot + ' / 6', 540, 1530, 40, '#ffffff');
      g.drops.forEach(d => {
        if (d.hit) return;
        ctx.beginPath(); ctx.arc(d.x, d.y, 22, 0, 7); ctx.fillStyle = '#5ec2e8'; ctx.fill();
        ctx.beginPath(); ctx.arc(d.x, d.y - 8, 8, 0, 7); ctx.fillStyle = '#bdeaff'; ctx.fill();
      });
    } else if (g.phase === 3) {
      text(g.fillDone ? '' : 'Зажмите кнопку и отпустите в зелёной зоне (92–100%)', 540, 1530, 30, '#ffffff');
      btn(290, 1620, 500, 110, '🟠 Гуттаперча ' + g.fill.toFixed(0) + '%', () => {}, { fs: 34, col: g.filling ? '#e8a13a' : '#0e5a68' });
      holdRect.rect = { x: 290, y: 1620, w: 500, h: 110 };
      // шкала
      rr(190, 1765, 700, 34, 17); ctx.fillStyle = '#27434e'; ctx.fill();
      ctx.fillStyle = 'rgba(46,204,113,0.6)'; ctx.fillRect(190 + 700 * 0.92, 1765, 700 * 0.10, 34);
      rr(190, 1765, 700 * clamp(g.fill / 112, 0, 1), 34, 17); ctx.fillStyle = '#f0a35e'; ctx.fill();
    }
    if (g.phase === 1) wrap('Ведите файл ПАЛЬЦЕМ вверх-вниз строго внутри красного канала, не задевая стенки.', 540, 1680, 30, '#a9d6e2', 900, 42);
    drawMsg(g);
  };
  const holdRect = { rect: null };
  const _down = g.down; const _up = g.up;
  g.down = (x, y) => {
    if (g.phase === 3 && holdRect.rect && x >= holdRect.rect.x && x <= holdRect.rect.x + holdRect.rect.w && y >= holdRect.rect.y && y <= holdRect.rect.y + holdRect.rect.h) { g.filling = true; return; }
    _down(x, y);
  };
  g.up = () => { const was = g.filling; _up(); if (g.phase === 3 && was && !g.fillDone) endFill(); };
  return g;
}

/* ---------- УРОВЕНЬ 5: УДАЛЕНИЕ ЗУБА ---------- */
function levelExtract() {
  const g = baseGame(5, 60);
  g.swings = 0; g.need = 10; g.phase = 1;
  g.dir = 0; g.amp = 0; g.tilt = 0; g.pop = 0;
  g.startX = null; g.startY = null; g.peakX = 0;
  g.down = (x, y) => { g.startX = x; g.startY = y; g.curX = x; g.curY = y; };
  g.move = (x, y, dx) => {
    g.curX = x; g.curY = y;
    if (g.phase === 1 && g.startX !== null) {
      const off = x - 540;
      const newDir = Math.abs(off) < 40 ? 0 : Math.sign(off);
      if (newDir !== 0 && g.dir !== 0 && newDir !== g.dir) {
        const amp = Math.abs(g.peakX - 540);
        if (amp > 110 && amp < 420) { g.swings++; g.score += 30; sndTap(); burst(540 + g.dir * 160, 760, '#ffffff', 4); }
        else if (amp >= 420) { hurt(6, x, y); say(g, 'Слишком сильно — можно сломать корень!', '#ff9d90'); }
        g.peakX = x;
      }
      if (newDir !== 0) g.dir = newDir;
      if (Math.abs(x - 540) > Math.abs(g.peakX - 540)) g.peakX = x;
      g.tilt = clamp((x - 540) / 700, -0.45, 0.45);
      if (g.swings >= g.need) { g.phase = 2; say(g, 'Связка разрыхлена! Быстро потяните ВВЕРХ!', '#7dffb0'); sndGood(); }
    }
  };
  g.up = () => {
    if (g.phase === 2 && g.curY !== undefined && g.startY !== undefined && g.startY - g.curY > 320) {
      g.phase = 3; g.pop = 1;
      g.score += 120; sndGood();
      burst(540, 700, '#ffffff', 24);
      say(g, 'Зуб извлечён! Покажите его пациенту 🦷', '#7dffb0');
      setTimeout(winLevel, 900);
    }
    g.startX = null; g.dir = 0; g.tilt = 0;
  };
  g.update = dt => {
    g.t += dt; g.timeLeft -= dt; g.msgT -= dt;
    if (g.phase === 3) g.pop += dt * 3;
    if (g.timeLeft <= 0 && !g.over) failLevel();
  };
  g.draw = () => {
    gameBaseBG();
    // десна
    ctx.fillStyle = '#e8919b';
    ctx.beginPath(); ctx.ellipse(540, 1060, 420, 240, 0, 0, Math.PI); ctx.fill();
    ctx.beginPath(); ctx.ellipse(540, 1040, 420, 240, 0, Math.PI, 0); ctx.fill();
    rr(120, 1040, 840, 60, 30); ctx.fillStyle = '#d77f89'; ctx.fill();
    // соседние зубы
    drawTooth(300, 990, 190); drawTooth(780, 990, 190);
    // целевой зуб
    const ty = g.phase === 3 ? 960 - g.pop * 500 : 990;
    drawTooth(540 + (g.tilt * 90), ty, 210, { rot: g.tilt });
    // щипцы
    if (g.phase < 3) {
      ctx.fillStyle = '#8fa3b2';
      rr(540 + g.tilt * 90 - 190, ty - 260, 60, 240, 20); ctx.fill();
      rr(540 + g.tilt * 90 + 130, ty - 260, 60, 240, 20); ctx.fill();
      ctx.fillStyle = '#54657a';
      rr(540 + g.tilt * 90 - 190, ty - 60, 60, 90, 18); ctx.fill();
      rr(540 + g.tilt * 90 + 130, ty - 60, 60, 90, 18); ctx.fill();
    }
    if (g.phase === 1) {
      text('Расшатывание: ' + g.swings + ' / ' + g.need, 540, 420, 46, '#ffffff');
      text('⇄', 540, 500, 70, '#a9e3ee');
      wrap('Плавные свайпы влево-вправо по зубу. Слишком сильно — треснет корень!', 540, 560, 30, '#a9d6e2', 900, 42);
    } else if (g.phase === 2) {
      text('ТЯНИТЕ ВВЕРХ! ⬆', 540, 440, 56, '#ffd94d');
    } else {
      text('Готово!', 540, 440, 56, '#7dffb0');
    }
    drawMsg(g);
  };
  return g;
}

/* ---------- УРОВЕНЬ 6: ИМПЛАНТАЦИЯ ---------- */
function levelImplant() {
  const g = baseGame(6, 100);
  g.phase = 1;
  g.depth = 0; g.drilling = false; g.depthTries = 0;
  g.sizes = [3.5, 2.0, 4.2, 2.8]; g.sizeIdx = 0;
  g.torque = 0; g.screwing = false; g.screw = 0; g.torqueDone = false;
  g.crownX = 540; g.crownY = 1450; g.crownDrag = false; g.crowned = false;
  const SIZES = [2.0, 2.8, 3.5, 4.2];
  g.down = (x, y) => {
    if (g.phase === 4 && Math.hypot(x - g.crownX, y - g.crownY) < 150) { g.crownDrag = true; }
  };
  g.move = (x, y) => {
    if (g.crownDrag) { g.crownX = x; g.crownY = y; }
  };
  g.up = () => {
    if (g.phase === 1 && g.drilling) stopDrill();
    if (g.phase === 3 && g.screwing) stopScrew();
    if (g.crownDrag) {
      g.crownDrag = false;
      if (Math.hypot(g.crownX - 540, g.crownY - 700) < 140) {
        g.crowned = true; g.crownX = 540; g.crownY = 700;
        g.score += 150; sndGood(); burst(540, 700, '#ffffff', 20);
        say(g, 'Коронка на импланте — улыбка готова!', '#7dffb0');
        setTimeout(winLevel, 800);
      } else { g.crownX = 540; g.crownY = 1450; say(g, 'Перетащите коронку точно на имплант'); }
    }
  };
  function stopDrill() {
    g.drilling = false;
    const err = Math.abs(g.depth - 10);
    if (g.depth > 12.5) { hurt(15); say(g, 'Слишком глубоко — риск повреждения нерва! Начнём заново.', '#ff9d90'); g.depth = 0; g.depthTries++; sndBad(); return; }
    if (err <= 0.6) { g.score += 120; g.phase = 2; say(g, 'Идеальная глубина ложа: 10 мм!', '#7dffb0'); sndGood(); }
    else { hurt(8); say(g, 'Глубина ' + g.depth.toFixed(1) + ' мм (нужно 10 мм). Ещё раз!', '#ffe08a'); g.depth = 0; }
  }
  function stopScrew() {
    g.screwing = false; g.torqueDone = true;
    if (g.torque >= 25 && g.torque <= 45) { g.score += 140; g.phase = 4; say(g, 'Момент затяжки идеален: имплант стабилен!', '#7dffb0'); sndGood(); }
    else if (g.torque < 25) { hurt(8); say(g, 'Имплант недостаточно стабилен (мало N·см)…', '#ff9d90'); g.phase = 4; }
    else { hurt(12); say(g, 'Пережали! Возможна микротрещина кости.', '#ff9d90'); g.phase = 4; }
  }
  g.update = dt => {
    g.t += dt; g.timeLeft -= dt; g.msgT -= dt;
    if (g.phase === 1 && g.drilling) g.depth += dt * (1.6 + g.depth * 0.22);
    if (g.phase === 3 && g.screwing) { g.screw = clamp(g.screw + dt * 0.55, 0, 1); g.torque = 35 + 32 * Math.sin(g.t * 4.2); }
    if (g.timeLeft <= 0 && !g.over) failLevel();
  };
  g.draw = () => {
    gameBaseBG();
    // кость + десна
    rr(260, 760, 560, 480, 60); ctx.fillStyle = '#cfd8de'; ctx.fill();
    rr(260, 760, 560, 110, 46); ctx.fillStyle = '#e8919b'; ctx.fill();
    // соседние зубы
    drawTooth(200, 740, 190); drawTooth(880, 740, 190);
    // ложе / имплант
    if (g.phase === 1) {
      const dh = g.depth / 12.5 * 380;
      rr(522, 870, 36, dh, 16); ctx.fillStyle = '#8b97a1'; ctx.fill();
      if (g.drilling) burst(540, 870 + dh, '#cfd8de', 1);
      // шкала глубины
      rr(920, 520, 50, 720, 22); ctx.fillStyle = '#27434e'; ctx.fill();
      ctx.fillStyle = 'rgba(46,204,113,0.6)'; ctx.fillRect(922, 520 + (9.4 / 12.5) * 720, 46, (1.2 / 12.5) * 720);
      const dy = 520 + (g.depth / 12.5) * 720;
      rr(900, dy - 8, 90, 16, 8); ctx.fillStyle = g.depth > 12.5 ? '#e74c3c' : '#ffd94d'; ctx.fill();
      text(g.depth.toFixed(1) + ' мм', 780, 540, 30, '#ffffff', 'right');
      text('цель: 10 мм', 780, 580, 26, '#a9e3ee', 'right');
      text('Формируем ложе под имплант', 540, 380, 44, '#ffffff');
      btn(340, 1440, 400, 130, '🌀 Сверлить', () => {}, { fs: 40, col: g.drilling ? '#e8a13a' : '#0e5a68' });
      holdRect.rect = { x: 340, y: 1440, w: 400, h: 130 };
      wrap('Удерживайте кнопку и ОТПУСТИТЕ на отметке 10 мм (зелёная зона). Глубже 12,5 мм — опасно!', 540, 1620, 30, '#a9d6e2', 900, 42);
    } else if (g.phase === 2) {
      rr(500, 870, 80, 380, 30); ctx.fillStyle = '#8b97a1'; ctx.fill();
      text('Выберите свёрла по возрастанию ⌀', 540, 380, 40, '#ffffff');
      text('Пройдено: ' + (g.sizeIdx ? SIZES.slice(0, g.sizeIdx).join(' → ') : '—'), 540, 440, 30, '#a9e3ee');
      g.sizes.forEach((sz, i) => {
        const used = SIZES[g.sizeIdx] === sz && false;
        btn(140 + (i % 2) * 420, 560 + Math.floor(i / 2) * 170, 380, 130, '⌀ ' + sz.toFixed(1) + ' мм', () => {
          if (sz === SIZES[g.sizeIdx]) {
            g.sizeIdx++; g.score += 40; sndTap(); burst(540, 870, '#cfd8de', 4);
            g.sizes = g.sizes.filter(v => v !== sz);
            if (g.sizeIdx >= 4) { g.phase = 3; say(g, 'Ложе готово! Вкручиваем имплант.', '#7dffb0'); }
          } else { hurt(10); say(g, 'Сверла идут ОТ ТОНКОГО К ТОЛСТОМУ!', '#ff9d90'); sndBad(); }
        }, { fs: 34, col: '#0e5a68' });
      });
      wrap('Подсказка: начинают с пилотного сверла ⌀2,0 мм.', 540, 980, 30, '#a9d6e2', 900, 42);
    } else {
      // имплант
      const iy = 860 - (1 - (g.screw || (g.phase > 3 ? 1 : 0))) * 260;
      ctx.save(); ctx.translate(540, iy + 200);
      ctx.rotate(0); ctx.fillStyle = '#b9c2cf';
      rr(-34, -160, 68, 330, 20); ctx.fill();
      ctx.strokeStyle = '#7d8b96'; ctx.lineWidth = 5;
      for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(-34, -130 + i * 44); ctx.lineTo(34, -116 + i * 44); ctx.stroke(); }
      ctx.fillStyle = '#e8a13a'; rr(-50, -230, 100, 80, 16); ctx.fill();
      ctx.restore();
      if (g.phase === 3) {
        text('Вкрутите имплант: отпустите при 25–45 Н·см', 540, 380, 38, '#ffffff');
        // манометр
        ctx.beginPath(); ctx.arc(540, 1420, 150, Math.PI, 0); ctx.lineWidth = 26; ctx.strokeStyle = '#27434e'; ctx.stroke();
        ctx.beginPath(); ctx.arc(540, 1420, 150, Math.PI + (25 / 70) * Math.PI, Math.PI + (45 / 70) * Math.PI);
        ctx.strokeStyle = '#2ecc71'; ctx.stroke();
        const na = Math.PI + clamp(g.torque, 0, 70) / 70 * Math.PI;
        ctx.beginPath(); ctx.moveTo(540, 1420); ctx.lineTo(540 + Math.cos(na) * 120, 1420 + Math.sin(na) * 120);
        ctx.lineWidth = 10; ctx.strokeStyle = '#ffd94d'; ctx.stroke();
        text(g.torque.toFixed(0) + ' Н·см', 540, 1620, 40, '#ffffff');
        btn(340, 1680, 400, 120, '🔩 Вкручивать', () => {}, { fs: 36, col: g.screwing ? '#e8a13a' : '#0e5a68' });
        holdRect.rect = { x: 340, y: 1680, w: 400, h: 120 };
      } else {
        // коронка
        if (!g.crowned) {
          text('Финал: перетащите коронку на имплант', 540, 380, 42, '#ffffff');
          rr(330, 1330, 420, 190, 30); ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fill();
          text('поднос с коронкой', 540, 1370, 28, '#a9e3ee');
          drawTooth(g.crownX, g.crownY, 210, { crown: true });
        } else {
          drawTooth(540, 700, 210, { crown: true });
          text('Имплант + коронка = новый зуб! 🎉', 540, 380, 44, '#7dffb0');
        }
      }
    }
    drawMsg(g);
  };
  const holdRect = { rect: null };
  const _down = g.down; const _up = g.up;
  g.down = (x, y) => {
    if (holdRect.rect && x >= holdRect.rect.x && x <= holdRect.rect.x + holdRect.rect.w && y >= holdRect.rect.y && y <= holdRect.rect.y + holdRect.rect.h) {
      if (g.phase === 1) { g.drilling = true; return; }
      if (g.phase === 3) { g.screwing = true; return; }
    }
    _down(x, y);
  };
  g.up = () => { _up(); };
  return g;
}

/* ---------- запуск уровня ---------- */
const FACTORIES = { 1: levelDiag, 2: levelAnesth, 3: levelCaries, 4: levelPulp, 5: levelExtract, 6: levelImplant };
function startLevel(id) { game = FACTORIES[id](); go('game'); }

/* ---------- ИГРОВОЙ ЭКРАН ---------- */
SCREENS.game = {
  update(dt) { if (game) game.update(dt); },
  draw() {
    if (!game) return;
    const l = lvlById(game.levelId);
    game.draw();
    drawHUD(l);
    drawParts();
    btn(40, 1768, 200, 90, '←', () => go('map'), { fs: 46, col: 'rgba(14,90,104,0.85)' });
  }
};

/* ---------- РЕЗУЛЬТАТ ---------- */
SCREENS.result = {
  update(dt) { if (screenArg && screenArg.animT === undefined) screenArg.animT = 0; },
  draw() {
    const { l, stars, score } = screenArg;
    gameBaseBG();
    text('Этап пройден!', 540, 320, 72, '#ffffff');
    text(l.icon + ' ' + l.title, 540, 400, 40, '#a9e3ee');
    for (let i = 0; i < 3; i++) star(540 + (i - 1) * 170, 620, 70, i < stars ? '#ffd94d' : 'rgba(255,255,255,0.15)');
    text('Счёт: ' + score, 540, 820, 52, '#ffd94d');
    wrap(l.fact, 140, 920, 32, '#cfeef5', 800, 48, 'left');
    if (l.id < 6 && l.id < save.unlocked) btn(240, 1300, 600, 120, 'Дальше →', () => go('card', l.id + 1), { fs: 46, col: '#27ae60' });
    else btn(240, 1300, 600, 120, 'К карте', () => go('map'), { fs: 44 });
    btn(240, 1470, 600, 100, 'Пройти ещё раз', () => go('card', l.id), { col: '#0e5a68', fs: 34 });
    if (l.id === 6) {
      text('🏆 Вы прошли все этапы клиники!', 540, 1240, 38, '#ffd94d');
    }
  }
};

/* ---------- ПРОВАЛ ---------- */
SCREENS.fail = {
  draw() {
    gameBaseBG();
    text('😢', 540, 500, 120, '#ffffff');
    text('Пациент не выдержал…', 540, 640, 56, '#ffffff');
    wrap(screenArg && screenArg.id === 4 ? '' : '', 540, 700, 30, '#fff', 800, 40);
    wrap('Комфорт упал до нуля или время вышло. Врач не тот, кто не ошибается, а тот, кто пробует снова!', 540, 730, 34, '#cfeef5', 820, 48);
    btn(240, 980, 600, 120, 'Попробовать снова', () => go('card', screenArg.id), { fs: 40, col: '#27ae60' });
    btn(320, 1150, 440, 100, 'К карте', () => go('map'), { col: '#0e5a68', fs: 34 });
  }
};

/* ---------- главный цикл ---------- */
let lastT = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  buttons = [];
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  const sc = SCREENS[screen];
  if (sc.update) sc.update(dt);
  sc.draw();
  if (screen !== 'game') { updateParts(dt); drawParts(); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
