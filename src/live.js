
const D = __DATA__;
const P = D.P;
const doc = (s) => document.querySelector(s);
const stage = doc(".iso-stage");
const svg = stage.querySelector("svg");
const readout = doc("[data-readout]");
const status = doc("[data-status]");
const nowLine = doc("[data-now]");
const themeButton = doc("[data-theme-toggle]");
const sceneButtons = [...document.querySelectorAll("[data-scene]")];
const still = matchMedia("(prefers-reduced-motion: reduce)");
const narrow = matchMedia("(max-width: 560px)");
const $ = (s) => svg.querySelector(s);
const $$ = (s) => [...svg.querySelectorAll(s)];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const fmt = (v, digits = 0) => v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const kw = (watts) => fmt(watts / 1000, 2);
const cap = (text) => text[0].toUpperCase() + text.slice(1);
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ---------- partes del dibujo ----------
const flows = {};
for (const el of $$("[data-flow]")) (flows[el.dataset.flow] ??= []).push({ el, s0: +el.dataset.s0 });
const suns = $$("[data-sun]");
const leds = $$("[data-led]").map((el) => ({ el, i: +el.dataset.led }));
const invLed = $('[data-part="inv-led"]');
const lcd = $('[data-part="lcd"]');
const fan = $('[data-part="fan"]');
const UP = axisVector(P, [0, 0, 1]);
const OUT = axisVector(P, [0, 1, 0]);

// Cada pieza que entra o sale lleva su resorte: p va de 0 (fuera) a 1 (en su sitio).
const moving = new Set();
const shift = (els, vector, amount) => {
  const t = amount > 0.01 ? `translate(${(vector[0] * amount).toFixed(2)} ${(vector[1] * amount).toFixed(2)})` : null;
  for (const el of els) (t ? el.setAttribute("transform", t) : el.removeAttribute("transform"));
};
const showAll = (els, on) => {
  for (const el of els) el.style.display = on ? "" : "none";
};
const slots = Array.from({ length: D.slots }, () => ({ panel: [], rack: [], p: 0, v: 0, target: -1, wait: 0, old: false }));
for (const el of $$("[data-slot]")) slots[+el.dataset.slot][el.dataset.kind === "panel" ? "panel" : "rack"].push(el);
for (const s of slots) {
  s.apply = () => {
    const out = s.p <= 0.002 && s.target <= 0;
    showAll(s.panel, !out);
    showAll(s.rack, !out);
    if (out) return;
    const p = Math.min(1, s.p);
    shift(s.panel, UP, (1 - p) * 26);
    for (const el of s.panel) el.style.opacity = smooth(0, 0.45, p).toFixed(3);
    for (const el of s.rack) el.style.opacity = smooth(0, 0.6, p).toFixed(3);
  };
}
const rowGroups = [1, 2, 3, 4].map((need) => ({ need, els: $$(`[data-rows="${need}"]`), p: 0, v: 0, target: -1, wait: 0 }));
for (const r of rowGroups) {
  r.apply = () => {
    const out = r.p <= 0.002 && r.target <= 0;
    showAll(r.els, !out);
    for (const el of r.els) el.style.opacity = smooth(0, 1, Math.min(1, r.p)).toFixed(3);
  };
}
const batGroups = [1, 2, 3, 4].map((n) => ({ box: $$(`[data-bat="${n}"][data-batbox]`), lines: $$(`[data-bat="${n}"]:not([data-batbox])`), p: 0, v: 0, target: -1, wait: 0 }));
for (const b of batGroups) {
  b.apply = () => {
    const out = b.p <= 0.002 && b.target <= 0;
    showAll(b.box, !out);
    showAll(b.lines, !out);
    if (out) return;
    const p = Math.min(1, b.p);
    shift(b.box, OUT, (1 - p) * 16);
    for (const el of b.box) el.style.opacity = smooth(0, 0.6, p).toFixed(3);
    for (const el of b.lines) el.style.opacity = smooth(0.5, 1, p).toFixed(3);
  };
}
function stepSpring(o, dt) {
  if (o.wait > 0) {
    o.wait -= dt;
    return true;
  }
  const w = 11;
  const z = 0.8;
  for (let i = 0; i < 4; i++) {
    const h = dt / 4;
    o.v += (w * w * (o.target - o.p) - 2 * z * w * o.v) * h;
    o.p += o.v * h;
  }
  if (Math.abs(o.target - o.p) < 5e-4 && Math.abs(o.v) < 5e-3) {
    o.p = o.target;
    o.v = 0;
    return false;
  }
  return true;
}

// ---------- sistema ----------
const S = { meses: [...D.ejemplo.meses], existentes: { ...D.ejemplo.existentes }, nuevas: 0, baterias: 0, manual: false, mes: D.ejemplo.mes };
let sug = null;
let samples = null;
let pvPeak = 1;
let shares = { row0: 1, row3: 0, row23: 0, row123: 0 };
let diaPV = 0;
let roofFull = false;
const KEYS = ["pv", "load", "batt", "grid", "soc", "net"];

