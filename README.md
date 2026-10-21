# Figura Solar y Roofing

Figura interactiva que explica cómo funciona un sistema **Solar y Roofing de Windmar Home** en Puerto Rico: el techo sellado, las placas, el inversor, las baterías y el medidor de LUMA. Mueves la hora del día y la energía corre por los conductos hacia la casa, la batería o LUMA; el sol cruza el cielo, cada pieza echa su sombra y de noche sale la luna. Con el consumo de cada mes del cliente puedes sumar o quitar placas y baterías y ver cuánto cubren, y con la brújula de la base, cambiar hacia dónde miran las placas y ver cuánto sol les llega, con las mismas medidas que Aurora (TOF, acceso solar y TSRF).

**En línea:** https://figura-solar-y-roofing.vercel.app

![Cliente con 10 placas de 330 W, 8 nuevas y 4 Powerwall, con agosto en 950 kWh](docs/ejemplo-cliente.png)

## Qué se puede hacer

En pantalla ancha todo cabe en una sola pantalla: la casa a la izquierda, con todo el alto de la ventana, y el título y los controles a la derecha, con placas y baterías arriba. La ficha va al lado de la casa (en columna en una laptop, en una franja arriba en una pantalla más alta) y el reproductor del día flota en la esquina de abajo a la derecha, donde el dibujo no tiene nada. Solo se baja si se abre "Cómo leer la figura y de dónde salen los números" o la tabla de los 12 meses. En el teléfono la casa va primero, luego el reproductor, la ficha y los controles.

- **Correr el día como en un reproductor de música:** play y pausa, la barra de 24 horas (la franja clara es el sol, de 6:25 a 18:25) y tres velocidades: Normal (media hora cada 2 segundos), Rápido (una hora por segundo) y Súper rápido (tres horas por segundo). Al lado de la hora se lee lo que pasa en ese momento: kW de las placas, % de batería y kWh enviados a LUMA o tomados de LUMA en el día. También se salta de hora con las escenas (Madrugada, Mañana, Tarde, Noche) o con el teclado sobre la figura: flechas (con Mayús, de 3 en 3 horas) y la barra espaciadora para pausar. Pasar el mouse por encima ya no cambia la hora. Con el movimiento reducido del sistema el día no corre solo y queda la barra.
- **Escribir el consumo de cada mes**, como en la factura de LUMA: eliges un mes y escribes sus kWh, arrastras su barra en la gráfica o llenas los 12 meses de una vez. Con el promedio y el mes pico, la regla del cotizador de LUMA de Sun Bot sugiere las placas nuevas y las baterías.
- **Sumar y quitar:**
  - placas nuevas de 410 W;
  - placas que el cliente ya tiene, con sus vatios (330 W por defecto, como el cotizador);
  - de 0 a 4 Powerwall.

  Las placas caen al techo y se asientan, y las baterías entran deslizándose. Las que el cliente ya tenía se ven con vidrio claro. "Volver a lo sugerido" regresa a lo que dice el cotizador.
- **Cambiar hacia dónde miran las placas** con los ocho rumbos (N, NE, E, SE, S, SO, O, NO). La tarjeta de la brújula de la base gira y su marca fija, como la línea de fe de un barco, señala el rumbo; el sol, las sombras y la producción cambian con él.
- **Ver las sombras de cada momento:** las de la casa, el poste, el mástil, el aire, el equipo de la fachada y las mismas filas de placas, sobre la base, las paredes, el techo y las placas. Las caras que le dan la espalda al sol se oscurecen poco a poco.
- **Ver salir el sol y la luna:** el sol cruza el cielo detrás de la maqueta y, al ponerse, la tarjeta pasa del día a la noche y sale la luna llena. En tema claro la noche es azul oscuro; en tema oscuro, más azul todavía.
- **Leer la ficha** al lado de la casa: placas y kW, producción al mes y al año, rumbo e inclinación, el TSRF con su TOF y su acceso solar (como en Aurora), baterías y horas de respaldo de noche, cuánto cubren las placas el mes elegido y el año, y lo que sugiere el cotizador.
- **Comparar los 12 meses** en la gráfica: cada barra es el consumo del mes, en naranja lo que cubren las placas y en azul lo que viene de LUMA; la línea es la producción al mes.
- **Pasar a tema oscuro** y volver al claro. Los dos usan la paleta oficial de Windmar Home y la letra Montserrat.

