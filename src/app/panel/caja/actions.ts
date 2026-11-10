"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function volver(texto: string, ok: boolean): never {
  redirect("/panel/caja?" + (ok ? "msg=" : "err=") + encodeURIComponent(texto));
}

export async function venderProducto(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.rpc("sell_product", {
    p_item_id: String(formData.get("item_id")),
    p_qty: Number(formData.get("qty") || 1),
    p_payment_method: String(formData.get("payment_method") || "efectivo"),
  });

  revalidatePath("/panel/caja");
  volver(error ? error.message : "Venta registrada", !error);
}
