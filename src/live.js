// La página de una escena (la casa o el apartamento): lo común a las dos. El sol, la luna y las sombras, la brújula,
// los productos del plano que bajan y suben, el agua y el Anker, las pestañas, el reproductor del día y el tema. Lo
// propio de cada escena va después, en live-casa.js o live-apartamento.js: sus piezas, su ficha, lo que dice y sus
// ganchos (ESCENA_VIVA), que esta parte llama; al final arranca la página con arrancar().
const D = __DATA__;
const P = D.P;
const doc = (s) => document.querySelector(s);
const stage = doc(".iso-stage");
const svg = stage.querySelector("svg");
// el viewBox del dibujo entero (el zoom lo achica; ver más abajo)
const VB = (() => {
  const [x, y, w, h] = svg.getAttribute("viewBox").split(/[\s,]+/).map(Number);
  return { x, y, w, h };
})();
const readout = doc("[data-readout]");
const status = doc("[data-status]");
const themeButton = doc("[data-theme-toggle]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const narrow = matchMedia("(max-width: 560px)");
const $ = (s) => svg.querySelector(s);
const $$ = (s) => [...svg.querySelectorAll(s)];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const fmt = (v, digits = 0) => v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const cap = (text) => text[0].toUpperCase() + text.slice(1);
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ---------- partes del dibujo ----------
const flows = {};
for (const el of $$("[data-flow]")) (flows[el.dataset.flow] ??= []).push({ el, s0: +el.dataset.s0 });
const UP = axisVector(P, [0, 0, 1]);

// Cada pieza que entra o sale lleva su resorte: p va de 0 (fuera) a 1 (en su sitio).
const moving = new Set();
const shift = (els, vector, amount) => {
  const t = amount > 0.01 ? `translate(${(vector[0] * amount).toFixed(2)} ${(vector[1] * amount).toFixed(2)})` : null;
  for (const el of els) (t ? el.setAttribute("transform", t) : el.removeAttribute("transform"));
};
const showAll = (els, on) => {
  for (const el of els) el.style.display = on ? "" : "none";
};
// Cada parte de un producto del plano (productos.mjs) baja a su lugar como las placas cuando se escoge, y sube y
// se va cuando se quita: una cisterna, los colectores y el tanque del calentador, la bomba, el presurizado.
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
// lo que el build midió de cada modelo (la mirilla de cada cisterna) va con su modelo
for (const [id, porModelo] of Object.entries(D.medidas)) for (const m of PRODUCTO[id].modelos) Object.assign(m, porModelo[m.id]);
// (las capas, como el sellado del techo, no bajan: las extiende la escena)
const partesGroups = PRODUCTOS.filter((p) => !p.capa).flatMap((p) => [...p.modelos.map((m) => m.id), ...Object.keys(p.partes ?? {})].map((parte) => bajan($$(`[data-p="${p.id}:${parte}"]`), (e) => parteSeVe(e, p.id, parte)))).filter((g) => g.els.length);
// los productos que hacen un papel en el día del agua
const calentadorDe = (e) => conRol(e, "calentador");
const cisternaDe = (e) => conRol(e, "cisterna");
const potableDe = (e) => conRol(e, "potable");
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
// Una placa, una batería, una caja de fila o una pieza de un producto del plano solo tapan el sol si están puestas.
function activoPara(on, total, baterias, escogidos) {
  if (!on) return true;
  const [tipo, n, parte] = on.split(":");
  if (tipo === "slot") return +n < total;
  if (tipo === "bat") return +n <= baterias;
  if (tipo === "rows") return Math.ceil(total / D.cols) >= +n;
  if (tipo === "p") return parteSeVe(escogidos, n, parte);
  return true;
}
// lo escogido que se ve en el dibujo: la escena puede mostrar otra cosa mientras cambia (la casa, el techo de antes
// mientras se sella), y la sombra sigue a lo que se ve
const activo = (on) => activoPara(on, ...ESCENA_VIVA.puestas(), ESCENA_VIVA.vistos?.() ?? S.escogido);
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
// lo que se dibuja transparente con "Ver adentro" (taller.mjs lo anota por su capa: paredes, tabiques y techos)
const TRANSPARENTES = new Set(D.sombra.transparentes ?? []);
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
  // con "Ver adentro", las paredes, los tabiques y los techos que se dibujan transparentes no echan su sombra: adentro
  // se ve claro, como sin paredes. Tampoco lo que la escena tiene levantado (en la casa, el aire y el calentador
  // mientras se sella el techo). El día de la energía las cuenta igual.
  const verAdentro = !mainEl.dataset.paredes;
  const activos = SOLIDOS.filter((k) => activo(k.on) && !(verAdentro && TRANSPARENTES.has(k.n)) && !ESCENA_VIVA.enElAire?.(k.n));
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


// ---------- cielo ----------
// El sol y la luna pasan por encima de la maqueta, en un arco justo afuera del contorno: salen por el lado del este
// (a la derecha o a la izquierda de la pantalla, según el rumbo), suben, pasan sobre la casa y se ponen por el otro
// lado. Nunca pasan por debajo ni por detrás de la casa, y las sombras caen del lado contrario. Si el reproductor
// flota sobre ese lugar, suben por encima de él.
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
// lugar a los lados, y ahí también pueden ir el sol y la luna. Y el reproductor, cuando flota encima. Se mide
// sin el zoom (con el viewBox entero, que el SVG centra a lo que cabe), así el cielo no sigue a la vista.
let vista = { x0: 0, y0: 0, x1: CIELO.w, y1: CIELO.h };
let sobreReproductor = null;
function medirVista() {
  const s = svg.getBoundingClientRect();
  if (!s.width || !s.height) return;
  const k = Math.min(s.width / VB.w, s.height / VB.h);
  const ox = s.left + (s.width - VB.w * k) / 2 - VB.x * k;
  const oy = s.top + (s.height - VB.h * k) / 2 - VB.y * k;
  const enDibujo = (r) => ({ x0: (r.left - ox) / k, y0: (r.top - oy) / k, x1: (r.right - ox) / k, y1: (r.bottom - oy) / k });
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
// En qué parte de su arco va cada uno: 0 al salir, ½ sobre la casa y 1 al ponerse (fuera de eso está bajo el
// horizonte y no se ve). El día de la figura es el del equinoccio: el sol sale 6 horas antes del mediodía y se pone 6
// horas después; la luna llena, al revés.
const ARCO = {
  sol: (hora) => (hora - BASE.mediodia + 6) / 12,
  luna: (hora) => ((((hora - BASE.mediodia - 6) % 24) + 24) % 24) / 12,
};
// `f` es la parte del arco (ARCO), `radio` todo lo que ocupa (el sol, con su corona) y `disco`, el disco. Si afuera
// de la maqueta no hay lugar dentro del dibujo (la esquina de atrás del techo casi toca el borde de arriba), asoma a
// medias por el borde, como un sol que se sale del cuadro, en vez de montarse sobre la casa.
function enCielo(f, rumbo, radio, disco = radio) {
  // sale del lado de la pantalla hacia donde queda el este con este rumbo, y se pone del otro
  const lado = Math.sign(pantalla(haciaCasa({ alt: 0, az: Math.PI / 2 }, rumbo))[0]) || 1;
  const a = Math.PI * clamp(f, 0, 1);
  const u = [lado * Math.cos(a), -Math.sin(a)];
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
  const [sx, sy] = deslizar("sol", enCielo(ARCO.sol(hora), rumboRad, CIELO.sol * 1.62, CIELO.sol), dt);
  const [lx, ly] = deslizar("luna", enCielo(ARCO.luna(hora), rumboRad, CIELO.luna), dt);
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
// La rosa se mide para la tarjeta de la casa (9.2 de radio); en una más chica, como la del apartamento, todo se
// achica con ella.
const rosaG = svg.querySelector('[data-part="rosa"]');
const ROSA_F = D.brujula.carta / 9.2;
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
      const el = mk3("text", { class: `sr-rosa-letra${i === 0 ? " sr-rosa-n" : ""}`, "text-anchor": "middle", "font-size": String(1.9 * ROSA_F), y: String(0.68 * ROSA_F) });
      el.textContent = t;
      return el;
    }),
    eje: mk3("circle", { class: "sr-rosa-eje", r: String(0.85 * ROSA_F) }),
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
    const r0 = az % 30 === 0 ? carta - 1.4 * ROSA_F : carta - 0.8 * ROSA_F;
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
    const punta = pt((az === 0 ? 5.4 : cardinal ? 4.7 : 3.2) * ROSA_F, a);
    const ancho = (cardinal ? 1.25 : 0.85) * ROSA_F;
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
    const o = pt(6.6 * ROSA_F, a);
    const u = pantalla([-Math.sin(a), Math.cos(a), 0]);
    const v = pantalla([-Math.cos(a), -Math.sin(a), 0]);
    el.setAttribute("transform", `matrix(${u[0].toFixed(4)} ${u[1].toFixed(4)} ${v[0].toFixed(4)} ${v[1].toFixed(4)} ${o[0].toFixed(2)} ${o[1].toFixed(2)})`);
  });
  ROSA.eje.setAttribute("cx", centro[0].toFixed(2));
  ROSA.eje.setAttribute("cy", centro[1].toFixed(2));
}