![De noche, en tema oscuro: la batería alimenta la casa](docs/oscuro.png)

![A las 8 de la mañana el sol sale por el este: la casa le echa sombra a la base y a su fachada oeste, y las filas de placas, al techo](docs/manana-sombras.png)

![De noche la tarjeta se pone azul oscuro y sale la luna llena](docs/noche-luna.png)

<img src="docs/telefono.png" width="260" alt="En el teléfono: la casa, el reproductor y la ficha">



Las placas nuevas bajan al techo cuando se suman:

![Cuatro placas nuevas cayendo al techo, en cámara lenta](docs/placas-cayendo.png)

## Cómo correrlo

Solo hace falta Node 20 o más nuevo; no hay dependencias.

```bash
npm run build
```

Escribe `public/index.html`; ábrelo en el navegador.

```bash
npm run audit
```

Construye y además audita la geometría: que ningún conducto atraviese nada, que cada extremo llegue a una pieza y que el orden de pintado sea el correcto. Tiene que terminar en `audit passed`.

`npm run capture` y `npm run lines` sacan capturas y revisan que cada línea termine sobre algo; usan Google Chrome.

Cada subida a `main` se publica sola en Vercel (team jnsbstnprojects), que corre `node src/build.mjs` y sirve `public/`.

## Estructura

| Ruta | Qué es |
|---|---|
| `src/build.mjs` | Arma la figura: geometría, orden de pintado y la página |
| `src/model.mjs` | Regla de dimensionamiento y modelo de energía del día; corre en la construcción y en la página |
| `src/sol.mjs` | El sol y la luna del día, los rumbos de PVWatts, el año típico de PVGIS y lo que tapa el sol (acceso solar y forma del día); corre en la construcción y en la página |
| `src/live.js` | Lo que se mueve: el reproductor del día, el flujo de energía, placas y baterías que entran y salen, la brújula, el cielo, las sombras, ficha, gráfica, escenas y tema |
| `src/page.css` | Estilos de la página, con la paleta y la letra de la marca Windmar |
| `public/index.html` | La página construida, la que publica Vercel |
| `vendor/anatomy/` | Kit de figuras isométricas Anatomy, con su licencia MIT |
| `docs/` | Capturas |

## De dónde salen los números

Del cotizador de LUMA de Sun Bot (Windmar Home):

- Placa nueva QCells Q.PEAK DUO BLK ML-G10+ de 410 W. Las placas que el cliente ya tiene van a 330 W por defecto, como en el cotizador.
- 4.5 horas de sol pico en Puerto Rico (NREL), las mismas todo el año, y 0.82 de rendimiento. Una placa da sus vatios × 4.5 × 0.82 ÷ 1000 kWh al día: 1.51 kWh una de 410 W.
- La meta es el mayor entre 110 % del promedio de los 12 meses y el mes pico. Los kW necesarios son (meta ÷ 30) ÷ (4.5 × 0.82).
- A los kW necesarios se les restan los de las placas que ya tiene; lo que falta se cubre con placas de 410 W, redondeando hacia arriba.
- Powerwall de 13.5 kWh, que cubren la mitad del consumo diario, al menos uno. Con batería, el cotizador pide al menos 8 placas. Se pueden poner de 0 a 4.
- Las horas de respaldo son las de la herramienta Enseres: baterías × 13.5 ÷ consumo diario × 24, hasta 24 h.
- Techo con el sellado de silicona Gardner de los Planes de Sellado: imprimador Elasto Prime y una capa continua de silicona blanca, y Roof Patch en anclajes y penetraciones.

