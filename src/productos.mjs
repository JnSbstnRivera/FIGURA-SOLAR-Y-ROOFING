// El plano de la figura: los productos de Windmar que se ponen y se quitan desde el panel, con los datos del
// cotizador de Sun Bot. Cada producto dice en qué pestaña va, sus modelos (se escoge uno, o "Sin") y sus partes:
// las piezas que se ven solo con algunos modelos, como los colectores del calentador o el presurizado de la
// cisterna. Su dibujo está en build.mjs (DIBUJOS, con el mismo id), y la página lo prende y lo apaga, le cuenta
// la sombra y escribe su nota con estas reglas. Corre igual en Node (build) y en la página (se incrusta sin los
// `export`).
//
// Para agregar un producto: una entrada aquí y su dibujo en DIBUJOS. Para quitarlo, se borran las dos.
// Las placas y los Powerwall no van aquí: son el sistema que arma el cotizador de LUMA (se cuentan, no se
// escogen) y tienen sus propios controles en la pestaña Energía.
//
// Lo que dice cada producto:
//   pestaña, grupo, titulo   dónde va su sección en el panel, su nombre para lectores de pantalla y su título
//   nombre, articulo         cómo se nombra en las frases: "sin calentador", "por el calentador"
//   rol                      lo que hace en el día del agua (agua.mjs): "calentador" o "cisterna"
//   lugares                  cuántos de los últimos lugares de placas del techo puede ocupar
//   logo                     si lleva el logo de Windmar
//   inicial                  el modelo que se pone la primera vez que se abre su pestaña ("sugerido": el del cotizador)
//   modelos                  id, corto (el botón), techo (va en el techo: su sombra cuenta en el acceso solar de las
//                            placas), lugares (los de placas que ocupa), escenas (dónde va: "casa", que es lo de
//                            siempre, o "apartamento") y los datos del cotizador
//   partes                   piezas que se ven cuando la regla se cumple con el modelo escogido (m) y con lo escogido
//                            de los demás productos (e); las demás piezas son de un modelo
//   etiqueta(m)              lo que dice el botón de cada modelo a un lector de pantalla
//   nota(m, x)               la nota del panel con el modelo escogido (o null) y lo que pasa en la casa (x)
//   interruptor              un botón de prender y apagar debajo de la nota
const CATALOGO = [
  {
    id: "calentador",
    pestaña: "agua",
    grupo: "Calentador solar",
    titulo: "Calentador solar Soltek",
    nombre: "calentador",
    articulo: "el",
    rol: "calentador",
    lugares: 4,
    logo: true,
    inicial: "sugerido",
    fuente: "Sun Bot: cotizador Water (water/constants.ts, cal-80-1p a cal-120-4p) y su PDF maestro",
    // colectores de 34" × 76"; real: los galones de verdad del tanque; personas: para cuántas lo sugiere el cotizador
    modelos: [
      { id: "80-1", corto: "80/1", nombre: "80/1", gal: 80, real: 82, colectores: 1, lugares: 2, personas: [1, 2], techo: true },
      { id: "80-2", corto: "80/2", nombre: "80/2", gal: 80, real: 82, colectores: 2, lugares: 2, personas: [3, 4], techo: true },
      { id: "120-3", corto: "120/3", nombre: "120/3", gal: 120, real: 119, colectores: 3, lugares: 3, personas: [5, 6], techo: true },
      { id: "120-4", corto: "120/4", nombre: "120/4", gal: 120, real: 119, colectores: 4, lugares: 4, personas: [7, 99], techo: true },
    ],
    // los colectores se ven de uno en uno: el 80/1 pone uno y el 120/4, los cuatro
    partes: {
      col0: (m) => m.colectores > 0,
      col1: (m) => m.colectores > 1,
      col2: (m) => m.colectores > 2,
      col3: (m) => m.colectores > 3,
    },
    etiqueta: (m) => `${m.nombre}: ${m.gal} galones y ${m.colectores} ${m.colectores === 1 ? "colector" : "colectores"}`,
    nota(m, x) {
      const sug = x.sugerido;
      if (!m) return `Para ${x.personas} ${x.personas === 1 ? "persona" : "personas"} el cotizador sugiere el ${sug.nombre}.`;
      const para = m.personas[1] > 50 ? `${m.personas[0]} o más personas` : `${m.personas[0]} a ${m.personas[1]} personas`;
      const falta = x.agua.resistencia > 0.05 ? ` Con ${x.personas} le hace falta la resistencia: unos ${x.fmt(x.agua.resistencia, 1)} kWh al día.` : "";
      return `${m.gal} gal con ${m.colectores} ${m.colectores === 1 ? "colector" : "colectores"}, para ${para}${m.id === sug.id ? " (el que sugiere el cotizador)" : `; el cotizador sugiere el ${sug.nombre}`}.${falta}`;
    },
  },
  {
    id: "cisterna",
    pestaña: "agua",
    grupo: "Cisterna",
    titulo: "Cisterna",
    nombre: "cisterna",
    articulo: "la",
    rol: "cisterna",
    logo: true,
    inicial: "600",
    fuente: "Sun Bot: cotizador Water (water/constants.ts, cis-eco-150, cis-eco-500, cis-herc-600 y cis-eco-1000) y su PDF maestro",
    // d × h: diámetro y alto en pulgadas; con su bomba y su presurizado (galones). La Eco 1,000 no trae medidas en
    // el PDF: se dibuja de 64" × 76", unos 1,000 galones. En la casa van todas en el techo; la Torre 150 va adentro,
    // pegada a la pared, y es la de los apartamentos: queda guardada para esa escena.
    modelos: [
      { id: "150", corto: "150", nombre: "Torre 150", gal: 150, d: 25, h: 72, techo: false, bomba: "½ HP", presurizado: 6, escenas: ["apartamento"] },
      { id: "500", corto: "500", nombre: "Eco 500", gal: 500, d: 74, h: 32, techo: true, bomba: "¾ HP", presurizado: 40 },
      { id: "600", corto: "600", nombre: "Hércules 600", gal: 600, d: 56, h: 61, techo: true, bomba: "¾ HP", presurizado: 40 },
      { id: "1000", corto: "1,000", nombre: "Eco 1,000", gal: 1000, d: 64, h: 76, techo: true, bomba: "¾ HP", presurizado: 40, aprox: true },
    ],
    // la bomba va con cualquier cisterna; el presurizado, el de su modelo; y de la bomba el agua va derecho a la
    // casa, salvo que haya suavizador: entonces pasa primero por él
    partes: {
      bomba: () => true,
      pres6: (m) => m.presurizado === 6,
      pres40: (m) => m.presurizado === 40,
      aCasa: (m, e) => !hay(e, "poe"),
    },
    etiqueta: (m) => `${m.nombre}, ${m.gal.toLocaleString("en-US")} galones`,
    nota(m, x) {
      // menos de un día se dice en horas
      const r = x.agua.reserva;
      const reserva = r >= 1 ? `${x.fmt(r, 1)} ${r === 1 ? "día" : "días"}` : `unas ${Math.max(1, Math.round(r * 24))} horas`;
      if (!m) return `Una cisterna guarda agua para cuando la AAA corta el servicio. Con ${x.personas} ${x.personas === 1 ? "persona" : "personas"} se usan ${x.galones(x.agua.usoDia)} al día.`;
      return `${m.nombre}${m.aprox ? " (medidas aproximadas)" : ""}, ${m.techo ? "en el techo" : "adentro, pegada a la pared"}, con bomba de ${m.bomba} y presurizado de ${m.presurizado} gal. Sin servicio de la AAA alcanza para ${reserva}.`;
    },
    interruptor: { id: "corte", texto: "Corte de agua de la AAA" },
  },
  {
    id: "poe",
    pestaña: "agua",
    grupo: "Suavizador POE",
    titulo: "Suavizador POE Water Care",
    nombre: "suavizador",
    articulo: "el",
    logo: true,
    inicial: "10x54",
    fuente: "Sun Bot: cotizador Water (water/constants.ts, trat-poe y el add-on pe-water-care-13x54) y su PDF maestro (Tratamiento de agua, punto de entrada)",
    // Va donde el agua entra a la casa: prefiltro de sedimento de 5 micras (carcasa transparente de 10"), el tanque
    // Water Care con su válvula, el tanque de sal de 18" × 36" (280 lb) y la luz UV Viqua VH410. El de 13" × 54" es
    // el add-on de más capacidad; su tanque de sal se dibuja igual (el PDF no lo dice).
    modelos: [
      { id: "10x54", corto: "10×54", nombre: "Water Care 10×54", resina: [10, 54], tanque: 'de 10" × 54" con carbón activado y resina', techo: false },
      { id: "13x54", corto: "13×54", nombre: "Water Care 13×54", resina: [13, 54], tanque: 'de 13" × 54", de más capacidad', techo: false },
    ],
    // el equipo (sal, válvula, prefiltro, UV y sus tubos) va con los dos modelos; el agua le llega de la bomba si
    // hay cisterna, y si no, del tubo de la AAA que sube del suelo
    partes: {
      equipo: () => true,
      desdeBomba: (m, e) => hay(e, "cisterna"),
      desdeCalle: (m, e) => !hay(e, "cisterna"),
    },
    etiqueta: (m) => `${m.nombre}: tanque de ${m.resina[0]}" × ${m.resina[1]}"`,
    nota(m, x) {
      if (!m) return "Trata el agua de toda la casa donde entra: protege tuberías y enseres y mejora la calidad del agua.";
      return `Prefiltro de sedimento, tanque ${m.tanque}, tanque de sal de 18" × 36" y luz UV Viqua VH410. Por él pasan los ${x.galones(x.agua.usoDia)} que usa la casa al día.`;
    },
  },
];

