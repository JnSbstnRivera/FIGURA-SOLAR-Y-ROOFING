// Fig 2 · Un apartamento en Puerto Rico con lo de Windmar que va adentro (Windmar Home, PR). Página suelta en
// public/apartamento.html; build.mjs la arma después de la casa.
//   node src/apartamento.mjs           → public/apartamento.html
//   node src/apartamento.mjs --audit   → además corre la auditoría de geometría de Anatomy
// El plano (productos.mjs) se carga después de decirle la escena: así quedan los modelos del apartamento.
import * as k from "../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../vendor/anatomy/kit/lathe.mjs";
import * as A from "../vendor/anatomy/kit/audit.mjs";
import { AGUA } from "./agua.mjs";
import { ANKER as ANKER_MODELO, esencialEn } from "./anker.mjs";
import { taller } from "./taller.mjs";
import { PULG, PS400_MEDIDAS, PS200_MEDIDAS, normalPs400, piezas } from "./piezas.mjs";
import { escribirPagina, stepper, seccionDe, respaldoHtml, rumbosHtml, tag } from "./pagina.mjs";

globalThis.ESCENA_FIGURA = "apartamento";
const { PRODUCTOS, nuncaJuntas } = await import("./productos.mjs");

const pctN = (f) => `${Math.round(f * 100)} %`;
const W = 760;
const AZ = 52;
const EL = 33;

// ---------- mundo: x = sur, y = oeste, z = arriba (unas 10.5 unidades por metro), como en la casa ----------
// El apartamento como una casa de muñecas, con la cámara al suroeste: el piso, las paredes norte y este enteras (sus
// caras de adentro miran a la cámara) y las del sur y el oeste también, pero transparentes, como el techo y los
// tabiques, para ver adentro ("Ver adentro" los cierra). Tiene sala con cocina, una alcoba y un baño: la cocina va
// contra la pared norte, el panel de breakers contra la este, la alcoba y el baño al oeste, detrás de un tabique, y el
// balcón al sur, abierto al cielo. Mide unos 6.9 × 8 m.
const AP = { x0: -42, x1: 30, y0: -36, y1: 48 };
const MURO = 1.6;
const PISO = 2.6;
const ALTO = 27;
const BALCON = { x0: AP.x1 + MURO, x1: AP.x1 + MURO + 17, y0: AP.y0 - MURO, y1: AP.y1 + MURO, z: PISO - 0.4 };
const PUERTA = { y0: -26, y1: 8, alto: 22 };
// la alcoba y el baño: un tabique corre de norte a sur en y (con una puerta a cada cuarto) y otro los separa en x
const TABIQUE = 0.8;
const CUARTOS = { y: 22, x: -16, puertas: [[-24.5, -18.5], [18, 25]], alto: 21 };
// la alcoba: la cama doble (1.4 × 1.9 m) con la cabecera contra la pared oeste, dos mesitas y una cómoda baja contra el
// tabique del baño (un ropero alto taparía el baño)
const CAMA = { x0: 1, x1: 15.7, y0: 27.4, y1: AP.y1 - 0.8 };
const COMODA = { x0: CUARTOS.x + TABIQUE / 2, x1: CUARTOS.x + TABIQUE / 2 + 5, y0: 30, y1: 42, alto: PISO + 9 };
// el baño: el lavamanos y el inodoro contra la pared norte, y la ducha en la esquina, con su vidrio
const BANO = { lavamanos: [24.2, 30.4], inodoro: [32.2, 36.2], ducha: 10.5 };
// la base de la maqueta, ceñida al apartamento y al balcón, con una franja al oeste para la brújula y la placa de
// rótulo
const PLATE = { x: AP.x0 - MURO - 7, y: AP.y0 - MURO - 7, w: BALCON.x1 + 7 - (AP.x0 - MURO - 7), d: AP.y1 + MURO + 20 - (AP.y0 - MURO - 7), r: 10 };
const PLATE_H = 10;
const FOOT_H = 5;
const BRUJULA = { x: 24, y: AP.y1 + MURO + 10, r: 8, z0: 0.7, z1: 2.8, carta: 6.6 };
const LABEL = { x: -22, y: AP.y1 + MURO + 5.8, w: 28, d: 8.6, r: 1.2 };

// la cocina contra la pared norte: la nevera, los gabinetes con el tope y el fregadero, y el gabinete del fregadero
// abierto para ver la ósmosis
const COCINA = { x0: AP.x0, x1: AP.x0 + 6.3, y0: -12.6, y1: 15, alto: 9.4, tope: 0.6 };
const NEVERA = { x0: AP.x0, x1: AP.x0 + 7.9, y0: -21.6, y1: -13.2, z1: PISO + 18.4 };
const FREGADERO = { y0: -4.2, y1: 6.8 };
const VENTANA = { y0: -3.2, y1: 5.8, z0: PISO + 15.8, z1: PISO + 24.4 };
// la pared este, de norte a sur: la cisterna (fuera de la esquina, que la nevera tapa), la bomba y el presurizado, y
// el panel de breakers con el transfer switch del Anker, con la estación en el piso debajo
const LUGAR_CIS = { x: -17, y: AP.y0 + 4.2 };
// la bomba en línea con la cisterna (su salida va derecho al motor) y el presurizado a su lado
const BOMBA = { x0: -7.2, x1: -4.6, y0: LUGAR_CIS.y - 1.2, y1: LUGAR_CIS.y + 1.2, z0: PISO + 0.5, z1: PISO + 3.4, eje: [LUGAR_CIS.y, PISO + 1.75], motor: -10.4 };
const PRES = { x: -2.1, y: LUGAR_CIS.y };
const PANEL = { x0: 1.4, x1: 7.8, y1: AP.y0 + 1.8, z0: PISO + 12.6, z1: PISO + 21.6 };
const TS = { x0: 9.8, x1: 13.3, y1: AP.y0 + 2, z0: PISO + 14.6, z1: PISO + 19.6 };
const ANKER = { x: 14, y: AP.y0 + 3.2 };
// las PS400 en el balcón, una al lado de la otra, inclinadas hacia donde mira el balcón
const PS400 = { frente: BALCON.x1 - 2.6, centros: [-14.6, 14.6], z0: BALCON.z + 1, bus: BALCON.x0 + 2.4 };
// el techo, sobre las paredes, y un plafón por cuarto: la sala, el lado de los equipos, la alcoba y el baño; de noche
// quedan prendidos y su luz cae en el piso de su cuarto (`cuarto`: x0, x1, y0, y1)
const TECHO = { z0: PISO + ALTO, grueso: 1.2 };
const LAMPARAS = [
  { x: 6, y: 3, piso: 16, cuarto: [AP.x0, AP.x1, AP.y0, CUARTOS.y] },
  { x: -8, y: -24, piso: 13, cuarto: [AP.x0, AP.x1, AP.y0, CUARTOS.y] },
  { x: 8, y: 36, piso: 13, cuarto: [CUARTOS.x + TABIQUE / 2, AP.x1, CUARTOS.y + TABIQUE, AP.y1] },
  { x: -29, y: 35, piso: 11, cuarto: [AP.x0, CUARTOS.x - TABIQUE / 2, CUARTOS.y + TABIQUE, AP.y1] },
];
const LUZ = { r: 2.4, alto: 0.8, halo: 5 };

// ---------- el plano: cómo se dibuja cada producto en el apartamento ----------
// Como en la casa (build.mjs): cada producto con su dibujo y sus partes; `mide` le pasa a la página lo que midió el
// dibujo de un modelo.
const parte = (id, nombre) => ({ on: `p:${id}:${nombre}`, attrs: ` data-p="${id}:${nombre}"` });
const MEDIDAS = {};
const mide = (id, modelo, datos) => Object.assign(((MEDIDAS[id] ??= {})[modelo] ??= {}), datos);
const medidasCisterna = (c) => {
  const h = c.h * PULG;
  const z0 = PISO + 0.6;
  return { lugar: LUGAR_CIS, r: (c.d / 2) * PULG, h, z0, top: z0 + h };
};
const DIBUJOS = {
  cisterna: { dibujar: (p) => dibujarCisterna(p) },
  anker: { dibujar: (p) => dibujarAnker(p) },
  nevera: { dibujar: (p) => dibujarNevera(p) },
  osmosis: { dibujar: (p) => dibujarOsmosis(p) },
};

