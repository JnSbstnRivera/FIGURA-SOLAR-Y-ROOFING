
const D = __DATA__;
const P = D.P;
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const status = document.querySelector("[data-status]");
const nowLine = document.querySelector("[data-now]");
const bill = document.querySelector("[data-bill]");
const systemOut = document.querySelector("[data-system]");
const themeButton = document.querySelector("[data-theme-toggle]");
const sceneButtons = [...document.querySelectorAll("[data-scene]")];
const still = matchMedia("(prefers-reduced-motion: reduce)");
const narrow = matchMedia("(max-width: 560px)");
const $ = (s) => svg.querySelector(s);
const $$ = (s) => [...svg.querySelectorAll(s)];

const flows = {};
for (const el of $$("[data-flow]")) (flows[el.dataset.flow] ??= []).push({ el, s0: +el.dataset.s0 });
const slots = $$("[data-slot]").map((el) => ({ el, i: +el.dataset.slot }));
const rowParts = $$("[data-rows]").map((el) => ({ el, need: +el.dataset.rows }));
const secondBattery = $$("[data-bat]");
const suns = $$("[data-sun]");
const leds = $$("[data-led]").map((el) => ({ el, i: +el.dataset.led }));
const invLed = $('[data-part="inv-led"]');
const needle = $('[data-part="needle"]');
const lcd = $('[data-part="lcd"]');
const fan = $('[data-part="fan"]');

// ---------- sistema según la factura ----------
let system = null;
let samples = null;
let shares = null;
let pvPeak = 1;
const KEYS = ["pv", "load", "batt", "grid", "soc", "net"];
function setSystem(next) {
  system = next;
  const sim = simulate(system);
  samples = Object.fromEntries(KEYS.map((key) => [key, sim.rows.map((row) => row[key])]));
  pvPeak = sim.pico;
  const total = system.placas;
  const inRow = (row) => Math.max(0, Math.min(D.cols, total - row * D.cols));
  shares = { row0: inRow(0) / total, row3: inRow(3) / total, row23: (inRow(2) + inRow(3)) / total, row123: (inRow(1) + inRow(2) + inRow(3)) / total };
  const rows = Math.ceil(total / D.cols);
  for (const { el, i } of slots) el.style.display = i < total ? "" : "none";
  for (const { el, need } of rowParts) el.style.display = rows >= need ? "" : "none";
  for (const el of secondBattery) el.style.display = system.baterias >= 2 ? "" : "none";
  systemOut.textContent = `${total} placas · ${system.kwp.toFixed(2)} kW · ${system.baterias} Powerwall`;
}
function sample(hour) {
  const n = samples.pv.length - 1;
  const x = (Math.min(24, Math.max(0, hour)) / 24) * n;
  const i = Math.min(n - 1, Math.floor(x));
  const f = x - i;
  const out = {};
  for (const key of KEYS) out[key] = samples[key][i] + (samples[key][i + 1] - samples[key][i]) * f;
  return out;
}
// lo que lleva cada conducto, con signo en el sentido en que se dibujó la ruta
const CHANNEL = {
  pv: (s) => s.pv,
  row0: (s) => s.pv * shares.row0,
  row3: (s) => s.pv * shares.row3,
  row23: (s) => s.pv * shares.row23,
  row123: (s) => s.pv * shares.row123,
  bat: (s) => s.batt,
  bat2: (s) => s.batt / 2,
  ac: (s) => s.pv - s.batt,
  casa: (s) => s.load,
  red: (s) => s.grid,
};
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ---------- textos ----------
const angleOf = (hour) => D.dial.aNoon + ((hour - 12) / 24) * Math.PI * 2;
const needleAt = (hour) => {
  const a = angleOf(hour);
  const [cx, cy] = D.dial.c;
  const r = D.dial.r - 3.2;
  return lineOnTop([cx - Math.sin(a) * 2.6, cy + Math.cos(a) * 2.6], [cx + Math.sin(a) * r, cy - Math.cos(a) * r], D.dial.top + 0.2, P);
};
const clock = (h) => {
  const m = Math.round((((h % 24) + 24) % 24) * 60) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
const toward = (net) => (net >= -0.005 ? "a" : "de");
const say = (h, s) =>
  narrow.matches
    ? `${clock(h)} · ${s.pv.toFixed(1)} kW · bat. ${Math.round(s.soc * 100)} % · ${toward(s.net)} LUMA ${Math.abs(s.net).toFixed(1)} kWh`
    : `${clock(h)} · placas ${s.pv.toFixed(1)} kW · batería ${Math.round(s.soc * 100)} % · ${toward(s.net)} LUMA ${Math.abs(s.net).toFixed(1)} kWh`;
function explain(h) {
  const s = sample(h);
  const soc = Math.round(s.soc * 100);
  let what;
  if (s.batt > 0.05 && s.grid > 0.05) what = "las placas cubren la casa, cargan la batería y el resto sale a LUMA";
  else if (s.batt > 0.05) what = "las placas cubren la casa y cargan la batería";
  else if (s.grid > 0.05) what = "las placas cubren la casa; con la batería llena, el sobrante sale a LUMA";
  else if (s.batt < -0.05) what = s.pv > 0.05 ? "las placas ya no alcanzan y la batería completa lo que falta" : "no hay sol: la batería alimenta la casa";
  else if (s.grid < -0.05) what = s.pv > 0.05 ? "la batería está en su reserva; las placas y LUMA alimentan la casa" : "la batería llegó a su reserva y la casa toma de LUMA";
  else what = "las placas cubren justo lo que usa la casa";
  const day = `${s.net >= -0.005 ? "enviados a" : "tomados de"} LUMA en el día: ${Math.abs(s.net).toFixed(1)} kWh`;
  return `${clock(h)} · ${what}. Placas ${s.pv.toFixed(1)} kW, casa ${s.load.toFixed(1)} kW, batería ${soc} %; ${day}.`;
}

// ---------- bucle ----------
let hour = D.start;
let target = D.start;
let touring = !still.matches;
let wait = 1.4;
let visible = false;
let frame = 0;
let last = 0;
let idle = 0;
let quiet = 0;
let spin = 0;
const RATE = 0.8;
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
  needle.setAttribute("d", needleAt(hour));
  const text = say(hour, s);
  if (readout.textContent !== text) readout.textContent = text;
  const value = (s.net >= -0.005 ? "+" : "−") + Math.abs(s.net).toFixed(1);
  if (lcd.textContent !== value) lcd.textContent = value;
  const line = explain(hour);
  if (nowLine.textContent !== line) nowLine.textContent = line;
  for (const button of sceneButtons) button.setAttribute("aria-pressed", String(!touring && Math.abs(target - +button.dataset.scene) < 0.01));
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring && !calm) {
    if (wait > 0) wait -= dt;
    else target += RATE * dt;
    if (target >= 24) {
      target -= 24;
      hour -= 24;
    }
  }
  hour = calm ? target : hour + (target - hour) * (1 - Math.exp(-dt / 0.22));
  if (Math.abs(target - hour) < 1e-4) hour = target;
  draw(dt, calm);
  frame = visible && !calm ? requestAnimationFrame(tick) : 0;
}
const run = () => {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
};
const steer = (next, hold = 3600) => {
  touring = false;
  target = Math.min(23.99, Math.max(0, next));
  stage.setAttribute("aria-valuenow", target.toFixed(2));
  stage.setAttribute("aria-valuetext", explain(target));
  clearTimeout(idle);
  idle = setTimeout(() => {
    touring = !still.matches;
    wait = 0;
    run();
  }, hold);
  clearTimeout(quiet);
  quiet = setTimeout(() => (status.textContent = explain(target)), 700);
  if (still.matches) {
    hour = target;
    draw(0, true);
  }
  run();
};

