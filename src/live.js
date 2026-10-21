
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
// Lo del agua (la cisterna, los colectores y el tanque del calentador, la bomba y el presurizado) baja a su
// lugar como las placas cuando se escoge, y sube y se va cuando se quita.
function bajan(els, quiere) {
  const g = { els, quiere, p: 0, v: 0, target: -1, wait: 0 };
  g.apply = () => {
    const out = g.p <= 0.002 && g.target <= 0;
    showAll(g.els, !out);
    if (out) return;
    const p = Math.min(1, g.p);
    shift(g.els, UP, (1 - p) * 30);
    for (const el of g.els) el.style.opacity = smooth(0, 0.45, p).toFixed(3);
  };
  return g;
}
const AG = D.agua;
const aguaGroups = [
  ...AG.cisternas.map((c) => bajan($$(`[data-cis="${c.id}"]`), (a) => a.cisterna === c.id)),
  ...[0, 1, 2, 3].map((j) => bajan($$(`[data-cal="${j}"]`), (a) => j < colectoresDe(a))),
  ...AG.calentadores.map((c) => bajan($$(`[data-caltanque="${c.id}"]`), (a) => a.calentador === c.id)),
  bajan($$("[data-bomba]"), (a) => a.cisterna !== "sin"),
  ...["6", "40"].map((gal) => bajan($$(`[data-pres="${gal}"]`), (a) => presurizadoDe(a) === gal)),
];
const calentadorDe = (a) => AG.calentadores.find((c) => c.id === a.calentador) ?? null;
const cisternaDe = (a) => AG.cisternas.find((c) => c.id === a.cisterna) ?? null;
const colectoresDe = (a) => calentadorDe(a)?.colectores ?? 0;
const lugaresDe = (a) => calentadorDe(a)?.lugares ?? 0;
const presurizadoDe = (a) => (a.cisterna === "sin" ? null : a.cisterna === "150" ? "6" : "40");
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

// ---------- sol, luna y sombras ----------
const SVGNS = "http://www.w3.org/2000/svg";
const O0 = iso([0, 0, 0], P);
// El vector en pantalla de una dirección del mundo (la proyección es lineal fuera del origen).
const pantalla = (v) => {
  const q = iso(v, P);
  return [q[0] - O0[0], q[1] - O0[1]];
};
const areaDe = (p) => {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[(i + 1) % p.length];
    a += p[i][0] * q[1] - q[0] * p[i][1];
  }
  return a / 2;
};
const SOLIDOS = D.sombra.solidos.map((s) => {
  const k = solido(s.a, s.b, { id: s.id, n: s.n, on: s.on });
  k.iso = k.v.map((v) => iso(v, P));
  k.alto = Math.max(...k.v.map((v) => v[2]));
  return k;
});
const RECEPTORES = D.sombra.receptores.map((r) => ({
  ...r,
  el: svg.querySelector(`[data-sh="${r.id}"]`),
  caras: r.caras.map((f) => ({ ...f, p: areaDe(f.p) < 0 ? [...f.p].reverse() : f.p })),
  pool: [],
}));
const TUBOS = D.sombra.tubos.map((t, i) => ({ ...t, el: svg.querySelector(`[data-tubo="${i}"]`), sh: 0 }));
const PLACAS = D.sombra.placas;
const PISO_PLACAS = Math.min(...PLACAS.flatMap((p) => p.puntos.map((q) => q[2])));

