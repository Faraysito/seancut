import { createClient } from "@/lib/supabase/server";
import {
  dowDb,
  esDomingo,
  hoyISO,
  partesDia,
  semanaActual,
  tituloSemana,
  type DiaReserva,
  type EstadoDia,
} from "./semana";

// los servicios que se pueden reservar, tanto en la página pública
// como cuando sean agenda a alguien desde el panel
export async function serviciosReservables() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("items")
    .select("id, name, price_clp, duration_min")
    .eq("brand", "seancut")
    .eq("kind", "service")
    .eq("active", true)
    .order("price_clp");

  return data ?? [];
}

// la semana actual tal como la ve el cliente. lo que depende del servicio
// elegido (si todavía quedan horas) lo resuelve el formulario en el
// navegador; acá va solo lo que no cambia con el servicio.
export async function semanaParaReservar() {
  const supabase = await createClient();
  const hoy = hoyISO();
  const semana = semanaActual(hoy);

  const [{ data: tramos }, { data: cerrados }] = await Promise.all([
    supabase.from("business_hours").select("dow"),
    supabase.from("closed_dates").select("day").gte("day", semana[0]).lte("day", semana[6]),
  ]);

  const conHorario = new Set((tramos ?? []).map((t) => t.dow));
  const noAtiende = new Set((cerrados ?? []).map((c) => c.day));

  // si por lo que sea no llegó ningún tramo, no pinto la semana entera de
  // rojo: prefiero que decida available_days y se vea "sin horas"
  const sinHorario = (day: string) => conHorario.size > 0 && !conHorario.has(dowDb(day));

  const dias: DiaReserva[] = semana.map((day) => {
    let estado: EstadoDia = "abierto";
    if (day < hoy) estado = "pasado";
    else if (esDomingo(day) || noAtiende.has(day) || sinHorario(day)) estado = "cerrado";

    return { day, estado, hoy: day === hoy, ...partesDia(day) };
  });

  return { dias, titulo: tituloSemana(semana) };
}
