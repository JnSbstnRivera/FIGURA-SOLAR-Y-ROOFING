# Audit — Casa más grande, garaje con Tesla, calle y edificio (Simulador de servicios)

Registro de AI-DLC: lo que dijo Juan, tal cual y sin resumir, y cada respuesta,
pregunta y aprobación, por fecha. Se agrega al final; nunca se reescribe.

---

## 2026-10-29 — Pedido inicial (Juan)

**Entrada de Juan (tal cual):**

> podemos hacer la casa mas grande y no tan cuadrada para que poamos poner mas
> placas ? y el apartamento mas real cuando le demos no ver nada que se vea pisos
> arriba y abajo para simular un edificio y adicional la casa si puedes con
> garaje y un vehiculo tesla modelado que se vea mas grande y una calle pero sin
> salirse el contexto, /ui-ux-pro-max  /windmar-ui-skill  recuerda siempre
> planificarlo col SDD y AI DLC para que quede super bien y simular
> perfectamente la casa de un cliente con y sin windmar vamos bien

**Respuesta (Claude):** se arranca AI-DLC por funcionalidad, como en Sun Bot
(`aidlc-docs/<tema>/`, sin copiar el core-workflow como CLAUDE.md). Se cargaron
las dos skills que nombró: `windmar-ui-skill` (paleta oficial y reglas de color
para lo nuevo) y `ui-ux-pro-max` (patrón antes/después, accesibilidad,
rendimiento; su paleta verde y sus letras no aplican: manda la marca Windmar).

**Contexto:** Inception — detección del espacio de trabajo.

---

## 2026-10-29 — Detección del espacio de trabajo (Claude)

Sistema existente (brownfield), en producción en
https://simulador-hogar-windmar.vercel.app (último commit `9de875d`). No había
`aidlc-docs/`: toca el paso de reverse engineering, en UN solo archivo
(`inception/reverse-engineering.md`), porque Juan pidió no llenarse de
markdowns.

**Contexto:** Inception — workspace detection y reverse engineering.

---

## 2026-10-29 — Inception escrita (Claude)

Escritos `inception/reverse-engineering.md` y `inception/requirements.md`, con
las preguntas P1 a P6 y la opción recomendada en cada una. Se le preguntan a
Juan P1 a P4 (las que cambian el diseño); P5 y P6 van con la propuesta por
defecto hasta que diga otra cosa.

**Contexto:** Inception — requisitos, esperando respuestas.

---

## 2026-10-29 — Respuestas de Juan a P1–P4

Preguntas hechas con opción múltiple (la recomendada primero); Juan escogió:

| Pregunta | Respuesta de Juan |
| --- | --- |
| P1. Forma de la casa | Rectángulo alargado (Recomendado): unos 10 × 16 m, 48 lugares para placas |
| P2. Garaje | Cerrado, carro afuera (Recomendado): garaje pegado a la casa con portón y techo de concreto con placas; el Tesla en la entrada |
| P3. El Tesla y la energía | Con cargador y consumo (Recomendado) |
| P4. Con y sin Windmar | Selector Sin / Con Windmar (Recomendado) |

P5 (pisos del edificio) y P6 (lado de la calle) quedan con la propuesta por
defecto hasta que Juan diga otra cosa; el diseño explica por qué P6 conviene
cambiarla.

**Contexto:** Inception — requisitos aprobados por las respuestas; sigue el
diseño de la aplicación.

---

## 2026-10-29 — Diseño y unidades escritos (Claude)

Escrito `inception/application-design.md`: la casa de 10 × 16 m con el garaje
dentro del rectángulo (extremo este, portón al sur) y 48 lugares; el Tesla en
la entrada con la cola al cargador; la calle al frente (propone cambiar P6 a
B, porque el garaje abre al sur y el oeste lo ocupa el equipo de LUMA); el
consumo del carro por km al día (P7, por confirmar: se suma a la factura); el
selector Sin / Con Windmar; el edificio del apartamento en corte; seis
unidades, U1 primero y sola. Se le pide a Juan que lo apruebe para arrancar
U1.