function recompute({ calm = false } = {}) {
  S.existentes.n = clamp(S.existentes.n, 0, D.slots);
  sug = sugerencia(S.meses, S.existentes);
  if (!S.manual) {
    S.nuevas = sug.nuevas;
    S.baterias = sug.baterias;
  }
  roofFull = S.existentes.n + S.nuevas > D.slots;
  S.nuevas = clamp(S.nuevas, 0, D.slots - S.existentes.n);
  S.baterias = clamp(S.baterias, D.limites.baterias[0], D.limites.baterias[1]);
  diaPV = produccionDia({ existentes: S.existentes, nuevas: S.nuevas });
  const sim = simulate({ diaPV, baterias: S.baterias, diaCasa: S.meses[S.mes] / 30 });
  samples = Object.fromEntries(KEYS.map((key) => [key, sim.rows.map((row) => row[key])]));
  pvPeak = sim.pico || 1;
  const total = S.existentes.n + S.nuevas;
  const watts = (i) => (i < S.existentes.n ? S.existentes.w : D.vatios);
  const inRow = [0, 0, 0, 0];
  for (let i = 0; i < total; i++) inRow[Math.floor(i / D.cols)] += watts(i);
  const sum = inRow.reduce((a, b) => a + b, 0) || 1;
  shares = { row0: inRow[0] / sum, row3: inRow[3] / sum, row23: (inRow[2] + inRow[3]) / sum, row123: (inRow[1] + inRow[2] + inRow[3]) / sum };
  setTargets(calm || still.matches);
  updateFicha();
  updateControls();
  updateChart();
  if (!frame) draw(0, true);
}

function setTargets(calm) {
  const total = S.existentes.n + S.nuevas;
  const appear = [];
  const vanish = [];
  slots.forEach((s, i) => {
    const want = i < total ? 1 : 0;
    const old = i < S.existentes.n;
    if (old !== s.old) {
      s.old = old;
      for (const el of [...s.panel, ...s.rack]) el.toggleAttribute("data-old", old);
    }
    if (want !== s.target) {
      s.target = want;
      (want ? appear : vanish).push(s);
    }
  });
  appear.forEach((s, k) => {
    s.wait = k * 0.045;
    if (s.p > 1) s.p = 1;
    moving.add(s);
  });
  vanish.reverse().forEach((s, k) => {
    s.wait = k * 0.03;
    moving.add(s);
  });
  const rowsNeeded = Math.ceil(total / D.cols);
  for (const r of rowGroups) {
    const want = rowsNeeded >= r.need ? 1 : 0;
    if (want !== r.target) {
      r.target = want;
      r.wait = want ? 0.12 : 0;
      moving.add(r);
    }
  }
  batGroups.forEach((b, i) => {
    const want = i < S.baterias ? 1 : 0;
    if (want !== b.target) {
      b.target = want;
      b.wait = want ? i * 0.08 : (3 - i) * 0.05;
      moving.add(b);
    }
  });
  if (calm) {
    for (const o of moving) {
      o.p = o.target;
      o.v = 0;
      o.wait = 0;
      o.apply();
    }
    moving.clear();
  } else {
    for (const o of moving) o.apply();
    run();
  }
}

function sample(hour) {
  const n = samples.pv.length - 1;
  const x = (clamp(hour, 0, 24) / 24) * n;
  const i = Math.min(n - 1, Math.floor(x));
  const f = x - i;
  const out = {};
  for (const key of KEYS) out[key] = samples[key][i] + (samples[key][i + 1] - samples[key][i]) * f;
  return out;
}
// lo que lleva cada conducto, con signo en el sentido en que se dibujó la ruta
const linkShare = (k) => (S.baterias > k ? (S.baterias - k) / S.baterias : 0);
const CHANNEL = {
  pv: (s) => s.pv,
  row0: (s) => s.pv * shares.row0,
  row3: (s) => s.pv * shares.row3,
  row23: (s) => s.pv * shares.row23,
  row123: (s) => s.pv * shares.row123,
  bat: (s) => s.batt,
  batl1: (s) => s.batt * linkShare(1),
  batl2: (s) => s.batt * linkShare(2),
  batl3: (s) => s.batt * linkShare(3),
  ac: (s) => s.pv - s.batt,
  casa: (s) => s.load,
  red: (s) => s.grid,
};

