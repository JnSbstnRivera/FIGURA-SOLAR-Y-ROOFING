// La casa: lo propio de su página. Las placas, las cajas de fila y los Powerwall que entran y salen, la sombra del
// techo sobre las placas, el sistema que arma el cotizador de LUMA, la ficha, los controles de la pestaña Energía,
// la gráfica de 12 meses y lo que dicen la figura y el lector de pantalla. Va después de live.js (lo común), que
// llama a sus ganchos (ESCENA_VIVA), y termina arrancando la página.
const kw = (watts) => fmt(watts / 1000, 2);

// ---------- partes del dibujo ----------
const suns = $$("[data-sun]");
const leds = $$("[data-led]").map((el) => ({ el, i: +el.dataset.led }));
const invLed = $('[data-part="inv-led"]');
const lcd = $('[data-part="lcd"]');
const fan = $('[data-part="fan"]');
const OUT = axisVector(P, [0, 1, 0]);
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

// ---------- sombras del techo ----------
const PLACAS = D.sombra.placas;
const PISO_PLACAS = Math.min(...PLACAS.flatMap((p) => p.puntos.map((q) => q[2])));
// Lo que tapan las sombras en el techo para un rumbo, unas placas puestas y lo que haya de agua en el techo
// (la cisterna del techo y el calentador): el acceso solar del año (Aurora) y la forma de la producción en el
// día del equinoccio. Con agua en el techo también sale el acceso que habría sin ella, para que la ficha diga
// cuánto baja. Cada acceso calculado se guarda para no repetirlo al poner y quitar cosas.
let techo = { key: "", acceso: 1, sinTecho: 1, perfil: null, porque: "" };
const accesos = new Map();
function sombrasDelTecho() {
  const total = Math.min(capacidad(), S.existentes.n + S.nuevas);
  const base = `${S.rumbo}|${total}|${S.existentes.n}|${S.existentes.w}`;
  // de los productos del plano solo cuenta lo que va en el techo: lo demás no sube más que el vidrio más bajo
  const key = `${base}|${techoClave(S.escogido)}`;
  if (key === techo.key) return techo;
  const az = S.rumbo * GRADO;
  const puestas = PLACAS.slice(0, total);
  const pesos = puestas.map((_, i) => (i < S.existentes.n ? S.existentes.w : D.vatios));
  const suma = pesos.reduce((a, b) => a + b, 0) || 1;
  // solo puede tapar el sol de una placa lo que sube más que el vidrio más bajo
  const tapanCon = (escogidos) => SOLIDOS.filter((k) => k.alto > PISO_PLACAS && activoPara(k.on, total, S.baterias, escogidos));
  const accesoCon = (escogidos) => {
    const k = `${base}|${techoClave(escogidos)}`;
    if (!accesos.has(k)) accesos.set(k, puestas.length ? accesoSolar(puestas, tapanCon(escogidos), az).reduce((a, v, i) => a + v * pesos[i], 0) / suma : 1);
    return accesos.get(k);
  };
  const tapan = tapanCon(S.escogido);
  const acceso = accesoCon(S.escogido);
  const porque = porLoDelTecho(S.escogido);
  const sinTecho = porque ? accesoCon(SIN_NADA) : acceso;
  const perfil = formaDelDia(288, az, BASE.mediodia, (i, s) => (puestas.length ? puestas.reduce((a, p, j) => a + soleado(p, s, tapan) * pesos[j], 0) / suma : 1));
  techo = { key, acceso, sinTecho, perfil, porque };
  return techo;
}
// Lo que ocupa lugares de placas (el calentador) va en los últimos que se llenan, al fondo del techo.
const capacidad = () => D.slots - lugaresOcupados(S.escogido);

// ---------- sistema ----------
// la factura de ejemplo, las placas y las baterías (las que sugiere el cotizador, salvo que se cambien a mano)
Object.assign(S, { meses: [...D.ejemplo.meses], existentes: { ...D.ejemplo.existentes }, nuevas: 0, baterias: 0, manual: false, mes: D.ejemplo.mes });
let factor = 1;
let sug = null;
let samples = null;
let pvPeak = 1;
let shares = { row0: 1, row3: 0, row23: 0, row123: 0 };
let diaPV = 0;
let roofFull = false;
const KEYS = ["pv", "load", "batt", "grid", "soc", "net"];

function sample(hour) {
  const n = samples.pv.length - 1;
  const x = (clamp(hour, 0, 24) / 24) * n;
  const i = Math.min(n - 1, Math.floor(x));
  const f = x - i;
  const out = {};
  for (const key of KEYS) out[key] = samples[key][i] + (samples[key][i + 1] - samples[key][i]) * f;
  return out;
}
// lo que lleva cada conducto de la energía, con signo en el sentido en que se dibujó la ruta
const linkShare = (k) => (S.baterias > k ? (S.baterias - k) / S.baterias : 0);
Object.assign(CHANNEL, {
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
});