new IntersectionObserver(
  (entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run();
  },
  { rootMargin: "120px 0px" },
).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  steer(Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)) * 24);
});
stage.addEventListener("pointerleave", () => steer(target));
stage.addEventListener("keydown", (event) => {
  const step = event.shiftKey ? 3 : 1;
  const base = touring ? hour : target;
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
for (const button of sceneButtons) button.addEventListener("click", () => steer(+button.dataset.scene, 12000));

// ---------- tema ----------
const setTheme = (theme) => {
  document.body.dataset.theme = theme;
  themeButton.setAttribute("aria-pressed", String(theme === "dark"));
  themeButton.textContent = theme === "dark" ? "Tema claro" : "Tema oscuro";
  if (!frame) draw(0, true);
};
themeButton.addEventListener("click", () => {
  const next = document.body.dataset.theme === "dark" ? "light" : "dark";
  try {
    localStorage.setItem("sr-theme", next);
  } catch {}
  setTheme(next);
});

// ---------- factura ----------
const clampTo = ([low, high], value, fallback) => (Number.isFinite(value) ? Math.min(high, Math.max(low, value)) : fallback);
let billTimer = 0;
const readBill = (write) => {
  const promedio = clampTo(D.limites.promedio, parseFloat(bill.promedio.value), D.ejemplo.promedio);
  const pico = clampTo(D.limites.pico, parseFloat(bill.pico.value), D.ejemplo.pico);
  if (write) {
    bill.promedio.value = String(promedio);
    bill.pico.value = String(pico);
  }
  const next = sistemaPara({ promedio, pico });
  setSystem(next);
  status.textContent = `${next.placas} placas de 410 W, ${next.kwp.toFixed(2)} kW, ${next.baterias} Powerwall para ${promedio} kWh al mes con pico de ${pico}.`;
  stage.setAttribute("aria-valuetext", explain(target));
  if (!frame) draw(0, true);
};
bill.addEventListener("input", () => {
  clearTimeout(billTimer);
  billTimer = setTimeout(() => readBill(false), 250);
});
bill.addEventListener("change", () => readBill(true));
bill.addEventListener("submit", (event) => {
  event.preventDefault();
  readBill(true);
});

let saved = null;
try {
  saved = localStorage.getItem("sr-theme");
} catch {}
setSystem(sistemaPara(D.ejemplo));
setTheme(saved === "dark" ? "dark" : "light");
stage.setAttribute("aria-valuetext", explain(target));
draw(0, true);
