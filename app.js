'use strict';

/* ================= Configuración ================= */
const ACTIVITIES = [
  { id: 'flexiones',   name: 'Flexiones',   unit: 'rep', emoji: '💪', quick: [5, 10, 20] },
  { id: 'abdominales', name: 'Abdominales', unit: 'rep', emoji: '🔥', quick: [10, 20, 30] },
  { id: 'sentadillas', name: 'Sentadillas', unit: 'rep', emoji: '🦵', quick: [10, 20, 30] },
  { id: 'dominadas',   name: 'Dominadas',   unit: 'rep', emoji: '🧗', quick: [3, 5, 10] },
  { id: 'correr',      name: 'Correr',      unit: 'km',  emoji: '🏃', quick: [0.5, 1, 5] },
  { id: 'andar',       name: 'Andar',       unit: 'km',  emoji: '🚶', quick: [0.5, 1, 2] },
];
const ACT = Object.fromEntries(ACTIVITIES.map(a => [a.id, a]));
const STORAGE_KEY = 'mi-actividad-v1';

/* ================= Almacenamiento ================= */
function loadDb() {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (d && Array.isArray(d.entries)) return d;
  } catch (e) { /* datos corruptos o sin acceso */ }
  return { version: 1, entries: [] };
}
let db = loadDb();

function saveDb() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    return true;
  } catch (e) {
    toast('⚠️ No se pudo guardar en el teléfono');
    return false;
  }
}

// Pide al navegador que no borre los datos automáticamente
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(() => {});
}

/* ================= Utilidades ================= */
const $ = (s) => document.querySelector(s);
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const todayStr = () => ymd(new Date());
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const nf = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });
const longDate = (s) => parseYmd(s).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function fmtAmount(actId, v) {
  return ACT[actId].unit === 'km' ? `${nf.format(v)} km` : `${nf.format(v)} rep.`;
}

function totalsFor(pred) {
  const t = {};
  for (const e of db.entries) if (pred(e)) t[e.act] = (t[e.act] || 0) + e.amount;
  // redondeo para evitar 0.30000000000000004
  for (const k in t) t[k] = Math.round(t[k] * 100) / 100;
  return t;
}

function streak() {
  const days = new Set(db.entries.map(e => e.date));
  let d = todayStr();
  if (!days.has(d)) d = addDays(d, -1);
  let n = 0;
  while (days.has(d)) { n++; d = addDays(d, -1); }
  return n;
}

/* ================= Estado ================= */
const state = {
  view: 'hoy',
  day: todayStr(),
  calMonth: (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })(),
  calDay: todayStr(),
  addAct: null,
};
let lastToday = todayStr();

