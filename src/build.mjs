// Fig 1 · Solar y Roofing (Windmar Home, PR). Página suelta en public/index.html.
//   node src/build.mjs           → public/index.html
//   node src/build.mjs --audit   → además corre la auditoría de geometría de Anatomy
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../vendor/anatomy/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../vendor/anatomy/kit/tube.mjs";
import * as A from "../vendor/anatomy/kit/audit.mjs";
import { kitScript } from "../vendor/anatomy/scripts/inline-kit.mjs";
import { BASE, LIMITES, SALIDA, PUESTA, porPlaca, sistemaPara } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const W = 600;
const H = 450;
const AZ = 52;
const EL = 33;
const EJEMPLO = { promedio: 600, pico: 700 };

// ---------- mundo: x = sur, y = este, z = arriba (unas 10.5 unidades por metro) ----------
const PLATE = { x: -84, y: -110, w: 160, d: 218, r: 10 };
const PLATE_H = 10;
const FOOT_H = 5;

const HX1 = 44;
const HY1 = 24;
const PLINTH = { x: -63, y: -91, w: 108, d: 116, r: 0.6 };
const WALLS = { x: -62, y: -90, w: 106, d: 114, r: 0.5 };
const WALL_Z = [3, 40];
const SLAB = { x: -63.5, y: -91.5, w: 109, d: 117, r: 0.5 };
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
const ARRAY_Y0 = -88;
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
const BATS = [
  { x0: -1, x1: 15, y0: 26, y1: 34, z0: 1.6, z1: 19 },
  { x0: 17, x1: 33, y0: 26, y1: 34, z0: 1.6, z1: 19 },
];
const MAIN = { x0: -44, x1: -33, y0: 24, y1: 29, z0: 16, z1: 31 };
const LB = { x0: -41, x1: -36, y0: 24, y1: 28.6, z0: 35.5, z1: 39.2 };
const SOCKET = { x0: -60, x1: -50, y0: 24, y1: 31, z0: 17, z1: 31 };
const METER_C = [-55, 31, 24];
const MAST = { x: -55, y: 28.6, z0: 31, z1: 60 };
const POLE = { x: -40, y: 98, z0: 1.2, z1: 101, r0: 2.9, r1: 2.1 };
const poleR = (z) => POLE.r0 + ((POLE.r1 - POLE.r0) * (z - POLE.z0)) / (POLE.z1 - POLE.z0);
const DIAL = { c: [56, 64], r: 14, z0: 3, z1: 9 };
const AC = { x0: -44, x1: -30, y0: 12.5, y1: 18.5, z0: TOPZ + 2.4, z1: TOPZ + 12 };
const DC_Y = 29.5;
const DC_Z = 43;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [POLE.x, POLE.y, POLE.z1 + 1.4],
    [MAST.x, MAST.y, 64],
    [SLAB.x, SLAB.y, TOPZ],
    [ROWS_XS[ROWS - 1] - PANEL.l, ARRAY_Y0, zLow + 5],
    [AC.x0, AC.y0, AC.z1],
  ],
  W,
  H,
  { pad: 24, azimuth: AZ, elevation: EL },
);
const V = G.viewOf(P);
const KS = G.scaleOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const path3 = (points, closed = false) => k.pathOf(points.map(at), closed);
const f2 = (v) => Math.round(v * 100) / 100;

