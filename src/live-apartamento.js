// El apartamento: lo propio de su página. No tiene placas en el techo ni el sistema del cotizador de LUMA: su energía
// es la del Anker, con sus placas en el balcón. Sus fichas (la del Anker y la del agua) las llena live.js, lo común.
// Va después de live.js, que llama a sus ganchos (ESCENA_VIVA), y termina arrancando la página.

// ---------- rumbo ----------
// lo que oye el lector de pantalla de los botones del balcón
function updateFicha() {
  const r = rumboDe(S.rumbo);
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