// ---------- sistema ----------
// Lo escogido de la escena: el rumbo, las personas y el agua, y los productos del plano (con lo que ya viene puesto, como
// el sellado del techo de la casa). Cada escena le suma lo suyo (la casa, el consumo de cada mes, las placas, las
// baterías y lo del techo).
const S = { rumbo: D.rumbo, agua: { personas: D.agua.personas, cortado: false }, escogido: { ...SIN_NADA, ...PUESTOS } };

// Cada cambio rehace el día: primero lo de la escena (en la casa, el sistema del cotizador y la sombra del techo),
// después el agua y el Anker, las piezas que entran y salen y los textos.
function recompute({ calm = false } = {}) {
  ESCENA_VIVA.recompute();
  sombra.version++;
  recomputeAgua();
  recomputeAnker();
  setTargets(calm || still.matches);
  ESCENA_VIVA.actualiza();
  updateAgua();
  if (!frame) draw(0, true);
}

// ---------- agua ----------
// El día del agua (agua.mjs) con las personas, el calentador y la cisterna que se escogieron. Los colectores
// reciben el sol del plano de las placas (10°, casi el de ellos, 18°) del rumbo de la casa.
let agua = null;
let poaRumbo = { rumbo: null, poa: null };
function recomputeAgua() {
  if (poaRumbo.rumbo !== S.rumbo) poaRumbo = { rumbo: S.rumbo, poa: formaDelDia(288, S.rumbo * GRADO, BASE.mediodia, () => 1) };
  agua = simularAgua({ personas: S.agua.personas, calentador: calentadorDe(S.escogido), cisterna: cisternaDe(S.escogido), cortado: S.agua.cortado, poa: poaRumbo.poa });
}
function aguaEn(hour) {
  const f = agua.filas;
  const n = f.length - 1;
  const x = (clamp(hour, 0, 24) / 24) * n;
  const i = Math.min(n - 1, Math.floor(x));
  const t = x - i;
  const mezcla = (key) => f[i][key] + (f[i + 1][key] - f[i][key]) * t;
  return { fria: mezcla("fria"), caliente: mezcla("caliente"), potable: mezcla("potable"), T: mezcla("T"), nivel: mezcla("nivel"), elec: f[i].elec, calor: mezcla("calor") };
}

// ---------- Anker ----------
// El día del Anker (anker.mjs) con el modelo que se escogió y las PS400 que lleva. Sus PS400 miran hacia el rumbo de la
// escena (en la casa, hacia donde miran las placas del techo; en el apartamento, hacia donde mira el balcón): reciben
// el sol de su propio plano, inclinado 40° (D.ps400, en las dos escenas), menos lo que les tapan las sombras de lo
// demás en cada momento.
let anker = null;
let ankerSol = { key: "", sol: null };
// El respaldo escogido: el Anker portátil o el E10 (nunca van juntos), con su producto y su modelo. Su batería: la del
// modelo, o las B6000 que lleve el E10; sus placas: las PS400 del portátil se cuentan con − y +, las del E10 son las
// de su kit.
function respaldoDe(e = S.escogido) {
  for (const p of PRODUCTOS.filter((q) => q.rol === "respaldo")) {
    const m = modeloDe(e, p.id);
    if (m) return { p, m };
  }
  return null;
}
const kwhDe = (r) => (r.m.kwhB6000 ? r.m.kwhB6000 * cantidadDe(S.escogido, r.p) : r.m.kwh);
const placasDe = (r) => (r.m.kwhB6000 ? r.m.placas : cantidadDe(S.escogido, r.p));
// lo que da cada placa: 0.2 kW la PS200, 0.4 la PS400 y las del E10
const kwPlacaDe = (r) => (conPs200(r.m, S.escogido) ? 0.2 : ANKER.ps400);
const placasAnker = () => {
  const r = respaldoDe();
  return r ? placasDe(r) : 0;
};
// el generador del E10 (kW en DC, ficha del Smart Generator 5500), si se prendió
const GENERADOR_KW = 3.6;
function recomputeAnker() {
  const r = respaldoDe();
  if (!r) {
    anker = null;
    return;
  }
  const { m } = r;
  const n = placasDe(r);
  const key = `${S.rumbo}|${r.p.id}|${m.id}|${n}|${JSON.stringify(S.escogido)}|${ESCENA_VIVA.puestas().join("|")}`;
  if (ankerSol.key !== key) {
    const tapan = SOLIDOS.filter((k) => activo(k.on));
    const placas = ((conPs200(m, S.escogido) ? m.ps200 : m.ps) ?? []).slice(0, n);
    ankerSol = { key, sol: formaDelDia(288, S.rumbo * GRADO, BASE.mediodia, (i, s) => (placas.length ? placas.reduce((a, q) => a + soleado(q, s, tapan), 0) / placas.length : 1), D.ps400?.normal) };
  }
  anker = simularAnker({ modelo: m, sol: ankerSol.sol, placas: n, kwh: kwhDe(r), kwPlaca: kwPlacaDe(r), generador: m.kwhB6000 && S.escogido.generador ? GENERADOR_KW : 0 });
}
function ankerEn(hour) {
  if (!anker) return null;
  const f = anker.filas;
  const n = f.length - 1;
  const x = (clamp(hour, 0, 24) / 24) * n;
  const i = Math.min(n - 1, Math.floor(x));
  const t = x - i;
  const mezcla = (key) => f[i][key] + (f[i + 1][key] - f[i][key]) * t;
  return { puede: mezcla("puede"), ps400: mezcla("ps400"), esencial: mezcla("esencial"), luma: mezcla("luma"), gen: mezcla("gen"), anker: mezcla("anker"), soc: mezcla("soc") };
}