const R = A.recorder(P);
const record = R.solid;
function put(name, ref, svg, shapes = [], { bias = 0, attrs = "", ...rest } = {}) {
  return R.put({ name, at: ref, bias, svg, shapes, piece: "fig", attrs, ...rest });
}
const wrapped = (body, wrap) => (wrap ? `<g class="${wrap}">${body}</g>` : body);
function box(name, [x0, y0, z0], [x1, y1, z1], style = {}, { r = 0.4, steps = 2, bevel = 0, extra = "", inner = "", bias = 0, wrap = "", attrs = "", owner } = {}) {
  const plan = { x: x0, y: y0, w: x1 - x0, d: y1 - y0, r };
  const shape = record(A.slab(plan, z0, z1 - z0, { name, owner }, steps));
  const body = S(k.slabOf(plan, z0, z1 - z0, P, steps, bevel), { tone: "mid", ...style, inner }) + extra;
  put(name, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], wrapped(body, wrap), [shape], { bias, attrs });
  return shape;
}
function cyl(name, cx, cy, r, z0, z1, style = {}, { steps = 32, bevel = 0, extra = "", inner = "", bias = 0, attrs = "" } = {}) {
  const shape = record(A.cylinder(cx, cy, r, z0, z1 - z0, { name }));
  put(name, [cx, cy, (z0 + z1) / 2], S(k.cylinder(cx, cy, r, z0, z1 - z0, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, [shape], { bias, attrs });
  return shape;
}
function turned(name, F, profile, style = {}, { extra = "", inner = "", bias = 0, owner, attrs = "" } = {}) {
  const paths = G.solidOf(profile, F, P);
  const mid = (profile[0][0] + profile[profile.length - 1][0]) / 2;
  const shape = record(A.solid(F, profile, { name, owner }));
  put(name, G.add3(F.o, G.mul3(F.a, mid)), S(paths, { tone: "mid", ...style, inner }) + extra, [shape], { bias, attrs });
  return shape;
}
function ringOn(name, F, s0, s1, rIn, rOut, style = {}, { owner, attrs = "" } = {}) {
  const shape = record(A.ring(F, s0, s1, rIn, rOut, { name, owner }));
  put(name, G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)), S(G.ringBand(s0, s1, rIn, rOut, F, P), { tone: "mid", ...style }), [shape], { attrs });
  return shape;
}
function prism(name, F, poly, s0, s1, style = {}, { extra = "", inner = "", bias = 0, wrap = "", attrs = "" } = {}) {
  const shape = record(A.prism(F, poly, s0, s1, { name }));
  const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length;
  const cy = poly.reduce((a, p) => a + p[1], 0) / poly.length;
  const centre = G.add3(G.add3(G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)), G.mul3(F.u, cx)), G.mul3(F.v, cy));
  const body = S(G.prismOf(F, poly, s0, s1, P), { tone: "mid", ...style, inner }) + extra;
  put(name, centre, wrapped(body, wrap), [shape], { bias, attrs });
  return shape;
}
function layer(name, ring, z0, z1, style = {}, { extra = "", bias = 0, wrap = "" } = {}) {
  const shape = record(A.extruded(ring, z0, z1 - z0, { name }));
  const cx = ring.reduce((a, p) => a + p[0], 0) / ring.length;
  const cy = ring.reduce((a, p) => a + p[1], 0) / ring.length;
  const body = S(k.extrude(ring, z0, z1 - z0, P, { convex: false }), { tone: "mid", ...style }) + extra;
  put(name, [cx, cy, (z0 + z1) / 2], wrapped(body, wrap), [shape], { bias });
  return shape;
}
function ball(name, c, r, style = {}, { attrs = "" } = {}) {
  const shape = record(A.ball(c, r, { name }));
  put(name, c, S(G.sphereOf(c, r, P, { steps: 32 }), { tone: "mid", ...style }), [shape], { attrs });
  return shape;
}