// ---------- textos ----------
const toward = (net) => (net >= -0.005 ? "a" : "de");
const batteryText = (s, short) => (S.baterias ? `${short ? "bat." : "batería"} ${Math.round(s.soc * 100)} %` : "sin batería");
// Lo que pasa en este momento, al lado de la hora del reproductor.
const say = (s) =>
  narrow.matches
    ? `${s.pv.toFixed(1)} kW · ${batteryText(s, true)} · ${toward(s.net)} LUMA ${Math.abs(s.net).toFixed(1)} kWh`
    : `placas ${s.pv.toFixed(1)} kW · ${batteryText(s, false)} · ${toward(s.net)} LUMA ${Math.abs(s.net).toFixed(1)} kWh`;
// Lo que pasa a esa hora, para el lector de pantalla (en pantalla lo dice el reproductor).
function explain(h) {
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
  return `${cap(MESES[S.mes])}, ${clock(h)} · ${what}. Placas ${s.pv.toFixed(1)} kW, casa ${s.load.toFixed(1)} kW, ${bat}; ${day}.`;
}

// ---------- ficha ----------
const F = Object.fromEntries([...document.querySelectorAll("[data-f]")].map((el) => [el.dataset.f, el]));
// Los números de la ficha (producción, respaldo y porcentajes) cuentan hasta su valor nuevo
// en vez de saltar; los conteos de placas y baterías cambian al instante.
const ficha = { goal: null, show: null, frame: 0, last: 0 };
// los que se leen con un decimal llegan a su valor con más cuidado
const FINOS = new Set(["dia", "tsrf", "acceso", "menos"]);
function updateFicha() {
  const consumo = S.meses[S.mes];
  const anual = S.meses.reduce((a, b) => a + b, 0);
  const prodMes = diaPV * 30;
  const tof = tofDe(S.rumbo);
  // El TSRF y el acceso solar van con un decimal: así se ve lo que les quita una sombra chica, como la
  // del tanque, que de otro modo se redondea a lo mismo. "menos" es lo que baja el TSRF por lo que hay
  // de agua en el techo (la cisterna del techo y el calentador).
  ficha.goal = {
    prod: prodMes,
    dia: diaPV,
    resp: S.baterias ? respaldoHoras(S.baterias, consumo / 30) : 0,
    mes: consumo > 0 ? (prodMes / consumo) * 100 : 0,
    anio: anual > 0 ? ((prodMes * 12) / anual) * 100 : 0,
    tsrf: tof * techo.acceso * 100,
    acceso: techo.acceso * 100,
    menos: tof * (techo.sinTecho - techo.acceso) * 100,
  };
  const r = rumboDe(S.rumbo);
  F.tanque.hidden = !techo.porque;
  F.porque.textContent = techo.porque;
  if (rumboV) rumboV.textContent = `${r.nombre} · ${r.az}°`;
  if (!ficha.show || still.matches) ficha.show = { ...ficha.goal };
  const watts = S.nuevas * D.vatios + S.existentes.n * S.existentes.w;
  F.kw.textContent = `${kw(watts)} kW`;
  F.placas.textContent = S.existentes.n ? `${S.nuevas} nuevas + ${S.existentes.n} de ${S.existentes.w} W` : `${S.nuevas} de ${D.vatios} W`;
  F.bat.textContent = S.baterias ? `${S.baterias} Powerwall` : "Sin batería";
  F.mesNombre.textContent = cap(MESES[S.mes]);
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
  F.dia.textContent = `${fmt(v.prod * 12)} al año · ${fmt(v.dia, 1)} al día`;
  F.tsrf.textContent = `${fmt(v.tsrf, 1)} %`;
  // si no cabe en un renglón, se parte en el punto: cada número va pegado a su nombre y a su % (espacio sin corte)
  const nb = String.fromCharCode(160);
  F.tof.textContent = `TOF${nb}${fmt(tofDe(S.rumbo) * 100, 1)}${nb}% · acceso${nb}${fmt(v.acceso, 1)}${nb}%`;
  // si no le quita nada (por ejemplo, el calentador al fondo con pocas placas adelante) no lleva el menos
  F.menos.textContent = v.menos >= 0.05 ? `−${fmt(v.menos, 1)}` : "0.0";
  F.respaldo.textContent = S.baterias ? `${fmt(S.baterias * BASE.bateria, 1)} kWh · respaldo ${Math.round(v.resp)} h` : "toda la noche de LUMA";
  F.mes.textContent = consumo > 0 ? `cubre ${Math.round(v.mes)} %` : "—";
  F.mesUsa.textContent = `usa ${fmt(consumo)} kWh${anual > 0 ? ` · el año ${Math.round(v.anio)} %` : ""}`;
}
function fichaTick(now) {
  const dt = ficha.last ? Math.min((now - ficha.last) / 1000, 1 / 30) : 1 / 60;
  ficha.last = now;
  const k = 1 - Math.exp(-dt / 0.45);
  let busy = false;
  for (const key of Object.keys(ficha.goal)) {
    const goal = ficha.goal[key];
    const next = ficha.show[key] + (goal - ficha.show[key]) * k;
    const close = Math.abs(goal - next) < (FINOS.has(key) ? 0.02 : 0.2);
    ficha.show[key] = close ? goal : next;
    if (!close) busy = true;
  }
  renderFicha();
  ficha.frame = busy ? requestAnimationFrame(fichaTick) : 0;
}