**Contexto:** Inception — diseño de la aplicación y unidades, esperando
aprobación.

---

## 2026-10-30 — Aprobación del diseño (Juan)

**Entrada de Juan (tal cual):**

> Sí, empieza U1

**Respuesta (Claude):** el diseño queda aprobado con P6 en B (calle al
frente) y P7 como se propuso (el carro se suma a la factura por km al día).
Arranca la Construction con U1, la casa alargada con 48 lugares; su lista de
pasos va en `aidlc-state.md`.

**Contexto:** fin de la Inception; Construction, U1.

---

## 2026-10-30 — U1 construida y probada (Claude)

La casa pasa de 10 × 11 m a 10 × 16 m hacia el este, con 48 lugares para
placas (12 × 4); el equipo de la fachada oeste no se movió. La auditoría pasa,
0 líneas sueltas en todos los estados, 12 tamaños sin desborde y los números
iguales salvo diferencias de 1 a 7 kWh al año por la nueva posición de las
placas. La casa sale más grande en la tarjeta. Detalle en `aidlc-state.md`.
Se le enseñan a Juan las capturas para seguir con U2.

**Contexto:** Construction — U1, esperando la revisión de Juan.

---

## 2026-10-30 — Aprobación de U1 (Juan)

**Entrada de Juan (tal cual):**

> Sí, sigue con U2

**Respuesta (Claude):** U1 queda aprobada. Arranca U2: el garaje, el Tesla,
la entrada, la acera y la calle.

**Contexto:** Construction — U1 aprobada; U2 en curso.

---

## 2026-10-30 — U2 construida y probada (Claude)

El garaje con su portón y una rampa, la entrada con un Tesla Model Y a escala
(`src/carro.mjs`), la acera y la calle, dentro de la base. La auditoría pasa,
0 líneas sueltas, 12 tamaños sin desborde y los números iguales a producción
(±1 kWh al mes). La casa sale un 9 % más chica en la tarjeta que en
producción, porque la escena creció. Detalle en `aidlc-state.md`. Se le
enseñan a Juan las capturas para seguir con U3.

**Contexto:** Construction — U2, esperando la revisión de Juan.

---

## 2026-10-30 — Aprobación de U2 (Juan)

**Entrada de Juan (tal cual):**

> Sí, sigue con U3

**Respuesta (Claude):** U2 queda aprobada. Arranca U3: el cargador del Tesla,
su conducto con el flujo de energía y su consumo en la cuenta del mes.

**Contexto:** Construction — U2 aprobada; U3 en curso.

---

## 2026-10-30 — U3 construida y probada (Claude)

El carro eléctrico se suma a la factura de cada mes por km al día (40 por
defecto, 216 kWh al mes) y se carga con el sol (de 11 a 3) o de noche (de 10
a 2); el Wall Connector va al este del portón, con su caja de paso, su
conducto bajo el alero y el cable al puerto de carga, y la energía corre por
ahí solo mientras carga. La auditoría pasa, 0 líneas sueltas, 12 tamaños sin
desborde; con 0 km los números son los de producción, y con 40 km el
cotizador sugiere 21 placas y 2 Powerwall en vez de 16 y 1. Dos ajustes al
diseño, anotados en `application-design.md`: el circuito sale por una caja
de paso en la fachada sur, no desde el panel a la vista, y la línea del
reproductor no habla del carro porque no cabe. Detalle en `aidlc-state.md`.
Se le enseñan a Juan las capturas para seguir con U4.

**Contexto:** Construction — U3, esperando la revisión de Juan.

---

## 2026-11-02 — Aprobación de U3 (Juan)

**Entrada de Juan (tal cual):**

> Sí, sigue con U4

