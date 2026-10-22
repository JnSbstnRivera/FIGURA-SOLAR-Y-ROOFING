// Lo que comparten las páginas de las escenas (la casa en index.html y el apartamento en apartamento.html): los
// controles que se repiten (los botones de menos y más, los de una sola escogida, la sección de cada producto del
// plano y el rumbo), el reproductor del día, el selector Casa | Apartamento y el armado de la página: la tarjeta con
// su ficha, la columna de controles, la leyenda plegada y el script, que junta los modelos con lo común de live.js y
// lo de la escena.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../vendor/anatomy/kit/iso-kit.mjs";
import { kitScript } from "../vendor/anatomy/scripts/inline-kit.mjs";
import { SALIDA, PUESTA } from "./model.mjs";
import { SOL } from "./sol.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

// Las escenas, cada una en su página. El selector va arriba a la derecha de la tarjeta, donde iba su título.
export const ESCENAS = [
  { id: "casa", nombre: "Casa", archivo: "index.html", href: "./" },
  { id: "apartamento", nombre: "Apartamento", archivo: "apartamento.html", href: "apartamento.html" },
];
const selector = (escena) => `<nav class="sr-escenas" aria-label="Escena">${ESCENAS.map((e) => `<a href="${e.href}"${e.id === escena ? ' aria-current="page"' : ""}>${e.nombre}</a>`).join("")}</nav>`;

export const stepper = (key, label) =>
  `<span class="sr-step" data-stepper="${key}"><button type="button" class="sr-btn sr-pm" data-d="-1" aria-label="Quitar ${label}">−</button><output data-v="${key}">0</output><button type="button" class="sr-btn sr-pm" data-d="1" aria-label="Sumar ${label}">+</button></span>`;
// Botones de una sola escogida (los modelos de un producto del plano): el primero es "Sin".
export const opciones = (key, label, lista, columnas = 5) =>
  `<div class="sr-opciones" role="radiogroup" aria-label="${label}" data-opciones="${key}"${columnas === 5 ? "" : ` style="grid-template-columns:repeat(${columnas},minmax(0,1fr))"`}>` +
  [["sin", "Sin", `Sin ${label.toLowerCase()}`], ...lista].map(([id, corto, largo], i) => `<button type="button" class="sr-btn sr-opcion" role="radio" aria-checked="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-opcion="${id}" aria-label="${largo}">${corto}</button>`).join("") +
  `</div>`;
// La sección de un producto del plano (productos.mjs): su título, un botón por modelo (y "Sin"), lo que cuenta con − y
// + (las PS400 del Anker), su nota y su interruptor, si tiene.
export const seccionDe = (p) =>
  `<section class="sr-group" aria-label="${p.grupo}">
    <p class="sr-tag">${p.titulo}</p>
    ${opciones(p.id, p.nombre[0].toUpperCase() + p.nombre.slice(1), p.modelos.map((m) => [m.id, m.corto, p.etiqueta(m)]), p.columnas)}${p.cantidad ? `
    <div class="sr-system"><span class="sr-lab">${p.cantidad.texto}</span>${stepper(p.cantidad.id, p.cantidad.etiqueta)}</div>` : ""}
    <p class="sr-nota" data-nota="${p.id}"></p>${p.interruptor ? `
    <div class="sr-row"><button type="button" class="sr-switch" role="switch" aria-checked="false" data-${p.interruptor.id}><span class="sr-switch-pista" aria-hidden="true"></span>${p.interruptor.texto}</button></div>` : ""}
  </section>`;
