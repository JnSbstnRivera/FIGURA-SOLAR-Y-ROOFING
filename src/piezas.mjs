// Piezas de los productos del plano que se dibujan igual en las dos escenas: el cuerpo de una cisterna con su logo y
// su mirilla, la bomba, el presurizado, la estación Anker con sus luces, sus baterías de expansión (la BP2600 y la
// BP3800), el transfer switch, una placa PS400 con sus patas y la nevera EverFrost. Cada escena (build.mjs, la casa; apartamento.mjs) las pone donde van, con su taller
// (taller.mjs), y les da sus partes del plano (`en`: el `on` de su sombra y el atributo con que la página las prende y
// las apaga). Las que miran a la cámara tienen su frente hacia +y, como la fachada oeste de la casa y la pared este
// del apartamento.
import * as k from "../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../vendor/anatomy/kit/lathe.mjs";
import { LOGO } from "./logo.mjs";

// una pulgada, en las unidades del dibujo (unas 10.5 por metro)
export const PULG = 0.0254 * 10.5;
// Cada PS400 abierta mide 102" × 36" (ficha de Anker); se dibuja inclinada 40° sobre sus patas.
export const PS400_MEDIDAS = { largo: 102 * PULG, ancho: 35.9 * PULG, inclina: (40 * Math.PI) / 180, grueso: 0.3 };
// La PS200 abierta mide 2,130 × 602 mm (ficha de Anker): más chica, en el mismo lugar y con la misma inclinación.
export const PS200_MEDIDAS = { largo: (2130 / 1000) * 10.5, ancho: (602 / 1000) * 10.5, inclina: PS400_MEDIDAS.inclina, grueso: 0.25 };
// la normal del vidrio de una PS400, en las coordenadas de la escena (mira a +x)
export const normalPs400 = () => [Math.sin(PS400_MEDIDAS.inclina), 0, Math.cos(PS400_MEDIDAS.inclina)];
// presurizados: diámetro y alto en pulgadas (PDF maestro de Water)
const PRESURIZADOS = { 40: [16, 47], 6: [11, 16] };

