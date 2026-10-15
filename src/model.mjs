// Modelo de energía: dimensionamiento por factura de 12 meses y el día de un mes.
// Corre igual en Node (build) y en la página (se incrusta sin los `export`).
// Las cifras marcadas "cotizador" son las de la herramienta LUMA de Sun Bot (Windmar Home);
// las marcadas "supuesto" son del dibujo y lo dice el pie de figura.

export const BASE = {
  vatios: 410,                // placa nueva QCells Q.PEAK DUO BLK ML-G10+ 410 (cotizador)
  vatiosExistentes: 330,      // vataje por defecto de las placas que el cliente ya tiene (cotizador)
  horasSol: 4.5,              // horas de sol pico en PR, NREL; el mismo todo el año (cotizador)
  rendimiento: 0.82,          // inversor, cableado, suciedad y temperatura (cotizador)
  holgura: 1.1,               // la meta es el mayor entre 110 % del promedio y el mes pico (cotizador)
  bateria: 13.5,              // kWh por Powerwall (cotizador)
  cubreBateria: 0.5,          // la batería cubre ~50 % del consumo diario, mínimo 1 (cotizador)
  placasConBateria: 8,        // con batería, el cotizador pide al menos 8 placas
  reserva: 0.2,               // supuesto: reserva de respaldo que la batería no entrega
  mediodia: 12 + 25 / 60,     // supuesto: mediodía solar en San Juan (AST) en el equinoccio
  forma: 1.2,                 // supuesto: producción ∝ cos(ángulo horario)^1.2 en un día promedio
};
export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const LIMITES = { mes: [0, 3000], placas: 32, baterias: [0, 4], vatios: [200, 500] };
// Factura de ejemplo: promedio 600 y pico 700 kWh (agosto), con el verano más alto por el aire.
export const EJEMPLO = { meses: [540, 520, 540, 560, 600, 660, 690, 700, 670, 610, 560, 550], existentes: { n: 0, w: BASE.vatiosExistentes }, mes: 7 };

export const kwhPorPlacaDia = (w) => (w / 1000) * BASE.horasSol * BASE.rendimiento;

// Regla del cotizador de LUMA, también para clientes que ya tienen placas:
// meta = max(promedio × 1.10, pico); kW necesarios = (meta / 30) / (4.5 × 0.82);
// placas nuevas = ceil((kW necesarios − kW existentes) × 1000 / 410); Powerwall = max(1, ceil(50 % del diario / 13.5)).
export function sugerencia(meses, existentes) {
  const promedio = meses.reduce((a, b) => a + b, 0) / meses.length;
  const pico = Math.max(...meses);
  const meta = Math.max(promedio * BASE.holgura, pico);
  const diario = meta / 30;
  const kwNecesario = diario / (BASE.horasSol * BASE.rendimiento);
  const kwExistente = (existentes.n * existentes.w) / 1000;
  const faltan = Math.max(0, kwNecesario - kwExistente);
  const nuevas = Math.ceil(Math.round(faltan * 1e6) / 1e3 / BASE.vatios);
  const baterias = Math.max(1, Math.ceil((diario * BASE.cubreBateria) / BASE.bateria));
  return { promedio, pico, meta, diario, kwNecesario, kwExistente, nuevas, baterias };
}
export const produccionDia = ({ existentes, nuevas }) => existentes.n * kwhPorPlacaDia(existentes.w) + nuevas * kwhPorPlacaDia(BASE.vatios);
// Horas de respaldo de la herramienta Enseres de Sun Bot: min(24, baterías × 13.5 ÷ kWh al día × 24).
export const respaldoHoras = (baterias, diario) => (diario > 0 ? Math.min(24, ((baterias * BASE.bateria) / diario) * 24) : 24);

const RAD = Math.PI / 180;
export const SALIDA = BASE.mediodia - 6;
export const PUESTA = BASE.mediodia + 6;
const forma = (t) => {
  const c = Math.cos((t - BASE.mediodia) * 15 * RAD);
  return c > 0 ? c ** BASE.forma : 0;
};
const integral = (f) => {
  const n = 2880;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += f(((i + 0.5) / n) * 24);
  return (sum * 24) / n;
};
const HORAS_FORMA = integral(forma);

// Consumo por hora: supuesto de una casa típica (nevera y fondo todo el día, mañana, almuerzo,
// aire de la tarde, pico de la noche y aire del cuarto), escalado al consumo del mes.
const BUMPS = [
  [6.9, 0.7, 0.8],
  [12.6, 1.6, 0.35],
  [15.5, 1.8, 0.4],
  [19.6, 1.5, 1.25],
  [23.6, 2.4, 0.7],
];
const crudo = (t) => {
  let sum = 0.42;
  for (const [at, width, height] of BUMPS) for (const shift of [-24, 0, 24]) sum += height * Math.exp(-0.5 * ((t - at - shift) / width) ** 2);
  return sum;
};
const HORAS_CONSUMO = integral(crudo);

// Un día del mes elegido: las placas cubren la casa, el excedente carga la batería y el resto sale a LUMA;
// sin sol, la batería entrega hasta su reserva y después entra LUMA. Sin pérdidas de batería (supuesto).
export function simulate({ diaPV, baterias, diaCasa }, steps = 288) {
  const dt = 24 / steps;
  const cap = baterias * BASE.bateria;
  const pico = diaPV / HORAS_FORMA;
  const escala = diaCasa / HORAS_CONSUMO;
  const pvAt = (t) => pico * forma(t);
  const loadAt = (t) => crudo(t) * escala;
  let soc = cap * 0.5;
  let rows = [];
  for (let day = 0; day < 6; day++) {
    rows = [];
    let sent = 0;
    let taken = 0;
    for (let i = 0; i <= steps; i++) {
      const t = i * dt;
      const pv = pvAt(t);
      const load = loadAt(t);
      const surplus = pv - load;
      let batt = 0;
      let grid;
      if (surplus >= 0) {
        batt = cap ? Math.min(surplus, (cap - soc) / dt) : 0;
        grid = surplus - batt;
      } else {
        const out = cap ? Math.min(-surplus, Math.max(0, soc - BASE.reserva * cap) / dt) : 0;
        batt = -out;
        grid = surplus + out;
      }
      rows.push({ t, pv, load, batt, grid, soc: cap ? soc / cap : 0, net: sent - taken });
      if (i < steps) {
        soc = Math.min(cap, Math.max(0, soc + batt * dt));
        sent += Math.max(0, grid) * dt;
        taken += Math.max(0, -grid) * dt;
      }
    }
  }
  return { rows, pico, diaPV, diaCasa };
}