// ---------- conductos con flujo de energía ----------
// Cada pedazo del tubo lleva su trazo naranja en fase con la longitud en pantalla desde el inicio
// de la ruta, así los guiones siguen sin saltos de un pedazo al otro.
const FLOWS = {};
const screenLength = (points) => {
  let sum = 0;
  for (let i = 1; i < points.length; i++) {
    const a = at(points[i - 1]);
    const b = at(points[i]);
    sum += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return sum;
};
const arcWhere = (route, test) => {
  const dense = G.resample(route, 0.05);
  let walked = 0;
  for (let i = 1; i < dense.length; i++) {
    walked += G.len3(G.sub3(dense[i], dense[i - 1]));
    if (test(dense[i])) return walked;
  }
  return null;
};
function pipe(name, points, r, { channel = null, flowOf = null, attrsOf = null, tone = "mid", bend, limp = false, maxLength = 12, bias = 0.05, gaps = [], breaks = [] } = {}) {
  const route = G.fillet(points, bend ?? Math.max(r * 2.6, 1.2), 10, { P, tube: r });
  R.route(name, route, r, { limp, piece: "fig", gaps });
  const pieces = tubePieces(route, r, P, { maxLength, spacing: Math.max(0.5, Math.min(1.4, r)), gaps, breaks });
  pieces.forEach((piece, index) => {
    let flow = "";
    const key = flowOf ? flowOf(piece) : channel ? name : null;
    if (key) {
      const span = G.cut(route, piece.from, piece.to);
      const s0 = piece.from > 0 ? screenLength(G.cut(route, 0, piece.from)) : 0;
      flow = `<path class="sr-flow" data-flow="${key}" data-s0="${s0.toFixed(2)}" d="${path3(span)}"/>`;
    }
    put(`${name}:${index}`, piece.mid, tubeSvg(piece, { tone }) + flow, [A.tube(piece.points, piece.radii)], { bias, route: name, chunk: index, attrs: attrsOf ? attrsOf(piece) : "" });
  });
  return route;
}
// Abrazadera: un anillo alrededor del tubo (que queda cortado debajo) y un taco hasta la pared.
function strap(name, route, s, pipeName, r, block) {
  const centre = G.pointAlong(route, s);
  const F = G.frameAlong(centre, G.tangentAlong(route, s));
  ringOn(`${name}.ring`, F, -0.6, 0.6, r, r + 0.45, { tone: "mid" }, { owner: pipeName });
  box(`${name}.block`, block[0], block[1], { tone: "mid" }, { r: 0.2, owner: pipeName });
}

// ---------- base ----------
const back = [];
back.push(`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
  back.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
  back.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
}
back.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: Ln(k.sideSeam(PLATE, -4, P, 8), { tone: "faint" }) }));
back.push(Ln(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
const plateScrews = k.corners(PLATE, 10);
back.push(Ln(plateScrews.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
back.push(Dots(plateScrews.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
record(A.slab(PLATE, -PLATE_H, PLATE_H, { name: "stand.plate", ground: true }, 8));

// placa de rótulo, con el único texto grabado del dibujo
const LABEL = { x: 56, y: -88, w: 11, d: 40, r: 1.2 };
{
  const z = 0.8;
  const cx = LABEL.x + LABEL.w / 2;
  const text = k.faceTextSvg(k.topMatrix([cx - 1.2, LABEL.y + LABEL.d / 2], z, P, "y"), "WINDMAR HOME", { size: 2.6, tone: "mid", anchor: "middle" });
  const rule = (dx, from, to) => Ln(k.lineOnTop([cx + dx, LABEL.y + from], [cx + dx, LABEL.y + to], z, P), { tone: "lo", free: true });
  const extra = Ln(k.planOutline(k.insetPlan(LABEL, 1.6), z, P, 4), { tone: "faint" }) + text + rule(1.6, 8, 32) + rule(3.2, 11, 29) + Dots([at([cx, LABEL.y + 3.4, z]), at([cx, LABEL.y + LABEL.d - 3.4, z])], { size: 0.45 });
  box("stand.label", [LABEL.x, LABEL.y, 0], [LABEL.x + LABEL.w, LABEL.y + LABEL.d, z], { tone: "lo" }, { r: LABEL.r, steps: 4, extra });
}

// ---------- casa ----------
box("house.plinth", [PLINTH.x, PLINTH.y, 0], [PLINTH.x + PLINTH.w, PLINTH.y + PLINTH.d, WALL_Z[0]], { tone: "mid" }, { r: PLINTH.r, steps: 3 });
box("house.walls", [WALLS.x, WALLS.y, WALL_Z[0]], [WALLS.x + WALLS.w, WALLS.y + WALLS.d, WALL_Z[1]], { tone: "mid" }, {
  r: WALLS.r,
  steps: 3,
  inner: Ln(k.sideSeam(WALLS, WALL_Z[1] - 3.2, P, 3), { tone: "faint" }),
});

// sellado de silicona: imprimador y capa blanca, cortados en escalones en la esquina sureste
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
layer("roof.primer", notched(NOTCH.primer), PRIMER_Z[0], PRIMER_Z[1], { tone: "mid" }, { wrap: "sr-primer" });
layer("roof.coat", notched(NOTCH.coat), COAT_Z[0], COAT_Z[1], { tone: "hi" });

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
  cyl("vent.patch", vx, vy, 3.4, TOPZ, TOPZ + 0.6, { tone: "lo" }, { steps: 32 });
  cyl("vent.pipe", vx, vy, 1.6, TOPZ + 0.6, TOPZ + 9, { tone: "mid" }, { steps: 28, inner: Ln(k.sideArc(vx, vy, 1.6, TOPZ + 3, P, 16), { tone: "faint" }) });
  cyl("vent.cap", vx, vy, 2.2, TOPZ + 9, TOPZ + 10, { tone: "mid" }, { steps: 28 });
}

// ventanas tipo Miami (persianas de aluminio) y puerta
function louverSouth(name, y0, y1, z0, z1) {
  const X = HX1 + 0.7;
  const i = 1.2;
  const lines = [];
  for (let z = z0 + i + 1.6; z < z1 - i - 0.4; z += 1.6) lines.push(k.segment([X, y0 + i, z], [X, y1 - i, z], P));
  const extra = Ln(path3([[X, y0 + i, z0 + i], [X, y1 - i, z0 + i], [X, y1 - i, z1 - i], [X, y0 + i, z1 - i]], true), { tone: "lo" }) + Ln(lines.join(""), { tone: "lo" });
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
  const extra = Ln(panelOf(5.4, 15), { tone: "lo" }) + Ln(panelOf(16.6, 26), { tone: "lo" }) + Dots([at([X, y1 - 2.4, 15.8])], { size: 0.6, tone: "hi" });
  box("door", [HX1, y0, WALL_Z[0]], [X, y1, 28], { tone: "mid" }, { r: 0.2, extra });
  box("door.step", [PLINTH.x + PLINTH.w, y0 - 2, 0], [PLINTH.x + PLINTH.w + 5, y1 + 2, WALL_Z[0]], { tone: "mid" }, { r: 0.4 });
}

// ---------- placas: 32 posiciones; la factura decide cuántas se ven ----------
// Se llenan por filas desde el frente y, en cada fila, desde el este, así el extremo este de cada
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
  const attrs = ` data-slot="${index}"`;
  const y0 = yc - (PANEL.w + PANEL.gap) / 2 - (c === 0 ? 1.4 : 0);
  const y1 = yc + (PANEL.w + PANEL.gap) / 2 + (c === COLS - 1 ? 1.4 : 0);
  RAIL_D.forEach((d, ri) => {
    const xr = xs - d;
    const top = railTop(d);
    const bottom = top - 1.8;
    const ends = c === COLS - 1 ? Dots([at([xr, y1 - 0.9, top])], { size: 0.4, tone: "lo" }) : "";
    box(`rack.s${index}.rail${ri}`, [xr - 1.2, y0, bottom], [xr + 1.2, y1, top], { tone: "mid" }, { r: 0.2, extra: ends, attrs });
    cyl(`rack.s${index}.pad${ri}`, xr, yc, 2, TOPZ, TOPZ + PAD_H, { tone: "lo" }, { steps: 24, attrs });
    box(`rack.s${index}.post${ri}`, [xr - 0.8, yc - 0.8, TOPZ + PAD_H], [xr + 0.8, yc + 0.8, bottom], { tone: "mid" }, { r: 0.2, attrs });
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
  prism(`panel.s${index}`, F, [[-hw, -hl], [hw, -hl], [hw, hl], [-hw, hl]], 0, PANEL.t, { tone: "hi" }, { extra, wrap: "sr-panel", attrs });
}

// cajas de fila en el extremo este del riel delantero, y el conducto que las recoge
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
  box(`ac.pad${x0}`, [x0 - 0.6, AC.y0 - 0.6, TOPZ], [x1 + 0.6, AC.y1 + 0.6, TOPZ + 0.6], { tone: "lo" }, { r: 0.3 });
  box(`ac.foot${x0}`, [x0, AC.y0, TOPZ + 0.6], [x1, AC.y1, AC.z0], { tone: "mid" }, { r: 0.2 });
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
cyl("lineset.patch", BOOT.x, BOOT.y, 2.6, TOPZ, TOPZ + 0.6, { tone: "lo" }, { steps: 28 });
cyl("lineset.boot", BOOT.x, BOOT.y, BOOT.r, TOPZ + 0.6, BOOT.z1, { tone: "mid" }, { steps: 24 });
for (const dy of [-0.6, 0.6]) {
  pipe(`lineset${dy > 0 ? "b" : "a"}`, [[AC.x1, BOOT.y + dy, AC.z0 + 3], [BOOT.x, BOOT.y + dy, AC.z0 + 3], [BOOT.x, BOOT.y + dy, BOOT.z1]], 0.35, { tone: "mid", bend: 1.9 });
}

// ---------- equipo en la fachada este ----------
const faceY = (y, points, closed = true) => path3(points.map(([x, z]) => [x, y, z]), closed);
const rect = (x0, x1, z0, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
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
box("battery.pad", [BATS[0].x0 - 2, PLINTH.y + PLINTH.d, 0], [BATS[1].x1 + 2, BATS[0].y1 + 2, BATS[0].z0], { tone: "lo" }, { r: 0.4 });
const LEDS = 10;
BATS.forEach((B, bi) => {
  const y = B.y1;
  const lx = (B.x0 + B.x1) / 2;
  const leds = [];
  for (let i = 0; i < LEDS; i++) {
    const z0 = B.z0 + 3.4 + i * 1.15;
    leds.push(`<path class="sr-led" data-led="${i}" d="${faceY(y, rect(lx - 1.2, lx + 1.2, z0, z0 + 0.8))}"/>`);
    leds.push(Ln(faceY(y, rect(lx - 1.2, lx + 1.2, z0, z0 + 0.8)), { tone: "faint" }));
  }
  const vents = [0, 1, 2, 3].map((i) => Ln(faceY(y, rect(B.x0 + 2.4 + i * 1.2, B.x0 + 2.9 + i * 1.2, B.z0 + 3, B.z0 + 8)), { tone: "lo" })).join("");
  const extra = Ln(faceY(y, rect(B.x0 + 1.2, B.x1 - 1.2, B.z0 + 1.2, B.z1 - 1.2)), { tone: "faint" }) + Ln(faceY(y, rect(lx - 2.2, lx + 2.2, B.z0 + 2.6, B.z0 + 3.4 + LEDS * 1.15 + 0.4)), { tone: "lo" }) + leds.join("") + vents;
  box(`battery${bi + 1}`, [B.x0, B.y0, B.z0], [B.x1, B.y1, B.z1], { tone: "hi" }, { r: 1.2, steps: 4, bevel: 0.6, extra, attrs: bi ? ` data-bat="2"` : "" });
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
turned("meter.base", MF, [[0, 4.4], [1.6, 4.4], [1.6, 4], [2.2, 4]], { tone: "mid" });
const LCD = { w: 5.2, h: 2.2, y: METER_C[1] + 4.2 };
{
  const face = G.circleOf(MF, 4.2, 3.6, P);
  const m = k.sideMatrix([METER_C[0], LCD.y], METER_C[2], P, "left");
  const lcd =
    `<g transform="${m}"><rect class="sr-lcd" x="${-LCD.w / 2}" y="${-LCD.h / 2 - 0.4}" width="${LCD.w}" height="${LCD.h}" rx="0.3"/>` +
    `<text class="sr-lcd-text" data-part="lcd" x="${LCD.w / 2 - 0.4}" y="${LCD.h / 2 - 0.4 - 0.55}" text-anchor="end">+0.0</text>` +
    `<text class="sr-lcd-unit" x="0" y="${LCD.h / 2 + 1.5}" text-anchor="middle">kWh</text></g>`;
  turned("meter.cover", MF, [[2.2, 3.6], [3.6, 3.6], [4.2, 3.3, 1], [4.2, 0]], { tone: "hi" }, { extra: Ln(face, { tone: "faint" }) + lcd });
}
// varilla de tierra al pie del medidor
const ROD = { x: -58.5, y: 28 };
cyl("ground.rod", ROD.x, ROD.y, 0.55, 0, 2.4, { tone: "mid" }, { steps: 16 });
cyl("ground.clamp", ROD.x, ROD.y, 1, 2.4, 3.2, { tone: "mid" }, { steps: 16 });
pipe("ground.wire", [[ROD.x, ROD.y, SOCKET.z0], [ROD.x, ROD.y, 3.2]], 0.35, { tone: "mid" });

// ---------- poste de LUMA ----------
cyl("pole.base", POLE.x, POLE.y, 4.2, 0, POLE.z0, { tone: "lo" }, { steps: 32 });
const PF = G.frameOf([POLE.x, POLE.y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
turned("pole", PF, [[POLE.z0, POLE.r0], [POLE.z1, POLE.r1]], { tone: "mid" }, { inner: Ln(G.arcOf(PF, 40, poleR(40), P, { slope: (POLE.r1 - POLE.r0) / (POLE.z1 - POLE.z0) }), { tone: "faint" }) });
cyl("pole.cap", POLE.x, POLE.y, 2.4, POLE.z1, POLE.z1 + 1.2, { tone: "mid" }, { steps: 24 });
const TX = { x: POLE.x + poleR(86) + 4.2 - 0.05, y: POLE.y, r: 4.2, z0: 80, z1: 93 };
cyl("transformer", TX.x, TX.y, TX.r, TX.z0, TX.z1, { tone: "mid" }, { steps: 40, inner: Ln(k.sideArc(TX.x, TX.y, TX.r, TX.z0 + 4, P, 24), { tone: "faint" }) });
cyl("transformer.lid", TX.x, TX.y, TX.r + 0.4, TX.z1, TX.z1 + 1, { tone: "mid" }, { steps: 40 });
for (const dy of [-1.8, 1.8]) cyl("transformer.bushing", TX.x + 0.6, TX.y + dy, 0.7, TX.z1 + 1, TX.z1 + 3, { tone: "mid" }, { steps: 16 });
const BR = { x0: POLE.x - 1.3, x1: POLE.x + 1.3, y0: 93, y1: POLE.y - poleR(66), z0: 64.5, z1: 67.5 };
box("pole.bracket", [BR.x0, BR.y0, BR.z0], [BR.x1, BR.y1, BR.z1], { tone: "mid" }, { r: 0.3 });

// ---------- conductos de energía ----------
{
  // de la T al inversor: cruza el techo, baja por el borde de la losa y corre por la fachada
  const points = [[TEE.x, TEE.y + RIM, TEE.z], [TEE.x, DC_Y, TEE.z], [TEE.x, DC_Y, DC_Z], [-17, DC_Y, DC_Z], [-17, DC_Y, INV.z1]];
  const probe = G.fillet(points, 3.12, 10, { P, tube: 1.2 });
  const straps = [2, -9].map((x) => arcWhere(probe, (p) => p[2] < DC_Z + 0.01 && p[0] <= x));
  const route = pipe("dc", points, 1.2, { channel: "pv", gaps: straps.map((s) => [s - 0.6, s + 0.6]) });
  [2, -9].forEach((x, i) => strap(`dc.strap${i}`, route, straps[i], "dc", 1.2, [[x - 0.6, SE[1], DC_Z - 0.8], [x + 0.6, DC_Y - 1.65 + 0.05, DC_Z + 0.8]]));
}
pipe("bat", [[INV.x1, 28, 28], [5, 28, 28], [5, 28, BATS[0].z1]], 1.2, { channel: "bat" });
pipe("bat2", [[BATS[0].x1, 30, 13], [BATS[1].x0, 30, 13]], 1.2, { channel: "bat2", attrsOf: () => ` data-bat="2"` });
pipe("ac", [[INV.x0, 27.4, 24], [MAIN.x1, 27.4, 24]], 1.2, { channel: "ac" });
pipe("casa", [[-38.5, 26.6, MAIN.z1], [-38.5, 26.6, LB.z0]], 1.2, { channel: "casa" });
pipe("red", [[-41, 27.4, MAIN.z0], [-41, 27.4, 5.5], [-55, 27.4, 5.5], [-55, 27.4, SOCKET.z0]], 1.2, { channel: "red" });
{
  const straps = [36, 47].map((z) => z - MAST.z0);
  const route = pipe("mast", [[MAST.x, MAST.y, MAST.z0], [MAST.x, MAST.y, MAST.z1]], 1.3, { channel: "red", maxLength: 10, gaps: straps.map((s) => [s - 0.6, s + 0.6]) });
  strap("mast.strap0", route, straps[0], "mast", 1.3, [[MAST.x - 0.6, HY1, 35.2], [MAST.x + 0.6, MAST.y - 1.75 + 0.05, 36.8]]);
  strap("mast.strap1", route, straps[1], "mast", 1.3, [[MAST.x - 0.6, SE[1], 46.2], [MAST.x + 0.6, MAST.y - 1.75 + 0.05, 47.8]]);
}
const WH = G.frameOf([MAST.x, MAST.y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
turned("weatherhead", WH, [[MAST.z1, 1.9], [61.6, 1.9], [62.6, 1.5, 1], [63.2, 0.8, 1], [63.4, 0, 1]], { tone: "mid" });
{
  const start = [MAST.x, MAST.y + 1.9, 61];
  const end = [BR.x0 + 1.3, BR.y0, 66];
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

// ---------- reloj de 24 h ----------
const D0 = { x: DIAL.c[0] - DIAL.r - 2.5, y: DIAL.c[1] - DIAL.r - 2.5, w: 2 * DIAL.r + 5, d: 2 * DIAL.r + 5, r: 4 };
const aNoon = (() => {
  const far = [-Math.cos((AZ * Math.PI) / 180), -Math.sin((AZ * Math.PI) / 180)];
  return Math.atan2(far[0], -far[1]);
})();
const angleOf = (hour) => aNoon + ((hour - 12) / 24) * Math.PI * 2;
const dialFront = [];
{
  const [cx, cy] = DIAL.c;
  const top = DIAL.z1;
  const rf = DIAL.r;
  dialFront.push(`<path class="iso-halo" d="${k.haloOf(D0, 0, 3, P)}" style="opacity:.18"/>`);
  dialFront.push(S(k.slabOf(D0, 0, DIAL.z0, P, 6, 0.6), { tone: "mid" }));
  dialFront.push(Dots(k.corners(D0, 3.4).map(([x, y]) => at([x, y, DIAL.z0])), { size: 0.45 }));
  dialFront.push(S(k.cylinder(cx, cy, rf, DIAL.z0, DIAL.z1 - DIAL.z0, P, 72, 0.8), { tone: "hi", crease: "lo" }));
  dialFront.push(Ln(k.knurl(cx, cy, rf, top - 2.6, top, 96, P, 0.3), { tone: "lo" }));
  dialFront.push(Ln(k.sideArc(cx, cy, rf, top - 2.6, P, 48), { tone: "faint" }));
  const sector = [];
  const r0 = 3.2;
  const r1 = rf - 3.2;
  for (let i = 0; i <= 48; i++) {
    const a = angleOf(SALIDA + ((PUESTA - SALIDA) * i) / 48);
    sector.push(at([cx + Math.sin(a) * r1, cy - Math.cos(a) * r1, top]));
  }
  for (let i = 48; i >= 0; i--) {
    const a = angleOf(SALIDA + ((PUESTA - SALIDA) * i) / 48);
    sector.push(at([cx + Math.sin(a) * r0, cy - Math.cos(a) * r0, top]));
  }
  dialFront.push(`<path class="sr-day" d="${k.pathOf(sector, true)}"/>`);
  dialFront.push(Ln(k.ring(cx, cy, rf - 1.6, top, P, 72), { tone: "lo" }));
  dialFront.push(Ln(k.ring(cx, cy, r1, top, P, 72), { tone: "faint" }));
  const ticks = k.radialTicks(cx, cy, rf - 1.6, 24, 6, top, [1.2, 2.6], P, aNoon);
  dialFront.push(Ln(ticks.minor, { tone: "lo" }), Ln(ticks.major, { tone: "mid" }));
  const CF = G.frameOf([cx + rf, cy, (DIAL.z0 + DIAL.z1) / 2], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  dialFront.push(S(G.disc(0, 1.2, 1, CF, P), { tone: "mid" }));
  dialFront.push(S(G.disc(1.2, 3.6, 1.9, CF, P), { tone: "mid" }));
}
const needleAt = (hour) => {
  const a = angleOf(hour);
  const [cx, cy] = DIAL.c;
  const r = DIAL.r - 3.2;
  return k.lineOnTop([cx - Math.sin(a) * 2.6, cy + Math.cos(a) * 2.6], [cx + Math.sin(a) * r, cy - Math.cos(a) * r], DIAL.z1 + 0.2, P);
};
const START = 12.5;
dialFront.push(`<path data-part="needle" class="iso-line" data-tone="lit" data-free="start" d="${needleAt(START)}" style="stroke-width:1.1"/>`);
dialFront.push(Ln(k.ring(DIAL.c[0], DIAL.c[1], 1.3, DIAL.z1 + 0.2, P, 20), { tone: "hi" }));

// ---------- orden de pintado ----------
A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
const groups = R.items.map((item) => `<g class="it" data-name="${item.name}"${item.attrs ?? ""}>${item.svg}</g>`);

const SYSTEM = sistemaPara(EJEMPLO);
const DATA = { P, start: START, flows: FLOWS, dial: { c: DIAL.c, r: DIAL.r, top: DIAL.z1, aNoon }, leds: LEDS, cols: COLS, ejemplo: EJEMPLO, limites: LIMITES };
Object.assign(DATA.flows, {
  dc: "pv",
  "trunk-a": "row3",
  "trunk-b": "row23",
  "trunk-c": "row123",
  "trunk-s": "row0",
  bat: "bat",
  bat2: "bat2",
  ac: "ac",
  casa: "casa",
  red: "red",
  mast: "red",
  drop: "red",
});

const LABEL_TEXT =
  "Maqueta de una casa de techo plano en Puerto Rico con el sistema Solar y Roofing de Windmar Home: el techo sellado con silicona (imprimador y capa blanca, cortados en escalones en una esquina), placas en filas sobre patas selladas con una caja por fila y un conducto que las recoge, una unidad de aire en el techo, el inversor, una o dos baterías con su columna de luces, el panel de breakers, el medidor de LUMA con su mástil, la acometida al poste y un reloj de 24 horas en la base. Los trazos naranja corren por los conductos en el sentido en que va la energía.";
const svg = k.figureSvg({ width: W, height: H, label: LABEL_TEXT, body: [...back, `<g class="sr-scene">${groups.join("")}</g>`, `<g class="sr-dial">${dialFront.join("")}</g>`] });

const CSS = readFileSync(join(HERE, "page.css"), "utf8");
const intro = `<header class="sr-head"><p class="sr-kicker">Windmar Home · Puerto Rico</p><h1>Cómo funciona un sistema Solar y Roofing</h1><p>Mueve la hora del día y mira a dónde va la energía: a la casa, a la batería o a LUMA. Escribe una factura y el techo se arma con la regla del cotizador.</p></header>`;
const controls = `
<div class="sr-controls">
  <div class="sr-row" role="group" aria-label="Escenas del día">
    <span class="sr-tag">Escena</span>
    <button type="button" class="sr-btn" data-scene="5">Madrugada</button>
    <button type="button" class="sr-btn" data-scene="10">Mañana</button>
    <button type="button" class="sr-btn" data-scene="15">Tarde</button>
    <button type="button" class="sr-btn" data-scene="21">Noche</button>
    <button type="button" class="sr-btn sr-theme" data-theme-toggle aria-pressed="false">Tema oscuro</button>
  </div>
  <p class="sr-now" data-now></p>
  <form class="sr-row sr-bill" data-bill novalidate>
    <span class="sr-tag">Factura</span>
    <label>promedio <input type="number" name="promedio" min="${LIMITES.promedio[0]}" max="${LIMITES.promedio[1]}" step="10" value="${EJEMPLO.promedio}" inputmode="numeric"> kWh/mes</label>
    <label>mes pico <input type="number" name="pico" min="${LIMITES.pico[0]}" max="${LIMITES.pico[1]}" step="10" value="${EJEMPLO.pico}" inputmode="numeric"> kWh</label>
    <output data-system>${SYSTEM.placas} placas · ${SYSTEM.kwp.toFixed(2)} kW · ${SYSTEM.baterias} Powerwall</output>
  </form>
</div>`;

const caption =
  `Maqueta de una casa de techo plano en Puerto Rico con el sistema Solar y Roofing de Windmar Home. El techo lleva el sellado de silicona Gardner de los Planes de Sellado: imprimador Elasto Prime y una capa continua de silicona blanca, sin uniones. En la esquina se ven el concreto con una grieta reparada, el imprimador y la capa; cada pata de la estructura, el tubo de ventilación, la bota del aire y la unidad de aire van sobre sellos de Roof Patch. ` +
  `La factura arma el sistema con la regla del cotizador de LUMA de Sun Bot: la meta es el mayor entre 110 % del promedio y el mes pico; con ${BASE.horasSol} horas de sol pico y ${BASE.rendimiento} de rendimiento cada placa QCells de ${BASE.vatios} W da ${porPlaca().toFixed(2)} kWh al día, y los Powerwall de ${BASE.bateria} kWh cubren la mitad del consumo diario, al menos uno. Con la factura de ejemplo (${EJEMPLO.promedio} kWh al mes, pico ${EJEMPLO.pico}) salen ${SYSTEM.placas} placas (${SYSTEM.kwp.toFixed(2)} kW) y ${SYSTEM.baterias} Powerwall. ` +
  `De madrugada la batería llega a su reserva y entra LUMA; en la mañana las placas cubren la casa y cargan la batería; ya llena, el sobrante sale a LUMA por el medidor bidireccional; de noche la batería alimenta la casa. El ventilador del aire gira más rápido cuanto más consume la casa. ` +
  `Supuestos del dibujo: el reparto del consumo por hora, la reserva del 20 %, la batería sin pérdidas y el sol del equinoccio (sale 6:25, se pone 18:25). El techo mide unos 1,250 pies², el promedio del cotizador, y le caben hasta ${ROWS * COLS} placas; el equipo de la pared está más grande que en la realidad para que se lea, y el Powerwall 3 trae el inversor integrado aunque aquí se dibuja aparte. No muestra dinero.`;

const plate = k
  .plateHtml({
    fig: "Fig 1",
    title: "Solar y Roofing",
    hint: "Puntero o ← → cambia la hora",
    readout: "",
    keys: [
      { mark: "dashed", label: "Energía: corre en el sentido del flujo, más rápido con más kW" },
      { mark: "lit", label: "Aguja: la hora del día" },
      { mark: "flat", label: "Horas de sol en el reloj" },
      { mark: "raised", label: "Capas del techo en la esquina: concreto, imprimador, silicona" },
    ],
    caption,
    body: `<div class="iso-stage sr-stage" tabindex="0" role="slider" aria-label="Sistema Solar y Roofing. Mueve el puntero o usa las flechas para cambiar la hora del día." aria-valuemin="0" aria-valuemax="24" aria-valuenow="${START}">${svg}<span class="sr-sr" role="status" aria-live="polite" data-status></span></div>`,
  })
  .replace('data-mark="dashed"', 'data-mark="dashed" data-energy')
  .replace('data-mark="flat"', 'data-mark="flat" data-day')
  .replace('<figcaption class="iso-legend">', `${controls}<figcaption class="iso-legend">`);

const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^export /gm, "");
const notice = `/* Kit de figuras isométricas Anatomy (github.com/wheresryan22/anatomy), licencia MIT, © 2026 Ryan. Ver vendor/anatomy/LICENSE. */\n`;
const LIVE = strip("live.js").replace("__DATA__", JSON.stringify(DATA));
const page = k
  .pageHtml({ title: "Solar y Roofing · Windmar Home", theme: "light", body: `<style>${CSS}</style>${intro}${plate}`, script: notice + kitScript() + strip("model.mjs") + LIVE, width: 720 })
  .replace('<html lang="en">', '<html lang="es">')
  .replace("<head>", `<head><meta name="description" content="Figura interactiva: cómo funciona un sistema Solar y Roofing de Windmar Home en Puerto Rico.">`);
mkdirSync(join(ROOT, "public"), { recursive: true });
writeFileSync(join(ROOT, "public", "index.html"), page);
console.log("wrote public/index.html", `${(page.length / 1024).toFixed(0)} KB`, `${R.items.length} items`, `${R.solids.length} solids`, `${R.routes.length} routes`, `scale ${KS.toFixed(3)}`);

A.auditOrExit(R, P, {});
