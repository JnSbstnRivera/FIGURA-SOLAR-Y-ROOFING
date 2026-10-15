# Figura Solar y Roofing

Figura interactiva que explica cómo funciona un sistema **Solar y Roofing de Windmar Home** en Puerto Rico: el techo sellado, las placas, el inversor, las baterías y el medidor de LUMA. Mueves la hora del día y la energía corre por los conductos hacia la casa, la batería o LUMA. Con el consumo de cada mes del cliente puedes sumar o quitar placas y baterías y ver cuánto cubren.

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
- **Leer la ficha** al lado de la casa: placas y kW, producción al mes, baterías, horas de respaldo de noche, cuánto cubren las placas el mes elegido y el año, y lo que sugiere el cotizador.
- **Comparar los 12 meses** en la gráfica: cada barra es el consumo del mes, en naranja lo que cubren las placas y en azul lo que viene de LUMA; la línea es la producción al mes.
- **Pasar a tema oscuro** y volver al claro. Los dos usan la paleta oficial de Windmar Home y la letra Montserrat.

![De noche, en tema oscuro: la batería alimenta la casa](docs/oscuro.png)

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
| `src/live.js` | Lo que se mueve: el reproductor del día, el flujo de energía, placas y baterías que entran y salen, ficha, gráfica, escenas y tema |
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

**Supuestos del dibujo**, que no vienen del cotizador:

- El reparto del consumo por hora.
- La reserva de batería del 20 % y la batería sin pérdidas.
- El sol del equinoccio (sale 6:25, se pone 18:25) y la forma de la curva de producción. El mes se cuenta de 30 días, como en el cotizador.
- Las placas que ya tenía se dibujan del mismo tamaño que las nuevas, y en el techo caben 32.
- El inversor se dibuja más grande que en la realidad para que se lea. El Powerwall 3 trae el inversor integrado; aquí se dibuja aparte para que se vea.

La figura no muestra dinero.

## Créditos

Hecha con el kit [Anatomy](https://github.com/wheresryan22/anatomy) (MIT, © 2026 Ryan), incluido en `vendor/anatomy` con su licencia.
