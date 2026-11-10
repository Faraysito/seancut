"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function volver(texto: string, ok: boolean): never {
  redirect("/panel/notas?" + (ok ? "msg=" : "err=") + encodeURIComponent(texto));
}

export async function publicarNota(formData: FormData) {
  const mensaje = String(formData.get("message") || "").trim();

  if (mensaje.length < 3) volver("El aviso está muy corto", false);
  if (mensaje.length > 280) volver("Máximo 280 caracteres", false);

  const supabase = await createClient();

  // solo puede haber un aviso visible a la vez: apago el anterior
  // y guardo el nuevo, así queda el historial de lo que se publicó
  await supabase.from("notices").update({ active: false }).eq("active", true);

  const { error } = await supabase
    .from("notices")
    .insert({ message: mensaje, active: true });

  revalidatePath("/");
  revalidatePath("/panel/notas");

  if (error) volver(error.message, false);
  volver("Aviso publicado", true);
}

export async function quitarNota() {
  const supabase = await createClient();

  const { error } = await supabase
    .from("notices")
    .update({ active: false })
    .eq("active", true);

  revalidatePath("/");
  revalidatePath("/panel/notas");

  if (error) volver(error.message, false);
  volver("Aviso quitado, la página ya no lo muestra", true);
}

export async function reutilizarNota(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));

  const { data } = await supabase.from("notices").select("message").eq("id", id).single();
  if (!data) volver("No encontré ese aviso", false);

  await supabase.from("notices").update({ active: false }).eq("active", true);
  const { error } = await supabase
    .from("notices")
    .insert({ message: data.message, active: true });

  revalidatePath("/");
  revalidatePath("/panel/notas");

  if (error) volver(error.message, false);
  volver("Aviso publicado de nuevo", true);
}
