# AI-DLC — Casa más grande, garaje con Tesla, calle y edificio

> Funcionalidad nueva sobre un sistema en producción (brownfield): el
> Simulador de servicios, en https://simulador-hogar-windmar.vercel.app
> (`9de875d`). Pedido de Juan del 29-oct-2026 (ver `audit.md`).

**Estado global:** Construction terminada. U1 a U5 aprobadas por Juan ("Sí,
sigue con U2" y "Sí, sigue con U3" el 30-oct; "Sí, sigue con U4", "Sí, sigue
con U5" y "Sí, déjala" —la sombra del balcón de arriba— el 2-nov); U6 hecha:
falta que Juan pida el commit y el push. Juan aprobó el diseño el 30-oct
("Sí, empieza U1"), con P6 en B y P7 como se propuso.

## Inception

| Paso | Estado | Artefacto |
| --- | --- | --- |
| Lo que pidió Juan, tal cual | Hecho | `audit.md` |
| Detección del espacio de trabajo | Hecho: brownfield, sin AI-DLC previo | `audit.md` |
| Reverse engineering (un archivo) | Hecho | `inception/reverse-engineering.md` |
| Requisitos y preguntas | Aprobado con P1 a P4 (29-oct); P5 por defecto; P6 cambia a B en el diseño | `inception/requirements.md` |
| Diseño de la aplicación y unidades de trabajo (U1 a U6) | Aprobado (30-oct), con P6 en B y P7 como se propuso | `inception/application-design.md` |

## Construction

Pendiente. Cada unidad se construye, se prueba (auditoría, líneas, 12
tamaños, claro y oscuro, táctil) y se le enseña a Juan antes de la siguiente.

| Unidad | Qué | Estado |
| --- | --- | --- |
| U1 | La casa alargada con 48 lugares | Aprobada por Juan (30-oct) |
| U2 | Garaje, Tesla, entrada, acera y calle | Aprobada por Juan (30-oct) |
| U3 | Cargador y consumo del Tesla | Aprobada por Juan (2-nov) |
| U4 | Sin / Con Windmar | Aprobada por Juan (2-nov) |
| U5 | El apartamento en un edificio | Aprobada por Juan (2-nov), con la sombra del balcón de arriba |
| U6 | README, capturas y documentos | Hecha (2-nov); falta el push, cuando Juan lo pida |

### U1 — pasos

- [x] Alargar la casa y la base 45.6 hacia el este (4 columnas de placas): paredes, zócalo, losa, capas del techo y base (`ALARGUE` en `build.mjs`)
- [x] Placas: 12 columnas × 4 filas; `LIMITES.placas` a 48; los tubos del calentador ya no tienen fijos los lugares `s28`–`s31` (salen de `ROWS * COLS`)
- [x] Reacomodar lo del techo y las fachadas: dos parches viejos y dos charcos pasan al tramo nuevo (siguen 10 de cada uno), un hilo de lluvia más hasta la gárgola sur, una ventana en el tramo nuevo de la fachada sur (en U2 será el garaje) y el rótulo de la base con el extremo este
- [x] Probar: auditoría pasa (649 sólidos, 16.8 s); 0 líneas sueltas en todos los estados (16, 48 y 44 placas, Roofing sellado, sin sellar, aguacero, obra, noche oscura, celular); números de Energía, Agua y Anker iguales salvo 1 a 7 kWh al año y una décima de TSRF o de acceso, porque las placas quedan en otros lugares respecto a lo que les da sombra; la obra termina con todo abajo; 12 tamaños sin desborde; consola limpia
- [x] Medir el dibujo en la tarjeta: la casa sale MÁS grande, no más chica (paredes de 580 × 430 px contra 545 × 409); la página pesa 2.03 MB (antes 1.86, tope 2.3)
- [x] Capturas para Juan (antes y después, 48 placas, con el calentador)

Para U6 (README): "en el techo caben 32" pasa a 48, y la casa de 10 × 16 m.

### U2 — pasos

- [x] La base sigue al sur hasta la calle (`FRENTE` = 95); el rótulo vuelve a su lugar, bajo la caída de la gárgola
- [x] El portón seccional del garaje en el extremo este de la fachada sur, sobre el zócalo, con una rampa corta (cortar el zócalo dejaba un ciclo de orden de pintado)
- [x] La entrada de concreto con sus juntas, la acera con su encintado y un carril de la calle con su raya blanca, cortado en el borde de la base; los tres reciben sombra
- [x] El Tesla Model Y a escala en `src/carro.mjs`: carrocería y cabina de vidrio (prismas convexos de su perfil), cuatro ruedas por fuera de los costados, huecos, puertas, manijas, espejo, reflejo y faros que se prenden de noche; dueño "tesla" para la auditoría; echa y recibe sombra
- [x] Colores de marca en `page.css`: vidrio con la receta azul de los colectores, asfalto de la escala gris, raya y faros blancos (el naranja no se usó)
- [x] El lector de pantalla y la leyenda nombran el garaje, el Tesla, la acera y la calle, y la casa de 10 × 16 m con 48 placas
- [x] Probar: auditoría pasa (659 sólidos); 0 líneas sueltas en todos los estados; 12 tamaños sin desborde; celular; noche oscura; consola limpia; 1.98 MB
- [x] Números: iguales a producción con ±1 kWh al mes por la nueva posición de las placas. Ojo para las pruebas: la ficha anima sus números, hay que esperar unos 4 s después de cada cambio antes de leerla
- [x] Capturas para Juan

La escena creció, así que la casa sale más chica en la tarjeta que en U1: las paredes miden 499 × 370 px, contra 580 × 430 en U1 y 545 × 409 en producción. El zoom sigue para acercar. El Tesla va a escala real.

### U3 — pasos

- [x] Modelo (`model.mjs`): `CARRO` (0.18 kWh por km, 40 km por defecto, de 0 a 150 de 10 en 10, y los dos horarios de 4 horas: con el sol de 11 a 3 y de noche de 10 a 2) y `kwhCarroMes`; `simulate` reparte la carga del día en su bloque (que puede cruzar la medianoche) y cada fila dice cuánto va al carro
- [x] El consumo de cada mes es la factura más el carro: la sugerencia del cotizador, la ficha ("usa"), las barras, la tabla y el lector de pantalla; las horas de respaldo siguen siendo las de la casa sola
- [x] Paso 3 de Energía: "Factura de" en la fila del mes, "Carro eléctrico, km al día" con − y + y los kWh al mes al lado, y "Lo carga: Con el sol | De noche" (botones de una sola escogida, con flechas)
- [x] La gráfica: al arrastrar una barra o usar las flechas cambia la factura; la barra no baja de lo del carro
- [x] El dibujo: el Wall Connector al este del portón, la caja de paso, el conducto bajo el alero y el cable al puerto de carga; la energía corre por el conducto y el cable solo mientras carga (canal `carro`), y lo que entra a la casa ya no cuenta lo del carro
- [x] Textos: el pie de figura (el consumo del carro, sus supuestos y el ejemplo con el carro), la leyenda del lector de pantalla, lo que se anuncia y la explicación de cada hora (la casa y el carro); el ventilador del aire sigue solo a la casa
- [x] Probar: auditoría pasa (661 sólidos); 0 líneas sueltas (Energía, Roofing, noche, Agua; escritorio y celular); 12 tamaños sin desborde; consola limpia; 2.05 MB
- [x] Números: con 0 km iguales a producción (726 kWh al mes, 16 placas y 1 Powerwall); con 40 km, 216 kWh más al mes, 916 en agosto, 21 placas y 2 Powerwall; con 150 km, 35 placas; el flujo al carro solo en su horario (con el sol de 11 a 3; de noche de 10 a 2, también después de medianoche; nada con 0 km)
- [x] Capturas para Juan (vista, paso 3, con el sol, de noche y tema oscuro)

### U4 — pasos

- [x] Arriba de las pestañas, "Sin Windmar | Con Windmar" (botones con `aria-pressed`, como la velocidad del día); por defecto "Con Windmar", que es lo de hoy
- [x] Sin Windmar: lo escogido se guarda y la escena queda sin nada de Windmar (sin placas, baterías ni caseta, sin los productos de las pestañas y con el techo de antes, sin sellar); el día es sin placas ni baterías, así que la casa y el carro toman todo de LUMA. Con Windmar vuelve todo como estaba, sin la obra del sellado
- [x] El inversor, su salida al panel, la T y el conducto de las placas ahora se ven solo con sistema (el inversor con placas o baterías; lo de las placas, con la primera fila), también en "Con Windmar" con 0 placas y 0 baterías
- [x] La ficha que compara, en cualquier pestaña: de LUMA en el mes y en el año, en un apagón, la luz del agua caliente, si corta la AAA y el techo; cada celda dice lo de hoy y debajo "Con Windmar:" con lo escogido, o lo que falta
- [x] Los pasos de las pestañas se quedan quietos (`inert`, apagados) con lo que lleva con Windmar, con una nota arriba que lo explica; las pestañas siguen, y el aguacero también, para ver por dónde se mete el agua sin sellar
- [x] El cambio va con un fundido de 125 + 125 ms del dibujo y la ficha (sin él con el movimiento reducido), se anuncia al lector de pantalla y el foco se queda en el botón
- [x] Textos: la leyenda del lector de pantalla, "Cómo leer la figura" y el pie de figura (qué compara la ficha y de dónde salen sus números); el reproductor dice "sin Windmar · usa … · de LUMA …"
- [x] Probar: auditoría pasa (661 sólidos); 0 líneas sueltas en Con, Sin, Sin con aguacero, de noche, de vuelta a Con y Sin en Agua, en escritorio y celular; 12 tamaños sin desborde ni celdas cortadas; consola limpia; teclado (lo quieto no se enfoca); 2.07 MB
- [x] Números: los de "Con Windmar" iguales a U3 (con 0 km, 726 kWh al mes, 16 placas y 1 Powerwall; con 40 km, 953, 21 y 2); sin Windmar, 916 kWh de LUMA en agosto y 9,792 en el año, contra 0 con Windmar; con el calentador y la cisterna que sugiere Agua, 185 contra 11 kWh al mes para el agua caliente y 3.0 días de agua
- [x] Capturas para Juan (con y sin, el aguacero con y sin, el panel, celular claro y oscuro)

### U5 — pasos

- [x] Sin base: la unidad queda en su edificio; la brújula pasa al piso del balcón (en la punta oeste, lejos de las placas y su cable) y el rótulo se va
- [x] El piso de arriba, igual a este y vacío (`apartamento.mjs`): sus cuatro paredes sobre el techo de la unidad, con la puerta del balcón y las ventanas, y su balcón encima del de la unidad, con baldosas, baranda de vidrio y pasamanos
- [x] El piso de abajo, detrás de todo (nada suyo tapa la unidad): sus caras del sur y del oeste, con su puerta y sus ventanas, y su baranda
- [x] Los dos se desvanecen con la altura: una máscara por plano de pared con un degradado que sigue la z de ese plano (arriba, lleno hasta la baranda y nada a 2.5 m; abajo, lleno hasta 40 cm bajo el piso y nada a 2.5 m), así ningún corte queda a la vista
- [x] "Ver adentro" (como arranca) aclara los otros pisos al 25 %; cerrado se ven enteros (`data-otro` y `--sr-otros` en page.css). Con "Ver adentro", las paredes de arriba no echan sombra en el dibujo, como las de la unidad
- [x] El encuadre toma la unidad y el balcón, de 1.5 m abajo a 1 m arriba: el lienzo pasa de 760 × 586 a 760 × 705 y la unidad sale más grande en todos los tamaños (en escritorio, 699 × 394 px contra 655 × 369; en el celular, 289 × 163 contra 237 × 133)
- [x] Textos: la leyenda del lector de pantalla, "Cómo leer la figura", la leyenda de "Ver adentro" y el pie (que decía que el balcón se dibujaba sin piso arriba)
- [x] Probar: auditoría pasa (139 sólidos); 0 líneas sueltas abierto, cerrado, de noche, en Agua y otra vez abierto, en escritorio y celular; 12 tamaños sin desborde ni celdas cortadas; consola limpia; 0.76 MB
- [x] Números: Agua igual. En el Anker cambia solo "Del sol", porque el balcón de arriba les da sombra a las placas: al sur 3.0 kWh al día contra 3.9 en producción (−23 %), al este 2.7 contra 3.4, al oeste 2.4 contra 3.2, al sureste 2.9 contra 3.8, al suroeste 2.8 contra 3.6 y al norte 1.2 contra 2.7 (−56 %). Las horas sin LUMA no cambian. **Juan decide si se queda (lo de un edificio de verdad) o se quita**
- [x] Capturas para Juan (antes y ahora, abierto y cerrado, de noche, tema oscuro y celular)

Aparte, de antes de U5: en el celular, la línea del reproductor del apartamento ("PS400 … · lo esencial … · Anker …") ya salía cortada en producción (arreglado en U6).

### U6 — pasos

- [x] README: la casa de 10 × 16 m con 48 lugares, el garaje, el Tesla y la calle; el carro eléctrico en la factura y su carga; "Sin y con Windmar"; el apartamento en su edificio; la gráfica y la ficha con el carro; el área de Roofing (abre en los 1,250 pies² del cotizador; la casa dibujada mide unos 1,700); el ejemplo (21 placas y 2 Powerwall con el carro; 16 y 1 sin él); los apartados "El carro eléctrico" y "Sin y con Windmar"; los números del Anker del apartamento con el balcón de arriba; la estructura (`carro.mjs`, `aidlc-docs/`)
- [x] Las 18 capturas de `docs/` retomadas con los mismos guiones (la de las placas cayendo, con su recorte nuevo, y el ejemplo a las 2:30, con el Tesla cargando) y tres nuevas: `sin-windmar.png`, `carro-cargando.png` y `apartamento-edificio.png`; los textos de cada una revisados contra lo que se ve (la Hércules de la tarde ahora baja el TSRF 0.1)
- [x] El pie de figura y "Cómo leer la figura" de la casa con el carro y el área
- [x] En el celular, la línea del reproductor del Anker (casa y apartamento) en corto: "0.4 kW · esencial 0.2 kW · bat. 25 %"; ya no se corta en 375, 390 ni 414 px
- [x] Probar: auditoría pasa en las dos figuras; las 21 imágenes que cita el README existen y ninguna sobra; consola limpia en todos los guiones

## Lo que queda pendiente para después

- Si el área de Roofing debe abrir en el tamaño de la casa dibujada (unos 1,700 pies²) en vez de los 1,250 del cotizador: cambia el precio de ejemplo de la ficha. Por ahora abre en 1,250, como el cotizador.

Lo que cambia para quien abre la página: el ejemplo trae el carro de 40 km, así que el cotizador sugiere 21 placas y 2 Powerwall, no 16 y 1. Para U6 (README): el carro y su cargador, y el ejemplo con el carro. El pie dice que el techo mide unos 1,250 pies² (el promedio del cotizador, que es el área por defecto de Roofing); la casa de 10 × 16 m mide unos 1,720: decidir en U6 si se dice así o se cambia el área.

## Operations

| Paso | Estado |
| --- | --- |
| Commit y push (solo cuando Juan lo pida) | Hecho el 2-nov, a pedido de Juan ("Sí, súbelo") |
| Deploy verificado en producción | Se verifica al subir (va en `audit.md`) |

## Puntos de aprobación de Juan

1. Las respuestas a las preguntas y los requisitos.
2. El diseño y el orden de las unidades.
3. Cada unidad terminada, con capturas.
4. El push.
