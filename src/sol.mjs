// Sol, luna y sombras: el día del equinoccio en San Juan, el rumbo de las placas y el sol que de
// verdad le llega a cada una (el acceso solar, el TOF y el TSRF que muestra Aurora).
// Corre igual en Node (build) y en la página (se incrusta sin los `export`).
//
// Fuentes:
// - PVWatts v8 de NREL (hoy NLR), año típico NSRDB PSM V3 tmy-2020 de San Juan (18.45, −66.10),
//   1 kW, pérdidas estándar de 14 %: kWh por kW al año y sol en el plano para cada rumbo a 10°.
// - Año típico de PVGIS (base PVGIS-NSRDB, la misma familia de datos) en el mismo punto: sol directo
//   y difuso de cada mes, hora por hora, para pesar las sombras como lo hace Aurora.

export const SOL = {
  lat: 18.4655,
  lon: -66.1057,
  inclinacion: 10,              // las patas de la estructura del dibujo (BETA en build.mjs)
  // Rumbo = hacia dónde miran las placas, en grados desde el norte (en el sentido del reloj).
  // kwh: kWh por kW al año; poa: sol en el plano de las placas, kWh/m² al día (PVWatts v8).
  rumbos: [
    { az: 0, corto: "N", nombre: "Norte", kwh: 1466.9, poa: 5.329 },
    { az: 45, corto: "NE", nombre: "Noreste", kwh: 1498.2, poa: 5.439 },
    { az: 90, corto: "E", nombre: "Este", kwh: 1553.6, poa: 5.637 },
    { az: 135, corto: "SE", nombre: "Sureste", kwh: 1600.1, poa: 5.806 },
    { az: 180, corto: "S", nombre: "Sur", kwh: 1612.8, poa: 5.851 },
    { az: 225, corto: "SO", nombre: "Suroeste", kwh: 1583.3, poa: 5.748 },
    { az: 270, corto: "O", nombre: "Oeste", kwh: 1529.6, poa: 5.554 },
    { az: 315, corto: "NO", nombre: "Noroeste", kwh: 1481.0, poa: 5.379 },
  ],
  // El mejor plano en San Juan mira al sur a unos 16.6°: la curva por los tres puntos de PVWatts
  // al sur (0°: 5.647, 10°: 5.851, 15°: 5.887 kWh/m² al día) llega a 5.889. Es la base del TOF.
  poaOptimo: 5.889,
  // Día típico de cada mes (Klein) y cuántos días pesa en el año.
  diaTipico: [17, 47, 75, 105, 135, 162, 198, 228, 258, 288, 318, 344],
  diasMes: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
  // Promedio de cada mes a cada hora de Puerto Rico (0 a 23), W/m², del año típico de PVGIS.
  directo: [
    [0, 0, 0, 0, 0, 0, 0, 0, 391, 523, 561, 674, 652, 616, 539, 489, 552, 443, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 15, 549, 662, 731, 686, 736, 710, 642, 549, 491, 418, 222, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 232, 578, 762, 801, 774, 831, 819, 811, 763, 660, 541, 222, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 267, 473, 458, 551, 553, 514, 515, 579, 559, 440, 383, 192, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 277, 481, 516, 493, 444, 437, 444, 360, 386, 320, 279, 143, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 312, 424, 531, 557, 526, 496, 465, 465, 387, 372, 319, 177, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 191, 340, 421, 526, 552, 518, 482, 390, 392, 360, 284, 125, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 216, 452, 498, 583, 585, 577, 500, 446, 453, 392, 310, 140, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 238, 419, 478, 499, 537, 493, 481, 438, 332, 321, 254, 22, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 333, 634, 763, 772, 770, 745, 635, 648, 665, 560, 396, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 190, 546, 679, 712, 724, 724, 637, 570, 568, 522, 395, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 39, 375, 532, 591, 652, 687, 668, 594, 556, 511, 479, 0, 0, 0, 0, 0, 0],
  ],
  difuso: [
    [0, 0, 0, 0, 0, 0, 0, 0, 51, 83, 127, 162, 175, 191, 179, 155, 101, 63, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 7, 61, 93, 126, 175, 183, 193, 178, 174, 126, 71, 29, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 34, 85, 108, 137, 167, 158, 160, 164, 147, 125, 94, 56, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 59, 119, 168, 200, 272, 308, 273, 262, 215, 174, 101, 51, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 4, 77, 135, 196, 258, 324, 356, 330, 325, 262, 171, 120, 60, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 7, 79, 132, 189, 231, 298, 312, 303, 272, 248, 174, 129, 76, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 79, 142, 214, 234, 271, 297, 290, 276, 252, 227, 166, 92, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 65, 128, 184, 221, 255, 277, 273, 270, 235, 195, 136, 69, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 49, 101, 147, 206, 244, 278, 300, 271, 235, 161, 93, 27, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 44, 80, 101, 132, 150, 191, 219, 183, 135, 108, 65, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 29, 75, 104, 119, 138, 177, 179, 182, 146, 95, 47, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 8, 64, 104, 132, 155, 167, 188, 187, 143, 91, 46, 0, 0, 0, 0, 0, 0],
  ],
};

