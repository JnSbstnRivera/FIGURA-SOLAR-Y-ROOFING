# Reverse engineering — lo que ya existe

> Un solo archivo, con lo que toca este cambio (Juan pidió no llenarse de
> markdowns). La documentación completa del simulador es el `README.md`.

## 1. Qué es y cómo se construye

- Dos páginas estáticas: `public/index.html` (la casa, Fig 1) y
  `public/apartamento.html` (el apartamento, Fig 2). Las arma
  `node src/build.mjs` con el kit Anatomy (isométrico en SVG, `vendor/anatomy`).
  Vercel corre el build y sirve `public/`. No hay dependencias.
- El mundo: x = sur, y = oeste, z = arriba, unas 10.5 unidades por metro. La
  cámara ve las caras sur (x+) y oeste (y+).
- Controles de calidad que ya existen: la auditoría del kit (`npm run audit`,
  "audit passed" dos veces: tubos, sólidos y orden de pintado), las líneas
  sueltas (cada línea termina sobre algo), el desborde en 12 tamaños de
  pantalla y las 18 capturas del README.

## 2. La casa (`src/build.mjs`, `src/live-casa.js`)

| Pieza | Hoy | Notas |
| --- | --- | --- |
| Base (maqueta) | 134 × 186 (12.8 × 17.7 m) | ceñida a la casa, el equipo y el poste |
| Paredes | 106 × 119 (10.1 × 11.3 m), 3.5 m de alto | casi cuadrada |
| Techo | losa plana de concreto | la pestaña Roofing la sella entera |
| Placas | 8 columnas × 4 filas = 32 lugares | 410 W, inclinadas 10°; el aire, el calentador y la cisterna quitan lugares |
| Fachada oeste | inversor, panel, contador, cuarto de equipos y la caseta de 4 Powerwall | por aquí entra LUMA |
| Poste de LUMA | al oeste (y = 72) | la acometida llega al mástil del contador |
| Garaje, carro, calle | no hay | |

**Lo que depende de las medidas** (si la casa cambia, se mueve con ella):
`HY1` 23 usos, `TOPZ` 29, `SLAB` 16, `CUARTO` 15, `POLE` 12, `PLATE` 11,
`COLS` 11, entre otros; y coordenadas puestas a mano en el techo y las
fachadas: parches viejos (`VIEJOS`), charcos (`CHARCOS`), la grieta, las
manchas (`MANCHAS_SUR`, `MANCHAS_OESTE`), el agua que escurre y las goteras.
La obra de Roofing (`azotea` en `live-casa.js`) recorre el techo por sus
bordes (`TECHO.x`, `TECHO.y`), así que sigue sola si el techo cambia.

Pestañas: Energía (placas y Powerwall), Agua (calentador, cisterna,
suavizador), Anker (portátil, E10, nevera EverFrost) y Roofing (plan de
sellado). La ficha de cada una da sus números; Roofing usa los precios de la
pantalla del cotizador de Sun Bot.

## 3. El apartamento (`src/apartamento.mjs`, `src/live-apartamento.js`)

- 72 × 84 (6.9 × 8 m), techo a 2.6 m, balcón al sur con baranda de vidrio:
  sala-cocina, alcoba y baño.
- Paredes, tabiques y techo se dibujan transparentes por defecto; "Ver
  adentro" (en la barra del zoom) los cierra (`data-paredes="cerradas"`). Lo
  dibujado en la cara (puertas, ventanas) va en la capa `sr-cara`.
- No hay nada arriba ni abajo: la unidad está sola sobre la base, por eso no
  se lee como un piso de un edificio.

## 4. Peso y tiempos (29-oct)

| | Casa | Apartamento |
| --- | --- | --- |
| HTML | 1.86 MB (399 KB comprimida) | 0.68 MB (161 KB comprimida) |
| Auditoría | 535 sólidos, 50 tubos, 8.1 s | 120 sólidos, 15 tubos, 1.1 s |
| Primer pintado en PC | unos 1 s (7,537 piezas SVG) | menos |

## 5. Lo que este cambio tiene que respetar

- Las reglas del kit: cada línea termina en algo, orden de pintado correcto,
  ningún tubo atraviesa nada.
- La marca (`windmar-ui-skill`): solo la paleta oficial, el naranja solo
  resalta (nunca relleno grande), nada de `#A6C3E6`, `#6D6E71`, `#A7A9AC` ni
  `#000000`; letra Montserrat.
- Tema claro y oscuro, día y noche, celular (12 tamaños) y táctil (44 px),
  movimiento reducido y lector de pantalla.
- Los números: los modelos de energía, agua y Anker y los precios de Roofing
  no cambian por dibujar la casa más grande.
