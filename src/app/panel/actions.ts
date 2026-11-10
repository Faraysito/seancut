"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function cobrarCita(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.rpc("complete_appointment", {
    p_appointment_id: String(formData.get("id")),
    p_payment_method: String(formData.get("payment_method") || "efectivo"),
  });

  revalidatePath("/panel");

  // el redirect con el mensaje me evita convertir cada fila en client component
  // si estaba mirando otro día, vuelvo a ese mismo día
  const dia = String(formData.get("dia") || "");
  if (error) redirect("/panel?" + (dia ? "dia=" + dia + "&" : "") + "error=" + encodeURIComponent(error.message));
}

export type FormState = { error: string } | { ok: true } | null;

const ESTADOS = ["booked", "no_show", "cancelled"];

function refrescarCitas() {
  revalidatePath("/panel");
  revalidatePath("/panel/agenda");
  revalidatePath("/panel/horarios");
  revalidatePath("/panel/caja");
  revalidatePath("/panel/resumen");
  revalidatePath("/reservar");
}

// cancelar, "no vino" y deshacer desde hoy. sin redirect: la página se
// actualiza en el mismo lugar y no se pierde el día que estabas mirando
export async function cambiarEstadoCita(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") || "");
  const estado = String(formData.get("estado") || "");
  if (!id || !ESTADOS.includes(estado)) return { error: "Acción inválida" };

  const supabase = await createClient();

  // al volver a reservada reviso que nadie haya tomado esa hora mientras
  // estuvo libre, para no quedar con dos clientes a la misma hora
  if (estado === "booked") {
    const { data: cita } = await supabase
      .from("appointments")
      .select("starts_at, ends_at")
      .eq("id", id)
      .maybeSingle();
    if (!cita) return { error: "No encontré esa cita" };

    const { data: choque } = await supabase
      .from("appointments")
      .select("id")
      .neq("id", id)
      .in("status", ["booked", "done"])
      .lt("starts_at", cita.ends_at)
      .gt("ends_at", cita.starts_at)
      .limit(1);
    if (choque?.length) return { error: "Esa hora ya la tomó otra persona" };
  }

  // una cita cobrada no se toca acá: se anula con anularCobro, que además
  // borra la venta de la caja
  const { data, error } = await supabase
    .from("appointments")
    .update({ status: estado })
    .eq("id", id)
    .neq("status", "done")
    .select("id");

  if (error) return { error: error.message };
  if (!data?.length) return { error: "No se pudo cambiar esa cita" };

  refrescarCitas();
  return { ok: true };
}

// se cobró por error: la cita deja de estar cobrada (vuelve a reservada, o
// queda cancelada si así se pidió) y se borra la venta que dejó en la caja
export async function anularCobro(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") || "");
  const cancelar = formData.get("cancelar") === "1";
  if (!id) return { error: "Falta la cita" };

  const supabase = await createClient();

  const { data: ventas } = await supabase.from("ledger").select("id").eq("appointment_id", id);
  const cuantas = ventas?.length ?? 0;

  const { data: cambiadas, error } = await supabase
    .from("appointments")
    .update({ status: cancelar ? "cancelled" : "booked" })
    .eq("id", id)
    .eq("status", "done")
    .select("id");

  if (error) return { error: error.message };
  if (!cambiadas?.length) return { error: "Esa cita no estaba cobrada" };

  if (cuantas > 0) {
    const { data: borradas, error: errorBorrar } = await supabase
      .from("ledger")
      .delete()
      .eq("appointment_id", id)
      .select("id");

    // si la venta no se pudo borrar, dejo la cita como estaba para que la
    // caja y la agenda no queden diciendo cosas distintas
    if (errorBorrar || (borradas?.length ?? 0) < cuantas) {
      await supabase.from("appointments").update({ status: "done" }).eq("id", id);
      return {
        error: errorBorrar?.message ?? "No pude borrar la venta de la caja (permisos de la tabla ledger)",
      };
    }
  }

  refrescarCitas();
  return { ok: true };
}