// Lo que entra y lo que sale: primero lo de la escena (en la casa, las placas, las cajas de fila y las baterías) y
// después las partes de los productos del plano.
function setTargets(calm) {
  ESCENA_VIVA.targets();
  partesGroups.forEach((g, i) => {
    const want = g.quiere(S.escogido) ? 1 : 0;
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

// Lo que lleva cada conducto, con signo en el sentido en que se dibujó la ruta: `s` es la energía de la escena en ese
// momento (la de la casa; el apartamento no tiene), `w` el agua y `a` el Anker. La casa le suma sus canales de energía.
const CHANNEL = {
  // el agua corre más rápido cuanto más se usa (galones por hora); la fría que entra al calentador va con la caliente,
  // y la de la ósmosis con la que se bebe y se cocina
  agua: (s, w) => w.fria / 40,
  caliente: (s, w) => w.caliente / 15,
  potable: (s, w) => w.potable * 2,
  // las placas cargan el Anker (o el E10), el generador carga el E10 y el Anker da lo esencial por su transfer switch
  // (kW)
  ps400: (s, w, a) => a?.ps400 ?? 0,
  gen: (s, w, a) => a?.gen ?? 0,
  anker: (s, w, a) => a?.anker ?? 0,
};
// Cada canal es de una pestaña: en la suya corre; en las otras, la energía queda tenue y lo demás se apaga.
const PESTAÑA_CANAL = { agua: "agua", caliente: "agua", potable: "agua", ps400: "anker", gen: "anker", anker: "anker" };

// ---------- textos ----------
const clock = (h) => {
  const m = Math.round((((h % 24) + 24) % 24) * 60) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};


// ---------- controles ----------
// Los botones de menos y más: las personas, en la pestaña Agua; lo que cuentan los productos del plano (las PS400 del
// Anker), que se guarda en lo escogido dentro de lo que admite su modelo; y los de la escena (en la casa, las placas y
// las baterías), que ella suma a PASOS.
const out = Object.fromEntries([...document.querySelectorAll("[data-v]")].map((el) => [el.dataset.v, el]));
const steppers = Object.fromEntries([...document.querySelectorAll("[data-stepper]")].map((el) => [el.dataset.stepper, el]));
const PASOS = { personas: (d) => (S.agua.personas = clamp(S.agua.personas + d, AGUA.personas[0], AGUA.personas[1])) };
for (const p of PRODUCTOS.filter((q) => q.cantidad)) {
  const c = p.cantidad;
  PASOS[c.id] = (d) => {
    const m = modeloDe(S.escogido, p.id);
    if (m) S.escogido[c.id] = clamp(cantidadDe(S.escogido, p) + d, c.min, c.max(m, p, S.escogido));
  };
}
const pasoEn = (key, canDown, canUp) => {
  const [down, up] = steppers[key].querySelectorAll("button");
  down.disabled = !canDown;
  up.disabled = !canUp;
};
for (const [key, box] of Object.entries(steppers)) {
  box.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-d]");
    if (!button || button.disabled) return;
    PASOS[key](+button.dataset.d);
    recompute();
    announce();
  });
}
// Los productos del plano: botones de una sola escogida; las flechas pasan al de al lado.
const enPanel = (s) => [...document.querySelectorAll(s)];
const grupos = Object.fromEntries(enPanel("[data-opciones]").map((el) => [el.dataset.opciones, [...el.querySelectorAll("[data-opcion]")]]));
// La pestaña Anker en pasos (pagina.mjs): el tipo de respaldo (en la casa, el portátil o el E10), las familias del
// portátil con su batería de expansión y lo que se ve con cada tipo.
const RESPALDOS = PRODUCTOS.filter((p) => p.rol === "respaldo");
const tipoBotones = enPanel("[data-tipo]");
const familias = enPanel("[data-familias]").map((el) => ({ id: el.dataset.familias, botones: [...el.querySelectorAll("[data-familia]")] }));
const expansiones = enPanel("[data-expansion]");
// el último modelo de cada producto: al escoger otra vez su tipo, vuelve a él
const ultimo = {};
// el botón que vale `valor` queda escogido (y con el foco, si se pide)
function marcar(botones, attr, valor, enfocar) {
  for (const b of botones) {
    const on = b.dataset[attr] === valor;
    b.setAttribute("aria-checked", String(on));
    b.tabIndex = on ? 0 : -1;
    if (on && enfocar) b.focus();
  }
}
// `focus` es el grupo que se movió con las flechas: el botón escogido de ese grupo se lleva el foco
function marcarOpciones(focus = null) {
  for (const [key, botones] of Object.entries(grupos)) marcar(botones, "opcion", S.escogido[key], focus === key);
  marcar(tipoBotones, "tipo", RESPALDOS.find((p) => hay(S.escogido, p.id))?.id ?? "sin", focus === "tipo");
  for (const f of familias) marcar(f.botones, "familia", modeloDe(S.escogido, f.id)?.familia ?? "sin", focus === `familia:${f.id}`);
  for (const b of expansiones) {
    const p = PRODUCTO[b.dataset.expansion];
    const m = modeloDe(S.escogido, p.id);
    b.setAttribute("aria-checked", String(Boolean(m?.expansion)));
    if (m) b.querySelector("[data-expansion-nombre]").textContent = `(${p.familias.find((f) => f.id === m.familia).expansion})`;
  }
  mostrarPasos();
}
function escoger(key, id, focus = null) {
  S.escogido[key] = id;
  if (id !== "sin") ultimo[key] = id;
  // lo que no va junto con lo escogido queda en "Sin" (el Anker portátil y el E10)
  if (id !== "sin") for (const otro of PRODUCTO[key]?.excluye ?? []) if (PRODUCTO[otro]) S.escogido[otro] = "sin";
  marcarOpciones(focus);
  recompute();
  announce();
}
// los botones de un grupo: el clic escoge y las flechas escogen el de al lado, con el foco
function radios(botones, escoge, grupo) {
  botones.forEach((b, i) => {
    b.addEventListener("click", () => escoge(b, null));
    b.addEventListener("keydown", (event) => {
      const d = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
      if (!d) return;
      event.preventDefault();
      escoge(botones[(i + d + botones.length) % botones.length], grupo);
    });
  });
}
for (const [key, botones] of Object.entries(grupos)) radios(botones, (b, foco) => escoger(key, b.dataset.opcion, foco), key);
// el tipo de respaldo: "Sin" los quita a todos; uno vuelve a su último modelo (o al que trae por defecto)
radios(
  tipoBotones,
  (b, foco) => {
    const id = b.dataset.tipo;
    if (id !== "sin") {
      const p = PRODUCTO[id];
      if (!hay(S.escogido, id)) return escoger(id, ultimo[id] ?? p.porDefecto ?? p.inicial ?? p.modelos[0].id, foco);
      return marcarOpciones(foco);
    }
    for (const p of RESPALDOS) S.escogido[p.id] = "sin";
    marcarOpciones(foco);
    recompute();
    announce();
  },
  "tipo",
);
// la familia del portátil: con o sin su batería de expansión, como estaba
for (const f of familias) {
  const p = PRODUCTO[f.id];
  radios(
    f.botones,
    (b, foco) => {
      const fam = b.dataset.familia;
      if (fam === "sin") return escoger(p.id, "sin", foco);
      const previo = modeloDe(S.escogido, p.id) ?? p.modelos.find((q) => q.id === ultimo[p.id]);
      const conBateria = Boolean(previo?.expansion);
      escoger(p.id, (p.modelos.find((q) => q.familia === fam && Boolean(q.expansion) === conBateria) ?? p.modelos.find((q) => q.familia === fam)).id, foco);
    },
    `familia:${f.id}`,
  );
}
// la batería de expansión: el mismo modelo con o sin ella
for (const b of expansiones) {
  b.addEventListener("click", () => {
    const p = PRODUCTO[b.dataset.expansion];
    const m = modeloDe(S.escogido, p.id);
    const otro = m && p.modelos.find((q) => q.familia === m.familia && Boolean(q.expansion) !== Boolean(m.expansion));
    if (otro) escoger(p.id, otro.id);
  });
}
// Lo que se ve con lo escogido: los pasos de cada tipo de respaldo, la batería de expansión, lo que hace el respaldo
// mientras no hay ninguno y los extras, solo con un interruptor que vaya con el modelo. Después se numeran los pasos
// que se ven en cada pestaña.
function mostrarPasos() {
  for (const el of enPanel("[data-de]")) el.hidden = !hay(S.escogido, el.dataset.de);
  for (const el of enPanel("[data-con-modelo]")) el.hidden = !hay(S.escogido, el.dataset.conModelo);
  for (const el of enPanel("[data-intro-respaldo]")) el.hidden = RESPALDOS.some((p) => hay(S.escogido, p.id));
  for (const el of enPanel("[data-extras]")) {
    const p = PRODUCTO[el.dataset.extras];
    const m = modeloDe(S.escogido, p.id);
    el.hidden = !m || Boolean(p.interruptor.si && !p.interruptor.si(m));
  }
  for (const panel of enPanel("[data-panel]")) {
    let n = 0;
    for (const num of panel.querySelectorAll(".sr-num")) if (!num.closest("section").hidden) num.textContent = String(++n);
  }
}
// Corte de agua de la AAA: la cisterna no se llena y baja con lo que se usa en el día.
const corteBoton = doc("[data-corte]");
corteBoton?.addEventListener("click", () => {
  S.agua.cortado = !S.agua.cortado;
  corteBoton.setAttribute("aria-checked", String(S.agua.cortado));
  recompute();
  announce();
});
// Los interruptores que van en lo escogido (el generador del E10): se prenden y se apagan, y sin modelo no se tocan.
const interruptores = PRODUCTOS.filter((p) => p.interruptor?.escogido).map((p) => ({ p, b: doc(`[data-${p.interruptor.id}]`) })).filter(({ b }) => b);
for (const { p, b } of interruptores) {
  b.addEventListener("click", () => {
    const id = p.interruptor.id;
    S.escogido[id] = !S.escogido[id];
    b.setAttribute("aria-checked", String(S.escogido[id]));
    recompute();
    announce();
  });
}
// Lo que dice el panel: lo que no cambia con la hora (las notas, y en el respaldo la línea de lo que es cada modelo, la
// de lo que da en el día, cuántas admite y qué hace mientras no hay ninguno). Lo de cada momento lo dice el reproductor.
const AQ = Object.fromEntries(enPanel("[data-agua]").map((el) => [el.dataset.agua, el]));
const NOTAS = Object.fromEntries(enPanel("[data-nota]").map((el) => [el.dataset.nota, el]));
const RESUMEN = Object.fromEntries(enPanel("[data-resumen]").map((el) => [el.dataset.resumen, el]));
const RESULTADO = Object.fromEntries(enPanel("[data-resultado]").map((el) => [el.dataset.resultado, el]));
const NOMBRE_CANTIDAD = Object.fromEntries(enPanel("[data-cantidad-nombre]").map((el) => [el.dataset.cantidadNombre, el]));
const TOPE = Object.fromEntries(enPanel("[data-tope]").map((el) => [el.dataset.tope, el]));
const INTRO = enPanel("[data-intro-respaldo]");
// Las fichas de Agua y de Anker (pagina.mjs): lo que aporta cada producto escogido, o lo que haría si falta. La de
// Energía la llena la casa. Cada escena trae las celdas que le tocan.
const FC = Object.fromEntries(enPanel("[data-f]").map((el) => [el.dataset.f, el]));
const pon = (key, texto) => {
  if (FC[key] && FC[key].textContent !== texto) FC[key].textContent = texto;
};
function fichasProductos() {
  const n = S.agua.personas;
  const cal = calentadorDe(S.escogido);
  const cis = cisternaDe(S.escogido);
  const ro = potableDe(S.escogido);
  const poe = modeloDe(S.escogido, "poe");
  const nev = modeloDe(S.escogido, "nevera");
  const r = respaldoDe();
  pon("uso", `${galones(agua.usoDia)} al día`);
  pon("usoDe", `${n} ${n === 1 ? "persona" : "personas"} · ${tieneRol("calentador") ? `${galones(agua.calienteDia)} calientes` : `${galones(agua.potableDia)} de beber`}`);
  pon("cal", cal ? `Soltek ${cal.nombre}` : "Sin calentador");
  pon("calDe", cal ? `ahorra ${fmt(agua.ahorroMes)} kWh al mes` : "el agua caliente va con luz");
  pon("cisterna", cis ? cis.nombre : "Sin cisterna");
  const dias = agua.reserva >= 1 ? `${fmt(agua.reserva, 1)} ${agua.reserva === 1 ? "día" : "días"}` : `unas ${Math.max(1, Math.round(agua.reserva * 24))} horas`;
  pon("reserva", cis ? `${dias} sin la AAA` : "sin agua si corta la AAA");
  pon("poe", poe ? `Water Care ${poe.corto}` : "Sin suavizador");
  pon("poeDe", poe ? `trata ${galones(agua.usoDia)} al día` : "el agua entra sin tratar");
  pon("osmosis", ro ? ro.corto : "Sin ósmosis");
  pon("beber", ro ? `${galones(agua.potableDia)} de beber al día` : "el agua de beber, de la llave");
  const e10 = Boolean(r?.m.kwhB6000);
  const placas = r ? placasDe(r) : 0;
  pon("anker", r ? (e10 ? `E10 ${r.m.id === "portatil" ? "Portátil" : r.m.corto}` : r.m.corto) : "Sin respaldo");
  pon("ankerKwh", r ? `${fmt(kwhDe(r), e10 ? 1 : 2)} kWh · ${fmt(r.m.kw, (String(r.m.kw).split(".")[1] ?? "").length)} kW` : "lo esencial va de LUMA");
  pon("ps", placas ? `${fmt(placas * kwPlacaDe(r), 1)} kW` : "—");
  pon("psN", r ? `${placas} de ${conPs200(r.m, S.escogido) ? 200 : 400} W en el balcón` : "sin placas");
  pon("sol", r && anker && placas ? `${fmt(anker.solDia, 1)} kWh al día` : "—");
  pon("solDe", !r ? "sin respaldo" : placas && anker ? `de los ${fmt(anker.esencialDia, 1)} de lo esencial` : "sin placas: LUMA lo mantiene lleno");
  pon("horas", r && anker ? `${Math.round(anker.horas)} horas` : "—");
  pon("horasDe", !r ? "sin respaldo" : e10 && S.escogido.generador ? "y el generador la recarga" : "con la batería sola");
  pon("nevera", nev ? `EverFrost ${nev.id}` : "Sin nevera");
  pon("neveraDe", nev ? `${fmt(nev.horas, nev.horas % 1 ? 1 : 0)} h con su batería` : "para un apagón o para salir");
}
// "Le falta": todo lo que no se ha puesto (el Anker portátil y el E10 cuentan como uno, el respaldo), como botones que
// llevan a su paso; es lo que se le puede ofrecer al cliente
const FALTA = PRODUCTOS.reduce((grupos, p) => {
  const id = p.rol === "respaldo" ? "respaldo" : p.id;
  if (!grupos.some((g) => g.id === id)) {
    const ps = p.rol === "respaldo" ? RESPALDOS : [p];
    const nombre = p.rol === "respaldo" ? "Anker" : p.nombre[0].toUpperCase() + p.nombre.slice(1);
    grupos.push({ id, pestaña: p.pestaña, nombre, titulo: p.rol === "respaldo" ? "Anker SOLIX" : p.grupo, hay: () => ps.some((q) => hay(S.escogido, q.id)) });
  }
  return grupos;
}, []);
function pintaFaltan() {
  const faltan = FALTA.filter((g) => !g.hay());
  for (const el of enPanel("[data-faltan]")) {
    const firma = faltan.map((g) => g.id).join(" ") || "nada";
    if (el.dataset.firma === firma) continue;
    el.dataset.firma = firma;
    el.innerHTML = faltan.length ? faltan.map((g) => `<button type="button" class="sr-falta" data-ir="${g.id}" title="Ir a ${g.titulo}" aria-label="Le falta: ${g.titulo}. Ir a su paso">${g.nombre}</button>`).join("") : `<span class="sr-kpi-s">nada: tiene todo</span>`;
  }
}
document.addEventListener("click", (event) => {
  const b = event.target.closest("[data-ir]");
  const g = b && FALTA.find((q) => q.id === b.dataset.ir);
  if (!g) return;
  setTab(g.pestaña);
  const seccion = document.querySelector(`[data-panel="${g.pestaña}"] [data-producto="${g.id}"]`);
  seccion?.scrollIntoView({ block: "nearest" });
  seccion?.querySelector('[role="radio"][tabindex="0"]')?.focus({ preventScroll: true });
});
const galones = (v) => `${fmt(v)} gal`;
function updateAgua() {
  const a = S.agua;
  out.personas.textContent = String(a.personas);
  pasoEn("personas", a.personas > AGUA.personas[0], a.personas < AGUA.personas[1]);
  // con calentador en la escena se dice el agua caliente; si no, la de beber de la ósmosis
  const deEsa = tieneRol("calentador") ? `${galones(agua.calienteDia)} de agua caliente` : `${galones(agua.potableDia)} de beber y cocinar`;
  AQ.uso.textContent = `Usan ${galones(agua.usoDia)} al día (${AGUA.porPersona} por persona), ${deEsa}.`;
  // la nota de cada producto del plano, el punto naranja en el modelo que sugiere el cotizador y lo que cuenta con − y +
  // (apagado sin modelo)
  for (const p of PRODUCTOS) {
    const m = modeloDe(S.escogido, p.id);
    const sugerido = sugeridoPara(p, a.personas);
    const cantidad = cantidadDe(S.escogido, p);
    for (const b of grupos[p.id] ?? []) b.toggleAttribute("data-sugerido", b.dataset.opcion === sugerido?.id);
    const x = { personas: a.personas, sugerido, agua, anker, fmt, galones, cantidad, generador: Boolean(S.escogido.generador), escogido: S.escogido };
    if (NOTAS[p.id] && p.nota) NOTAS[p.id].textContent = p.nota(m, x);
    if (RESUMEN[p.id]) RESUMEN[p.id].textContent = m ? p.resumen(m, x) : "";
    if (RESULTADO[p.id]) RESULTADO[p.id].textContent = m && anker ? p.resultado(m, x) : "";
    const c = p.cantidad;
    if (c && steppers[c.id]) {
      out[c.id].textContent = m ? String(cantidad) : "—";
      pasoEn(c.id, Boolean(m) && cantidad > c.min, Boolean(m) && cantidad < c.max(m, p, S.escogido));
      if (NOMBRE_CANTIDAD[c.id] && c.nombre && m) NOMBRE_CANTIDAD[c.id].textContent = c.nombre(m, S.escogido);
      if (TOPE[c.id]) TOPE[c.id].textContent = m && c.tope ? c.tope(m, p, S.escogido) : "";
    }
  }
  for (const el of INTRO) el.textContent = RESPALDOS[0]?.nota() ?? "";
  fichasProductos();
  pintaFaltan();
  if (AQ.ahorro) AQ.ahorro.textContent = calentadorDe(S.escogido) ? `unos ${fmt(agua.ahorroMes)} kWh al mes, frente a calentar con resistencia` : "sin calentador solar";
  if (corteBoton) corteBoton.disabled = !cisternaDe(S.escogido);
  for (const { p, b } of interruptores) {
    const m = modeloDe(S.escogido, p.id);
    b.disabled = !m || Boolean(p.interruptor.si && !p.interruptor.si(m));
    // apagado se ve apagado, aunque quede guardado para cuando vuelva a poder
    b.setAttribute("aria-checked", String(!b.disabled && Boolean(S.escogido[p.interruptor.id])));
  }
}
// el agua y el Anker de este momento, en el reproductor
const sayAgua = (w) => {
  const partes = [`usan ${fmt(w.fria, 0)} gal/h`];
  if (calentadorDe(S.escogido)) partes.push(`agua caliente ${Math.round(w.T)} °F`);
  if (cisternaDe(S.escogido)) partes.push(`cisterna ${Math.round(w.nivel * 100)} %`);
  if (potableDe(S.escogido)) partes.push(`de beber ${fmt(w.potable, 1)} gal/h`);
  return partes.join(" · ");
};
const sayAnker = (a) => {
  const r = respaldoDe();
  if (!a || !r) return "sin Anker";
  const e10 = Boolean(r.m.kwhB6000);
  return `${e10 ? "placas" : conPs200(r.m, S.escogido) ? "PS200" : "PS400"} ${fmt(a.ps400, 1)} kW · lo esencial ${fmt(a.esencial, 1)} kW · ${e10 ? "E10" : "Anker"} ${Math.round(a.soc * 100)} %${a.gen > 0.005 ? " · generador" : ""}`;
};
// ---------- pestañas: Energía, Agua, Anker y Roofing ----------
// La pestaña cambia los controles de la columna y lo que corre por los tubos: la energía, el agua, lo del Anker o el
// agua de la lluvia en el techo. La página abre en la que viene escogida (en la casa, Energía; en el apartamento, Anker).
const tabs = [...document.querySelectorAll("[data-tab]")];
const paneles = Object.fromEntries([...document.querySelectorAll("[data-panel]")].map((el) => [el.dataset.panel, el]));
let modo = tabs.find((t) => t.getAttribute("aria-selected") === "true")?.dataset.tab ?? "energia";
const vistas = new Set();
function setTab(nombre, focus = false) {
  modo = nombre;
  for (const t of tabs) {
    const on = t.dataset.tab === nombre;
    t.setAttribute("aria-selected", String(on));
    t.tabIndex = on ? 0 : -1;
    if (on && focus) t.focus();
  }
  for (const [key, el] of Object.entries(paneles)) el.hidden = key !== nombre;
  // la ficha de la tarjeta es la de la pestaña
  for (const el of enPanel("[data-ficha]")) el.hidden = el.dataset.ficha !== nombre;
  mainEl.dataset.modo = nombre;
  // la primera vez que se abre una pestaña sin nada escogido en ella, bajan los productos que tienen modelo
  // inicial (en la del agua, el calentador que sugiere el cotizador y la Hércules 600); después se cambian o se
  // quitan con sus botones
  const deAqui = PRODUCTOS.filter((p) => p.pestaña === nombre);
  if (!vistas.has(nombre) && deAqui.some((p) => p.inicial) && deAqui.every((p) => S.escogido[p.id] === "sin")) {
    for (const p of deAqui) if (p.inicial) S.escogido[p.id] = p.inicial === "sugerido" ? sugeridoPara(p, S.agua.personas).id : p.inicial;
    marcarOpciones();
    recompute();
    announce();
  }
  vistas.add(nombre);
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
// Lo que se le dice al lector de pantalla después de un cambio: lo arma la escena con lo del agua y lo del Anker.
let quietSystem = 0;
const delAnker = () => {
  const r = respaldoDe();
  if (!r || !anker) return " Sin Anker.";
  const n = placasDe(r);
  const con = r.m.kwhB6000 ? `${cantidadDe(S.escogido, r.p)} baterías B6000 y ${n ? `${n} placas` : "sin placas"}` : `${n} ${n === 1 ? "placa" : "placas"} ${conPs200(r.m, S.escogido) ? "PS200" : "PS400"}`;
  return ` Anker: ${r.m.nombre} con ${con}; le dan ${fmt(anker.solDia, 1)} de los ${fmt(anker.esencialDia, 1)} kWh de lo esencial y sin LUMA alcanza para unas ${Math.round(anker.horas)} horas.`;
};
// del agua, solo lo que hay en la escena (en el apartamento no va calentador, y la ósmosis no va en la casa)
const tieneRol = (rol) => PRODUCTOS.some((p) => p.rol === rol);
const delAgua = () => {
  const partes = [`${S.agua.personas} personas`];
  const cal = calentadorDe(S.escogido);
  const cis = cisternaDe(S.escogido);
  const ro = potableDe(S.escogido);
  if (tieneRol("calentador")) partes.push(cal ? `calentador ${cal.nombre}, ahorra unos ${fmt(agua.ahorroMes)} kWh al mes` : "sin calentador solar");
  partes.push(cis ? `cisterna ${cis.nombre}, alcanza para ${fmt(agua.reserva, 1)} días sin servicio` : "sin cisterna");
  if (tieneRol("potable")) partes.push(ro ? `ósmosis ${ro.nombre}, da ${galones(agua.potableDia)} de beber al día` : "sin ósmosis");
  return ` Agua: ${partes.join(", ")}.`;
};
function announce() {
  clearTimeout(quietSystem);
  quietSystem = setTimeout(() => (status.textContent = ESCENA_VIVA.anuncia()), 500);
}


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
const PERIOD = 6;
const phase = {};
const shown = {};

// Lo que se mueve del agua: el nivel en la mirilla de la cisterna, el brillo de los colectores con el sol,
// el color del tanque del calentador con la temperatura y la luz de la bomba cuando bombea.
const calorEls = $$("[data-calor]");
const tanqueCalorEls = $$("[data-calor-tanque]");
const bombaLed = $('[data-part="bomba-led"]');
const niveles = Object.fromEntries((PRODUCTOS.find((p) => p.rol === "cisterna")?.modelos ?? []).map((c) => [c.id, { el: $(`[data-nivel="${c.id}"]`), m: c.mirilla, hecho: -1 }]));
function dibujaAgua(w) {
  const cis = cisternaDe(S.escogido);
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
  const cal = calentadorDe(S.escogido);
  const luz = cal ? clamp(w.calor / (cal.colectores * AGUA.colector * AGUA.eficiencia * 900), 0, 1) : 0;
  const brillo = (0.9 * luz).toFixed(3);
  for (const el of calorEls) if (el.__o !== brillo) el.style.opacity = el.__o = brillo;
  const tibio = cal ? (0.6 * clamp((w.T - 95) / (AGUA.maximo - 95), 0, 1)).toFixed(3) : "0";
  for (const el of tanqueCalorEls) if (el.__o !== tibio) el.style.opacity = el.__o = tibio;
  if (bombaLed) bombaLed.style.opacity = (0.12 + 0.88 * smooth(0.5, 3, w.fria)).toFixed(3);
}
// Lo que se mueve del Anker: las cinco luces de su carga y el vidrio de las PS400, que se ilumina con el sol.
const ankerLeds = $$("[data-anker-led]").map((el) => ({ el, i: +el.dataset.ankerLed }));
const sunsPs = $$("[data-sun-ps]");
function dibujaAnker(a) {
  const soc = a ? a.soc : 0;
  for (const { el, i } of ankerLeds) el.style.opacity = (0.12 + 0.88 * clamp(soc * 5 - i, 0, 1)).toFixed(3);
  const r = respaldoDe();
  const tope = r ? Math.max(1, placasAnker()) * kwPlacaDe(r) * ANKER.rinde : 1;
  const luz = a ? (((document.body.dataset.theme === "dark" ? 0.45 : 0.62) * a.puede) / tope).toFixed(3) : "0";
  for (const el of sunsPs) if (el.__o !== luz) el.style.opacity = el.__o = luz;
}

// Cada cuadro: los flujos de los tubos, lo que mueve la escena (en la casa, el vidrio de las placas, las luces, el
// ventilador y el medidor), el agua y el Anker, la lectura del reproductor, la brújula y el cielo.
function draw(dt, calm) {
  const s = ESCENA_VIVA.muestra(hour);
  const w = aguaEn(hour);
  const a = ankerEn(hour);
  for (const [key, list] of Object.entries(flows)) {
    const canal = D.flows[key];
    const v = CHANNEL[canal](s, w, a);
    const suya = PESTAÑA_CANAL[canal] ?? "energia";
    const peso = suya === modo ? 1 : suya === "energia" ? 0.25 : 0;
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
  ESCENA_VIVA.dibuja(s, hour, dt, calm);
  dibujaAgua(w);
  dibujaAnker(a);
  const text = modo === "agua" ? sayAgua(w) : modo === "anker" ? sayAnker(a) : ESCENA_VIVA.dice(s);
  if (readout.textContent !== text) readout.textContent = text;
  const time = clock(hour);
  if (clockOut.textContent !== time) {
    clockOut.textContent = time;
    scrub.setAttribute("aria-valuetext", time);
  }
  if (!scrubbing) scrub.value = String(((hour % 24) + 24) % 24);
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
  stage.setAttribute("aria-valuetext", ESCENA_VIVA.explica(target));
  clearTimeout(quiet);
  quiet = setTimeout(() => (status.textContent = ESCENA_VIVA.explica(target)), 700);
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
// ---------- zoom ----------
// Para ver de cerca: los botones − y +, la rueda (sola si la página no se mueve con ella; si no, con Ctrl), el doble
// clic (con Mayús aleja) y el pellizco acercan o alejan alrededor del puntero; con zoom, arrastrar mueve el dibujo.
// Cambia el viewBox del SVG: el dibujo queda nítido y las líneas, finas. "Ver todo" vuelve al dibujo entero.
const ZOOM = { min: 1, max: 8, paso: 1.6 };
const zoomV = doc("[data-zoom-v]");
const zoomBtn = Object.fromEntries([...document.querySelectorAll("[data-zoom]")].map((b) => [b.dataset.zoom, b]));
const vistaZoom = { z: 1, cx: VB.x + VB.w / 2, cy: VB.y + VB.h / 2 };
let animZoom = 0;
function pintaZoom() {
  const { z } = vistaZoom;
  const w = VB.w / z;
  const h = VB.h / z;
  // la vista no se sale del dibujo
  vistaZoom.cx = clamp(vistaZoom.cx, VB.x + w / 2, VB.x + VB.w - w / 2);
  vistaZoom.cy = clamp(vistaZoom.cy, VB.y + h / 2, VB.y + VB.h - h / 2);
  const r2 = (v) => Math.round(v * 100) / 100;
  svg.setAttribute("viewBox", `${r2(vistaZoom.cx - w / 2)} ${r2(vistaZoom.cy - h / 2)} ${r2(w)} ${r2(h)}`);
  const con = z > 1.001;
  stage.classList.toggle("is-zoom", con);
  zoomV.textContent = `${Math.round(z * 100)} %`;
  zoomBtn.menos.disabled = !con;
  zoomBtn.todo.disabled = !con;
  zoomBtn.mas.disabled = z >= ZOOM.max - 0.001;
}
// el punto del dibujo que está en (x, y) de la pantalla, con el zoom de ahora
function enElDibujo(x, y) {
  const m = svg.getScreenCTM();
  if (!m) return [vistaZoom.cx, vistaZoom.cy];
  const p = new DOMPoint(x, y).matrixTransform(m.inverse());
  return [p.x, p.y];
}
// zoom z con el punto p del dibujo quieto en la pantalla
function zoomA(z, p = [vistaZoom.cx, vistaZoom.cy]) {
  const z1 = clamp(z, ZOOM.min, ZOOM.max);
  const k = vistaZoom.z / z1;
  vistaZoom.cx = p[0] + (vistaZoom.cx - p[0]) * k;
  vistaZoom.cy = p[1] + (vistaZoom.cy - p[1]) * k;
  vistaZoom.z = z1;
  pintaZoom();
}
// los botones y el teclado van suave (salvo con movimiento reducido), alrededor del centro de la vista
function zoomSuave(z) {
  cancelAnimationFrame(animZoom);
  const z1 = clamp(z, ZOOM.min, ZOOM.max);
  if (still.matches) return zoomA(z1);
  const desde = vistaZoom.z;
  const centro = [vistaZoom.cx, vistaZoom.cy];
  const t0 = performance.now();
  const paso = (now) => {
    const t = Math.min(1, (now - t0) / 220);
    zoomA(desde * (z1 / desde) ** (1 - (1 - t) ** 3), centro);
    if (t < 1) animZoom = requestAnimationFrame(paso);
  };
  animZoom = requestAnimationFrame(paso);
}
zoomBtn.mas.addEventListener("click", () => zoomSuave(vistaZoom.z * ZOOM.paso));
zoomBtn.menos.addEventListener("click", () => zoomSuave(vistaZoom.z / ZOOM.paso));
zoomBtn.todo.addEventListener("click", () => zoomSuave(1));
stage.addEventListener(
  "wheel",
  (event) => {
    const pagina = document.documentElement.scrollHeight > innerHeight + 1;
    if (pagina && !event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    cancelAnimationFrame(animZoom);
    const d = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
    zoomA(vistaZoom.z * Math.exp(-d * 0.0018), enElDibujo(event.clientX, event.clientY));
  },
  { passive: false },
);
stage.addEventListener("dblclick", (event) => {
  event.preventDefault();
  // el doble clic no deja nada seleccionado (una selección se arrastra como imagen y no deja mover el dibujo)
  getSelection()?.removeAllRanges();
  cancelAnimationFrame(animZoom);
  zoomA(vistaZoom.z * (event.shiftKey ? 0.5 : 2), enElDibujo(event.clientX, event.clientY));
});
// arrastrar (con zoom) y pellizcar: los punteros que están abajo. El navegador no arrastra nada por su cuenta (ni una
// selección ni el dibujo como imagen), que si no cancela el arrastre.
const dedos = new Map();
let gesto = null;
stage.addEventListener("dragstart", (event) => event.preventDefault());
stage.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  dedos.set(event.pointerId, [event.clientX, event.clientY]);
  if (dedos.size === 2) {
    const [a, b] = [...dedos.values()];
    gesto = { tipo: "pellizco", d0: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, z0: vistaZoom.z, p: enElDibujo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) };
    cancelAnimationFrame(animZoom);
  } else if (dedos.size === 1 && vistaZoom.z > 1.001) {
    gesto = { tipo: "arrastre", x: event.clientX, y: event.clientY, cx: vistaZoom.cx, cy: vistaZoom.cy };
    stage.setPointerCapture(event.pointerId);
    stage.classList.add("is-arrastre");
    cancelAnimationFrame(animZoom);
  }
});
stage.addEventListener("pointermove", (event) => {
  if (!dedos.has(event.pointerId)) return;
  dedos.set(event.pointerId, [event.clientX, event.clientY]);
  if (gesto?.tipo === "pellizco" && dedos.size >= 2) {
    // zoom alrededor del punto que quedó entre los dedos, y que ese punto siga al medio de los dedos
    const [a, b] = [...dedos.values()];
    zoomA((gesto.z0 * (Math.hypot(a[0] - b[0], a[1] - b[1]) || 1)) / gesto.d0, gesto.p);
    const q = enElDibujo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    vistaZoom.cx += gesto.p[0] - q[0];
    vistaZoom.cy += gesto.p[1] - q[1];
    pintaZoom();
  } else if (gesto?.tipo === "arrastre") {
    const k = svg.getScreenCTM()?.a || 1;
    vistaZoom.cx = gesto.cx - (event.clientX - gesto.x) / k;
    vistaZoom.cy = gesto.cy - (event.clientY - gesto.y) / k;
    pintaZoom();
  }
});
const suelta = (event) => {
  dedos.delete(event.pointerId);
  if (gesto?.tipo === "pellizco" && dedos.size < 2) gesto = null;
  if (!dedos.size) {
    gesto = null;
    stage.classList.remove("is-arrastre");
  }
};
stage.addEventListener("pointerup", suelta);
stage.addEventListener("pointercancel", suelta);
// pantalla completa: la tarjeta sola (donde el navegador la deja; en el iPhone no)
if (document.fullscreenEnabled && mainEl.requestFullscreen) {
  zoomBtn.pantalla.hidden = false;
  zoomBtn.pantalla.addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else mainEl.requestFullscreen().catch(() => {});
  });
  document.addEventListener("fullscreenchange", () => {
    const en = document.fullscreenElement === mainEl;
    zoomBtn.pantalla.setAttribute("aria-pressed", String(en));
    zoomBtn.pantalla.setAttribute("aria-label", en ? "Salir de pantalla completa" : "Pantalla completa");
    zoomBtn.pantalla.title = en ? "Salir de pantalla completa" : "Pantalla completa";
  });
}
pintaZoom();
// "Ver adentro": las paredes y el techo de lo que va adentro (el cuarto de equipos, el apartamento) se dibujan
// transparentes; apagado, se cierran como de verdad
const paredesBtn = doc("[data-ver-adentro]");
paredesBtn.addEventListener("click", () => {
  const ver = paredesBtn.getAttribute("aria-pressed") !== "true";
  paredesBtn.setAttribute("aria-pressed", String(ver));
  if (ver) delete mainEl.dataset.paredes;
  else mainEl.dataset.paredes = "cerradas";
  // la sombra del techo vuelve (o se va) con las paredes
  sombra.version++;
  if (!frame) draw(0, true);
});

