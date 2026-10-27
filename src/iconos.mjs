// El ícono del simulador, como un emoji: una casita en 3D con el techo azul, las placas en el agua del frente, la
// puerta naranja y un sol. `npm run iconos` escribe public/favicon.svg y, con Google Chrome (como `npm run capture`),
// public/favicon.ico (16, 32 y 48 px) y public/apple-touch-icon.png (180 px, con fondo blanco: el iPhone pinta de
// negro lo transparente). El build no lo corre; las páginas solo enlazan esos tres archivos.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromePort } from "../vendor/anatomy/scripts/chrome-port.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// La casa: W a lo largo de la cumbrera, D de pared a pared, H de pared y R lo que sube el techo de dos aguas. El
// alero sobresale ALERO al frente y atrás, el techo sobresale VUELO a los lados y su canto tiene CANTO de grueso.
const W = 1, D = 1.2, H = 0.72, R = 0.58, ALERO = 0.1, VUELO = 0.07, CANTO = 0.07;
const ZA = H - (ALERO * R) / (D / 2); // la altura del alero

// isométrico: x baja a la derecha, y baja a la izquierda, z sube
const iso = ([x, y, z]) => [(x - y) * Math.cos(Math.PI / 6), (x + y) / 2 - z];

// el agua del frente del techo, de la cumbrera (v = 0) al alero (v = 1), de un lado (u = 0) al otro (u = 1)
const CUMBRE = [-VUELO, D / 2, H + R];
const LARGO = [W + 2 * VUELO, 0, 0];
const BAJADA = [0, D / 2 + ALERO, ZA - H - R];
const enAgua = (u, v) => CUMBRE.map((c, i) => c + u * LARGO[i] + v * BAJADA[i]);

// Los colores son los de la marca (src/page.css); el naranja solo resalta: la puerta y el sol.
const DEFS =
  `<linearGradient id="ic-luz" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#F1F2F5"/></linearGradient>` +
  `<linearGradient id="ic-gris" x2="0" y2="1"><stop offset="0" stop-color="#E4E5E9"/><stop offset="1" stop-color="#C8C9CE"/></linearGradient>` +
  `<linearGradient id="ic-techo" x2="0" y2="1"><stop offset="0" stop-color="#1D429B"/><stop offset="1" stop-color="#183785"/></linearGradient>` +
  `<linearGradient id="ic-placa" x2="1" y2="1"><stop offset="0" stop-color="#183785"/><stop offset="1" stop-color="#21274E"/></linearGradient>` +
  `<linearGradient id="ic-puerta" x2="0" y2="1"><stop offset="0" stop-color="#F89B24"/><stop offset="1" stop-color="#E28312"/></linearGradient>` +
  `<linearGradient id="ic-vidrio" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#AFC3EE"/></linearGradient>` +
  `<radialGradient id="ic-sol"><stop offset="0" stop-color="#FBC074"/><stop offset="1" stop-color="#F89B24"/></radialGradient>` +
  `<radialGradient id="ic-suelo"><stop offset="0" stop-color="#21274E" stop-opacity=".3"/><stop offset="1" stop-color="#21274E" stop-opacity="0"/></radialGradient>`;

