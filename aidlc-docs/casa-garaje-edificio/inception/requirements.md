# Requisitos — Casa más grande, garaje con Tesla, calle y edificio

> Pedido de Juan del 29-oct-2026 (tal cual en `audit.md`). Lo que existe hoy
> está en `reverse-engineering.md`. Las preguntas abiertas van al final, con la
> opción recomendada; las decisiones de Juan las reemplazan cuando contesta.

## 1. Negocio

El simulador sirve para enseñarle a un cliente **su casa con y sin Windmar**:
qué le pone Windmar, cómo trabaja durante el día y qué cambia en su factura, su
techo y su respaldo. Para eso la figura tiene que parecerse a una casa de
verdad en Puerto Rico:

- Las casas de los clientes suelen ser más largas que la de hoy (casi
  cuadrada), y en un techo más grande caben más placas: hoy el tope son 32
  lugares, y un cliente con consumo alto se queda corto.
- Una casa real tiene garaje y carro, y está en una calle. El carro eléctrico
  (Tesla) es además un cliente natural de las placas y la batería.
- El apartamento de hoy flota solo sobre la base; en un edificio de verdad hay
  pisos arriba y abajo.

## 2. Alcance

| Dentro | Fuera |
| --- | --- |
| La casa más grande y menos cuadrada, con más lugares para placas | Vecinos, otras casas o árboles de relleno: no se sale del contexto |
| Garaje pegado a la casa y un Tesla modelado a escala | Otros modelos de carro, salvo que Juan lo pida |
| Una calle con acera dentro de la base, con el poste de LUMA en la acera | Tráfico, peatones o animaciones de la calle |
| El apartamento como un piso de un edificio, con pisos arriba y abajo | Un edificio entero con todos sus pisos |
| Ver la casa del cliente con y sin Windmar (según P4) | Cambiar los modelos de energía, agua y Anker o los precios |

## 3. Requisitos funcionales

### RF-1 La casa más grande y menos cuadrada

1. La casa deja de ser casi cuadrada (forma según P1). La propuesta: un
   rectángulo alargado hacia el este, de unos 10 × 16 m.
2. El techo lleva más lugares para placas: de 32 a unos 48 (12 columnas × 4
   filas en la propuesta). La ficha de Energía y el aviso "caben N placas"
   usan el tope nuevo.
3. Todo lo que vive en el techo y en las fachadas se reacomoda: el aire, el
   calentador, la cisterna, los parches viejos, los charcos, la grieta, las
   manchas, el agua que escurre y las goteras. La obra de Roofing recorre el
   techo nuevo entero, y la lluvia sigue igual de clara con y sin sellar.
4. La base crece con la casa y el encuadre se ajusta: la casa se ve más
   grande en la tarjeta, no más chica, y nada se sale de ella.

### RF-2 Garaje y Tesla

1. Un garaje pegado a la casa (tipo según P2), con su portón. Si su techo es
   de concreto, se sella con el resto y puede llevar placas.
2. Un Tesla Model Y modelado a escala (unos 4.75 × 1.92 m, 1.6 m de alto),
   con su sombra de día y sus luces de noche.
3. Según P3, un cargador de pared (Wall Connector) en el garaje, con su
   conducto: cuando el carro carga, la energía corre de las placas o la
   batería al carro, y su consumo entra en la cuenta del mes.

### RF-3 La calle

1. Una calle con acera y encintado dentro de la base (lado según P6). La
   entrada del carro une el garaje con la calle.
2. El poste de LUMA va en la acera y su acometida sigue llegando al contador.
3. La calle no se sale de la tarjeta ni le roba tamaño a la casa.

### RF-4 El apartamento en un edificio

1. Con "Ver adentro" cerrado se ve el edificio: pisos abajo y arriba de la
   unidad del cliente (cuántos según P5), con sus balcones y ventanas, para
   que la unidad se lea como un piso de un edificio.
2. Con "Ver adentro" abierto los otros pisos se aclaran para ver adentro de
   la unidad, sin taparla.
3. La unidad del cliente sigue siendo la protagonista: no se achica en la
   tarjeta.

### RF-5 Con y sin Windmar (si P4 = A)

1. Un selector "Sin Windmar | Con Windmar" muestra la misma casa del cliente
   sin nada de Windmar (sin placas ni batería, techo sin sellar, todo de
   LUMA) y con lo que se escogió en las pestañas.
2. La ficha enseña la diferencia con números que ya existen: lo que se toma
   de LUMA, las horas de respaldo en un apagón y el techo con y sin sellar.