// La escena de esta figura: la casa. Los modelos de otra escena (la Torre 150, del apartamento) quedan guardados.
const ESCENA = "casa";
export const PRODUCTOS = CATALOGO.map((p) => ({ ...p, modelos: p.modelos.filter((m) => (m.escenas ?? ["casa"]).includes(ESCENA)) })).filter((p) => p.modelos.length);
export const PRODUCTO = Object.fromEntries(PRODUCTOS.map((p) => [p.id, p]));
// lo escogido cuando no hay nada puesto
export const SIN_NADA = Object.fromEntries(PRODUCTOS.map((p) => [p.id, "sin"]));
// ¿Hay algo escogido de ese producto?
export const hay = (escogidos, id) => Boolean(escogidos[id]) && escogidos[id] !== "sin";
// el modelo escogido de un producto, o null si va "Sin"
export const modeloDe = (escogidos, id) => PRODUCTO[id]?.modelos.find((m) => m.id === escogidos[id]) ?? null;
// ¿Se ve esta parte con lo escogido? La parte es el id de un modelo o una de las partes del producto.
export function parteSeVe(escogidos, id, parte) {
  const m = modeloDe(escogidos, id);
  if (!m) return false;
  const regla = PRODUCTO[id].partes?.[parte];
  return regla ? regla(m, escogidos) : m.id === parte;
}
// Dos partes que nunca se ven a la vez: ninguna combinación de lo que se puede escoger (cada producto, "Sin" o uno
// de sus modelos) las pone juntas. Para cada parte se guarda en qué combinaciones se ve, un bit por combinación.
const COMBOS = PRODUCTOS.reduce((lista, p) => lista.flatMap((e) => ["sin", ...p.modelos.map((m) => m.id)].map((id) => ({ ...e, [p.id]: id }))), [{}]);
const MASCARAS = new Map();
function mascara(id, parte) {
  const llave = `${id}:${parte}`;
  if (!MASCARAS.has(llave)) MASCARAS.set(llave, COMBOS.reduce((bits, e, i) => (parteSeVe(e, id, parte) ? bits | (1n << BigInt(i)) : bits), 0n));
  return MASCARAS.get(llave);
}
export const nuncaJuntas = ([ida, a], [idb, b]) => (mascara(ida, a) & mascara(idb, b)) === 0n;
// el modelo escogido del producto que hace ese papel en el agua
export function conRol(escogidos, rol) {
  const p = PRODUCTOS.find((q) => q.rol === rol);
  return p ? modeloDe(escogidos, p.id) : null;
}
// lo escogido que ocupa lugares de placas, con su modelo
export const ocupan = (escogidos) => PRODUCTOS.map((p) => [p, modeloDe(escogidos, p.id)]).filter(([, m]) => m?.lugares);
export const lugaresOcupados = (escogidos) => ocupan(escogidos).reduce((a, [, m]) => a + m.lugares, 0);
// Lo que va en el techo, para la sombra sobre las placas: la llave del cálculo y cómo se dice ("por la cisterna",
// "por el calentador" o "por calentador y cisterna").
export const techoClave = (escogidos) => PRODUCTOS.map((p) => (modeloDe(escogidos, p.id)?.techo ? escogidos[p.id] : "sin")).join("|");
export function porLoDelTecho(escogidos) {
  const hayArriba = PRODUCTOS.filter((p) => modeloDe(escogidos, p.id)?.techo);
  if (!hayArriba.length) return "";
  return hayArriba.length === 1 ? ` por ${hayArriba[0].articulo} ${hayArriba[0].nombre}` : ` por ${hayArriba.map((p) => p.nombre).join(" y ")}`;
}
// el modelo que sugiere el cotizador para tantas personas (los que dicen para cuántas personas son)
export function sugeridoPara(p, personas) {
  if (!p.modelos[0].personas) return null;
  return p.modelos.find((m) => personas >= m.personas[0] && personas <= m.personas[1]) ?? p.modelos[p.modelos.length - 1];
}