// Envoltura convexa (cadena monótona), en el sentido positivo.
function casco(puntos) {
  const q = puntos.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const giro = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const abajo = [];
  for (const p of q) {
    while (abajo.length >= 2 && giro(abajo[abajo.length - 2], abajo[abajo.length - 1], p) <= 0) abajo.pop();
    abajo.push(p);
  }
  const arriba = [];
  for (let i = q.length - 1; i >= 0; i--) {
    while (arriba.length >= 2 && giro(arriba[arriba.length - 2], arriba[arriba.length - 1], q[i]) <= 0) arriba.pop();
    arriba.push(q[i]);
  }
  abajo.pop();
  arriba.pop();
  return abajo.concat(arriba);
}
// Recorta un polígono por otro convexo (Sutherland–Hodgman), los dos en pantalla.
function recorta(sujeto, borde) {
  let out = sujeto;
  for (let i = 0; i < borde.length && out.length; i++) {
    const a = borde[i];
    const b = borde[(i + 1) % borde.length];
    const lado = (p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    const entra = out;
    out = [];
    for (let j = 0; j < entra.length; j++) {
      const p = entra[j];
      const q = entra[(j + 1) % entra.length];
      const lp = lado(p);
      const lq = lado(q);
      if (lp >= 0) out.push(p);
      if (lp >= 0 !== lq >= 0) {
        const t = lp / (lp - lq);
        out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      }
    }
  }
  return out;
}
// La sombra de un sólido sobre el plano de una cara: la parte del sólido delante del plano, llevada
// por el rayo del sol hasta el plano. Se trabaja en pantalla, donde la proyección es lineal.
function sombraDe(K, f, ns, Ss) {
  const d = K.v.map((v) => v[0] * f.n[0] + v[1] * f.n[1] + v[2] * f.n[2] - f.c);
  if (!d.some((x) => x > 0.02)) return null;
  const pts = [];
  d.forEach((x, i) => {
    if (x >= 0) pts.push([K.iso[i][0] - (x / ns) * Ss[0], K.iso[i][1] - (x / ns) * Ss[1]]);
  });
  for (const [i, j] of K.e) {
    if (d[i] > 0 !== d[j] > 0 && d[i] !== d[j]) {
      const t = d[i] / (d[i] - d[j]);
      pts.push([K.iso[i][0] + (K.iso[j][0] - K.iso[i][0]) * t, K.iso[i][1] + (K.iso[j][1] - K.iso[i][1]) * t]);
    }
  }
  if (pts.length < 3) return null;
  const h = casco(pts);
  return h.length >= 3 ? h : null;
}
// Una placa, una batería, una caja de fila o una pieza del agua solo tapan el sol si están puestas.
function activoPara(on, total, baterias, agua) {
  if (!on) return true;
  const [tipo, n] = on.split(":");
  if (tipo === "slot") return +n < total;
  if (tipo === "bat") return +n <= baterias;
  if (tipo === "rows") return Math.ceil(total / D.cols) >= +n;
  if (tipo === "cis") return agua.cisterna === n;
  if (tipo === "cal") return +n < colectoresDe(agua);
  if (tipo === "caltanque") return agua.calentador === n;
  if (tipo === "bomba") return agua.cisterna !== "sin";
  if (tipo === "pres") return presurizadoDe(agua) === n;
  return true;
}
const activo = (on) => activoPara(on, S.existentes.n + S.nuevas, S.baterias, S.agua);
const pathDe = (poly) => `M${poly.map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join("L")}Z`;
// Cada pieza pinta su sombra con pocos trazos: las partes con la misma fuerza van juntas en uno, así
// dos caras a la sombra que se tocan no muestran una línea clara entre ellas.
function pintaSombra(r, grupos, fuerza) {
  let i = 0;
  for (const [alpha, d] of grupos) {
    let el = r.pool[i];
    if (!el) {
      el = document.createElementNS(SVGNS, "path");
      r.el.appendChild(el);
      r.pool.push(el);
    }
    if (el.__d !== d) {
      el.setAttribute("d", d);
      el.__d = d;
    }
    const op = (alpha * fuerza).toFixed(3);
    if (el.__o !== op) {
      el.setAttribute("opacity", op);
      el.__o = op;
    }
    i++;
  }
  for (; i < r.pool.length; i++) {
    if (r.pool[i].__d) {
      r.pool[i].setAttribute("d", "");
      r.pool[i].__d = "";
    }
  }
}
const sombra = { firma: "", fuerza: 0.4, version: 0, hay: false };
const leerFuerza = () => {
  sombra.fuerza = parseFloat(getComputedStyle(svg).getPropertyValue("--sr-sombra-a")) || 0.4;
  sombra.firma = "";
};
// Las sombras de este momento: `s` es la dirección del sol en coordenadas de la casa y `cuanto`
// (0 a 1) su fuerza, que crece al salir el sol y se apaga al ponerse.
function sombras(s, cuanto) {
  const firma = `${s[0].toFixed(4)},${s[1].toFixed(4)},${s[2].toFixed(4)}|${cuanto.toFixed(3)}|${sombra.version}|${sombra.fuerza}`;
  if (firma === sombra.firma) return;
  sombra.firma = firma;
  if (cuanto <= 0.001) {
    if (sombra.hay) {
      for (const r of RECEPTORES) if (r.el) pintaSombra(r, new Map(), 0);
      for (const t of TUBOS) {
        if (t.el && t.sh) {
          t.el.style.setProperty("--sh", "0");
          t.sh = 0;
        }
      }
      sombra.hay = false;
    }
    return;
  }
  sombra.hay = true;
  const Ss = pantalla(s);
  const activos = SOLIDOS.filter((k) => activo(k.on));
  for (const r of RECEPTORES) {
    if (!r.el || !activo(r.on)) continue;
    const grupos = new Map();
    const agrega = (alpha, poly) => {
      if (alpha < 0.004 || poly.length < 3) return;
      const key = Math.round(alpha * 100) / 100;
      grupos.set(key, (grupos.get(key) ?? "") + pathDe(poly));
    };
    for (const f of r.caras) {
      const ns = f.n[0] * s[0] + f.n[1] * s[1] + f.n[2] * s[2];
      // una cara se oscurece a medida que el sol le pega de lado y queda a la sombra de espaldas a él
      const luz = Math.min(1, Math.max(0, ns / 0.12));
      agrega(cuanto * (1 - luz), f.p);
      if (luz <= 0 || ns < 0.03) continue;
      for (const K of activos) {
        if (r.propios.includes(K.id)) continue;
        const dc = f.n[0] * K.c[0] + f.n[1] * K.c[1] + f.n[2] * K.c[2] - f.c;
        if (dc < -K.r) continue;
        const t = dc / ns;
        const px = K.c[0] - t * s[0] - f.m[0];
        const py = K.c[1] - t * s[1] - f.m[1];
        const pz = K.c[2] - t * s[2] - f.m[2];
        const lim = f.rr + K.r / ns;
        if (px * px + py * py + pz * pz > lim * lim) continue;
        const h = sombraDe(K, f, ns, Ss);
        if (!h) continue;
        const c = recorta(h, f.p);
        if (c.length >= 3 && Math.abs(areaDe(c)) > 0.02) agrega(cuanto * luz, c);
      }
    }
    pintaSombra(r, grupos, sombra.fuerza);
  }
  // los tubos se oscurecen enteros, según cuántos de sus puntos de muestra quedan a la sombra
  for (const t of TUBOS) {
    if (!t.el || t.el.style.display === "none") continue;
    let tapados = 0;
    for (const p of t.p) {
      for (const K of activos) {
        if (K.id !== t.propio && tapa(p, s, K)) {
          tapados++;
          break;
        }
      }
    }
    const v = (cuanto * tapados) / t.p.length;
    if (Math.abs(v - t.sh) > 0.004) {
      t.el.style.setProperty("--sh", v.toFixed(3));
      t.sh = v;
    }
  }
}

// Lo que tapan las sombras en el techo para un rumbo, unas placas puestas y lo que haya de agua en el techo
// (la cisterna del techo y el calentador): el acceso solar del año (Aurora) y la forma de la producción en el
// día del equinoccio. Con agua en el techo también sale el acceso que habría sin ella, para que la ficha diga
// cuánto baja. Cada acceso calculado se guarda para no repetirlo al poner y quitar cosas.
let techo = { key: "", acceso: 1, sinAgua: 1, perfil: null, porque: "" };
const accesos = new Map();
const SIN_AGUA = { personas: 0, calentador: "sin", cisterna: "sin", cortado: false };
// solo cuenta lo que sube más que el vidrio más bajo: la cisterna del techo y el calentador
const aguaEnTecho = (a) => `${cisternaDe(a)?.techo ? a.cisterna : "sin"}|${a.calentador}`;
function sombrasDelTecho() {
  const total = Math.min(capacidad(), S.existentes.n + S.nuevas);
  const base = `${S.rumbo}|${total}|${S.existentes.n}|${S.existentes.w}`;
  const key = `${base}|${aguaEnTecho(S.agua)}`;
  if (key === techo.key) return techo;
  const az = S.rumbo * GRADO;
  const puestas = PLACAS.slice(0, total);
  const pesos = puestas.map((_, i) => (i < S.existentes.n ? S.existentes.w : D.vatios));
  const suma = pesos.reduce((a, b) => a + b, 0) || 1;
  // solo puede tapar el sol de una placa lo que sube más que el vidrio más bajo
  const tapanCon = (agua) => SOLIDOS.filter((k) => k.alto > PISO_PLACAS && activoPara(k.on, total, S.baterias, agua));
  const accesoCon = (agua) => {
    const k = `${base}|${aguaEnTecho(agua)}`;
    if (!accesos.has(k)) accesos.set(k, puestas.length ? accesoSolar(puestas, tapanCon(agua), az).reduce((a, v, i) => a + v * pesos[i], 0) / suma : 1);
    return accesos.get(k);
  };
  const tapan = tapanCon(S.agua);
  const acceso = accesoCon(S.agua);
  const [enTecho, cal] = aguaEnTecho(S.agua).split("|").map((v) => v !== "sin");
  const sinAgua = enTecho || cal ? accesoCon(SIN_AGUA) : acceso;
  const porque = enTecho && cal ? " por cisterna y calentador" : enTecho ? " por la cisterna" : cal ? " por el calentador" : "";
  const perfil = formaDelDia(288, az, BASE.mediodia, (i, s) => (puestas.length ? puestas.reduce((a, p, j) => a + soleado(p, s, tapan) * pesos[j], 0) / suma : 1));
  techo = { key, acceso, sinAgua, perfil, porque };
  return techo;
}
// El calentador ocupa lugares de placas: los últimos que se llenan, al fondo del techo.
const capacidad = () => D.slots - lugaresDe(S.agua);

// ---------- cielo ----------
// El sol y la luna dan la vuelta por fuera de la maqueta: cada uno va en la dirección de pantalla de su
// dirección real (de donde viene su luz), justo afuera del contorno, así nunca pasan por detrás de la casa
// y las sombras caen del lado contrario. Si el reproductor flota sobre ese lugar, suben por encima de él.
const solEl = svg.querySelector("[data-sol]");
const solHaloEl = svg.querySelector("[data-sol-halo]");
const haloEl = svg.querySelector("[data-halo]");
const lunaEl = svg.querySelector("[data-luna]");
const lunaHaloEl = svg.querySelector("[data-luna-halo]");
const rayosEl = svg.querySelector('[data-part="rayos"]');
const playerEl = doc(".sr-player");
const mainEl = doc(".sr-main");
const CIELO = D.cielo;
// Por dónde sale del contorno (convexo, con el centro adentro) un rayo que parte del centro hacia u.
function salida(u) {
  const [cx, cy] = CIELO.centro;
  const poly = CIELO.contorno;
  let t = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const den = u[0] * ey - u[1] * ex;
    if (Math.abs(den) < 1e-9) continue;
    const wx = a[0] - cx;
    const wy = a[1] - cy;
    const ti = (wx * ey - wy * ex) / den;
    const si = (wx * u[1] - wy * u[0]) / den;
    if (ti > 0 && si >= -1e-6 && si <= 1 + 1e-6 && ti < t) t = ti;
  }
  return Number.isFinite(t) ? t : 0;
}
// Lo que se ve del dibujo, en sus coordenadas: en una tarjeta más ancha (o más alta) que el dibujo sobra
// lugar a los lados, y ahí también pueden ir el sol y la luna. Y el reproductor, cuando flota encima.
let vista = { x0: 0, y0: 0, x1: CIELO.w, y1: CIELO.h };
let sobreReproductor = null;
function medirVista() {
  const m = svg.getScreenCTM();
  const s = svg.getBoundingClientRect();
  if (!m || !s.width) return;
  const inv = m.inverse();
  const enDibujo = (r) => {
    const a = new DOMPoint(r.left, r.top).matrixTransform(inv);
    const b = new DOMPoint(r.right, r.bottom).matrixTransform(inv);
    return { x0: a.x, y0: a.y, x1: b.x, y1: b.y };
  };
  vista = enDibujo(s);
  const z = enDibujo(playerEl.getBoundingClientRect());
  sobreReproductor = z.x1 > vista.x0 && z.x0 < vista.x1 && z.y1 > vista.y0 && z.y0 < vista.y1 ? z : null;
}
// ¿El punto cae dentro del contorno de la maqueta?
function adentro([x, y]) {
  const poly = CIELO.contorno;
  let signo = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const s = Math.sign((b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]));
    if (s && signo && s !== signo) return false;
    if (s) signo = s;
  }
  return true;
}
// Cuánto le falta al punto para salir del contorno (0 si ya está afuera, o lo lejos que queda de él).
function aContorno(p) {
  const poly = CIELO.contorno;
  let d = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const t = clamp(((p[0] - a[0]) * ex + (p[1] - a[1]) * ey) / (ex * ex + ey * ey || 1), 0, 1);
    d = Math.min(d, Math.hypot(p[0] - a[0] - t * ex, p[1] - a[1] - t * ey));
  }
  return adentro(p) ? -d : d;
}
// `radio` es todo lo que ocupa (el sol, con su corona) y `disco`, el disco. Si afuera de la maqueta no hay
// lugar dentro del dibujo (la esquina de atrás del techo casi toca el borde de arriba), asoma a medias por
// el borde, como un sol que se sale del cuadro, en vez de montarse sobre la casa.
function enCielo(pos, rumbo, radio, disco = radio) {
  const d = pantalla(haciaCasa(pos, rumbo));
  const L = Math.hypot(d[0], d[1]) || 1;
  const u = [d[0] / L, d[1] / L];
  const t = salida(u) + CIELO.margen + radio;
  const borde = disco * 0.35;
  const enVista = ([x, y]) => [clamp(x, vista.x0 + borde, vista.x1 - borde), clamp(y, vista.y0 + borde, vista.y1 - borde)];
  let p = enVista([CIELO.centro[0] + u[0] * t, CIELO.centro[1] + u[1] * t]);
  // si el reproductor quedaría encima, se aparta por arriba o por la izquierda, lo que no caiga en la maqueta
  const z = sobreReproductor;
  const bajoReproductor = (q) => z && q[0] + radio > z.x0 - 4 && q[0] - radio < z.x1 + 4 && q[1] + radio > z.y0 - 4 && q[1] - radio < z.y1 + 4;
  if (bajoReproductor(p)) {
    const arriba = enVista([p[0], z.y0 - radio - 6]);
    const izquierda = enVista([z.x0 - radio - 6, p[1]]);
    p = !adentro(arriba) || adentro(izquierda) ? arriba : izquierda;
  }
  // Si en la orilla del dibujo todavía toca la maqueta (arriba, la esquina del techo y el calentador casi
  // tocan el borde), se corre por esa orilla hasta el lugar libre más cercano.
  const libre = (q) => aContorno(q) >= disco + 2 && !bajoReproductor(q);
  if (!libre(p)) {
    for (let d = 4; d <= 320; d += 4) {
      const lado = [enVista([p[0] - d, p[1]]), enVista([p[0] + d, p[1]]), enVista([p[0], p[1] - d]), enVista([p[0], p[1] + d])].find(libre);
      if (lado) {
        p = lado;
        break;
      }
    }
  }
  return p;
}
// El sol y la luna se deslizan hasta su lugar: si se corren por la orilla, no saltan.
const astros = { sol: null, luna: null };
function deslizar(cual, destino, dt) {
  const a = astros[cual];
  if (!a || dt <= 0 || still.matches || Math.hypot(destino[0] - a[0], destino[1] - a[1]) > 400) {
    astros[cual] = destino;
    return destino;
  }
  const k = 1 - Math.exp(-dt / 0.35);
  astros[cual] = [a[0] + (destino[0] - a[0]) * k, a[1] + (destino[1] - a[1]) * k];
  return astros[cual];
}
let diaShown = -1;
function cielo(hora, rumboRad, dt = 0) {
  const sol = solDelDia(hora, BASE.mediodia);
  const luna = lunaDelDia(hora, BASE.mediodia);
  // el sol cuenta con su corona para no tocar la maqueta ni salirse del dibujo
  const [sx, sy] = deslizar("sol", enCielo(sol, rumboRad, CIELO.sol * 1.62, CIELO.sol), dt);
  const [lx, ly] = deslizar("luna", enCielo(luna, rumboRad, CIELO.luna), dt);
  const ts = `translate(${sx.toFixed(1)} ${sy.toFixed(1)})`;
  const tl = `translate(${lx.toFixed(1)} ${ly.toFixed(1)})`;
  solEl.setAttribute("transform", ts);
  solHaloEl.setAttribute("transform", ts);
  lunaEl.setAttribute("transform", tl);
  lunaHaloEl.setAttribute("transform", tl);
  // con el sol bajo (al salir y al ponerse) el resplandor crece; la corona da una vuelta cada 12 horas
  haloEl.setAttribute("transform", `scale(${(1 + 1.4 * (1 - smooth(0, 0.35, sol.alt))).toFixed(3)})`);
  rayosEl.setAttribute("transform", `rotate(${((hora * 30) % 360).toFixed(1)})`);
  // la tarjeta se aclara del amanecer civil (sol 6° bajo el horizonte) a 6° sobre él, y al revés de tarde
  const dia = smooth(-0.105, 0.105, sol.alt);
  const verSol = smooth(-0.02, 0.05, sol.alt).toFixed(3);
  const verLuna = (smooth(-0.02, 0.05, luna.alt) * (0.35 + 0.65 * (1 - dia))).toFixed(3);
  solEl.setAttribute("opacity", verSol);
  solHaloEl.setAttribute("opacity", verSol);
  lunaEl.setAttribute("opacity", verLuna);
  lunaHaloEl.setAttribute("opacity", verLuna);
  if (Math.abs(dia - diaShown) > 0.002) {
    diaShown = dia;
    mainEl.style.setProperty("--dia", dia.toFixed(3));
    const fase = dia > 0.5 ? "dia" : "noche";
    if (mainEl.dataset.cielo !== fase) mainEl.dataset.cielo = fase;
  }
  sombras(haciaCasa(sol, rumboRad), smooth(0.01, 0.14, sol.alt));
}