// ---------- textos ----------
const clock = (h) => {
  const m = Math.round((((h % 24) + 24) % 24) * 60) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
const toward = (net) => (net >= -0.005 ? "a" : "de");
const batteryText = (s, short) => (S.baterias ? `${short ? "bat." : "batería"} ${Math.round(s.soc * 100)} %` : "sin batería");
// Lo que pasa en este momento, al lado de la hora del reproductor.
const say = (s) =>
  narrow.matches
    ? `${s.pv.toFixed(1)} kW · ${batteryText(s, true)} · ${toward(s.net)} LUMA ${Math.abs(s.net).toFixed(1)} kWh`
    : `placas ${s.pv.toFixed(1)} kW · ${batteryText(s, false)} · ${toward(s.net)} LUMA ${Math.abs(s.net).toFixed(1)} kWh`;
// La frase completa es para el lector de pantalla; la corta va en el panel, porque los números
// de placas, batería y LUMA ya están en el reproductor.
function explain(h, brief = false) {
  const s = sample(h);
  let what;
  if (!S.baterias) {
    if (s.grid > 0.05) what = "las placas cubren la casa y, sin batería, el sobrante sale a LUMA";
    else if (s.pv > 0.05) what = "las placas no alcanzan y, sin batería, LUMA completa";
    else what = "no hay sol ni batería: la casa toma de LUMA";
  } else if (s.batt > 0.05 && s.grid > 0.05) what = "las placas cubren la casa, cargan la batería y el resto sale a LUMA";
  else if (s.batt > 0.05) what = "las placas cubren la casa y cargan la batería";
  else if (s.grid > 0.05) what = "las placas cubren la casa; con la batería llena, el sobrante sale a LUMA";
  else if (s.batt < -0.05) what = s.pv > 0.05 ? "las placas ya no alcanzan y la batería completa lo que falta" : "no hay sol: la batería alimenta la casa";
  else if (s.grid < -0.05) what = s.pv > 0.05 ? "la batería está en su reserva; las placas y LUMA alimentan la casa" : "la batería llegó a su reserva y la casa toma de LUMA";
  else what = "las placas cubren justo lo que usa la casa";
  const day = `${s.net >= -0.005 ? "enviados a" : "tomados de"} LUMA en el día: ${Math.abs(s.net).toFixed(1)} kWh`;
  const bat = S.baterias ? `batería ${Math.round(s.soc * 100)} %` : "sin batería";
  if (brief) return `${cap(MESES[S.mes])}, ${clock(h)}: ${what}; la casa usa ${s.load.toFixed(1)} kW.`;
  return `${cap(MESES[S.mes])}, ${clock(h)} · ${what}. Placas ${s.pv.toFixed(1)} kW, casa ${s.load.toFixed(1)} kW, ${bat}; ${day}.`;
}

// ---------- ficha ----------
const F = Object.fromEntries([...document.querySelectorAll("[data-f]")].map((el) => [el.dataset.f, el]));
// Los números de la ficha (producción, respaldo y porcentajes) cuentan hasta su valor nuevo
// en vez de saltar; los conteos de placas y baterías cambian al instante.
const ficha = { goal: null, show: null, frame: 0, last: 0 };
function updateFicha() {
  const consumo = S.meses[S.mes];
  const anual = S.meses.reduce((a, b) => a + b, 0);
  const prodMes = diaPV * 30;
  ficha.goal = {
    prod: prodMes,
    dia: diaPV,
    resp: S.baterias ? respaldoHoras(S.baterias, consumo / 30) : 0,
    mes: consumo > 0 ? (prodMes / consumo) * 100 : 0,
    anio: anual > 0 ? ((prodMes * 12) / anual) * 100 : 0,
  };
  if (!ficha.show || still.matches) ficha.show = { ...ficha.goal };
  const watts = S.nuevas * D.vatios + S.existentes.n * S.existentes.w;
  F.kw.textContent = `${kw(watts)} kW`;
  F.placas.textContent = S.existentes.n ? `${S.nuevas} nuevas + ${S.existentes.n} de ${S.existentes.w} W` : `${S.nuevas} de ${D.vatios} W`;
  F.bat.textContent = S.baterias ? `${S.baterias} Powerwall` : "Sin batería";
  F.mesNombre.textContent = cap(MESES[S.mes]);
  F.mesUsa.textContent = `usa ${fmt(consumo)} kWh`;
  F.anioUsa.textContent = `usa ${fmt(anual)} kWh`;
  F.sug.textContent = `${sug.nuevas} nuevas · ${sug.baterias} PW`;
  const same = S.nuevas === sug.nuevas && S.baterias === sug.baterias;
  const delta = S.nuevas - sug.nuevas;
  F.nota.textContent = same ? "es lo que tienes" : delta ? `tienes ${delta > 0 ? "+" : "−"}${Math.abs(delta)} placas` : "cambiaste las baterías";
  renderFicha();
  if (!ficha.frame && !still.matches) {
    ficha.last = 0;
    ficha.frame = requestAnimationFrame(fichaTick);
  }
}
function renderFicha() {
  const v = ficha.show;
  const consumo = S.meses[S.mes];
  const anual = S.meses.reduce((a, b) => a + b, 0);
  F.prod.textContent = `${fmt(v.prod)} kWh/mes`;
  F.dia.textContent = `${fmt(v.dia, 1)} kWh al día`;
  F.respaldo.textContent = S.baterias ? `${fmt(S.baterias * BASE.bateria, 1)} kWh · respaldo ${Math.round(v.resp)} h` : "toda la noche de LUMA";
  F.mes.textContent = consumo > 0 ? `cubre ${Math.round(v.mes)} %` : "—";
  F.anio.textContent = anual > 0 ? `cubre ${Math.round(v.anio)} %` : "—";
}
function fichaTick(now) {
  const dt = ficha.last ? Math.min((now - ficha.last) / 1000, 1 / 30) : 1 / 60;
  ficha.last = now;
  const k = 1 - Math.exp(-dt / 0.45);
  let busy = false;
  for (const key of Object.keys(ficha.goal)) {
    const goal = ficha.goal[key];
    const next = ficha.show[key] + (goal - ficha.show[key]) * k;
    const close = Math.abs(goal - next) < (key === "dia" ? 0.02 : 0.2);
    ficha.show[key] = close ? goal : next;
    if (!close) busy = true;
  }
  renderFicha();
  ficha.frame = busy ? requestAnimationFrame(fichaTick) : 0;
}

// ---------- controles ----------
const out = Object.fromEntries([...document.querySelectorAll("[data-v]")].map((el) => [el.dataset.v, el]));
const steppers = Object.fromEntries([...document.querySelectorAll("[data-stepper]")].map((el) => [el.dataset.stepper, el]));
const mesSelect = doc("[data-mes]");
const mesInput = doc("[data-mes-kwh]");
const todosInput = doc("[data-todos]");
const vatiosInput = doc("[data-vatios]");
const resetButton = doc("[data-reset]");
const warn = doc("[data-warn]");
function updateControls() {
  const total = S.existentes.n + S.nuevas;
  out.nuevas.textContent = String(S.nuevas);
  out.existentes.textContent = String(S.existentes.n);
  out.baterias.textContent = String(S.baterias);
  const set = (key, canDown, canUp) => {
    const [down, up] = steppers[key].querySelectorAll("button");
    down.disabled = !canDown;
    up.disabled = !canUp;
  };
  set("nuevas", S.nuevas > 0, total < D.slots);
  set("existentes", S.existentes.n > 0, S.existentes.n < D.slots);
  set("baterias", S.baterias > D.limites.baterias[0], S.baterias < D.limites.baterias[1]);
  resetButton.disabled = !S.manual;
  if (+mesSelect.value !== S.mes) mesSelect.value = String(S.mes);
  if (document.activeElement !== mesInput) mesInput.value = String(S.meses[S.mes]);
  const notes = [];
  if (total === 0) notes.push("Sin placas, toda la energía viene de LUMA.");
  if (S.baterias > 0 && total > 0 && total < BASE.placasConBateria) notes.push(`Con batería, el cotizador pide al menos ${BASE.placasConBateria} placas.`);
  if (roofFull) notes.push(`En este techo caben ${D.slots} placas; las que faltan no se dibujan.`);
  warn.textContent = notes.join(" ");
}
for (const [key, box] of Object.entries(steppers)) {
  box.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-d]");
    if (!button || button.disabled) return;
    const d = +button.dataset.d;
    if (key === "nuevas") {
      S.nuevas += d;
      S.manual = true;
    } else if (key === "existentes") S.existentes.n += d;
    else {
      S.baterias += d;
      S.manual = true;
    }
    recompute();
    announce();
  });
}
resetButton.addEventListener("click", () => {
  S.manual = false;
  recompute();
  announce();
});
vatiosInput.addEventListener("change", () => {
  S.existentes.w = clamp(Math.round(parseFloat(vatiosInput.value) || D.ejemplo.existentes.w), D.limites.vatios[0], D.limites.vatios[1]);
  vatiosInput.value = String(S.existentes.w);
  recompute();
  announce();
});
mesSelect.addEventListener("change", () => selectMonth(+mesSelect.value));
const readMonth = () => {
  const v = parseFloat(mesInput.value);
  if (!Number.isFinite(v)) return;
  S.meses[S.mes] = clamp(Math.round(v), D.limites.mes[0], D.limites.mes[1]);
  recompute();
};
let typing = 0;
mesInput.addEventListener("input", () => {
  clearTimeout(typing);
  typing = setTimeout(readMonth, 250);
});
mesInput.addEventListener("change", () => {
  readMonth();
  mesInput.value = String(S.meses[S.mes]);
  announce();
});
doc("[data-fill]").addEventListener("click", () => {
  const v = clamp(Math.round(parseFloat(todosInput.value) || 0), D.limites.mes[0], D.limites.mes[1]);
  todosInput.value = String(v);
  S.meses = S.meses.map(() => v);
  recompute();
  announce();
});
function selectMonth(i) {
  S.mes = clamp(i, 0, 11);
  recompute();
}
let quietSystem = 0;
function announce() {
  clearTimeout(quietSystem);
  quietSystem = setTimeout(() => {
    status.textContent = `${S.nuevas} placas nuevas de ${D.vatios} W, ${S.existentes.n} que ya tenía de ${S.existentes.w} W, ${S.baterias} Powerwall. ${F.mesNombre.textContent}: ${F.mes.textContent}. En el año: ${F.anio.textContent}.`;
  }, 500);
}

