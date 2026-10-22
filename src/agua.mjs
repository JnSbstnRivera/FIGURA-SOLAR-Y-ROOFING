// Agua: cuánta usa la casa (o el apartamento), cuánto le dura la cisterna, cuánto calienta el calentador solar y
// cuánta agua de beber da la ósmosis en el día.
// Corre igual en Node (build) y en la página (se incrusta sin los `export`).
// Los equipos y la regla del calentador por personas (productos.mjs) son del cotizador Water de Sun Bot; lo
// marcado "supuesto" es del dibujo y lo dice el pie de figura.

export const AGUA = {
  porPersona: 50,          // supuesto: galones al día por persona (Juan, 21-oct-2026)
  calientePorPersona: 15,  // supuesto: galones de agua caliente al día por persona
  fria: 80,                // supuesto: °F del agua que llega
  uso: 120,                // supuesto: °F a la que se usa el agua caliente
  aire: 82,                // supuesto: °F del aire alrededor del tanque
  colector: 1.668,         // m² de un colector Soltek de 34" × 76" (cotizador)
  eficiencia: 0.5,         // supuesto: parte del sol que el colector le pasa al agua
  perdida: 0.006,          // supuesto: parte de la diferencia con el aire que el tanque pierde por hora
  resistencia: 4.5,        // kW de la resistencia de respaldo (cotizador)
  maximo: 160,             // supuesto: °F a la que el tanque deja de calentar
  llenado: 300,            // supuesto: galones por hora que entran de la AAA cuando hay servicio
  beber: 1,                // supuesto: galones al día por persona de agua de beber y cocinar (la de la ósmosis)
  personas: [1, 10],
};

// Reparto del uso en el día (supuesto): los baños de la mañana y de la noche, la cocina al mediodía y
// en la tarde, y un poco a toda hora. Cada reparto suma 1 en las 24 horas.
const repartir = (bumps, base) => {
  const crudo = (t) => {
    let sum = base;
    for (const [at, ancho, alto] of bumps) for (const vuelta of [-24, 0, 24]) sum += alto * Math.exp(-0.5 * ((t - at - vuelta) / ancho) ** 2);
    return sum;
  };
  let area = 0;
  for (let i = 0; i < 2880; i++) area += (crudo(((i + 0.5) / 2880) * 24) * 24) / 2880;
  return (t) => crudo(t) / area;
};
const USO = repartir([[6.8, 0.8, 1.0], [12.5, 1.2, 0.35], [15.8, 1.4, 0.25], [19.3, 1.0, 0.9], [21.6, 1.0, 0.4]], 0.04);
const CALIENTE = repartir([[6.7, 0.7, 1.0], [12.6, 1.0, 0.12], [19.4, 0.9, 0.85]], 0.005);
// el agua de beber y cocinar: el café de la mañana, el almuerzo y la cena
const BEBER = repartir([[6.9, 0.6, 0.8], [12.3, 0.8, 1.0], [18.8, 0.9, 1.0]], 0.05);

// Un día de agua, paso por paso. `poa` es el sol sobre el plano de los colectores (W/m², pasos + 1 valores)
// y `cortado` dice si la AAA no da servicio (la cisterna no se llena y baja con lo que se usa).
export function simularAgua({ personas, calentador = null, cisterna = null, cortado = false, poa = null }, pasos = 288) {
  const dt = 24 / pasos;
  const usoDia = personas * AGUA.porPersona;
  const calienteDia = personas * AGUA.calientePorPersona;
  const potableDia = personas * AGUA.beber;
  const masa = calentador ? calentador.real * 8.34 : 0; // BTU por °F: libras de agua del tanque
  const area = calentador ? calentador.colectores * AGUA.colector : 0;
  let T = AGUA.uso;
  let filas = [];
  let resistencia = 0;
  // el día se repite hasta que la temperatura de la mañana se acomoda
  for (let dia = 0; dia < 5; dia++) {
    filas = [];
    resistencia = 0;
    let nivel = 1;
    for (let i = 0; i <= pasos; i++) {
      const t = i * dt;
      const fria = usoDia * USO(t);
      const caliente = calienteDia * CALIENTE(t);
      const sol = poa ? Math.max(0, poa[i]) : 0;
      const elec = calentador && T < AGUA.uso && caliente > 0.2 ? AGUA.resistencia : 0;
      filas.push({ t, fria, caliente, potable: potableDia * BEBER(t), sol, T, nivel, elec, calor: area * sol * AGUA.eficiencia });
      if (i === pasos) break;
      if (calentador) {
        const solar = T < AGUA.maximo ? area * sol * AGUA.eficiencia * 3.412 : 0;
        const sale = caliente * 8.34 * Math.max(0, T - AGUA.fria);
        const pierde = masa * AGUA.perdida * (T - AGUA.aire);
        T = Math.max(AGUA.fria, T + ((solar - sale - pierde + elec * 3412) * dt) / masa);
        resistencia += elec * dt;
      }
      if (cisterna) {
        const entra = cortado ? 0 : Math.min(AGUA.llenado, fria + ((1 - nivel) * cisterna.gal) / dt);
        nivel = Math.min(1, Math.max(0, nivel + ((entra - fria) * dt) / cisterna.gal));
      }
    }
  }
  // lo que gastaría una resistencia eléctrica sola (95 % de eficiencia) para el mismo agua caliente
  const electrico = (calienteDia * 8.34 * (AGUA.uso - AGUA.fria)) / 3412 / 0.95;
  return {
    filas,
    usoDia,
    calienteDia,
    potableDia,
    reserva: cisterna ? cisterna.gal / usoDia : 0,
    resistencia,
    ahorroMes: calentador ? Math.max(0, electrico - resistencia) * 30 : 0,
    maxima: Math.max(...filas.map((f) => f.T)),
  };
}