Con la factura de ejemplo (promedio de 600 kWh al mes y pico de 700 en agosto) salen 16 placas nuevas (6.56 kW) y un Powerwall, que producen 726 kWh al mes.

### Rumbo, sombras y las medidas de Aurora

El cotizador da la producción con las placas al sur y sin sombras. La figura la ajusta así:

- **Rumbo**, con [PVWatts v8](https://developer.nlr.gov/docs/solar/pvwatts/) de NREL (hoy NLR) para San Juan (año típico NSRDB PSM V3 tmy-2020), 1 kW a 10° de inclinación y pérdidas estándar de 14 %. En kWh por kW al año:

  | Rumbo | kWh/kW/año | Frente al sur |
  |---|---|---|
  | Sur (180°) | 1,613 | 100 % |
  | Sureste (135°) | 1,600 | 99 % |
  | Suroeste (225°) | 1,583 | 98 % |
  | Este (90°) | 1,554 | 96 % |
  | Oeste (270°) | 1,530 | 95 % |
  | Noreste (45°) | 1,498 | 93 % |
  | Noroeste (315°) | 1,481 | 92 % |
  | Norte (0°) | 1,467 | 91 % |

  Con el sur, la figura da lo mismo que el cotizador; con otro rumbo se multiplica por su porcentaje. El cotizador (4.5 h × 0.82) es más conservador que PVWatts (1,347 contra 1,613 kWh por kW al año), por eso PVWatts se usa solo como proporción.
- **Acceso solar** (Aurora): de todo el sol que le llegaría a cada placa en el año, directo en su plano más el difuso del cielo que ve, qué parte le llega con las sombras. Se calcula con el día típico de cada mes cada media hora, el sol directo y difuso del año típico de [PVGIS](https://re.jrc.ec.europa.eu/pvg_tools/en/) (base PVGIS-NSRDB) y las piezas del dibujo que pueden tapar el sol: el aire, el tubo de ventilación, el mástil, el poste, las cajas de fila y las otras placas. En este techo da casi 100 %: lo que hay está lejos o es bajo.
- **TOF** (Aurora): el sol que recibe el plano de las placas frente al mejor plano de San Juan, sur a unos 17° (la curva por PVWatts a 0°, 10° y 15° llega a 5.889 kWh/m² al día). El sur a 10° da 99 %.
- **TSRF** (Aurora): TOF × acceso solar.
- La producción de la ficha y de la gráfica es la del cotizador por el rumbo y por el acceso solar. En el día, la producción sigue al sol directo y difuso de marzo y septiembre (PVGIS) sobre el plano de las placas, menos lo que tapan las sombras.

**Supuestos del dibujo**, que no vienen del cotizador:

- El reparto del consumo por hora.
- La reserva de batería del 20 % y la batería sin pérdidas.
- El sol del equinoccio (sale 6:25, se pone 18:25) con la luna llena de esa noche. El mes se cuenta de 30 días, como en el cotizador.
- El sol y la luna se dibujan en el cielo detrás de la maqueta para que no tapen la casa: el lado por donde salen y su altura son los de verdad. Las sombras salen de formas simples (cajas, cilindros y las placas); los tubos y los anillos se oscurecen enteros, por pedazos.
- Las placas que ya tenía se dibujan del mismo tamaño que las nuevas, y en el techo caben 32.
- El inversor se dibuja más grande que en la realidad para que se lea. El Powerwall 3 trae el inversor integrado; aquí se dibuja aparte para que se vea.

La figura no muestra dinero.

## Créditos

Hecha con el kit [Anatomy](https://github.com/wheresryan22/anatomy) (MIT, © 2026 Ryan), incluido en `vendor/anatomy` con su licencia.