**Respuesta (Claude):** U3 queda aprobada. Arranca U4: el selector Sin / Con
Windmar, la casa sin nada de Windmar y la ficha que compara.

**Contexto:** Construction — U3 aprobada; U4 en curso.

---

## 2026-11-02 — U4 construida y probada (Claude)

"Sin Windmar | Con Windmar" arriba de las pestañas. Sin Windmar enseña la
misma casa sin placas, inversor, baterías ni productos y con el techo sin
sellar, toda la luz de LUMA; la ficha compara seis cosas con lo que se
escogió (de LUMA en el mes y en el año, apagón, agua caliente, AAA y techo).
Los pasos quedan quietos salvo el aguacero, y Con Windmar vuelve todo como
estaba. La auditoría pasa, 0 líneas sueltas en todos los estados, 12 tamaños
sin desborde y los números de "Con Windmar" iguales a U3. Ajustes al diseño
anotados en `application-design.md`. Detalle en `aidlc-state.md`. Se le
enseñan a Juan las capturas para seguir con U5.

**Contexto:** Construction — U4, esperando la revisión de Juan.

---

## 2026-11-02 — Aprobación de U4 (Juan)

**Entrada de Juan (tal cual):**

> Sí, sigue con U5

**Respuesta (Claude):** U4 queda aprobada. Arranca U5: el apartamento en su
edificio, con un piso arriba y uno abajo en corte.

**Contexto:** Construction — U4 aprobada; U5 en curso.

---

## 2026-11-02 — U5 construida y probada (Claude)

El apartamento sin base, en su edificio: el piso de arriba con su balcón
encima del de la unidad y la parte baja de sus paredes, el de abajo con la
parte alta de sus paredes, su puerta, sus ventanas y su baranda; los dos se
desvanecen con la altura y "Ver adentro" los aclara al 25 %. La brújula pasa
al balcón y el rótulo se va. La auditoría pasa, 0 líneas sueltas, 12
tamaños sin desborde y la unidad más grande en la tarjeta. El agua no cambia;
el balcón de arriba les da sombra a las placas y "Del sol" baja de 3.9 a 3.0
kWh al día con el balcón al sur. Se le enseñan a Juan las capturas y se le
pregunta si esa sombra se queda.

**Contexto:** Construction — U5, esperando la revisión de Juan.

---

## 2026-11-02 — Aprobación de U5 (Juan)

Pregunta: "¿Dejo la sombra del balcón de arriba sobre las placas y sigo con
U6?"

**Entrada de Juan (tal cual):**

> Sí, déjala

**Respuesta (Claude):** U5 queda aprobada con la sombra del balcón de arriba
(lo de un edificio de verdad). Arranca U6: el README, sus capturas y los
documentos al día; además, la línea del reproductor del apartamento que se
corta en el celular, anotada para U6.

**Contexto:** Construction — U5 aprobada; U6 en curso.

---

## 2026-11-02 — U6 hecha (Claude)

El README al día con todo lo nuevo, sus 18 capturas retomadas y tres más
(sin Windmar, el Tesla cargando de noche y el edificio), el pie de figura de
la casa y la línea del reproductor del Anker en el celular, que ya no se
corta. La auditoría pasa en las dos figuras. Queda pendiente, si Juan
quiere, que el área de Roofing abra en el tamaño de la casa dibujada. Se le
pregunta a Juan si sube todo a producción.

**Contexto:** Construction terminada; Operations — esperando que Juan pida
el commit y el push.

---

## 2026-11-02 — Push aprobado (Juan)

Pregunta: "¿Hago commit y push a producción y verifico el deploy?"

**Entrada de Juan (tal cual):**

> Sí, súbelo

**Respuesta (Claude):** commit a `main` con todo lo de U1 a U6 y push; se
verifica el deploy de Vercel y se prueban las dos páginas en producción.

**Contexto:** Operations — commit, push y verificación.

---