3. Cambiar de uno a otro se anima con un fundido de 200 a 300 ms, se anuncia
   al lector de pantalla y respeta el movimiento reducido.

### RF-6 Documentación y pruebas

README, capturas y estos documentos al día; las pruebas de siempre (auditoría,
líneas, 12 tamaños, claro y oscuro, táctil) más las de lo nuevo.

## 4. Requisitos no funcionales

| Id | Requisito |
| --- | --- |
| RNF-1 Rendimiento | La página de la casa no pasa de unos 2.3 MB de HTML (un 25 % más que hoy) ni de 1.5 s de primer pintado en PC; el carro y la calle con pocas piezas |
| RNF-2 Marca | Solo la paleta oficial: el Tesla en blanco con grises de la escala, el asfalto en `#4B4B4E`, la acera en `#E4E5E9` y `#C8C9CE`, las rayas de la calle en blanco; el naranja solo en el flujo de energía y lo que resalta |
| RNF-3 Accesibilidad | El lector de pantalla describe lo nuevo; todo control nuevo tiene nombre, se usa con teclado y mide 44 px con el dedo; contraste AA |
| RNF-4 Temas | Claro y oscuro, día y noche |
| RNF-5 Celular | Los 12 tamaños sin desborde; la casa más larga no queda diminuta a 390 px |
| RNF-6 Movimiento | Transiciones de 150 a 300 ms; respeta `prefers-reduced-motion` |
| RNF-7 Kit | La auditoría pasa, 0 líneas sueltas, orden de pintado correcto |
| RNF-8 Números | Los modelos y los precios no cambian por el dibujo, salvo el consumo del carro si P3 = A |

## 5. Guías de UX aplicadas (`ui-ux-pro-max`, alineadas con la marca)

- **Antes y después** es el patrón que más confianza da en servicios ("Trust &
  Authority"): por eso la recomendación de P4.
- **Una acción primaria por vista**: el selector con/sin no compite con las
  pestañas; va como un control segmentado con `aria-pressed`.
- **Fundido** (crossfade) para cambiar el contenido en el mismo lugar, sin
  mover el diseño.
- **Rendimiento**: experiencia inmersiva con presupuesto de peso y versión que
  funcione en celular.
- **No se usan** su paleta verde ni sus letras (Syncopate, Space Mono): manda
  la marca Windmar.

## 6. Decisiones de Juan (29-oct) — reemplazan las preguntas abiertas

| | Decisión |
| --- | --- |
| P1 | Rectángulo alargado, unos 10 × 16 m, 48 lugares para placas |
| P2 | Garaje cerrado pegado a la casa, con techo de concreto que lleva placas; el Tesla parqueado en la entrada |
| P3 | Con cargador de pared y su consumo en la cuenta |
| P4 | Selector "Sin Windmar \| Con Windmar" con la diferencia en la ficha |
| P5 | Por defecto (A): un piso abajo y uno arriba, en corte, que se aclaran con "Ver adentro" |
| P6 | Por defecto (A), pero el diseño propone cambiarla a B (calle al frente): ver `application-design.md` |

## 7. Preguntas abiertas (resueltas el 29-oct, se conservan como historia)

- **P1. Forma de la casa.** A) Rectángulo alargado hacia el este, unos 10 × 16
  m, 48 lugares para placas (recomendada). B) En L, con dos campos de placas.
- **P2. Garaje.** A) Cerrado, pegado a la casa, con techo de concreto que
  también lleva placas y el Tesla parqueado en la entrada (recomendada). B)
  Carport abierto con placas encima y el Tesla debajo. C) Cerrado con el Tesla
  adentro (se ve con "Ver adentro").
- **P3. El Tesla y la energía.** A) Con cargador de pared: la energía corre al
  carro cuando carga y su consumo entra en la cuenta (recomendada). B) Solo
  dibujado, sin cambiar los números.
- **P4. Con y sin Windmar.** A) Un selector "Sin Windmar | Con Windmar" con la
  diferencia en la ficha (recomendada). B) Como hoy: se arma producto por
  producto en las pestañas.
- **P5. Pisos del edificio.** A) Uno abajo y uno arriba, cortados en el borde
  de la tarjeta, que se aclaran con "Ver adentro" (recomendada). B) Dos abajo y
  dos arriba.
- **P6. La calle.** A) Del lado oeste, donde ya están el poste y el contador;
  la entrada del carro sale a esa calle (recomendada). B) Al frente (sur), con
  el poste movido a esa acera.
