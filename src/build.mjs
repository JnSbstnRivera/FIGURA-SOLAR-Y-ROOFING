// Fig 1 · Solar y Roofing (Windmar Home, PR): la casa, en public/index.html. Después arma la Fig 2, el apartamento
// (apartamento.mjs), en public/apartamento.html: el build de Vercel corre solo este archivo.
//   node src/build.mjs           → public/index.html y public/apartamento.html
//   node src/build.mjs --audit   → además corre la auditoría de geometría de Anatomy en las dos
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../vendor/anatomy/kit/lathe.mjs";
import * as A from "../vendor/anatomy/kit/audit.mjs";
import { BASE, LIMITES, EJEMPLO, MESES, kwhPorPlacaDia, sugerencia } from "./model.mjs";
import { SOL, factorRumbo, tofDe, rumboDe } from "./sol.mjs";
import { AGUA } from "./agua.mjs";
import { ANKER as ANKER_MODELO, esencialEn } from "./anker.mjs";
import { PRODUCTOS, nuncaJuntas } from "./productos.mjs";
import { LOGO } from "./logo.mjs";
import { taller } from "./taller.mjs";
import { PULG, PS400_MEDIDAS, PS200_MEDIDAS, normalPs400, piezas } from "./piezas.mjs";
import { escribirPagina, stepper, seccionDe, respaldoHtml, rumbosHtml, tag } from "./pagina.mjs";

const fmtN = (v) => Math.round(v).toLocaleString("en-US");
const pctN = (f) => `${Math.round(f * 100)} %`;
const HERE = dirname(fileURLToPath(import.meta.url));
const W = 760;
const AZ = 52;
const EL = 33;

// ---------- mundo: x = sur, y = oeste, z = arriba (unas 10.5 unidades por metro) ----------
// El kit dibuja de x a y en el sentido del reloj visto desde arriba, así que con x al sur la y apunta al
// oeste (con y al este la casa quedaba en espejo). Los nombres viejos que dicen "East" o ".e" (louverEast,
// win.e1, gargola.e) son de la cara +y: la fachada oeste.
// Base ceñida a la casa, el equipo y el poste, para que la casa salga lo más grande posible.
const PLATE = { x: -74, y: -102, w: 134, d: 186, r: 10 };
const PLATE_H = 10;
const FOOT_H = 5;

// La casa se alargó 5 hacia el este (22-oct) para que las cisternas grandes quepan en la franja oeste del techo,
// entre las placas y el borde: las placas se corrieron con ella y la fachada oeste quedó donde estaba.
const HX1 = 44;
const HY1 = 24;
const PLINTH = { x: -63, y: -96, w: 108, d: 121, r: 0.6 };
const WALLS = { x: -62, y: -95, w: 106, d: 119, r: 0.5 };
const WALL_Z = [3, 40];
const SLAB = { x: -63.5, y: -96.5, w: 109, d: 122, r: 0.5 };
const SLAB_Z = [40, 45];
const PRIMER_Z = [45, 45.8];
const COAT_Z = [45.8, 48.2];
const TOPZ = COAT_Z[1];
const NOTCH = { primer: 9, coat: 18 };

const BETA = (10 * Math.PI) / 180;
const PANEL = { w: 11, l: 19.7, t: 1, gap: 0.4 };
const COLS = 8;
const ROWS = 4;
const PITCH = PANEL.l * Math.cos(BETA) + 6;
const ROWS_XS = Array.from({ length: ROWS }, (_, row) => 36 - row * PITCH);
const ARRAY_Y0 = -93;
const LIFT = 6;
const PAD_H = 0.8;
const RAIL_D = [0.25, 0.75].map((f) => f * PANEL.l * Math.cos(BETA));
const zLow = TOPZ + LIFT;
const railTop = (d) => zLow + (d - 1.2) * Math.tan(BETA);
const colY = (c) => ARRAY_Y0 + PANEL.w / 2 + c * (PANEL.w + PANEL.gap);
const RAIL_END = colY(COLS - 1) + (PANEL.w + PANEL.gap) / 2 + 1.4;
const ZC = railTop(RAIL_D[0]) - 0.9;
const TRUNK_Y = RAIL_END + 2.2;
const TEE = { x: 36 - PANEL.l * Math.cos(BETA) - 3, y: TRUNK_Y, z: ZC, r: 1.9 };

const INV = { x0: -26, x1: -10, y0: 24, y1: 32, z0: 14, z1: 32 };
// Powerwall a escala real (algo más anchos para que se lea la columna de luces); caben 4 junto a la pared
const BAT = { w: 7.6, gap: 2, y0: 26, y1: 28.6, z0: 1.6, z1: 15.2 };
const BATS = Array.from({ length: 4 }, (_, k) => ({ x0: -1 + k * (BAT.w + BAT.gap), x1: -1 + k * (BAT.w + BAT.gap) + BAT.w, y0: BAT.y0, y1: BAT.y1, z0: BAT.z0, z1: BAT.z1 }));
const MAIN = { x0: -44, x1: -33, y0: 24, y1: 29, z0: 16, z1: 31 };
const LB = { x0: -41, x1: -36, y0: 24, y1: 28.6, z0: 35.5, z1: 39.2 };
const SOCKET = { x0: -60, x1: -50, y0: 24, y1: 31, z0: 17, z1: 31 };
const METER_C = [-55, 31, 24];
const MAST = { x: -55, y: 28.6, z0: 31, z1: 60 };
const POLE = { x: -44, y: 72, z0: 1.2, z1: 88, r0: 2.9, r1: 2.2 };
const poleR = (z) => POLE.r0 + ((POLE.r1 - POLE.r0) * (z - POLE.z0)) / (POLE.z1 - POLE.z0);
const AC = { x0: -44, x1: -30, y0: 12.5, y1: 18.5, z0: TOPZ + 2.4, z1: TOPZ + 12 };
const DC_Y = 27.6;
const DC_Z = 43;
// el cuarto de equipos de la fachada oeste (ver más abajo): de x0 a x1 y de la fachada a yf, con paredes de `muro`
const CUARTO = { x0: -49.8, x1: -2, yf: 42.3, muro: 0.6, alero: 0.6, caida: 3.4, grueso: 0.3, puerta: [-47.4, -38.4, 22], persianas: [[-28.4, -18.4], [-12.6, -4.6]] };

// El calentador solar y su tanque (ver más abajo): sus medidas van aquí porque el lienzo tiene que
// contar el tanque, que es lo más alto del techo.
const COLECTOR = { ancho: 34 * PULG, largo: 76 * PULG, grueso: 0.9, beta: (18 * Math.PI) / 180, frente: -38.1, z0: TOPZ + 2.6, paso: 34 * PULG + 0.6 };
const TANQUE_CAL = { 80: { largo: 53.5 * PULG, r: (23.5 / 2) * PULG }, 120: { largo: 63 * PULG, r: (28 / 2) * PULG } };
const yColector = (j) => ARRAY_Y0 + 0.9 + COLECTOR.ancho / 2 + j * COLECTOR.paso;
function tanqueCal(cal) {
  const { beta, largo: L, grueso, frente: xf, z0 } = COLECTOR;
  const t = TANQUE_CAL[cal.gal];
  const yc = yColector(0) + ((cal.colectores - 1) * COLECTOR.paso) / 2;
  return { x: xf - L * Math.cos(beta) - 1.2, y0: yc - t.largo / 2, y1: yc + t.largo / 2, yc, z: z0 + L * Math.sin(beta) + grueso * Math.cos(beta) + 0.3 + t.r, r: t.r, largo: t.largo };
}

// El lugar de las cisternas en el techo (ver más abajo): la franja oeste, entre las cajas de las filas y el borde.
const LUGAR_TECHO = { x: 1, y: 14.6, z: TOPZ + 4.8 };

