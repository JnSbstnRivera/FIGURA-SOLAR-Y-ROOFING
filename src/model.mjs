// Modelo de energía de un día: producción, consumo, batería y LUMA.
// Corre igual en Node (build) y en la página (se incrusta sin los `export`).
// Las cifras marcadas "cotizador" son las de la herramienta LUMA de Sun Bot (Windmar Home);
// las marcadas "supuesto" son del dibujo y lo dice el pie de figura.

export const BASE = {
  vatios: 410,                // placa QCells Q.PEAK DUO BLK ML-G10+ 410 (cotizador)
  horasSol: 4.5,              // horas de sol pico en PR, NREL (cotizador)
  rendimiento: 0.82,          // inversor, cableado, suciedad y temperatura (cotizador)
  holgura: 1.1,               // la meta es el mayor entre 110 % del promedio y el mes pico (cotizador)
  bateria: 13.5,              // kWh por Powerwall (cotizador)
  cubreBateria: 0.5,          // la batería cubre ~50 % del consumo diario, mínimo 1 (cotizador)
  reserva: 0.2,               // supuesto: reserva de respaldo que la batería no entrega
  mediodia: 12 + 25 / 60,     // supuesto: mediodía solar en San Juan (AST) en el equinoccio
  forma: 1.2,                 // supuesto: producción ∝ cos(ángulo horario)^1.2 en un día promedio
};
export const LIMITES = { promedio: [300, 1300], pico: [300, 1450], placas: 32 };

export const porPlaca = () => (BASE.vatios / 1000) * BASE.horasSol * BASE.rendimiento;

// Regla del cotizador de LUMA: meta = max(promedio × 1.10, pico); kW = (meta / 30) / (4.5 × 0.82);
// placas = ceil(kW × 1000 / 410); Powerwall = max(1, ceil(50 % del consumo diario / 13.5)).
export function sistemaPara({ promedio, pico }) {
  const meta = Math.max(promedio * BASE.holgura, pico);
  const diario = meta / 30;
  const kw = diario / (BASE.horasSol * BASE.rendimiento);
  const placas = Math.ceil(Math.round(kw * 1e6) / 1e3 / BASE.vatios);
  const baterias = Math.max(1, Math.ceil((diario * BASE.cubreBateria) / BASE.bateria));
  return { meta, diario, placas, baterias, kwp: (placas * BASE.vatios) / 1000, promedio, pico };
}

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

// Autoconsumo: las placas cubren la casa, el excedente carga la batería y el resto sale a LUMA;
// sin sol, la batería entrega hasta su reserva y después entra LUMA. Sin pérdidas de batería (supuesto).
export function simulate({ placas, baterias, promedio }, steps = 288) {
  const dt = 24 / steps;
  const cap = baterias * BASE.bateria;
  const diaPV = placas * porPlaca();
  const pico = diaPV / HORAS_FORMA;
  const escala = promedio / 30 / HORAS_CONSUMO;
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
      let batt;
      let grid;
      if (surplus >= 0) {
        batt = Math.min(surplus, (cap - soc) / dt);
        grid = surplus - batt;
      } else {
        const out = Math.min(-surplus, Math.max(0, soc - BASE.reserva * cap) / dt);
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
  return { rows, pico, diaPV, diaCasa: promedio / 30 };
}