stage.addEventListener("keydown", (event) => {
  if (event.key === " ") {
    event.preventDefault();
    setPlaying(!playing);
    return;
  }
  const zoomTecla = { "+": ZOOM.paso, "=": ZOOM.paso, "-": 1 / ZOOM.paso, _: 1 / ZOOM.paso }[event.key];
  if (zoomTecla || event.key === "0") {
    event.preventDefault();
    zoomSuave(zoomTecla ? vistaZoom.z * zoomTecla : 1);
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
stage.addEventListener("focus", () => (status.textContent = ESCENA_VIVA.explica(target)));

// ---------- tema ----------
// (antes del primer cálculo del día no hay qué dibujar: `agua` todavía no existe)
const setTheme = (theme) => {
  document.body.dataset.theme = theme;
  themeButton.setAttribute("aria-pressed", String(theme === "dark"));
  themeButton.textContent = theme === "dark" ? "Tema claro" : "Tema oscuro";
  leerFuerza();
  if (!frame && agua) draw(0, true);
};
themeButton.addEventListener("click", () => {
  const next = document.body.dataset.theme === "dark" ? "light" : "dark";
  try {
    localStorage.setItem("sr-theme", next);
  } catch {}
  setTheme(next);
});

// ---------- arranque ----------
// Lo llama la escena al final de su parte, cuando ya están sus ganchos.
function arrancar() {
  setPlaying(playing);
  let saved = null;
  try {
    saved = localStorage.getItem("sr-theme");
  } catch {}
  setTheme(saved === "dark" ? "dark" : "light");
  ESCENA_VIVA.arranca();
  // el panel con lo que se ve de cada paso y sus números, ya desde el principio
  marcarOpciones();
  medirVista();
  new ResizeObserver(() => {
    medirVista();
    if (!frame && agua) draw(0, true);
  }).observe(stage);
  recompute({ calm: true });
  stage.setAttribute("aria-valuetext", ESCENA_VIVA.explica(target));
  draw(0, true);
}
