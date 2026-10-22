// El apartamento: lo propio de su página. No tiene placas en el techo ni el sistema del cotizador de LUMA: su energía
// es la del Anker, con sus PS400 en el balcón, y su ficha dice lo del Anker y lo del agua. Va después de live.js (lo
// común), que llama a sus ganchos (ESCENA_VIVA), y termina arrancando la página.

// ---------- ficha ----------
const F = Object.fromEntries([...document.querySelectorAll("[data-f]")].map((el) => [el.dataset.f, el]));
function updateFicha() {
  const m = modeloDe(S.escogido, "anker");
  const r = rumboDe(S.rumbo);
  const cis = cisternaDe(S.escogido);
  const ro = potableDe(S.escogido);
  const n = S.agua.personas;
  const textos = {
    anker: m ? m.corto : "Sin Anker",
    ankerKwh: m ? `${fmt(m.kwh, 2)} kWh · ${fmt(m.kw, m.kw % 1 ? 1 : 0)} kW` : "lo esencial va de LUMA",
    ps: m ? `${fmt(placasAnker() * kwPlacaDe(respaldoDe()), 1)} kW` : "—",
    psN: m ? `${placasAnker()} de ${conPs200(m, S.escogido) ? 200 : 400} W en el balcón` : "sin placas PS400",
    rumbo: `${r.nombre} · ${r.az}°`,
    inclin: "PS400 a 40°",
    sol: m && anker ? `${fmt(anker.solDia, 1)} kWh` : "—",
    solDe: m && anker ? `de los ${fmt(anker.esencialDia, 1)} de lo esencial` : "sin Anker",
    horas: m && anker ? `${Math.round(anker.horas)} h` : "—",
    horasDe: m ? "con la batería sola" : "sin Anker",
    personas: String(n),
    uso: `${galones(agua.usoDia)} al día`,
    cisterna: cis ? cis.nombre : "Sin cisterna",
    reserva: cis ? (agua.reserva >= 1 ? `alcanza para ${fmt(agua.reserva, 1)} ${agua.reserva === 1 ? "día" : "días"}` : `alcanza para unas ${Math.max(1, Math.round(agua.reserva * 24))} horas`) : "sin reserva de agua",
    osmosis: ro ? ro.corto : "Sin ósmosis",
    beber: ro ? `${galones(agua.potableDia)} de beber al día` : "agua de la llave",
  };
  for (const [key, texto] of Object.entries(textos)) if (F[key] && F[key].textContent !== texto) F[key].textContent = texto;
  if (rumboV) rumboV.textContent = `${r.nombre} · ${r.az}°`;
}

// ---------- textos ----------
// Lo que pasa en este momento: del Anker (de dónde sale lo esencial) y, si hay, la cisterna.
function explain(h) {
  const a = ankerEn(h);
  const w = aguaEn(h);
  let what;
  if (!a) what = "sin Anker, lo esencial va de LUMA";
  else if (a.luma > 0.005) what = a.ps400 > 0.005 ? "las PS400 no alcanzan y la batería del Anker está en su reserva: lo que falta de lo esencial viene de LUMA" : "la batería del Anker llegó a su reserva y lo esencial toma de LUMA";
  else if (a.ps400 >= a.esencial - 0.005) what = a.puede > a.esencial + 0.005 && a.soc < 0.995 ? "las PS400 cubren lo esencial y cargan el Anker" : "las PS400 cubren lo esencial";
  else if (a.ps400 > 0.005) what = "las PS400 ya no alcanzan y la batería del Anker completa lo que falta";
  else what = "no hay sol: el Anker mantiene lo esencial";
  const numeros = a ? ` PS400 ${fmt(a.ps400, 2)} kW, lo esencial ${fmt(a.esencial, 2)} kW, Anker ${Math.round(a.soc * 100)} %` : "";
  const cis = cisternaDe(S.escogido) ? `; cisterna ${Math.round(w.nivel * 100)} %` : "";
  return `${clock(h)} · ${what}.${numeros}${cis}.`;
}

// ---------- lo del apartamento que llama live.js ----------
const ESCENA_VIVA = {
  // no hay placas del techo ni baterías que tapen el sol
  puestas: () => [0, 0],
  recompute() {},
  targets() {},
  actualiza: () => updateFicha(),
  // sin sistema de placas: la energía de cada momento es la del Anker
  muestra: () => null,
  dibuja() {},
  dice: () => "",
  explica: (h) => explain(h),
  anuncia: () => `Apartamento con el balcón mirando al ${rumboDe(S.rumbo).nombre.toLowerCase()}.${delAnker()}${delAgua()}`,
  // la página abre con lo de su primera pestaña puesto (el Anker con sus PS400), sin animación
  arranca() {
    for (const p of PRODUCTOS.filter((q) => q.pestaña === modo && q.inicial)) S.escogido[p.id] = p.inicial;
    vistas.add(modo);
    marcarOpciones();
  },
};
arrancar();
