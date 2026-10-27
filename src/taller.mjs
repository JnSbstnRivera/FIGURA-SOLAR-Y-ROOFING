// El taller de dibujo de las escenas (la casa en build.mjs y el apartamento en apartamento.mjs): la proyección del
// lienzo, el registro de piezas que ordena y audita Anatomy, las sombras (quién tapa el sol y quién recibe la sombra),
// los sólidos, los tubos con su flujo, el logo de Windmar sobre un cilindro y el cielo con el sol y la luna. Cada
// escena arma el suyo con las puntas de su dibujo (FIT), así sale lo más grande que quepa en el ancho de la tarjeta.
import * as k from "../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../vendor/anatomy/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../vendor/anatomy/kit/tube.mjs";
import * as A from "../vendor/anatomy/kit/audit.mjs";
import { LOGO } from "./logo.mjs";

export function taller({ W, AZ, EL, FIT, PAD = 12 }) {
  // El lienzo toma la proporción exacta del dibujo: sin franjas vacías, la escena llena la tarjeta.
  const H = (() => {
    const flat = FIT.map((p) => k.iso(p, { origin: [0, 0], scale: 1, azimuth: AZ, elevation: EL }));
    const span = (i) => Math.max(...flat.map((q) => q[i])) - Math.min(...flat.map((q) => q[i]));
    return Math.round(((W - 2 * PAD) * span(1)) / span(0) + 2 * PAD);
  })();
  const P = k.fitProjection(FIT, W, H, { pad: PAD, azimuth: AZ, elevation: EL });
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
  // transparentes: los nombres de lo que se dibuja transparente con "Ver adentro" (paredes, tabiques y techos); con
  // eso prendido no echan su sombra en el dibujo (live.js), aunque el día de la energía la cuente. Lo que llevan
  // dibujado en la cara (puertas, ventanas, rejillas) va en una capa `sr-cara`, que se borra con ellos.
  const SOMBRA = { solidos: [], receptores: [], tubos: [], transparentes: [] };
  const verAdentro = (name, wrap, extra) => {
    if (!/\bsr-(pared|tabique|techo)\b/.test(wrap)) return extra;
    if (!SOMBRA.transparentes.includes(name)) SOMBRA.transparentes.push(name);
    return extra && `<g class="sr-cara">${extra}</g>`;
  };
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
  // dibujos sobre una cara que mira a +y (la fachada oeste y lo que va delante de ella) o a +x
  const faceY = (y, points, closed = true) => path3(points.map(([x, z]) => [x, y, z]), closed);
  const faceX = (x, points, closed = true) => path3(points.map(([y, z]) => [x, y, z]), closed);
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
    const body = S(paths, { tone: "mid", ...style, inner }) + verAdentro(name, wrap, extra);
    const capa = sombraCaja(name, [x0, y0, z0], [x1, y1, z1], paths.fill, { sombra, on });
    put(name, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], wrapped(body, wrap) + capa, [shape], { bias, attrs });
    return shape;
  }
  function cyl(name, cx, cy, r, z0, z1, style = {}, { steps = 32, bevel = 0, extra = "", inner = "", bias = 0, attrs = "", sombra = "ambas", on = null, owner, wrap = "" } = {}) {
    const shape = record(A.cylinder(cx, cy, r, z0, z1 - z0, { name, owner }));
    const paths = k.cylinder(cx, cy, r, z0, z1 - z0, P, steps, bevel);
    const capa = sombraCilindro(name, cx, cy, r, z0, z1, paths.fill, { sombra, on, lados: Math.max(12, Math.min(32, steps)) });
    put(name, [cx, cy, (z0 + z1) / 2], wrapped(S(paths, { tone: "mid", ...style, inner }) + extra, wrap) + capa, [shape], { bias, attrs });
    return shape;
  }
  function turned(name, F, profile, style = {}, { extra = "", inner = "", bias = 0, owner, attrs = "", capa = null, wrap = "" } = {}) {
    const paths = G.solidOf(profile, F, P);
    const mid = (profile[0][0] + profile[profile.length - 1][0]) / 2;
    const shape = record(A.solid(F, profile, { name, owner }));
    put(name, G.add3(F.o, G.mul3(F.a, mid)), wrapped(S(paths, { tone: "mid", ...style, inner }) + extra, wrap) + (capa ? capa(paths.fill) : ""), [shape], { bias, attrs });
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
    const body = S(paths, { tone: "mid", ...style, inner }) + verAdentro(name, wrap, extra);
    put(name, centre, wrapped(body, wrap) + (capa ? capa(paths.fill) : ""), [shape], { bias, attrs });
    return shape;
  }
  function layer(name, ring, z0, z1, style = {}, { extra = "", bias = 0, wrap = "", capa = null, attrs = "", owner } = {}) {
    const shape = record(A.extruded(ring, z0, z1 - z0, { name, owner }));
    const cx = ring.reduce((a, p) => a + p[0], 0) / ring.length;
    const cy = ring.reduce((a, p) => a + p[1], 0) / ring.length;
    const paths = k.extrude(ring, z0, z1 - z0, P, { convex: false });
    const body = S(paths, { tone: "mid", ...style }) + extra;
    put(name, [cx, cy, (z0 + z1) / 2], wrapped(body, wrap) + (capa ? capa(paths.fill) : ""), [shape], { bias, attrs });
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
  // `ends`: qué puntas del tubo van montadas en algo (el pico de un grifo no: queda abierto en el aire)
  function pipe(name, points, r, { channel = null, flowOf = null, attrsOf = null, tone = "mid", bend, limp = false, maxLength = 12, bias = 0.05, gaps = [], breaks = [], propio = null, touch, agua = false, ends } = {}) {
    const route = G.fillet(points, bend ?? Math.max(r * 2.6, 1.2), 10, { P, tube: r });
    R.route(name, route, r, { limp, piece: "fig", gaps, touch, ends });
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
  // Un tubo suelto, que no es pieza del dibujo (no se audita ni se ordena): lo que la página muestra solo un momento,
  // como el tramo que se estira del conducto de las placas mientras se levantan para sellar el techo.
  function tuboSuelto(points, r, { tone = "mid" } = {}) {
    const route = G.fillet(points, Math.max(r * 2.6, 1.2), 10, { P, tube: r });
    return tubePieces(route, r, P, { maxLength: 1000, spacing: Math.max(0.5, Math.min(1.4, r)) }).map((piece) => tubeSvg(piece, { tone })).join("");
  }
  // Abrazadera: un anillo alrededor del tubo (que queda cortado debajo) y un taco hasta la pared.
  function strap(name, route, s, pipeName, r, block) {
    const centre = G.pointAlong(route, s);
    const F = G.frameAlong(centre, G.tangentAlong(route, s));
    ringOn(`${name}.ring`, F, -0.6, 0.6, r, r + 0.45, { tone: "mid" }, { owner: pipeName });
    box(`${name}.block`, block[0], block[1], { tone: "mid" }, { r: 0.2, owner: pipeName, sombra: "recibe" });
  }

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

  // ---------- cielo: el sol y la luna pasan por encima de la maqueta ----------
  // Cada uno va en la dirección de pantalla de su dirección real, la de donde viene su luz, justo afuera del
  // contorno de la maqueta: nunca pasa por detrás de ella y las sombras caen siempre del lado contrario
  // (de mañana sale por el lado de atrás, a mediodía va arriba y de tarde baja por el frente). El contorno es
  // la envoltura convexa, en pantalla, de las puntas del dibujo (`puntas`), y `centro` es un punto del medio de la
  // maqueta. El resplandor va detrás de la maqueta y el disco, con su textura, delante. Se arma al final, cuando ya
  // están todos los recortes de las sombras.
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
  function cieloDe({ puntas, centro }) {
    const CIELO = {
      contorno: envoltura(puntas.map(at)).map(p3),
      centro: at(centro).map(r2),
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
    return { CIELO, cieloFondo, cielo, defs };
  }

  return {
    H, P, KS, at, S, Ln, Dots, path3, f2, R, record, put,
    SOMBRA, VISTA, r2, p3, tapaSol, cara, recibeSol, anillosCaja, carasCaja, carasAnillo, anilloEn, anilloRedondo, faceY, faceX, rect, sombraCaja, sombraCilindro,
    box, cyl, turned, ringOn, prism, layer, ball, arcWhere, pipe, tuboSuelto, strap, logoEnCilindro, cieloDe,
  };
}