// ---------- gráfica de 12 meses ----------
const NS = "http://www.w3.org/2000/svg";
const chartSvg = doc("[data-chart-svg]");
const tip = doc("[data-tip]");
const table = doc("[data-table]");
// La gráfica se dibuja al ancho real de su columna (1 unidad = 1 px), así el texto no se achica.
const CH = { x0: 40, x1: 0, top: 16, base: 140, W: 0, H: 166 };
const mk = (tag, attrs, parent) => {
  const el = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  if (parent) parent.appendChild(el);
  return el;
};
const gridG = mk("g", {}, chartSvg);
const colsG = mk("g", {}, chartSvg);
const prodLine = mk("line", { class: "sr-prod", x1: CH.x0 }, chartSvg);
const prodText = mk("text", { class: "sr-prod-text" }, chartSvg);
const baseLine = mk("line", { class: "sr-grid sr-baseline", x1: CH.x0, y1: CH.base, y2: CH.base }, chartSvg);
let colW = 0;
let barW = 0;
const cols = Array.from({ length: 12 }, (_, i) => {
  const g = mk("g", { class: "sr-col", tabindex: 0, role: "slider", "aria-valuemin": D.limites.mes[0], "aria-valuemax": D.limites.mes[1] }, colsG);
  const hit = mk("rect", { class: "sr-hit", y: CH.top - 10, height: CH.base - CH.top + 34 }, g);
  const placas = mk("path", { class: "sr-bar-placas" }, g);
  const luma = mk("path", { class: "sr-bar-luma" }, g);
  const label = mk("text", { class: "sr-axis-text sr-month", y: CH.base + 16, "text-anchor": "middle" }, g);
  label.textContent = MESES_CORTOS[i];
  const val = mk("text", { class: "sr-val", "text-anchor": "middle" }, g);
  return { i, cx: 0, g, hit, label, placas, luma, val, show: { c: 0, p: 0 } };
});
// En una ventana ancha pero baja la gráfica se achata para que la columna de controles quepa sin bajar.
const short = matchMedia("(min-width: 1100px) and (max-height: 720px)");
const shorter = matchMedia("(min-width: 1100px) and (max-height: 680px)");
function layoutChart() {
  const width = Math.max(300, Math.round(chartSvg.parentElement.clientWidth));
  const height = shorter.matches ? 110 : short.matches ? 122 : 166;
  if (width === CH.W && height === CH.H) return;
  CH.W = width;
  CH.H = height;
  CH.base = height - 26;
  CH.x1 = width - 66;
  chartSvg.setAttribute("viewBox", `0 0 ${width} ${CH.H}`);
  colW = (CH.x1 - CH.x0) / 12;
  barW = Math.min(24, colW * 0.55);
  for (const c of cols) {
    c.cx = CH.x0 + colW * (c.i + 0.5);
    c.hit.setAttribute("x", (c.cx - colW / 2 + 1).toFixed(1));
    c.hit.setAttribute("width", (colW - 2).toFixed(1));
    c.hit.setAttribute("height", CH.base - CH.top + 34);
    c.label.setAttribute("x", c.cx.toFixed(1));
    c.label.setAttribute("y", CH.base + 16);
    c.val.setAttribute("x", c.cx.toFixed(1));
  }
  prodLine.setAttribute("x2", CH.x1);
  prodText.setAttribute("x", CH.x1 + 8);
  baseLine.setAttribute("x2", CH.x1);
  baseLine.setAttribute("y1", CH.base);
  baseLine.setAttribute("y2", CH.base);
  gridTop = 0;
  if (samples) renderChart();
}
let gridTop = 0;
const chart = { top: 1000, topShow: 1000, prod: 0, prodShow: 0, frozen: null, dirty: true };
const niceTop = (value) => {
  const raw = Math.max(100, value * 1.12);
  const step = [100, 200, 250, 500, 1000].find((s) => raw / s <= 5) ?? 1000;
  return Math.ceil(raw / step) * step;
};
function drawGrid(top) {
  if (gridTop === top) return;
  gridTop = top;
  gridG.textContent = "";
  const step = [100, 200, 250, 500, 1000].find((s) => top / s <= 5) ?? 1000;
  for (let v = step; v <= top + 1e-6; v += step) {
    const y = CH.base - (v / top) * (CH.base - CH.top);
    mk("line", { class: "sr-grid", x1: CH.x0, x2: CH.x1, y1: y, y2: y }, gridG);
    const t = mk("text", { class: "sr-axis-text", x: CH.x0 - 8, y: y + 3.5, "text-anchor": "end" }, gridG);
    t.textContent = v >= 1000 ? `${fmt(v / 1000, v % 1000 ? 1 : 0)}K` : String(v);
  }
  const zero = mk("text", { class: "sr-axis-text", x: CH.x0 - 8, y: CH.base + 3.5, "text-anchor": "end" }, gridG);
  zero.textContent = "0";
}
const barPath = (x, y0, y1, rounded) => {
  const h = y0 - y1;
  if (h < 0.4) return "";
  const r = rounded ? Math.min(4, h, barW / 2) : 0;
  const w = barW;
  return r
    ? `M${x} ${y0}V${y1 + r}Q${x} ${y1} ${x + r} ${y1}H${x + w - r}Q${x + w} ${y1} ${x + w} ${y1 + r}V${y0}Z`
    : `M${x} ${y0}V${y1}H${x + w}V${y0}Z`;
};
function updateChart() {
  chart.prod = diaPV * 30;
  if (!chart.frozen) chart.top = niceTop(Math.max(...S.meses, chart.prod));
  chart.dirty = true;
  if (still.matches || !visibleChart) settleChart();
  for (const c of cols) {
    const consumo = S.meses[c.i];
    c.g.setAttribute("aria-label", `${cap(MESES[c.i])}: ${fmt(consumo)} kWh`);
    c.g.setAttribute("aria-valuenow", String(consumo));
    c.g.classList.toggle("is-sel", c.i === S.mes);
  }
  table.textContent = "";
  for (let i = 0; i < 12; i++) {
    const consumo = S.meses[i];
    const cubre = Math.min(consumo, chart.prod);
    const row = document.createElement("tr");
    for (const value of [cap(MESES[i]), `${fmt(consumo)} kWh`, `${fmt(chart.prod)} kWh`, `${fmt(cubre)} kWh`, `${fmt(Math.max(0, consumo - chart.prod))} kWh`]) {
      const cell = document.createElement(row.children.length ? "td" : "th");
      cell.textContent = value;
      row.appendChild(cell);
    }
    table.appendChild(row);
  }
  runChart();
}
function settleChart() {
  chart.topShow = chart.top;
  chart.prodShow = chart.prod;
  for (const c of cols) c.show = { c: S.meses[c.i], p: chart.prod };
}
function renderChart() {
  const top = chart.topShow;
  drawGrid(chart.top);
  const yOf = (v) => CH.base - (v / top) * (CH.base - CH.top);
  for (const c of cols) {
    const consumo = c.show.c;
    const cubre = Math.min(consumo, c.show.p);
    const luma = Math.max(0, consumo - c.show.p);
    const x = c.cx - barW / 2;
    const yCubre = yOf(cubre);
    c.placas.setAttribute("d", barPath(x, CH.base, yCubre, luma < 0.5));
    c.luma.setAttribute("d", luma >= 0.5 ? barPath(x, yCubre - 2, Math.min(yCubre - 2, yOf(consumo)), true) : "");
    const sel = c.i === S.mes;
    c.val.setAttribute("y", String(Math.min(yOf(consumo), yOf(c.show.p)) - 6));
    c.val.textContent = sel ? fmt(S.meses[c.i]) : "";
  }
  const yp = yOf(chart.prodShow);
  prodLine.setAttribute("y1", yp.toFixed(1));
  prodLine.setAttribute("y2", yp.toFixed(1));
  prodText.setAttribute("y", (yp + 3.5).toFixed(1));
  prodText.textContent = `${fmt(chart.prod)} kWh`;
}
let chartFrame = 0;
let chartLast = 0;
let visibleChart = false;
function chartTick(now) {
  const dt = chartLast ? Math.min((now - chartLast) / 1000, 1 / 30) : 1 / 60;
  chartLast = now;
  const k = 1 - Math.exp(-dt / 0.3);
  let busy = false;
  const ease = (a, b) => {
    const next = a + (b - a) * k;
    if (Math.abs(b - next) > 0.3) busy = true;
    return Math.abs(b - next) > 0.3 ? next : b;
  };
  chart.topShow = ease(chart.topShow, chart.top);
  chart.prodShow = ease(chart.prodShow, chart.prod);
  for (const c of cols) c.show = { c: ease(c.show.c, S.meses[c.i]), p: ease(c.show.p, chart.prod) };
  renderChart();
  chartFrame = busy ? requestAnimationFrame(chartTick) : 0;
}
function runChart() {
  if (still.matches || !visibleChart) {
    settleChart();
    renderChart();
    return;
  }
  if (!chartFrame) {
    chartLast = 0;
    chartFrame = requestAnimationFrame(chartTick);
  }
}
new IntersectionObserver((entries) => {
  visibleChart = entries[entries.length - 1].isIntersecting;
  if (visibleChart) runChart();
}).observe(chartSvg);

