# Diseño de la aplicación y unidades de trabajo

> Sale de los requisitos y de las respuestas de Juan del 29-oct (P1 a P4). Las
> medidas van en unidades del mundo (10.5 por metro) y en metros. Para aprobar
> antes de construir.

## 1. Vista general

| Qué | Dónde | Unidad |
| --- | --- | --- |
| La casa alargada, con 48 lugares para placas | `src/build.mjs`, `src/model.mjs` (`LIMITES.placas`), `src/live-casa.js` | U1 |
| El garaje, la entrada, el Tesla, la acera y la calle | `src/build.mjs`, `src/carro.mjs` (el carro: no es un producto ni va en las dos escenas, así que no va en `piezas.mjs`), `src/page.css` | U2 |
| El cargador y el consumo del Tesla | `src/model.mjs`, `src/live-casa.js`, `src/pagina.mjs` | U3 |
| El selector Sin / Con Windmar | `src/live.js`, `src/live-casa.js`, `src/pagina.mjs`, `src/page.css` | U4 |
| El apartamento en un edificio | `src/apartamento.mjs`, `src/live-apartamento.js`, `src/page.css` | U5 |
| README, capturas y estos documentos | `README.md`, `docs/` | U6 |

## 2. La casa alargada (U1)

- **Medidas:** las paredes pasan de 106 × 119 (10.1 × 11.3 m) a 106 × 165
  (10.1 × 15.7 m). La casa crece hacia el este: la fachada oeste, con todo el
  equipo, el cuarto, la caseta de los Powerwall y el poste, se queda donde
  está.
- **Placas:** 12 columnas × 4 filas = 48 lugares (hoy 8 × 4 = 32). La franja
  oeste del techo sigue para el aire, el calentador y la cisterna.
  `LIMITES.placas` pasa a 48 y el cotizador sugiere con ese tope.
- **El garaje va dentro del rectángulo**, en el extremo este, bajo el mismo
  techo de concreto: sus placas cuentan en las 48 (P2). La sala, la cocina y
  los cuartos conservan su tamaño de hoy.
- **Lo del techo y las fachadas** se reacomoda: parches viejos, charcos, la
  grieta, las manchas, el agua que escurre y las goteras se reparten en el
  techo largo. La obra de Roofing ya recorre el techo por sus bordes, así que
  sigue sola.
- **La base y el encuadre:** la base crece lo justo. La escena va a ocupar
  más, así que el dibujo sale algo más chico en la tarjeta; el zoom sigue para
  acercar. Antes de seguir se mide cuánto se achica.

Planta (el norte arriba, el oeste a la izquierda; la cámara mira desde abajo a
la izquierda, el sur y el oeste):

```text
                               NORTE
   +----------------------------------------------------------------+
   |  poste                                                         |
   |   (o)   +------------------------------------------+---------+ |
   |         | cuarto de                                |         | |
 O |         | equipos y     CASA  10 x 16 m            | GARAJE  | | E
 E |         | caseta de     techo plano, 48 lugares    | 4.3 m   | | S
 S |         | Powerwall     para placas                |         | | T
 T |         | (fachada oeste)                          |         | | E
 E |         +--------------- puerta -------------------+-porton--+ |
   |                                                    | TESLA   | |
   |                                                    | entrada | |
   |  ================== acera ==================================== |
   |  - - - - - - - - - - - - calle - - - - - - - - - - - - - - - - |
   +----------------------------------------------------------------+
                                SUR
```

## 3. Garaje, Tesla y calle (U2)

- **Garaje:** el bloque sureste de la casa, unos 6.5 × 4.3 m, con portón
  seccional en la fachada sur (unos 2.9 m de ancho y 2 de alto). Al norte
  del garaje queda un cuarto cerrado (lavandería). **Ajuste de U2:** el portón
  va sobre el zócalo, a ras de su frente, y una rampa corta sube de la entrada;
  bajarlo al suelo cortando el zócalo dejaba un ciclo zócalo-pared-portón sin
  orden de pintado posible.
