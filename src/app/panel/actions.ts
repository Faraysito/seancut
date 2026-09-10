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
  if (error) redirect("/panel?error=" + encodeURIComponent(error.message));
}