// fechas de "la semana actual" (lunes a domingo, hora de chile).
// los días viajan siempre como "YYYY-MM-DD". al parsearlos les pego
// T12:00:00 para que ningún cambio de huso (ni el horario de verano)
// me corra el día para atrás o para adelante.

import { TZ } from "./local";

export type EstadoDia = "pasado" | "cerrado" | "abierto";

// lo que necesita el formulario de reserva para pintar cada día.
// los textos vienen armados desde el server para que el html del server
// y el del navegador sean idénticos: node y chrome no siempre abrevian
// los meses igual ("sep" vs "sept") y eso rompe la hidratación
export type DiaReserva = {
  day: string;
  estado: EstadoDia;
  hoy: boolean;
  dia: string;
  num: string;
  mes: string;
};

function aFecha(day: string) {
  return new Date(day + "T12:00:00");
}

function aISO(d: Date) {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + mes + "-" + dia;
}

export function hoyISO() {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

// el día (en chile) en que cae un timestamp
export function diaDe(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
}

// lunes a domingo de la semana en la que cae `hoy`
export function semanaActual(hoy: string = hoyISO()) {
  const base = aFecha(hoy);
  const lunes = new Date(base);
  lunes.setDate(base.getDate() - ((base.getDay() + 6) % 7));

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    return aISO(d);
  });
}

export function sumarDias(day: string, n: number) {
  const d = aFecha(day);
  d.setDate(d.getDate() + n);
  return aISO(d);
}

export function esDomingo(day: string) {
  return aFecha(day).getDay() === 0;
}

// business_hours usa 1=lunes ... 7=domingo; js usa 0=domingo
export function dowDb(day: string) {
  const js = aFecha(day).getDay();
  return js === 0 ? 7 : js;
}

// "2026-11-12" -> { dia: "jue", num: "12", mes: "nov" }
export function partesDia(day: string) {
  const d = aFecha(day);
  return {
    dia: d.toLocaleDateString("es-CL", { weekday: "short" }).replace(".", ""),
    num: String(d.getDate()),
    mes: d.toLocaleDateString("es-CL", { month: "short" }).replace(".", ""),
  };
}

export function nombreDia(day: string) {
  return aFecha(day).toLocaleDateString("es-CL", { weekday: "long" });
}

// "9 al 15 de noviembre" o "28 de septiembre al 4 de octubre"
export function tituloSemana(semana: string[]) {
  const a = aFecha(semana[0]);
  const b = aFecha(semana[semana.length - 1]);
  const mesA = a.toLocaleDateString("es-CL", { month: "long" });
  const mesB = b.toLocaleDateString("es-CL", { month: "long" });

  return mesA === mesB
    ? a.getDate() + " al " + b.getDate() + " de " + mesB
    : a.getDate() + " de " + mesA + " al " + b.getDate() + " de " + mesB;
}