// El rumbo: ocho botones en el orden de la brújula (en la casa, hacia dónde miran las placas; en el apartamento,
// hacia dónde mira el balcón).
export const rumbosHtml = (etiqueta) =>
  `<span class="sr-lab" id="sr-rumbo-lab">${etiqueta}</span><div class="sr-rumbos" role="radiogroup" aria-labelledby="sr-rumbo-lab" aria-describedby="sr-rumbo-v"><span class="sr-sr" id="sr-rumbo-v" data-rumbo-v></span>${SOL.rumbos.map((r) => `<button type="button" class="sr-btn sr-rumbo" role="radio" aria-checked="${r.az === 180}" tabindex="${r.az === 180 ? 0 : -1}" data-rumbo="${r.az}" aria-label="${r.nombre}, ${r.az} grados" title="${r.nombre}">${r.corto}</button>`).join("")}</div>`;

// Reproductor del día, como uno de música: play/pausa, la hora y lo que pasa en ese momento,
// la barra de 24 horas (la franja clara es el sol, de 6:25 a 18:25) y la velocidad.
const icon = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
const pct = (h) => `${((h / 24) * 100).toFixed(2)}%`;
const reproductor = (start) =>
  `<div class="sr-player" role="group" aria-label="Reproductor del día">` +
  `<button type="button" class="sr-play" data-play aria-label="Pausar el día" aria-pressed="true"><span class="sr-i-pause">${icon("M7 5h3.5v14H7zM13.5 5H17v14h-3.5z")}</span><span class="sr-i-play">${icon("M8 5.5v13l11-6.5z")}</span></button>` +
  `<span class="sr-np"><span class="sr-clock" data-clock>12:30</span><span class="sr-readout" data-readout aria-hidden="true"></span></span>` +
  `<input class="sr-scrub" type="range" data-scrub min="0" max="24" step="0.05" value="${start}" aria-label="Hora del día" style="--sr-sale:${pct(SALIDA)};--sr-pone:${pct(PUESTA)}">` +
  `<span class="sr-speeds" role="group" aria-label="Velocidad del día">` +
  [["Normal", 0.25], ["Rápido", 1], ["Súper rápido", 3]].map(([label, rate], i) => `<button type="button" class="sr-speed" data-speed="${rate}" aria-pressed="${i === 0}">${label}</button>`).join("") +
  `</span></div>`;

// El zoom, abajo a la izquierda de la escena: alejar, cuánto, acercar, ver todo y pantalla completa (live.js lo maneja;
// también acercan la rueda, el doble clic y el pellizco, y con zoom se arrastra el dibujo). Va afuera del deslizador
// de la hora para que el lector de pantalla vea sus botones.
const zoomHtml =
  `<div class="sr-zoom" role="group" aria-label="Zoom de la figura">` +
  `<button type="button" class="sr-zoom-b" data-zoom="menos" aria-label="Alejar">${icon("M5 11h14v2H5z")}</button>` +
  `<output class="sr-zoom-v" data-zoom-v aria-live="polite">100 %</output>` +
  `<button type="button" class="sr-zoom-b" data-zoom="mas" aria-label="Acercar">${icon("M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z")}</button>` +
  `<button type="button" class="sr-zoom-b sr-zoom-todo" data-zoom="todo" aria-label="Ver toda la figura">Ver todo</button>` +
  `<button type="button" class="sr-zoom-b sr-zoom-todo" data-ver-adentro aria-pressed="true" title="Paredes y techo transparentes para ver adentro">Ver adentro</button>` +
  `<button type="button" class="sr-zoom-b" data-zoom="pantalla" aria-label="Pantalla completa" aria-pressed="false" title="Pantalla completa" hidden>${icon("M3 3h7v2H5v5H3zm11 0h7v7h-2V5h-5zM3 14h2v5h5v2H3zm16 0h2v7h-7v-2h5z")}</button>` +
  `</div>`;

const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^export /gm, "");
const notice = `/* Kit de figuras isométricas Anatomy (github.com/wheresryan22/anatomy), licencia MIT, © 2026 Ryan. Ver vendor/anatomy/LICENSE. */\n`;

