import Link from "next/link";
import ItemForm from "../item-form";
import { crearItem } from "../actions";

export default async function NuevoItem({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}) {
  const { err } = await searchParams;

  return (
    <>
      <Link href="/panel/catalogo" className="text-xs text-neutral-500 underline">← catálogo/cortes</Link>
      <h1 className="mb-4 mt-4 text-xl font-semibold">Nuevo</h1>

      {err && <p className="mb-4 rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-400">{err}</p>}

      <ItemForm action={crearItem} />
    </>
  );
}
