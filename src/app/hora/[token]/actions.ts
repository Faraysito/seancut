"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function cancelarConToken(formData: FormData) {
  const token = String(formData.get("token"));
  const supabase = await createClient();

  const { error } = await supabase.rpc("cancel_by_token", { p_token: token });

  revalidatePath("/hora/" + token);
  revalidatePath("/panel");
  revalidatePath("/panel/agenda");

  if (error) {
    redirect("/hora/" + token + "?err=" + encodeURIComponent(error.message));
  }
  redirect("/hora/" + token);
}
