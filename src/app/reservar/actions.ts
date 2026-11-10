"use server";

import { revalidatePath } from "next/cache";
import { FALTA_SQL_CONTACTO } from "@/lib/contacto";
import { diaDe, esDomingo, semanaActual } from "@/lib/semana";
import { createClient } from "@/lib/supabase/server";

export type BookState =
  | { ok: true; hora: string; token: string }
  | { ok: false; error: string }
  | null;

export async function book(
  _prev: BookState,
  formData: FormData
): Promise<BookState> {
  const startsAt = String(formData.get("starts_at") || "");
  if (!startsAt) return { ok: false, error: "Elige un día y una hora" };

  const nombre = String(formData.get("name") || "").trim();
  if (nombre.length < 2) return { ok: false, error: "Escribe tu nombre" };

  // whatsapp e instagram son opcionales: la función de la base los
  // valida y los guarda limpios
  const telefono = String(formData.get("phone") || "").trim();
  const instagram = String(formData.get("instagram") || "").trim();

  // el formulario solo ofrece la semana actual y nunca el domingo; esto es
  // por si alguien lo deja abierto hasta la semana siguiente o lo manda a mano
  const dia = diaDe(startsAt);
  if (!semanaActual().includes(dia) || esDomingo(dia)) {
    return { ok: false, error: "Solo se puede reservar dentro de esta semana, de lunes a sábado." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("book_appointment_v2", {
    p_item_id: String(formData.get("item_id")),
    p_starts_at: startsAt,
    p_name: nombre,
    p_phone: telefono || undefined,
    p_instagram: instagram || undefined,
  });

  if (error) {
    // la función nueva todavía no existe en la base
    if (error.code === "PGRST202") {
      return { ok: false, error: FALTA_SQL_CONTACTO };
    }
    // el resto viene de los raise exception de la función,
    // ya están en español y son seguros de mostrar
    return { ok: false, error: error.message };
  }

  revalidatePath("/panel");
  revalidatePath("/panel/agenda");
  revalidatePath("/panel/horarios");
  revalidatePath("/reservar");

  return { ok: true, hora: startsAt, token: String(data) };
}