// `mide` guarda lo que la página necesita de un modelo (la mirilla de cada cisterna).
export function piezas(t, { mide }) {
  const { P, at, f2, Ln, path3, faceY, rect, box, cyl, turned, prism, tapaSol, recibeSol, cara, carasCaja, carasAnillo, anilloRedondo, sombraCilindro, p3, logoEnCilindro } = t;
  // hacia dónde mira la cámara en el suelo: ahí van el logo y la mirilla de cada tanque
  const MIRILLA = Math.atan2(k.towardViewer(P)[1], k.towardViewer(P)[0]);

  // El cuerpo de una cisterna parada en `lugar`, de radio `r` y alto `h`, de z0 a top: sus anillos de refuerzo, el
  // hombro redondo, la tapa de rosca arriba, el logo de Windmar al frente y la mirilla de nivel a su derecha (una
  // franja angosta donde la página dibuja el agua que tiene).
  function cuerpoCisterna({ p, c, lugar, r, h, z0, top, owner, en }) {
    const { on, attrs } = en;
    const TF = G.frameOf([lugar.x, lugar.y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    const hombroAlto = Math.min(2.6, h * 0.16);
    const hombro = top - hombroAlto;
    const adentro = Math.min(3.2, r * 0.42);
    const profile = [[z0, r], [hombro, r], [top - hombroAlto * 0.35, r - adentro * 0.25, 1], [top, r - adentro, 1]];
    const anillos = Math.max(1, Math.floor((hombro - z0) / 3.6) - 1);
    const ribs = Array.from({ length: anillos }, (_, i) => Ln(G.arcOf(TF, z0 + ((i + 1) * (hombro - z0)) / (anillos + 1), r, P), { tone: "faint" })).join("");
    // el logo, del ancho que quepa en el cuerpo
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
    cyl(`cis${c.id}.lid`, lugar.x, lugar.y, tapaR, top, top + 1, { tone: "mid" }, { steps: 24, bevel: 0.2, owner, ...en });
  }

  // La bomba: el motor acostado a lo largo de x, de `motor` a la cabeza, con sus `aletas`, y la cabeza `B` con su luz
  // al frente, que prende cuando bombea.
  function bomba({ B, motor, aletas, rMotor = 1.5, en }) {
    const MF = G.frameOf([0, B.eje[0], B.eje[1]], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    const finas = aletas.map((s) => Ln(G.arcOf(MF, s, rMotor, P), { tone: "faint" })).join("");
    const capaMotor = (fill) => recibeSol("bomba.motor", fill, carasCaja([motor, B.eje[0] - rMotor, B.z0], [B.x0, B.eje[0] + rMotor, B.eje[1] + rMotor]), { on: en.on });
    turned("bomba.motor", MF, [[motor, rMotor], [B.x0, rMotor]], { tone: "mid" }, { inner: finas, attrs: en.attrs, capa: capaMotor });
    const luz = at([(B.x0 + B.x1) / 2, B.y1, B.z1 - 1]);
    const extra = `<circle class="sr-led" data-part="bomba-led" cx="${f2(luz[0])}" cy="${f2(luz[1])}" r="0.7"/>` + Ln(faceY(B.y1, rect(B.x0 + 0.5, B.x1 - 0.5, B.z0 + 0.6, B.z1 - 1.8)), { tone: "faint" });
    box("bomba", [B.x0, B.y0, B.z0], [B.x1, B.y1, B.z1], { tone: "hi" }, { r: 0.4, steps: 2, bevel: 0.2, extra, sombra: "recibe", ...en });
  }

  // Un presurizado de `gal` galones parado sobre su base (z0 es el piso), con su domo arriba. Devuelve su radio y su
  // alto, para los tubos.
  function presurizado({ gal, x, y, z0 = 0, en }) {
    const [d, alto] = PRESURIZADOS[gal];
    const r = (d / 2) * PULG;
    const h = alto * PULG;
    const PF = G.frameOf([x, y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    const zb = z0 + 1;
    const top = zb + h;
    const capa = (fill) => sombraCilindro(`pres${gal}`, x, y, r, zb, top, fill, { sombra: "recibe", on: en.on, lados: 20 });
    turned(`pres${gal}`, PF, [[zb, r - 0.4], [zb + 0.5, r], [top - 0.9, r], [top - 0.25, r - 0.7, 1], [top, r - 1.3, 1]], { tone: "hi" }, { owner: "presurizado", attrs: en.attrs, capa });
    return { r, top };
  }

  // La estación Anker de un tamaño (`nombre`), con su punta este en x1 y su espalda en y0, sobre el piso z0: al frente,
  // su pantalla y las cinco luces de la carga.
  function estacionAnker({ nombre, m, x1, y0, z0 = 0, en }) {
    const [l, a, h] = m.medidas.map((v) => v * PULG);
    const [x0, y1] = [x1 - l, y0 + a];
    const luces = Array.from({ length: 5 }, (_, i) => {
      const xa = x1 - 2.8 + i * 0.46;
      return `<path class="sr-led" data-anker-led="${i}" d="${faceY(y1, rect(xa, xa + 0.32, z0 + h - 1.3, z0 + h - 0.9))}"/>`;
    }).join("");
    const extra = Ln(faceY(y1, rect(x0 + 0.8, x0 + 2.8, z0 + h - 1.7, z0 + h - 0.7)), { tone: "lo" }) + luces + Ln(faceY(y1, rect(x0 + 0.6, x1 - 0.6, z0 + 0.5, z0 + h - 2.3)), { tone: "faint" });
    box(`anker.${nombre}`, [x0, y0, z0], [x1, y1, z0 + h], { tone: "mid" }, { r: 0.5, steps: 3, bevel: 0.3, wrap: "sr-anker", extra, owner: "anker.estacion", ...en });
  }

  // La batería de expansión, al lado de la punta este (x) de la estación, con su franja de luz: la BP2600 de la F2600
  // (17.44" × 10.6" × 9.4") o la BP3800 de la F3800 Plus (15.5" × 14" × 10.3").
  const EXPANSION = { bp2600: [17.44, 10.6, 9.4], bp3800: [15.5, 14, 10.3] };
  function bateriaExpansion({ nombre, x, y0, z0 = 0, en }) {
    const [l, a, h] = EXPANSION[nombre].map((v) => v * PULG);
    const luz = Ln(faceY(y0 + a, rect(x + 1.1, x + l - 0.3, z0 + h - 1.1, z0 + h - 0.6)), { tone: "lo" });
    box(`anker.${nombre}`, [x + 0.4, y0, z0], [x + 0.4 + l, y0 + a, z0 + h], { tone: "mid" }, { r: 0.4, steps: 3, bevel: 0.25, wrap: "sr-anker", extra: luz, owner: "anker.bateria", ...en });
  }

  // La nevera EverFrost del modelo m (sus medidas en mm), de x0 a lo largo y de y0 a lo ancho, con su frente hacia +y:
  // el cuerpo, la tapa con su junta, la pantalla con su luz y dos ruedas a los lados, en la punta de x0.
  function nevera({ m, x0, y0, z0 = 0, en }) {
    const [l, a, h] = m.medidas.map((v) => (v / 1000) * 10.5);
    const [x1, y1] = [x0 + l, y0 + a];
    const zt = z0 + h - 1.3;
    const led = at([x1 - 1.6, y1, zt - 1]);
    const extra = Ln(faceY(y1, rect(x1 - 2.6, x1 - 0.8, zt - 1.6, zt - 0.5)), { tone: "lo" }) + `<circle class="sr-led sr-led-fija" cx="${f2(led[0])}" cy="${f2(led[1])}" r="0.22"/>`;
    box(`nevera${m.id}`, [x0, y0, z0 + 0.6], [x1, y1, zt], { tone: "mid" }, { r: 0.7, steps: 3, bevel: 0.25, wrap: "sr-anker", extra, owner: "nevera", ...en });
    box(`nevera${m.id}.tapa`, [x0, y0, zt], [x1, y1, z0 + h], { tone: "mid" }, { r: 0.7, steps: 3, bevel: 0.25, owner: "nevera", ...en });
    for (const [i, y] of [y0 - 0.4, y1 + 0.4].entries()) {
      const F = G.frameOf([x0 + 1, y, z0 + 0.9], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
      turned(`nevera${m.id}.rueda${i}`, F, [[-0.35, 0.9], [0.35, 0.9]], { tone: "lo" }, { owner: "nevera", attrs: en.attrs });
    }
  }

  // El transfer switch en la pared (`pared` es la y de la pared y `y1` su frente): el manual con su palanca, el
  // automático con su luz.
  function transferSwitch({ tipo, x0, x1, pared, y1, z0, z1, en }) {
    const xm = (x0 + x1) / 2;
    const led = at([xm + 0.8, y1, z1 - 1.0]);
    const detalle =
      tipo === "manual"
        ? Ln(faceY(y1, [[xm, z0 + 1.2], [xm, z1 - 1.6]], false), { tone: "lo", free: true }) + Ln(faceY(y1, rect(xm - 0.5, xm + 0.5, z1 - 1.6, z1 - 1.0)), { tone: "lo" })
        : `<circle class="sr-led sr-led-fija" cx="${f2(led[0])}" cy="${f2(led[1])}" r="0.35"/>` + Ln(faceY(y1, rect(x0 + 0.6, xm + 0.2, z1 - 1.8, z1 - 0.6)), { tone: "lo" });
    box(`anker.ts.${tipo}`, [x0, pared, z0], [x1, y1, z1], { tone: "hi" }, { r: 0.25, steps: 2, extra: Ln(faceY(y1, rect(x0 + 0.4, x1 - 0.4, z0 + 0.4, z1 - 0.4)), { tone: "faint" }) + detalle, owner: "anker.ts", sombra: "recibe", ...en });
  }

  // La PS400 número j (o la PS200, con sus `medidas`), inclinada hacia +x sobre dos patas atrás (hasta la cara de atrás
  // de la placa) y dos pies adelante, bajo el borde de abajo, con su vidrio oscuro en cuatro hojas: `xf` es ese borde,
  // `yc` su centro a lo largo, `z0` la altura del borde y `suelo` el piso de las patas. Tapa el sol y recibe sombra en su
  // vidrio; devuelve sus 9 puntos de muestra en esa cara, para medir cuánto sol le llega.
  function ps400({ j, xf, yc, z0, suelo = 0, en, owner, nombre = `anker.ps${j}`, medidas = PS400_MEDIDAS }) {
    const { inclina: b, largo: L, ancho: Wd, grueso } = medidas;
    const n = [Math.sin(b), 0, Math.cos(b)];
    const arriba = [-Math.cos(b), 0, Math.sin(b)];
    const o = [xf - (Wd / 2) * Math.cos(b), yc, z0 + (Wd / 2) * Math.sin(b)];
    const F = G.frameOf(o, n, [0, 1, 0], arriba);
    const pt = (u, v, s) => G.add3(G.add3(G.add3(o, G.mul3(n, s)), G.mul3([0, 1, 0], u)), G.mul3(arriba, v));
    const [hu, hv] = [L / 2, Wd / 2];
    const borde = (s) => [pt(-hu, -hv, s), pt(hu, -hv, s), pt(hu, hv, s), pt(-hu, hv, s)];
    const vidrio = path3(borde(grueso + 0.01), true);
    const hojas = [1, 2, 3].map((k) => path3([pt(-hu + (k * L) / 4, -hv, grueso + 0.01), pt(-hu + (k * L) / 4, hv, grueso + 0.01)])).join("");
    const extra = `<path class="sr-sun" data-sun-ps d="${vidrio}"/>` + Ln(vidrio, { tone: "lo" }) + Ln(hojas, { tone: "faint" });
    const solido = tapaSol(`${nombre}`, borde(0), borde(grueso), en.on);
    const capa = (fill) => recibeSol(`${nombre}`, fill, [cara(n, borde(grueso))], { on: en.on, propios: [solido] });
    prism(`${nombre}`, F, [[-hu, -hv], [hu, -hv], [hu, hv], [-hu, hv]], 0, grueso, { tone: "mid" }, { extra, wrap: "sr-colector", capa, owner, ...en });
    for (const [i, yy] of [yc - L / 3, yc + L / 3].entries()) {
      const xa = xf - Wd * Math.cos(b) + 0.6;
      const za = o[2] + ((o[0] - xa) / Math.cos(b)) * Math.sin(b);
      box(`${nombre}.pata${i}`, [xa - 0.2, yy - 0.2, suelo], [xa + 0.2, yy + 0.2, za], { tone: "lo" }, { r: 0.1, sombra: false, owner, ...en });
      box(`${nombre}.pie${i}`, [xf - 0.6, yy - 0.3, suelo], [xf - 0.1, yy + 0.3, z0 + 0.05], { tone: "lo" }, { r: 0.1, sombra: false, owner, ...en });
    }
    return { id: solido, puntos: [-2, 0, 2].flatMap((i) => [-2, 0, 2].map((k) => p3(pt((i / 3) * hu, (k / 3) * hv, grueso + 0.02)))) };
  }

  return { cuerpoCisterna, bomba, presurizado, estacionAnker, bateriaExpansion, nevera, transferSwitch, ps400 };
}