const GRADO = Math.PI / 180;
export const rumboDe = (az) => SOL.rumbos.find((r) => r.az === az) ?? SOL.rumbos[4];
// Lo que da cada rumbo frente al sur, sin sombras (PVWatts): con el sur, la figura es el cotizador.
export const factorRumbo = (az) => rumboDe(az).kwh / rumboDe(180).kwh;
// TOF de Aurora: el sol en el plano de las placas frente al mejor plano posible en San Juan.
export const tofDe = (az) => rumboDe(az).poa / SOL.poaOptimo;

// Posición del sol: altura y acimut (desde el norte, en el sentido del reloj), en radianes.
export function solEn(declinacion, horaSolar) {
  const H = (horaSolar - 12) * 15 * GRADO;
  const f = SOL.lat * GRADO;
  const este = -Math.cos(declinacion) * Math.sin(H);
  const norte = Math.sin(declinacion) * Math.cos(f) - Math.cos(declinacion) * Math.sin(f) * Math.cos(H);
  const arriba = Math.sin(f) * Math.sin(declinacion) + Math.cos(f) * Math.cos(declinacion) * Math.cos(H);
  return { alt: Math.asin(Math.max(-1, Math.min(1, arriba))), az: Math.atan2(este, norte) };
}
// El día de la figura es el del equinoccio (declinación 0), con el mediodía solar del modelo.
export const solDelDia = (hora, mediodia) => solEn(0, 12 + hora - mediodia);
// La luna llena de esa noche está justo enfrente del sol: sale cuando él se pone.
export const lunaDelDia = (hora, mediodia) => {
  const s = solDelDia(hora, mediodia);
  return { alt: -s.alt, az: s.az + Math.PI };
};
// El día típico de un mes, a una hora de Puerto Rico (AST), con la ecuación del tiempo.
export function solDelMes(m, hora) {
  const n = SOL.diaTipico[m];
  const declinacion = 23.45 * GRADO * Math.sin((2 * Math.PI * (284 + n)) / 365);
  const B = (2 * Math.PI * (n - 81)) / 364;
  const minutos = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  return solEn(declinacion, hora + (4 * (SOL.lon + 60) + minutos) / 60);
}
// Una dirección del cielo en las coordenadas de la casa (x hacia donde miran las placas, y a la derecha
// de quien mira hacia allá, z arriba), para placas que miran al acimut `rumbo` (radianes). El kit dibuja
// de x a y en el sentido del reloj visto desde arriba, como crece el acimut: así el dibujo no sale en espejo.
export function haciaCasa({ alt, az }, rumbo) {
  const c = Math.cos(alt);
  const p = az - rumbo;
  return [c * Math.cos(p), c * Math.sin(p), Math.sin(alt)];
}
export const normalPlacas = () => [Math.sin(SOL.inclinacion * GRADO), 0, Math.cos(SOL.inclinacion * GRADO)];
const cieloQueVen = () => (1 + Math.cos(SOL.inclinacion * GRADO)) / 2;
// Sol directo y difuso de un mes a una hora cualquiera (interpolado entre las horas de la tabla).
function cieloEn(tabla, m, hora) {
  const h = ((hora % 24) + 24) % 24;
  const i = Math.floor(h);
  const f = h - i;
  return tabla[m][i] * (1 - f) + tabla[m][(i + 1) % 24] * f;
}
// El día del equinoccio de la figura: el promedio de marzo y septiembre.
const cieloDelDia = (tabla, hora) => (cieloEn(tabla, 2, hora) + cieloEn(tabla, 8, hora)) / 2;

