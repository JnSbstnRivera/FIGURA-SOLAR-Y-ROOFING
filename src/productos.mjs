// El plano de la figura: los productos de Windmar que se ponen y se quitan desde el panel, con los datos del
// cotizador de Sun Bot. Cada producto dice en qué pestaña va, sus modelos (se escoge uno, o "Sin") y sus partes:
// las piezas que se ven solo con algunos modelos, como los colectores del calentador o el presurizado de la
// cisterna. Su dibujo está en el build de cada escena (DIBUJOS, con el mismo id: build.mjs para la casa y
// apartamento.mjs para el apartamento), y la página lo prende y lo apaga, le cuenta la sombra y escribe su nota con
// estas reglas. Corre igual en Node (build) y en la página (se incrusta sin los `export`).
//
// Para agregar un producto: una entrada aquí y su dibujo en DIBUJOS de cada escena donde va. Para quitarlo, se
// borran las dos. Las placas y los Powerwall no van aquí: son el sistema que arma el cotizador de LUMA (se cuentan,
// no se escogen) y tienen sus propios controles en la pestaña Energía de la casa.
//
// Lo que dice cada producto:
//   pestaña, grupo, titulo   dónde va su sección en el panel, su nombre para lectores de pantalla y su título
//   nombre, articulo         cómo se nombra en las frases: "sin calentador", "por el calentador"
//   rol                      lo que hace en el día (agua.mjs y anker.mjs): "calentador", "cisterna", "potable" (la
//                            ósmosis, el agua de beber) o "respaldo" (el Anker)
//   lugares                  cuántos de los últimos lugares de placas del techo puede ocupar
//   logo                     si lleva el logo de Windmar
//   inicial                  el modelo que se pone la primera vez que se abre su pestaña ("sugerido": el del cotizador)
//   columnas                 en cuántas columnas van sus botones (5 si no lo dice; menos para nombres largos)
//   modelos                  id, corto (el botón), techo (va en el techo: su sombra cuenta en el acceso solar de las
//                            placas), lugares (los de placas que ocupa), escenas (dónde va: "casa", que es lo de
//                            siempre, "apartamento" o las dos) y los datos del cotizador
//   porEscena                en el producto o en un modelo: lo que cambia en una escena, como el modelo inicial de
//                            la cisterna o las PS400 que caben en el balcón del apartamento
//   cantidad                 algo que se cuenta con − y + debajo de sus botones (las PS400 del Anker): su llave en lo
//                            escogido, su texto (o su `nombre(m, e)`, si cambia), el mínimo, el máximo de cada modelo,
//                            cuántas trae al escogerlo y lo que dice al lado (`tope`, hasta cuántas)
//   partes                   piezas que se ven cuando la regla se cumple con el modelo escogido (m) y con lo escogido
//                            de los demás productos (e); las demás piezas son de un modelo
//   etiqueta(m)              lo que dice el botón de cada modelo a un lector de pantalla
//   nota(m, x)               la nota del panel, de una o dos líneas, con el modelo escogido (o null) y lo que pasa en
//                            la casa (x); en los de respaldo, la de "Sin": qué hacen
//   interruptor              un botón de prender y apagar debajo de la nota; con `escogido` va en lo escogido con su id
//                            (el generador del E10) y las partes lo pueden mirar; `si(m)` dice con qué modelos va
//   excluye                  los productos que no van a la vez con este: al escoger uno, el otro queda en "Sin" (el
//                            Anker portátil y el E10)
//
// Los de respaldo (rol "respaldo": el Anker portátil y el E10) van en la pestaña Anker en pasos (pagina.mjs): el tipo
// de respaldo, el modelo, la cantidad y los extras (sus interruptores). Para eso dicen además:
//   tipo                     su botón en el paso "Tipo de respaldo"
//   pasos                    los títulos de sus pasos del modelo y de la cantidad ("Modelo" y "Placas"; "Kit" y
//                            "Baterías")
//   porDefecto               el modelo que se pone al escoger el tipo, si nunca se escogió uno (si no, el inicial)
//   familias                 los botones del paso "Modelo" cuando cada uno va con o sin su batería de expansión (el
//                            portátil): cada modelo dice su `familia` y si lleva la batería (`expansion`), que se escoge
//                            con un interruptor
//   resumen(m, x)            la línea debajo del modelo: lo que es
//   resultado(m, x)          la línea debajo de la cantidad: lo que da en el día
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
      return `Para ${para}${m.id === sug.id ? ", el que sugiere el cotizador" : `; el cotizador sugiere el ${sug.nombre}`}. Ahorra unos ${x.fmt(x.agua.ahorroMes)} kWh de luz al mes y ocupa ${m.lugares} lugares de placas.${falta}`;
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
    porEscena: { apartamento: { inicial: "150" } },
    fuente: "Sun Bot: cotizador Water (water/constants.ts, cis-eco-150, cis-eco-500, cis-herc-600 y cis-eco-1000) y su PDF maestro",
    // d × h: diámetro y alto en pulgadas; con su bomba y su presurizado (galones). La Eco 1,000 no trae medidas en
    // el PDF: se dibuja de 64" × 76", unos 1,000 galones. En la casa van todas en el techo. La Torre 150 va adentro,
    // pegada a la pared, y es la de los apartamentos ("ideal para apartamentos", dice el cotizador): con la bomba de
    // ½ HP y el presurizado de 6 gal del PDF, porque en apartamento el kit de bombeo más grande no es obligatorio.
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
      if (!m) return `Guarda agua para cuando la AAA corta el servicio: con ${x.personas} ${x.personas === 1 ? "persona" : "personas"} se usan ${x.galones(x.agua.usoDia)} al día.`;
      return `${m.nombre}${m.aprox ? " (medidas aproximadas)" : ""}, ${m.techo ? "en el techo" : "adentro, pegada a la pared"}, con bomba de ${m.bomba} y presurizado de ${m.presurizado} gal. Sin la AAA alcanza para ${reserva}.`;
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
      if (!m) return "Trata el agua de toda la casa donde entra: protege tuberías y enseres.";
      return `Prefiltro, tanque de ${m.resina[0]}" × ${m.resina[1]}", tanque de sal y luz UV. Trata los ${x.galones(x.agua.usoDia)} que usa la casa al día.`;
    },
  },
  {
    id: "anker",
    pestaña: "anker",
    grupo: "Anker SOLIX portátil",
    titulo: "Anker SOLIX portátil con placas PS400",
    nombre: "Anker",
    articulo: "el",
    rol: "respaldo",
    tipo: "Portátil",
    pasos: { modelo: "Modelo", cantidad: "Placas" },
    excluye: ["e10"],
    inicial: "f3800",
    fuente: "Sun Bot: cotizador Anker (anker/constants.ts: la F2600, la BP2600, la F3800 Plus, la BP3800, la PS400 y los transfer switch) y las fichas de Anker (kWh, kW, medidas y entrada solar)",
    // Va aparte de las placas del techo: sus propias placas PS400 y su transfer switch al lado del panel. kwh: la batería
    // (con la de expansión); kw: lo que da a la vez; transfer: el automático no va con la F2600 (regla del cotizador);
    // medidas: largo, ancho y alto en pulgadas. La BP2600 (2.56 kWh, 17.44" × 10.6" × 9.4") es la batería de expansión
    // de la F2600, y la BP3800 la de la F3800 Plus.
    //
    // Las PS400 se suman y se quitan con − y + (`cantidad`). ps400 es cuántas lleva al escogerlo (supuesto del
    // dibujo); maxPs400, cuántas admite según su entrada solar (fichas de Anker). Cada PS400 da 400 W a 48 V y 8.33 A,
    // con 60 V en circuito abierto:
    //   - la F2600 tiene una entrada XT-60 de 11 a 60 V, hasta 20 A y 1,000 W: dos PS400 en paralelo (16.7 A y 800 W);
    //   - la F3800 Plus tiene dos entradas de 11 a 165 V, hasta 17 A y 1,600 W cada una: en cada una, dos cadenas de dos
    //     PS400 en serie (120 V y 16.7 A). Son 8, las "ocho conexiones de placas de 400 W" de su ficha;
    //   - las baterías de expansión no tienen entrada solar: con ellas van las mismas.
    // La F2600 también carga con la PS200 (200 W a 48 V y 4.17 A, con 57.6 V en circuito abierto; el cotizador no la
    // deja con la F3800 Plus): en paralelo le caben 4 (16.7 A y 800 W; con 5 pasaría de 20 A). Se escoge con el
    // interruptor, que solo va con la F2600.
    // cabenPs400 es cuántas caben donde van: 8 en el patio de la casa y 2 en el balcón del apartamento, donde el transfer
    // switch es el de apartamento del cotizador.
    cabenPs400: 8,
    porEscena: { apartamento: { cabenPs400: 2, pasos: { modelo: "Modelo", cantidad: "Placas en el balcón" } } },
    cantidad: {
      id: "ps400",
      texto: "Placas",
      nombre: (m, e) => (conPs200(m, e) ? "Placas PS200" : "Placas PS400"),
      etiqueta: "una placa",
      min: 1,
      max: (m, p, e = {}) => Math.min(conPs200(m, e) ? m.maxPs200 : m.maxPs400, p.cabenPs400),
      inicial: (m) => m.ps400,
      tope: (m, p, e) => `hasta ${p.cantidad.max(m, p, e)}${ESCENA === "apartamento" ? " en el balcón" : ""}`,
    },
    interruptor: { id: "ps200", texto: "Placas PS200 (200 W) en vez de PS400", escogido: true, si: (m) => Boolean(m.maxPs200) },
    // el paso "Modelo": la F2600 y la F3800 Plus, cada una con o sin su batería de expansión
    familias: [
      { id: "f2600", corto: "F2600", expansion: "BP2600" },
      { id: "f3800", corto: "F3800 Plus", expansion: "BP3800" },
    ],
    modelos: [
      { id: "f2600", corto: "F2600", nombre: "SOLIX F2600", familia: "f2600", expansion: false, kwh: 2.56, kw: 2.4, ps400: 2, maxPs400: 2, maxPs200: 4, transfer: "manual", medidas: [20.7, 15.5, 9.8], techo: false, escenas: ["casa", "apartamento"] },
      { id: "f2600bp", corto: "F2600 + BP", nombre: "SOLIX F2600 con BP2600", familia: "f2600", expansion: true, kwh: 5.12, kw: 2.4, ps400: 2, maxPs400: 2, maxPs200: 4, transfer: "manual", medidas: [20.7, 15.5, 9.8], bp2600: true, techo: false, escenas: ["casa", "apartamento"] },
      { id: "f3800", corto: "F3800 Plus", nombre: "SOLIX F3800 Plus", familia: "f3800", expansion: false, kwh: 3.84, kw: 6, ps400: 2, maxPs400: 8, transfer: "automático", medidas: [27.6, 15.3, 15.6], techo: false, escenas: ["casa", "apartamento"] },
      { id: "f3800bp", corto: "F3800 + BP", nombre: "SOLIX F3800 Plus con BP3800", familia: "f3800", expansion: true, kwh: 7.68, kw: 6, ps400: 3, maxPs400: 8, transfer: "automático", medidas: [27.6, 15.3, 15.6], bp: true, techo: false, escenas: ["casa", "apartamento"], porEscena: { apartamento: { ps400: 2 } } },
    ],
    // los cables van con cualquier modelo; cada estación con o sin su batería de expansión; las PS400 se ven de una en
    // una, hasta las que lleva; y el transfer switch es el manual o el automático
    partes: {
      equipo: () => true,
      f2600: (m) => m.id.startsWith("f2600"),
      f3800: (m) => m.id.startsWith("f3800"),
      bp2600: (m) => Boolean(m.bp2600),
      bp3800: (m) => Boolean(m.bp),
      ...Object.fromEntries(Array.from({ length: 8 }, (_, j) => [`ps${j}`, (m, e) => !conPs200(m, e) && cantidadDe(e, PRODUCTO.anker) > j])),
      ...Object.fromEntries(Array.from({ length: 4 }, (_, j) => [`ps200_${j}`, (m, e) => conPs200(m, e) && cantidadDe(e, PRODUCTO.anker) > j])),
      manual: (m) => m.transfer === "manual",
      automatico: (m) => m.transfer === "automático",
    },
    etiqueta: (m) => `${m.nombre}: ${m.kwh} kWh y ${m.kw} kW, admite hasta ${m.maxPs400} placas PS400`,
    // sin respaldo escogido: lo que hace (en la casa, el portátil o el E10)
    nota: () =>
      PRODUCTO.e10
        ? "Mantiene lo esencial (nevera, internet, luces y abanicos) cuando no hay LUMA: el portátil con sus placas, o el E10 para toda la casa."
        : "Mantiene lo esencial (nevera, internet, luces y abanicos) cuando no hay LUMA, con sus placas en el balcón.",
    resumen: (m, x) => `${x.fmt(m.kwh, 2)} kWh y ${x.fmt(m.kw, m.kw % 1 ? 1 : 0)} kW, con transfer switch ${m.transfer}${ESCENA === "apartamento" ? " de apartamento" : ""}.`,
    resultado: (m, x) => `Hoy el sol le da ${x.fmt(x.anker.solDia, 1)} de los ${x.fmt(x.anker.esencialDia, 1)} kWh de lo esencial; sin LUMA alcanza para unas ${Math.round(x.anker.horas)} horas.`,
  },
  {
    id: "e10",
    pestaña: "anker",
    grupo: "Anker SOLIX E10",
    titulo: "Anker SOLIX E10 para toda la casa",
    nombre: "E10",
    articulo: "el",
    rol: "respaldo",
    tipo: "E10",
    pasos: { modelo: "Kit", cantidad: "Baterías" },
    porDefecto: "ats",
    excluye: ["anker"],
    columnas: 4,
    fuente: "Sun Bot: cotizador Anker (los kits del SOLIX E10, la B6000, el Generador 5500 y sus reglas: hasta 5 baterías y la montura de pared con 4 o más) y las fichas de Anker del E10, la B6000, la Power Dock, la Smart Inlet Box y el Smart Generator 5500",
    // El sistema de respaldo modular de Anker, para toda la casa. Va en el cuarto de equipos, contra su pared norte: el
    // módulo de poder (7.68 kW seguidos, 26.4" × 11.8" × 10.2") encima de sus baterías B6000 (6.144 kWh cada una,
    // 26.4" × 12.7" × 11.1"; el kit trae una y se le suman hasta cuatro). Los kits del cotizador:
    //   - Portátil: sobre su carrito, se enchufa en lo que haga falta;
    //   - MTS: con la Smart Inlet Box en la pared (16.5" × 11" × 5.2"), el paso manual a los circuitos de la casa;
    //   - ATS: con la Power Dock en la pared (15" × 36.1" × 7.1", 200 A), que pasa toda la casa sola en 20 ms;
    //   - Solar: el ATS con 4 placas de 400 W (1.6 kW) en el patio. El E10 tiene dos entradas solares de 4,500 W (30 a
    //     450 V y 15 A): las 4 van en serie (unos 240 V en circuito abierto).
    // La base: el carrito en el kit portátil y una base en el piso en los demás; con 4 o más baterías la montura de pared
    // es obligatoria por el peso (regla del cotizador). El Smart Generator 5500 (tres combustibles, 3.6 kW en DC, NEMA
    // 3R, 27.9" × 22.2" × 16.5") va afuera, nunca adentro: carga el E10 cuando la batería llega a su reserva. Solo en la
    // casa: el cotizador no lo vende para apartamento.
    cantidad: {
      id: "b6000",
      texto: "Baterías B6000",
      etiqueta: "una batería B6000",
      min: 1,
      max: () => 5,
      inicial: () => 1,
      tope: () => "hasta 5",
    },
    interruptor: { id: "generador", texto: "Generador 5500 afuera: la recarga en un apagón", escogido: true },
    // resumen: lo que es cada kit, en la línea debajo de sus botones. El botón del kit Portátil dice "Carrito", para no
    // confundirlo con el Anker portátil del paso de antes.
    modelos: [
      { id: "portatil", corto: "Carrito", nombre: "E10 Kit Portátil", resumen: "El kit Portátil, sobre su carrito: se enchufa en lo que haga falta.", kwhB6000: 6.144, kw: 7.68, conexion: null, placas: 0, carrito: true, techo: false, escenas: ["casa"] },
      { id: "mts", corto: "MTS", nombre: "E10 Kit MTS (Smart Inlet Box)", resumen: "Con la Smart Inlet Box: los circuitos de la casa se pasan a mano.", kwhB6000: 6.144, kw: 7.68, conexion: "mts", placas: 0, techo: false, escenas: ["casa"] },
      { id: "ats", corto: "ATS", nombre: "E10 Kit ATS (Power Dock)", resumen: "Con la Power Dock: pasa toda la casa sola, en 20 ms.", kwhB6000: 6.144, kw: 7.68, conexion: "ats", placas: 0, techo: false, escenas: ["casa"] },
      { id: "solar", corto: "Solar", nombre: "E10 Kit Solar (Power Dock + 1.6 kW)", resumen: "El ATS con 4 placas de 400 W (1.6 kW) en el patio.", kwhB6000: 6.144, kw: 7.68, conexion: "ats", placas: 4, techo: false, escenas: ["casa"] },
    ],
    // los cables van con cualquier kit; las baterías de una en una y el módulo encima de la última; la base según el kit
    // y las baterías; la caja de la pared según el kit; las placas del kit solar; y el generador si se prende
    partes: {
      equipo: () => true,
      ...Object.fromEntries([1, 2, 3, 4, 5].map((k) => [`modulo${k}`, (m, e) => cantidadDe(e, PRODUCTO.e10) === k])),
      ...Object.fromEntries(Array.from({ length: 5 }, (_, j) => [`b${j}`, (m, e) => cantidadDe(e, PRODUCTO.e10) > j])),
      carrito: (m, e) => Boolean(m.carrito) && cantidadDe(e, PRODUCTO.e10) < 4,
      base: (m, e) => !m.carrito && cantidadDe(e, PRODUCTO.e10) < 4,
      montura: (m, e) => cantidadDe(e, PRODUCTO.e10) >= 4,
      mts: (m) => m.conexion === "mts",
      ats: (m) => m.conexion === "ats",
      conectado: (m) => Boolean(m.conexion),
      ...Object.fromEntries(Array.from({ length: 4 }, (_, j) => [`ps${j}`, (m) => m.placas > j])),
      generador: (m, e) => Boolean(e.generador),
    },
    etiqueta: (m) => `${m.nombre}: 7.68 kW, con una batería B6000 de 6.144 kWh y hasta cinco${m.placas ? `, con ${m.placas} placas de 400 W` : ""}`,
    resumen: (m) => m.resumen,
    // la batería, dónde va (con 4 o más, la montura de pared es obligatoria), lo que le da el sol (o, sin placas, que
    // LUMA lo mantiene lleno) y para cuánto alcanza sin LUMA
    resultado(m, x) {
      const n = x.cantidad;
      const base = n >= 4 ? "en la montura de pared" : m.carrito ? "sobre su carrito" : "sobre su base";
      const sol = m.placas ? `; hoy el sol le da ${x.fmt(x.anker.solDia, 1)} de los ${x.fmt(x.anker.esencialDia, 1)} kWh de lo esencial` : "; LUMA lo mantiene lleno";
      return `${x.fmt(6.144 * n, 1)} kWh ${base}${sol}. Sin LUMA alcanza para unas ${Math.round(x.anker.horas)} horas.`;
    },
  },
  {
    id: "nevera",
    pestaña: "anker",
    grupo: "Nevera EverFrost",
    titulo: "Nevera portátil Anker EverFrost",
    nombre: "nevera",
    articulo: "la",
    columnas: 3,
    fuente: "Sun Bot: cotizador Anker (Cooler 40 y Cooler 50) y la ficha de Anker de las EverFrost Powered Cooler 30/40/50",
    // Nevera con compresor y su batería de 299 Wh (desmontable), sin hielo: enfría y congela. Se carga en la pared, en el
    // carro (12 V), por USB-C (60 W) o con una placa de 100 W (de 0 a 100 % en 3 h 36 min). medidas: largo, ancho y alto
    // en mm; horas: lo que mantiene 4 °C con 25 °C afuera y la batería llena (ficha).
    modelos: [
      { id: "40", corto: "40 (43 L)", nombre: "EverFrost Powered Cooler 40", litros: 43, medidas: [732, 430, 487], horas: 35.8, latas: 54, techo: false, escenas: ["casa", "apartamento"] },
      { id: "50", corto: "50 (53 L)", nombre: "EverFrost Powered Cooler 50", litros: 53, medidas: [852, 430, 487], horas: 27, latas: 62, doble: true, techo: false, escenas: ["casa", "apartamento"] },
    ],
    etiqueta: (m) => `${m.nombre}: ${m.litros} litros y batería de 299 Wh`,
    nota(m) {
      if (!m) return "Con compresor y su propia batería de 299 Wh, sin hielo: para un apagón o para salir.";
      return `${m.litros} L (${m.latas} latas)${m.doble ? " en dos zonas: enfría y congela a la vez" : ""}. Con su batería de 299 Wh mantiene 4 °C unas ${m.horas} horas.`;
    },
  },
  {
    id: "osmosis",
    pestaña: "agua",
    grupo: "Ósmosis inversa",
    titulo: "Ósmosis inversa de 7 etapas",
    nombre: "ósmosis",
    articulo: "la",
    rol: "potable",
    inicial: "tanque",
    columnas: 3,
    fuente: "Sun Bot: cotizador Water (water/constants.ts, trat-ro y el add-on pu-tankless-ro) y su PDF maestro (Tratamiento de agua, punto de uso)",
    // Va debajo del fregadero: prefiltro de sedimento de 5 micras, dos de carbón en bloque de 10 micras, la membrana
    // TFC de 100 GPD, el cartucho de PFAS y microplásticos, el alcalino BioCera y el post-filtro de carbón de 10", con
    // el dispensador cromado de largo alcance en el tope y la conexión a la nevera. El de siempre lleva un tanque de
    // 4 gal y no usa electricidad; el Tankless RO (add-on) no lleva tanque, produce al momento y necesita electricidad
    // y 40 psi. Por ahora solo en el apartamento, que es donde se ve la cocina.
    modelos: [
      { id: "tanque", corto: "Con tanque", nombre: "Reverse Osmosis 7/100GPD", gpd: 100, tanque: 4, techo: false, escenas: ["apartamento"] },
      { id: "sintanque", corto: "Sin tanque", nombre: "Tankless RO", gpd: 100, tanque: 0, electrica: true, techo: false, escenas: ["apartamento"] },
    ],
    // los filtros, el grifo y sus tubos van con los dos; el tanque, solo con el de siempre
    partes: {
      etapas: () => true,
    },
    etiqueta: (m) => `${m.nombre}: ${m.tanque ? `con tanque de ${m.tanque} galones` : "sin tanque, con electricidad"}`,
    nota(m, x) {
      const beber = x.galones(x.agua.potableDia);
      if (!m) return `Agua para beber del grifo, debajo del fregadero: con ${x.personas} ${x.personas === 1 ? "persona" : "personas"}, unos ${beber} al día.`;
      return m.tanque ? `7 etapas con tanque de ${m.tanque} gal y grifo de largo alcance; no usa electricidad. Da ${beber} de beber y cocinar al día.` : `7 etapas sin tanque: produce al momento, con electricidad y al menos 40 psi. Da ${beber} de beber y cocinar al día.`;
    },
  },
];