// ---------- controles ----------
const mesSelect = doc("[data-mes]");
const mesInput = doc("[data-mes-kwh]");
const todosInput = doc("[data-todos]");
const vatiosInput = doc("[data-vatios]");
const resetButton = doc("[data-reset]");
const warn = doc("[data-warn]");
// placas nuevas y baterías: quien las toca deja lo sugerido
Object.assign(PASOS, {
  nuevas: (d) => {
    S.nuevas += d;
    S.manual = true;
  },
  existentes: (d) => (S.existentes.n += d),
  baterias: (d) => {
    S.baterias += d;
    S.manual = true;
  },
});
function updateControls() {
  const total = S.existentes.n + S.nuevas;
  const cabe = capacidad();
  out.nuevas.textContent = String(S.nuevas);
  out.existentes.textContent = String(S.existentes.n);
  out.baterias.textContent = String(S.baterias);
  pasoEn("nuevas", S.nuevas > 0, total < cabe);
  pasoEn("existentes", S.existentes.n > 0, S.existentes.n < cabe);
  pasoEn("baterias", S.baterias > D.limites.baterias[0], S.baterias < D.limites.baterias[1]);
  resetButton.disabled = !S.manual;
  if (+mesSelect.value !== S.mes) mesSelect.value = String(S.mes);
  if (document.activeElement !== mesInput) mesInput.value = String(S.meses[S.mes]);
  // al lado de "Volver a lo sugerido", primero lo que sugiere el cotizador
  const notes = [S.nuevas === sug.nuevas && S.baterias === sug.baterias ? "Es lo que sugiere el cotizador." : `El cotizador sugiere ${sug.nuevas} nuevas y ${sug.baterias} Powerwall.`];
  if (total === 0) notes.push("Sin placas, toda la energía viene de LUMA.");
  if (S.baterias > 0 && total > 0 && total < BASE.placasConBateria) notes.push(`Con batería, el cotizador pide al menos ${BASE.placasConBateria} placas.`);
  const enLugares = ocupan(S.escogido).map(([p]) => `${p.articulo} ${p.nombre}`).join(" y ");
  if (roofFull) notes.push(cabe < D.slots ? `Con ${enLugares} en el techo caben ${cabe} placas; las que faltan no se dibujan.` : `En este techo caben ${D.slots} placas; las que faltan no se dibujan.`);
  warn.textContent = notes.join(" ");
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
const shortest = matchMedia("(min-width: 1100px) and (max-height: 640px)");
function layoutChart() {
  const width = Math.max(300, Math.round(chartSvg.parentElement.clientWidth));
  const height = shortest.matches ? 98 : shorter.matches ? 110 : short.matches ? 122 : 166;
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

// ---------- el techo: el plan de sellado, el techo de antes y el aguacero ----------
// La pestaña Roofing. El plan de sellado es un producto del plano (productos.mjs); lo demás es de esta casa: cuánto del
// sellado viejo se quita (de 0 a 100 %, de 10 en 10, como en el cotizador), el área que se cotiza, con su mínimo, y el
// aguacero. El dibujo muestra el techo sellado o el de antes. Al escoger un plan desde "Sin", o con "Ver cómo se sella",
// el sellado se aplica por partes, de norte a sur, como en la obra; al cambiar la remoción con un plan puesto se ve un
// momento el techo de antes, con el sellado viejo que se quita.
const TECHO = D.techo;
Object.assign(S, { techo: { remocion: 0, area: TECHO.area, clienteSolar: false, lluvia: false } });
const capasEls = $$('[data-p="sellado:capas"]');
const desnudoEls = $$('[data-p="sellado:sin"]');
const viejos = $$("[data-viejo]").map((el) => ({ el, i: +el.dataset.viejo, x: +el.dataset.x }));
const reparo = $("[data-reparo]");
const REPARO = +reparo.dataset.largo;
const piel = Object.fromEntries($$("[data-piel]").map((el) => [el.dataset.piel, el]));
const ENTERO = [[TECHO.x[0], TECHO.y[0]], [TECHO.x[1], TECHO.y[0]], [TECHO.x[1], TECHO.y[1]], [TECHO.x[0], TECHO.y[1]]];
// las partes del sellado, en orden, con lo que dice el reproductor y cuánto duran (en segundos)
const FASES = [
  { id: "lavado", texto: "limpieza a presión", dur: 2.4 },
  { id: "remocion", texto: "se quita el sellado viejo", dur: 2.4 },
  { id: "grietas", texto: "grietas con Roof Patch", dur: 2 },
  { id: "imprimador", texto: "imprimador Elasto Prime", dur: 3.2 },
  { id: "silicona", texto: "silicona Gardner", dur: 4 },
];
// lo que tarda en secarse el techo después de la limpieza a presión (segundos)
const SECA = 3;
// lo que tarda en pasar de un techo al otro, y lo que se ve el techo de antes al cambiar la remoción (segundos)
const CRUCE = 0.45;
const ANTES = 2.6;
// Las rectificaciones: todo lo del techo que lleva su marca en el dibujo (las placas con sus rieles, sus cajas y sus
// conductos, el aire, el calentador y la cisterna) sube al empezar la obra, para que el sellado pase por debajo, y cada
// cosa baja cuando la silicona ya pasó su punta sur. h: cuánto está arriba, de 0 a 1. Mientras las placas están arriba,
// su conducto se estira desde la abrazadera del borde de la losa (el recorte del tubo que se estira).
const LEVANTA = TECHO.levanta;
const levantan = TECHO.rectifica.map((r) => ({ ...r, els: $$(`[data-rectifica="${r.id}"]`), h: 0, hecho: "", arriba: false }));
const estira = $("[data-estira]");
const ESTIRA = iso(TECHO.estira, P);
// visto: el techo que se ve ("capas" o "sin"); cruce: de 0 a 1, cuánto lleva el paso de uno al otro; obra: el sellado
// que se está aplicando (su tiempo y sus partes); antes: lo que falta de mostrar el techo de antes; vistos: lo escogido
// que se ve (para la sombra); lluvia: el techo sobre el que llueve, o "" si no llueve; enElAire: las sombras que no se
// echan mientras lo que las echa está levantado
const azotea = { plan: S.escogido.sellado, visto: S.escogido.sellado === "sin" ? "sin" : "capas", cruce: 1, obra: null, antes: 0, vistos: S.escogido, lluvia: "", enElAire: new Set() };
const vistosDelTecho = () => (azotea.vistos = azotea.visto === "sin" && hay(S.escogido, "sellado") ? { ...S.escogido, sellado: "sin" } : S.escogido);
const techoQueToca = () => (!hay(S.escogido, "sellado") || azotea.obra || azotea.antes > 0 ? "sin" : "capas");
function empezarObra() {
  if (still.matches || !hay(S.escogido, "sellado")) return;
  // primero se levanta todo lo del techo (las rectificaciones)
  let t0 = 0;
  const fases = [{ id: "rectifica", texto: "se levanta todo lo del techo", dur: 1.6 }, ...FASES.filter((f) => f.id !== "remocion" || S.techo.remocion > 0)].map((f) => {
    const o = { ...f, t0 };
    t0 += f.dur;
    return o;
  });
  azotea.obra = { t: 0, fases, total: t0 };
  azotea.antes = 0;
  run();
}
// cuánto lleva una parte del sellado, de 0 a 1 (1 si esta obra no la lleva), y por dónde va, de norte a sur: `pasa` es
// lo que sigue de largo al llegar al sur (el agua a presión sale entera del techo)
const avance = (id) => {
  const f = azotea.obra.fases.find((q) => q.id === id);
  return f ? clamp((azotea.obra.t - f.t0) / f.dur, 0, 1) : 1;
};
// los segundos desde que terminó una parte (negativo mientras no termina)
const desde = (id) => {
  const f = azotea.obra.fases.find((q) => q.id === id);
  return f ? azotea.obra.t - f.t0 - f.dur : Infinity;
};
// sube pasándose un poco y se asienta arriba, como con el gato
const subeCon = (u) => 1 + 2.3 * (u - 1) ** 3 + 1.3 * (u - 1) ** 2;
const frenteEn = (u, pasa = 0) => TECHO.x[0] + (TECHO.x[1] - TECHO.x[0] + pasa) * smooth(0, 1, u);
// lo de un contorno (x, y) que queda entre dos x, en la cara de arriba del techo, como camino de pantalla
function entre(contorno, desde, hasta) {
  let pts = contorno;
  for (const [c, dentro] of [[desde, (x) => x >= desde], [hasta, (x) => x <= hasta]]) {
    const queda = [];
    pts.forEach((a, i) => {
      const b = pts[(i + 1) % pts.length];
      if (dentro(a[0])) queda.push(a);
      if (dentro(a[0]) !== dentro(b[0])) queda.push([c, a[1] + ((b[1] - a[1]) * (c - a[0])) / (b[0] - a[0])]);
    });
    pts = queda;
  }
  return pts.length > 2 ? pathDe(pts.map(([x, y]) => iso([x, y, TECHO.z], P))) : "";
}
// el borde que avanza: la raya de un contorno en x = c
function bordeEn(contorno, c) {
  const ys = [];
  contorno.forEach((a, i) => {
    const b = contorno[(i + 1) % contorno.length];
    if (a[0] !== b[0] && (a[0] - c) * (b[0] - c) <= 0) ys.push(a[1] + ((b[1] - a[1]) * (c - a[0])) / (b[0] - a[0]));
  });
  if (ys.length < 2) return "";
  const [p, q] = [Math.min(...ys), Math.max(...ys)].map((y) => iso([c, y, TECHO.z], P));
  return `M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}`;
}
const ponD = (el, d) => {
  if (el.__d !== d) el.setAttribute("d", (el.__d = d));
};
const muestraTecho = (els, a) => {
  const o = a > 0.998 ? "" : a.toFixed(3);
  for (const el of els) {
    if (el.__o === o) continue;
    el.__o = o;
    el.style.display = a > 0.002 ? "" : "none";
    el.style.opacity = o;
  }
};
// La obra de cada cuadro: el agua a presión que pasa y deja el techo mojado hasta que se seca, el sellado viejo que se
// despega, la grieta que se cubre con Roof Patch, el imprimador y la silicona que avanzan con su borde encendido y una
// franja fresca detrás. Sin obra, el techo de antes muestra su sellado viejo y su grieta abierta.
reparo.style.strokeDasharray = `${REPARO} ${REPARO}`;
// el ancho de las franjas (el agua a presión y lo fresco), y su degradado, de transparente atrás a lleno en el borde
const FRANJA = 16;
const fresca = Object.fromEntries($$("[data-fresca]").map((el) => [el.dataset.fresca, el]));
function franja(id, atras, borde) {
  const g = fresca[id];
  const k = `${atras.toFixed(1)} ${borde.toFixed(1)}`;
  if (g.__k === k) return;
  g.__k = k;
  const [a, b] = [iso([atras, 0, TECHO.z], P), iso([borde, 0, TECHO.z], P)];
  for (const [n, v] of [["x1", a[0]], ["y1", a[1]], ["x2", b[0]], ["y2", b[1]]]) g.setAttribute(n, v.toFixed(1));
}
function pintaObra() {
  const o = azotea.obra;
  const n = S.techo.remocion / 10;
  const quitado = o ? frenteEn(avance("remocion"), 6) : -Infinity;
  for (const v of viejos) {
    // lo que lleva despegado el parche, de 0 a 1: sube, se agranda y se va
    const q = o && v.i < n ? smooth(v.x - 6, v.x, quitado) : 0;
    const a = ((o || azotea.visto === "sin") && v.i < n ? 1 - q : 0).toFixed(2);
    if (v.el.__o !== a) v.el.style.opacity = v.el.__o = a;
    const t = q > 0 && q < 1 ? `translate(0px,${(-6 * q).toFixed(2)}px) scale(${(1 + 0.35 * q).toFixed(3)})` : "";
    if (v.el.__t !== t) v.el.style.transform = v.el.__t = t;
  }
  const grietas = o ? avance("grietas") : azotea.visto === "capas" ? 1 : 0;
  const tapa = grietas > 0 ? (REPARO * (1 - grietas)).toFixed(1) : "";
  if (reparo.__o !== tapa) {
    reparo.__o = tapa;
    reparo.style.opacity = tapa ? "1" : "0";
    reparo.style.strokeDashoffset = tapa || String(REPARO);
  }
  const lavado = o ? avance("lavado") : 1;
  const c = frenteEn(lavado, FRANJA);
  const lava = lavado > 0 && lavado < 1;
  ponD(piel.lavado, lava ? entre(ENTERO, c - FRANJA, c) : "");
  if (lava) franja("lavado", c - FRANJA, c);
  const seca = o ? smooth(0, SECA, desde("lavado")) : 1;
  ponD(piel.mojado, lavado > 0 && seca < 1 ? entre(ENTERO, -Infinity, c) : "");
  const moja = (1 - seca).toFixed(2);
  if (piel.mojado.__o !== moja) piel.mojado.style.opacity = piel.mojado.__o = moja;
  let borde = "";
  for (const id of ["imprimador", "silicona"]) {
    const contorno = TECHO.capas[id];
    const u = o ? avance(id) : azotea.visto === "capas" ? 1 : 0;
    const cu = frenteEn(u);
    ponD(piel[id], u <= 0 ? "" : u >= 1 ? PIEL_ENTERA[id] : entre(contorno, -Infinity, cu));
    const va = u > 0 && u < 1;
    ponD(piel[`fresca-${id}`], va ? entre(contorno, cu - FRANJA, cu) : "");
    if (va) {
      franja(id, cu - FRANJA, cu);
      borde = bordeEn(contorno, cu);
    }
  }
  ponD(piel.frente, borde);
  ponD(piel.brillo, borde);
}
// Lo que sube en la obra: arriba desde que empieza (se pasa un poco y se asienta) hasta que la silicona pasó por debajo
// de su punta sur (lo que llega hasta el borde sur baja con el final de la silicona). Mientras está arriba no echa su
// sombra (la de abajo ya no es suya).
function levantaTecho() {
  const o = azotea.obra;
  const silicona = o ? frenteEn(avance("silicona")) : 0;
  let cambio = false;
  for (const g of levantan) {
    const pasa = Math.min(g.x[1] + 10, TECHO.x[1]);
    g.h = o ? subeCon(avance("rectifica")) * (1 - smooth(pasa - 12, pasa, silicona)) : 0;
    const d = LEVANTA * g.h;
    const t = g.h > 0.001 ? `translate(${(UP[0] * d).toFixed(2)}px,${(UP[1] * d).toFixed(2)}px)` : "";
    if (t !== g.hecho) {
      g.hecho = t;
      for (const el of g.els) el.style.transform = t;
      // el conducto de las placas se estira lo que suben, desde la abrazadera del borde de la losa
      if (g.id === "placas") {
        const alto = -UP[1] * d;
        estira.setAttribute("x", (ESTIRA[0] - 8).toFixed(2));
        estira.setAttribute("y", (ESTIRA[1] - alto).toFixed(2));
        estira.setAttribute("width", "16");
        estira.setAttribute("height", alto.toFixed(2));
      }
    }
    const arriba = g.h > 0.02;
    if (arriba !== g.arriba) {
      g.arriba = arriba;
      for (const n of g.sombras) (arriba ? azotea.enElAire.add(n) : azotea.enElAire.delete(n));
      cambio = true;
    }
  }
  if (cambio) sombra.version++;
}
// cada capa ya aplicada, entera (no cambia con el zoom: el zoom mueve la vista, no el dibujo)
const PIEL_ENTERA = Object.fromEntries(Object.entries(TECHO.capas).map(([id, contorno]) => [id, entre(contorno, -Infinity, Infinity)]));
function dibujaTecho(dt, calm) {
  if (azotea.obra) {
    azotea.obra.t += calm ? azotea.obra.total : dt;
    if (azotea.obra.t >= azotea.obra.total) azotea.obra = null;
  }
  if (azotea.antes > 0) azotea.antes = calm ? 0 : Math.max(0, azotea.antes - dt);
  const toca = techoQueToca();
  if (toca !== azotea.visto) {
    azotea.visto = toca;
    azotea.cruce = 0;
    vistosDelTecho();
    sombra.version++;
  }
  azotea.cruce = calm ? 1 : Math.min(1, azotea.cruce + dt / CRUCE);
  const capas = azotea.visto === "capas" ? smooth(0, 1, azotea.cruce) : 1 - smooth(0, 1, azotea.cruce);
  muestraTecho(capasEls, capas);
  muestraTecho(desnudoEls, 1 - capas);
  pintaObra();
  levantaTecho();
  // el aguacero, solo en su pestaña: la lluvia sobre la figura (CSS) y lo que hace el agua en el techo que se ve
  const lluvia = S.techo.lluvia && modo === "roofing" ? azotea.visto : "";
  if (lluvia !== azotea.lluvia) {
    azotea.lluvia = lluvia;
    if (lluvia) mainEl.dataset.lluvia = lluvia;
    else delete mainEl.dataset.lluvia;
  }
}
// el agua de la lluvia corre como la energía: con el sellado, a las gárgolas y de ellas al suelo; sin sellar, la gotera
Object.assign(CHANNEL, {
  lluvia: () => (azotea.lluvia === "capas" ? 2.5 : 0),
  gotera: () => (azotea.lluvia === "sin" ? 1.2 : 0),
});
Object.assign(PESTAÑA_CANAL, { lluvia: "roofing", gotera: "roofing" });

// los controles de la pestaña: la remoción con − y +, el área, si ya es cliente solar, cómo se sella y el aguacero
const TQ = Object.fromEntries([...document.querySelectorAll("[data-techo]")].map((el) => [el.dataset.techo, el]));
const areaInput = doc("[data-area]");
const clienteBoton = doc("[data-cliente-solar]");
const sellarBoton = doc("[data-sellar]");
const aguaceroBoton = doc("[data-aguacero]");
PASOS.remocion = (d) => {
  S.techo.remocion = clamp(S.techo.remocion + 10 * d, 0, 100);
  if (hay(S.escogido, "sellado") && !azotea.obra && !still.matches) azotea.antes = ANTES;
};
areaInput.addEventListener("change", () => {
  const v = Math.round(parseFloat(areaInput.value));
  S.techo.area = Number.isFinite(v) ? clamp(v, 100, 20000) : TECHO.area;
  areaInput.value = String(S.techo.area);
  updateTecho();
  announce();
});
clienteBoton.addEventListener("click", () => {
  S.techo.clienteSolar = !S.techo.clienteSolar;
  updateTecho();
  announce();
});
sellarBoton.addEventListener("click", () => empezarObra());
aguaceroBoton.addEventListener("click", () => {
  S.techo.lluvia = !S.techo.lluvia;
  updateTecho();
  run();
  if (!frame) draw(0, true);
  announce();
});
const pies = (v) => `${fmt(v)} ft²`;
const años = (n) => (n === 1 ? "1 año" : `${n} años`);
const dinero = (v) => `$${fmt(v, 2)}`;
// lo que se cotiza: el área, o el mínimo del cotizador (menos si ya es cliente solar de Windmar), y lo que se quita; con
// un plan, su precio como en la pantalla del cotizador: el área por el precio del plan, más la remoción, y de ahí el
// cash (10 % menos, con IVU), lo financiado (con IVU) y su mensualidad a 10 años
const PRECIO = PRODUCTO.sellado.precio;
const PLAZO = 120;
function cotizaTecho() {
  const t = S.techo;
  const minimo = t.clienteSolar ? TECHO.minimo.clienteSolar : TECHO.minimo.estandar;
  const area = Math.max(t.area, minimo);
  const m = modeloDe(S.escogido, "sellado");
  const base = m ? area * m.pie + area * PRECIO.remocion * (t.remocion / 100) : 0;
  const financia = base * (1 + PRECIO.ivu);
  const r = PRECIO.tasas[PLAZO] / 12;
  const mes = (financia * r * (1 + r) ** PLAZO) / ((1 + r) ** PLAZO - 1);
  return { minimo, area, quita: Math.round((area * t.remocion) / 100), cash: base * (1 - PRECIO.cash) * (1 + PRECIO.ivu), financia, mes };
}
// las notas de la pestaña y su ficha: el plan con su garantía, el cash, lo financiado, el mantenimiento y el área
function updateTecho() {
  const t = S.techo;
  const m = modeloDe(S.escogido, "sellado");
  const { minimo, area, quita, cash, financia, mes } = cotizaTecho();
  out.remocion.textContent = `${t.remocion} %`;
  pasoEn("remocion", t.remocion > 0, t.remocion < 100);
  TQ.remocion.textContent = t.remocion ? `Se quita el de ${pies(quita)} de los ${pies(area)} antes de sellar.` : "Sin sellado viejo que quitar: el techo se limpia y se sella.";
  TQ.area.textContent = t.area < minimo ? `El mínimo es ${pies(minimo)}: se cotiza eso (mide ${pies(t.area)}).` : `Se cotizan ${pies(area)}; el mínimo es ${pies(minimo)}${t.clienteSolar ? " por ser cliente solar" : ""}.`;
  TQ.lluvia.textContent = !t.lluvia ? "El aguacero muestra por dónde corre el agua del techo." : m ? "Con el sellado, el agua corre a las gárgolas y cae lejos de la casa." : "Sin sellar, el agua se queda en charcos, se mete por la grieta, gotea por debajo del techo y mancha las paredes.";
  clienteBoton.setAttribute("aria-checked", String(t.clienteSolar));
  aguaceroBoton.setAttribute("aria-checked", String(t.lluvia));
  // con el movimiento reducido no hay obra que ver: el sellado se pone de una vez
  sellarBoton.disabled = !m || still.matches;
  pon("plan", m ? m.nombre : "Sin sellado");
  pon("planDe", m ? `mano de obra ${años(m.obra)}` : "concreto con grietas");
  pon("cash", m ? dinero(cash) : "—");
  pon("cashDe", m ? "10 % menos, con IVU" : "sin plan");
  pon("financia", m ? dinero(financia) : "—");
  pon("financiaDe", m ? `${dinero(mes)}/mes a ${PLAZO / 12} años` : "sin plan");
  pon("limpia", m ? (m.limpiezas ? `${m.limpiezas} limpiezas` : "No incluido") : "—");
  pon("limpiaDe", m ? (m.limpiezas ? "techo y placas, cada 2 años" : "se paga por visita") : "sin plan");
  pon("area", pies(area));
  pon("areaDe", t.remocion ? `remoción ${pies(quita)} (${t.remocion} %)` : t.area < minimo ? "al mínimo del cotizador" : "sin remoción");
}
// lo que dice el reproductor en la pestaña Roofing, y el lector de pantalla
function sayTecho() {
  const o = azotea.obra;
  if (o) {
    const i = Math.max(0, o.fases.findIndex((f) => o.t < f.t0 + f.dur));
    return `sellando ${i + 1} de ${o.fases.length}: ${o.fases[i].texto}`;
  }
  if (azotea.lluvia) return azotea.lluvia === "capas" ? "llueve: el agua corre a las gárgolas" : "llueve: el agua se mete por la grieta";
  if (azotea.antes > 0) return `el techo de antes: ${S.techo.remocion} % de sellado viejo`;
  const m = modeloDe(S.escogido, "sellado");
  return m ? `techo sellado con silicona · plan ${m.nombre}` : "techo sin sellar";
}
function delTecho() {
  const m = modeloDe(S.escogido, "sellado");
  if (!m) return " Techo sin sellar.";
  const { area, cash, financia, mes } = cotizaTecho();
  return ` Techo: plan ${m.nombre}, mano de obra de ${años(m.obra)}${m.limpiezas ? " y limpieza cada 2 años" : ""}, sobre ${fmt(area)} pies cuadrados${S.techo.remocion ? `, quitando el ${S.techo.remocion} % del sellado viejo` : ""}: ${dinero(cash)} en cash, o ${dinero(financia)} financiado, ${dinero(mes)} al mes a ${PLAZO / 12} años.`;
}

// ---------- lo de la casa que llama live.js ----------
let spin = 0;
const ESCENA_VIVA = {
  // lo puesto que tapa el sol: las placas del techo y las baterías
  puestas: () => [S.existentes.n + S.nuevas, S.baterias],
  // el sistema del cotizador con lo que cabe en el techo, y su día con el rumbo y la sombra del techo
  recompute() {
    const cabe = capacidad();
    S.existentes.n = clamp(S.existentes.n, 0, cabe);
    sug = sugerencia(S.meses, S.existentes);
    if (!S.manual) {
      S.nuevas = sug.nuevas;
      S.baterias = sug.baterias;
    }
    roofFull = S.existentes.n + S.nuevas > cabe;
    S.nuevas = clamp(S.nuevas, 0, cabe - S.existentes.n);
    S.baterias = clamp(S.baterias, D.limites.baterias[0], D.limites.baterias[1]);
    // El cotizador da la producción con las placas al sur y sin sombras; el rumbo (PVWatts) y el acceso
    // solar (las sombras del año) la ajustan, y el día sigue al sol de ese rumbo con sus sombras.
    const t = sombrasDelTecho();
    factor = factorRumbo(S.rumbo);
    diaPV = produccionDia({ existentes: S.existentes, nuevas: S.nuevas }) * factor * t.acceso;
    const sim = simulate({ diaPV, baterias: S.baterias, diaCasa: S.meses[S.mes] / 30, perfil: t.perfil });
    samples = Object.fromEntries(KEYS.map((key) => [key, sim.rows.map((row) => row[key])]));
    pvPeak = sim.pico || 1;
    const total = S.existentes.n + S.nuevas;
    const watts = (i) => (i < S.existentes.n ? S.existentes.w : D.vatios);
    const inRow = [0, 0, 0, 0];
    for (let i = 0; i < total; i++) inRow[Math.floor(i / D.cols)] += watts(i);
    const sum = inRow.reduce((a, b) => a + b, 0) || 1;
    shares = { row0: inRow[0] / sum, row3: inRow[3] / sum, row23: (inRow[2] + inRow[3]) / sum, row123: (inRow[1] + inRow[2] + inRow[3]) / sum };
  },
  // las placas entran de una en una (y las que se quitan salen al revés), las cajas de fila y las baterías
  targets() {
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
    // un plan de sellado escogido desde "Sin" se aplica por partes; sin plan, la obra se deja
    if (azotea.plan === "sin" && hay(S.escogido, "sellado")) empezarObra();
    if (!hay(S.escogido, "sellado")) azotea.obra = null;
    azotea.plan = S.escogido.sellado;
    vistosDelTecho();
  },
  // la ficha, los controles de Energía, la gráfica y lo del techo (lo que ocupa lugares de placas lo dice la nota del
  // calentador)
  actualiza() {
    updateFicha();
    updateControls();
    updateChart();
    updateTecho();
  },
  muestra: (hour) => sample(hour),
  // lo escogido que se ve: mientras se sella, o un momento al cambiar la remoción, el techo de antes
  vistos: () => azotea.vistos,
  // las sombras que no se echan: las de lo que está levantado mientras se sella
  enElAire: (n) => azotea.enElAire.has(n),
  // el vidrio de las placas con el sol, las luces de las baterías y del inversor, el ventilador del aire (más rápido
  // cuanto más usa la casa), el medidor de LUMA y el techo (su obra y el aguacero)
  dibuja(s, hora, dt, calm) {
    dibujaTecho(dt, calm);
    const sun = (((document.body.dataset.theme === "dark" ? 0.45 : 0.62) * s.pv) / pvPeak).toFixed(3);
    for (const el of suns) el.style.opacity = sun;
    for (const { el, i } of leds) el.style.opacity = (0.12 + 0.88 * Math.min(1, Math.max(0, s.soc * D.leds - i))).toFixed(3);
    invLed.style.opacity = (0.15 + 0.85 * smooth(0.02, 0.3, s.pv)).toFixed(3);
    if (!calm) spin = (spin + (40 + 150 * s.load) * dt) % 360;
    fan.setAttribute("transform", `rotate(${spin.toFixed(1)})`);
    const value = (s.net >= -0.005 ? "+" : "−") + Math.abs(s.net).toFixed(1);
    if (lcd.textContent !== value) lcd.textContent = value;
  },
  dice: (s) => (modo === "roofing" ? sayTecho() : say(s)),
  explica: (h) => explain(h),
  anuncia() {
    const g = ficha.goal;
    const enTecho = techo.porque ? `, con agua en el techo: TSRF ${fmt(g.tsrf, 1)} %, ${fmt(g.menos, 1)} menos${techo.porque}, y acceso solar ${fmt(g.acceso, 1)} %` : `: TSRF ${fmt(g.tsrf, 1)} %`;
    return `${S.nuevas} placas nuevas de ${D.vatios} W, ${S.existentes.n} que ya tenía de ${S.existentes.w} W, ${S.baterias} Powerwall, mirando al ${rumboDe(S.rumbo).nombre.toLowerCase()}${enTecho}. ${F.mesNombre.textContent}: ${F.mes.textContent}. En el año: cubre ${Math.round(g.anio)} %.${delAgua()}${delAnker()}${delTecho()}`;
  },
  // la gráfica se dibuja al ancho de su columna, y se achata en ventanas bajas
  arranca() {
    layoutChart();
    new ResizeObserver(() => layoutChart()).observe(chartSvg.parentElement);
    short.addEventListener("change", layoutChart);
    shorter.addEventListener("change", layoutChart);
    shortest.addEventListener("change", layoutChart);
  },
};
arrancar();
