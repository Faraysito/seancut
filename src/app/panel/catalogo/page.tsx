import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { toggleActivo, ajustarStock } from "./actions";

function clp(n: number) {
  return "$" + n.toLocaleString("es-CL");
}

export default async function Catalogo({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; err?: string }>;
}) {
  const { msg, err } = await searchParams;
  const supabase = await createClient();

  const { data: items, error } = await supabase
    .from("items")
    .select("id, brand, kind, name, description, price_clp, cost_clp, duration_min, stock, active, image_path")
    .order("kind")
    .order("name");

  if (error) return <pre className="text-red-400">{error.message}</pre>;

  const url = (path: string | null) =>
    path ? supabase.storage.from("items").getPublicUrl(path).data.publicUrl : null;

  const servicios = (items ?? []).filter((i) => i.kind === "service");
  const productos = (items ?? []).filter((i) => i.kind === "product");

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Administrar catálogo/cortes</h1>
        <Link href="/panel/catalogo/nuevo" className="rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-950">+ Nuevo</Link>
      </div>

      {msg && <p className="mb-4 rounded-md border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-400">{msg}</p>}
      {err && <p className="mb-4 rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-400">{err}</p>}

      <h2 className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">Servicios</h2>
      <ul className="mb-8 divide-y divide-neutral-800">
        {servicios.map((i) => (
          <li key={i.id} className="flex items-center gap-3 py-3">
            {url(i.image_path) ? (
              <img src={url(i.image_path)!} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" />
            ) : (
              <div className="h-12 w-12 shrink-0 rounded-md bg-neutral-800" />
            )}

            <div className="min-w-0 flex-1">
              <p className={"truncate font-medium " + (i.active ? "" : "text-neutral-600 line-through")}>{i.name}</p>
              <p className="text-xs text-neutral-500">
                {clp(i.price_clp)} · {i.duration_min} min
              </p>
            </div>

            <form action={toggleActivo}>
              <input type="hidden" name="id" value={i.id} />
              <input type="hidden" name="active" value={i.active ? "0" : "1"} />
              <button className="text-xs text-neutral-500 underline">{i.active ? "ocultar" : "mostrar"}</button>
            </form>

            <Link href={"/panel/catalogo/" + i.id} className="text-xs underline">editar</Link>
          </li>
        ))}
      </ul>

      <h2 className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">Productos</h2>
      <ul className="divide-y divide-neutral-800">
        {productos.map((i) => (
          <li key={i.id} className="flex items-center gap-3 py-3">
            {url(i.image_path) ? (
              <img src={url(i.image_path)!} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" />
            ) : (
              <div className="h-12 w-12 shrink-0 rounded-md bg-neutral-800" />
            )}

            <div className="min-w-0 flex-1">
              <p className={"truncate font-medium " + (i.active ? "" : "text-neutral-600 line-through")}>{i.name}</p>
              <p className="text-xs text-neutral-500">
                {i.price_clp === 0 ? <span className="text-amber-500">sin precio</span> : clp(i.price_clp)}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <form action={ajustarStock}>
                <input type="hidden" name="id" value={i.id} />
                <input type="hidden" name="delta" value="-1" />
                <button className="h-7 w-7 rounded-md border border-neutral-700 text-sm">−</button>
              </form>
              <span className="w-7 text-center text-sm tabular-nums">{i.stock}</span>
              <form action={ajustarStock}>
                <input type="hidden" name="id" value={i.id} />
                <input type="hidden" name="delta" value="1" />
                <button className="h-7 w-7 rounded-md border border-neutral-700 text-sm">+</button>
              </form>
            </div>

            <Link href={"/panel/catalogo/" + i.id} className="text-xs underline">editar</Link>
          </li>
        ))}
      </ul>
    </>
  );
}