// pasar el puntero, arrastrar y teclado sobre las barras
const showTip = (c) => {
  const consumo = S.meses[c.i];
  const prod = diaPV * 30;
  tip.textContent = "";
  const line = (value, label) => {
    const row = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = value;
    row.append(strong, ` ${label}`);
    tip.appendChild(row);
  };
  const head = document.createElement("div");
  head.textContent = cap(MESES[c.i]);
  tip.appendChild(head);
  line(`${fmt(consumo)} kWh`, "consumo");
  line(`${fmt(Math.min(consumo, prod))} kWh`, "cubren las placas");
  line(`${fmt(Math.max(0, consumo - prod))} kWh`, "de LUMA");
  if (prod > consumo) line(`${fmt(prod - consumo)} kWh`, "sobran y van a LUMA");
  const box = chartSvg.getBoundingClientRect();
  const scale = box.width / CH.W;
  tip.style.left = `${c.cx * scale}px`;
  tip.style.top = `${CH.top * scale}px`;
  tip.hidden = false;
};
let drag = null;
const valueAt = (clientY) => {
  const box = chartSvg.getBoundingClientRect();
  const y = ((clientY - box.top) / box.height) * CH.H;
  const top = chart.frozen ?? chart.top;
  return clamp(Math.round(((CH.base - y) / (CH.base - CH.top)) * top / 10) * 10, D.limites.mes[0], D.limites.mes[1]);
};
for (const c of cols) {
  c.g.addEventListener("pointerenter", () => showTip(c));
  c.g.addEventListener("pointerleave", () => {
    if (!drag) tip.hidden = true;
  });
  c.g.addEventListener("focus", () => {
    if (S.mes !== c.i) selectMonth(c.i);
    showTip(c);
  });
  c.g.addEventListener("blur", () => (tip.hidden = true));
  c.g.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    drag = { c, id: event.pointerId };
    chart.frozen = chart.top;
    chartSvg.setPointerCapture(event.pointerId);
    if (S.mes !== c.i) S.mes = c.i;
    S.meses[c.i] = valueAt(event.clientY);
    recompute();
    showTip(c);
  });
  c.g.addEventListener("keydown", (event) => {
    let next = null;
    const stepKwh = event.shiftKey ? 50 : 10;
    if (event.key === "ArrowUp") S.meses[c.i] = clamp(S.meses[c.i] + stepKwh, D.limites.mes[0], D.limites.mes[1]);
    else if (event.key === "ArrowDown") S.meses[c.i] = clamp(S.meses[c.i] - stepKwh, D.limites.mes[0], D.limites.mes[1]);
    else if (event.key === "ArrowRight") next = (c.i + 1) % 12;
    else if (event.key === "ArrowLeft") next = (c.i + 11) % 12;
    else return;
    event.preventDefault();
    if (next !== null) cols[next].g.focus();
    else {
      recompute();
      showTip(c);
      announce();
    }
  });
}
let dragFrame = 0;
chartSvg.addEventListener("pointermove", (event) => {
  if (!drag || event.pointerId !== drag.id) return;
  const v = valueAt(event.clientY);
  if (v === S.meses[drag.c.i] || dragFrame) return;
  dragFrame = requestAnimationFrame(() => {
    dragFrame = 0;
    S.meses[drag.c.i] = v;
    recompute();
    showTip(drag.c);
  });
});
const endDrag = (event) => {
  if (!drag || event.pointerId !== drag.id) return;
  drag = null;
  chart.frozen = null;
  updateChart();
  tip.hidden = true;
  announce();
};
chartSvg.addEventListener("pointerup", endDrag);
chartSvg.addEventListener("pointercancel", endDrag);