- **Tesla Model Y** a escala: 4.75 × 1.92 m y 1.6 m de alto (50 × 20 × 17),
  parqueado en la entrada con la cola hacia el portón y la nariz hacia la
  calle: así su puerto de carga (atrás a la izquierda) queda junto al
  cargador. Techo de vidrio, ruedas, faros y la barra de luz de atrás; de
  noche, faros encendidos tenues. Echa sombra como todo lo demás.
- **Entrada, acera y calle** al sur: la entrada de 6 m, la acera de 1.2 m con
  su encintado y un carril de la calle, cortado por el borde de la base.
- **El poste se queda al oeste**, en el lindero, con su acometida igual.
  **Cambio a P6:** la calle va al frente (B) y no al oeste (A), porque el
  garaje abre al sur (P2) y el lado oeste ya lo ocupan el cuarto de equipos y
  la caseta; mover el contador o el poste sería rehacer lo de LUMA.
- **Colores (`windmar-ui-skill`):** el Tesla en blanco con grises de la
  escala (`#F7F8FA`, `#E4E5E9`, `#C8C9CE`) y vidrios en `#21274E`; el asfalto
  en `#4B4B4E`, la acera en `#E4E5E9` y `#C8C9CE`, las rayas en blanco. En
  tema oscuro, los tonos de la escala que ya usa la casa.

## 4. El cargador y el consumo del Tesla (U3)

- **Cargador de pared** en la fachada sur, junto al portón, con un conducto
  desde el panel por debajo del alero. Cuando el carro carga, la energía corre
  por ese conducto (el mismo trazo naranja con brillo de los otros).
- **Consumo:** en la pestaña Energía, "Carro eléctrico: km al día" (0 = sin
  carro; por defecto 40 km, unos 7.2 kWh al día, 216 kWh al mes, a 0.18 kWh
  por km). Se suma al consumo de cada mes y el cotizador sugiere con eso.
- **Horario:** "Carga con el sol" (por defecto: de 11 am a 3 pm, con el
  excedente) o "De noche" (de la batería o de LUMA). El día simulado lo
  enseña: las placas, la batería o LUMA cargan el carro.
- **Punto por confirmar (P7):** el carro se suma a lo de la factura, como
  dijo P3 (sirve para quien lo va a comprar o aún no lo carga en casa). Si el
  cliente ya lo carga en casa, se pone 0 km y la factura ya lo trae.
- **Ajuste al construir U3 (30-oct):** el panel está en el cuarto de equipos
  de la fachada oeste, así que un conducto a la vista desde ahí cruzaría el
  cuarto y la caseta de las baterías. El circuito va por dentro de la casa y
  sale por una caja de paso en la fachada sur, entre la ventana y el portón;
  de ahí el conducto corre bajo el alero, por encima del portón, y baja al
  Wall Connector, al este del portón. El cable baja al suelo y sube al puerto
  de carga, en la esquina de atrás del lado del chofer (el que la cámara no
  ve). En el paso 3, la fila del mes dice "Factura de" para que se distinga
  de las barras, que son el consumo con el carro; lo que se arrastra o se
  escribe sigue siendo la factura. La línea del reproductor no dice nada del
  carro: no cabe, y lo dice el conducto encendido.

## 5. Sin / Con Windmar (U4)

- **Control segmentado** "Sin Windmar | Con Windmar" (`aria-pressed`) arriba
  de las pestañas; por defecto "Con Windmar", que es lo de hoy.
- **Sin Windmar** enseña la misma casa sin nada de Windmar: sin placas,
  inversor, Powerwall ni caseta; sin calentador, cisterna ni Anker; el techo
  sin sellar, con sus parches y su grieta. Toda la energía viene de LUMA,
  también la del carro.
- **La ficha compara** con números que ya calculan los modelos: lo que se toma
  de LUMA al mes, las horas de respaldo en un apagón, el agua caliente y el
  techo, sin y con Windmar.
- Mientras se ve "Sin Windmar", los controles de las pestañas quedan
  desactivados con una línea que lo explica y vuelve a "Con Windmar". El
  cambio se anima con un fundido de 250 ms, se anuncia al lector de pantalla y
  respeta el movimiento reducido.
