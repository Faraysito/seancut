"use server";

import { revalidatePath } from "next/cache";
import { fromZonedTime } from "date-fns-tz";
import { CATEGORIAS, MARCAS, mensajeGastos } from "@/lib/gastos";
import { TZ } from "@/lib/local";
import { hoyISO } from "@/lib/semana";
import { createClient } from "@/lib/supabase/server";

export type GastoState = { ok: true; texto: string } | { error: string } | null;

function refrescar() {
  revalidatePath("/panel/gastos");
  revalidatePath("/panel/resumen");
  revalidatePath("/panel/caja");
}

export async function registrarGasto(_prev: GastoState, formData: FormData): Promise<GastoState> {
  const detalle = String(formData.get("detalle") || "").trim();
  const monto = Number(String(formData.get("monto") || "").replace(/\D/g, ""));
  const categoria = CATEGORIAS.find((c) => c.id === formData.get("categoria"));
  const marca = MARCAS.find((m) => m.id === formData.get("marca"));
  const fecha = String(formData.get("fecha") || "");
  const hoy = hoyISO();

  if (detalle.length < 2) return { error: "Escribe qué compraste" };
  if (detalle.length > 120) return { error: "Acórtalo un poco (máximo 120 letras)" };
  if (!Number.isSafeInteger(monto) || monto <= 0) return { error: "Escribe cuánto pagaste" };
  if (!categoria) return { error: "Elige una categoría" };
  if (!marca) return { error: "Elige si es de Sean Cut o de SeanNova" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "Elige la fecha" };
  if (fecha > hoy) return { error: "La fecha no puede ser de un día que no ha llegado" };

  const supabase = await createClient();
  const { error } = await supabase.from("ledger").insert({
    brand: marca.id,
    direction: "out",
    amount_clp: monto,
    reason: detalle,
    category: categoria.id,
    // hoy queda con la hora real; un día anterior, a mediodía de ese día
    ...(fecha === hoy ? {} : { happened_at: fromZonedTime(fecha + "T12:00:00", TZ).toISOString() }),
  });

  if (error) return { error: mensajeGastos(error) };

  refrescar();
  return { ok: true, texto: "Anotado: " + detalle + " por $" + monto.toLocaleString("es-CL") };
}

export async function borrarGasto(_prev: GastoState, formData: FormData): Promise<GastoState> {
  const supabase = await createClient();

  // solo gastos: las ventas se anulan desde Hoy, que también arregla la cita
  const { data, error } = await supabase
    .from("ledger")
    .delete()
    .eq("id", String(formData.get("id") || ""))
    .eq("direction", "out")
    .select("id");

  if (error) return { error: mensajeGastos(error) };
  // sin permiso de borrar, supabase no tira error: simplemente no borra nada
  if (!data?.length) return { error: "No se pudo borrar. Revisa que corriste supabase/2026-11-10_gastos.sql" };

  refrescar();
  return { ok: true, texto: "Borrado" };
}