// Arma la página de una escena y la escribe en public/. `about` es el párrafo de "Cómo leer la figura", `keys` y
// `caption` la leyenda y el pie, `ficha` la franja de datos de la tarjeta, `controls` la columna de controles,
// `etiqueta` lo que dice la figura a un lector de pantalla y `DATA` lo que el build le pasa a la página.
export function escribirPagina({ escena, titulo, h1, descripcion, fig, about, keys, caption, svg, ficha, controls, etiqueta, DATA }) {
  const { archivo } = ESCENAS.find((e) => e.id === escena);
  const CSS = readFileSync(join(HERE, "page.css"), "utf8");
  const intro = `<header class="sr-head"><div><p class="sr-kicker">Windmar Home · Puerto Rico</p><h1>${h1}</h1></div><button type="button" class="sr-btn sr-theme" data-theme-toggle aria-pressed="false">Tema oscuro</button></header>`;
  const plate = k
    .plateHtml({
      fig,
      title: "",
      hint: "",
      readout: "",
      keys,
      caption,
      body: `<div class="sr-vista"><div class="iso-stage sr-stage" tabindex="0" role="slider" aria-label="${etiqueta} Usa las flechas para cambiar la hora del día, la barra espaciadora para pausar y + y − para acercar o alejar." aria-valuemin="0" aria-valuemax="24" aria-valuenow="${DATA.start}">${svg}<span class="sr-sr" role="status" aria-live="polite" data-status></span></div>${zoomHtml}</div>${reproductor(DATA.start)}`,
    })
    .replace('data-mark="dashed"', 'data-mark="dashed" data-energy')
    // la lectura en vivo va dentro del reproductor, no en la esquina
    .replace('<span class="iso-plate-corner" data-corner="readout" data-readout></span>', "")
    .replace('<div class="iso-plate">', `<div class="iso-plate">${selector(escena)}`)
    .replace('<div class="sr-vista">', `${ficha}<div class="sr-vista">`);
  if (plate.includes('data-corner="readout"')) throw new Error("readout corner still in the plate");
  // La leyenda y el pie van plegados debajo de las dos columnas: solo ocupan lugar si se abren.
  const legendAt = plate.indexOf('<figcaption class="iso-legend">');
  const legendEnd = plate.indexOf("</figcaption>", legendAt) + "</figcaption>".length;
  const legendBody = plate.slice(legendAt, legendEnd).replace('<figcaption class="iso-legend">', '<div class="iso-legend sr-notes">').replace(/<\/figcaption>$/, "</div>");
  const legend = `<details class="sr-more"><summary>Cómo leer la figura y de dónde salen los números</summary>${about}${legendBody}</details>`;
  // En pantalla ancha el título, los controles y "Más información" van en la columna derecha,
  // y la tarjeta con la escena ocupa todo el alto de la ventana a la izquierda.
  const layout = `<div class="sr-layout">${intro}<div class="sr-main">${plate.slice(0, legendAt) + plate.slice(legendEnd)}</div><aside class="sr-side" aria-label="Controles">${controls}${legend}</aside></div>`;
  // el plano sabe su escena antes de cargarse; la página lleva lo común de live.js y lo de su escena
  const enEscena = escena === "casa" ? "" : `globalThis.ESCENA_FIGURA = "${escena}";\n`;
  const vivo = strip("live.js").replace("__DATA__", JSON.stringify(DATA)) + strip(`live-${escena}.js`);
  const page = k
    .pageHtml({ title: titulo, theme: "light", body: `<style>${CSS}</style>${layout}`, script: notice + kitScript() + strip("model.mjs") + strip("sol.mjs") + strip("agua.mjs") + strip("anker.mjs") + enEscena + strip("productos.mjs") + vivo, width: 760 })
    .replace('<html lang="en">', '<html lang="es">')
    .replace("<head>", `<head><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap"><meta name="description" content="${descripcion}">`);
  mkdirSync(join(ROOT, "public"), { recursive: true });
  writeFileSync(join(ROOT, "public", archivo), page);
  return { page, archivo };
}
