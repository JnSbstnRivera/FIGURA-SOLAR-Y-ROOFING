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
import { BASE, LIMITES, EJEMPLO, MESES, SALIDA, PUESTA, kwhPorPlacaDia, sugerencia } from "./model.mjs";
import { SOL, factorRumbo, tofDe, rumboDe } from "./sol.mjs";
import { AGUA } from "./agua.mjs";
import { PRODUCTOS, nuncaJuntas } from "./productos.mjs";
import { LOGO } from "./logo.mjs";

const fmtN = (v) => Math.round(v).toLocaleString("en-US");
const pctN = (f) => `${Math.round(f * 100)} %`;
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
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
const DC_Y = 29.5;
const DC_Z = 43;

// El calentador solar y su tanque (ver más abajo): sus medidas van aquí porque el lienzo tiene que
// contar el tanque, que es lo más alto del techo.
const PULG = 0.0254 * 10.5;
const COLECTOR = { ancho: 34 * PULG, largo: 76 * PULG, grueso: 0.9, beta: (18 * Math.PI) / 180, frente: -38.1, z0: TOPZ + 2.6, paso: 34 * PULG + 0.6 };
const TANQUE_CAL = { 80: { largo: 53.5 * PULG, r: (23.5 / 2) * PULG }, 120: { largo: 63 * PULG, r: (28 / 2) * PULG } };
const yColector = (j) => ARRAY_Y0 + 0.9 + COLECTOR.ancho / 2 + j * COLECTOR.paso;
function tanqueCal(cal) {
  const { beta, largo: L, grueso, frente: xf, z0 } = COLECTOR;
  const t = TANQUE_CAL[cal.gal];
  const yc = yColector(0) + ((cal.colectores - 1) * COLECTOR.paso) / 2;
  return { x: xf - L * Math.cos(beta) - 1.2, y0: yc - t.largo / 2, y1: yc + t.largo / 2, yc, z: z0 + L * Math.sin(beta) + grueso * Math.cos(beta) + 0.3 + t.r, r: t.r, largo: t.largo };
}

// ---------- el plano: cómo se dibuja cada producto de productos.mjs ----------
// Cada producto del plano tiene aquí su dibujo, con el mismo id: lienzo(m) da los puntos más altos de cada modelo,
// para que el lienzo los cuente; cielo(m), su caja, para que el sol y la luna den la vuelta por fuera; y dibujar(p)
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
    cielo: (m) => {
      const { lugar, r, top } = medidasCisterna(m);
      return k.boxCorners({ x: lugar.x - r, y: lugar.y - r, w: 2 * r, d: 2 * r }, lugar.z, top + 1);
    },
    dibujar: (p) => dibujarCisterna(p),
  },
};
const puntasDe = (cual) => PRODUCTOS.flatMap((p) => p.modelos.flatMap((m) => DIBUJOS[p.id][cual]?.(m) ?? []));
// El logo de Windmar (logo.mjs) sobre un cilindro, como una calcomanía: cada punto se envuelve alrededor del
// cilindro y después se proyecta, así sigue la curva. `centro` es el punto de la superficie donde va el centro del
// logo; `frente`, la dirección del eje hacia ese punto; `eje`, la del cilindro; `ancho`, lo que mide el logo. En
// un cilindro parado el ancho da la vuelta y el alto sube por el eje; en uno acostado el ancho va a lo largo del
// eje y el alto da la vuelta hacia arriba.
function logoEnCilindro({ centro, frente, eje, r, ancho, acostado = false }) {
  const derecha = (v) => (at(G.add3(centro, v))[0] > at(centro)[0] ? v : G.mul3(v, -1));
  const vuelta = G.cross3(eje, frente);
  const base = G.sub3(centro, G.mul3(frente, r));
  const largo = acostado ? derecha(eje) : null;
  const alrededor = acostado ? (vuelta[2] >= 0 ? vuelta : G.mul3(vuelta, -1)) : derecha(vuelta);
  const punto = ([lx, ly]) => {
    const a = (lx - 0.5) * ancho;
    const b = (LOGO.alto / 2 - ly) * ancho;
    const t = (acostado ? b : a) / r;
    const sobre = G.add3(G.mul3(frente, r * Math.cos(t)), G.mul3(alrededor, r * Math.sin(t)));
    return G.add3(G.add3(base, acostado ? G.mul3(largo, a) : G.mul3(eje, b)), sobre);
  };
  // cada contorno con un punto absoluto y los demás relativos, a una décima
  const d1 = (v) => String(Math.round(v * 10) / 10);
  const trazo = (contornos) =>
    contornos
      .map((c) => {
        let antes = null;
        return (
          c
            .map((q) => {
              const p = at(punto(q)).map((v) => Math.round(v * 10) / 10);
              const s = antes ? `l${d1(p[0] - antes[0])} ${d1(p[1] - antes[1])}` : `M${p[0]} ${p[1]}`;
              antes = p;
              return s;
            })
            .join("") + "Z"
        );
      })
      .join("");
  return `<path class="sr-logo-sol" d="${trazo(LOGO.sol)}"/><path class="sr-logo-azul" d="${trazo(LOGO.azul)}"/>`;
}

// El lienzo toma la proporción exacta del dibujo: sin franjas vacías, la casa llena la tarjeta.
const FIT = [
  ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
  [POLE.x, POLE.y, POLE.z1 + 1.4],
  [MAST.x, MAST.y, 64],
  [SLAB.x, SLAB.y, TOPZ],
  [ROWS_XS[ROWS - 1] - PANEL.l, ARRAY_Y0, zLow + 5],
  [AC.x0, AC.y0, AC.z1],
  ...puntasDe("lienzo"),
];
const PAD = 12;
const H = (() => {
  const flat = FIT.map((p) => k.iso(p, { origin: [0, 0], scale: 1, azimuth: AZ, elevation: EL }));
  const span = (i) => Math.max(...flat.map((q) => q[i])) - Math.min(...flat.map((q) => q[i]));
  return Math.round(((W - 2 * PAD) * span(1)) / span(0) + 2 * PAD);
})();
const P = k.fitProjection(FIT, W, H, { pad: PAD, azimuth: AZ, elevation: EL });
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

