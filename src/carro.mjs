// El Tesla Model Y de la casa, a escala: 4.75 × 1.92 m y 1.6 m de alto (unas 10.5 unidades por metro), parado en la
// entrada con la cola hacia el portón del garaje y la nariz hacia la calle (+x). La carrocería y la cabina de vidrio
// son prismas de su perfil de lado, extruidos de un costado al otro (y); las ruedas, sólidos de revolución acostados.
// Todo comparte dueño ("tesla"), así la auditoría no cuenta las ruedas como metidas en la carrocería; todo echa
// sombra, y la carrocería y la cabina también la reciben. Lo que va dibujado en su costado de +y (el que mira a la
// cámara): los huecos de las ruedas, las puertas, las manijas y los faros, que se prenden de noche (page.css).
import * as G from "../vendor/anatomy/kit/lathe.mjs";

const DUENO = "tesla";
// el perfil de lado, de la cola (u = 0) a la nariz, sobre el piso (v = 0); los dos son convexos
const CARROCERIA = [[0.6, 2.4], [49, 2.4], [49.9, 5.6], [49, 8.4], [36, 10.6], [4, 11.2], [0, 8.8], [0, 4.2]];
const CABINA = [[4.5, 11], [36.5, 10.5], [26.5, 16.6], [13, 17], [3, 12.6]];
// ancho de la carrocería y de la cabina (más angosta arriba), radio y ejes de las ruedas, y ancho de la llanta (las
// ruedas van pegadas por fuera de cada costado: metidas en la carrocería, no habría un orden de pintado que sirva)
export const TESLA = { largo: 49.9, ancho: 20.2, cabina: 17, rueda: 3.7, ejes: [10, 40.3], llanta: 1.8 };

export function tesla(t, { x0, yc, z0 }) {
  const { P, Ln, path3, prism, turned, box, tapaSol, recibeSol, cara, carasAnillo } = t;
  const { ancho, cabina, rueda: R, ejes, llanta } = TESLA;
  const y1 = yc + ancho / 2;
  const lado = (y, poly) => poly.map(([u, v]) => [x0 + u, y, z0 + v]);
  const enLado = (pts, closed = true) => path3(pts.map(([u, v]) => [x0 + u, y1 + 0.03, z0 + v]), closed);
  const F = G.frameOf([x0, 0, z0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  // una pieza de perfil: echa sombra y la recibe en lo que se ve (su costado de +y y su contorno)
  function deLado(name, poly, ya, yb, style, { wrap = "", extra = "" } = {}) {
    const a = lado(ya, poly);
    const b = lado(yb, poly);
    const propio = tapaSol(name, a, b);
    const capa = (fill) => recibeSol(name, fill, [...carasAnillo(a, b, { tapa: false }), cara([0, 1, 0], b)], { propios: [propio] });
    prism(name, F, poly, ya, yb, style, { wrap, extra, capa, owner: DUENO });
  }

  // la carrocería, blanca, con los huecos de las ruedas, las puertas, las manijas y los faros
  const arriba = (u) => 10.6 + ((36 - u) * 0.6) / 32;
  const hueco = (u) => {
    const r = R + 0.8;
    const arco = Array.from({ length: 13 }, (_, i) => [u + r * Math.cos((i / 12) * Math.PI), R + r * Math.sin((i / 12) * Math.PI)]);
    return `<path class="sr-hueco" d="${enLado([[u + r, 2.4], ...arco, [u - r, 2.4]])}"/>`;
  };
  const puertas = [15.5, 26, 35].map((u) => enLado([[u, 2.4], [u, arriba(u)]], false)).join("");
  const manijas = [[18.5, 21], [29, 31.5]].map(([a, b]) => enLado([[a, 9.2], [b, 9.2]], false)).join("");
  // los faros, en la cara de adelante (de la defensa a la punta del capó), uno en cada esquina
  const frente = (s, y) => [x0 + 49.9 - 0.9 * s + 0.03, y, z0 + 5.6 + 2.8 * s];
  const faro = (ya, yb) => path3([frente(0.55, ya), frente(0.55, yb), frente(0.78, yb), frente(0.78, ya)], true);
  const faros = [[y1 - 5.2, y1 - 0.9], [yc - ancho / 2 + 0.9, yc - ancho / 2 + 5.2]].map(([a, b]) => faro(a, b)).join("");
  const halo = path3(Array.from({ length: 16 }, (_, i) => frente(0.66 + 0.42 * Math.sin((i / 16) * 2 * Math.PI), y1 - 3.05 + 3.6 * Math.cos((i / 16) * 2 * Math.PI))), true);
  deLado("tesla.carroceria", CARROCERIA, yc - ancho / 2, y1, { tone: "hi" }, {
    extra:
      ejes.map(hueco).join("") +
      Ln(puertas + manijas, { tone: "lo", free: true }) +
      `<path class="sr-faro" d="${faros}"/><path class="sr-faro-halo" d="${halo}"/>`,
  });

  // la cabina de vidrio (con el techo de vidrio del Model Y), con un reflejo en la ventana de lado
  const yv = yc + cabina / 2 + 0.03;
  const reflejo = path3([[x0 + 14.5, yv, z0 + 11.4], [x0 + 18, yv, z0 + 11.3], [x0 + 21.5, yv, z0 + 16.6], [x0 + 18.2, yv, z0 + 16.7]], true);
  deLado("tesla.cabina", CABINA, yc - cabina / 2, yc + cabina / 2, { tone: "mid" }, { wrap: "sr-cristal", extra: `<path class="sr-reflejo" d="${reflejo}"/>` });
  // el espejo de lado, en la base del parabrisas
  box("tesla.espejo", [x0 + 34.2, y1, z0 + 10.4], [x0 + 36.6, y1 + 1.5, z0 + 12], { tone: "hi" }, { r: 0.3, owner: DUENO, sombra: false });

  // las cuatro ruedas: la llanta oscura y, en las del lado que se ve, el rin claro con su centro
  ejes.forEach((u, e) => {
    for (const lejos of [true, false]) {
      const [ya, yb] = lejos ? [yc - ancho / 2 - llanta, yc - ancho / 2] : [y1, y1 + llanta];
      const cx = x0 + u;
      const cz = z0 + R;
      const TF = G.frameOf([cx, 0, cz], [0, 1, 0], [0, 0, 1], [1, 0, 0]);
      const anillo = (y, r = R) => Array.from({ length: 16 }, (_, i) => [cx + r * Math.cos((i / 16) * 2 * Math.PI), y, cz + r * Math.sin((i / 16) * 2 * Math.PI)]);
      const name = `tesla.rueda${e}${lejos ? "b" : "a"}`;
      tapaSol(name, anillo(ya), anillo(yb));
      const rin = lejos ? "" : `<path class="sr-rin" d="${path3(anillo(yb + 0.03, R * 0.64), true)}"/><path class="sr-hueco" d="${path3(anillo(yb + 0.05, R * 0.18), true)}"/>`;
      turned(name, TF, [[ya, R - 0.6], [ya + 0.6, R], [yb - 0.6, R], [yb, R - 0.6]], { tone: "lo" }, { extra: rin, owner: DUENO, wrap: "sr-neumatico" });
    }
  });
}