- **Ajustes al construir U4 (2-nov):** la línea solo explica; se vuelve con
  el mismo selector, sin un segundo botón (un solo camino). Las pestañas
  siguen y el aguacero también, porque el techo sin sellar con lluvia es lo
  que más enseña; lo demás de los pasos queda quieto (`inert`) mostrando lo
  que lleva con Windmar. La ficha que compara tiene seis celdas: de LUMA en
  el mes y en el año, en un apagón, la luz del agua caliente, si corta la AAA
  y el techo; si con Windmar falta algo, la celda lo dice ("falta la
  cisterna"). El inversor, su salida al panel, la T y el conducto de las
  placas ahora se ven solo con sistema, así que tampoco salen en "Con
  Windmar" con 0 placas y 0 baterías.

## 6. El apartamento en un edificio (U5)

- **Un piso abajo y uno arriba, en corte** (P5): del de arriba se ve su losa y
  la parte baja de sus paredes y su balcón; del de abajo, la parte alta de sus
  paredes, ventanas y baranda. Los dos se desvanecen hacia el borde de la
  tarjeta, así que el edificio se lee completo sin achicar la unidad.
- Con "Ver adentro" (transparente, como arranca) los otros pisos se aclaran a
  un 25 % para ver adentro; cerrado, se ven enteros.
- La base de la maqueta sale: la unidad queda en su edificio. La brújula pasa
  al piso del balcón y el rótulo de la base se va (ya está el logo en la
  tarjeta).
- El encuadre sigue tomando solo la unidad y su balcón: la unidad no se
  achica.
- **Ajustes al construir U5 (2-nov):** el desvanecido va con la altura de
  cada fachada (una máscara por plano), no con la del borde de la tarjeta:
  así ningún piso deja un corte a la vista, ni al frente ni a los lados. El
  encuadre suma 1.5 m abajo y 1 m arriba de la unidad, y aun así la unidad
  sale más grande que con la base. El piso de abajo se pinta detrás de todo
  (nada suyo tapa la unidad). **El balcón de arriba está de verdad, así que
  les da sombra a las placas del balcón:** "Del sol" baja de 3.9 a 3.0 kWh
  al día con el balcón al sur (de 21 a 25 % en los demás rumbos, y 56 % al
  norte). Juan decide si se queda o se quita.

## 7. Pruebas por unidad

Lo de siempre en cada unidad: la auditoría ("audit passed" dos veces), 0
líneas sueltas, los 12 tamaños sin desborde, claro y oscuro, táctil a 375 px,
consola limpia y los números de Energía, Agua y Anker iguales cuando no
deberían cambiar. Además:

| Unidad | Prueba propia |
| --- | --- |
| U1 | 48 lugares; el cotizador sugiere hasta 48; Roofing sella el techo entero; la lluvia con y sin sellar |
| U2 | El carro, la calle y el garaje sin líneas sueltas ni orden de pintado roto; peso de la página |
| U3 | Con 0 km los números son los de hoy; con 40 km suma 216 kWh al mes; el flujo corre al carro solo cuando carga |
| U4 | Sin Windmar no queda nada de Windmar en la escena; la ficha cuadra con los modelos; teclado y lector |
| U5 | Los pisos se ven cerrados y se aclaran con "Ver adentro"; la unidad no se achica |

## 8. Riesgos

- **U1 es la más grande:** unas 40 medidas dependen de la casa. Va sola y
  primero, con la auditoría y las líneas en cada paso.
- **La escena crece:** se mide cuánto se achica el dibujo en la tarjeta; el
  garaje dentro del rectángulo y la calle cortada al borde la mantienen
  compacta.
- **Peso:** el presupuesto es unos 2.3 MB para la casa (hoy 1.86).

## 9. Unidades y orden

| Unidad | Qué | Aprobación de Juan |
| --- | --- | --- |
| U1 | La casa alargada con 48 lugares | Capturas antes de seguir |
| U2 | Garaje, Tesla, entrada, acera y calle | Capturas |
| U3 | Cargador y consumo del Tesla | Capturas y números |
| U4 | Sin / Con Windmar | Capturas |
| U5 | El apartamento en un edificio (independiente, puede ir en cualquier momento) | Capturas |
| U6 | README, capturas y estos documentos al día | Antes del push |

El push va al final, cuando Juan lo pida.