// ---------- bucle de la figura ----------
let hour = D.start;
let target = D.start;
let playing = !still.matches;
let rate = 0.25;
let wait = 1.2;
let scrubbing = false;
let visible = false;
let frame = 0;
let last = 0;
let quiet = 0;
let spin = 0;
const PERIOD = 6;
const phase = {};
const shown = {};

function draw(dt, calm) {
  const s = sample(hour);
  for (const [key, list] of Object.entries(flows)) {
    const v = CHANNEL[D.flows[key]](s);
    const want = smooth(0.03, 0.3, Math.abs(v));
    shown[key] = calm || shown[key] === undefined ? want : shown[key] + (want - shown[key]) * (1 - Math.exp(-dt / 0.2));
    if (!calm) phase[key] = (phase[key] ?? 0) + Math.sign(v) * (5 + 7 * Math.abs(v)) * dt;
    const ph = phase[key] ?? 0;
    const opacity = shown[key].toFixed(3);
    for (const { el, s0 } of list) {
      el.style.strokeDashoffset = ((((s0 - ph) % PERIOD) + PERIOD) % PERIOD).toFixed(2);
      el.style.opacity = opacity;
    }
  }
  const sun = (((document.body.dataset.theme === "dark" ? 0.45 : 0.62) * s.pv) / pvPeak).toFixed(3);
  for (const el of suns) el.style.opacity = sun;
  for (const { el, i } of leds) el.style.opacity = (0.12 + 0.88 * Math.min(1, Math.max(0, s.soc * D.leds - i))).toFixed(3);
  invLed.style.opacity = (0.15 + 0.85 * smooth(0.02, 0.3, s.pv)).toFixed(3);
  if (!calm) spin = (spin + (40 + 150 * s.load) * dt) % 360;
  fan.setAttribute("transform", `rotate(${spin.toFixed(1)})`);
  const text = say(s);
  if (readout.textContent !== text) readout.textContent = text;
  const value = (s.net >= -0.005 ? "+" : "−") + Math.abs(s.net).toFixed(1);
  if (lcd.textContent !== value) lcd.textContent = value;
  const line = explain(hour, true);
  if (nowLine.textContent !== line) nowLine.textContent = line;
  const time = clock(hour);
  if (clockOut.textContent !== time) {
    clockOut.textContent = time;
    scrub.setAttribute("aria-valuetext", time);
  }
  if (!scrubbing) scrub.value = String(((hour % 24) + 24) % 24);
  for (const button of sceneButtons) button.setAttribute("aria-pressed", String(!playing && Math.abs(target - +button.dataset.scene) < 0.01));
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (playing && !calm && !scrubbing) {
    if (wait > 0) wait -= dt;
    else target += rate * dt;
    if (target >= 24) {
      target -= 24;
      hour -= 24;
    }
  }
  // Con el día corriendo la hora sigue al reloj tal cual; un salto (escena, flechas) llega suave.
  hour = calm || scrubbing ? target : hour + (target - hour) * (1 - Math.exp(-dt / (playing ? 0.12 : 0.45)));
  if (Math.abs(target - hour) < 1e-4) hour = target;
  for (const o of moving) {
    if (!stepSpring(o, dt)) moving.delete(o);
    o.apply();
  }
  draw(dt, calm);
  frame = visible && !calm ? requestAnimationFrame(tick) : 0;
}
const run = () => {
  if (!frame && visible && !still.matches) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
};
// Saltar a una hora no cambia si el día corre o está en pausa, como en un reproductor.
const steer = (next) => {
  target = clamp(next, 0, 23.99);
  wait = 0;
  stage.setAttribute("aria-valuenow", target.toFixed(2));
  stage.setAttribute("aria-valuetext", explain(target));
  clearTimeout(quiet);
  quiet = setTimeout(() => (status.textContent = explain(target)), 700);
  if (still.matches || !frame) {
    hour = target;
    draw(0, true);
  }
  run();
};