// Lo que se pinta, de atrás para adelante: polígonos en 3D o figuras ya en el plano (el sol y la sombra).
function piezas() {
  const p = [];
  const cara = (puntos, fill, extra = "") => p.push({ puntos: puntos.map(iso), fill, extra });
  const placas = [];
  for (let fila = 0; fila < 2; fila++) {
    for (let col = 0; col < 3; col++) {
      const u0 = 0.1 + col * 0.27, u1 = u0 + 0.245, v0 = 0.15 + fila * 0.36, v1 = v0 + 0.32;
      placas.push([[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, v]) => enAgua(u, v)));
    }
  }
  // la sombra en el suelo y las dos paredes que se ven, la del frente con su ventana y la del lado con su puerta
  p.push({ elipse: [-0.09, 0.62, 1, 0.55], fill: "url(#ic-suelo)" });
  cara([[0, D, 0], [W, D, 0], [W, D, H], [0, D, H]], "url(#ic-luz)");
  cara([[0.2, D, 0.2], [0.58, D, 0.2], [0.58, D, 0.44], [0.2, D, 0.44]], "url(#ic-vidrio)", ` stroke="#C8C9CE" stroke-width=".7" stroke-linejoin="round"`);
  cara([[0.39, D, 0.2], [0.39, D, 0.44]], "none", ` stroke="#FFFFFF" stroke-width=".9"`);
  cara([[W, 0, 0], [W, D, 0], [W, D, H], [W, D / 2, H + R], [W, 0, H]], "url(#ic-gris)");
  cara([[W, D / 2 - 0.13, 0], [W, D / 2 + 0.13, 0], [W, D / 2 + 0.13, 0.44], [W, D / 2 - 0.13, 0.44]], "url(#ic-puerta)");
  // el techo: el agua de atrás (se asoma), la del frente con sus placas y los cantos del alero y del lado
  cara([[-VUELO, -ALERO, ZA], [W + VUELO, -ALERO, ZA], [W + VUELO, D / 2, H + R], [-VUELO, D / 2, H + R]], "#183785");
  cara([enAgua(0, 0), enAgua(1, 0), enAgua(1, 1), enAgua(0, 1)], "url(#ic-techo)");
  for (const placa of placas) cara(placa, "url(#ic-placa)", ` stroke="#AFC3EE" stroke-width=".6" stroke-linejoin="round"`);
  cara([[-VUELO, D + ALERO, ZA], [W + VUELO, D + ALERO, ZA], [W + VUELO, D + ALERO, ZA - CANTO], [-VUELO, D + ALERO, ZA - CANTO]], "#152D6B");
  cara([[W + VUELO, -ALERO, ZA], [W + VUELO, D / 2, H + R], [W + VUELO, D + ALERO, ZA], [W + VUELO, D + ALERO, ZA - CANTO], [W + VUELO, D / 2, H + R - CANTO], [W + VUELO, -ALERO, ZA - CANTO]], "#21274E");
  // el sol, con sus rayos, en la esquina que el techo deja libre arriba a la derecha (no agranda el cuadro)
  p.push({ sol: [0.74, -0.74, 0.15] });
  return p;
}

