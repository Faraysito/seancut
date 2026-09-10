import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ItemForm from "../item-form";
import { editarItem, eliminarItem } from "../actions";

export default async function EditarItem({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ err?: string }>;
}) {
  const { id } = await params;
  const { err } = await searchParams;

  const supabase = await createClient();

  const { data: item } = await supabase
    .from("items")
    .select("id, brand, kind, name, description, price_clp, cost_clp, duration_min, stock, active, image_path")
    .eq("id", id)
    .single();

  if (!item) notFound();

  const imagenUrl = item.image_path
    ? supabase.storage.from("items").getPublicUrl(item.image_path).data.publicUrl
    : null;

  return (
    <>
      <Link href="/panel/catalogo" className="text-xs text-neutral-500 underline">← catálogo</Link>
      <h1 className="mb-4 mt-4 text-xl font-semibold">{item.name}</h1>

      {err && <p className="mb-4 rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-400">{err}</p>}

      <ItemForm item={item} action={editarItem} imagenUrl={imagenUrl} />

      <form action={eliminarItem} className="mt-10 border-t border-neutral-800 pt-6">
        <input type="hidden" name="id" value={item.id} />
        <button className="text-sm text-red-400 underline">Eliminar</button>
        <p className="mt-1 text-xs text-neutral-600">
          Si ya tiene ventas o citas asociadas no se borra: se archiva, para no romper los
          números del resumen.
        </p>
      </form>
    </>
  );
}