// ---------- brújula ----------
const rosaG = svg.querySelector('[data-part="rosa"]');
const ROSA = (() => {
  const mk3 = (tag, attrs) => {
    const el = document.createElementNS(SVGNS, tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
    rosaG.appendChild(el);
    return el;
  };
  return {
    llenos: mk3("path", { class: "sr-rosa-lleno" }),
    norte: mk3("path", { class: "sr-rosa-norte" }),
    puntas: mk3("path", { class: "iso-line", "data-tone": "mid" }),
    menores: mk3("path", { class: "iso-line", "data-tone": "faint" }),
    mayores: mk3("path", { class: "iso-line", "data-tone": "lo" }),
    letras: ["N", "E", "S", "O"].map((t, i) => {
      const el = mk3("text", { class: `sr-rosa-letra${i === 0 ? " sr-rosa-n" : ""}`, "text-anchor": "middle", "font-size": "1.9", y: "0.68" });
      el.textContent = t;
      return el;
    }),
    eje: mk3("circle", { class: "sr-rosa-eje", r: "0.85" }),
  };
})();
// La tarjeta: cada dirección con acimut `az` queda en el ángulo (az − rumbo) de la casa, así la marca fija
// (en +x, hacia donde miran las placas) cae sobre el rumbo, y la N, la E, la S y la O siguen el sentido
// del reloj como en una brújula de verdad vista desde arriba.
function dibujaRosa(rumbo) {
  const { x, y, z1: z, carta } = D.brujula;
  const pt = (r, a) => iso([x + r * Math.cos(a), y + r * Math.sin(a), z], P);
  const ang = (az) => (az - rumbo) * GRADO;
  const xy = (p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`;
  let menores = "";
  let mayores = "";
  for (let az = 10; az < 360; az += 10) {
    if (az % 90 === 0) continue;
    const r0 = az % 30 === 0 ? carta - 1.4 : carta - 0.8;
    const line = `M${xy(pt(r0, ang(az)))}L${xy(pt(carta + 0.1, ang(az)))}`;
    if (az % 30 === 0) mayores += line;
    else menores += line;
  }
  ROSA.menores.setAttribute("d", menores);
  ROSA.mayores.setAttribute("d", mayores);
  const centro = pt(0, 0);
  let puntas = "";
  let llenos = "";
  let norte = "";
  for (let az = 0; az < 360; az += 45) {
    const cardinal = az % 90 === 0;
    const a = ang(az);
    const punta = pt(az === 0 ? 5.4 : cardinal ? 4.7 : 3.2, a);
    const ancho = cardinal ? 1.25 : 0.85;
    const izq = pt(ancho, a + Math.PI / 4);
    const der = pt(ancho, a - Math.PI / 4);
    puntas += `M${xy(centro)}L${xy(izq)}L${xy(punta)}L${xy(der)}Z`;
    const mitad = `M${xy(centro)}L${xy(izq)}L${xy(punta)}Z`;
    if (az === 0) norte += `M${xy(centro)}L${xy(izq)}L${xy(punta)}L${xy(der)}Z`;
    else llenos += mitad;
  }
  ROSA.puntas.setAttribute("d", puntas);
  ROSA.llenos.setAttribute("d", llenos);
  ROSA.norte.setAttribute("d", norte);
  ROSA.letras.forEach((el, i) => {
    const a = ang(i * 90);
    const o = pt(6.6, a);
    const u = pantalla([-Math.sin(a), Math.cos(a), 0]);
    const v = pantalla([-Math.cos(a), -Math.sin(a), 0]);
    el.setAttribute("transform", `matrix(${u[0].toFixed(4)} ${u[1].toFixed(4)} ${v[0].toFixed(4)} ${v[1].toFixed(4)} ${o[0].toFixed(2)} ${o[1].toFixed(2)})`);
  });
  ROSA.eje.setAttribute("cx", centro[0].toFixed(2));
  ROSA.eje.setAttribute("cy", centro[1].toFixed(2));
}

// ---------- sistema ----------
const S = { meses: [...D.ejemplo.meses], existentes: { ...D.ejemplo.existentes }, nuevas: 0, baterias: 0, manual: false, mes: D.ejemplo.mes, rumbo: D.rumbo, agua: { personas: AG.personas, calentador: "sin", cisterna: "sin", cortado: false } };
let factor = 1;
let sug = null;
let samples = null;
let pvPeak = 1;
let shares = { row0: 1, row3: 0, row23: 0, row123: 0 };
let diaPV = 0;
let roofFull = false;
const KEYS = ["pv", "load", "batt", "grid", "soc", "net"];

function recompute({ calm = false } = {}) {
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
  sombra.version++;
  samples = Object.fromEntries(KEYS.map((key) => [key, sim.rows.map((row) => row[key])]));
  pvPeak = sim.pico || 1;
  const total = S.existentes.n + S.nuevas;
  const watts = (i) => (i < S.existentes.n ? S.existentes.w : D.vatios);
  const inRow = [0, 0, 0, 0];
  for (let i = 0; i < total; i++) inRow[Math.floor(i / D.cols)] += watts(i);
  const sum = inRow.reduce((a, b) => a + b, 0) || 1;
  shares = { row0: inRow[0] / sum, row3: inRow[3] / sum, row23: (inRow[2] + inRow[3]) / sum, row123: (inRow[1] + inRow[2] + inRow[3]) / sum };
  recomputeAgua();
  setTargets(calm || still.matches);
  updateFicha();
  updateControls();
  updateAgua();
  updateChart();
  if (!frame) draw(0, true);
}

// ---------- agua ----------
// El día del agua (agua.mjs) con las personas, el calentador y la cisterna que se escogieron. Los colectores
// reciben el sol del plano de las placas (10°, casi el de ellos, 18°) del rumbo de la casa.
let agua = null;
let poaRumbo = { rumbo: null, poa: null };
function recomputeAgua() {
  if (poaRumbo.rumbo !== S.rumbo) poaRumbo = { rumbo: S.rumbo, poa: formaDelDia(288, S.rumbo * GRADO, BASE.mediodia, () => 1) };
  agua = simularAgua({ personas: S.agua.personas, calentador: calentadorDe(S.agua), cisterna: cisternaDe(S.agua), cortado: S.agua.cortado, poa: poaRumbo.poa });
}
function aguaEn(hour) {
  const f = agua.filas;
  const n = f.length - 1;
  const x = (clamp(hour, 0, 24) / 24) * n;
  const i = Math.min(n - 1, Math.floor(x));
  const t = x - i;
  const mezcla = (key) => f[i][key] + (f[i + 1][key] - f[i][key]) * t;
  return { fria: mezcla("fria"), caliente: mezcla("caliente"), T: mezcla("T"), nivel: mezcla("nivel"), elec: f[i].elec, calor: mezcla("calor") };
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
  aguaGroups.forEach((g, i) => {
    const want = g.quiere(S.agua) ? 1 : 0;
    if (want !== g.target) {
      g.target = want;
      g.wait = want ? (i % 4) * 0.06 : 0;
      moving.add(g);
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
  // el agua corre más rápido cuanto más se usa (galones por hora); la fría que entra al calentador va con la caliente
  agua: (s, w) => w.fria / 40,
  caliente: (s, w) => w.caliente / 15,
};
const DE_AGUA = new Set(["agua", "caliente"]);

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
    menos: tof * (techo.sinAgua - techo.acceso) * 100,
  };
  const r = rumboDe(S.rumbo);
  F.rumbo.textContent = `${r.nombre} · ${r.az}°`;
  F.inclin.textContent = `inclinación ${SOL.inclinacion}°`;
  F.tanque.hidden = !techo.porque;
  F.porque.textContent = techo.porque;
  if (rumboV) rumboV.textContent = `${r.nombre} · ${r.az}°`;
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
  F.dia.textContent = `${fmt(v.prod * 12)} al año · ${fmt(v.dia, 1)} al día`;
  F.tsrf.textContent = `${fmt(v.tsrf, 1)} %`;
  // si no cabe en un renglón, se parte en el punto: cada número va pegado a su nombre y a su % (espacio sin corte)
  const nb = String.fromCharCode(160);
  F.tof.textContent = `TOF${nb}${fmt(tofDe(S.rumbo) * 100, 1)}${nb}% · acceso${nb}${fmt(v.acceso, 1)}${nb}%`;
  // si no le quita nada (por ejemplo, el calentador al fondo con pocas placas adelante) no lleva el menos
  F.menos.textContent = v.menos >= 0.05 ? `−${fmt(v.menos, 1)}` : "0.0";
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
    const close = Math.abs(goal - next) < (FINOS.has(key) ? 0.02 : 0.2);
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
  const cabe = capacidad();
  out.nuevas.textContent = String(S.nuevas);
  out.existentes.textContent = String(S.existentes.n);
  out.baterias.textContent = String(S.baterias);
  out.personas.textContent = String(S.agua.personas);
  const set = (key, canDown, canUp) => {
    const [down, up] = steppers[key].querySelectorAll("button");
    down.disabled = !canDown;
    up.disabled = !canUp;
  };
  set("nuevas", S.nuevas > 0, total < cabe);
  set("existentes", S.existentes.n > 0, S.existentes.n < cabe);
  set("baterias", S.baterias > D.limites.baterias[0], S.baterias < D.limites.baterias[1]);
  set("personas", S.agua.personas > AGUA.personas[0], S.agua.personas < AGUA.personas[1]);
  resetButton.disabled = !S.manual;
  if (+mesSelect.value !== S.mes) mesSelect.value = String(S.mes);
  if (document.activeElement !== mesInput) mesInput.value = String(S.meses[S.mes]);
  const notes = [];
  if (total === 0) notes.push("Sin placas, toda la energía viene de LUMA.");
  if (S.baterias > 0 && total > 0 && total < BASE.placasConBateria) notes.push(`Con batería, el cotizador pide al menos ${BASE.placasConBateria} placas.`);
  if (roofFull) notes.push(cabe < D.slots ? `Con el calentador en el techo caben ${cabe} placas; las que faltan no se dibujan.` : `En este techo caben ${D.slots} placas; las que faltan no se dibujan.`);
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
    else if (key === "personas") S.agua.personas = clamp(S.agua.personas + d, AGUA.personas[0], AGUA.personas[1]);
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
// Calentador y cisterna: botones de una sola escogida; las flechas pasan al de al lado.
const grupos = Object.fromEntries([...document.querySelectorAll("[data-opciones]")].map((el) => [el.dataset.opciones, [...el.querySelectorAll("[data-opcion]")]]));
function marcarOpciones(focus = null) {
  for (const [key, botones] of Object.entries(grupos)) {
    for (const b of botones) {
      const on = b.dataset.opcion === S.agua[key];
      b.setAttribute("aria-checked", String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus === key) b.focus();
    }
  }
}
function escoger(key, id, focus = false) {
  S.agua[key] = id;
  marcarOpciones(focus ? key : null);
  recompute();
  announce();
}
for (const [key, botones] of Object.entries(grupos)) {
  botones.forEach((b, i) => {
    b.addEventListener("click", () => escoger(key, b.dataset.opcion));
    b.addEventListener("keydown", (event) => {
      const d = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
      if (!d) return;
      event.preventDefault();
      escoger(key, botones[(i + d + botones.length) % botones.length].dataset.opcion, true);
    });
  });
}
// Corte de agua de la AAA: la cisterna no se llena y baja con lo que se usa en el día.
const corteBoton = doc("[data-corte]");
corteBoton.addEventListener("click", () => {
  S.agua.cortado = !S.agua.cortado;
  corteBoton.setAttribute("aria-checked", String(S.agua.cortado));
  recompute();
  announce();
});
// Lo que dice el panel del agua: lo que no cambia con la hora (las notas) y lo de este momento.
const AQ = Object.fromEntries([...document.querySelectorAll("[data-agua]")].map((el) => [el.dataset.agua, el]));
const galones = (v) => `${fmt(v)} gal`;
function updateAgua() {
  const a = S.agua;
  const cal = calentadorDe(a);
  const cis = cisternaDe(a);
  const sugerido = calentadorPara(a.personas, AG.calentadores);
  AQ.uso.textContent = `Usan ${galones(agua.usoDia)} al día (${AGUA.porPersona} por persona), ${galones(agua.calienteDia)} de agua caliente.`;
  for (const b of grupos.calentador) b.toggleAttribute("data-sugerido", b.dataset.opcion === sugerido.id);
  if (!cal) AQ.calentador.textContent = `Para ${a.personas} ${a.personas === 1 ? "persona" : "personas"} el cotizador sugiere el ${sugerido.nombre}.`;
  else {
    const para = cal.personas[1] > 50 ? `${cal.personas[0]} o más personas` : `${cal.personas[0]} a ${cal.personas[1]} personas`;
    const falta = agua.resistencia > 0.05 ? ` Con ${a.personas} le hace falta la resistencia: unos ${fmt(agua.resistencia, 1)} kWh al día.` : "";
    AQ.calentador.textContent = `${cal.gal} gal con ${cal.colectores} ${cal.colectores === 1 ? "colector" : "colectores"}, para ${para}${cal.id === sugerido.id ? " (el que sugiere el cotizador)" : `; el cotizador sugiere el ${sugerido.nombre}`}.${falta}`;
  }
  // menos de un día se dice en horas
  const reserva = agua.reserva >= 1 ? `${fmt(agua.reserva, 1)} ${agua.reserva === 1 ? "día" : "días"}` : `unas ${Math.max(1, Math.round(agua.reserva * 24))} horas`;
  AQ.cisterna.textContent = cis
    ? `${cis.nombre}${cis.aprox ? " (medidas aproximadas)" : ""}, ${cis.techo ? "en el techo" : "en el patio"}, con bomba de ${cis.bomba} y presurizado de ${cis.presurizado} gal. Sin servicio de la AAA alcanza para ${reserva}.`
    : `Una cisterna guarda agua para cuando la AAA corta el servicio. Con ${a.personas} ${a.personas === 1 ? "persona" : "personas"} se usan ${galones(agua.usoDia)} al día.`;
  AQ.ahorro.textContent = cal ? `unos ${fmt(agua.ahorroMes)} kWh al mes, frente a calentar con resistencia` : "sin calentador solar";
  AQ.techo.textContent = cal ? `el calentador ocupa ${cal.lugares} lugares de placas; caben ${capacidad()}` : `caben ${D.slots} placas`;
  corteBoton.disabled = !cis;
}
// el agua de este momento, en el panel y en el reproductor
let aguaDicha = "";
function aguaAhora(w) {
  const cal = calentadorDe(S.agua);
  const cis = cisternaDe(S.agua);
  const temp = cal ? `${Math.round(w.T)} °F${w.elec ? ", con la resistencia" : ""}` : "sin calentador solar";
  const nivel = cis ? `${Math.round(w.nivel * 100)} % (${galones(w.nivel * cis.gal)})` : "sin cisterna";
  const firma = `${temp}|${nivel}`;
  if (firma !== aguaDicha) {
    aguaDicha = firma;
    AQ.temp.textContent = temp;
    AQ.nivel.textContent = nivel;
  }
}
const sayAgua = (w) => {
  const partes = [`usan ${fmt(w.fria, 0)} gal/h`];
  if (calentadorDe(S.agua)) partes.push(`agua caliente ${Math.round(w.T)} °F`);
  if (cisternaDe(S.agua)) partes.push(`cisterna ${Math.round(w.nivel * 100)} %`);
  return partes.join(" · ");
};
// ---------- pestañas: Energía y Agua ----------
// La pestaña cambia los controles de la columna y lo que corre por los tubos: la energía o el agua.
const tabs = [...document.querySelectorAll("[data-tab]")];
const paneles = Object.fromEntries([...document.querySelectorAll("[data-panel]")].map((el) => [el.dataset.panel, el]));
let modoAgua = false;
let aguaVista = false;
function setTab(nombre, focus = false) {
  modoAgua = nombre === "agua";
  for (const t of tabs) {
    const on = t.dataset.tab === nombre;
    t.setAttribute("aria-selected", String(on));
    t.tabIndex = on ? 0 : -1;
    if (on && focus) t.focus();
  }
  for (const [key, el] of Object.entries(paneles)) el.hidden = key !== nombre;
  mainEl.dataset.modo = nombre;
  // la primera vez que se mira el agua sin nada escogido, bajan al techo el calentador que sugiere el
  // cotizador y la Hércules 600; después se cambian o se quitan con sus botones
  if (modoAgua && !aguaVista && S.agua.calentador === "sin" && S.agua.cisterna === "sin") {
    S.agua.calentador = calentadorPara(S.agua.personas, AG.calentadores).id;
    S.agua.cisterna = "600";
    marcarOpciones();
    recompute();
    announce();
  }
  aguaVista = aguaVista || modoAgua;
  if (!frame) draw(0, true);
}
tabs.forEach((t, i) => {
  t.addEventListener("click", () => setTab(t.dataset.tab));
  t.addEventListener("keydown", (event) => {
    const d = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    event.preventDefault();
    setTab(tabs[(i + d + tabs.length) % tabs.length].dataset.tab, true);
  });
});
// Rumbo: ocho botones en el orden de la brújula; las flechas pasan al de al lado.
const rumboV = doc("[data-rumbo-v]");
const rumboButtons = [...document.querySelectorAll("[data-rumbo]")];
function setRumbo(az, focus = false) {
  S.rumbo = az;
  for (const b of rumboButtons) {
    const on = +b.dataset.rumbo === az;
    b.setAttribute("aria-checked", String(on));
    b.tabIndex = on ? 0 : -1;
    if (on && focus) b.focus();
  }
  recompute();
  announce();
  if (still.matches || !frame) draw(0, true);
}
rumboButtons.forEach((b, i) => {
  b.addEventListener("click", () => setRumbo(+b.dataset.rumbo));
  b.addEventListener("keydown", (event) => {
    const d = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    event.preventDefault();
    setRumbo(+rumboButtons[(i + d + rumboButtons.length) % rumboButtons.length].dataset.rumbo, true);
  });
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
    const g = ficha.goal;
    const enTecho = techo.porque ? `, con agua en el techo: TSRF ${fmt(g.tsrf, 1)} %, ${fmt(g.menos, 1)} menos${techo.porque}, y acceso solar ${fmt(g.acceso, 1)} %` : `: TSRF ${fmt(g.tsrf, 1)} %`;
    const cal = calentadorDe(S.agua);
    const cis = cisternaDe(S.agua);
    const delAgua = ` Agua: ${S.agua.personas} personas, ${cal ? `calentador ${cal.nombre}, ahorra unos ${fmt(agua.ahorroMes)} kWh al mes` : "sin calentador solar"}, ${cis ? `cisterna ${cis.nombre}, alcanza para ${fmt(agua.reserva, 1)} días sin servicio` : "sin cisterna"}.`;
    status.textContent = `${S.nuevas} placas nuevas de ${D.vatios} W, ${S.existentes.n} que ya tenía de ${S.existentes.w} W, ${S.baterias} Powerwall, mirando al ${rumboDe(S.rumbo).nombre.toLowerCase()}${enTecho}. ${F.mesNombre.textContent}: ${F.mes.textContent}. En el año: ${F.anio.textContent}.${delAgua}`;
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
let rumboShow = D.rumbo;
let rumboDibujado = Infinity;
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

// Lo que se mueve del agua: el nivel en la mirilla de la cisterna, el brillo de los colectores con el sol,
// el color del tanque del calentador con la temperatura y la luz de la bomba cuando bombea.
const calorEls = $$("[data-calor]");
const tanqueCalorEls = $$("[data-calor-tanque]");
const bombaLed = $('[data-part="bomba-led"]');
const niveles = Object.fromEntries(AG.cisternas.map((c) => [c.id, { el: $(`[data-nivel="${c.id}"]`), m: c.mirilla, hecho: -1 }]));
function dibujaAgua(w) {
  const cis = cisternaDe(S.agua);
  if (cis) {
    const n = niveles[cis.id];
    const nivel = Math.round(w.nivel * 400) / 400;
    if (nivel !== n.hecho) {
      n.hecho = nivel;
      const { x, y, r, a0, a1, z0, z1 } = n.m;
      const z = z0 + (z1 - z0) * nivel;
      const arco = (zz, desde, hasta) => Array.from({ length: 7 }, (_, i) => {
        const a = desde + ((hasta - desde) * i) / 6;
        const q = iso([x + r * Math.cos(a), y + r * Math.sin(a), zz], P);
        return `${q[0].toFixed(2)} ${q[1].toFixed(2)}`;
      });
      n.el.setAttribute("d", nivel > 0.004 ? `M${[...arco(z0, a0, a1), ...arco(z, a1, a0)].join("L")}Z` : "");
    }
  }
  const cal = calentadorDe(S.agua);
  const luz = cal ? clamp(w.calor / (cal.colectores * AGUA.colector * AGUA.eficiencia * 900), 0, 1) : 0;
  const brillo = (0.9 * luz).toFixed(3);
  for (const el of calorEls) if (el.__o !== brillo) el.style.opacity = el.__o = brillo;
  const tibio = cal ? (0.6 * clamp((w.T - 95) / (AGUA.maximo - 95), 0, 1)).toFixed(3) : "0";
  for (const el of tanqueCalorEls) if (el.__o !== tibio) el.style.opacity = el.__o = tibio;
  if (bombaLed) bombaLed.style.opacity = (0.12 + 0.88 * smooth(0.5, 3, w.fria)).toFixed(3);
  aguaAhora(w);
}

function draw(dt, calm) {
  const s = sample(hour);
  const w = aguaEn(hour);
  for (const [key, list] of Object.entries(flows)) {
    const canal = D.flows[key];
    const v = CHANNEL[canal](s, w);
    // en la pestaña del agua corre el agua y la energía queda tenue; en la de energía, al revés
    const peso = DE_AGUA.has(canal) ? (modoAgua ? 1 : 0) : modoAgua ? 0.25 : 1;
    const want = smooth(0.03, 0.3, Math.abs(v)) * peso;
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
  dibujaAgua(w);
  const text = modoAgua ? sayAgua(w) : say(s);
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
  // la tarjeta de la brújula gira hasta el rumbo; el sol, la luna, la luz y las sombras siguen a la hora
  if (calm) rumboShow = S.rumbo;
  if (Math.abs(rumboShow - rumboDibujado) > 0.01) {
    dibujaRosa(rumboShow);
    rumboDibujado = rumboShow;
  }
  cielo(hour, rumboShow * GRADO, calm ? 0 : dt);
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (playing && !calm && !scrubbing) {
    if (wait > 0) wait -= dt;
    else {
      // La hora avanza al mismo paso que el reloj, sin quedarse atrás: así la pausa la frena donde está.
      target += rate * dt;
      hour += rate * dt;
    }
    if (target >= 24) {
      target -= 24;
      hour -= 24;
    }
  }
  // Con el día corriendo la hora sigue al reloj tal cual; un salto (escena, flechas) llega suave.
  hour = calm || scrubbing ? target : hour + (target - hour) * (1 - Math.exp(-dt / (playing ? 0.12 : 0.45)));
  if (Math.abs(target - hour) < 1e-4) hour = target;
  // la brújula gira por el camino corto
  const giro = ((((S.rumbo - rumboShow) % 360) + 540) % 360) - 180;
  rumboShow = calm || Math.abs(giro) < 0.05 ? S.rumbo : rumboShow + giro * (1 - Math.exp(-dt / 0.45));
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
  leerFuerza();
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
medirVista();
new ResizeObserver(() => {
  medirVista();
  if (!frame && samples) draw(0, true);
}).observe(stage);
short.addEventListener("change", layoutChart);
shorter.addEventListener("change", layoutChart);
recompute({ calm: true });
stage.setAttribute("aria-valuetext", explain(target));
draw(0, true);