// ---------- sólidos para las sombras ----------
const resta = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const punto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// Un sólido convexo con dos anillos del mismo número de puntos (abajo y arriba): una caja, un
// cilindro, un poste que se afina o una placa inclinada. Guarda sus aristas para proyectar su
// sombra y sus planos (normal hacia afuera, n·p ≤ k adentro) para saber si tapa un rayo.
export function solido(abajo, arriba, extra = {}) {
  const n = abajo.length;
  const v = [...abajo, ...arriba];
  const e = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    e.push([i, j], [n + i, n + j], [i, n + i]);
  }
  const c = v.reduce((a, p) => [a[0] + p[0] / v.length, a[1] + p[1] / v.length, a[2] + p[2] / v.length], [0, 0, 0]);
  const r = Math.max(...v.map((p) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2])));
  const planos = [];
  const plano = (a, b, d) => {
    let m = cruz(resta(b, a), resta(d, a));
    const L = Math.hypot(m[0], m[1], m[2]);
    if (L < 1e-9) return;
    m = m.map((x) => x / L);
    let k = punto(m, a);
    if (punto(m, c) > k) {
      m = m.map((x) => -x);
      k = -k;
    }
    planos.push([m[0], m[1], m[2], k]);
  };
  for (let i = 0; i < n; i++) plano(abajo[i], abajo[(i + 1) % n], arriba[i]);
  plano(abajo[0], abajo[1], abajo[2]);
  plano(arriba[0], arriba[1], arriba[2]);
  return { v, e, c, r, planos, ...extra };
}
// ¿El rayo que sale de `o` en la dirección `d` (unitaria) pasa por el sólido?
export function tapa(o, d, s) {
  const w = resta(s.c, o);
  const t0 = punto(w, d);
  if (t0 < -s.r || punto(w, w) - t0 * t0 > s.r * s.r) return false;
  let entra = 1e-4;
  let sale = Infinity;
  for (const [nx, ny, nz, k] of s.planos) {
    const den = nx * d[0] + ny * d[1] + nz * d[2];
    const num = k - (nx * o[0] + ny * o[1] + nz * o[2]);
    if (Math.abs(den) < 1e-12) {
      if (num < 0) return false;
      continue;
    }
    const t = num / den;
    if (den < 0) {
      if (t > entra) entra = t;
    } else if (t < sale) sale = t;
    if (entra > sale) return false;
  }
  return true;
}
// Parte de una placa a la que le da el sol directo: sus puntos de muestra que no tapa nadie.
export function soleado(placa, s, solidos) {
  let libres = 0;
  for (const p of placa.puntos) {
    let tapado = false;
    for (const k of solidos) {
      if (k.id !== placa.id && tapa(p, s, k)) {
        tapado = true;
        break;
      }
    }
    if (!tapado) libres++;
  }
  return libres / placa.puntos.length;
}

// Acceso solar de cada placa en el año, como Aurora: de todo el sol que le llegaría (directo en su
// plano más el difuso del cielo que ve), qué parte le llega con las sombras. Cada mes pesa por sus
// días; dentro del mes, cada media hora de su día típico.
export function accesoSolar(placas, solidos, rumbo) {
  const n = normalPlacas();
  const cielo = cieloQueVen();
  const llega = placas.map(() => 0);
  const podria = placas.map(() => 0);
  for (let m = 0; m < 12; m++) {
    for (let h = 5; h <= 20; h += 0.5) {
      const sol = solDelMes(m, h);
      if (sol.alt <= 0) continue;
      const s = haciaCasa(sol, rumbo);
      const directo = cieloEn(SOL.directo, m, h) * Math.max(0, punto(n, s));
      const difuso = cieloEn(SOL.difuso, m, h) * cielo;
      if (directo + difuso <= 0) continue;
      const peso = SOL.diasMes[m];
      placas.forEach((placa, i) => {
        const libre = directo > 0 ? soleado(placa, s, solidos) : 1;
        llega[i] += peso * (directo * libre + difuso);
        podria[i] += peso * (directo + difuso);
      });
    }
  }
  return placas.map((_, i) => (podria[i] > 0 ? llega[i] / podria[i] : 1));
}
// Forma de la producción en el día del equinoccio (sin escala), paso por paso: el sol directo sobre
// el plano de las placas (por la parte de cada una que no está en sombra) más el difuso del cielo.
// `libre(i, s)` dice qué parte del techo instalado está al sol en el paso i. `n` es la normal de otro plano, en
// las coordenadas de la casa (las PS400 del balcón, más paradas): ve el cielo que deja su inclinación.
export function formaDelDia(pasos, rumbo, mediodia, libre, n = normalPlacas()) {
  const cielo = (1 + n[2]) / 2;
  return Array.from({ length: pasos + 1 }, (_, i) => {
    const hora = (i / pasos) * 24;
    const sol = solDelDia(hora, mediodia);
    if (sol.alt <= 0) return 0;
    const s = haciaCasa(sol, rumbo);
    const coseno = punto(n, s);
    const directo = coseno > 0 ? cieloDelDia(SOL.directo, hora) * coseno * libre(i, s) : 0;
    return directo + cieloDelDia(SOL.difuso, hora) * cielo;
  });
}
