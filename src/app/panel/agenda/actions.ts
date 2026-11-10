"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ESTADOS = ["booked", "done", "no_show", "cancelled"];

export async function cambiarEstado(formData: FormData) {
  const id = String(formData.get("id"));
  const estado = String(formData.get("estado"));
  const dia = String(formData.get("dia") || "");
  const servicio = String(formData.get("servicio") || "");

  const qs = new URLSearchParams();
  if (dia) qs.set("dia", dia);
  if (servicio) qs.set("servicio", servicio);

  if (!ESTADOS.includes(estado)) {
    qs.set("err", "Estado inválido");
    redirect("/panel/agenda?" + qs.toString());
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("appointments")
    .update({ status: estado })
    .eq("id", id);

  revalidatePath("/panel");
  revalidatePath("/panel/agenda");
  revalidatePath("/panel/horarios");
  revalidatePath("/reservar");

  if (error) qs.set("err", error.message);
  redirect("/panel/agenda?" + qs.toString());
}