// La escena de esta figura: la casa, o el apartamento si su build y su página ponen antes ESCENA_FIGURA. Quedan los
// productos con algún modelo de la escena, con lo que cambia en ella (porEscena).
const ESCENA = globalThis.ESCENA_FIGURA ?? "casa";
const enEscena = (o) => ({ ...o, ...o.porEscena?.[ESCENA] });
export const PRODUCTOS = CATALOGO.map((p) => enEscena({ ...p, modelos: p.modelos.filter((m) => (m.escenas ?? ["casa"]).includes(ESCENA)).map(enEscena) })).filter((p) => p.modelos.length);
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
// Cuántas van de lo que el producto cuenta con − y + (las PS400 del Anker): las que se escogieron, o las que trae su
// modelo, entre el mínimo y lo que admite ese modelo en la escena; 0 si el producto va "Sin". Se guardan en lo escogido
// con la llave de la cantidad.
export function cantidadDe(escogidos, p) {
  const m = modeloDe(escogidos, p.id);
  if (!m || !p.cantidad) return 0;
  const c = p.cantidad;
  return Math.max(c.min, Math.min(c.max(m, p, escogidos), escogidos[c.id] ?? c.inicial(m)));
}
// ¿Lleva placas PS200? Solo la F2600 y con su interruptor prendido.
export const conPs200 = (m, e) => Boolean(m?.maxPs200) && Boolean(e?.ps200);
// Dos partes que nunca se ven a la vez: ninguna combinación de lo que se puede escoger (cada producto, "Sin" o uno
// de sus modelos, y cada cantidad) las pone juntas. Para cada parte se guarda en qué combinaciones se ve, un bit por
// combinación.
// (la cantidad y el interruptor de un producto solo cuentan con un modelo escogido, y dos productos que se excluyen
// no van juntos)
function opcionesDe(p) {
  const out = [{ [p.id]: "sin" }];
  for (const m of p.modelos) {
    let vals = [{ [p.id]: m.id }];
    if (p.interruptor?.escogido) vals = vals.flatMap((e) => [false, true].map((v) => ({ ...e, [p.interruptor.id]: v })));
    if (p.cantidad) vals = vals.flatMap((e) => Array.from({ length: p.cantidad.max(m, p, e) - p.cantidad.min + 1 }, (_, i) => ({ ...e, [p.cantidad.id]: p.cantidad.min + i })));
    out.push(...vals);
  }
  return out;
}
const juntos = (e) => PRODUCTOS.every((p) => !p.excluye || !hay(e, p.id) || p.excluye.every((id) => !hay(e, id)));
const COMBOS = PRODUCTOS.reduce((lista, p) => lista.flatMap((e) => opcionesDe(p).map((o) => ({ ...e, ...o }))).filter(juntos), [{}]);
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
