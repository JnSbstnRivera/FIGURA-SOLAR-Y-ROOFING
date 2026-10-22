// Anker SOLIX con sus placas PS400 (o el E10 con las suyas): un sistema aparte de las placas del techo, que alimenta
// lo esencial de la casa por su transfer switch. De día las placas cubren lo esencial y lo que sobra carga la batería;
// de noche lo da la batería, y si llega a su reserva, el generador (si el E10 lo lleva) o LUMA. Corre igual en Node (build) y en la página (se incrusta sin los `export`).
// Los equipos y sus números (kWh, kW) están en productos.mjs; lo marcado "supuesto" es del dibujo y lo dice el pie.

export const ANKER = {
  ps400: 0.4,     // kW de cada placa PS400 (ficha de Anker)
  rinde: 0.85,    // supuesto: lo que entregan las PS400 de su potencia con el sol (calor, cables y el ángulo de sus patas)
  reserva: 0.1,   // supuesto: la batería no baja de 10 %
  hastaGen: 0.8,  // supuesto: el generador, cuando arranca en la reserva, carga hasta 80 %
};

// Lo esencial de la casa (supuesto), en kW a cada hora: la nevera y el internet todo el día, las luces al anochecer
// y un poco al amanecer, y los abanicos de noche y en la tarde. Unos 7.4 kWh al día.
export function esencialEn(t) {
  let kw = 0.2;
  if (t >= 18.5 && t < 23) kw += 0.15;
  if (t >= 5.5 && t < 7) kw += 0.05;
  if (t >= 21 || t < 6) kw += 0.15;
  if (t >= 13 && t < 18) kw += 0.1;
  return kw;
}

// Un día del Anker, paso por paso. `kwh` es la batería (la del modelo si no se dice); `placas` cuántas lleva (las que
// trae su modelo si no se dice) y `kwPlaca` lo que da cada una (0.4 la PS400); `sol` es el sol sobre las placas en W/m²
// en cada paso (pasos + 1 valores), con lo que les tapan las sombras; `generador` los kW del generador (0 si no hay).
// Sin placas es un respaldo nada más: se mantiene lleno con LUMA, que da lo esencial, y entra solo en un apagón.
export function simularAnker({ modelo, sol, placas = modelo.ps400, kwh = modelo.kwh, kwPlaca = ANKER.ps400, generador = 0 }, pasos = 288) {
  const dt = 24 / pasos;
  const cap = kwh;
  const piso = cap * ANKER.reserva;
  let carga = cap;
  let filas = [];
  let solDia = 0;
  let esencialDia = 0;
  let lumaDia = 0;
  let genDia = 0;
  let prendido = false;
  // el día se repite hasta que la carga de la madrugada se acomoda
  for (let dia = 0; dia < 4; dia++) {
    filas = [];
    solDia = 0;
    esencialDia = 0;
    lumaDia = 0;
    genDia = 0;
    for (let i = 0; i <= pasos; i++) {
      const t = i * dt;
      const puede = (placas * kwPlaca * ANKER.rinde * Math.max(0, sol[i] ?? 0)) / 1000;
      const esencial = esencialEn(t);
      // el generador arranca cuando la batería llega a su reserva y para cuando la subió hasta hastaGen
      if (generador && carga <= piso + cap * 0.005) prendido = true;
      if (prendido && carga >= cap * ANKER.hastaGen) prendido = false;
      // de las placas primero a lo esencial; lo que sobra carga la batería hasta llenarla (lo demás no se usa); lo
      // que falta lo da el generador si está prendido (que con lo que le sobra carga la batería), si no la batería
      // hasta su reserva, y después LUMA
      let bateria = 0;
      let luma = 0;
      let gen = 0;
      if (!placas) luma = esencial;
      else if (prendido) {
        gen = Math.min(generador, Math.max(0, esencial - puede) + (cap - carga) / dt);
        bateria = Math.min(puede + gen - esencial, (cap - carga) / dt);
      } else if (puede >= esencial) bateria = Math.min(puede - esencial, (cap - carga) / dt);
      else {
        bateria = -Math.min(esencial - puede, Math.max(0, (carga - piso) / dt));
        luma = esencial - puede + bateria;
      }
      const ps400 = Math.min(puede, esencial + Math.max(0, bateria));
      filas.push({ t, puede, ps400, esencial, bateria, luma, gen, anker: esencial - luma, soc: carga / cap });
      if (i === pasos) break;
      carga = Math.min(cap, Math.max(piso, carga + bateria * dt));
      solDia += ps400 * dt;
      esencialDia += esencial * dt;
      lumaDia += luma * dt;
      genDia += gen * dt;
    }
  }
  return {
    filas,
    solDia,
    esencialDia,
    lumaDia,
    genDia,
    // sin LUMA ni sol, la batería sola con lo esencial (como la fórmula de Enseres, desde la carga llena hasta la reserva)
    horas: (cap * (1 - ANKER.reserva)) / (esencialDia / 24),
  };
}