// Las puntas del dibujo: el lienzo (taller.mjs) toma su proporción exacta, sin franjas vacías.
const FIT = [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), ...k.boxCorners({ x: AP.x0 - MURO, y: AP.y0 - MURO, w: AP.x1 - AP.x0 + 2 * MURO, d: AP.y1 - AP.y0 + 2 * MURO }, 0, TECHO.z0 + TECHO.grueso)];
const TALLER = taller({ W, AZ, EL, FIT });
const { H, P, KS, at, S, Ln, Dots, path3, f2, R, record, p3, recibeSol, carasAnillo, anilloEn, faceY, faceX, rect, box, cyl, turned, pipe, cieloDe, SOMBRA } = TALLER;
const { cuerpoCisterna, bomba, presurizado, estacionAnker, bateriaExpansion, nevera, transferSwitch, ps400 } = piezas(TALLER, { mide });

// ---------- base ----------
const back = [];
back.push(`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
  back.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
  back.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
}
const PLATE_PATHS = k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6);
back.push(S(PLATE_PATHS, { tone: "mid", inner: Ln(k.sideSeam(PLATE, -4, P, 8), { tone: "faint" }) }));
back.push(Ln(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
const plateScrews = k.corners(PLATE, 7);
back.push(Ln(plateScrews.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
back.push(Dots(plateScrews.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
record(A.slab(PLATE, -PLATE_H, PLATE_H, { name: "stand.plate", ground: true }, 8));
back.push(recibeSol("stand.plate", PLATE_PATHS.fill, carasAnillo(anilloEn(k.ringOf(PLATE, 8), -PLATE_H), anilloEn(k.ringOf(PLATE, 8), 0))));

// La losa del apartamento y la del balcón, un poco más baja: van con la base, debajo de todo, para que los cables de
// las PS400 corran por el piso. Las baldosas del piso son de 60 cm.
function losa(name, plan, z1, baldosas) {
  const paths = k.slabOf(plan, 0, z1, P, 2, 0.3);
  const lineas = [];
  if (baldosas) {
    for (let x = plan.x + 6.3; x < plan.x + plan.w - 0.5; x += 6.3) lineas.push(k.lineOnTop([x, plan.y], [x, plan.y + plan.d], z1, P));
    for (let y = plan.y + 6.3; y < plan.y + plan.d - 0.5; y += 6.3) lineas.push(k.lineOnTop([plan.x, y], [plan.x + plan.w, y], z1, P));
  }
  back.push(S(paths, { tone: "mid", inner: Ln(lineas.join(""), { tone: "faint" }) }));
  record(A.slab(plan, 0, z1, { name, ground: true }, 2));
  back.push(recibeSol(name, paths.fill, carasAnillo(anilloEn(k.ringOf(plan, 2), 0), anilloEn(k.ringOf(plan, 2), z1))));
}
losa("piso", { x: AP.x0 - MURO, y: AP.y0 - MURO, w: AP.x1 - AP.x0 + 2 * MURO, d: AP.y1 - AP.y0 + 2 * MURO, r: 0.4 }, PISO, true);
// la luz de cada plafón en el piso de su cuarto: la página la prende de noche (con var(--dia))
const recorte = (i, [x0, x1, y0, y1]) => `<clipPath id="sr-luz-${i}"><path d="${path3([[x0, y0, PISO], [x1, y0, PISO], [x1, y1, PISO], [x0, y1, PISO]], true)}"/></clipPath>`;
back.push(
  `<defs><radialGradient id="sr-luz-piso"><stop offset="0" style="stop-color:var(--wm-orange-300);stop-opacity:.6"/><stop offset=".55" style="stop-color:var(--wm-orange-300);stop-opacity:.25"/><stop offset="1" style="stop-color:var(--wm-orange-300);stop-opacity:0"/></radialGradient>` +
    `<radialGradient id="sr-luz-halo"><stop offset="0" style="stop-color:var(--wm-orange-300);stop-opacity:.9"/><stop offset="1" style="stop-color:var(--wm-orange-300);stop-opacity:0"/></radialGradient>` +
    `${LAMPARAS.map((l, i) => recorte(i, l.cuarto)).join("")}</defs>` +
    `<g class="sr-luz">${LAMPARAS.map(({ x, y, piso }, i) => `<path clip-path="url(#sr-luz-${i})" d="${k.ring(x, y, piso, PISO, P, 48)}" fill="url(#sr-luz-piso)"/>`).join("")}</g>`,
);
losa("balcon.losa", { x: BALCON.x0, y: BALCON.y0, w: BALCON.x1 - BALCON.x0, d: BALCON.y1 - BALCON.y0, r: 0.4 }, BALCON.z, true);

// ---------- brújula: como en la casa, la tarjeta gira para que su N mire al norte y la marca fija apunta hacia donde
// mira el balcón ----------
cyl("compass.flange", BRUJULA.x, BRUJULA.y, BRUJULA.r + 0.8, 0, BRUJULA.z0, { tone: "lo" }, { steps: 56, sombra: "recibe" });
{
  const { x, y, r, z1, carta } = BRUJULA;
  const screws = [45, 135, 225, 315].map((a) => [x + (r - 0.9) * Math.cos((a * Math.PI) / 180), y + (r - 0.9) * Math.sin((a * Math.PI) / 180)]);
  const extra = Ln(k.ring(x, y, carta + 0.1, z1, P, 72), { tone: "lo" }) + `<g data-part="rosa"></g>` + Ln(k.lineOnTop([x + carta + 0.1, y], [x + r, y], z1, P), { tone: "hi" }) + Dots(screws.map(([sx, sy]) => at([sx, sy, z1])), { size: 0.45 });
  cyl("compass", x, y, r, BRUJULA.z0, z1, { tone: "mid" }, { steps: 64, bevel: 0.4, extra });
}
// placa de rótulo, como la de la casa, a lo largo de la franja
{
  const z = 0.8;
  const cy = LABEL.y + LABEL.d / 2;
  const text = k.faceTextSvg(k.topMatrix([LABEL.x + LABEL.w / 2, cy + 1.1], z, P, "x"), "WINDMAR HOME", { size: 2.3, tone: "mid", anchor: "middle" });
  const rule = (dy, from, to) => Ln(k.lineOnTop([LABEL.x + from, cy + dy], [LABEL.x + to, cy + dy], z, P), { tone: "lo", free: true });
  const extra = Ln(k.planOutline(k.insetPlan(LABEL, 1.4), z, P, 4), { tone: "faint" }) + text + rule(-1.4, 6, LABEL.w - 6) + rule(-2.8, 8, LABEL.w - 8) + Dots([at([LABEL.x + 3, cy, z]), at([LABEL.x + LABEL.w - 3, cy, z])], { size: 0.45 });
  box("stand.label", [LABEL.x, LABEL.y, 0], [LABEL.x + LABEL.w, LABEL.y + LABEL.d, z], { tone: "lo" }, { r: LABEL.r, steps: 4, extra, sombra: "recibe" });
}

// ---------- paredes ----------
// Las paredes norte y este, enteras hasta el techo; las del sur y el oeste también, con la puerta corrediza del
// balcón y las ventanas, pero transparentes, como el techo y los tabiques, para ver adentro. Dan sombra como de verdad:
// adentro el sol solo entra por la puerta de vidrio.
const MUROS = { z0: PISO, z1: TECHO.z0 };
const PARED = { tone: "mid" };
const transparente = (extra = "", wrap = "sr-pared") => ({ r: 0.15, wrap, sombra: "tapa", extra });
box("muro.norte", [AP.x0 - MURO, AP.y0 - MURO, MUROS.z0], [AP.x0, AP.y1 + MURO, MUROS.z1], PARED, { r: 0.15 });
box("muro.este", [AP.x0, AP.y0 - MURO, MUROS.z0], [AP.x1 + MURO, AP.y0, MUROS.z1], PARED, { r: 0.15 });
// la pared oeste, con la ventana de la alcoba y la del baño (sus marcos, en la cara de afuera)
{
  const Y = AP.y1 + MURO;
  const ventana = (x0, x1, z0, z1) => faceY(Y, rect(x0, x1, z0, z1)) + faceY(Y, rect(x0 + 0.8, x1 - 0.8, z0 + 0.8, z1 - 0.8)) + faceY(Y, [[(x0 + x1) / 2, z0 + 0.8], [(x0 + x1) / 2, z1 - 0.8]], false);
  box("muro.oeste", [AP.x0, AP.y1, MUROS.z0], [AP.x1 + MURO, Y, MUROS.z1], PARED, transparente(Ln(ventana(0, 16, PISO + 9, PISO + 20) + ventana(-31, -25, PISO + 15, PISO + 20), { tone: "lo" })));
}
// la pared sur: a los lados de la puerta corrediza y encima de ella, con la ventana de la alcoba al balcón; la puerta
// son dos hojas de vidrio sobre su riel
{
  const X = AP.x1 + MURO;
  const ventana = faceX(X, rect(28, 44, PISO + 9, PISO + 20)) + faceX(X, rect(28.8, 43.2, PISO + 9.8, PISO + 19.2)) + faceX(X, [[36, PISO + 9.8], [36, PISO + 19.2]], false);
  box("muro.sur.este", [AP.x1, AP.y0, MUROS.z0], [X, PUERTA.y0, MUROS.z1], PARED, transparente());
  box("muro.sur.oeste", [AP.x1, PUERTA.y1, MUROS.z0], [X, AP.y1, MUROS.z1], PARED, transparente(Ln(ventana, { tone: "lo" })));
  box("muro.sur.dintel", [AP.x1, PUERTA.y0, PISO + PUERTA.alto], [X, PUERTA.y1, MUROS.z1], PARED, transparente());
  box("puerta.riel", [AP.x1 + 0.2, PUERTA.y0, PISO - 0.4], [X - 0.2, PUERTA.y1, PISO + 0.25], { tone: "lo" }, { r: 0.1, sombra: "recibe" });
  const yM = (PUERTA.y0 + PUERTA.y1) / 2;
  const hoja = (name, x0, ya, yb) => box(name, [x0, ya, PISO + 0.25], [x0 + 0.4, yb, PISO + PUERTA.alto], { tone: "lo" }, { r: 0.05, wrap: "sr-vidrio", sombra: false });
  hoja("puerta.hoja.e", AP.x1 + 0.3, PUERTA.y0, yM + 0.6);
  hoja("puerta.hoja.o", AP.x1 + 0.9, yM - 0.6, PUERTA.y1);
}
// los tabiques de la alcoba y el baño: el que corre en x, con una puerta a cada cuarto (y su dintel), y el que los separa
{
  const { y, x, puertas, alto } = CUARTOS;
  const tramos = [AP.x0, ...puertas.flat(), AP.x1];
  for (let i = 0; i < tramos.length; i += 2) box(`tabique.y${i / 2}`, [tramos[i], y, MUROS.z0], [tramos[i + 1], y + TABIQUE, MUROS.z1], PARED, transparente("", "sr-tabique"));
  puertas.forEach(([a, b], i) => box(`tabique.dintel${i}`, [a, y, PISO + alto], [b, y + TABIQUE, MUROS.z1], PARED, transparente("", "sr-tabique")));
  box("tabique.x", [x - TABIQUE / 2, y + TABIQUE, MUROS.z0], [x + TABIQUE / 2, AP.y1, MUROS.z1], PARED, transparente("", "sr-tabique"));
}
// El techo: lo de Windmar va bajo techo, nada a la intemperie (las PS400 sí van afuera, en el balcón, hechas para el
// sol y la lluvia). De noche sus plafones se prenden y les sale un halo, que va encima de todo, como la luz que se ve
// a través del techo (la página los prende con var(--dia)).
box("techo", [AP.x0 - MURO, AP.y0 - MURO, TECHO.z0], [AP.x1 + MURO, AP.y1 + MURO, TECHO.z0 + TECHO.grueso], PARED, transparente("", "sr-techo"));
LAMPARAS.forEach(({ x, y }, i) => cyl(`plafon${i}`, x, y, LUZ.r, TECHO.z0 - LUZ.alto, TECHO.z0, { tone: "hi" }, { steps: 32, wrap: "sr-plafon", sombra: false }));
const halos = `<g class="sr-luz">${LAMPARAS.map(({ x, y }) => {
  const c = at([x, y, TECHO.z0 - LUZ.alto]);
  return `<circle cx="${f2(c[0])}" cy="${f2(c[1])}" r="${f2(LUZ.halo * KS)}" fill="url(#sr-luz-halo)"/>`;
}).join("")}</g>`;

// ventana tipo Miami sobre el fregadero, en la pared norte (su cara de adentro mira a +x)
{
  const X = AP.x0 + 0.6;
  const { y0, y1, z0, z1 } = VENTANA;
  const i = 1.1;
  const lines = [];
  for (let z = z0 + i + 1.5; z < z1 - i - 0.4; z += 1.5) lines.push(k.segment([X, y0 + i, z], [X, y1 - i, z], P));
  // la cara que mira a +x va en el tono más oscuro: las persianas, un tono más fuerte para que se vean
  const extra = Ln(faceX(X, [[y0 + i, z0 + i], [y1 - i, z0 + i], [y1 - i, z1 - i], [y0 + i, z1 - i]]), { tone: "mid" }) + Ln(lines.join(""), { tone: "mid" });
  box("ventana", [AP.x0, y0, z0], [X, y1, z1], { tone: "mid" }, { r: 0.15, extra });
  box("ventana.repisa", [AP.x0, y0 - 0.8, z0 - 0.9], [AP.x0 + 1.4, y1 + 0.8, z0], { tone: "mid" }, { r: 0.15 });
}

// ---------- cocina ----------
// los gabinetes de abajo con sus puertas, menos el del fregadero, que va abierto; el tope encima de todos
{
  const { x0, x1, y0, y1, alto } = COCINA;
  const z1 = PISO + alto;
  const puertas = (a, b) => {
    const out = [];
    const n = Math.max(1, Math.round((b - a) / 4.4));
    for (let i = 0; i < n; i++) {
      const ya = a + ((b - a) * i) / n;
      const yb = a + ((b - a) * (i + 1)) / n;
      out.push(faceX(x1, rect(ya + 0.3, yb - 0.3, PISO + 0.9, z1 - 0.4)));
    }
    return Ln(out.join(""), { tone: "faint" });
  };
  box("cocina.este", [x0, y0, PISO], [x1, FREGADERO.y0, z1], { tone: "mid" }, { r: 0.2, extra: puertas(y0, FREGADERO.y0) });
  box("cocina.oeste", [x0, FREGADERO.y1, PISO], [x1, y1, z1], { tone: "mid" }, { r: 0.2, extra: puertas(FREGADERO.y1, y1) });
  // el gabinete del fregadero: su piso y sus dos lados (la pared es su fondo)
  box("fregadero.piso", [x0, FREGADERO.y0, PISO], [x1, FREGADERO.y1, PISO + 0.6], { tone: "mid" }, { r: 0.1 });
  box("fregadero.lado.e", [x0, FREGADERO.y0, PISO + 0.6], [x1, FREGADERO.y0 + 0.35, z1], { tone: "mid" }, { r: 0.1 });
  box("fregadero.lado.o", [x0, FREGADERO.y1 - 0.35, PISO + 0.6], [x1, FREGADERO.y1, z1], { tone: "mid" }, { r: 0.1 });
  // el tope, con el fregadero hundido
  const tz = z1 + COCINA.tope;
  const fregadero = path3([[x0 + 1.2, FREGADERO.y0 + 1.6, tz], [x1 - 1, FREGADERO.y0 + 1.6, tz], [x1 - 1, FREGADERO.y0 + 6.4, tz], [x0 + 1.2, FREGADERO.y0 + 6.4, tz]], true);
  box("cocina.tope", [x0, y0 - 0.2, z1], [x1 + 0.4, y1 + 0.2, tz], { tone: "hi" }, { r: 0.2, extra: `<path class="sr-fregadero" d="${fregadero}"/>` + Ln(fregadero, { tone: "lo" }) });
  // el grifo de siempre, detrás del fregadero (su pico queda abierto)
  pipe("grifo", [[x0 + 0.9, FREGADERO.y0 + 4, tz], [x0 + 0.9, FREGADERO.y0 + 4, tz + 3.2], [x0 + 3.2, FREGADERO.y0 + 4, tz + 3.2], [x0 + 3.2, FREGADERO.y0 + 4, tz + 2.2]], 0.28, { tone: "hi", bend: 0.9, ends: [true, false] });
  // el desagüe del fregadero baja y se va a la pared, por encima de la ósmosis
  pipe("desague", [[x0 + 2.4, FREGADERO.y0 + 4, z1 + 0.05], [x0 + 2.4, FREGADERO.y0 + 4, PISO + 7.3], [x0, FREGADERO.y0 + 4, PISO + 7.3]], 0.45, { tone: "mid", bend: 1, touch: ["cocina.tope"] });
}
// la nevera, con sus dos puertas y sus agarraderas
{
  const { x0, x1, y0, y1, z1 } = NEVERA;
  const corte = PISO + 12.2;
  const extra = Ln(faceX(x1, rect(y0 + 0.6, y1 - 0.6, corte + 0.15, z1 - 0.6)) + faceX(x1, rect(y0 + 0.6, y1 - 0.6, PISO + 0.6, corte - 0.15)), { tone: "lo" }) + Ln(faceX(x1, [[y1 - 1.4, corte + 1.2], [y1 - 1.4, z1 - 1.6]], false) + faceX(x1, [[y1 - 1.4, PISO + 2.2], [y1 - 1.4, corte - 1.2]], false), { tone: "hi", free: true });
  box("nevera", [x0, y0, PISO], [x1, y1, z1], { tone: "hi" }, { r: 0.5, steps: 3, bevel: 0.3, extra });
}
// el router del internet en el tope, con sus luces prendidas (va en lo esencial)
{
  const [x0, x1, y0, y1, z0] = [AP.x0 + 1.2, AP.x0 + 3.6, 10.4, 13.6, PISO + COCINA.alto + COCINA.tope];
  const luces = [0, 1, 2].map((i) => {
    const p = at([x1, y0 + 0.9 + i * 0.7, z0 + 0.45]);
    return `<circle class="sr-led sr-led-fija" cx="${f2(p[0])}" cy="${f2(p[1])}" r="0.22"/>`;
  }).join("");
  box("router", [x0, y0, z0], [x1, y1, z0 + 0.9], { tone: "mid" }, { r: 0.3, extra: luces });
}

// ---------- sala: un sofá que mira al balcón, una alfombra y una mesita ----------
{
  const SOFA = { x0: -8, x1: -1, y0: -8, y1: 14, asiento: PISO + 4.2, espaldar: PISO + 8.6, brazo: PISO + 6.2 };
  const { x0, x1, y0, y1, asiento } = SOFA;
  const cojines = [1, 2].map((i) => k.lineOnTop([x0 + 2, y0 + 1.6 + (i * (y1 - y0 - 3.2)) / 3], [x1, y0 + 1.6 + (i * (y1 - y0 - 3.2)) / 3], asiento, P)).join("");
  box("sofa", [x0, y0 + 1.6, PISO], [x1, y1 - 1.6, asiento], { tone: "mid" }, { r: 0.6, steps: 3, wrap: "sr-tela", extra: Ln(cojines, { tone: "lo" }) });
  box("sofa.espaldar", [x0, y0 + 1.6, asiento], [x0 + 2, y1 - 1.6, SOFA.espaldar], { tone: "mid" }, { r: 0.6, steps: 3, wrap: "sr-tela" });
  for (const [lado, ya, yb] of [["e", y0, y0 + 1.6], ["o", y1 - 1.6, y1]]) box(`sofa.brazo.${lado}`, [x0, ya, PISO], [x1, yb, SOFA.brazo], { tone: "mid" }, { r: 0.6, steps: 3, wrap: "sr-tela" });
  box("alfombra", [x1 + 0.8, y0 - 1, PISO], [x1 + 15.6, y1 + 1, PISO + 0.12], { tone: "mid" }, { r: 0.5, wrap: "sr-alfombra", sombra: "recibe" });
  const MESA = { x0: x1 + 5.4, x1: x1 + 10.8, y0: y0 + 5, y1: y1 - 5, z: PISO + 3.8 };
  for (const [i, [lx, ly]] of [[MESA.x0 + 0.6, MESA.y0 + 0.6], [MESA.x1 - 0.6, MESA.y0 + 0.6], [MESA.x0 + 0.6, MESA.y1 - 0.6], [MESA.x1 - 0.6, MESA.y1 - 0.6]].entries()) {
    box(`mesa.pata${i}`, [lx - 0.25, ly - 0.25, PISO + 0.12], [lx + 0.25, ly + 0.25, MESA.z], { tone: "mid" }, { r: 0.1, sombra: false });
  }
  box("mesa", [MESA.x0, MESA.y0, MESA.z], [MESA.x1, MESA.y1, MESA.z + 0.6], { tone: "hi" }, { r: 0.4, steps: 2 });
}

// ---------- alcoba: la cama doble con la cabecera contra la pared oeste, dos mesitas y la cómoda ----------
{
  const { x0, x1, y0, y1 } = CAMA;
  const zc = PISO + 5;
  // el bastidor, el colchón con la sábana doblada, dos almohadas y la cabecera
  box("cama", [x0, y0, PISO], [x1, y1, PISO + 2.6], PARED, { r: 0.3 });
  box("cama.colchon", [x0 + 0.3, y0 + 0.3, PISO + 2.6], [x1 - 0.3, y1 - 0.1, zc], { tone: "mid" }, { r: 0.6, steps: 3, wrap: "sr-tela", extra: Ln(k.lineOnTop([x0 + 0.7, y0 + 7], [x1 - 0.7, y0 + 7], zc, P), { tone: "lo" }) });
  const xm = (x0 + x1) / 2;
  [[x0 + 1, xm - 0.5], [xm + 0.5, x1 - 1]].forEach(([a, b], i) => box(`cama.almohada${i}`, [a, y1 - 4.6, zc], [b, y1 - 0.9, zc + 1.3], { tone: "hi" }, { r: 0.6, steps: 3 }));
  box("cama.cabecera", [x0 - 0.4, y1, PISO], [x1 + 0.4, AP.y1, PISO + 11], PARED, { r: 0.3 });
  [[x0 - 3.8, x0 - 0.6], [x1 + 0.6, x1 + 3.8]].forEach(([a, b], i) => box(`mesita${i}`, [a, AP.y1 - 4.2, PISO], [b, AP.y1, PISO + 5.2], PARED, { r: 0.3, extra: Ln(faceX(b, rect(AP.y1 - 3.6, AP.y1 - 0.6, PISO + 2.8, PISO + 4.6)), { tone: "faint" }) }));
}
// la cómoda, contra el tabique del baño, con sus tres gavetas
{
  const { x0, x1, y0, y1, alto } = COMODA;
  const h = (alto - PISO - 1.2) / 3;
  const gavetas = [0, 1, 2].map((i) => faceX(x1, rect(y0 + 0.5, y1 - 0.5, PISO + 0.6 + i * h + 0.15, PISO + 0.6 + (i + 1) * h - 0.15))).join("");
  box("comoda", [x0, y0, PISO], [x1, y1, alto], PARED, { r: 0.3, steps: 2, extra: Ln(gavetas, { tone: "lo" }) });
}

// ---------- baño: el lavamanos y el inodoro contra la pared norte, y la ducha en la esquina ----------
{
  const X = AP.x0;
  // el lavamanos en su mueble, con su llave y el espejo encima
  const [la, lb] = BANO.lavamanos;
  const zt = PISO + 8.4;
  const pileta = path3([[X + 1.4, la + 1.2, zt + 0.5], [X + 4.4, la + 1.2, zt + 0.5], [X + 4.4, lb - 1.2, zt + 0.5], [X + 1.4, lb - 1.2, zt + 0.5]], true);
  box("bano.mueble", [X, la, PISO], [X + 5.2, lb, zt], PARED, { r: 0.2, extra: Ln(faceX(X + 5.2, rect(la + 0.4, lb - 0.4, PISO + 0.9, zt - 0.6)), { tone: "faint" }) });
  box("bano.tope", [X, la - 0.2, zt], [X + 5.6, lb + 0.2, zt + 0.5], { tone: "hi" }, { r: 0.2, extra: `<path class="sr-fregadero" d="${pileta}"/>` + Ln(pileta, { tone: "lo" }) });
  const yl = (la + lb) / 2;
  pipe("bano.llave", [[X + 0.7, yl, zt + 0.5], [X + 0.7, yl, zt + 2.6], [X + 2.3, yl, zt + 2.6], [X + 2.3, yl, zt + 2]], 0.22, { tone: "hi", bend: 0.6, ends: [true, false] });
  box("bano.espejo", [X, la + 0.4, zt + 3.6], [X + 0.3, lb - 0.4, zt + 10.6], { tone: "lo" }, { r: 0.05, wrap: "sr-vidrio", sombra: false });
  // el inodoro: el tanque contra la pared y la taza
  const [ia, ib] = BANO.inodoro;
  box("bano.tanque", [X, ia, PISO + 4.6], [X + 2.2, ib, PISO + 8.6], { tone: "hi" }, { r: 0.4, steps: 2 });
  box("bano.taza", [X + 1.4, ia + 0.4, PISO], [X + 6.6, ib - 0.4, PISO + 4.6], { tone: "hi" }, { r: 1.2, steps: 4 });
  // la ducha: su plato, el vidrio de sus dos lados de adentro (con la entrada junto a la pared oeste) y la regadera
  const D = BANO.ducha;
  const yd = AP.y1 - D;
  box("ducha.plato", [X, yd, PISO], [X + D, AP.y1, PISO + 0.35], { tone: "lo" }, { r: 0.2, sombra: "recibe" });
  const vidrio = (name, a, b) => box(name, a, b, { tone: "lo" }, { r: 0.05, wrap: "sr-vidrio", sombra: false });
  vidrio("ducha.vidrio.y", [X, yd, PISO + 0.35], [X + D, yd + 0.2, PISO + 20]);
  vidrio("ducha.vidrio.x", [X + D - 0.2, yd + 0.2, PISO + 0.35], [X + D, AP.y1 - 4.4, PISO + 20]);
  const yr = AP.y1 - 5.6;
  cyl("ducha.regadera", X + 2.9, yr, 1, PISO + 18.3, PISO + 18.7, { tone: "hi" }, { steps: 20, sombra: false });
  pipe("ducha.tubo", [[X, yr, PISO + 19.6], [X + 2.9, yr, PISO + 19.6], [X + 2.9, yr, PISO + 18.7]], 0.2, { tone: "hi", bend: 0.5 });
}

// ---------- panel de breakers en la pared este ----------
// La luz de LUMA le llega por un tubo desde el piso (el medidor está abajo, con los del edificio).
{
  const y = PANEL.y1;
  const extra =
    Ln(faceY(y, rect(PANEL.x0 + 0.8, PANEL.x1 - 0.8, PANEL.z0 + 0.8, PANEL.z1 - 0.8)), { tone: "lo" }) +
    Ln(faceY(y, [[PANEL.x0 + 1.8, PANEL.z1 - 2.6], [PANEL.x0 + 4.4, PANEL.z1 - 2.6]], false), { tone: "lo", free: true }) +
    Ln(faceY(y, [[PANEL.x0 + 1.8, PANEL.z1 - 3.6], [PANEL.x0 + 3.6, PANEL.z1 - 3.6]], false), { tone: "lo", free: true }) +
    Dots([at([PANEL.x1 - 1.6, y, (PANEL.z0 + PANEL.z1) / 2])], { size: 0.5, tone: "hi" });
  box("panel", [PANEL.x0, AP.y0, PANEL.z0], [PANEL.x1, PANEL.y1, PANEL.z1], { tone: "mid" }, { r: 0.3, steps: 2, bevel: 0.3, extra });
  pipe("luma", [[PANEL.x0 + 1.4, AP.y0 + 0.9, PANEL.z0], [PANEL.x0 + 1.4, AP.y0 + 0.9, PISO]], 0.55, { tone: "mid" });
}

// ---------- balcón: baranda de vidrio con su pasamanos ----------
const BARANDA = { x: BALCON.x1 - 0.6, z1: BALCON.z + 10.4 };
{
  const { y0, y1 } = BALCON;
  // los vidrios van del piso al pasamanos; el pasamanos sale de la pared este y baja al piso en la punta oeste
  const vidrio = (name, a, b) => box(name, a, b, { tone: "lo" }, { r: 0.05, wrap: "sr-vidrio", sombra: false });
  const zv = BARANDA.z1 - 0.32;
  vidrio("baranda.sur", [BARANDA.x - 0.15, y0 + 0.6, BALCON.z], [BARANDA.x + 0.15, y1 - 0.6, zv]);
  vidrio("baranda.este", [BALCON.x0 + 0.4, y0 + 0.45, BALCON.z], [BARANDA.x - 0.6, y0 + 0.75, zv]);
  vidrio("baranda.oeste", [BALCON.x0 + 3, y1 - 0.75, BALCON.z], [BARANDA.x - 0.6, y1 - 0.45, zv]);
  pipe("pasamanos", [[BALCON.x0, y0 + 0.6, BARANDA.z1], [BARANDA.x, y0 + 0.6, BARANDA.z1], [BARANDA.x, y1 - 0.6, BARANDA.z1], [BALCON.x0 + 2.4, y1 - 0.6, BARANDA.z1], [BALCON.x0 + 2.4, y1 - 0.6, BALCON.z]], 0.32, { tone: "mid", bend: 1.2, touch: ["baranda.sur", "baranda.este", "baranda.oeste", "muro.este"] });
}

// ---------- cisterna Torre 150: adentro, en la esquina noreste ----------
// Del PDF maestro de Water (Sun Bot): la Ecowater de 150 galones, de 25" × 72", con su bomba de ½ HP y su presurizado
// de 6 gal (en apartamento el kit de bombeo más grande no es obligatorio). El agua de la AAA le entra arriba por la
// pared, y de abajo sale a la bomba, que la empuja al presurizado y a la tubería del apartamento por la pared.
function dibujarCisterna(p) {
  for (const c of p.modelos) {
    const en = parte(p.id, c.id);
    const { lugar, r, h, z0, top } = medidasCisterna(c);
    const owner = "cisterna.torre";
    cyl(`cis${c.id}.base`, lugar.x, lugar.y, r + 0.3, PISO, z0, { tone: "lo" }, { steps: 28, sombra: "recibe", owner, ...en });
    cuerpoCisterna({ p, c, lugar, r, h, z0, top, owner, en });
    // la entrada de la AAA sale de la pared por encima de la cisterna y le baja por la tapa; la salida va de abajo al
    // motor de la bomba
    pipe(`cis${c.id}.entrada`, [[lugar.x, AP.y0, top + 2.6], [lugar.x, lugar.y, top + 2.6], [lugar.x, lugar.y, top + 1]], 0.4, { agua: true, flowOf: () => "agua", attrsOf: () => en.attrs, bend: 1.4 });
    pipe(`cis${c.id}.salida`, [[lugar.x + r, lugar.y, BOMBA.eje[1]], [BOMBA.motor, lugar.y, BOMBA.eje[1]]], 0.45, { agua: true, flowOf: () => "agua", attrsOf: () => en.attrs });
  }
  // la bomba de ½ HP y el presurizado de 6 gal, en el piso contra la pared
  const EN_BOMBA = parte(p.id, "bomba");
  bomba({ B: BOMBA, motor: BOMBA.motor, aletas: [0.6, 1.2, 1.8, 2.4].map((d) => BOMBA.motor + d), rMotor: 1.2, en: EN_BOMBA });
  for (const gal of new Set(p.modelos.map((m) => m.presurizado))) {
    const en = parte(p.id, `pres${gal}`);
    const { r } = presurizado({ gal, x: PRES.x, y: PRES.y, z0: PISO, en });
    pipe(`pres${gal}.bomba`, [[BOMBA.x1, PRES.y, PISO + 2], [PRES.x - r, PRES.y, PISO + 2]], 0.4, { attrsOf: () => en.attrs });
  }
  // de la bomba, el agua sube a la tubería del apartamento por la pared
  pipe("bomba.casa", [[(BOMBA.x0 + BOMBA.x1) / 2, BOMBA.eje[0], BOMBA.z1], [(BOMBA.x0 + BOMBA.x1) / 2, BOMBA.eje[0], PISO + 6.4], [(BOMBA.x0 + BOMBA.x1) / 2, AP.y0, PISO + 6.4]], 0.45, { agua: true, flowOf: () => "agua", attrsOf: () => parte(p.id, "aCasa").attrs, bend: 1.2 });
}

// ---------- Anker SOLIX con sus PS400 en el balcón ----------
// La estación va en el piso contra la pared este, debajo del panel, con su transfer switch de apartamento en la pared
// (un tubo corto lo lleva al panel, a los circuitos de lo esencial) y la BP3800 a su lado. Las PS400 van abiertas en el
// balcón, una al lado de la otra, inclinadas 40° hacia donde mira el balcón, con su cable por el piso hasta la
// estación: entra por la puerta corrediza y corre pegado a la pared.
function dibujarAnker(p) {
  const equipo = parte(p.id, "equipo");
  const estaciones = [["f2600", p.modelos.find((m) => m.id.startsWith("f2600"))], ["f3800", p.modelos.find((m) => m.id.startsWith("f3800"))]].filter(([, m]) => m);
  for (const [nombre, m] of estaciones) estacionAnker({ nombre, m, x1: ANKER.x, y0: ANKER.y, z0: PISO, en: parte(p.id, nombre) });
  if (p.modelos.some((m) => m.bp2600)) bateriaExpansion({ nombre: "bp2600", x: ANKER.x, y0: ANKER.y, z0: PISO, en: parte(p.id, "bp2600") });
  if (p.modelos.some((m) => m.bp)) bateriaExpansion({ nombre: "bp3800", x: ANKER.x, y0: ANKER.y, z0: PISO, en: parte(p.id, "bp3800") });
  for (const tipo of ["manual", "automatico"].filter((t) => p.modelos.some((m) => (m.transfer === "manual") === (t === "manual")))) {
    transferSwitch({ tipo, x0: TS.x0, x1: TS.x1, pared: AP.y0, y1: TS.y1, z0: TS.z0, z1: TS.z1, en: parte(p.id, tipo) });
  }
  const zt = (TS.z0 + TS.z1) / 2;
  pipe("anker.tablero", [[TS.x0, AP.y0 + 1, zt], [PANEL.x1, AP.y0 + 1, zt]], 0.45, { flowOf: () => "anker", attrsOf: () => equipo.attrs });
  // el cable de la estación al transfer switch: sale por detrás y sube por la pared
  const xc = (TS.x0 + TS.x1) / 2;
  pipe("anker.cable", [[xc, ANKER.y, PISO + 1], [xc, AP.y0 + 1.2, PISO + 1], [xc, AP.y0 + 1.2, TS.z0]], 0.3, { flowOf: () => "anker", attrsOf: () => equipo.attrs, bend: 1.2 });
  // las PS400 (piezas.mjs) y su cable por el piso del balcón, por la puerta y pegado a la pared hasta la estación
  const muestras = [];
  const L = PS400_MEDIDAS.largo;
  // (y las PS200 de la F2600, más chicas, en los mismos lugares)
  const muestras200 = [];
  const zb = BALCON.z + 0.02;
  const zp = PISO + 0.02;
  const yPuerta = PUERTA.y0 + 1.6;
  const cable = (en, yc, j, largo) => {
    const yCable = yc - largo / 2 + 0.8;
    const camino = j === 0
      ? [[PS400.frente - 0.4, yCable, zb], [PS400.bus, yCable, zb], [PS400.bus, yPuerta, zb], [AP.x1 + MURO, yPuerta, zb], [AP.x1 + MURO, yPuerta, zp], [AP.x1 - 2, yPuerta, zp], [AP.x1 - 2, ANKER.y + 2, zp], [ANKER.x - 2, ANKER.y + 2, zp]]
      : [[PS400.frente - 0.4, yCable, zb], [PS400.bus, yCable, zb], [PS400.bus, PS400.centros[0] - largo / 2 + 0.8, zb]];
    const d = path3(camino);
    back.push(`<g${en.attrs}><path class="sr-cable" d="${d}"/><path class="sr-flow" data-flow="ps400" data-s0="0" d="${d}"/></g>`);
  };
  PS400.centros.forEach((yc, j) => {
    const ps = parte(p.id, `ps${j}`);
    muestras.push(ps400({ j, xf: PS400.frente, yc, z0: PS400.z0, suelo: BALCON.z, en: ps, owner: `anker.ps${j}` }));
    cable(ps, yc, j, L);
    const ps2 = parte(p.id, `ps200_${j}`);
    muestras200.push(ps400({ j, xf: PS400.frente, yc, z0: PS400.z0, suelo: BALCON.z, en: ps2, owner: `anker.ps${j}`, nombre: `anker.ps200_${j}`, medidas: PS200_MEDIDAS }));
    cable(ps2, yc, j, PS200_MEDIDAS.largo);
  });
  for (const m of p.modelos) mide(p.id, m.id, { ps: muestras, ps200: muestras200 });
}

// ---------- nevera EverFrost: en la cocina, junto a la nevera de la casa y contra la pared este ----------
function dibujarNevera(p) {
  for (const m of p.modelos) nevera({ m, x0: AP.x0 + 8.4, y0: AP.y0 + 1.2, z0: PISO, en: parte(p.id, m.id) });
}

// ---------- ósmosis inversa de 7 etapas: debajo del fregadero ----------
// Del PDF maestro de Water: prefiltro de sedimento de 5 micras, dos de carbón en bloque, la membrana TFC de 100 GPD,
// el cartucho de PFAS y microplásticos, el alcalino BioCera y el post-filtro de carbón, con el tanque de 4 gal (o, el
// Tankless RO, sin tanque: una caja con su bomba, enchufada) y el dispensador de largo alcance en el tope. Se dibuja
// un poco más grande que en la realidad para que se lea, y hacia el frente del gabinete: el tope tapa lo del fondo.
// El agua fría entra de la llave de la pared, pasa por las etapas y sale al dispensador.
function dibujarOsmosis(p) {
  const etapas = parte(p.id, "etapas");
  const zb = PISO + 0.6;
  const xf = AP.x0 + 3.9;
  const { y0 } = FREGADERO;
  // la base, los tres filtros parados en ella y, encima, la membrana acostada y los tres cartuchos (PFAS, alcalino y
  // post-carbón), más al frente
  box("ro.base", [xf - 1.4, y0 + 0.8, zb], [xf + 1.4, y0 + 6.2, zb + 0.4], { tone: "lo" }, { r: 0.15, sombra: "recibe", ...etapas });
  [1.8, 3.5, 5.2].forEach((dy, i) => {
    const y = y0 + dy;
    cyl(`ro.filtro${i}`, xf, y, 0.62, zb + 0.4, zb + 3.9, { tone: "hi" }, { steps: 20, wrap: i ? "" : "sr-carcasa", sombra: "recibe", ...etapas });
    cyl(`ro.tapa${i}`, xf, y, 0.78, zb + 3.9, zb + 4.4, { tone: "mid" }, { steps: 20, sombra: "recibe", ...etapas });
  });
  const acostado = (name, ya, yb, x, z, r) => {
    const F = G.frameOf([x, 0, z], [0, 1, 0], [0, 0, 1], [1, 0, 0]);
    turned(name, F, [[ya, r - 0.12], [ya + 0.2, r], [yb - 0.2, r], [yb, r - 0.12]], { tone: "hi" }, { attrs: etapas.attrs });
  };
  // la membrana va sobre las tapas de los filtros y los cartuchos, sobre la membrana
  const zm = zb + 5.05;
  const zc = zm + 0.6 + 0.36;
  acostado("ro.membrana", y0 + 1, y0 + 5.4, xf, zm, 0.6);
  acostado("ro.pfas", y0 + 0.9, y0 + 2.6, xf, zc, 0.36);
  acostado("ro.alcalino", y0 + 2.8, y0 + 4.5, xf, zc, 0.36);
  acostado("ro.post", y0 + 4.7, y0 + 6.4, xf, zc, 0.36);
  // el tanque de 4 gal del de siempre, o la caja del Tankless con su luz
  const yt = FREGADERO.y1 - 2.3;
  for (const m of p.modelos) {
    const en = parte(p.id, m.id);
    if (m.tanque) {
      const r = 1.7;
      const TF = G.frameOf([xf, yt, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
      turned("ro.tanque", TF, [[zb, r - 0.5], [zb + 0.5, r], [zb + 4.4, r], [zb + 5.2, r - 0.9, 1], [zb + 5.5, 0.35, 1]], { tone: "mid" }, { attrs: en.attrs, wrap: "sr-ro-tanque", owner: "ro.equipo" });
    } else {
      // la luz, en el lado este del frente: el lado del gabinete tapa el otro
      const led = at([xf + 1.3, yt - 0.7, zb + 4.2]);
      box("ro.tankless", [xf - 1.3, yt - 1.5, zb], [xf + 1.3, yt + 1.5, zb + 5], { tone: "hi" }, { r: 0.3, steps: 2, bevel: 0.2, extra: `<circle class="sr-led sr-led-fija" cx="${f2(led[0])}" cy="${f2(led[1])}" r="0.3"/>`, owner: "ro.equipo", sombra: "recibe", ...en });
    }
  }
  // los tubos: el agua fría de la llave de la pared al primer filtro; la de beber, del último cartucho al dispensador
  const tz = PISO + COCINA.alto + COCINA.tope;
  const yd = FREGADERO.y1 - 1;
  pipe("ro.entrada", [[AP.x0, y0 + 1.8, zb + 2.4], [xf - 0.5, y0 + 1.8, zb + 2.4]], 0.18, { agua: true, flowOf: () => "agua", attrsOf: () => etapas.attrs });
  pipe("ro.potable", [[xf, y0 + 6.4, zc], [xf, yd, zc], [AP.x0 + 1.1, yd, zc], [AP.x0 + 1.1, yd, tz]], 0.18, { agua: true, flowOf: () => "potable", attrsOf: () => etapas.attrs, bend: 0.5, touch: ["cocina.tope"] });
  // el dispensador de largo alcance, cromado, al lado del grifo (su pico queda abierto): por él sale el agua de beber
  pipe("ro.dispensador", [[AP.x0 + 1.1, yd, tz], [AP.x0 + 1.1, yd, tz + 4.2], [AP.x0 + 3.4, yd, tz + 4.2], [AP.x0 + 3.4, yd, tz + 3.2]], 0.2, { tone: "hi", bend: 0.8, agua: true, flowOf: () => "potable", attrsOf: () => etapas.attrs, ends: [true, false] });
}

// los productos del plano, en el orden de productos.mjs
for (const p of PRODUCTOS) DIBUJOS[p.id].dibujar(p);

// ---------- orden de pintado ----------
// Las partes del plano que nunca se ven a la vez (las estaciones del Anker, sus transfer switch, los dos equipos de la
// ósmosis) no se ordenan entre ellas.
const parteDe = (it) => /data-p="([^":]+):([^"]+)"/.exec(it.attrs ?? "");
const excluyentes = (a, b) => {
  const pa = parteDe(a);
  const pb = parteDe(b);
  return Boolean(pa && pb && (pa[1] !== pb[1] || pa[2] !== pb[2]) && nuncaJuntas([pa[1], pa[2]], [pb[1], pb[2]]));
};
A.settle(R, P, { skip: (a, b) => A.sameRun(a, b) || excluyentes(a, b) });
R.items.sort((a, b) => a.key - b.key);
const groups = R.items.map((item) => `<g class="it" data-name="${item.name}"${item.attrs ?? ""}>${item.svg}</g>`);

// ---------- cielo: el sol y la luna pasan por encima de la maqueta (cieloDe, en taller.mjs) ----------
const PUNTAS = [
  ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
  ...k.boxCorners({ x: AP.x0 - MURO, y: AP.y0 - MURO, w: AP.x1 - AP.x0 + 2 * MURO, d: AP.y1 - AP.y0 + 2 * MURO }, PISO, TECHO.z0 + TECHO.grueso),
];
const { CIELO, cieloFondo, cielo, defs } = cieloDe({ puntas: PUNTAS, centro: [0, 0, 10] });

const START = 12.5;
const DATA = { P, start: START, flows: { agua: "agua", potable: "potable", ps400: "ps400", anker: "anker" }, sombra: SOMBRA, brujula: BRUJULA, cielo: CIELO, rumbo: 180, agua: { personas: 3 }, medidas: MEDIDAS, ps400: { normal: normalPs400().map((v) => Math.round(v * 1e6) / 1e6) } };

const LABEL_TEXT =
  "Maqueta de un apartamento en Puerto Rico con lo de Windmar Home que va adentro, con sus paredes, sus tabiques y su techo transparentes para ver adentro: sala con la cocina contra la pared norte, con la nevera y el fregadero, una alcoba y un baño al oeste, el panel de breakers en la pared este y el balcón al sur, con su puerta corrediza y su baranda de vidrio; de noche sus cuatro plafones quedan prendidos. Con la pestaña Anker se pone un Anker SOLIX en el piso debajo del panel, con su transfer switch de apartamento en la pared y sus placas abiertas en el balcón, y aparte la nevera EverFrost en la cocina. Con la pestaña Agua se ponen la cisterna Torre 150 en la esquina, con su bomba y su presurizado, y la ósmosis inversa debajo del fregadero, con su dispensador en el tope. En la base, una brújula cuya tarjeta gira con el rumbo del balcón. Los trazos corren por los cables y los tubos en el sentido en que va la energía o el agua; el sol y la luna pasan por encima de la maqueta, de un lado al otro (salen por el del este), y cada pieza echa la sombra de ese momento.";
const svg = k.figureSvg({ width: W, height: H, label: LABEL_TEXT, body: [defs, cieloFondo, ...back, `<g class="sr-scene">${groups.join("")}</g>`, halos, cielo] });

const about = `<p>Corre el día con el reproductor y mira a dónde va la energía del Anker y el agua del apartamento. Cada pestaña va en pasos numerados, y solo se ve lo que aplica a lo escogido. En la pestaña Anker escoge el modelo, cuántas placas van en el balcón y hacia dónde mira el balcón: la brújula gira, las sombras se mueven y la ficha dice cuánto les dan las placas a lo esencial y para cuántas horas alcanza la batería sin LUMA. En la pestaña Agua escoge cuántas personas viven, la cisterna Torre 150 y la ósmosis inversa: el agua corre por los tubos con el uso de cada hora y la ficha dice para cuánto alcanza la cisterna si la AAA corta el servicio y cuánta agua de beber da la ósmosis.</p>`;
const controls = `
<div class="sr-controls">
  <div class="sr-tabs" role="tablist" aria-label="Qué mirar">
    <button type="button" class="sr-tab" role="tab" id="sr-tab-anker" aria-controls="sr-panel-anker" aria-selected="true" data-tab="anker">Anker</button>
    <button type="button" class="sr-tab" role="tab" id="sr-tab-agua" aria-controls="sr-panel-agua" aria-selected="false" tabindex="-1" data-tab="agua">Agua</button>
  </div>
  <div class="sr-panel" id="sr-panel-anker" role="tabpanel" aria-labelledby="sr-tab-anker" data-panel="anker">
  ${respaldoHtml(
    PRODUCTOS.filter((p) => p.pestaña === "anker" && p.rol === "respaldo"),
    `
  <section class="sr-group" aria-label="Hacia dónde mira el balcón">
    ${tag("Hacia dónde mira el balcón", 3)}
    <div class="sr-row sr-rumbo-row">${rumbosHtml("El balcón mira al", true)}</div>
  </section>`,
  )}
  ${PRODUCTOS.filter((p) => p.pestaña === "anker" && p.rol !== "respaldo").map((p) => seccionDe(p)).join("\n  ")}
  </div>
  <div class="sr-panel" id="sr-panel-agua" role="tabpanel" aria-labelledby="sr-tab-agua" data-panel="agua" hidden>
  <section class="sr-group" aria-label="Personas en el apartamento">
    ${tag("Personas", 1)}
    <div class="sr-system"><span class="sr-lab">Viven en el apartamento</span>${stepper("personas", "una persona")}</div>
    <p class="sr-nota" data-agua="uso"></p>
  </section>
  ${PRODUCTOS.filter((p) => p.pestaña === "agua").map((p, i) => seccionDe(p, i + 2)).join("\n  ")}
  </div>
</div>`;
// Ficha del apartamento: lo del Anker y lo del agua, en una franja de datos arriba de la tarjeta.
const kpi = (l, v, s) => `<div class="sr-kpi"><span class="sr-kpi-l">${l}</span><span class="sr-kpi-v" data-f="${v}"></span><span class="sr-kpi-s" data-f="${s}"></span></div>`;
const ficha = `<div class="sr-kpis" role="group" aria-label="Ficha del apartamento">${kpi("Anker", "anker", "ankerKwh")}${kpi("Placas PS400", "ps", "psN")}${kpi("Balcón", "rumbo", "inclin")}${kpi("Del sol", "sol", "solDe")}${kpi("Sin LUMA", "horas", "horasDe")}${kpi("Personas", "personas", "uso")}${kpi("Cisterna", "cisterna", "reserva")}${kpi("Ósmosis", "osmosis", "beber")}</div>`;
const caption =
  `Maqueta de un apartamento en Puerto Rico de unos 6.9 × 8 m, con sala y cocina, una alcoba y un baño. Sus paredes, sus tabiques y su techo se dibujan transparentes para ver adentro ("Ver adentro" los cierra): lo de Windmar va bajo techo, nada a la intemperie (las placas sí van afuera, en el balcón: son para el sol y la lluvia), y de noche sus cuatro plafones quedan prendidos. ` +
  `La pestaña Anker pone, paso a paso, un Anker SOLIX del cotizador Anker de Sun Bot, con los kWh, kW y medidas de las fichas de Anker: la F2600 (2.56 kWh y 2.4 kW, con transfer switch manual) o la F3800 Plus (3.84 kWh y 6 kW, con transfer switch automático), cada una con o sin su batería de expansión (la BP2600 o la BP3800). En el apartamento el transfer switch es el de apartamento del cotizador y las placas van en el balcón, donde caben dos (con − y + se pone una o dos; con la F2600 pueden ser PS200), abiertas sobre sus patas, inclinadas 40° hacia donde mira el balcón, con su cable por el piso hasta la estación. Aparte va la nevera EverFrost, en la cocina. Mantiene lo esencial del apartamento por su transfer switch: de día lo cubren las PS400 y lo que sobra carga la batería; de noche lo da la batería, y si llega a su reserva, LUMA. Supuestos del Anker: lo esencial (nevera, internet, luces y abanicos) suma unos ${(Array.from({ length: 288 }, (_, i) => esencialEn((i + 0.5) / 12)).reduce((a, b) => a + b, 0) / 12).toFixed(1)} kWh al día; las PS400 entregan el ${pctN(ANKER_MODELO.rinde)} de su potencia con el sol que les llega a su propio plano (40°, hacia donde mira el balcón), directo y difuso del equinoccio (PVGIS), menos lo que les tapan las sombras; la batería no baja de ${pctN(ANKER_MODELO.reserva)}; y las horas sin LUMA son las de la batería sola con lo esencial, como en la fórmula de Enseres. El balcón se dibuja sin el piso de arriba: en un balcón techado, el techo les quita a las PS400 el sol del mediodía. ` +
  `La pestaña Agua pone los equipos de Windmar Water con los datos del cotizador Water de Sun Bot y su PDF maestro. La cisterna Torre 150 (Ecowater de 150 galones, 25" × 72", "ideal para apartamentos") va adentro, en la esquina, con su bomba de ½ HP y su presurizado de 6 galones: en apartamento el kit de bombeo más grande del cotizador no es obligatorio. La ósmosis inversa de 7 etapas va debajo del fregadero: prefiltro de sedimento de 5 micras, dos de carbón en bloque de 10 micras, la membrana TFC de 100 GPD, el cartucho de PFAS y microplásticos, el alcalino BioCera y el post-filtro de carbón, con su tanque de 4 galones y el dispensador de largo alcance en el tope (y la conexión a la nevera, de ser posible); sin tanque, el Tankless RO del cotizador produce al momento, con electricidad y al menos 40 psi. La ósmosis se dibuja más grande que en la realidad para que se lea. ` +
  `Supuestos del agua: ${AGUA.porPersona} galones al día por persona, ${AGUA.beber} de ellos de beber y cocinar (los de la ósmosis), y la AAA que llena la cisterna mientras da servicio. El día es el del equinoccio (sale 6:25, se pone 18:25), con la luna llena de esa noche.`;

const { page } = escribirPagina({
  escena: "apartamento",
  titulo: "Anker y agua en un apartamento · Windmar Home",
  h1: "Anker y agua de Windmar en un apartamento",
  descripcion: "Figura interactiva: el Anker SOLIX con sus placas PS400 en el balcón, la cisterna y la ósmosis inversa de Windmar en un apartamento de Puerto Rico.",
  fig: "Fig 2",
  about,
  keys: [
    { mark: "dashed", label: "Energía y agua: corren en el sentido del flujo" },
    { mark: "raised", label: "Paredes y techo transparentes para ver adentro (\"Ver adentro\" los cierra)" },
  ],
  caption,
  svg,
  ficha,
  controls,
  etiqueta: "Apartamento con el Anker y el agua de Windmar.",
  DATA,
});
console.log("wrote public/apartamento.html", `${(page.length / 1024).toFixed(0)} KB`, `${R.items.length} items`, `${R.solids.length} solids`, `${R.routes.length} routes`, `scale ${KS.toFixed(3)}`);

A.auditOrExit(R, P);