// La casa en un cuadro de 64: la encuadra con MARGEN y devuelve el SVG. Con `fondo`, sobre blanco y más chica.
export function icono({ fondo = false } = {}) {
  const lista = piezas();
  const RAYOS = 8;
  const todos = lista.flatMap((q) =>
    q.puntos ?? (q.elipse ? [[q.elipse[0] - q.elipse[2], q.elipse[1] - q.elipse[3]], [q.elipse[0] + q.elipse[2], q.elipse[1] + q.elipse[3]]] : [[q.sol[0] - q.sol[2] * 1.9, q.sol[1] - q.sol[2] * 1.9], [q.sol[0] + q.sol[2] * 1.9, q.sol[1] + q.sol[2] * 1.9]]),
  );
  const [x0, x1] = [Math.min(...todos.map((t) => t[0])), Math.max(...todos.map((t) => t[0]))];
  const [y0, y1] = [Math.min(...todos.map((t) => t[1])), Math.max(...todos.map((t) => t[1]))];
  const MARGEN = fondo ? 9 : 1.5;
  const k = (64 - 2 * MARGEN) / Math.max(x1 - x0, y1 - y0);
  const dx = 32 - ((x0 + x1) / 2) * k, dy = 32 - ((y0 + y1) / 2) * k;
  const n = (v) => +v.toFixed(2);
  const punto = ([x, y]) => `${n(x * k + dx)} ${n(y * k + dy)}`;
  const trazos = lista.map((q) => {
    if (q.elipse) {
      const [cx, cy, rx, ry] = q.elipse;
      return `<ellipse cx="${n(cx * k + dx)}" cy="${n(cy * k + dy)}" rx="${n(rx * k)}" ry="${n(ry * k)}" fill="${q.fill}"/>`;
    }
    if (q.sol) {
      const [cx, cy, r] = q.sol;
      const rayos = Array.from({ length: RAYOS }, (_, i) => {
        const a = (i / RAYOS) * 2 * Math.PI;
        return `M${punto([cx + Math.cos(a) * r * 1.4, cy + Math.sin(a) * r * 1.4])}L${punto([cx + Math.cos(a) * r * 1.85, cy + Math.sin(a) * r * 1.85])}`;
      }).join("");
      return `<path d="${rayos}" stroke="#F89B24" stroke-width="${n(r * k * 0.32)}" stroke-linecap="round"/><circle cx="${n(cx * k + dx)}" cy="${n(cy * k + dy)}" r="${n(r * k)}" fill="url(#ic-sol)"/>`;
    }
    return `<path d="M${q.puntos.map(punto).join("L")}${q.fill === "none" ? "" : "Z"}" fill="${q.fill}"${q.extra}/>`;
  });
  const base = fondo ? `<rect width="64" height="64" fill="url(#ic-fondo)"/>` : "";
  const defs = DEFS + (fondo ? `<linearGradient id="ic-fondo" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#F1F2F5"/></linearGradient>` : "");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><defs>${defs}</defs>${base}${trazos.join("")}</svg>\n`;
}

// Un Chrome sin ventana para pasar el SVG a PNG en el tamaño exacto (cada tamaño se dibuja aparte, no se achica).
async function conChrome(trabajo) {
  const binary = [process.env.CHROME_PATH, "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].filter(Boolean).find((ruta) => existsSync(ruta));
  if (!binary) throw new Error("No encuentro Google Chrome: pon su ruta en CHROME_PATH.");
  const perfil = mkdtempSync(join(tmpdir(), "iconos-"));
  const chrome = spawn(binary, ["--headless=new", ...(process.platform === "linux" ? ["--no-sandbox"] : []), ...(process.platform === "win32" ? ["--do-not-de-elevate"] : []), "--remote-debugging-port=0", `--user-data-dir=${perfil}`, "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "about:blank"]);
  const port = await chromePort(chrome, perfil);
  try {
    const page = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
    const socket = new WebSocket(page.webSocketDebuggerUrl);
    let id = 0;
    const pendientes = new Map();
    socket.onmessage = (mensaje) => {
      const data = JSON.parse(mensaje.data);
      if (data.id && pendientes.has(data.id)) {
        pendientes.get(data.id)(data);
        pendientes.delete(data.id);
      }
    };
    await new Promise((listo) => (socket.onopen = listo));
    const send = (method, params = {}) =>
      new Promise((listo) => {
        const llamada = ++id;
        pendientes.set(llamada, listo);
        socket.send(JSON.stringify({ id: llamada, method, params }));
      });
    return await trabajo(send);
  } finally {
    chrome.kill("SIGKILL");
    try {
      rmSync(perfil, { recursive: true, force: true });
    } catch {}
  }
}

async function png(send, svg, lado) {
  await send("Emulation.setDeviceMetricsOverride", { width: lado, height: lado, deviceScaleFactor: 1, mobile: false });
  await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
  const { result } = await send("Page.getFrameTree");
  const html = `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block;width:${lado}px;height:${lado}px}</style>${svg}`;
  await send("Page.setDocumentContent", { frameId: result.frameTree.frame.id, html });
  const foto = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: lado, height: lado, scale: 1 } });
  return Buffer.from(foto.result.data, "base64");
}

// Un .ico con los PNG adentro (lo leen todos los navegadores y Windows desde Vista).
function ico(imagenes) {
  const cabeza = Buffer.alloc(6);
  cabeza.writeUInt16LE(1, 2);
  cabeza.writeUInt16LE(imagenes.length, 4);
  let donde = 6 + 16 * imagenes.length;
  const indice = imagenes.map(({ lado, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(lado % 256, 0);
    e.writeUInt8(lado % 256, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(donde, 12);
    donde += data.length;
    return e;
  });
  return Buffer.concat([cabeza, ...indice, ...imagenes.map((i) => i.data)]);
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const svg = icono();
  writeFileSync(join(ROOT, "public", "favicon.svg"), svg);
  await conChrome(async (send) => {
    const imagenes = [];
    for (const lado of [16, 32, 48]) imagenes.push({ lado, data: await png(send, svg, lado) });
    writeFileSync(join(ROOT, "public", "favicon.ico"), ico(imagenes));
    writeFileSync(join(ROOT, "public", "apple-touch-icon.png"), await png(send, icono({ fondo: true }), 180));
  });
  console.log("íconos: public/favicon.svg, public/favicon.ico y public/apple-touch-icon.png");
}