/* ================= Vista: Hoy ================= */
function renderHoy() {
  const d = state.day;
  const isToday = d === todayStr();
  $('#day-label').textContent = isToday ? 'Hoy' : (d === addDays(todayStr(), -1) ? 'Ayer' : cap(parseYmd(d).toLocaleDateString('es-ES', { weekday: 'long' })));
  $('#day-sub').textContent = cap(longDate(d));
  $('#day-next').disabled = isToday;
  $('#day-today').hidden = isToday;

  const s = streak();
  $('#streak').textContent = s > 0 ? `🔥 Racha: ${s} ${s === 1 ? 'día' : 'días'}` : 'Empieza tu racha hoy';

  const t = totalsFor(e => e.date === d);
  const grid = $('#cards');
  grid.innerHTML = '';
  for (const a of ACTIVITIES) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.act = a.id;
    card.style.setProperty('--c', `var(--act-${a.id})`);
    card.innerHTML = `
      <span class="card-top">
        <span class="card-emoji" aria-hidden="true">${a.emoji}</span>
        <button class="card-plus" type="button" aria-label="Añadir otra cantidad de ${a.name}">+</button>
      </span>
      <span class="card-bottom">
        <span class="card-info">
          <span class="card-name">${a.name}</span>
          <span class="card-total" data-total>${nf.format(t[a.id] || 0)}<small>${a.unit === 'km' ? ' km' : ' rep.'}</small></span>
        </span>
        <span class="card-quick"></span>
      </span>`;
    card.querySelector('.card-plus').addEventListener('click', () => openAdd(a.id));
    const q = card.querySelector('.card-quick');
    for (const v of QUICK_ADD) {
      const qb = document.createElement('button');
      qb.type = 'button';
      qb.className = 'qbtn';
      qb.textContent = `+${v}`;
      qb.setAttribute('aria-label', `Sumar ${fmtAmount(a.id, v)} de ${a.name}`);
      qb.addEventListener('click', () => quickAdd(a.id, v));
      q.append(qb);
    }
    grid.append(card);
  }

  const items = db.entries.filter(e => e.date === d).sort((x, y) => y.ts - x.ts);
  const list = $('#day-list');
  list.innerHTML = '';
  $('#day-empty').hidden = items.length > 0;
  for (const e of items) {
    const a = ACT[e.act];
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="dot" style="background:var(--act-${a.id})"></span>
      <span class="entry-name">${a.emoji} ${a.name}</span>
      <span class="entry-amount">${fmtAmount(a.id, e.amount)}</span>`;
    const del = document.createElement('button');
    del.className = 'icon-btn small';
    del.setAttribute('aria-label', `Eliminar ${a.name} ${fmtAmount(a.id, e.amount)}`);
    del.textContent = '✕';
    del.addEventListener('click', () => removeEntry(e.id));
    li.append(del);
    list.append(li);
  }
}

/* ---- Suma rápida desde la tarjeta ---- */
// Toques seguidos (menos de 15 s entre ellos) en la misma actividad y día
// se acumulan en un único registro para no llenar el historial.
const QUICK_ADD = [1, 5, 10];
const MERGE_MS = 15000;
let lastQuick = null; // { id, act, date, time }

function quickAdd(actId, v) {
  const a = ACT[actId];
  const now = Date.now();
  let entry = null;
  if (lastQuick && lastQuick.act === actId && lastQuick.date === state.day && now - lastQuick.time < MERGE_MS) {
    entry = db.entries.find(e => e.id === lastQuick.id) || null;
  }
  let undo;
  if (entry) {
    entry.amount = Math.round((entry.amount + v) * 100) / 100;
    entry.ts = now;
    const target = entry;
    undo = () => {
      target.amount = Math.round((target.amount - v) * 100) / 100;
      if (target.amount <= 0) db.entries = db.entries.filter(e => e !== target);
    };
  } else {
    entry = { id: uid(), date: state.day, act: actId, amount: v, ts: now };
    db.entries.push(entry);
    const target = entry;
    undo = () => { db.entries = db.entries.filter(e => e !== target); };
  }
  if (!saveDb()) return;
  lastQuick = { id: entry.id, act: actId, date: state.day, time: now };
  if (navigator.vibrate) navigator.vibrate(20);
  render();
  const totalEl = document.querySelector(`.card[data-act="${actId}"] [data-total]`);
  if (totalEl) { totalEl.classList.remove('bump'); void totalEl.offsetWidth; totalEl.classList.add('bump'); }
  toast(`+${fmtAmount(actId, v)} de ${a.name.toLowerCase()}`, 'Deshacer', () => {
    undo();
    lastQuick = null;
    saveDb();
    render();
  });
}

function removeEntry(id) {
  const idx = db.entries.findIndex(e => e.id === id);
  if (idx < 0) return;
  const [removed] = db.entries.splice(idx, 1);
  saveDb();
  render();
  toast('Registro eliminado', 'Deshacer', () => {
    db.entries.push(removed);
    saveDb();
    render();
  });
}

/* ================= Diálogo añadir ================= */
const dlg = $('#add-dlg');

function openAdd(actId) {
  const a = ACT[actId];
  state.addAct = actId;
  $('#add-title').textContent = `${a.emoji} ${a.name}`;
  $('#add-date').textContent = state.day === todayStr() ? 'Hoy' : cap(longDate(state.day));
  const input = $('#add-input');
  input.value = '';
  input.inputMode = a.unit === 'km' ? 'decimal' : 'numeric';
  $('#add-unit').textContent = a.unit === 'km' ? 'km' : 'repeticiones';
  $('#add-error').hidden = true;

  const q = $('#quick');
  q.innerHTML = '';
  for (const v of a.quick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = `+${nf.format(v)}`;
    b.addEventListener('click', () => {
      const cur = parseAmount(input.value) || 0;
      input.value = nf.format(Math.round((cur + v) * 100) / 100).replace(/\./g, '');
    });
    q.append(b);
  }
  dlg.showModal();
  setTimeout(() => input.focus(), 50);
}

function parseAmount(str) {
  const s = String(str).trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
  return parseFloat(s);
}

$('#add-form').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const a = ACT[state.addAct];
  let v = parseAmount($('#add-input').value);
  const err = $('#add-error');
  if (!isFinite(v) || v <= 0) { err.textContent = 'Escribe una cantidad mayor que 0.'; err.hidden = false; return; }
  if (a.unit === 'rep' && !Number.isInteger(v)) { err.textContent = 'Las repeticiones deben ser un número entero.'; err.hidden = false; return; }
  if (v > (a.unit === 'km' ? 500 : 10000)) { err.textContent = 'Esa cantidad parece demasiado alta.'; err.hidden = false; return; }
  v = Math.round(v * 100) / 100;

  db.entries.push({ id: uid(), date: state.day, act: a.id, amount: v, ts: Date.now() });
  if (!saveDb()) return;
  dlg.close();
  if (navigator.vibrate) navigator.vibrate(30);
  render();
  toast(`+${fmtAmount(a.id, v)} de ${a.name.toLowerCase()}`);
});
$('#add-cancel').addEventListener('click', () => dlg.close());
dlg.addEventListener('click', (ev) => { if (ev.target === dlg) dlg.close(); }); // toque fuera

/* ================= Vista: Calendario ================= */
function renderLegend() {
  const lg = $('#legend');
  lg.innerHTML = ACTIVITIES.map(a =>
    `<span class="legend-item"><span class="dot" style="background:var(--act-${a.id})"></span>${a.name}</span>`
  ).join('');
}

function renderCal() {
  const m = state.calMonth;
  const year = m.getFullYear(), month = m.getMonth();
  $('#m-label').textContent = cap(m.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }));
  const now = new Date();
  $('#m-next').disabled = year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth());

  // actividades por día del mes
  const prefix = `${year}-${pad(month + 1)}-`;
  const byDay = {};
  for (const e of db.entries) {
    if (!e.date.startsWith(prefix)) continue;
    (byDay[e.date] = byDay[e.date] || new Set()).add(e.act);
  }

  const grid = $('#cal-grid');
  grid.innerHTML = '';
  const offset = (new Date(year, month, 1).getDay() + 6) % 7; // lunes primero
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayStr();

  for (let i = 0; i < offset; i++) {
    const s = document.createElement('span');
    s.className = 'cal-cell blank';
    grid.append(s);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const ds = prefix + pad(day);
    const acts = byDay[ds];
    const b = document.createElement('button');
    b.className = 'cal-cell';
    if (ds === today) b.classList.add('today');
    if (ds === state.calDay) b.classList.add('selected');
    if (acts) b.classList.add('active');
    if (ds > today) { b.disabled = true; b.classList.add('future'); }
    const names = acts ? ACTIVITIES.filter(a => acts.has(a.id)).map(a => a.name).join(', ') : 'sin actividad';
    b.setAttribute('aria-label', `${day}: ${names}`);
    const dots = acts ? ACTIVITIES.filter(a => acts.has(a.id)).map(a => `<span class="dot" style="background:var(--act-${a.id})"></span>`).join('') : '';
    b.innerHTML = `<span class="cal-num">${day}</span><span class="cal-dots">${dots}</span>`;
    b.addEventListener('click', () => { state.calDay = ds; renderCal(); });
    grid.append(b);
  }

  // detalle del día seleccionado
  const det = $('#cal-detail');
  const dt = totalsFor(e => e.date === state.calDay);
  const rows = ACTIVITIES.filter(a => dt[a.id]).map(a =>
    `<li><span class="dot" style="background:var(--act-${a.id})"></span><span>${a.emoji} ${a.name}</span><strong>${fmtAmount(a.id, dt[a.id])}</strong></li>`
  ).join('');
  det.innerHTML = `
    <h2 class="panel-title">${cap(longDate(state.calDay))}</h2>
    ${rows ? `<ul class="totals">${rows}</ul>` : '<p class="muted">Sin actividad registrada.</p>'}
    <button class="btn" id="cal-edit">${rows ? 'Ver / editar este día' : 'Añadir actividad este día'}</button>`;
  $('#cal-edit').addEventListener('click', () => { state.day = state.calDay; switchView('hoy'); });

  // totales del mes
  const mt = totalsFor(e => e.date.startsWith(prefix));
  const activeDays = Object.keys(byDay).length;
  $('#m-days').textContent = `${activeDays} ${activeDays === 1 ? 'día' : 'días'} con actividad`;
  $('#m-totals').innerHTML = ACTIVITIES.map(a =>
    `<li><span class="dot" style="background:var(--act-${a.id})"></span><span>${a.emoji} ${a.name}</span><strong>${fmtAmount(a.id, mt[a.id] || 0)}</strong></li>`
  ).join('');
}

$('#m-prev').addEventListener('click', () => {
  state.calMonth = new Date(state.calMonth.getFullYear(), state.calMonth.getMonth() - 1, 1);
  renderCal();
});
$('#m-next').addEventListener('click', () => {
  state.calMonth = new Date(state.calMonth.getFullYear(), state.calMonth.getMonth() + 1, 1);
  renderCal();
});

/* ================= Vista: Ajustes ================= */
function renderAjustes() {
  const n = db.entries.length;
  const days = new Set(db.entries.map(e => e.date)).size;
  $('#data-count').textContent = `${n} ${n === 1 ? 'registro' : 'registros'} en ${days} ${days === 1 ? 'día' : 'días'}.`;
}

function download(name, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

$('#btn-export').addEventListener('click', () => {
  download(`mi-actividad-${todayStr()}.json`, JSON.stringify(db, null, 1), 'application/json');
  toast('Copia exportada');
});

$('#btn-csv').addEventListener('click', () => {
  const rows = [...db.entries].sort((a, b) => a.date.localeCompare(b.date) || a.ts - b.ts);
  const lines = ['fecha;actividad;cantidad;unidad'];
  for (const e of rows) {
    const a = ACT[e.act];
    lines.push(`${e.date};${a.name};${String(e.amount).replace('.', ',')};${a.unit === 'km' ? 'km' : 'repeticiones'}`);
  }
  download(`mi-actividad-${todayStr()}.csv`, '﻿' + lines.join('\r\n'), 'text/csv');
  toast('CSV exportado');
});

$('#btn-import').addEventListener('click', () => $('#file-import').click());
$('#file-import').addEventListener('change', async (ev) => {
  const file = ev.target.files[0];
  ev.target.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data || !Array.isArray(data.entries)) throw new Error('formato');
    const valid = data.entries.filter(e =>
      e && typeof e.id === 'string' && ACT[e.act] &&
      typeof e.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
      typeof e.amount === 'number' && isFinite(e.amount) && e.amount > 0
    ).map(e => ({ id: e.id, date: e.date, act: e.act, amount: e.amount, ts: Number(e.ts) || 0 }));
    const existing = new Set(db.entries.map(e => e.id));
    const fresh = valid.filter(e => !existing.has(e.id));
    db.entries.push(...fresh);
    saveDb();
    render();
    toast(`Importados ${fresh.length} registros nuevos`);
  } catch (e) {
    toast('⚠️ El archivo no es una copia válida');
  }
});

$('#btn-wipe').addEventListener('click', () => {
  if (!db.entries.length) { toast('No hay registros'); return; }
  if (!confirm('¿Borrar TODOS los registros? Esta acción no se puede deshacer.')) return;
  if (!confirm('¿Seguro? Te recomendamos exportar una copia antes.')) return;
  db.entries = [];
  saveDb();
  render();
  toast('Registros borrados');
});

/* ================= Navegación ================= */
function switchView(view) {
  state.view = view;
  for (const v of ['hoy', 'cal', 'ajustes']) $(`#view-${v}`).hidden = v !== view;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
  window.scrollTo(0, 0);
  render();
}
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
  if (t.dataset.view === 'cal') {
    const d = new Date(); state.calMonth = new Date(d.getFullYear(), d.getMonth(), 1); state.calDay = todayStr();
  }
  switchView(t.dataset.view);
}));

$('#day-prev').addEventListener('click', () => { state.day = addDays(state.day, -1); renderHoy(); });
$('#day-next').addEventListener('click', () => { if (state.day < todayStr()) { state.day = addDays(state.day, 1); renderHoy(); } });
$('#day-today').addEventListener('click', () => { state.day = todayStr(); renderHoy(); });

function render() {
  if (state.view === 'hoy') renderHoy();
  else if (state.view === 'cal') renderCal();
  else renderAjustes();
}

// Si la app queda abierta y cambia el día, avanzar a "hoy"
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  const t = todayStr();
  if (t !== lastToday) {
    if (state.day === lastToday) state.day = t;
    lastToday = t;
  }
  db = loadDb();
  render();
});

/* ================= Toast ================= */
let toastTimer;
function toast(msg, actionLabel, action) {
  const el = $('#toast');
  $('#toast-msg').textContent = msg;
  const btn = $('#toast-action');
  if (actionLabel) {
    btn.textContent = actionLabel;
    btn.hidden = false;
    btn.onclick = () => { el.hidden = true; action(); };
  } else {
    btn.hidden = true;
    btn.onclick = null;
  }
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, actionLabel ? 5000 : 2200);
}

/* ================= Inicio ================= */
renderLegend();
render();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
