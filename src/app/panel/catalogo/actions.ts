"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Brand = "seancut" | "seannova";

function volver(destino: string, texto: string, ok: boolean): never {
  redirect(destino + "?" + (ok ? "msg=" : "err=") + encodeURIComponent(texto));
}

function leerCampos(formData: FormData) {
  const kind = String(formData.get("kind"));
  const description = String(formData.get("description") || "").trim();

  return {
    brand: String(formData.get("brand")) as Brand,
    kind,
    name: String(formData.get("name") || "").trim(),
    description: description || null,
    price_clp: Math.max(0, Number(formData.get("price_clp") || 0)),
    cost_clp: Math.max(0, Number(formData.get("cost_clp") || 0)),
    // el schema exige duración en servicios y stock en productos,
    // y nulo en el otro caso. si mando los dos, el check revienta.
    duration_min: kind === "service" ? Number(formData.get("duration_min") || 0) : null,
    stock: kind === "product" ? Math.max(0, Number(formData.get("stock") || 0)) : null,
    active: formData.get("active") === "on",
  };
}

function validar(c: ReturnType<typeof leerCampos>) {
  if (c.name.length < 2) return "Ponle un nombre";
  if (c.kind === "service" && (!c.duration_min || c.duration_min < 5))
    return "Los servicios necesitan duración (mínimo 5 min)";
  return null;
}

async function subirImagen(formData: FormData, itemId: string) {
  const file = formData.get("image") as File | null;
  if (!file || file.size === 0) return null;
  if (file.size > 5_000_000) throw new Error("La imagen pesa más de 5 MB");

  const supabase = await createClient();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = itemId + "-" + Date.now() + "." + ext;

  const { error } = await supabase.storage
    .from("items")
    .upload(path, file, { contentType: file.type, upsert: true });

  if (error) throw new Error("No se pudo subir la imagen: " + error.message);
  return path;
}

export async function crearItem(formData: FormData) {
  const campos = leerCampos(formData);
  const problema = validar(campos);
  if (problema) volver("/panel/catalogo/nuevo", problema, false);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .insert(campos)
    .select("id")
    .single();

  if (error || !data) volver("/panel/catalogo/nuevo", error?.message ?? "No se pudo crear", false);

  // el try no puede envolver un redirect: next lo implementa tirando
  // una excepción y el catch se la comería
  let imgError: string | null = null;
  let path: string | null = null;
  try {
    path = await subirImagen(formData, data.id);
  } catch (e) {
    imgError = (e as Error).message;
  }
  if (path) await supabase.from("items").update({ image_path: path }).eq("id", data.id);

  revalidatePath("/panel/catalogo");
  revalidatePath("/");
  if (imgError) volver("/panel/catalogo", "Creado, pero " + imgError, false);
  volver("/panel/catalogo", "Creado", true);
}

export async function editarItem(formData: FormData) {
  const id = String(formData.get("id"));
  const campos = leerCampos(formData);
  const problema = validar(campos);
  if (problema) volver("/panel/catalogo/" + id, problema, false);

  const supabase = await createClient();

  let imgError: string | null = null;
  let path: string | null = null;
  try {
    path = await subirImagen(formData, id);
  } catch (e) {
    imgError = (e as Error).message;
  }

  const { error } = await supabase
    .from("items")
    .update(path ? { ...campos, image_path: path } : campos)
    .eq("id", id);

  revalidatePath("/panel/catalogo");
  revalidatePath("/panel/catalogo/" + id);
  revalidatePath("/");

  if (error) volver("/panel/catalogo/" + id, error.message, false);
  if (imgError) volver("/panel/catalogo", "Guardado, pero " + imgError, false);
  volver("/panel/catalogo", "Guardado", true);
}

export async function eliminarItem(formData: FormData) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("delete_item", {
    p_item_id: String(formData.get("id")),
  });

  revalidatePath("/panel/catalogo");
  revalidatePath("/");

  if (error) volver("/panel/catalogo", error.message, false);
  volver(
    "/panel/catalogo",
    data === "archivado"
      ? "Tenía historial de ventas, así que lo archivé en vez de borrarlo"
      : "Eliminado",
    true
  );
}

export async function toggleActivo(formData: FormData) {
  const supabase = await createClient();

  await supabase
    .from("items")
    .update({ active: formData.get("active") === "1" })
    .eq("id", String(formData.get("id")));

  revalidatePath("/panel/catalogo");
  revalidatePath("/");
}

export async function ajustarStock(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const delta = Number(formData.get("delta") || 0);

  const { data } = await supabase.from("items").select("stock").eq("id", id).single();
  const nuevo = Math.max(0, (data?.stock ?? 0) + delta);

  await supabase.from("items").update({ stock: nuevo }).eq("id", id);

  revalidatePath("/panel/catalogo");
  revalidatePath("/");
}