// ---------- reproductor del día ----------
const playButton = doc("[data-play]");
const clockOut = doc("[data-clock]");
const scrub = doc("[data-scrub]");
const speedButtons = [...document.querySelectorAll("[data-speed]")];
const setPlaying = (on) => {
  playing = on && !still.matches;
  playButton.setAttribute("aria-pressed", String(playing));
  playButton.setAttribute("aria-label", playing ? "Pausar el día" : "Reproducir el día");
  playButton.classList.toggle("is-paused", !playing);
  if (playing) {
    target = hour;
    run();
  }
};
playButton.addEventListener("click", () => setPlaying(!playing));
for (const button of speedButtons) {
  button.addEventListener("click", () => {
    rate = +button.dataset.speed;
    for (const b of speedButtons) b.setAttribute("aria-pressed", String(b === button));
    if (!playing) setPlaying(true);
  });
}
scrub.addEventListener("input", () => {
  scrubbing = true;
  target = hour = clamp(parseFloat(scrub.value), 0, 23.99);
  if (!frame) draw(0, true);
  run();
});
scrub.addEventListener("change", () => {
  scrubbing = false;
  steer(parseFloat(scrub.value));
});

new IntersectionObserver(
  (entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run();
  },
  { rootMargin: "120px 0px" },
).observe(stage);
stage.addEventListener("keydown", (event) => {
  if (event.key === " ") {
    event.preventDefault();
    setPlaying(!playing);
    return;
  }
  const step = event.shiftKey ? 3 : 1;
  const base = target;
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = Math.floor(base + 1e-6) + step;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = Math.ceil(base - 1e-6) - step;
  if (event.key === "Home") to = 0;
  if (event.key === "End") to = 23.5;
  if (to === null) return;
  event.preventDefault();
  steer(to);
});
stage.addEventListener("focus", () => (status.textContent = explain(target)));
for (const button of sceneButtons) button.addEventListener("click", () => steer(+button.dataset.scene));
setPlaying(playing);

// ---------- tema ----------
const setTheme = (theme) => {
  document.body.dataset.theme = theme;
  themeButton.setAttribute("aria-pressed", String(theme === "dark"));
  themeButton.textContent = theme === "dark" ? "Tema claro" : "Tema oscuro";
  if (!frame && samples) draw(0, true);
};
themeButton.addEventListener("click", () => {
  const next = document.body.dataset.theme === "dark" ? "light" : "dark";
  try {
    localStorage.setItem("sr-theme", next);
  } catch {}
  setTheme(next);
});

let saved = null;
try {
  saved = localStorage.getItem("sr-theme");
} catch {}
setTheme(saved === "dark" ? "dark" : "light");
layoutChart();
new ResizeObserver(() => layoutChart()).observe(chartSvg.parentElement);
short.addEventListener("change", layoutChart);
shorter.addEventListener("change", layoutChart);
recompute({ calm: true });
stage.setAttribute("aria-valuetext", explain(target));
draw(0, true);