// ---------- sombras: quién tapa el sol y dónde cae la sombra ----------
// Cada sólido que tapa el sol se guarda como dos anillos (abajo y arriba) para sol.mjs. Cada pieza que
// recibe sombra guarda sus caras que se ven (normal, plano y polígono en pantalla) y lleva al final una
// capa vacía, recortada a su silueta, donde la página pinta la sombra de cada momento: la que le echan
// las demás piezas y la de las caras que le dan la espalda al sol.
const SOMBRA = { solidos: [], receptores: [], tubos: [] };
const CLIPS = [];
const VISTA = G.viewOf(P);
const r2 = (v) => Math.round(v * 100) / 100;
const p3 = (p) => p.map(r2);
function tapaSol(name, abajo, arriba, on = null) {
  const id = SOMBRA.solidos.length;
  SOMBRA.solidos.push({ id, n: name, on, a: abajo.map(p3), b: arriba.map(p3) });
  return id;
}
function cara(n, puntos) {
  const centro = puntos.reduce((a, p) => G.add3(a, G.mul3(p, 1 / puntos.length)), [0, 0, 0]);
  const radio = Math.max(...puntos.map((p) => G.len3(G.sub3(p, centro))));
  return { n: n.map((v) => Math.round(v * 1e4) / 1e4), c: r2(G.dot3(n, puntos[0])), m: p3(centro), rr: r2(radio), p: puntos.map((q) => at(q).map(r2)) };
}
const seVe = (n) => G.dot3(n, VISTA) > 0.02;
function recibeSol(name, silueta, caras, { on = null, propios = [] } = {}) {
  const id = SOMBRA.receptores.length;
  SOMBRA.receptores.push({ id, n: name, on, propios, caras });
  CLIPS.push(`<clipPath id="sh${id}"><path d="${silueta}"/></clipPath>`);
  return `<g class="sr-sh" data-sh="${id}" clip-path="url(#sh${id})"></g>`;
}
const anillosCaja = ([x0, y0, z0], [x1, y1, z1]) => [
  [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]],
  [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]],
];
function carasCaja([x0, y0, z0], [x1, y1, z1]) {
  return [
    [[0, 0, 1], [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]],
    [[1, 0, 0], [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]],
    [[-1, 0, 0], [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]]],
    [[0, 1, 0], [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]]],
    [[0, -1, 0], [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]]],
  ]
    .filter(([n]) => seVe(n))
    .map(([n, pts]) => cara(n, pts));
}
// Un anillo de piso (redondo o de esquinas redondas) levantado de z0 a z1, o un poste que se afina
// (r1/r0): la tapa y los lados que se ven, cada lado con su normal.
function carasAnillo(abajo, arriba, { tapa = true } = {}) {
  const out = [];
  const c = abajo.reduce((a, p) => G.add3(a, G.mul3(p, 1 / abajo.length)), [0, 0, 0]);
  if (tapa) out.push(cara([0, 0, 1], arriba));
  for (let i = 0; i < abajo.length; i++) {
    const j = (i + 1) % abajo.length;
    let n = G.unit3(G.cross3(G.sub3(abajo[j], abajo[i]), G.sub3(arriba[i], abajo[i])));
    if (G.dot3(n, G.sub3(abajo[i], c)) < 0) n = G.mul3(n, -1);
    if (seVe(n)) out.push(cara(n, [abajo[i], abajo[j], arriba[j], arriba[i]]));
  }
  return out;
}
const anilloEn = (ring, z) => ring.map(([x, y]) => [x, y, z]);
const anilloRedondo = (cx, cy, r, z, n = 12) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * 2 * Math.PI), cy + r * Math.sin((i / n) * 2 * Math.PI), z]);
// dibujos sobre una cara que mira a +y (la fachada oeste y lo que va delante de ella)
const faceY = (y, points, closed = true) => path3(points.map(([x, z]) => [x, y, z]), closed);
const rect = (x0, x1, z0, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
// Caja que tapa y recibe sombra. `sombra`: "ambas" (por defecto), "recibe", "tapa" o false.
function sombraCaja(name, min, max, silueta, { sombra = "ambas", on = null } = {}) {
  if (!sombra) return "";
  const [abajo, arriba] = anillosCaja(min, max);
  const id = sombra === "recibe" ? null : tapaSol(name, abajo, arriba, on);
  return sombra === "tapa" ? "" : recibeSol(name, silueta, carasCaja(min, max), { on, propios: id === null ? [] : [id] });
}
function sombraCilindro(name, cx, cy, r, z0, z1, silueta, { sombra = "ambas", on = null, lados = 16, r1 = r } = {}) {
  if (!sombra) return "";
  const anillo = (rr, z) => Array.from({ length: lados }, (_, i) => [cx + rr * Math.cos((i / lados) * 2 * Math.PI), cy + rr * Math.sin((i / lados) * 2 * Math.PI), z]);
  const abajo = anillo(r, z0);
  const arriba = anillo(r1, z1);
  const id = sombra === "recibe" ? null : tapaSol(name, abajo, arriba, on);
  return sombra === "tapa" ? "" : recibeSol(name, silueta, carasAnillo(abajo, arriba), { on, propios: id === null ? [] : [id] });
}

function box(name, [x0, y0, z0], [x1, y1, z1], style = {}, { r = 0.4, steps = 2, bevel = 0, extra = "", inner = "", bias = 0, wrap = "", attrs = "", owner, sombra = "ambas", on = null } = {}) {
  const plan = { x: x0, y: y0, w: x1 - x0, d: y1 - y0, r };
  const shape = record(A.slab(plan, z0, z1 - z0, { name, owner }, steps));
  const paths = k.slabOf(plan, z0, z1 - z0, P, steps, bevel);
  const body = S(paths, { tone: "mid", ...style, inner }) + extra;
  const capa = sombraCaja(name, [x0, y0, z0], [x1, y1, z1], paths.fill, { sombra, on });
  put(name, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], wrapped(body, wrap) + capa, [shape], { bias, attrs });
  return shape;
}
function cyl(name, cx, cy, r, z0, z1, style = {}, { steps = 32, bevel = 0, extra = "", inner = "", bias = 0, attrs = "", sombra = "ambas", on = null, owner } = {}) {
  const shape = record(A.cylinder(cx, cy, r, z0, z1 - z0, { name, owner }));
  const paths = k.cylinder(cx, cy, r, z0, z1 - z0, P, steps, bevel);
  const capa = sombraCilindro(name, cx, cy, r, z0, z1, paths.fill, { sombra, on, lados: Math.max(12, Math.min(32, steps)) });
  put(name, [cx, cy, (z0 + z1) / 2], S(paths, { tone: "mid", ...style, inner }) + extra + capa, [shape], { bias, attrs });
  return shape;
}
function turned(name, F, profile, style = {}, { extra = "", inner = "", bias = 0, owner, attrs = "", capa = null } = {}) {
  const paths = G.solidOf(profile, F, P);
  const mid = (profile[0][0] + profile[profile.length - 1][0]) / 2;
  const shape = record(A.solid(F, profile, { name, owner }));
  put(name, G.add3(F.o, G.mul3(F.a, mid)), S(paths, { tone: "mid", ...style, inner }) + extra + (capa ? capa(paths.fill) : ""), [shape], { bias, attrs });
  return shape;
}
function ringOn(name, F, s0, s1, rIn, rOut, style = {}, { owner, attrs = "" } = {}) {
  const shape = record(A.ring(F, s0, s1, rIn, rOut, { name, owner }));
  // un anillo se oscurece entero, como un tubo: tres puntos de su cara que se ve
  const centro = G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2));
  const hacia = G.unit3(G.sub3(VISTA, G.mul3(F.a, G.dot3(VISTA, F.a))));
  const lado = G.unit3(G.cross3(F.a, hacia));
  const muestras = [-0.6, 0, 0.6].map((f) => p3(G.add3(centro, G.mul3(G.unit3(G.add3(hacia, G.mul3(lado, f))), rOut * 1.05))));
  const id = SOMBRA.tubos.length;
  SOMBRA.tubos.push({ p: muestras, propio: null });
  put(name, centro, S(G.ringBand(s0, s1, rIn, rOut, F, P), { tone: "mid", ...style }), [shape], { attrs: `${attrs} data-tubo="${id}"` });
  return shape;
}
function prism(name, F, poly, s0, s1, style = {}, { extra = "", inner = "", bias = 0, wrap = "", attrs = "", capa = null, owner } = {}) {
  const shape = record(A.prism(F, poly, s0, s1, { name, owner }));
  const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length;
  const cy = poly.reduce((a, p) => a + p[1], 0) / poly.length;
  const centre = G.add3(G.add3(G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)), G.mul3(F.u, cx)), G.mul3(F.v, cy));
  const paths = G.prismOf(F, poly, s0, s1, P);
  const body = S(paths, { tone: "mid", ...style, inner }) + extra;
  put(name, centre, wrapped(body, wrap) + (capa ? capa(paths.fill) : ""), [shape], { bias, attrs });
  return shape;
}
function layer(name, ring, z0, z1, style = {}, { extra = "", bias = 0, wrap = "", capa = null } = {}) {
  const shape = record(A.extruded(ring, z0, z1 - z0, { name }));
  const cx = ring.reduce((a, p) => a + p[0], 0) / ring.length;
  const cy = ring.reduce((a, p) => a + p[1], 0) / ring.length;
  const paths = k.extrude(ring, z0, z1 - z0, P, { convex: false });
  const body = S(paths, { tone: "mid", ...style }) + extra;
  put(name, [cx, cy, (z0 + z1) / 2], wrapped(body, wrap) + (capa ? capa(paths.fill) : ""), [shape], { bias });
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
// Un tubo no recibe la sombra recortada (las uniones entre pedazos se verían como rayas): cada pedazo
// se oscurece entero según qué parte de su cara que se ve queda a la sombra (4 puntos de muestra).
function sombraTubo(piece, r, propio) {
  const pts = piece.points;
  const muestras = [0.125, 0.375, 0.625, 0.875].map((f) => {
    const i = Math.min(pts.length - 2, Math.floor(f * (pts.length - 1)));
    const t = f * (pts.length - 1) - i;
    const c = G.lerp3(pts[i], pts[i + 1], t);
    const eje = G.unit3(G.sub3(pts[i + 1], pts[i]));
    const hacia = G.unit3(G.sub3(VISTA, G.mul3(eje, G.dot3(VISTA, eje))));
    return p3(G.add3(c, G.mul3(hacia, r * 1.05)));
  });
  const id = SOMBRA.tubos.length;
  SOMBRA.tubos.push({ p: muestras, propio });
  return ` data-tubo="${id}"`;
}
function pipe(name, points, r, { channel = null, flowOf = null, attrsOf = null, tone = "mid", bend, limp = false, maxLength = 12, bias = 0.05, gaps = [], breaks = [], propio = null, touch, agua = false } = {}) {
  const route = G.fillet(points, bend ?? Math.max(r * 2.6, 1.2), 10, { P, tube: r });
  R.route(name, route, r, { limp, piece: "fig", gaps, touch });
  const pieces = tubePieces(route, r, P, { maxLength, spacing: Math.max(0.5, Math.min(1.4, r)), gaps, breaks });
  pieces.forEach((piece, index) => {
    let flow = "";
    const key = flowOf ? flowOf(piece) : channel ? name : null;
    if (key) {
      const span = G.cut(route, piece.from, piece.to);
      const s0 = piece.from > 0 ? screenLength(G.cut(route, 0, piece.from)) : 0;
      flow = `<path class="sr-flow${agua ? ` sr-agua${agua === "caliente" ? " sr-caliente" : ""}` : ""}" data-flow="${key}" data-s0="${s0.toFixed(2)}" d="${path3(span)}"/>`;
    }
    const attrs = (attrsOf ? attrsOf(piece) : "") + sombraTubo(piece, r, propio);
    put(`${name}:${index}`, piece.mid, tubeSvg(piece, { tone }) + flow, [A.tube(piece.points, piece.radii)], { bias, route: name, chunk: index, attrs });
  });
  return route;
}
// Abrazadera: un anillo alrededor del tubo (que queda cortado debajo) y un taco hasta la pared.
function strap(name, route, s, pipeName, r, block) {
  const centre = G.pointAlong(route, s);
  const F = G.frameAlong(centre, G.tangentAlong(route, s));
  ringOn(`${name}.ring`, F, -0.6, 0.6, r, r + 0.45, { tone: "mid" }, { owner: pipeName });
  box(`${name}.block`, block[0], block[1], { tone: "mid" }, { r: 0.2, owner: pipeName, sombra: "recibe" });
}

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
const plateScrews = k.corners(PLATE, 10);
back.push(Ln(plateScrews.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
back.push(Dots(plateScrews.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
record(A.slab(PLATE, -PLATE_H, PLATE_H, { name: "stand.plate", ground: true }, 8));
// la sombra en la base va antes que todo lo que está parado encima, que la tapa donde está
back.push(recibeSol("stand.plate", PLATE_PATHS.fill, carasAnillo(anilloEn(k.ringOf(PLATE, 8), -PLATE_H), anilloEn(k.ringOf(PLATE, 8), 0))));

// ---------- brújula: la tarjeta gira para que su N mire al norte, y la marca fija (la línea de fe, como en
// un barco) apunta hacia donde miran las placas, así se lee el rumbo en la tarjeta ----------
const BRUJULA = { x: 20, y: 64, r: 11, z0: 0.7, z1: 2.8, carta: 9.2 };
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

// ---------- cisternas Windmar: dos van en el techo y dos en el patio ----------
// Medidas del PDF maestro de Water (Sun Bot), en productos.mjs: la torre Eco 150 mide 25" de diámetro y 72" de alto,
// la Hércules 600, 56" × 61", y la Eco 500, 74" × 32"; la Eco 1,000 no trae medidas y se dibuja de 64" × 76" (unos
// 1,000 gal). Cada una con su bomba y su presurizado: la 150, de ½ HP y 6 gal; las otras, de ¾ HP y 40 gal. La
// torre y la Hércules caben en la franja oeste del techo, sobre una base baja de hierro con patas en sellos de Roof
// Patch, y su sombra les cae a las placas del extremo oeste (de tarde si miran al sur, de mañana si miran al
// norte); la Eco 500 y la Eco 1,000 van en el patio oeste, sobre una losa. Solo se ve la que se escoge. Todas
// llevan una mirilla de nivel al frente, donde la página dibuja el agua que tienen.
const LUGAR_TECHO = { x: 1, y: 17.2, z: TOPZ + 4.8 };
const LUGAR_PATIO = { x: -14, y: 62, z: 0.8 };
function medidasCisterna(c) {
  const lugar = c.techo ? LUGAR_TECHO : LUGAR_PATIO;
  const h = c.h * PULG;
  return { lugar, r: (c.d / 2) * PULG, h, z0: lugar.z, top: lugar.z + h };
}
// lo que es de otra cisterna, que nunca se ve con esta: sus tubos pueden pasar por ahí
const otraCisterna = (c) => (name) => name.startsWith("cis") && !name.startsWith(`cis${c.id}`);
// La bomba y el presurizado van en el suelo, debajo del inversor, con la cisterna que se escoja: la bomba (½ HP con
// la torre de 150, ¾ HP con las otras) y el presurizado (6 o 40 gal). El agua entra a la casa por la pared. La
// cisterna del patio llega a la bomba por un tubo; las del techo bajan por dentro de la casa.
const BOMBA = { x0: -8.2, x1: -5.2, y0: 37.6, y1: 40.4, z0: 0.5, z1: 3.9, eje: [39, 2] };
const PRES = { x: -17.6, y: BOMBA.eje[0] };
function dibujarCisterna(p) {
  const MIRILLA = Math.atan2(k.towardViewer(P)[1], k.towardViewer(P)[0]);
  for (const c of p.modelos) {
    const enCis = parte(p.id, c.id);
    const { on, attrs } = enCis;
    const { lugar, r, h, z0, top } = medidasCisterna(c);
    const owner = c.techo ? "cisterna.techo" : "cisterna.patio";
    if (c.techo) {
      // base baja de hierro: plataforma cuadrada del ancho de la cisterna y cuatro patas en sus sellos
      const S0 = { x0: lugar.x - r, x1: lugar.x + r, y0: lugar.y - r, y1: lugar.y + r };
      [[S0.x0, S0.y0], [S0.x1, S0.y0], [S0.x0, S0.y1], [S0.x1, S0.y1]].forEach(([cx, cy], i) => {
        const lx = cx + Math.sign(lugar.x - cx) * 1.1;
        const ly = cy + Math.sign(lugar.y - cy) * 1.1;
        cyl(`cis${c.id}.pad${i}`, lx, ly, 1.7, TOPZ, TOPZ + 0.6, { tone: "lo" }, { steps: 16, sombra: "recibe", owner, ...enCis });
        box(`cis${c.id}.leg${i}`, [lx - 0.7, ly - 0.7, TOPZ + 0.6], [lx + 0.7, ly + 0.7, z0 - 1], { tone: "mid" }, { r: 0.2, sombra: "recibe", owner, ...enCis });
      });
      box(`cis${c.id}.stand`, [S0.x0, S0.y0, z0 - 1], [S0.x1, S0.y1, z0], { tone: "mid" }, { r: 0.3, steps: 2, owner, ...enCis });
    } else {
      // losa de concreto en el patio, un poco más ancha que la cisterna
      box(`cis${c.id}.losa`, [lugar.x - r - 1.6, lugar.y - r - 1.6, 0], [lugar.x + r + 1.6, lugar.y + r + 1.6, z0], { tone: "lo" }, { r: 0.6, steps: 3, sombra: "recibe", owner, ...enCis });
    }
    // el cuerpo con sus anillos de refuerzo, el hombro redondo y la tapa de rosca arriba
    const TF = G.frameOf([lugar.x, lugar.y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    const hombroAlto = Math.min(2.6, h * 0.16);
    const hombro = top - hombroAlto;
    const adentro = Math.min(3.2, r * 0.42);
    const profile = [[z0, r], [hombro, r], [top - hombroAlto * 0.35, r - adentro * 0.25, 1], [top, r - adentro, 1]];
    const anillos = Math.max(1, Math.floor((hombro - z0) / 3.6) - 1);
    const ribs = Array.from({ length: anillos }, (_, i) => Ln(G.arcOf(TF, z0 + ((i + 1) * (hombro - z0)) / (anillos + 1), r, P), { tone: "faint" })).join("");
    // el logo de Windmar al frente, del ancho que quepa en el cuerpo, y la mirilla de nivel a su derecha: una
    // franja angosta donde la página dibuja el agua que tiene
    const alto = hombro - z0;
    const ancho = Math.min(r * 1.32, 10.5, (alto * 0.7) / LOGO.alto);
    const frente = [Math.cos(MIRILLA), Math.sin(MIRILLA), 0];
    const logo = p.logo ? logoEnCilindro({ centro: [lugar.x + (r + 0.03) * frente[0], lugar.y + (r + 0.03) * frente[1], z0 + alto * 0.55], frente, eje: [0, 0, 1], r: r + 0.03, ancho }) : "";
    const alFrente = [lugar.x + r * frente[0], lugar.y + r * frente[1], z0];
    const giro = at(G.add3(alFrente, [-frente[1], frente[0], 0]))[0] > at(alFrente)[0] ? 1 : -1;
    const centroMirilla = p.logo ? MIRILLA + giro * (ancho / 2 / r + 0.28) : MIRILLA;
    const mirilla = { a0: centroMirilla - 0.16, a1: centroMirilla + 0.16, z0: z0 + 0.8, z1: hombro - 0.6 };
    mide(p.id, c.id, { mirilla: { ...mirilla, x: lugar.x, y: lugar.y, r: r + 0.02 } });
    const arco = (z, a0, a1) => Array.from({ length: 7 }, (_, i) => {
      const a = a0 + ((a1 - a0) * i) / 6;
      return [lugar.x + (r + 0.02) * Math.cos(a), lugar.y + (r + 0.02) * Math.sin(a), z];
    });
    const marco = path3([...arco(mirilla.z0, mirilla.a0, mirilla.a1), ...arco(mirilla.z1, mirilla.a1, mirilla.a0)], true);
    const vidrio = `<path class="sr-mirilla" d="${marco}"/><path class="sr-nivel" data-nivel="${c.id}" d=""/>` + Ln(marco, { tone: "lo" }) + logo;
    // tapa el sol y recibe sombra como un cilindro y un tronco de cono encima (el hombro)
    const capa = (fill) => {
      const anillo = (rr, z) => anilloRedondo(lugar.x, lugar.y, rr, z, 24);
      const cuerpo = [anillo(r, z0), anillo(r, hombro)];
      const arriba = [anillo(r, hombro), anillo(r - adentro, top)];
      const propios = [tapaSol(`cis${c.id}`, ...cuerpo, on), tapaSol(`cis${c.id}.hombro`, ...arriba, on)];
      return recibeSol(`cis${c.id}`, fill, [...carasAnillo(...cuerpo, { tapa: false }), ...carasAnillo(...arriba)], { on, propios });
    };
    turned(`cis${c.id}`, TF, profile, { tone: "mid" }, { inner: ribs, extra: vidrio, owner, attrs, capa });
    const tapaR = Math.min(2.8, (r - adentro) * 0.75);
    cyl(`cis${c.id}.lid`, lugar.x, lugar.y, tapaR, top, top + 1, { tone: "mid" }, { steps: 24, bevel: 0.2, owner, ...enCis });
    if (c.techo) {
      // el agua baja por dentro de la casa: el tubo entra al techo por una bota sellada con Roof Patch
      const bx = lugar.x - r - 3.6;
      cyl(`cis${c.id}.parche`, bx, lugar.y, 2.2, TOPZ, TOPZ + 0.6, { tone: "lo" }, { steps: 24, sombra: "recibe", owner, ...enCis });
      cyl(`cis${c.id}.bota`, bx, lugar.y, 1.1, TOPZ + 0.6, TOPZ + 2.2, { tone: "mid" }, { steps: 20, sombra: "recibe", owner, ...enCis });
      pipe(`cis${c.id}.salida`, [[lugar.x - r, lugar.y, z0 + 1.6], [bx, lugar.y, z0 + 1.6], [bx, lugar.y, TOPZ + 2.2]], 0.6, { touch: [otraCisterna(c)], agua: true, flowOf: () => "agua", attrsOf: () => attrs, bend: 3 });
    }
  }

  // la bomba: va con cualquier cisterna
  const EN_BOMBA = parte(p.id, "bomba");
  box("bomba.losa", [-13.2, 36.4, 0], [-4.4, 41.6, BOMBA.z0], { tone: "lo" }, { r: 0.4, steps: 2, sombra: "recibe", ...EN_BOMBA });
  {
    // el motor acostado, con sus aletas, y la cabeza de la bomba con su luz (prende cuando bombea)
    const MF = G.frameOf([0, BOMBA.eje[0], BOMBA.eje[1]], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    const aletas = [-11.7, -11.0, -10.3, -9.6].map((s) => Ln(G.arcOf(MF, s, 1.5, P), { tone: "faint" })).join("");
    const capaMotor = (fill) => recibeSol("bomba.motor", fill, carasCaja([-12.4, BOMBA.eje[0] - 1.5, BOMBA.z0], [BOMBA.x0, BOMBA.eje[0] + 1.5, BOMBA.eje[1] + 1.5]), { on: EN_BOMBA.on });
    turned("bomba.motor", MF, [[-12.4, 1.5], [BOMBA.x0, 1.5]], { tone: "mid" }, { inner: aletas, attrs: EN_BOMBA.attrs, capa: capaMotor });
    const luz = at([(BOMBA.x0 + BOMBA.x1) / 2, BOMBA.y1, BOMBA.z1 - 1]);
    const extra = `<circle class="sr-led" data-part="bomba-led" cx="${f2(luz[0])}" cy="${f2(luz[1])}" r="0.7"/>` + Ln(faceY(BOMBA.y1, rect(BOMBA.x0 + 0.5, BOMBA.x1 - 0.5, BOMBA.z0 + 0.6, BOMBA.z1 - 1.8)), { tone: "faint" });
    box("bomba", [BOMBA.x0, BOMBA.y0, BOMBA.z0], [BOMBA.x1, BOMBA.y1, BOMBA.z1], { tone: "hi" }, { r: 0.4, steps: 2, bevel: 0.2, extra, sombra: "recibe", ...EN_BOMBA });
    pipe("bomba.casa", [[-6.7, BOMBA.eje[0], BOMBA.z1], [-6.7, BOMBA.eje[0], 5.4], [-6.7, WALLS.y + WALLS.d, 5.4]], 0.6, { agua: true, flowOf: () => "agua", attrsOf: () => EN_BOMBA.attrs, bend: 1.6 });
  }
  // presurizado: 40 gal (16" × 47") con las cisternas grandes; 6 gal (11" × 16") con la torre
  cyl("pres.base", PRES.x, PRES.y, 1.3, 0, 1, { tone: "lo" }, { steps: 20, sombra: "recibe", ...EN_BOMBA });
  for (const [gal, d, alto] of [[40, 16, 47], [6, 11, 16]]) {
    const r = (d / 2) * PULG;
    const h = alto * PULG;
    const { on, attrs } = parte(p.id, `pres${gal}`);
    const PF = G.frameOf([PRES.x, PRES.y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    const top = 1 + h;
    const capa = (fill) => sombraCilindro(`pres${gal}`, PRES.x, PRES.y, r, 1, top, fill, { sombra: "recibe", on, lados: 20 });
    turned(`pres${gal}`, PF, [[1, r - 0.4], [1.5, r], [top - 0.9, r], [top - 0.25, r - 0.7, 1], [top, r - 1.3, 1]], { tone: "hi" }, { owner: "presurizado", attrs, capa });
    pipe(`pres${gal}.bomba`, [[PRES.x + r, PRES.y, 2], [-12.4, PRES.y, 2]], 0.5, { touch: [gal === 6 ? "pres40" : "pres6"], attrsOf: () => attrs });
  }
  // de la cisterna del patio a la bomba
  for (const c of p.modelos.filter((c) => !c.techo)) {
    const { lugar, r } = medidasCisterna(c);
    const dx = -6.7 - lugar.x;
    const dy = BOMBA.y1 - lugar.y;
    const L = Math.hypot(dx, dy);
    // sale derecho de la pared (en la dirección del centro hacia la bomba) y después dobla hacia ella
    const u = [dx / L, dy / L];
    const ini = [lugar.x + r * u[0], lugar.y + r * u[1], 2.4];
    const fuera = [ini[0] + 2.4 * u[0], ini[1] + 2.4 * u[1], 2.4];
    pipe(`cis${c.id}.bomba`, [ini, fuera, [-6.7, 46, 2.4], [-6.7, BOMBA.y1, 2.4]], 0.6, { touch: [otraCisterna(c)], agua: true, flowOf: () => "agua", attrsOf: () => parte(p.id, c.id).attrs, bend: 2 });
  }
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
  // de la T al inversor: cruza el techo, baja por el borde de la losa y corre por la fachada
  const points = [[TEE.x, TEE.y + RIM, TEE.z], [TEE.x, DC_Y, TEE.z], [TEE.x, DC_Y, DC_Z], [-17, DC_Y, DC_Z], [-17, DC_Y, INV.z1]];
  const probe = G.fillet(points, 3.12, 10, { P, tube: 1.2 });
  const straps = [2, -9].map((x) => arcWhere(probe, (p) => p[2] < DC_Z + 0.01 && p[0] <= x));
  const route = pipe("dc", points, 1.2, { channel: "pv", gaps: straps.map((s) => [s - 0.6, s + 0.6]) });
  [2, -9].forEach((x, i) => strap(`dc.strap${i}`, route, straps[i], "dc", 1.2, [[x - 0.6, SE[1], DC_Z - 0.8], [x + 0.6, DC_Y - 1.65 + 0.05, DC_Z + 0.8]]));
}
const BAT1X = (BATS[0].x0 + BATS[0].x1) / 2;
pipe("bat", [[INV.x1, 27.3, 26], [BAT1X, 27.3, 26], [BAT1X, 27.3, BATS[0].z1]], 1.2, { channel: "bat", attrsOf: () => ` data-bat="1"` });
for (let k = 0; k < 3; k++) pipe(`bat.l${k + 1}`, [[BATS[k].x1, 27.3, 7], [BATS[k + 1].x0, 27.3, 7]], 0.8, { channel: `bat.l${k + 1}`, attrsOf: () => ` data-bat="${k + 2}"` });
pipe("ac", [[INV.x0, 27.4, 24], [MAIN.x1, 27.4, 24]], 1.2, { channel: "ac" });
pipe("casa", [[-38.5, 26.6, MAIN.z1], [-38.5, 26.6, LB.z0]], 1.2, { channel: "casa" });
pipe("red", [[-41, 27.4, MAIN.z0], [-41, 27.4, 5.5], [-55, 27.4, 5.5], [-55, 27.4, SOCKET.z0]], 1.2, { channel: "red" });
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
// Las partes de un producto del plano que ningún modelo pone juntas (las cisternas del techo, las del patio, los
// tanques del calentador) nunca se ven a la vez: no se ordenan entre ellas, y sus piezas comparten dueño para que
// la auditoría no las cuente como metidas una en otra. Lo que ocupa lugares de placas (el calentador) tampoco se
// ordena con las placas de esos lugares, que nunca se ven con él.
const parteDe = (it) => /data-p="([^":]+):([^"]+)"/.exec(it.attrs ?? "");
const lugarDe = (it) => +(/data-slot="(\d+)"/.exec(it.attrs ?? "")?.[1] ?? -1);
const LUGARES_DE = Object.fromEntries(PRODUCTOS.filter((p) => p.lugares).map((p) => [p.id, new Set(Array.from({ length: p.lugares }, (_, i) => ROWS * COLS - 1 - i))]));
const ocupaLugarDe = (it, otro) => LUGARES_DE[parteDe(it)?.[1]]?.has(lugarDe(otro)) ?? false;
const excluyentes = (a, b) => {
  const pa = parteDe(a);
  const pb = parteDe(b);
  if (pa && pb && pa[1] === pb[1] && pa[2] !== pb[2] && nuncaJuntas(pa[1], pa[2], pb[2])) return true;
  return ocupaLugarDe(a, b) || ocupaLugarDe(b, a);
};
A.settle(R, P, { skip: (a, b) => A.sameRun(a, b) || excluyentes(a, b) });
R.items.sort((a, b) => a.key - b.key);
const groups = R.items.map((item) => `<g class="it" data-name="${item.name}"${item.attrs ?? ""}>${item.svg}</g>`);

// ---------- cielo: el sol y la luna dan la vuelta por fuera de la maqueta ----------
// Cada uno va en la dirección de pantalla de su dirección real, la de donde viene su luz, justo afuera del
// contorno de la maqueta: nunca pasa por detrás de la casa y las sombras caen siempre del lado contrario
// (de mañana sale por el lado de atrás, a mediodía va arriba y de tarde baja por el frente). El contorno es
// la envoltura convexa, en pantalla, de las puntas del dibujo. El resplandor va detrás de la maqueta y el
// disco, con su textura, delante.
function envoltura(puntos) {
  const q = puntos.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const giro = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const cadena = (lista) => {
    const out = [];
    for (const p of lista) {
      while (out.length >= 2 && giro(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...cadena(q), ...cadena(q.slice().reverse())];
}
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
const CIELO = {
  contorno: envoltura(PUNTAS.map(at)).map(p3),
  centro: at([-9, -33, 30]).map(r2),
  margen: 9,
  sol: 14,
  luna: 13,
  w: W,
  h: H,
};
// Textura del sol: granos repartidos como las semillas de un girasol (ángulo de oro), unos claros y otros
// oscuros, dos manchas, el borde más oscuro (por el gradiente) y una corona de rayos que gira despacio.
const circulos = (lista) => lista.map(([x, y, r]) => `M${f2(x - r)} ${f2(y)}a${f2(r)} ${f2(r)} 0 1 0 ${f2(2 * r)} 0a${f2(r)} ${f2(r)} 0 1 0 ${f2(-2 * r)} 0`).join("");
const SOL_GRANOS = Array.from({ length: 52 }, (_, i) => {
  const r = CIELO.sol * 0.88 * Math.sqrt((i + 0.5) / 52);
  const a = i * 2.39996;
  return [r * Math.cos(a), r * Math.sin(a), i % 4 === 0 ? 1.05 : 0.7, i % 3 === 0];
});
const SOL_RAYOS = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * 2 * Math.PI;
  const largo = CIELO.sol * (i % 2 ? 1.38 : 1.62);
  const p = (r, da) => `${f2(r * Math.cos(a + da))} ${f2(r * Math.sin(a + da))}`;
  return `M${p(CIELO.sol * 1.04, -0.13)}L${p(largo, 0)}L${p(CIELO.sol * 1.04, 0.13)}Z`;
}).join("");
// Textura de la luna llena como se ve desde Puerto Rico: los mares (manchas oscuras, cada uno hecho de
// elipses que se juntan), los cráteres claros con su borde y los rayos de Tycho. Medidas en radios de luna.
const elipse = (cx, cy, rx, ry, giro = 0) => {
  const R = CIELO.luna;
  const c = Math.cos((giro * Math.PI) / 180);
  const s = Math.sin((giro * Math.PI) / 180);
  const a = [R * (cx - rx * c), R * (cy - rx * s)];
  const b = [R * (cx + rx * c), R * (cy + rx * s)];
  return `M${f2(a[0])} ${f2(a[1])}A${f2(R * rx)} ${f2(R * ry)} ${giro} 1 0 ${f2(b[0])} ${f2(b[1])}A${f2(R * rx)} ${f2(R * ry)} ${giro} 1 0 ${f2(a[0])} ${f2(a[1])}Z`;
};
const LUNA_MARES = [
  [0.7, -0.27, 0.16, 0.12, 0], // Crisium
  [0.53, 0.14, 0.15, 0.2, 20], // Fecunditatis
  [0.33, -0.04, 0.21, 0.16, -15], // Tranquillitatis
  [0.2, -0.38, 0.17, 0.15, 0], // Serenitatis
  [-0.24, -0.43, 0.29, 0.22, -10], // Imbrium
  [-0.58, -0.08, 0.24, 0.42, 8], // Procellarum
  [-0.4, 0.16, 0.2, 0.18, 0],
  [-0.14, 0.33, 0.18, 0.13, 10], // Nubium
  [-0.43, 0.36, 0.1, 0.09, 0], // Humorum
  [0.41, 0.33, 0.09, 0.08, 0], // Nectaris
  [0.02, -0.19, 0.08, 0.06, 0], // Vaporum
  [-0.12, -0.72, 0.36, 0.07, 4], // Frigoris
].map((m) => elipse(...m)).join("");
const LUNA_CRATERES = [
  [-0.12, 0.66, 0.06], // Tycho
  [-0.3, -0.13, 0.055], // Copérnico
  [-0.52, -0.12, 0.035], // Kepler
  [-0.69, -0.35, 0.03], // Aristarco
  [0.62, 0.52, 0.05],
  [0.15, 0.78, 0.045],
  [0.75, 0.15, 0.035],
].map(([x, y, r]) => [x * CIELO.luna, y * CIELO.luna, r * CIELO.luna]);
const LUNA_RAYOS = [-80, -35, 10, 55, 100, 150, 200, 250].map((g) => {
  const a = (g * Math.PI) / 180;
  const [tx, ty] = LUNA_CRATERES[0];
  const largo = CIELO.luna * (g % 2 ? 0.4 : 0.62);
  return `M${f2(tx + Math.cos(a) * 1.2)} ${f2(ty + Math.sin(a) * 1.2)}L${f2(tx + Math.cos(a) * largo)} ${f2(ty + Math.sin(a) * largo)}`;
}).join("");
const cieloFondo =
  `<g class="sr-cielo-fondo" aria-hidden="true">` +
  `<g data-sol-halo opacity="0"><circle class="sr-sol-halo" data-halo r="${CIELO.sol * 2.8}"/></g>` +
  `<g data-luna-halo opacity="0"><circle class="sr-luna-halo" r="${CIELO.luna * 2.5}"/></g>` +
  `</g>`;
const cielo =
  `<g class="sr-cielo" aria-hidden="true">` +
  `<g class="sr-sol" data-sol opacity="0">` +
  `<g data-part="rayos"><path class="sr-sol-rayos" d="${SOL_RAYOS}"/></g>` +
  `<circle class="sr-sol-disco" r="${CIELO.sol}"/>` +
  `<path class="sr-sol-grano" d="${circulos(SOL_GRANOS.filter((g) => !g[3]))}"/>` +
  `<path class="sr-sol-grano sr-sol-grano-b" d="${circulos(SOL_GRANOS.filter((g) => g[3]))}"/>` +
  `<path class="sr-sol-mancha" d="${circulos([[-4.6, 3.2, 1.25], [-2.9, 4.1, 0.75], [5.2, -2.4, 0.9]])}"/>` +
  `</g>` +
  `<g class="sr-luna" data-luna opacity="0">` +
  `<circle class="sr-luna-disco" r="${CIELO.luna}"/>` +
  `<g clip-path="url(#sr-luna-borde)"><path class="sr-luna-mar" filter="url(#sr-luna-suave)" d="${LUNA_MARES}"/><path class="sr-luna-rayo" d="${LUNA_RAYOS}"/></g>` +
  `<path class="sr-luna-crater" d="${circulos(LUNA_CRATERES)}"/>` +
  `<path class="sr-luna-brillo" d="${circulos(LUNA_CRATERES.map(([x, y, r]) => [x - r * 0.25, y - r * 0.25, r * 0.55]))}"/>` +
  `</g>` +
  `</g>`;
const defs =
  `<defs>${CLIPS.join("")}` +
  `<clipPath id="sr-luna-borde"><circle r="${CIELO.luna}"/></clipPath>` +
  `<filter id="sr-luna-suave" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".45"/></filter>` +
  `<radialGradient id="sr-sol-halo"><stop class="sr-halo-0" offset="0"/><stop class="sr-halo-1" offset=".42"/><stop class="sr-halo-2" offset="1"/></radialGradient>` +
  `<radialGradient id="sr-sol-cara"><stop class="sr-sol-0" offset="0"/><stop class="sr-sol-1" offset=".55"/><stop class="sr-sol-2" offset=".86"/><stop class="sr-sol-3" offset="1"/></radialGradient>` +
  `<radialGradient id="sr-luna-cara"><stop class="sr-luna-0" offset="0"/><stop class="sr-luna-1" offset=".7"/><stop class="sr-luna-2" offset="1"/></radialGradient>` +
  `<radialGradient id="sr-luna-halo"><stop class="sr-lhalo-0" offset="0"/><stop class="sr-lhalo-1" offset=".5"/><stop class="sr-lhalo-2" offset="1"/></radialGradient></defs>`;

const SUG = sugerencia(EJEMPLO.meses, EJEMPLO.existentes);
const DATA = { P, start: START, flows: FLOWS, leds: LEDS, cols: COLS, slots: ROWS * COLS, vatios: BASE.vatios, ejemplo: EJEMPLO, limites: LIMITES, sombra: SOMBRA, brujula: BRUJULA, cielo: CIELO, rumbo: 180 };
DATA.agua = { personas: 4 };
DATA.medidas = MEDIDAS;
Object.assign(DATA.flows, {
  dc: "pv",
  "trunk-a": "row3",
  "trunk-b": "row23",
  "trunk-c": "row123",
  "trunk-s": "row0",
  bat: "bat",
  "bat.l1": "batl1",
  "bat.l2": "batl2",
  "bat.l3": "batl3",
  ac: "ac",
  casa: "casa",
  red: "red",
  mast: "red",
  drop: "red",
  agua: "agua",
  caliente: "caliente",
  fria: "caliente",
});

const LABEL_TEXT =
  "Maqueta de una casa de techo plano en Puerto Rico con el sistema Solar y Roofing de Windmar Home: el techo sellado con silicona (imprimador y capa blanca, cortados en escalones en una esquina), placas en filas sobre patas selladas con una caja por fila y un conducto que las recoge, una unidad de aire en el techo, el inversor, de cero a cuatro baterías con su columna de luces, el panel de breakers, el medidor de LUMA con su mástil y la acometida al poste. Con la pestaña Agua se ponen un calentador solar al fondo del techo, en el lugar de las últimas placas, y una cisterna en el techo o en el patio, con su bomba y su presurizado junto a la pared. En la base, una brújula cuya tarjeta gira con el rumbo de las placas. Los trazos naranja corren por los conductos en el sentido en que va la energía; el sol y la luna dan la vuelta por fuera de la maqueta, del lado de donde viene su luz, la luz pasa del día a la noche y cada pieza echa la sombra de ese momento, del lado contrario.";
const svg = k.figureSvg({ width: W, height: H, label: LABEL_TEXT, body: [defs, cieloFondo, ...back, `<g class="sr-scene">${groups.join("")}</g>`, cielo] });

const CSS = readFileSync(join(HERE, "page.css"), "utf8");
const intro = `<header class="sr-head"><div><p class="sr-kicker">Windmar Home · Puerto Rico</p><h1>Cómo funciona un sistema Solar y Roofing</h1></div><button type="button" class="sr-btn sr-theme" data-theme-toggle aria-pressed="false">Tema oscuro</button></header>`;
const about = `<p>Corre el día con el reproductor, o salta de hora con las escenas, y mira a dónde va la energía: a la casa, a la batería o a LUMA. Escribe el consumo de cada mes, suma o quita placas y baterías, y compara con lo que sugiere el cotizador. Cambia hacia dónde miran las placas: la brújula gira, las sombras se mueven y la ficha dice cuánto sol les llega, con las mismas medidas que Aurora (TOF, acceso solar y TSRF). En la pestaña Agua escoge cuántas personas viven en la casa, el calentador solar y la cisterna: el calentador ocupa lugares de placas al fondo del techo, el agua corre por los tubos con el uso de cada hora, el tanque se calienta con el sol y la ficha dice cuánta luz ahorra y para cuántos días alcanza la cisterna si la AAA corta el servicio.</p>`;
const stepper = (key, label) =>
  `<span class="sr-step" data-stepper="${key}"><button type="button" class="sr-btn sr-pm" data-d="-1" aria-label="Quitar ${label}">−</button><output data-v="${key}">0</output><button type="button" class="sr-btn sr-pm" data-d="1" aria-label="Sumar ${label}">+</button></span>`;
const monthOptions = MESES.map((m, i) => `<option value="${i}"${i === EJEMPLO.mes ? " selected" : ""}>${m[0].toUpperCase() + m.slice(1)}</option>`).join("");
// Botones de una sola escogida (calentador y cisterna): el primero es "Sin".
const opciones = (key, label, lista) =>
  `<div class="sr-opciones" role="radiogroup" aria-label="${label}" data-opciones="${key}">` +
  [["sin", "Sin", `Sin ${label.toLowerCase()}`], ...lista].map(([id, corto, largo], i) => `<button type="button" class="sr-btn sr-opcion" role="radio" aria-checked="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-opcion="${id}" aria-label="${largo}">${corto}</button>`).join("") +
  `</div>`;
// La sección de un producto del plano (productos.mjs): su título, un botón por modelo (y "Sin"), su nota y su
// interruptor, si tiene.
const seccionDe = (p) =>
  `<section class="sr-group" aria-label="${p.grupo}">
    <p class="sr-tag">${p.titulo}</p>
    ${opciones(p.id, p.nombre[0].toUpperCase() + p.nombre.slice(1), p.modelos.map((m) => [m.id, m.corto, p.etiqueta(m)]))}
    <p class="sr-nota" data-nota="${p.id}"></p>${p.interruptor ? `
    <div class="sr-row"><button type="button" class="sr-switch" role="switch" aria-checked="false" data-${p.interruptor.id}><span class="sr-switch-pista" aria-hidden="true"></span>${p.interruptor.texto}</button></div>` : ""}
  </section>`;
// Panel de controles: en pantalla ancha va a la derecha de la figura. Dos pestañas sutiles arriba, en el
// lugar del título del primer grupo para no sumar alto: Energía (placas y baterías primero) y Agua (las
// personas de la casa, el calentador solar y la cisterna).
const controls = `
<div class="sr-controls">
  <div class="sr-tabs" role="tablist" aria-label="Qué mirar">
    <button type="button" class="sr-tab" role="tab" id="sr-tab-energia" aria-controls="sr-panel-energia" aria-selected="true" data-tab="energia">Energía</button>
    <button type="button" class="sr-tab" role="tab" id="sr-tab-agua" aria-controls="sr-panel-agua" aria-selected="false" tabindex="-1" data-tab="agua">Agua</button>
  </div>
  <div class="sr-panel" id="sr-panel-energia" role="tabpanel" aria-labelledby="sr-tab-energia" data-panel="energia">
  <section class="sr-group" aria-label="Placas y baterías">
    <div class="sr-system">
      <span class="sr-lab">Placas nuevas de ${BASE.vatios} W</span>${stepper("nuevas", "una placa nueva")}
      <span class="sr-lab">Placas que ya tenía</span><span class="sr-inline">${stepper("existentes", "una placa que ya tenía")}<label>de <input class="sr-input sr-w" type="number" data-vatios min="${LIMITES.vatios[0]}" max="${LIMITES.vatios[1]}" step="5" inputmode="numeric" value="${EJEMPLO.existentes.w}" aria-label="Vatios de cada placa que ya tenía"> W</label></span>
      <span class="sr-lab">Powerwall de ${BASE.bateria} kWh</span>${stepper("baterias", "una batería")}
    </div>
    <div class="sr-row sr-rumbo-row"><span class="sr-lab" id="sr-rumbo-lab">Miran al</span><div class="sr-rumbos" role="radiogroup" aria-labelledby="sr-rumbo-lab" aria-describedby="sr-rumbo-v"><span class="sr-sr" id="sr-rumbo-v" data-rumbo-v></span>${SOL.rumbos.map((r) => `<button type="button" class="sr-btn sr-rumbo" role="radio" aria-checked="${r.az === 180}" tabindex="${r.az === 180 ? 0 : -1}" data-rumbo="${r.az}" aria-label="${r.nombre}, ${r.az} grados" title="${r.nombre}">${r.corto}</button>`).join("")}</div></div>
    <div class="sr-row"><button type="button" class="sr-btn" data-reset>Volver a lo sugerido</button><p class="sr-warn" data-warn></p></div>
  </section>${PRODUCTOS.filter((p) => p.pestaña === "energia").map((p) => `\n  ${seccionDe(p)}`).join("")}
  <section class="sr-group" aria-label="Escenas del día">
    <p class="sr-tag">Hora del día</p>
    <div class="sr-row">
      <button type="button" class="sr-btn" data-scene="5">Madrugada</button>
      <button type="button" class="sr-btn" data-scene="10">Mañana</button>
      <button type="button" class="sr-btn" data-scene="15">Tarde</button>
      <button type="button" class="sr-btn" data-scene="21">Noche</button>
    </div>
    <p class="sr-now" data-now></p>
  </section>
  <section class="sr-group" aria-label="Consumo del cliente por mes">
    <p class="sr-tag">Consumo del cliente</p>
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
    <div class="sr-system"><span class="sr-lab">Personas en la casa</span>${stepper("personas", "una persona")}</div>
    <p class="sr-nota" data-agua="uso"></p>
  </section>
  ${PRODUCTOS.filter((p) => p.pestaña === "agua").map(seccionDe).join("\n  ")}
  <section class="sr-group" aria-label="El agua en este momento">
    <p class="sr-tag">En este momento</p>
    <dl class="sr-agua-ficha">
      <div><dt>Agua caliente</dt><dd data-agua="temp"></dd></div>
      <div><dt>Cisterna</dt><dd data-agua="nivel"></dd></div>
      <div><dt>Ahorro de luz</dt><dd data-agua="ahorro"></dd></div>
      <div><dt>Techo</dt><dd data-agua="techo"></dd></div>
    </dl>
  </section>
  </div>
</div>`;
// Ficha del sistema: una franja de datos arriba de la tarjeta, para que la casa use todo el alto.
const ficha = `<div class="sr-kpis" role="group" aria-label="Ficha del sistema"><div class="sr-kpi"><span class="sr-kpi-l">Placas</span><span class="sr-kpi-v" data-f="kw"></span><span class="sr-kpi-s" data-f="placas"></span></div><div class="sr-kpi"><span class="sr-kpi-l">Producción</span><span class="sr-kpi-v" data-f="prod"></span><span class="sr-kpi-s" data-f="dia"></span></div><div class="sr-kpi"><span class="sr-kpi-l">Rumbo</span><span class="sr-kpi-v" data-f="rumbo"></span><span class="sr-kpi-s" data-f="inclin"></span></div><div class="sr-kpi"><span class="sr-kpi-l">TSRF (Aurora)</span><span class="sr-kpi-v"><span data-f="tsrf"></span><span class="sr-kpi-d" data-f="tanque" title="Lo que baja el TSRF por la sombra de lo que hay de agua en el techo" hidden><span data-f="menos"></span><span class="sr-kpi-dl" data-f="porque"></span></span></span><span class="sr-kpi-s" data-f="tof"></span></div><div class="sr-kpi"><span class="sr-kpi-l">Baterías</span><span class="sr-kpi-v" data-f="bat"></span><span class="sr-kpi-s" data-f="respaldo"></span></div><div class="sr-kpi"><span class="sr-kpi-l" data-f="mesNombre"></span><span class="sr-kpi-v" data-f="mes"></span><span class="sr-kpi-s" data-f="mesUsa"></span></div><div class="sr-kpi"><span class="sr-kpi-l">En el año</span><span class="sr-kpi-v" data-f="anio"></span><span class="sr-kpi-s" data-f="anioUsa"></span></div><div class="sr-kpi"><span class="sr-kpi-l">Cotizador</span><span class="sr-kpi-v" data-f="sug"></span><span class="sr-kpi-s" data-f="nota"></span></div></div>`;
// Reproductor del día, como uno de música: play/pausa, la hora y lo que pasa en ese momento,
// la barra de 24 horas (la franja clara es el sol, de 6:25 a 18:25) y la velocidad.
const icon = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
const pct = (h) => `${((h / 24) * 100).toFixed(2)}%`;
const player = `<div class="sr-player" role="group" aria-label="Reproductor del día">` +
  `<button type="button" class="sr-play" data-play aria-label="Pausar el día" aria-pressed="true"><span class="sr-i-pause">${icon("M7 5h3.5v14H7zM13.5 5H17v14h-3.5z")}</span><span class="sr-i-play">${icon("M8 5.5v13l11-6.5z")}</span></button>` +
  `<span class="sr-np"><span class="sr-clock" data-clock>12:30</span><span class="sr-readout" data-readout aria-hidden="true"></span></span>` +
  `<input class="sr-scrub" type="range" data-scrub min="0" max="24" step="0.05" value="${START}" aria-label="Hora del día" style="--sr-sale:${pct(SALIDA)};--sr-pone:${pct(PUESTA)}">` +
  `<span class="sr-speeds" role="group" aria-label="Velocidad del día">` +
  [["Normal", 0.25], ["Rápido", 1], ["Súper rápido", 3]].map(([label, rate], i) => `<button type="button" class="sr-speed" data-speed="${rate}" aria-pressed="${i === 0}">${label}</button>`).join("") +
  `</span></div>`;

const caption =
  `Maqueta de una casa de techo plano en Puerto Rico con el sistema Solar y Roofing de Windmar Home. El techo lleva el sellado de silicona Gardner de los Planes de Sellado: imprimador Elasto Prime y una capa continua de silicona blanca, sin uniones. En la esquina se ven el concreto con una grieta reparada, el imprimador y la capa; cada pata de la estructura, el tubo de ventilación, la bota del aire y la unidad de aire van sobre sellos de Roof Patch. ` +
  `El consumo de los 12 meses arma el sistema con la regla del cotizador de LUMA de Sun Bot, la misma que usa con clientes que ya tienen placas: la meta es el mayor entre 110 % del promedio y el mes pico; con ${BASE.horasSol} horas de sol pico todo el año y ${BASE.rendimiento} de rendimiento, cada placa da sus vatios × ${BASE.horasSol} × ${BASE.rendimiento} ÷ 1000 kWh al día (${kwhPorPlacaDia(BASE.vatios).toFixed(2)} una QCells de ${BASE.vatios} W); a los kW que hacen falta se les restan los de las placas que ya tiene y el resto se cubre con placas de ${BASE.vatios} W. Los Powerwall de ${BASE.bateria} kWh cubren la mitad del consumo diario, al menos uno, y con batería el cotizador pide al menos ${BASE.placasConBateria} placas; el respaldo de noche es la fórmula de la herramienta Enseres (baterías × ${BASE.bateria} ÷ consumo diario × 24 horas). Con la factura de ejemplo (promedio 600 kWh, pico 700 en agosto) salen ${SUG.nuevas} placas nuevas y ${SUG.baterias} Powerwall. ` +
  `De madrugada la batería llega a su reserva y entra LUMA; en la mañana las placas cubren la casa y cargan la batería; ya llena, el sobrante sale a LUMA por el medidor bidireccional; de noche la batería alimenta la casa. El ventilador del aire gira más rápido cuanto más consume la casa. ` +
  `La brújula de la base gira con el rumbo de las placas y su marca fija señala hacia dónde miran. El rumbo cambia lo que dan las placas según PVWatts v8 de NREL para San Juan a ${SOL.inclinacion}° de inclinación: al sur, ${fmtN(rumboDe(180).kwh)} kWh por kW al año; al este, ${pctN(factorRumbo(90))} de eso; al oeste, ${pctN(factorRumbo(270))}; al norte, ${pctN(factorRumbo(0))}. Con el sur, la figura da lo mismo que el cotizador. ` +
  `Las sombras salen del sol de cada momento y de las piezas del dibujo: el aire, el tubo de ventilación, el mástil, el poste, las mismas filas de placas y lo que se ponga de agua en el techo. La Hércules 600 va en la franja oeste del techo, al lado de las placas: con las placas al sur su sombra les cae de tarde a las del extremo oeste, y al norte, de mañana. Como a esas horas el sol ya está bajo, en el año les quita poco: la placa más cercana pierde de 3 a 4 % de su sol y el sistema, unas décimas, que la ficha muestra al lado del TSRF. Como en Aurora, el acceso solar es la parte del sol del año (directo y difuso, del año típico de PVGIS) que les llega a las placas con esas sombras; el TOF es el sol que recibe su plano frente al mejor plano de San Juan (sur a unos 17°, ${pctN(tofDe(180))} para el sur a ${SOL.inclinacion}°), y el TSRF es TOF × acceso solar. La producción de la ficha y de la gráfica es la del cotizador por el rumbo y por el acceso solar, y en el día la producción sigue al sol directo y difuso de marzo y septiembre (PVGIS) sobre el plano de las placas, menos lo que tapan las sombras. ` +
  `La pestaña Agua pone los equipos de Windmar Water con los datos del cotizador Water de Sun Bot y su PDF maestro. El calentador solar Soltek va al fondo del techo, en el lugar de las últimas placas (el 80/1 y el 80/2 ocupan dos lugares, el 120/3 tres y el 120/4 cuatro): colectores de 34" × 76" con 7 tubos de cobre inclinados 18°, y el tanque acostado de 82 o 119 galones con su resistencia de 4,500 W de respaldo; el cotizador lo sugiere por personas (1 a 2, 80/1; 3 a 4, 80/2; 5 a 6, 120/3; 7 o más, 120/4). Las cisternas Eco 150 (torre, 25" × 72") y Hércules 600 (56" × 61") van en el techo; la Eco 500 (74" × 32") y la Eco 1,000 (sin medidas en el PDF: se dibuja de 64" × 76") van en el patio; todas con su bomba (½ HP con la 150, ¾ HP con las otras) y su presurizado (6 o 40 galones) junto a la pared. Las cisternas y el tanque del calentador llevan el logo de Windmar. Supuestos del agua: ${AGUA.porPersona} galones al día por persona, ${AGUA.calientePorPersona} de ellos de agua caliente a ${AGUA.uso} °F, el agua que llega a ${AGUA.fria} °F, colectores que le pasan al agua la mitad del sol que reciben, el tanque que pierde un poco de calor por hora y deja de calentar a ${AGUA.maximo} °F, y la AAA que llena la cisterna mientras da servicio. El ahorro de luz compara con calentar la misma agua con una resistencia eléctrica. ` +
  `Supuestos del dibujo: el reparto del consumo por hora, la reserva del 20 %, la batería sin pérdidas, el sol del equinoccio (sale 6:25, se pone 18:25) con la luna llena de esa noche y el mes de 30 días del cotizador. El sol y la luna se dibujan por fuera de la maqueta, en la dirección de donde viene su luz vista desde esta cámara: nunca pasan por detrás de la casa y las sombras caen del lado contrario; si no caben dentro del dibujo, asoman por el borde. Las placas que ya tenía se dibujan del mismo tamaño que las nuevas. El techo mide unos 1,250 pies², el promedio del cotizador, y le caben hasta ${ROWS * COLS} placas; el inversor se dibuja más grande que en la realidad para que se lea, y el Powerwall 3 lo trae integrado aunque aquí va aparte. No muestra dinero.`;

const plate = k
  .plateHtml({
    fig: "Fig 1",
    title: "Solar y Roofing",
    hint: "",
    readout: "",
    keys: [
      { mark: "dashed", label: "Energía: corre en el sentido del flujo, más rápido con más kW" },
      { mark: "raised", label: "Capas del techo en la esquina: concreto, imprimador, silicona" },
      { mark: "dim", label: "Placas que ya tenía el cliente: vidrio claro" },
    ],
    caption,
    body: `<div class="iso-stage sr-stage" tabindex="0" role="slider" aria-label="Sistema Solar y Roofing. Usa las flechas para cambiar la hora del día y la barra espaciadora para pausar." aria-valuemin="0" aria-valuemax="24" aria-valuenow="${START}">${svg}<span class="sr-sr" role="status" aria-live="polite" data-status></span></div>${player}`,
  })
  .replace('data-mark="dashed"', 'data-mark="dashed" data-energy')
  // la lectura en vivo va dentro del reproductor, no en la esquina
  .replace('<span class="iso-plate-corner" data-corner="readout" data-readout></span>', "")
  .replace('<div class="iso-stage', `${ficha}<div class="iso-stage`);
if (plate.includes('data-corner="readout"')) throw new Error("readout corner still in the plate");
// La leyenda y el pie van plegados debajo de las dos columnas: solo ocupan lugar si se abren.
const legendAt = plate.indexOf('<figcaption class="iso-legend">');
const legendEnd = plate.indexOf("</figcaption>", legendAt) + "</figcaption>".length;
const legendBody = plate.slice(legendAt, legendEnd).replace('<figcaption class="iso-legend">', '<div class="iso-legend sr-notes">').replace(/<\/figcaption>$/, "</div>");
const legend = `<details class="sr-more"><summary>Cómo leer la figura y de dónde salen los números</summary>${about}${legendBody}</details>`;
// En pantalla ancha el título, los controles y "Más información" van en la columna derecha,
// y la tarjeta con la casa ocupa todo el alto de la ventana a la izquierda.
const layout = `<div class="sr-layout">${intro}<div class="sr-main">${plate.slice(0, legendAt) + plate.slice(legendEnd)}</div><aside class="sr-side" aria-label="Controles">${controls}${legend}</aside></div>`;

const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^export /gm, "");
const notice = `/* Kit de figuras isométricas Anatomy (github.com/wheresryan22/anatomy), licencia MIT, © 2026 Ryan. Ver vendor/anatomy/LICENSE. */\n`;
const LIVE = strip("live.js").replace("__DATA__", JSON.stringify(DATA));
const page = k
  .pageHtml({ title: "Solar y Roofing · Windmar Home", theme: "light", body: `<style>${CSS}</style>${layout}`, script: notice + kitScript() + strip("model.mjs") + strip("sol.mjs") + strip("agua.mjs") + strip("productos.mjs") + LIVE, width: 760 })
  .replace('<html lang="en">', '<html lang="es">')
  .replace("<head>", `<head><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap"><meta name="description" content="Figura interactiva: cómo funciona un sistema Solar y Roofing de Windmar Home en Puerto Rico.">`);
mkdirSync(join(ROOT, "public"), { recursive: true });
writeFileSync(join(ROOT, "public", "index.html"), page);
console.log("wrote public/index.html", `${(page.length / 1024).toFixed(0)} KB`, `${R.items.length} items`, `${R.solids.length} solids`, `${R.routes.length} routes`, `scale ${KS.toFixed(3)}`);

A.auditOrExit(R, P, {});
