"use server";

import { revalidatePath } from "next/cache";
import { fromZonedTime } from "date-fns-tz";
import { TZ } from "@/lib/local";
import { esDomingo, hoyISO } from "@/lib/semana";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error: string } | { ok: true } | null;

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

// sin redirect a propósito: así la página se actualiza en el mismo lugar
// y sean no pierde el scroll cada vez que toca un botón
function refrescar() {
  revalidatePath("/panel/horarios");
  revalidatePath("/panel/agenda");
  revalidatePath("/panel");
  revalidatePath("/reservar");
  revalidatePath("/");
}

// si la tabla hidden_slots no existe es que falta correr el sql
function mensaje(error: { code: string; message: string }) {
  if (error.code === "42P01" || error.code === "PGRST205") {
    return "Falta crear la tabla hidden_slots: corre supabase/2026-11-09_horarios.sql en Supabase";
  }
  return error.message;
}

// postgres devuelve "10:00:00" y el input manda "10:00"; comparo en HH:MM
function hhmm(t: string) {
  return t.slice(0, 5);
}

function leerTramo(formData: FormData) {
  return {
    dow: Number(formData.get("dow")),
    opens: hhmm(String(formData.get("opens") || "")),
    closes: hhmm(String(formData.get("closes") || "")),
  };
}

function problemaTramo(t: ReturnType<typeof leerTramo>) {
  // el domingo no se edita: siempre sale cerrado
  if (!Number.isInteger(t.dow) || t.dow < 1 || t.dow > 6) return "Día inválido";
  if (!t.opens || !t.closes) return "Faltan las horas";
  if (t.closes <= t.opens) return "La hora de término tiene que ser después de la de inicio";
  return null;
}

// dos horarios del mismo día no se pueden pisar: si se pisan, el cliente
// ve horas repetidas y no se entiende cuál vale
async function seCruzaCon(dow: number, opens: string, closes: string, ignorar?: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("business_hours").select("id, opens, closes").eq("dow", dow);

  const otro = (data ?? []).find(
    (t) => t.id !== ignorar && opens < hhmm(t.closes) && closes > hhmm(t.opens)
  );
  return otro ? hhmm(otro.opens) + " a " + hhmm(otro.closes) : null;
}

export async function agregarTramo(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = leerTramo(formData);
  const problema = problemaTramo(t);
  if (problema) return { error: problema };

  const cruce = await seCruzaCon(t.dow, t.opens, t.closes);
  if (cruce) return { error: "Se cruza con el horario de " + cruce + " de ese día" };

  const supabase = await createClient();
  const { error } = await supabase.from("business_hours").insert(t);
  if (error) return { error: error.message };

  refrescar();
  return { ok: true };
}

export async function editarTramo(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") || "");
  const t = leerTramo(formData);
  const problema = problemaTramo(t);
  if (problema) return { error: problema };

  const cruce = await seCruzaCon(t.dow, t.opens, t.closes, id);
  if (cruce) return { error: "Se cruza con el horario de " + cruce + " de ese día" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_hours")
    .update({ opens: t.opens, closes: t.closes })
    .eq("id", id)
    .select("id");

  if (error) return { error: error.message };
  if (!data?.length) return { error: "No se pudo guardar el cambio" };

  refrescar();
  return { ok: true };
}

export async function quitarTramo(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("business_hours")
    .delete()
    .eq("id", String(formData.get("id")));

  if (error) return { error: error.message };

  refrescar();
  return { ok: true };
}

// "no corto pelo este día" y "volver a atender" son el mismo botón
export async function alternarDia(_prev: FormState, formData: FormData): Promise<FormState> {
  const day = String(formData.get("day") || "");
  const cerrar = formData.get("cerrar") === "1";
  if (!FECHA.test(day)) return { error: "Fecha inválida" };

  const supabase = await createClient();
  const { error } = cerrar
    ? await supabase.from("closed_dates").upsert({ day, reason: null }, { onConflict: "day" })
    : await supabase.from("closed_dates").delete().eq("day", day);

  if (error) return { error: error.message };

  refrescar();
  return { ok: true };
}

export async function cerrarOtraFecha(_prev: FormState, formData: FormData): Promise<FormState> {
  const day = String(formData.get("day") || "");
  if (!FECHA.test(day)) return { error: "Elige una fecha" };
  if (day < hoyISO()) return { error: "Esa fecha ya pasó" };
  if (esDomingo(day)) return { error: "Los domingos ya salen cerrados siempre" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("closed_dates")
    .upsert({ day, reason: null }, { onConflict: "day" });

  if (error) return { error: error.message };

  refrescar();
  return { ok: true };
}

// sacar una hora puntual de reservar hora, o volver a ponerla
export async function alternarHora(slot: string, ocultar: boolean): Promise<FormState> {
  const ms = Date.parse(slot);
  if (Number.isNaN(ms)) return { error: "Hora inválida" };
  const starts_at = new Date(ms).toISOString();

  const supabase = await createClient();
  const { error } = ocultar
    ? await supabase.from("hidden_slots").upsert({ starts_at }, { onConflict: "starts_at" })
    : await supabase.from("hidden_slots").delete().eq("starts_at", starts_at);

  if (error) return { error: mensaje(error) };

  refrescar();
  return { ok: true };
}

export async function mostrarTodasDelDia(day: string): Promise<FormState> {
  if (!FECHA.test(day)) return { error: "Fecha inválida" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("hidden_slots")
    .delete()
    .gte("starts_at", fromZonedTime(day + "T00:00:00", TZ).toISOString())
    .lte("starts_at", fromZonedTime(day + "T23:59:59.999", TZ).toISOString());

  if (error) return { error: mensaje(error) };

  refrescar();
  return { ok: true };
}