// ---------- el plano: cómo se dibuja cada producto de productos.mjs ----------
// Cada producto del plano tiene aquí su dibujo, con el mismo id: lienzo(m) da los puntos más altos de cada modelo,
// para que el lienzo los cuente; cielo(m), su caja, para que el sol y la luna pasen por fuera de ella; y dibujar(p)
// pone sus piezas (más abajo, con las de la casa). Cada pieza lleva `parte(id, parte)`: el `on` de su sombra y el
// atributo con que la página la prende y la apaga; la parte es un modelo o una de las partes del producto. `mide`
// le pasa a la página lo que midió el dibujo de un modelo, como la mirilla de cada cisterna.
const parte = (id, nombre) => ({ on: `p:${id}:${nombre}`, attrs: ` data-p="${id}:${nombre}"` });
const MEDIDAS = {};
const mide = (id, modelo, datos) => Object.assign(((MEDIDAS[id] ??= {})[modelo] ??= {}), datos);
const DIBUJOS = {
  calentador: {
    lienzo: (m) => {
      const t = tanqueCal(m);
      return [[t.x, t.y0, t.z + t.r], [t.x, t.y1, t.z + t.r]];
    },
    cielo: (m) => {
      const t = tanqueCal(m);
      return k.boxCorners({ x: t.x - t.r, y: t.y0, w: 2 * t.r, d: t.y1 - t.y0 }, t.z - t.r, t.z + t.r);
    },
    dibujar: (p) => dibujarCalentador(p),
  },
  cisterna: {
    lienzo: (m) => {
      const { lugar, top } = medidasCisterna(m);
      return [[lugar.x, lugar.y, top + 1]];
    },
    cielo: (m) => {
      const { lugar, r, top } = medidasCisterna(m);
      return k.boxCorners({ x: lugar.x - r, y: lugar.y - r, w: 2 * r, d: 2 * r }, lugar.z, top + 1);
    },
    dibujar: (p) => dibujarCisterna(p),
  },
  // el suavizador va en el suelo, contra la pared: no sale del lienzo ni del contorno del cielo
  poe: { dibujar: (p) => dibujarPoe(p) },
  // el Anker y sus PS400 van en el patio, bajos: tampoco; ni el E10, en el cuarto de equipos, ni la nevera
  anker: { dibujar: (p) => dibujarAnker(p) },
  e10: { dibujar: (p) => dibujarE10(p) },
  nevera: { dibujar: (p) => dibujarNevera(p) },
};
const puntasDe = (cual) => PRODUCTOS.flatMap((p) => p.modelos.flatMap((m) => DIBUJOS[p.id][cual]?.(m) ?? []));
// Las puntas del dibujo: el lienzo (taller.mjs) toma su proporción exacta, sin franjas vacías, y la casa llena la
// tarjeta.
const FIT = [
  ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
  [POLE.x, POLE.y, POLE.z1 + 1.4],
  [MAST.x, MAST.y, 64],
  [SLAB.x, SLAB.y, TOPZ],
  [ROWS_XS[ROWS - 1] - PANEL.l, ARRAY_Y0, zLow + 5],
  [AC.x0, AC.y0, AC.z1],
  ...puntasDe("lienzo"),
];
const TALLER = taller({ W, AZ, EL, FIT });
const { H, P, KS, at, S, Ln, Dots, path3, f2, R, record, SOMBRA, p3, tapaSol, cara, recibeSol, anillosCaja, carasCaja, carasAnillo, anilloEn, anilloRedondo, faceY, faceX, rect, sombraCilindro, box, cyl, turned, prism, layer, ball, arcWhere, pipe, strap, logoEnCilindro, cieloDe } = TALLER;
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
// los tornillos de las esquinas, afuera de la casa (más largo, su esquina noreste les quedaba encima)
const plateScrews = k.corners(PLATE, 7);
back.push(Ln(plateScrews.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
back.push(Dots(plateScrews.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
record(A.slab(PLATE, -PLATE_H, PLATE_H, { name: "stand.plate", ground: true }, 8));
// la sombra en la base va antes que todo lo que está parado encima, que la tapa donde está
back.push(recibeSol("stand.plate", PLATE_PATHS.fill, carasAnillo(anilloEn(k.ringOf(PLATE, 8), -PLATE_H), anilloEn(k.ringOf(PLATE, 8), 0))));

// ---------- brújula: la tarjeta gira para que su N mire al norte, y la marca fija (la línea de fe, como en
// un barco) apunta hacia donde miran las placas, así se lee el rumbo en la tarjeta ----------
// (en la esquina suroeste del patio: más adentro van las PS400 del Anker, hasta ocho)
const BRUJULA = { x: 46, y: 65, r: 10, z0: 0.7, z1: 2.8, carta: 8.4 };
cyl("compass.flange", BRUJULA.x, BRUJULA.y, BRUJULA.r + 0.8, 0, BRUJULA.z0, { tone: "lo" }, { steps: 56, sombra: "recibe" });
{
  const { x, y, r, z1, carta } = BRUJULA;
  const screws = [45, 135, 225, 315].map((a) => [x + (r - 0.9) * Math.cos((a * Math.PI) / 180), y + (r - 0.9) * Math.sin((a * Math.PI) / 180)]);
  const extra =
    Ln(k.ring(x, y, carta + 0.1, z1, P, 72), { tone: "lo" }) +
    `<g data-part="rosa"></g>` +
    Ln(k.lineOnTop([x + carta + 0.1, y], [x + r, y], z1, P), { tone: "hi" }) +
    Dots(screws.map(([sx, sy]) => at([sx, sy, z1])), { size: 0.45 });
  cyl("compass", x, y, r, BRUJULA.z0, z1, { tone: "mid" }, { steps: 64, bevel: 0.4, extra });
}

// placa de rótulo, con el único texto grabado del dibujo
const LABEL = { x: 49.2, y: -88, w: 8.6, d: 28, r: 1.2 };
{
  const z = 0.8;
  const cx = LABEL.x + LABEL.w / 2;
  const text = k.faceTextSvg(k.topMatrix([cx - 1.1, LABEL.y + LABEL.d / 2], z, P, "y"), "WINDMAR HOME", { size: 2.3, tone: "mid", anchor: "middle" });
  const rule = (dx, from, to) => Ln(k.lineOnTop([cx + dx, LABEL.y + from], [cx + dx, LABEL.y + to], z, P), { tone: "lo", free: true });
  const extra = Ln(k.planOutline(k.insetPlan(LABEL, 1.4), z, P, 4), { tone: "faint" }) + text + rule(1.4, 6, LABEL.d - 6) + rule(2.8, 8, LABEL.d - 8) + Dots([at([cx, LABEL.y + 3, z]), at([cx, LABEL.y + LABEL.d - 3, z])], { size: 0.45 });
  box("stand.label", [LABEL.x, LABEL.y, 0], [LABEL.x + LABEL.w, LABEL.y + LABEL.d, z], { tone: "lo" }, { r: LABEL.r, steps: 4, extra, sombra: "recibe" });
}

// ---------- casa ----------
box("house.plinth", [PLINTH.x, PLINTH.y, 0], [PLINTH.x + PLINTH.w, PLINTH.y + PLINTH.d, WALL_Z[0]], { tone: "mid" }, { r: PLINTH.r, steps: 3 });
box("house.walls", [WALLS.x, WALLS.y, WALL_Z[0]], [WALLS.x + WALLS.w, WALLS.y + WALLS.d, WALL_Z[1]], { tone: "mid" }, {
  r: WALLS.r,
  steps: 3,
  inner: Ln(k.sideSeam(WALLS, WALL_Z[1] - 3.2, P, 3), { tone: "faint" }),
});

// sellado de silicona: imprimador y capa blanca, cortados en escalones en la esquina suroeste
const SE = [SLAB.x + SLAB.w, SLAB.y + SLAB.d];
const notched = (n) => [
  [SLAB.x, SLAB.y],
  [SE[0], SLAB.y],
  [SE[0], SE[1] - n],
  [SE[0] - n, SE[1] - n],
  [SE[0] - n, SE[1]],
  [SLAB.x, SE[1]],
];
const crack = `<path class="sr-patch" d="${k.pathOf(
  [
    [SE[0] - 8.6, SE[1] - 1.6],
    [SE[0] - 6.4, SE[1] - 3.6],
    [SE[0] - 4.6, SE[1] - 3.2],
    [SE[0] - 2.2, SE[1] - 6],
  ].map(([x, y]) => at([x, y, SLAB_Z[1]])),
)}"/>`;
box("house.slab", [SLAB.x, SLAB.y, SLAB_Z[0]], [SE[0], SE[1], SLAB_Z[1]], { tone: "mid" }, { r: SLAB.r, steps: 3, bevel: 0.6, wrap: "sr-concrete", extra: crack });
// Las capas del techo tienen la muesca de la esquina suroeste: su tapa se parte en dos rectángulos.
function sombraCapa(name, n, z0, z1, propios) {
  return (fill) => {
    const tops = [
      [[SLAB.x, SLAB.y, z1], [SE[0] - n, SLAB.y, z1], [SE[0] - n, SE[1], z1], [SLAB.x, SE[1], z1]],
      [[SE[0] - n, SLAB.y, z1], [SE[0], SLAB.y, z1], [SE[0], SE[1] - n, z1], [SE[0] - n, SE[1] - n, z1]],
    ].map((pts) => cara([0, 0, 1], pts));
    return recibeSol(name, fill, [...tops, ...carasAnillo(anilloEn(notched(n), z0), anilloEn(notched(n), z1), { tapa: false })], { propios });
  };
}
const ROOF_TAPA = [
  tapaSol("roof.coat.a", ...anillosCaja([SLAB.x, SLAB.y, PRIMER_Z[0]], [SE[0] - NOTCH.coat, SE[1], COAT_Z[1]])),
  tapaSol("roof.coat.b", ...anillosCaja([SE[0] - NOTCH.coat, SLAB.y, PRIMER_Z[0]], [SE[0], SE[1] - NOTCH.coat, COAT_Z[1]])),
];
layer("roof.primer", notched(NOTCH.primer), PRIMER_Z[0], PRIMER_Z[1], { tone: "mid" }, { wrap: "sr-primer", capa: sombraCapa("roof.primer", NOTCH.primer, PRIMER_Z[0], PRIMER_Z[1], ROOF_TAPA) });
layer("roof.coat", notched(NOTCH.coat), COAT_Z[0], COAT_Z[1], { tone: "hi" }, { capa: sombraCapa("roof.coat", NOTCH.coat, COAT_Z[0], COAT_Z[1], ROOF_TAPA) });

// gárgolas: desagües del techo que salen del borde de la losa
function gargola(name, [x0, y0, z0], [x1, y1, z1], face) {
  const outlet = face === "x" ? path3([[x1, y0 + 0.8, z0 + 0.6], [x1, y1 - 0.8, z0 + 0.6], [x1, y1 - 0.8, z1 - 0.5], [x1, y0 + 0.8, z1 - 0.5]], true) : path3([[x0 + 0.8, y1, z0 + 0.6], [x1 - 0.8, y1, z0 + 0.6], [x1 - 0.8, y1, z1 - 0.5], [x0 + 0.8, y1, z1 - 0.5]], true);
  box(name, [x0, y0, z0], [x1, y1, z1], { tone: "mid" }, { r: 0.3, extra: Ln(outlet, { tone: "lo" }) });
}
gargola("gargola.s", [SE[0], -71.5, 42.2], [SE[0] + 4, -68.5, 44.2], "x");
gargola("gargola.e", [-29.5, SE[1], 42.2], [-26.5, SE[1] + 4, 44.2], "y");

// tubo de ventilación: una penetración sellada con Roof Patch
{
  const [vx, vy] = [-54, 16];
  cyl("vent.patch", vx, vy, 3.4, TOPZ, TOPZ + 0.6, { tone: "lo" }, { steps: 32, sombra: "recibe" });
  cyl("vent.pipe", vx, vy, 1.6, TOPZ + 0.6, TOPZ + 9, { tone: "mid" }, { steps: 28, inner: Ln(k.sideArc(vx, vy, 1.6, TOPZ + 3, P, 16), { tone: "faint" }) });
  cyl("vent.cap", vx, vy, 2.2, TOPZ + 9, TOPZ + 10, { tone: "mid" }, { steps: 28 });
}

// ventanas tipo Miami (persianas de aluminio) y puerta. En la fachada sur (la cara +x, la más clara) las líneas van en
// tono "mid": en tema claro el "lo" es casi del color de la cara y no se ve.
function louverSouth(name, y0, y1, z0, z1) {
  const X = HX1 + 0.7;
  const i = 1.2;
  const lines = [];
  for (let z = z0 + i + 1.6; z < z1 - i - 0.4; z += 1.6) lines.push(k.segment([X, y0 + i, z], [X, y1 - i, z], P));
  const extra = Ln(path3([[X, y0 + i, z0 + i], [X, y1 - i, z0 + i], [X, y1 - i, z1 - i], [X, y0 + i, z1 - i]], true), { tone: "mid" }) + Ln(lines.join(""), { tone: "mid" });
  box(`${name}.frame`, [HX1, y0, z0], [X, y1, z1], { tone: "mid" }, { r: 0.2, extra });
  box(`${name}.sill`, [HX1, y0 - 1, z0 - 1.2], [HX1 + 1.8, y1 + 1, z0], { tone: "mid" }, { r: 0.2 });
}
function louverEast(name, x0, x1, z0, z1) {
  const Y = HY1 + 0.7;
  const i = 1.2;
  const lines = [];
  for (let z = z0 + i + 1.6; z < z1 - i - 0.4; z += 1.6) lines.push(k.segment([x0 + i, Y, z], [x1 - i, Y, z], P));
  const extra = Ln(path3([[x0 + i, Y, z0 + i], [x1 - i, Y, z0 + i], [x1 - i, Y, z1 - i], [x0 + i, Y, z1 - i]], true), { tone: "lo" }) + Ln(lines.join(""), { tone: "lo" });
  box(`${name}.frame`, [x0, HY1, z0], [x1, Y, z1], { tone: "mid" }, { r: 0.2, extra });
  box(`${name}.sill`, [x0 - 1, HY1, z0 - 1.2], [x1 + 1, HY1 + 1.8, z0], { tone: "mid" }, { r: 0.2 });
}
louverSouth("win.s1", -82, -66, 17, 31);
louverSouth("win.s2", -30, -14, 17, 31);
louverEast("win.e1", 28, 40, 24.4, 33.4);
{
  const X = HX1 + 0.7;
  const [y0, y1] = [-56, -44];
  const panelOf = (za, zb) => path3([[X, y0 + 1.6, za], [X, y1 - 1.6, za], [X, y1 - 1.6, zb], [X, y0 + 1.6, zb]], true);
  const extra = Ln(panelOf(5.4, 15), { tone: "mid" }) + Ln(panelOf(16.6, 26), { tone: "mid" }) + Dots([at([X, y1 - 2.4, 15.8])], { size: 0.6, tone: "hi" });
  box("door", [HX1, y0, WALL_Z[0]], [X, y1, 28], { tone: "mid" }, { r: 0.2, extra });
  box("door.step", [PLINTH.x + PLINTH.w, y0 - 2, 0], [PLINTH.x + PLINTH.w + 5, y1 + 2, WALL_Z[0]], { tone: "mid" }, { r: 0.4 });
}

// ---------- placas: 32 posiciones; la factura decide cuántas se ven ----------
// Se llenan por filas desde el frente y, en cada fila, desde el oeste, así el extremo oeste de cada
// fila (donde está su caja) no cambia.
const n3 = [Math.sin(BETA), 0, Math.cos(BETA)];
const up3 = [-Math.cos(BETA), 0, Math.sin(BETA)];
const SLOTS = [];
for (let row = 0; row < ROWS; row++) {
  for (let n = 0; n < COLS; n++) {
    const c = COLS - 1 - n;
    SLOTS.push({ row, c, index: row * COLS + n });
  }
}
for (const { row, c, index } of SLOTS) {
  const xs = ROWS_XS[row];
  const yc = colY(c);
  const attrs = ` data-slot="${index}" data-kind="rack"`;
  // los últimos cuatro lugares los puede ocupar el calentador solar: nunca se ven con él
  const owner = index >= ROWS * COLS - 4 ? "calentador" : undefined;
  const y0 = yc - (PANEL.w + PANEL.gap) / 2 - (c === 0 ? 1.4 : 0);
  const y1 = yc + (PANEL.w + PANEL.gap) / 2 + (c === COLS - 1 ? 1.4 : 0);
  RAIL_D.forEach((d, ri) => {
    const xr = xs - d;
    const top = railTop(d);
    const bottom = top - 1.8;
    const ends = c === COLS - 1 ? Dots([at([xr, y1 - 0.9, top])], { size: 0.4, tone: "lo" }) : "";
    box(`rack.s${index}.rail${ri}`, [xr - 1.2, y0, bottom], [xr + 1.2, y1, top], { tone: "mid" }, { r: 0.2, extra: ends, attrs, sombra: false, owner });
    cyl(`rack.s${index}.pad${ri}`, xr, yc, 2, TOPZ, TOPZ + PAD_H, { tone: "lo" }, { steps: 24, attrs, sombra: false, owner });
    box(`rack.s${index}.post${ri}`, [xr - 0.8, yc - 0.8, TOPZ + PAD_H], [xr + 0.8, yc + 0.8, bottom], { tone: "mid" }, { r: 0.2, attrs, sombra: false, owner });
  });
  const o = [xs - (PANEL.l / 2) * Math.cos(BETA), yc, zLow + (PANEL.l / 2) * Math.sin(BETA)];
  const F = G.frameOf(o, n3, [0, 1, 0], up3);
  const hw = PANEL.w / 2;
  const hl = PANEL.l / 2;
  const pt = (u, v) => G.add3(G.add3(G.add3(o, G.mul3(n3, PANEL.t)), G.mul3([0, 1, 0], u)), G.mul3(up3, v));
  const iu = hw - 0.7;
  const iv = hl - 0.7;
  const cells = [];
  for (let i = 1; i < 6; i++) {
    const u = -iu + (2 * iu * i) / 6;
    cells.push(k.pathOf([at(pt(u, -iv)), at(pt(u, iv))]));
  }
  for (let j = 1; j < 11; j++) {
    const v = -iv + (2 * iv * j) / 11;
    cells.push(k.pathOf([at(pt(-iu, v)), at(pt(iu, v))]));
  }
  const glass = path3([pt(-iu, -iv), pt(iu, -iv), pt(iu, iv), pt(-iu, iv)], true);
  const extra = `<path class="sr-sun" data-sun d="${glass}"/>` + Ln(glass, { tone: "lo" }) + Ln(cells.join(""), { tone: "faint" });
  // Cada placa tapa el sol (una placa inclinada de 1 de grueso), recibe sombra en su cara de vidrio y
  // lleva 9 puntos de muestra en esa cara para medir cuánto sol le llega (sol.mjs).
  const esquina = (u, v, s) => G.add3(G.add3(G.add3(o, G.mul3(n3, s)), G.mul3([0, 1, 0], u)), G.mul3(up3, v));
  const borde = (s) => [esquina(-hw, -hl, s), esquina(hw, -hl, s), esquina(hw, hl, s), esquina(-hw, hl, s)];
  const on = `slot:${index}`;
  const solidoPlaca = tapaSol(`panel.s${index}`, borde(0), borde(PANEL.t), on);
  SOMBRA.placas ??= [];
  SOMBRA.placas[index] = { slot: index, id: solidoPlaca, puntos: [-2, 0, 2].flatMap((i) => [-2, 0, 2].map((j) => p3(esquina((i / 3) * hw, (j / 3) * hl, PANEL.t + 0.02)))) };
  const capa = (fill) => recibeSol(`panel.s${index}`, fill, [cara(n3, borde(PANEL.t))], { on, propios: [solidoPlaca] });
  prism(`panel.s${index}`, F, [[-hw, -hl], [hw, -hl], [hw, hl], [-hw, hl]], 0, PANEL.t, { tone: "hi" }, { extra, wrap: "sr-panel", attrs: ` data-slot="${index}" data-kind="panel"`, capa, owner });
}

// cajas de fila en el extremo oeste del riel delantero, y el conducto que las recoge
const ROWBOX = ROWS_XS.map((xs, row) => {
  const xr = xs - RAIL_D[0];
  return { row, x0: xr - 2.6, x1: xr + 2.6, y0: RAIL_END, y1: RAIL_END + 4.4, z0: ZC - 2.2, z1: ZC + 2.2 };
});
for (const b of ROWBOX) {
  const lid = path3([[b.x0 + 0.8, b.y0 + 0.8, b.z1], [b.x1 - 0.8, b.y0 + 0.8, b.z1], [b.x1 - 0.8, b.y1 - 0.8, b.z1], [b.x0 + 0.8, b.y1 - 0.8, b.z1]], true);
  box(`rowbox.${b.row}`, [b.x0, b.y0, b.z0], [b.x1, b.y1, b.z1], { tone: "hi" }, {
    r: 0.5,
    steps: 3,
    bevel: 0.3,
    extra: Ln(lid, { tone: "faint" }) + Dots([at([b.x0 + 1.4, b.y1 - 1.4, b.z1]), at([b.x1 - 1.4, b.y0 + 1.4, b.z1])], { size: 0.4 }),
    attrs: ` data-rows="${b.row + 1}"`,
    owner: b.row === 1 || b.row === 2 ? "trunk.n" : undefined,
    on: `rows:${b.row + 1}`,
  });
}
const RIM = Math.sqrt(TEE.r ** 2 - 1.2 ** 2);
ball("tee", [TEE.x, TEE.y, TEE.z], TEE.r, { tone: "mid" });
{
  // ramal norte: de la fila 4 a la T, atravesando las cajas de las filas 3 y 2
  const start = ROWBOX[3].x1;
  const end = TEE.x - RIM;
  const gaps = [ROWBOX[2], ROWBOX[1]].map((b) => [b.x0 - start, b.x1 - start]);
  const segOf = (piece) => {
    const x = piece.mid[0];
    return x < ROWBOX[2].x0 ? "a" : x < ROWBOX[1].x0 ? "b" : "c";
  };
  pipe("trunk.n", [[start, TRUNK_Y, ZC], [end, TRUNK_Y, ZC]], 1.2, {
    gaps,
    flowOf: (piece) => `trunk-${segOf(piece)}`,
    attrsOf: (piece) => ` data-rows="${{ a: 4, b: 3, c: 2 }[segOf(piece)]}"`,
  });
  pipe("trunk.s", [[ROWBOX[0].x0, TRUNK_Y, ZC], [TEE.x + RIM, TRUNK_Y, ZC]], 1.2, { flowOf: () => "trunk-s" });
}

// ---------- unidad de aire acondicionado en el techo ----------
const FAN = { c: [(AC.x0 + AC.x1) / 2, AC.y1, (AC.z0 + AC.z1) / 2 + 0.4], r: 3.9 };
for (const [x0, x1] of [[AC.x0 + 1, AC.x0 + 3.4], [AC.x1 - 3.4, AC.x1 - 1]]) {
  box(`ac.pad${x0}`, [x0 - 0.6, AC.y0 - 0.6, TOPZ], [x1 + 0.6, AC.y1 + 0.6, TOPZ + 0.6], { tone: "lo" }, { r: 0.3, sombra: "recibe" });
  box(`ac.foot${x0}`, [x0, AC.y0, TOPZ + 0.6], [x1, AC.y1, AC.z0], { tone: "mid" }, { r: 0.2, sombra: "recibe" });
}
{
  const m = k.sideMatrix([FAN.c[0], AC.y1], FAN.c[2], P, "left");
  const spokes = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return `M${(Math.cos(a) * 1.1).toFixed(2)} ${(Math.sin(a) * 1.1).toFixed(2)}L${(Math.cos(a) * FAN.r).toFixed(2)} ${(Math.sin(a) * FAN.r).toFixed(2)}`;
  }).join("");
  const blade = (a) => {
    const p = (r, t) => [Math.cos(a + t) * r, Math.sin(a + t) * r];
    const pts = [p(1.1, -0.35), p(3.5, -0.2), p(3.6, 0.35), p(1.1, 0.4)];
    return `M${pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L")}Z`;
  };
  const fan =
    `<g transform="${m}">` +
    `<circle class="sr-fan-bg" r="${FAN.r}"/>` +
    `<g data-part="fan"><path class="sr-blade" d="${[0, 1, 2].map((i) => blade((i / 3) * Math.PI * 2)).join("")}"/></g>` +
    `<circle class="iso-line" data-tone="lo" r="${FAN.r}"/><circle class="iso-line" data-tone="faint" r="2.5"/><circle class="iso-line" data-tone="lo" r="1.1"/>` +
    `<path class="iso-line" data-tone="faint" d="${spokes}"/></g>`;
  const vents = Array.from({ length: 5 }, (_, i) => {
    const y = AC.y0 + 1 + i * 0.95;
    return path3([[AC.x1, y, AC.z1 - 4.6], [AC.x1, y + 0.45, AC.z1 - 4.6], [AC.x1, y + 0.45, AC.z1 - 1.4], [AC.x1, y, AC.z1 - 1.4]], true);
  }).join("");
  box("ac", [AC.x0, AC.y0, AC.z0], [AC.x1, AC.y1, AC.z1], { tone: "hi" }, { r: 0.6, steps: 3, bevel: 0.5, extra: fan + Ln(vents, { tone: "lo" }) });
}
// tubería del aire: entra al techo por una bota sellada
const BOOT = { x: -24, y: (AC.y0 + AC.y1) / 2, r: 1.6, z1: TOPZ + 2.2 };
cyl("lineset.patch", BOOT.x, BOOT.y, 2.6, TOPZ, TOPZ + 0.6, { tone: "lo" }, { steps: 28, sombra: "recibe" });
cyl("lineset.boot", BOOT.x, BOOT.y, BOOT.r, TOPZ + 0.6, BOOT.z1, { tone: "mid" }, { steps: 24, sombra: "recibe" });
for (const dy of [-0.6, 0.6]) {
  pipe(`lineset${dy > 0 ? "b" : "a"}`, [[AC.x1, BOOT.y + dy, AC.z0 + 3], [BOOT.x, BOOT.y + dy, AC.z0 + 3], [BOOT.x, BOOT.y + dy, BOOT.z1]], 0.35, { tone: "mid", bend: 1.9 });
}

// ---------- cisternas Windmar: en el techo, en la franja oeste ----------
// Medidas del PDF maestro de Water (Sun Bot), en productos.mjs: la Eco 500 mide 74" de diámetro y 32" de alto, la
// Hércules 600, 56" × 61", y la Eco 1,000 no trae medidas y se dibuja de 64" × 76" (unos 1,000 gal). Cada una con su
// bomba de ¾ HP y su presurizado de 40 gal. Van en la franja oeste del techo, entre las cajas de las filas y el borde,
// sobre una base baja de hierro con patas en sellos de Roof Patch, y su sombra les cae a las placas del extremo oeste
// (de tarde si miran al sur, de mañana si miran al norte). Solo se ve la que se escoge. Todas llevan una mirilla de
// nivel al lado del logo, donde la página dibuja el agua que tienen. (La Torre 150 va adentro, pegada a la pared, y
// es la de los apartamentos: queda guardada en productos.mjs para esa escena.)
function medidasCisterna(c) {
  const lugar = LUGAR_TECHO;
  const h = c.h * PULG;
  return { lugar, r: (c.d / 2) * PULG, h, z0: lugar.z, top: lugar.z + h };
}
// lo que es de otra cisterna, que nunca se ve con esta: sus tubos pueden pasar por ahí
const otraCisterna = (c) => (name) => name.startsWith("cis") && !name.startsWith(`cis${c.id}`);
// La bomba y el presurizado van en el suelo, frente al inversor, con la cisterna que se escoja. El agua baja de la
// cisterna por dentro de la casa y la bomba la empuja hacia la casa por la pared, o al suavizador si lo hay.
const BOMBA = { x0: -8.2, x1: -5.2, y0: 37.6, y1: 40.4, z0: 0.5, z1: 3.9, eje: [39, 2] };
const PRES = { x: -17.6, y: BOMBA.eje[0] };
function dibujarCisterna(p) {
  for (const c of p.modelos) {
    const enCis = parte(p.id, c.id);
    const { on, attrs } = enCis;
    const { lugar, r, h, z0, top } = medidasCisterna(c);
    const owner = "cisterna.techo";
    // base baja de hierro: plataforma cuadrada del ancho de la cisterna y cuatro patas en sus sellos
    const S0 = { x0: lugar.x - r, x1: lugar.x + r, y0: lugar.y - r, y1: lugar.y + r };
    [[S0.x0, S0.y0], [S0.x1, S0.y0], [S0.x0, S0.y1], [S0.x1, S0.y1]].forEach(([cx, cy], i) => {
      const lx = cx + Math.sign(lugar.x - cx) * 1.1;
      const ly = cy + Math.sign(lugar.y - cy) * 1.1;
      cyl(`cis${c.id}.pad${i}`, lx, ly, 1.7, TOPZ, TOPZ + 0.6, { tone: "lo" }, { steps: 16, sombra: "recibe", owner, ...enCis });
      box(`cis${c.id}.leg${i}`, [lx - 0.7, ly - 0.7, TOPZ + 0.6], [lx + 0.7, ly + 0.7, z0 - 1], { tone: "mid" }, { r: 0.2, sombra: "recibe", owner, ...enCis });
    });
    box(`cis${c.id}.stand`, [S0.x0, S0.y0, z0 - 1], [S0.x1, S0.y1, z0], { tone: "mid" }, { r: 0.3, steps: 2, owner, ...enCis });
    // el cuerpo, con el logo de Windmar al frente y la mirilla de nivel a su lado (piezas.mjs)
    cuerpoCisterna({ p, c, lugar, r, h, z0, top, owner, en: enCis });
    // el agua baja por dentro de la casa: el tubo entra al techo por una bota sellada con Roof Patch
    const bx = lugar.x - r - 3.6;
    cyl(`cis${c.id}.parche`, bx, lugar.y, 2.2, TOPZ, TOPZ + 0.6, { tone: "lo" }, { steps: 24, sombra: "recibe", owner, ...enCis });
    cyl(`cis${c.id}.bota`, bx, lugar.y, 1.1, TOPZ + 0.6, TOPZ + 2.2, { tone: "mid" }, { steps: 20, sombra: "recibe", owner, ...enCis });
    pipe(`cis${c.id}.salida`, [[lugar.x - r, lugar.y, z0 + 1.6], [bx, lugar.y, z0 + 1.6], [bx, lugar.y, TOPZ + 2.2]], 0.6, { touch: [otraCisterna(c)], agua: true, flowOf: () => "agua", attrsOf: () => attrs, bend: 3 });
  }

  // la bomba: va con cualquier cisterna
  const EN_BOMBA = parte(p.id, "bomba");
  box("bomba.losa", [-13.2, 36.4, 0], [-4.4, 41.6, BOMBA.z0], { tone: "lo" }, { r: 0.4, steps: 2, sombra: "recibe", ...EN_BOMBA });
  // el motor acostado, con sus aletas, y la cabeza de la bomba con su luz (prende cuando bombea)
  bomba({ B: BOMBA, motor: -12.4, aletas: [-11.7, -11.0, -10.3, -9.6], en: EN_BOMBA });
  // sin suavizador, de la bomba el agua entra derecho a la casa por la pared
  pipe("bomba.casa", [[-6.7, BOMBA.eje[0], BOMBA.z1], [-6.7, BOMBA.eje[0], 5.4], [-6.7, WALLS.y + WALLS.d, 5.4]], 0.6, { agua: true, flowOf: () => "agua", attrsOf: () => parte(p.id, "aCasa").attrs, touch: ["poe.desdeBomba"], bend: 1.6 });
  // el presurizado de 40 gal de las cisternas de la casa (los de los modelos de esta escena), con su tubo a la bomba
  cyl("pres.base", PRES.x, PRES.y, 1.3, 0, 1, { tone: "lo" }, { steps: 20, sombra: "recibe", ...EN_BOMBA });
  for (const gal of new Set(p.modelos.map((m) => m.presurizado))) {
    const en = parte(p.id, `pres${gal}`);
    const { r } = presurizado({ gal, x: PRES.x, y: PRES.y, en });
    pipe(`pres${gal}.bomba`, [[PRES.x + r, PRES.y, 2], [-12.4, PRES.y, 2]], 0.5, { touch: [gal === 6 ? "pres40" : "pres6"], attrsOf: () => en.attrs });
  }
}

// ---------- suavizador POE Water Care: donde el agua entra a la casa, en la pared oeste ----------
// Del PDF maestro de Water: el prefiltro de sedimento (carcasa transparente de 10" en su bracket), el tanque Water
// Care de 10" × 54" (o el de 13" × 54") con su válvula electrónica arriba, el tanque de sal de 18" × 36" y la luz UV
// Viqua VH410. El agua llega de la bomba (o de la AAA, por un tubo que sube de una caja en el suelo), pasa por el
// prefiltro, el tanque y la UV, y entra a la casa. Va a lo largo de la pared: el tanque de sal y el prefiltro debajo
// del inversor (la sal al lado sur, para que el presurizado no la tape), el tanque en el hueco entre el panel y el
// inversor (es más alto que el bajo del inversor) y la UV a la salida de la válvula, debajo del panel.
const POE = {
  prefiltro: { x: -22, y: 26.1, z0: 5.6, z1: 9.4, r: 0.62 },
  puerto: 9.85,
  registro: { x: -12.7, y: 26.1 },
  resina: { x: -29.5, y: 30.2 },
  valvula: { x0: -30.45, x1: -28.55, y0: 29.25, y1: 31.15, z1: 17.2 },
  sal: { x: -16, y: 29.6, r: (18 / 2) * PULG, h: 36 * PULG },
  uv: { x0: -36.6, x1: -32, y: 30.2, z: 15.2, r: 0.5 },
};
function dibujarPoe(p) {
  const equipo = parte(p.id, "equipo");
  const MIRILLA = Math.atan2(k.towardViewer(P)[1], k.towardViewer(P)[0]);
  const frente = [Math.cos(MIRILLA), Math.sin(MIRILLA), 0];
  const { prefiltro: PF, puerto: zp, valvula: V, sal: SAL, uv: UV } = POE;
  // el tanque Water Care de cada modelo: base negra, cuerpo de fibra y el domo de arriba
  for (const m of p.modelos) {
    const { on, attrs } = parte(p.id, m.id);
    const r = (m.resina[0] / 2) * PULG;
    const h = m.resina[1] * PULG;
    const owner = "poe.resina";
    cyl(`poe${m.id}.base`, POE.resina.x, POE.resina.y, r + 0.25, 0, 0.5, { tone: "lo" }, { steps: 24, sombra: "recibe", owner, on, attrs });
    const TF = G.frameOf([POE.resina.x, POE.resina.y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    const capa = (fill) => sombraCilindro(`poe${m.id}`, POE.resina.x, POE.resina.y, r, 0.5, 0.5 + h, fill, { on, lados: 20 });
    turned(`poe${m.id}`, TF, [[0.5, r], [h - 0.5, r], [h + 0.2, r * 0.72, 1]], { tone: "mid" }, { owner, attrs, capa, wrap: "sr-resina" });
  }
  // la válvula electrónica, con su pantalla, encima del tanque (la misma en los dos modelos)
  const pantalla = at([(V.x0 + V.x1) / 2, V.y1, V.z1 - 0.7]);
  const vextra = `<circle class="sr-led sr-led-fija" cx="${f2(pantalla[0])}" cy="${f2(pantalla[1])}" r="0.45"/>` + Ln(faceY(V.y1, rect(V.x0 + 0.3, V.x1 - 0.3, V.z1 - 1.2, V.z1 - 0.25)), { tone: "faint" });
  box("poe.valvula", [V.x0, V.y0, 54 * PULG + 0.1], [V.x1, V.y1, V.z1], { tone: "lo" }, { r: 0.3, steps: 2, extra: vextra, sombra: "recibe", owner: "poe.resina", ...equipo });
  // el tanque de sal, con su tapa y el logo de Windmar al frente
  {
    const TF = G.frameOf([SAL.x, SAL.y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    const ancho = Math.min(SAL.r * 1.32, ((SAL.h - 1) * 0.6) / LOGO.alto);
    const logo = p.logo ? logoEnCilindro({ centro: [SAL.x + (SAL.r + 0.03) * frente[0], SAL.y + (SAL.r + 0.03) * frente[1], SAL.h * 0.5], frente, eje: [0, 0, 1], r: SAL.r + 0.03, ancho }) : "";
    const capa = (fill) => sombraCilindro("poe.sal", SAL.x, SAL.y, SAL.r, 0, SAL.h, fill, { on: equipo.on, lados: 24 });
    turned("poe.sal", TF, [[0, SAL.r - 0.2], [0.3, SAL.r], [SAL.h - 0.4, SAL.r], [SAL.h, SAL.r - 0.4, 1]], { tone: "hi" }, { extra: logo, attrs: equipo.attrs, capa });
    cyl("poe.sal.tapa", SAL.x, SAL.y, SAL.r - 0.25, SAL.h, SAL.h + 0.5, { tone: "mid" }, { steps: 28, bevel: 0.15, sombra: "recibe", ...equipo });
  }
  // el prefiltro: bracket en la pared, tapa y la carcasa transparente colgando de ella
  box("poe.bracket", [PF.x - 0.7, HY1, PF.z1 + 0.1], [PF.x + 0.7, PF.y - 0.75, PF.z1 + 0.8], { tone: "mid" }, { r: 0.15, sombra: "recibe", ...equipo });
  cyl("poe.prefiltro.tapa", PF.x, PF.y, 0.8, PF.z1, PF.z1 + 0.9, { tone: "mid" }, { steps: 20, bevel: 0.1, sombra: "recibe", ...equipo });
  cyl("poe.prefiltro", PF.x, PF.y, PF.r, PF.z0, PF.z1, { tone: "hi" }, { steps: 20, wrap: "sr-carcasa", inner: Ln(k.sideArc(PF.x, PF.y, PF.r, PF.z0 + 1.4, P, 12), { tone: "faint" }), sombra: "recibe", ...equipo });
  // la luz UV: la cámara de acero acostada a la salida de la válvula, con su franja de luz, sostenida de la pared
  // por un brazo, y en la pared su control con la luz prendida
  {
    const MF = G.frameOf([0, UV.y, UV.z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    const sobre = (x) => [x, UV.y + UV.r * 0.74, UV.z + UV.r * 0.74];
    const luz = path3([sobre(UV.x0 + 0.5), sobre(UV.x1 - 0.5)]);
    turned("poe.uv", MF, [[UV.x0, UV.r - 0.15], [UV.x0 + 0.25, UV.r], [UV.x1 - 0.25, UV.r], [UV.x1, UV.r - 0.15]], { tone: "hi" }, { extra: `<path class="sr-uv" d="${luz}"/>`, attrs: equipo.attrs });
    const xm = (UV.x0 + UV.x1) / 2;
    box("poe.uv.brazo", [xm - 0.25, HY1, UV.z - 0.3], [xm + 0.25, UV.y - UV.r + 0.05, UV.z + 0.3], { tone: "mid" }, { r: 0.1, sombra: false, ...equipo });
    const led = at([xm - 0.2, HY1 + 0.8, UV.z - 2.2]);
    box("poe.uv.control", [xm - 1.1, HY1, UV.z - 3.4], [xm + 0.7, HY1 + 0.8, UV.z - 1.4], { tone: "mid" }, { r: 0.2, extra: `<circle class="sr-led sr-led-fija" cx="${f2(led[0])}" cy="${f2(led[1])}" r="0.4"/>`, sombra: "recibe", ...equipo });
  }
  // los tubos: el agua llega de la bomba o de la AAA, pasa por el prefiltro, el tanque y la UV, y entra a la casa
  const yp = PF.y;
  const conAgua = (attrs) => ({ agua: true, flowOf: () => "agua", attrsOf: () => attrs, bend: 1.2 });
  const desdeCalle = parte(p.id, "desdeCalle");
  box("poe.registro", [POE.registro.x - 0.9, PLINTH.y + PLINTH.d + 0.2, 0], [POE.registro.x + 0.9, POE.registro.y + 0.9, 0.8], { tone: "lo" }, { r: 0.2, sombra: "recibe", ...desdeCalle });
  pipe("poe.desdeCalle", [[POE.registro.x, yp, 0.8], [POE.registro.x, yp, zp], [PF.x + 0.8, yp, zp]], 0.4, { ...conAgua(desdeCalle.attrs), touch: ["poe.desdeBomba"] });
  pipe("poe.desdeBomba", [[-6.7, BOMBA.eje[0], BOMBA.z1], [-6.7, BOMBA.eje[0], 5.4], [-6.7, yp, 5.4], [POE.registro.x, yp, 5.4], [POE.registro.x, yp, zp], [PF.x + 0.8, yp, zp]], 0.4, { ...conAgua(parte(p.id, "desdeBomba").attrs), touch: ["bomba.casa", "poe.desdeCalle", "poe.registro"], bend: 1.6 });
  // los codos que en pantalla casi se devuelven (de ir hacia la pared a bajar) van más abiertos
  pipe("poe.filtrada", [[PF.x - 0.8, yp, zp], [-26.9, yp, zp], [-26.9, yp, 16.2], [-26.9, POE.resina.y, 16.2], [V.x1, POE.resina.y, 16.2]], 0.4, { ...conAgua(equipo.attrs), bend: 1.6 });
  pipe("poe.suave", [[V.x0, UV.y, UV.z], [UV.x1, UV.y, UV.z]], 0.4, { ...conAgua(equipo.attrs), touch: ["poe10x54", "poe13x54"] });
  // de la UV sale por su puerto de atrás, derecho a la pared
  pipe("poe.casa", [[UV.x0 + 0.6, UV.y - UV.r + 0.05, UV.z], [UV.x0 + 0.6, HY1, UV.z]], 0.4, conAgua(equipo.attrs));
}

// ---------- Anker SOLIX con sus placas PS400: aparte de las placas del techo ----------
// La estación va en el suelo frente a la pared oeste, al lado del panel, con su transfer switch en la pared (un tubo
// corto lo lleva al panel, a los circuitos de lo esencial) y la BP3800, la batería de expansión, a su lado. Las PS400
// van abiertas en el patio sobre sus patas, inclinadas 40° hacia donde miran las placas del techo, con sus cables
// por el suelo hasta la estación. Medidas de las fichas de Anker: la F2600 mide 20.7" × 15.5" × 9.8", la F3800 Plus
// 27.6" × 15.3" × 15.6", la BP3800 15.5" × 14" × 10.3" y cada PS400 abierta 102" × 36". Todo eso, menos las PS400,
// va en el cuarto de equipos, contra su pared norte. `cable` es la x por donde los cables llegan a la estación.
const ANKER = { x: -41.44, y: 31, cable: -46 };
const TS = { x0: -48.9, x1: -45.4, y1: HY1 + 2, z0: 18, z1: 23 };
// Las PS400 van en el patio, una fila detrás de otra, en el orden en que se suman: las tres de siempre, tres más hacia
// la brújula y dos al norte del poste (no caben a su lado). `hacia` dice a qué cable se une el de cada una: al de la
// anterior, o al de la estación.
const PS400 = { frentes: [-26, -14, -2, 10, 22, 34, -50, -62], hacia: [null, 0, 1, 2, 3, 4, "estacion", 6], y0: 44, z0: 1, bus: 42.6 };
function dibujarAnker(p) {
  const equipo = parte(p.id, "equipo");
  // la estación, una por tamaño: la F2600 (con o sin la BP2600) y la F3800 Plus (con o sin la BP3800), y su batería de
  // expansión al sur de ella
  const estaciones = [["f2600", p.modelos.find((m) => m.id.startsWith("f2600"))], ["f3800", p.modelos.find((m) => m.id.startsWith("f3800"))]].filter(([, m]) => m);
  for (const [nombre, m] of estaciones) estacionAnker({ nombre, m, x1: ANKER.x, y0: ANKER.y, en: parte(p.id, nombre) });
  if (p.modelos.some((m) => m.bp2600)) bateriaExpansion({ nombre: "bp2600", x: ANKER.x, y0: ANKER.y, en: parte(p.id, "bp2600") });
  if (p.modelos.some((m) => m.bp)) bateriaExpansion({ nombre: "bp3800", x: ANKER.x, y0: ANKER.y, en: parte(p.id, "bp3800") });
  // el transfer switch en la pared: el manual con su palanca, el automático con su luz; y el tubo corto al panel
  for (const tipo of ["manual", "automatico"].filter((t) => p.modelos.some((m) => (m.transfer === "manual") === (t === "manual")))) {
    transferSwitch({ tipo, x0: TS.x0, x1: TS.x1, pared: HY1, y1: TS.y1, z0: TS.z0, z1: TS.z1, en: parte(p.id, tipo) });
  }
  // (lo del E10 nunca va con el portátil: sus piezas pueden ocupar el mismo lugar)
  pipe("anker.tablero", [[TS.x1, HY1 + 1, 20.5], [MAIN.x0, HY1 + 1, 20.5]], 0.45, { flowOf: () => "anker", attrsOf: () => equipo.attrs, touch: ["e10.*"] });
  // el cable de la estación al transfer switch: sale por detrás, va a la pared y sube
  pipe("anker.cable", [[ANKER.cable, ANKER.y, 1], [ANKER.cable, HY1 + 1.6, 1], [ANKER.cable, HY1 + 1.6, TS.z0]], 0.3, { flowOf: () => "anker", attrsOf: () => equipo.attrs, bend: 1.4, touch: ["e10.*"] });
  // las PS400 en el patio (piezas.mjs): se ven las que lleva, en el orden de PS400.frentes
  const yc = PS400.y0 + PS400_MEDIDAS.largo / 2;
  // (y en los primeros cuatro lugares, las PS200 de la F2600, más chicas, con el mismo cable)
  const muestras = [];
  const muestras200 = [];
  PS400.frentes.forEach((xf, j) => {
    const ps = parte(p.id, `ps${j}`);
    muestras.push(ps400({ j, xf, yc, z0: PS400.z0, en: ps, owner: `anker.ps${j}` }));
    // su cable por el suelo: baja de la placa al cable que corre hasta la estación (en la base, debajo de todo)
    const xc = xf - 0.35;
    const k = PS400.hacia[j];
    const fin = k === null ? [[ANKER.cable, PS400.bus, 0.02], [ANKER.cable, ANKER.y + 3, 0.02]] : k === "estacion" ? [[ANKER.cable, PS400.bus, 0.02]] : [[PS400.frentes[k] - 0.35, PS400.bus, 0.02]];
    const d = path3([[xc, PS400.y0 + 1, 0.02], [xc, PS400.bus, 0.02], ...fin]);
    const cable = `<path class="sr-cable" d="${d}"/><path class="sr-flow" data-flow="ps400" data-s0="0" d="${d}"/>`;
    back.push(`<g${ps.attrs}>${cable}</g>`);
    if (j < 4) {
      const ps2 = parte(p.id, `ps200_${j}`);
      muestras200.push(ps400({ j, xf, yc: PS400.y0 + PS200_MEDIDAS.largo / 2, z0: PS400.z0, en: ps2, owner: `anker.ps${j}`, nombre: `anker.ps200_${j}`, medidas: PS200_MEDIDAS }));
      back.push(`<g${ps2.attrs}>${cable}</g>`);
    }
  });
  // lo que mide cada modelo para la página: las muestras de cada lugar de PS400 (y de PS200), para la sombra de cada
  // momento (la página toma las de las que lleva)
  for (const m of p.modelos) mide(p.id, m.id, { ps: muestras, ps200: muestras200 });
}

// ---------- Anker SOLIX E10: en el cuarto de equipos, contra su pared norte ----------
// El módulo de poder encima de sus baterías B6000 (de una a cinco), de frente al sur: sobre su carrito (el kit
// portátil), sobre su base o, con cuatro o más baterías, en su montura de pared. Su caja va en la pared de la casa, al
// lado del panel: la Smart Inlet Box (MTS) o la Power Dock (ATS). Las placas del kit solar van en el patio, en los
// lugares de las primeras PS400, y el Smart Generator 5500 afuera, al norte del cuarto, con su cable a la pared.
// Medidas de las fichas de Anker, en pulgadas: el módulo 26.4 × 11.8 × 10.2, la B6000 26.4 × 12.7 × 11.1, la Smart
// Inlet Box 16.5 × 11 × 5.2, la Power Dock 15 × 36.1 × 7.1 y el generador 27.9 × 22.2 × 16.5. Comparte dueño con la
// estación del portátil, que nunca va con él.
const E10 = { x0: CUARTO.x0 + CUARTO.muro, yc: 35, base: 1.2, caja: -48.9, cable: -47.8, gen: { x0: -58.5, y0: 34.5 } };
function dibujarE10(p) {
  const [ancho, hB, fB] = [26.4, 12.7, 11.1].map((v) => v * PULG);
  const [hM, fM] = [11.8, 10.2].map((v) => v * PULG);
  const { x0, yc, base, caja } = E10;
  const [ya, yb] = [yc - ancho / 2, yc + ancho / 2];
  const owner = "anker.estacion";
  // la base: el carrito con sus ruedas y su agarradera, la base en el piso o los rieles de la montura en la pared
  const carrito = parte(p.id, "carrito");
  box("e10.carrito", [x0 + 0.1, ya - 0.2, 0.7], [x0 + fB + 0.3, yb + 0.2, base], { tone: "lo" }, { r: 0.2, owner, ...carrito });
  for (const [i, y] of [ya - 0.6, yb + 0.6].entries()) {
    const F = G.frameOf([x0 + fB - 0.6, y, 0.7], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    turned(`e10.rueda${i}`, F, [[-0.3, 0.7], [0.3, 0.7]], { tone: "lo" }, { owner, attrs: carrito.attrs });
  }
  pipe("e10.agarradera", [[x0 + 0.5, yb + 0.2, 0.95], [x0 + 0.5, yb + 1.2, 0.95], [x0 + 0.5, yb + 1.2, base + 9]], 0.22, { tone: "mid", bend: 0.8, attrsOf: () => carrito.attrs, ends: [true, false] });
  box("e10.base", [x0 + 0.1, ya - 0.2, 0], [x0 + fB + 0.3, yb + 0.2, base], { tone: "lo" }, { r: 0.2, owner, sombra: "recibe", ...parte(p.id, "base") });
  const montura = parte(p.id, "montura");
  for (const [i, y] of [ya - 0.5, yb + 0.1].entries()) box(`e10.riel${i}`, [x0, y, base], [x0 + 0.5, y + 0.4, base + 5 * hB + hM], { tone: "lo" }, { r: 0.1, owner, ...montura });
  // las baterías, una encima de otra, con su franja y su luz al frente
  for (let j = 0; j < 5; j++) {
    const z = base + j * hB;
    const xf = x0 + fB;
    const extra = Ln(faceX(xf, rect(ya + 0.8, yb - 0.8, z + 0.6, z + hB - 0.6)), { tone: "faint" }) + Ln(faceX(xf, [[ya + 1.6, z + hB - 1.2], [ya + 3.6, z + hB - 1.2]], false), { tone: "lo", free: true });
    box(`e10.b${j}`, [x0, ya, z], [xf, yb, z + hB], { tone: "mid" }, { r: 0.3, steps: 2, bevel: 0.2, wrap: "sr-anker", extra, owner, ...parte(p.id, `b${j}`) });
  }
  // el módulo de poder encima de la última, con su pantalla y las cinco luces de la carga
  for (let k = 1; k <= 5; k++) {
    const z = base + k * hB;
    const xf = x0 + fM;
    const luces = Array.from({ length: 5 }, (_, i) => {
      const y = ya + 1.6 + i * 0.5;
      return `<path class="sr-led" data-anker-led="${i}" d="${faceX(xf, rect(y, y + 0.34, z + hM - 1.3, z + hM - 0.9))}"/>`;
    }).join("");
    const extra = Ln(faceX(xf, rect(yb - 3.6, yb - 1, z + 0.9, z + hM - 0.9)), { tone: "lo" }) + luces;
    box(`e10.modulo${k}`, [x0, ya + 0.15, z], [xf, yb - 0.15, z + hM], { tone: "mid" }, { r: 0.4, steps: 3, bevel: 0.3, wrap: "sr-anker", extra, owner, ...parte(p.id, `modulo${k}`) });
  }
  // la caja en la pared de la casa: la Smart Inlet Box (MTS) o la Power Dock (ATS), con su tubo corto al panel
  const cajas = { mts: [16.5, 11, 5.2, 16], ats: [15, 36.1, 7.1, 12.6] };
  for (const [nombre, [w, h, d, z0]] of Object.entries(cajas)) {
    const en = parte(p.id, nombre);
    // la otra caja nunca va con esta, ni nada del portátil
    const nunca = ["anker.*", `e10.${nombre === "mts" ? "ats" : "mts"}*`];
    const [cw, ch, cd] = [w, h, d].map((v) => v * PULG);
    const y1 = HY1 + cd;
    const led = at([caja + cw - 0.8, y1, z0 + ch - 0.8]);
    const extra = Ln(faceY(y1, rect(caja + 0.4, caja + cw - 0.4, z0 + 0.4, z0 + ch - 0.4)), { tone: "faint" }) + `<circle class="sr-led sr-led-fija" cx="${f2(led[0])}" cy="${f2(led[1])}" r="0.3"/>`;
    box(`e10.${nombre}`, [caja, HY1, z0], [caja + cw, y1, z0 + ch], { tone: "hi" }, { r: 0.25, steps: 2, extra, owner: "anker.ts", sombra: "recibe", ...en });
    const zt = Math.min(z0 + ch - 1, 20.5);
    pipe(`e10.${nombre}.tablero`, [[caja + cw, HY1 + Math.min(1, cd / 2), zt], [MAIN.x0, HY1 + Math.min(1, cd / 2), zt]], 0.45, { flowOf: () => "anker", attrsOf: () => en.attrs, touch: nunca });
    pipe(`e10.${nombre}.cable`, [[E10.cable, ya, 3.6], [E10.cable, HY1 + cd / 2, 3.6], [E10.cable, HY1 + cd / 2, z0]], 0.35, { flowOf: () => "anker", attrsOf: () => en.attrs, bend: 1.4, touch: nunca });
  }
  // el Smart Generator 5500, afuera, con su tablero y sus rejillas, y su cable a la pared del cuarto
  const gen = parte(p.id, "generador");
  const [gl, ga, gh] = [27.9, 22.2, 16.5].map((v) => v * PULG);
  const { x0: gx, y0: gy } = E10.gen;
  const rejillas = faceY(gy + ga, rect(gx + 0.8, gx + gl * 0.45, 0.9, 4.1)) + [1, 2, 3].map((i) => faceY(gy + ga, [[gx + 0.8, 0.9 + i * 0.8], [gx + gl * 0.45, 0.9 + i * 0.8]], false)).join("");
  const gextra = Ln(faceY(gy + ga, rect(gx + gl * 0.55, gx + gl - 0.8, gh * 0.35, gh - 0.8)) + rejillas, { tone: "lo" });
  box("e10.generador", [gx, gy, 0], [gx + gl, gy + ga, gh], { tone: "mid" }, { r: 0.6, steps: 3, bevel: 0.3, extra: gextra, ...gen });
  pipe("e10.generador.cable", [[gx + gl, gy + ga / 2, 2.2], [CUARTO.x0, gy + ga / 2, 2.2]], 0.35, { flowOf: () => "gen", attrsOf: () => gen.attrs });
  // las placas del kit solar, en los lugares de las primeras PS400, con su cable por el suelo hasta el E10
  const yc0 = PS400.y0 + PS400_MEDIDAS.largo / 2;
  const muestras = [];
  for (let j = 0; j < 4; j++) {
    const ps = parte(p.id, `ps${j}`);
    const xf = PS400.frentes[j];
    muestras.push(ps400({ j, xf, yc: yc0, z0: PS400.z0, en: ps, owner: `anker.ps${j}`, nombre: `e10.ps${j}` }));
    const xc = xf - 0.35;
    const fin = j === 0 ? [[E10.cable, PS400.bus, 0.02], [E10.cable, yb + 0.2, 0.02]] : [[PS400.frentes[j - 1] - 0.35, PS400.bus, 0.02]];
    const d = path3([[xc, PS400.y0 + 1, 0.02], [xc, PS400.bus, 0.02], ...fin]);
    back.push(`<g${ps.attrs}><path class="sr-cable" d="${d}"/><path class="sr-flow" data-flow="ps400" data-s0="0" d="${d}"/></g>`);
  }
  for (const m of p.modelos) mide(p.id, m.id, { ps: muestras });
}

// ---------- nevera EverFrost: en el cuarto de equipos, frente al suavizador ----------
function dibujarNevera(p) {
  for (const m of p.modelos) nevera({ m, x0: -34, y0: 35.8, en: parte(p.id, m.id) });
}

// ---------- calentador solar Soltek: al fondo del techo, en lugar de las últimas placas ----------
// Medidas del PDF maestro de Water (Sun Bot): colectores de 34"×76", cada uno con 7 tubos de cobre, en un banco
// de aluminio, y detrás y arriba el tanque acostado: de 82 gal (53½" de largo y 23½" de diámetro) en el 80/1 y
// el 80/2, o de 119 gal (63" y 28") en el 120/3 y el 120/4. Va en el extremo este de la última fila, donde
// van las últimas placas: el 80/1 y el 80/2 miden de 5 a 7 pies de ancho y ocupan dos lugares de placas, el
// 120/3 tres y el 120/4 cuatro. Los colectores se inclinan 18° (la latitud) hacia donde miran las placas.
function dibujarCalentador(p) {
  const { beta, largo: L, grueso, frente: xf, z0 } = COLECTOR;
  const nC = [Math.sin(beta), 0, Math.cos(beta)];
  const upC = [-Math.cos(beta), 0, Math.sin(beta)];
  const hw = COLECTOR.ancho / 2;
  const hl = L / 2;
  const colectores = Math.max(...p.modelos.map((m) => m.colectores));
  for (let j = 0; j < colectores; j++) {
    const { on, attrs } = parte(p.id, `col${j}`);
    const y = yColector(j);
    // banco de aluminio: dos rieles a lo largo de y y sus patas en sellos, como el de las placas
    [0.25, 0.75].map((f) => f * L * Math.cos(beta)).forEach((d, ri) => {
      const xr = xf - d;
      const top = z0 + (d - 1.2) * Math.tan(beta);
      box(`col${j}.riel${ri}`, [xr - 1.2, y - hw - 0.3, top - 1.8], [xr + 1.2, y + hw + 0.3, top], { tone: "mid" }, { r: 0.2, attrs, sombra: false, owner: "calentador" });
      cyl(`col${j}.pad${ri}`, xr, y, 2, TOPZ, TOPZ + PAD_H, { tone: "lo" }, { steps: 20, attrs, sombra: false, owner: "calentador" });
      box(`col${j}.pata${ri}`, [xr - 0.8, y - 0.8, TOPZ + PAD_H], [xr + 0.8, y + 0.8, top - 1.8], { tone: "mid" }, { r: 0.2, attrs, sombra: false, owner: "calentador" });
    });
    // el colector: vidrio oscuro con sus 7 tubos de cobre a lo largo y los dos cabezales
    const o = [xf - hl * Math.cos(beta), y, z0 + hl * Math.sin(beta)];
    const F = G.frameOf(o, nC, [0, 1, 0], upC);
    const pt = (u, v, s = grueso) => G.add3(G.add3(G.add3(o, G.mul3(nC, s)), G.mul3([0, 1, 0], u)), G.mul3(upC, v));
    const iu = hw - 0.6;
    const iv = hl - 0.9;
    const cobre = Array.from({ length: 7 }, (_, i) => {
      const u = -iu + 0.5 + ((2 * iu - 1) * i) / 6;
      return path3([pt(u, -iv + 0.6), pt(u, iv - 0.6)]);
    }).join("");
    const cabezales = path3([pt(-iu, -iv + 0.6), pt(iu, -iv + 0.6)]) + path3([pt(-iu, iv - 0.6), pt(iu, iv - 0.6)]);
    const vidrio = path3([pt(-iu, -iv), pt(iu, -iv), pt(iu, iv), pt(-iu, iv)], true);
    // con el sol, los tubos de cobre brillan (por ahí corre el agua que se calienta); el vidrio sigue oscuro
    const extra = Ln(vidrio, { tone: "lo" }) + `<path class="sr-cobre" d="${cobre}${cabezales}"/><path class="sr-calor" data-calor d="${cobre}${cabezales}"/>`;
    const borde = (s) => [pt(-hw, -hl, s), pt(hw, -hl, s), pt(hw, hl, s), pt(-hw, hl, s)];
    const solidoCol = tapaSol(`col${j}`, borde(0), borde(grueso), on);
    const capa = (fill) => recibeSol(`col${j}`, fill, [cara(nC, borde(grueso))], { on, propios: [solidoCol] });
    prism(`col${j}`, F, [[-hw, -hl], [hw, -hl], [hw, hl], [-hw, hl]], 0, grueso, { tone: "mid" }, { extra, wrap: "sr-colector", attrs, capa, owner: "calentador" });
  }
  // el tanque acostado detrás de los colectores, sobre su banco, con el agua fría que entra y la caliente que sale
  for (const cal of p.modelos) {
    const t = tanqueCal(cal);
    const { on, attrs } = parte(p.id, cal.id);
    const { yc, y0, y1 } = t;
    const xt = t.x;
    const zt = t.z;
    for (const [i, yp] of [y0 + 1.6, y1 - 1.6].entries()) {
      cyl(`caltanque${cal.id}.pad${i}`, xt, yp, 1.5, TOPZ, TOPZ + 0.6, { tone: "lo" }, { steps: 16, sombra: "recibe", owner: "calentador", on, attrs });
      box(`caltanque${cal.id}.pata${i}`, [xt - 0.6, yp - 0.6, TOPZ + 0.6], [xt + 0.6, yp + 0.6, zt - t.r], { tone: "mid" }, { r: 0.2, sombra: false, owner: "calentador", on, attrs });
    }
    const TF = G.frameOf([xt, 0, zt], [0, 1, 0], [0, 0, 1], [1, 0, 0]);
    const anillo = (y) => Array.from({ length: 20 }, (_, i) => [xt + t.r * Math.cos((i / 20) * 2 * Math.PI), y, zt + t.r * Math.sin((i / 20) * 2 * Math.PI)]);
    const capa = (fill) => {
      const propio = tapaSol(`caltanque${cal.id}`, anillo(y0), anillo(y1), on);
      return `<path class="sr-agua-caliente" data-calor-tanque d="${fill}"/>` + recibeSol(`caltanque${cal.id}`, fill, [...carasAnillo(anillo(y0), anillo(y1), { tapa: false }), cara([0, 1, 0], anillo(y1))], { on, propios: [propio] });
    };
    const fajas = [0.3, 0.7].map((f) => Ln(G.arcOf(TF, y0 + f * t.largo, t.r, P), { tone: "faint" })).join("");
    // el logo de Windmar entre las dos fajas, en la cara que mira a la cámara
    const vista = G.viewOf(P);
    const frente = G.unit3([vista[0], 0, vista[2]]);
    const logo = p.logo ? logoEnCilindro({ centro: G.add3([xt, yc, zt], G.mul3(frente, t.r + 0.03)), frente, eje: [0, 1, 0], r: t.r + 0.03, ancho: Math.min(0.36 * t.largo, 1.9 * t.r), acostado: true }) : "";
    turned(`caltanque${cal.id}`, TF, [[y0, t.r - 0.5], [y0 + 0.5, t.r], [y1 - 0.5, t.r], [y1, t.r - 0.5]], { tone: "hi" }, { inner: fajas, extra: logo, owner: "calentador", attrs, capa });
    // los dos tubos bajan rectos de debajo del tanque y entran al techo por botas selladas: el agua fría
    // entra y la caliente sale a la casa
    const ajenos = (name) => (name.startsWith("caltanque") && !name.startsWith(`caltanque${cal.id}`)) || /^(rack|panel)\.s(28|29|30|31)\b/.test(name);
    for (const [i, tipo] of ["caliente", "fria"].entries()) {
      const yp = yc + (tipo === "caliente" ? 2.2 : -2.2);
      cyl(`caltanque${cal.id}.parche${i}`, xt, yp, 1.5, TOPZ, TOPZ + 0.6, { tone: "lo" }, { steps: 16, sombra: "recibe", owner: "calentador", on, attrs });
      cyl(`caltanque${cal.id}.bota${i}`, xt, yp, 0.8, TOPZ + 0.6, TOPZ + 1.8, { tone: "mid" }, { steps: 16, sombra: false, owner: "calentador", on, attrs });
      pipe(`caltanque${cal.id}.${tipo}`, [[xt, yp, zt - t.r], [xt, yp, TOPZ + 1.8]], 0.45, { touch: [ajenos], agua: tipo === "caliente" ? "caliente" : true, flowOf: () => (tipo === "caliente" ? "caliente" : "fria"), attrsOf: () => attrs });
    }
  }
}

// los productos del plano, en el orden de productos.mjs
for (const p of PRODUCTOS) DIBUJOS[p.id].dibujar(p);

// ---------- equipo en la fachada oeste ----------
{
  const y = INV.y1;
  const fins = Array.from({ length: 5 }, (_, i) => {
    const z = INV.z0 + 1.6 + i * 1.1;
    return path3([[INV.x1, INV.y0 + 1.6, z], [INV.x1, INV.y1 - 1.6, z], [INV.x1, INV.y1 - 1.6, z + 0.45], [INV.x1, INV.y0 + 1.6, z + 0.45]], true);
  }).join("");
  const extra =
    Ln(faceY(y, rect(INV.x0 + 1.4, INV.x1 - 1.4, INV.z0 + 1.4, INV.z1 - 1.4)), { tone: "faint" }) +
    Ln(faceY(y, rect(INV.x0 + 4, INV.x1 - 4, INV.z1 - 7.5, INV.z1 - 4)), { tone: "lo" }) +
    [0, 1, 2].map((i) => Ln(faceY(y, rect(INV.x0 + 3 + i * 3.6, INV.x0 + 5.6 + i * 3.6, INV.z0 + 2.6, INV.z0 + 3.4)), { tone: "lo" })).join("") +
    `<circle class="sr-led" data-part="inv-led" cx="${f2(at([INV.x1 - 3, y, INV.z1 - 9.6])[0])}" cy="${f2(at([INV.x1 - 3, y, INV.z1 - 9.6])[1])}" r="0.9"/>` +
    Dots([at([INV.x0 + 1.4, y, INV.z1 - 1.4]), at([INV.x1 - 1.4, y, INV.z1 - 1.4]), at([INV.x0 + 1.4, y, INV.z0 + 1.4]), at([INV.x1 - 1.4, y, INV.z0 + 1.4])], { size: 0.4 });
  box("inverter", [INV.x0, INV.y0, INV.z0], [INV.x1, INV.y1, INV.z1], { tone: "hi" }, { r: 0.8, steps: 3, bevel: 0.5, extra: extra + Ln(fins, { tone: "lo" }) });
}
const LEDS = 10;
BATS.forEach((B, bi) => {
  box(`battery${bi + 1}.pad`, [B.x0 - 1, PLINTH.y + PLINTH.d, 0], [B.x1 + 1, B.y1 + 2, B.z0], { tone: "lo" }, { r: 0.4, attrs: ` data-bat="${bi + 1}"`, sombra: "recibe", on: `bat:${bi + 1}` });
  const y = B.y1;
  const lx = (B.x0 + B.x1) / 2;
  const leds = [];
  for (let i = 0; i < LEDS; i++) {
    const z0 = B.z0 + 2.4 + i * 0.95;
    leds.push(`<path class="sr-led" data-led="${i}" d="${faceY(y, rect(lx - 0.8, lx + 0.8, z0, z0 + 0.7))}"/>`);
    leds.push(Ln(faceY(y, rect(lx - 0.8, lx + 0.8, z0, z0 + 0.7)), { tone: "faint" }));
  }
  const extra = Ln(faceY(y, rect(B.x0 + 0.8, B.x1 - 0.8, B.z0 + 0.8, B.z1 - 0.8)), { tone: "faint" }) + Ln(faceY(y, rect(lx - 1.5, lx + 1.5, B.z0 + 1.9, B.z0 + 2.4 + (LEDS - 1) * 0.95 + 1.2)), { tone: "lo" }) + leds.join("");
  box(`battery${bi + 1}`, [B.x0, B.y0, B.z0], [B.x1, B.y1, B.z1], { tone: "hi" }, { r: 0.8, steps: 4, bevel: 0.5, extra, attrs: ` data-bat="${bi + 1}" data-batbox`, on: `bat:${bi + 1}` });
});
{
  const y = MAIN.y1;
  const extra =
    Ln(faceY(y, rect(MAIN.x0 + 1.2, MAIN.x1 - 1.2, MAIN.z0 + 1.2, MAIN.z1 - 1.2)), { tone: "lo" }) +
    Dots([at([MAIN.x1 - 2.4, y, (MAIN.z0 + MAIN.z1) / 2])], { size: 0.55, tone: "hi" }) +
    Ln(faceY(y, [[MAIN.x0 + 3, MAIN.z1 - 3.4], [MAIN.x0 + 7.4, MAIN.z1 - 3.4]], false), { tone: "lo", free: true }) +
    Ln(faceY(y, [[MAIN.x0 + 3, MAIN.z1 - 4.6], [MAIN.x0 + 6.2, MAIN.z1 - 4.6]], false), { tone: "lo", free: true });
  box("mainpanel", [MAIN.x0, MAIN.y0, MAIN.z0], [MAIN.x1, MAIN.y1, MAIN.z1], { tone: "mid" }, { r: 0.4, steps: 2, bevel: 0.4, extra });
}
box("lb", [LB.x0, LB.y0, LB.z0], [LB.x1, LB.y1, LB.z1], { tone: "mid" }, { r: 0.6, steps: 2, extra: Dots([at([(LB.x0 + LB.x1) / 2, LB.y1, LB.z1 - 1.2])], { size: 0.4 }) });
box("socket", [SOCKET.x0, SOCKET.y0, SOCKET.z0], [SOCKET.x1, SOCKET.y1, SOCKET.z1], { tone: "mid" }, { r: 0.6, steps: 3, bevel: 0.4 });

// medidor bidireccional de LUMA: base, tapa y pantalla en el plano de la cara
const MF = G.frameOf(METER_C, [0, 1, 0], [1, 0, 0], [0, 0, 1]);
// El medidor tapa el sol como una caja; su base y su tapa reciben sombra por la cara del frente.
const METER_MIN = [METER_C[0] - 4.4, METER_C[1], METER_C[2] - 4.4];
const METER_TAPA = tapaSol("meter", ...anillosCaja(METER_MIN, [METER_C[0] + 4.4, METER_C[1] + 4.2, METER_C[2] + 4.4]));
const frenteMedidor = (y, r) => cara([0, 1, 0], Array.from({ length: 16 }, (_, i) => [METER_C[0] + r * Math.cos((i / 16) * 2 * Math.PI), y, METER_C[2] + r * Math.sin((i / 16) * 2 * Math.PI)]));
turned("meter.base", MF, [[0, 4.4], [1.6, 4.4], [1.6, 4], [2.2, 4]], { tone: "mid" }, { capa: (fill) => recibeSol("meter.base", fill, [...carasCaja(METER_MIN, [METER_C[0] + 4.4, METER_C[1] + 1.6, METER_C[2] + 4.4]).filter((f) => f.n[1] !== 1), frenteMedidor(METER_C[1] + 1.6, 4.4)], { propios: [METER_TAPA] }) });
const LCD = { w: 5.2, h: 2.2, y: METER_C[1] + 4.2 };
{
  const face = G.circleOf(MF, 4.2, 3.6, P);
  const m = k.sideMatrix([METER_C[0], LCD.y], METER_C[2], P, "left");
  const lcd =
    `<g transform="${m}"><rect class="sr-lcd" x="${-LCD.w / 2}" y="${-LCD.h / 2 - 0.4}" width="${LCD.w}" height="${LCD.h}" rx="0.3"/>` +
    `<text class="sr-lcd-text" data-part="lcd" x="${LCD.w / 2 - 0.4}" y="${LCD.h / 2 - 0.4 - 0.55}" text-anchor="end">+0.0</text>` +
    `<text class="sr-lcd-unit" x="0" y="${LCD.h / 2 + 1.5}" text-anchor="middle">kWh</text></g>`;
  turned("meter.cover", MF, [[2.2, 3.6], [3.6, 3.6], [4.2, 3.3, 1], [4.2, 0]], { tone: "hi" }, { extra: Ln(face, { tone: "faint" }) + lcd, capa: (fill) => recibeSol("meter.cover", fill, [frenteMedidor(METER_C[1] + 4.2, 3.6)], { propios: [METER_TAPA] }) });
}
// varilla de tierra al pie del medidor
const ROD = { x: -58.5, y: 28 };
cyl("ground.rod", ROD.x, ROD.y, 0.55, 0, 2.4, { tone: "mid" }, { steps: 16, sombra: false });
cyl("ground.clamp", ROD.x, ROD.y, 1, 2.4, 3.2, { tone: "mid" }, { steps: 16, sombra: false });
pipe("ground.wire", [[ROD.x, ROD.y, SOCKET.z0], [ROD.x, ROD.y, 3.2]], 0.35, { tone: "mid" });

// ---------- cuarto de equipos: lo de tierra de la fachada oeste, adentro ----------
// El Anker y su transfer switch, el suavizador, la bomba y el presurizado no se dejan a la intemperie (la F2600 no
// tiene protección contra el agua y la F3800 Plus no es impermeable, dicen sus fichas): van en un cuarto de bloques
// pegado a la fachada oeste, con su puerta y sus persianas de ventilación. Su techo sale de una viga en el borde de la
// losa, por encima de la caja de la luz de la casa, y baja hacia afuera. Adentro quedan también el panel y el
// inversor; los Powerwall (hechos para afuera), el medidor de LUMA y el mástil quedan fuera. Las paredes y el techo se
// dibujan transparentes para ver adentro ("Ver adentro" los cierra) y dan sombra como de verdad. Lo que cruza una
// pared (el conducto de las placas, el de las baterías y el de la acometida) llega a ella por los dos lados.
{
  const { x0, x1, yf, muro, alero, caida, grueso } = CUARTO;
  // el techo: de la viga en el borde de la losa hasta un alero pasado el frente, y de punta a punta con su alero
  const [tx0, tx1, ty0, ty1, tz0] = [x0 - alero, x1 + alero, SE[1], yf + alero, SLAB_Z[0] + 0.25];
  const largo = ty1 - ty0;
  const b = Math.atan2(caida, largo);
  // la cara de arriba del techo a cada y, y la de abajo (donde llegan las paredes)
  const arribaEn = (y) => tz0 - ((y - ty0) * caida) / largo;
  const bajoEn = (y) => arribaEn(y) - grueso / Math.cos(b);
  const n = [0, Math.sin(b), Math.cos(b)];
  const subeHaciaLaPared = [0, -Math.cos(b), Math.sin(b)];
  const centro = G.sub3([(tx0 + tx1) / 2, (ty0 + ty1) / 2, arribaEn((ty0 + ty1) / 2)], G.mul3(n, grueso));
  const F = G.frameOf(centro, n, [1, 0, 0], subeHaciaLaPared);
  const [hu, hv] = [(tx1 - tx0) / 2, largo / Math.cos(b) / 2];
  const pt = (u, v, s) => G.add3(G.add3(G.add3(centro, G.mul3(n, s)), G.mul3([1, 0, 0], u)), G.mul3(subeHaciaLaPared, v));
  const borde = (s) => [pt(-hu, -hv, s), pt(hu, -hv, s), pt(hu, hv, s), pt(-hu, hv, s)];
  tapaSol("cuarto.techo", borde(0), borde(grueso));
  prism("cuarto.techo", F, [[-hu, -hv], [hu, -hv], [hu, hv], [-hu, hv]], 0, grueso, { tone: "mid" }, { wrap: "sr-techo" });
  // la viga en la losa, justo debajo del techo, entre las paredes
  box("cuarto.viga", [x0 + muro, ty0, tz0 - grueso - 0.7], [x1 - muro, ty0 + 0.8, tz0 - grueso], { tone: "mid" }, { r: 0.1, sombra: "recibe" });
  // las paredes de los lados (de la fachada al frente, con su borde de arriba bajo el techo, y sentadas sobre el zócalo
  // de la casa donde lo pisan) y la del frente, entre ellas
  const zocalo = PLINTH.y + PLINTH.d;
  const lado = [[zocalo, 0], [yf - muro, 0], [yf - muro, bajoEn(yf - muro) - 0.02], [ty0, bajoEn(ty0) - 0.02], [HY1, SLAB_Z[0]], [HY1, WALL_Z[0]], [zocalo, WALL_Z[0]]];
  for (const [nombre, xa] of [["norte", x0], ["sur", x1 - muro]]) {
    const FL = G.frameOf([xa, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    tapaSol(`cuarto.${nombre}`, lado.map(([y, z]) => [xa, y, z]), lado.map(([y, z]) => [xa + muro, y, z]));
    prism(`cuarto.${nombre}`, FL, lado, 0, muro, { tone: "mid" }, { wrap: "sr-pared" });
  }
  // el frente: la puerta (con su manija) del lado del Anker y las persianas de ventilación arriba
  const [pa, pb, ph] = CUARTO.puerta;
  const persianas = CUARTO.persianas.map(([a, c]) => {
    const lineas = [];
    for (let z = 26.2; z < 31.4; z += 1.1) lineas.push(faceY(yf, [[a, z], [c, z]], false));
    return faceY(yf, rect(a, c, 25.4, 32)) + lineas.join("");
  });
  const extra = Ln(faceY(yf, rect(pa, pb, 0.2, ph)) + faceY(yf, rect(pa + 0.9, pb - 0.9, 1.1, ph - 0.9)) + persianas.join(""), { tone: "lo" }) + Dots([at([pb - 1.4, yf, ph * 0.45])], { size: 0.45 });
  box("cuarto.frente", [x0, yf - muro, 0], [x1, yf, bajoEn(yf) - 0.02], { tone: "mid" }, { r: 0.1, wrap: "sr-pared", sombra: "tapa", extra });
}

// ---------- poste de LUMA ----------
cyl("pole.base", POLE.x, POLE.y, 4.2, 0, POLE.z0, { tone: "lo" }, { steps: 32, sombra: "recibe" });
const PF = G.frameOf([POLE.x, POLE.y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
turned("pole", PF, [[POLE.z0, POLE.r0], [POLE.z1, POLE.r1]], { tone: "mid" }, {
  inner: Ln(G.arcOf(PF, 40, poleR(40), P, { slope: (POLE.r1 - POLE.r0) / (POLE.z1 - POLE.z0) }), { tone: "faint" }),
  capa: (fill) => sombraCilindro("pole", POLE.x, POLE.y, POLE.r0, POLE.z0, POLE.z1, fill, { lados: 24, r1: POLE.r1 }),
});
cyl("pole.cap", POLE.x, POLE.y, 2.4, POLE.z1, POLE.z1 + 1.2, { tone: "mid" }, { steps: 24 });
const TX = { x: POLE.x + poleR(76) + 4.2 - 0.05, y: POLE.y, r: 4.2, z0: 70, z1: 82 };
cyl("transformer", TX.x, TX.y, TX.r, TX.z0, TX.z1, { tone: "mid" }, { steps: 40, inner: Ln(k.sideArc(TX.x, TX.y, TX.r, TX.z0 + 4, P, 24), { tone: "faint" }) });
cyl("transformer.lid", TX.x, TX.y, TX.r + 0.4, TX.z1, TX.z1 + 1, { tone: "mid" }, { steps: 40 });
for (const dy of [-1.8, 1.8]) cyl("transformer.bushing", TX.x + 0.6, TX.y + dy, 0.7, TX.z1 + 1, TX.z1 + 3, { tone: "mid" }, { steps: 16, sombra: false });
const BR = { x0: POLE.x - 1.3, x1: POLE.x + 1.3, y0: POLE.y - 5, y1: POLE.y - poleR(59), z0: 57.5, z1: 60.5 };
box("pole.bracket", [BR.x0, BR.y0, BR.z0], [BR.x1, BR.y1, BR.z1], { tone: "mid" }, { r: 0.3 });

// ---------- conductos de energía ----------
{
  // de la T al inversor: cruza el techo, baja por la fachada al este del cuarto de equipos (así no atraviesa su
  // techo), corre por la pared, entra al cuarto por su pared sur y baja al inversor por arriba
  const DC_CORRE = 35.5;
  const DC_ENTRA = -12;
  const points = [[TEE.x, TEE.y + RIM, TEE.z], [TEE.x, DC_Y, TEE.z], [TEE.x, DC_Y, DC_CORRE], [CUARTO.x1, DC_Y, DC_CORRE]];
  const probe = G.fillet(points, 3.12, 10, { P, tube: 1.2 });
  // una abrazadera en el borde de la losa, donde baja, y otra en la pared, donde corre
  const straps = [arcWhere(probe, (p) => p[0] > TEE.x - 0.01 && p[2] <= DC_Z - 0.5), arcWhere(probe, (p) => p[2] < DC_CORRE + 0.01 && p[0] <= 2)];
  const route = pipe("dc", points, 1.2, { channel: "pv", gaps: straps.map((s) => [s - 0.6, s + 0.6]) });
  strap("dc.strap0", route, straps[0], "dc", 1.2, [[TEE.x - 0.6, SE[1], DC_Z - 1.3], [TEE.x + 0.6, DC_Y - 1.65 + 0.05, DC_Z + 0.3]]);
  strap("dc.strap1", route, straps[1], "dc", 1.2, [[2 - 0.6, HY1, DC_CORRE - 0.8], [2 + 0.6, DC_Y - 1.65 + 0.05, DC_CORRE + 0.8]]);
  pipe("dc.dentro", [[CUARTO.x1 - CUARTO.muro, DC_Y, DC_CORRE], [DC_ENTRA, DC_Y, DC_CORRE], [DC_ENTRA, DC_Y, INV.z1]], 1.2, { channel: "pv" });
}
const BAT1X = (BATS[0].x0 + BATS[0].x1) / 2;
// del inversor al primer Powerwall, que va afuera: cruza la pared sur del cuarto
pipe("bat", [[INV.x1, 27.3, 20], [CUARTO.x1 - CUARTO.muro, 27.3, 20]], 1.2, { channel: "bat", attrsOf: () => ` data-bat="1"` });
pipe("bat.fuera", [[CUARTO.x1, 27.3, 20], [BAT1X, 27.3, 20], [BAT1X, 27.3, BATS[0].z1]], 1.2, { channel: "bat", attrsOf: () => ` data-bat="1"` });
for (let k = 0; k < 3; k++) pipe(`bat.l${k + 1}`, [[BATS[k].x1, 27.3, 7], [BATS[k + 1].x0, 27.3, 7]], 0.8, { channel: `bat.l${k + 1}`, attrsOf: () => ` data-bat="${k + 2}"` });
pipe("ac", [[INV.x0, 27.4, 24], [MAIN.x1, 27.4, 24]], 1.2, { channel: "ac" });
pipe("casa", [[-38.5, 26.6, MAIN.z1], [-38.5, 26.6, LB.z0]], 1.2, { channel: "casa" });
// del panel a la base del medidor, que va afuera: cruza la pared norte del cuarto
pipe("red", [[-41, 27.4, MAIN.z0], [-41, 27.4, 5.5], [CUARTO.x0 + CUARTO.muro, 27.4, 5.5]], 1.2, { channel: "red" });
pipe("red.fuera", [[CUARTO.x0, 27.4, 5.5], [-55, 27.4, 5.5], [-55, 27.4, SOCKET.z0]], 1.2, { channel: "red" });
// el mástil y su capuchón tapan el sol como un tubo parado
const MAST_TAPA = tapaSol("mast", anilloRedondo(MAST.x, MAST.y, 1.9, MAST.z0), anilloRedondo(MAST.x, MAST.y, 1.9, 63.4));
{
  const straps = [36, 47].map((z) => z - MAST.z0);
  const route = pipe("mast", [[MAST.x, MAST.y, MAST.z0], [MAST.x, MAST.y, MAST.z1]], 1.3, { channel: "red", maxLength: 10, gaps: straps.map((s) => [s - 0.6, s + 0.6]), propio: MAST_TAPA });
  strap("mast.strap0", route, straps[0], "mast", 1.3, [[MAST.x - 0.6, HY1, 35.2], [MAST.x + 0.6, MAST.y - 1.75 + 0.05, 36.8]]);
  strap("mast.strap1", route, straps[1], "mast", 1.3, [[MAST.x - 0.6, SE[1], 46.2], [MAST.x + 0.6, MAST.y - 1.75 + 0.05, 47.8]]);
}
const WH = G.frameOf([MAST.x, MAST.y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
turned("weatherhead", WH, [[MAST.z1, 1.9], [61.6, 1.9], [62.6, 1.5, 1], [63.2, 0.8, 1], [63.4, 0, 1]], { tone: "mid" });
{
  const start = [MAST.x, MAST.y + 1.9, 61];
  const end = [BR.x0 + 1.3, BR.y0, 59];
  const a = [start[0], start[1] + 3, start[2]];
  const b = [end[0], end[1] - 3, end[2]];
  const sag = [];
  for (let i = 1; i < 8; i++) {
    const t = i / 8;
    const p = G.lerp3(a, b, t);
    sag.push([p[0], p[1], p[2] - 5 * 4 * t * (1 - t)]);
  }
  pipe("drop", [start, a, ...sag, b, end], 0.55, { channel: "red", limp: true, bend: 1.6, maxLength: 10 });
}

const START = 12.5;

// ---------- orden de pintado ----------
// Las partes del plano que nunca se ven a la vez (las cisternas, los tanques del calentador, los del suavizador, el
// tubo de la bomba a la casa y el que va al suavizador) no se ordenan entre ellas, y las piezas de los modelos que
// comparten lugar comparten dueño para que la auditoría no las cuente como metidas una en otra. Lo que ocupa
// lugares de placas (el calentador) tampoco se ordena con las placas de esos lugares, que nunca se ven con él.
const parteDe = (it) => /data-p="([^":]+):([^"]+)"/.exec(it.attrs ?? "");
const lugarDe = (it) => +(/data-slot="(\d+)"/.exec(it.attrs ?? "")?.[1] ?? -1);
const LUGARES_DE = Object.fromEntries(PRODUCTOS.filter((p) => p.lugares).map((p) => [p.id, new Set(Array.from({ length: p.lugares }, (_, i) => ROWS * COLS - 1 - i))]));
const ocupaLugarDe = (it, otro) => LUGARES_DE[parteDe(it)?.[1]]?.has(lugarDe(otro)) ?? false;
const excluyentes = (a, b) => {
  const pa = parteDe(a);
  const pb = parteDe(b);
  if (pa && pb && (pa[1] !== pb[1] || pa[2] !== pb[2]) && nuncaJuntas([pa[1], pa[2]], [pb[1], pb[2]])) return true;
  return ocupaLugarDe(a, b) || ocupaLugarDe(b, a);
};
A.settle(R, P, { skip: (a, b) => A.sameRun(a, b) || excluyentes(a, b) });
R.items.sort((a, b) => a.key - b.key);
const groups = R.items.map((item) => `<g class="it" data-name="${item.name}"${item.attrs ?? ""}>${item.svg}</g>`);

// ---------- cielo: el sol y la luna pasan por encima de la maqueta (cieloDe, en taller.mjs) ----------
// El contorno sale de las puntas de lo que más asoma del dibujo: la base, el techo y sus placas, el aire, lo que se
// ponga en el techo, el transformador, el poste y el mástil.
const PUNTAS = [
  ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
  ...k.boxCorners({ x: SLAB.x, y: SLAB.y, w: SLAB.w, d: SLAB.d }, SLAB_Z[0], TOPZ),
  ...ROWS_XS.flatMap((xs) => [ARRAY_Y0, RAIL_END].flatMap((y) => [[xs, y, zLow + PANEL.t], [xs - PANEL.l * Math.cos(BETA), y, zLow + PANEL.l * Math.sin(BETA) + PANEL.t]])),
  ...k.boxCorners({ x: AC.x0, y: AC.y0, w: AC.x1 - AC.x0, d: AC.y1 - AC.y0 }, AC.z0, AC.z1),
  ...puntasDe("cielo"),
  ...k.boxCorners({ x: TX.x - TX.r - 0.4, y: TX.y - TX.r - 0.4, w: 2 * TX.r + 0.8, d: 2 * TX.r + 0.8 }, TX.z0, TX.z1 + 3),
  ...k.boxCorners({ x: POLE.x - 2.4, y: POLE.y - 2.4, w: 4.8, d: 4.8 }, POLE.z1, POLE.z1 + 1.2),
  ...k.boxCorners({ x: MAST.x - 1.9, y: MAST.y - 1.9, w: 3.8, d: 3.8 }, MAST.z1, 63.4),
];
const { CIELO, cieloFondo, cielo, defs } = cieloDe({ puntas: PUNTAS, centro: [-9, -33, 30] });

const SUG = sugerencia(EJEMPLO.meses, EJEMPLO.existentes);
const DATA = { P, start: START, flows: {}, leds: LEDS, cols: COLS, slots: ROWS * COLS, vatios: BASE.vatios, ejemplo: EJEMPLO, limites: LIMITES, sombra: SOMBRA, brujula: BRUJULA, cielo: CIELO, rumbo: 180 };
DATA.agua = { personas: 4 };
DATA.medidas = MEDIDAS;
// el plano de las placas del Anker (las PS400, las PS200 y las del kit solar del E10), inclinadas 40° hacia donde
// miran las del techo: con él les llega el sol en el día (live.js), como en el apartamento
DATA.ps400 = { normal: normalPs400().map((v) => Math.round(v * 1e6) / 1e6) };
Object.assign(DATA.flows, {
  dc: "pv",
  "dc.dentro": "pv",
  "trunk-a": "row3",
  "trunk-b": "row23",
  "trunk-c": "row123",
  "trunk-s": "row0",
  bat: "bat",
  "bat.fuera": "bat",
  "bat.l1": "batl1",
  "bat.l2": "batl2",
  "bat.l3": "batl3",
  ac: "ac",
  casa: "casa",
  red: "red",
  "red.fuera": "red",
  mast: "red",
  drop: "red",
  agua: "agua",
  caliente: "caliente",
  fria: "caliente",
  ps400: "ps400",
  anker: "anker",
  gen: "gen",
});

const LABEL_TEXT =
  "Maqueta de una casa de techo plano en Puerto Rico con el sistema Solar y Roofing de Windmar Home: el techo sellado con silicona (imprimador y capa blanca, cortados en escalones en una esquina), placas en filas sobre patas selladas con una caja por fila y un conducto que las recoge, una unidad de aire en el techo, el inversor, de cero a cuatro baterías con su columna de luces, el panel de breakers, el medidor de LUMA con su mástil y la acometida al poste. Con la pestaña Agua se ponen un calentador solar al fondo del techo, en el lugar de las últimas placas, una cisterna en el techo, con su bomba y su presurizado junto a la pared, y el suavizador donde el agua entra a la casa: prefiltro, tanque de resina, tanque de sal y luz UV. Con la pestaña Anker se pone el respaldo de Anker SOLIX, aparte de las placas del techo: el portátil con su transfer switch en la pared y de una a ocho placas abiertas en el patio, o el E10 para toda la casa, con sus baterías, su caja en la pared y el generador afuera; y aparte, la nevera EverFrost. Lo que va en el suelo junto a la pared queda en un cuarto de equipos de bloques, con sus paredes y su techo transparentes para ver adentro. En la base, una brújula cuya tarjeta gira con el rumbo de las placas. Los trazos naranja corren por los conductos en el sentido en que va la energía; el sol y la luna pasan por encima de la maqueta, de un lado al otro (salen por el del este), la luz pasa del día a la noche y cada pieza echa la sombra de ese momento, del lado contrario.";
const svg = k.figureSvg({ width: W, height: H, label: LABEL_TEXT, body: [defs, cieloFondo, ...back, `<g class="sr-scene">${groups.join("")}</g>`, cielo] });

const about = `<p>Corre el día con el reproductor y mira a dónde va la energía: a la casa, a la batería o a LUMA. Cada pestaña va en pasos numerados, y solo se ve lo que aplica a lo escogido. En Energía suma o quita placas y baterías, cambia hacia dónde miran las placas (la brújula gira, las sombras se mueven y la ficha dice cuánto sol les llega, con las mismas medidas que Aurora: TOF, acceso solar y TSRF) y escribe el consumo de cada mes para compararlo con lo que sugiere el cotizador. En Agua escoge cuántas personas viven en la casa, el calentador solar, la cisterna y el suavizador: el calentador ocupa lugares de placas al fondo del techo, el agua corre por los tubos con el uso de cada hora, el tanque se calienta con el sol y el panel dice cuánta luz ahorra y para cuántos días alcanza la cisterna si la AAA corta el servicio. En Anker escoge el respaldo (el portátil con sus placas o el E10 para toda la casa), su modelo y cuántas placas o baterías lleva: de día lo cargan sus placas, de noche mantiene lo esencial y el panel dice para cuántas horas alcanza sin LUMA.</p>`;
const monthOptions = MESES.map((m, i) => `<option value="${i}"${i === EJEMPLO.mes ? " selected" : ""}>${m[0].toUpperCase() + m.slice(1)}</option>`).join("");
// Panel de controles: en pantalla ancha va a la derecha de la figura. Arriba, las pestañas Energía, Agua y Anker, y
// cada una en pasos numerados: en Energía, las placas y las baterías (primero, para sumarlas sin bajar), hacia dónde
// miran y el consumo del cliente; en Agua, las personas, el calentador solar, la cisterna y el suavizador; en Anker, el
// respaldo en pasos (pagina.mjs) y aparte la nevera. Solo se ve lo que aplica a lo escogido.
const controls = `
<div class="sr-controls">
  <div class="sr-tabs" role="tablist" aria-label="Qué mirar">
    <button type="button" class="sr-tab" role="tab" id="sr-tab-energia" aria-controls="sr-panel-energia" aria-selected="true" data-tab="energia">Energía</button>
    <button type="button" class="sr-tab" role="tab" id="sr-tab-agua" aria-controls="sr-panel-agua" aria-selected="false" tabindex="-1" data-tab="agua">Agua</button>
    <button type="button" class="sr-tab" role="tab" id="sr-tab-anker" aria-controls="sr-panel-anker" aria-selected="false" tabindex="-1" data-tab="anker">Anker</button>
  </div>
  <div class="sr-panel" id="sr-panel-energia" role="tabpanel" aria-labelledby="sr-tab-energia" data-panel="energia">
  <section class="sr-group" aria-label="Placas y baterías">
    ${tag("Placas y baterías", 1)}
    <div class="sr-system">
      <span class="sr-lab">Placas nuevas de ${BASE.vatios} W</span>${stepper("nuevas", "una placa nueva")}
      <span class="sr-lab">Placas que ya tenía</span><span class="sr-inline">${stepper("existentes", "una placa que ya tenía")}<label>de <input class="sr-input sr-w" type="number" data-vatios min="${LIMITES.vatios[0]}" max="${LIMITES.vatios[1]}" step="5" inputmode="numeric" value="${EJEMPLO.existentes.w}" aria-label="Vatios de cada placa que ya tenía"> W</label></span>
      <span class="sr-lab">Powerwall de ${BASE.bateria} kWh</span>${stepper("baterias", "una batería")}
    </div>
    <div class="sr-row"><button type="button" class="sr-btn" data-reset>Volver a lo sugerido</button><p class="sr-warn" data-warn></p></div>
  </section>
  <section class="sr-group" aria-label="Hacia dónde miran las placas">
    ${tag("Hacia dónde miran las placas", 2)}
    <div class="sr-row sr-rumbo-row">${rumbosHtml("Miran al", true)}</div>
  </section>${PRODUCTOS.filter((p) => p.pestaña === "energia").map((p) => `\n  ${seccionDe(p)}`).join("")}
  <section class="sr-group" aria-label="Consumo del cliente por mes">
    ${tag("Consumo del cliente", 3)}
    <div class="sr-row">
      <label>Mes <select class="sr-input" data-mes>${monthOptions}</select></label>
      <label><input class="sr-input" type="number" data-mes-kwh min="${LIMITES.mes[0]}" max="${LIMITES.mes[1]}" step="10" inputmode="numeric" value="${EJEMPLO.meses[EJEMPLO.mes]}" aria-label="Consumo del mes elegido en kWh"> kWh</label>
    </div>
    <div class="sr-row">
      <label>Llenar los 12 meses con <input class="sr-input" type="number" data-todos min="${LIMITES.mes[0]}" max="${LIMITES.mes[1]}" step="10" inputmode="numeric" value="600"> kWh</label>
      <button type="button" class="sr-btn" data-fill>Llenar</button>
    </div>
    <figure class="sr-chart">
      <div class="sr-chart-head"><span class="sr-chart-title">Consumo de cada mes y lo que cubren las placas</span><span class="sr-chart-keys"><span class="sr-key"><i class="sr-sw" data-k="placas"></i>Cubren las placas</span><span class="sr-key"><i class="sr-sw" data-k="luma"></i>De LUMA</span><span class="sr-key"><i class="sr-sw sr-sw-line"></i>Producción al mes</span></span></div>
      <div class="sr-chart-body"><svg class="sr-chart-svg" data-chart-svg role="group" aria-label="Consumo de cada mes. Arrastra una barra o usa las flechas arriba y abajo para cambiar el consumo de ese mes."></svg><div class="sr-tip" data-tip hidden></div></div>
      <details class="sr-table"><summary>Ver tabla de los 12 meses</summary><table><thead><tr><th>Mes</th><th>Consumo</th><th>Producción</th><th>Cubren las placas</th><th>De LUMA</th></tr></thead><tbody data-table></tbody></table></details>
    </figure>
  </section>
  </div>
  <div class="sr-panel" id="sr-panel-agua" role="tabpanel" aria-labelledby="sr-tab-agua" data-panel="agua" hidden>
  <section class="sr-group" aria-label="Personas en la casa">
    ${tag("Personas", 1)}
    <div class="sr-system"><span class="sr-lab">Viven en la casa</span>${stepper("personas", "una persona")}</div>
    <p class="sr-nota" data-agua="uso"></p>
  </section>
  ${PRODUCTOS.filter((p) => p.pestaña === "agua").map((p, i) => seccionDe(p, i + 2)).join("\n  ")}
  </div>
  <div class="sr-panel" id="sr-panel-anker" role="tabpanel" aria-labelledby="sr-tab-anker" data-panel="anker" hidden>
  ${respaldoHtml(PRODUCTOS.filter((p) => p.pestaña === "anker" && p.rol === "respaldo"))}
  ${PRODUCTOS.filter((p) => p.pestaña === "anker" && p.rol !== "respaldo").map((p) => seccionDe(p)).join("\n  ")}
  </div>
</div>`;
// Ficha del sistema: una franja de datos arriba de la tarjeta, para que la casa use todo el alto.
const ficha = `<div class="sr-kpis" role="group" aria-label="Ficha del sistema"><div class="sr-kpi"><span class="sr-kpi-l">Placas</span><span class="sr-kpi-v" data-f="kw"></span><span class="sr-kpi-s" data-f="placas"></span></div><div class="sr-kpi"><span class="sr-kpi-l">Producción</span><span class="sr-kpi-v" data-f="prod"></span><span class="sr-kpi-s" data-f="dia"></span></div><div class="sr-kpi"><span class="sr-kpi-l">Rumbo</span><span class="sr-kpi-v" data-f="rumbo"></span><span class="sr-kpi-s" data-f="inclin"></span></div><div class="sr-kpi"><span class="sr-kpi-l">TSRF (Aurora)</span><span class="sr-kpi-v"><span data-f="tsrf"></span><span class="sr-kpi-d" data-f="tanque" title="Lo que baja el TSRF por la sombra de lo que hay de agua en el techo" hidden><span data-f="menos"></span><span class="sr-kpi-dl" data-f="porque"></span></span></span><span class="sr-kpi-s" data-f="tof"></span></div><div class="sr-kpi"><span class="sr-kpi-l">Baterías</span><span class="sr-kpi-v" data-f="bat"></span><span class="sr-kpi-s" data-f="respaldo"></span></div><div class="sr-kpi"><span class="sr-kpi-l" data-f="mesNombre"></span><span class="sr-kpi-v" data-f="mes"></span><span class="sr-kpi-s" data-f="mesUsa"></span></div><div class="sr-kpi"><span class="sr-kpi-l">En el año</span><span class="sr-kpi-v" data-f="anio"></span><span class="sr-kpi-s" data-f="anioUsa"></span></div><div class="sr-kpi"><span class="sr-kpi-l">Cotizador</span><span class="sr-kpi-v" data-f="sug"></span><span class="sr-kpi-s" data-f="nota"></span></div></div>`;
const caption =
  `Maqueta de una casa de techo plano en Puerto Rico con el sistema Solar y Roofing de Windmar Home. El techo lleva el sellado de silicona Gardner de los Planes de Sellado: imprimador Elasto Prime y una capa continua de silicona blanca, sin uniones. En la esquina se ven el concreto con una grieta reparada, el imprimador y la capa; cada pata de la estructura, el tubo de ventilación, la bota del aire y la unidad de aire van sobre sellos de Roof Patch. ` +
  `El consumo de los 12 meses arma el sistema con la regla del cotizador de LUMA de Sun Bot, la misma que usa con clientes que ya tienen placas: la meta es el mayor entre 110 % del promedio y el mes pico; con ${BASE.horasSol} horas de sol pico todo el año y ${BASE.rendimiento} de rendimiento, cada placa da sus vatios × ${BASE.horasSol} × ${BASE.rendimiento} ÷ 1000 kWh al día (${kwhPorPlacaDia(BASE.vatios).toFixed(2)} una QCells de ${BASE.vatios} W); a los kW que hacen falta se les restan los de las placas que ya tiene y el resto se cubre con placas de ${BASE.vatios} W. Los Powerwall de ${BASE.bateria} kWh cubren la mitad del consumo diario, al menos uno, y con batería el cotizador pide al menos ${BASE.placasConBateria} placas; el respaldo de noche es la fórmula de la herramienta Enseres (baterías × ${BASE.bateria} ÷ consumo diario × 24 horas). Con la factura de ejemplo (promedio 600 kWh, pico 700 en agosto) salen ${SUG.nuevas} placas nuevas y ${SUG.baterias} Powerwall. ` +
  `De madrugada la batería llega a su reserva y entra LUMA; en la mañana las placas cubren la casa y cargan la batería; ya llena, el sobrante sale a LUMA por el medidor bidireccional; de noche la batería alimenta la casa. El ventilador del aire gira más rápido cuanto más consume la casa. ` +
  `La brújula de la base gira con el rumbo de las placas y su marca fija señala hacia dónde miran. El rumbo cambia lo que dan las placas según PVWatts v8 de NREL para San Juan a ${SOL.inclinacion}° de inclinación: al sur, ${fmtN(rumboDe(180).kwh)} kWh por kW al año; al este, ${pctN(factorRumbo(90))} de eso; al oeste, ${pctN(factorRumbo(270))}; al norte, ${pctN(factorRumbo(0))}. Con el sur, la figura da lo mismo que el cotizador. ` +
  `Las sombras salen del sol de cada momento y de las piezas del dibujo: el aire, el tubo de ventilación, el mástil, el poste, las mismas filas de placas y lo que se ponga de agua en el techo. La Hércules 600 va en la franja oeste del techo, al lado de las placas: con las placas al sur su sombra les cae de tarde a las del extremo oeste, y al norte, de mañana. Como a esas horas el sol ya está bajo, en el año les quita poco: la placa más cercana pierde de 3 a 4 % de su sol y el sistema, unas décimas, que la ficha muestra al lado del TSRF. Como en Aurora, el acceso solar es la parte del sol del año (directo y difuso, del año típico de PVGIS) que les llega a las placas con esas sombras; el TOF es el sol que recibe su plano frente al mejor plano de San Juan (sur a unos 17°, ${pctN(tofDe(180))} para el sur a ${SOL.inclinacion}°), y el TSRF es TOF × acceso solar. La producción de la ficha y de la gráfica es la del cotizador por el rumbo y por el acceso solar, y en el día la producción sigue al sol directo y difuso de marzo y septiembre (PVGIS) sobre el plano de las placas, menos lo que tapan las sombras. ` +
  `La pestaña Agua pone los equipos de Windmar Water con los datos del cotizador Water de Sun Bot y su PDF maestro. El calentador solar Soltek va al fondo del techo, en el lugar de las últimas placas (el 80/1 y el 80/2 ocupan dos lugares, el 120/3 tres y el 120/4 cuatro): colectores de 34" × 76" con 7 tubos de cobre inclinados 18°, y el tanque acostado de 82 o 119 galones con su resistencia de 4,500 W de respaldo; el cotizador lo sugiere por personas (1 a 2, 80/1; 3 a 4, 80/2; 5 a 6, 120/3; 7 o más, 120/4). Las cisternas Eco 500 (74" × 32"), Hércules 600 (56" × 61") y Eco 1,000 (sin medidas en el PDF: se dibuja de 64" × 76") van en el techo, con su bomba de ¾ HP y su presurizado de 40 galones junto a la pared; la Torre 150 va adentro, pegada a la pared, y queda para el apartamento. El suavizador POE Water Care va donde el agua entra a la casa: prefiltro de sedimento de 5 micras en carcasa transparente de 10", tanque de 10" × 54" con carbón activado y resina (o el de 13" × 54", de más capacidad) con su válvula electrónica, tanque de sal de 18" × 36" y luz UV Viqua VH410; el agua le llega de la bomba, o de la AAA si no hay cisterna. Las cisternas, el tanque del calentador y el tanque de sal llevan el logo de Windmar. ` +
  `La pestaña Anker pone el respaldo de Anker SOLIX, del cotizador Anker de Sun Bot, con sus kWh, kW y medidas de las fichas de Anker, aparte de las placas del techo y paso a paso: el tipo, el modelo, sus placas o sus baterías y los extras. El portátil es la F2600 (2.56 kWh y 2.4 kW, con transfer switch manual) o la F3800 Plus (3.84 kWh y 6 kW, con transfer switch automático), cada una con o sin su batería de expansión (la BP2600 o la BP3800), con sus placas abiertas en el patio: con − y + se ponen de una hasta las que admite su entrada solar, según las fichas (dos PS400 o cuatro PS200 la F2600, que tiene una sola entrada de 1,000 W; ocho PS400 la F3800 Plus, que tiene dos de 1,600 W). El SOLIX E10 es para toda la casa: su módulo de 7.68 kW sobre una a cinco baterías B6000 de 6.144 kWh (con cuatro o más, en la montura de pared), su caja en la pared (la Smart Inlet Box o la Power Dock), las 4 placas de 400 W del kit solar y el Smart Generator 5500 afuera. Aparte va la nevera EverFrost, con su propia batería. Mantiene lo esencial de la casa: de día lo cubren sus placas y lo que sobra carga la batería; de noche lo da la batería, y si llega a su reserva, LUMA (o el generador del E10). La estación, el E10 y la nevera van en el cuarto de equipos: la F2600 no tiene protección contra el agua y la F3800 Plus no es impermeable, así que nada de eso va a la intemperie. Las placas sí van afuera. Supuestos del Anker: lo esencial (nevera, internet, luces y abanicos) suma unos ${(Array.from({ length: 288 }, (_, i) => esencialEn((i + 0.5) / 12)).reduce((a, b) => a + b, 0) / 12).toFixed(1)} kWh al día; las placas entregan el ${pctN(ANKER_MODELO.rinde)} de su potencia con el sol de su propio plano, inclinado 40° hacia donde miran las del techo, menos lo que les tapan las sombras; la batería no baja de ${pctN(ANKER_MODELO.reserva)}; y las horas sin LUMA son las de la batería sola con lo esencial, como en la fórmula de Enseres. ` +
  `Supuestos del agua: ${AGUA.porPersona} galones al día por persona, ${AGUA.calientePorPersona} de ellos de agua caliente a ${AGUA.uso} °F, el agua que llega a ${AGUA.fria} °F, colectores que le pasan al agua la mitad del sol que reciben, el tanque que pierde un poco de calor por hora y deja de calentar a ${AGUA.maximo} °F, y la AAA que llena la cisterna mientras da servicio. El ahorro de luz compara con calentar la misma agua con una resistencia eléctrica. ` +
  `Supuestos del dibujo: el reparto del consumo por hora, la reserva del 20 %, la batería sin pérdidas, el sol del equinoccio (sale 6:25, se pone 18:25) con la luna llena de esa noche y el mes de 30 días del cotizador. El sol y la luna se dibujan por fuera de la maqueta, en la dirección de donde viene su luz vista desde esta cámara: nunca pasan por detrás de la casa y las sombras caen del lado contrario; si no caben dentro del dibujo, asoman por el borde. Las placas que ya tenía se dibujan del mismo tamaño que las nuevas. El techo mide unos 1,250 pies², el promedio del cotizador, y le caben hasta ${ROWS * COLS} placas; el inversor se dibuja más grande que en la realidad para que se lea, y el Powerwall 3 lo trae integrado aunque aquí va aparte. No muestra dinero.`;

const { page } = escribirPagina({
  escena: "casa",
  titulo: "Solar y Roofing · Windmar Home",
  h1: "Cómo funciona un sistema Solar y Roofing",
  descripcion: "Figura interactiva: cómo funciona un sistema Solar y Roofing de Windmar Home en Puerto Rico.",
  fig: "Fig 1",
  about,
  keys: [
    { mark: "dashed", label: "Energía: corre en el sentido del flujo, más rápido con más kW" },
    { mark: "raised", label: "Capas del techo en la esquina: concreto, imprimador, silicona" },
    { mark: "dim", label: "Placas que ya tenía el cliente: vidrio claro" },
  ],
  caption,
  svg,
  ficha,
  controls,
  etiqueta: "Sistema Solar y Roofing.",
  DATA,
});
console.log("wrote public/index.html", `${(page.length / 1024).toFixed(0)} KB`, `${R.items.length} items`, `${R.solids.length} solids`, `${R.routes.length} routes`, `scale ${KS.toFixed(3)}`);

// El codo del tubo de la bomba a la casa queda pegado, en pantalla, al tanque de sal del suavizador; nunca se ven
// juntos (ese tubo solo está sin suavizador), así que no cuentan como amontonados.
A.auditOrExit(R, P, { crowd: [["bomba.casa", "poe.sal"]] });

// La Fig 2, el apartamento, en su propio proceso: su plano se carga con los modelos de su escena. Si su auditoría
// falla, el build también.
execFileSync(process.execPath, [join(HERE, "apartamento.mjs"), ...process.argv.slice(2)], { stdio: "inherit" });
