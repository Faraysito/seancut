"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type BookState =
  | { ok: true; hora: string }
  | { ok: false; error: string }
  | null;

export async function book(
  _prev: BookState,
  formData: FormData
): Promise<BookState> {
  const supabase = await createClient();
  const startsAt = String(formData.get("starts_at"));

  const { error } = await supabase.rpc("book_appointment", {
    p_item_id: String(formData.get("item_id")),
    p_starts_at: startsAt,
    p_name: String(formData.get("name")),
    p_phone: String(formData.get("phone")),
  });

  // los mensajes vienen de los raise exception de la función,
  // ya están en español y son seguros de mostrar
  if (error) return { ok: false, error: error.message };

  revalidatePath("/panel");
  return { ok: true, hora: startsAt };
}