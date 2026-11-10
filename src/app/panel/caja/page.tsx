import Image from "next/image";
import Link from "next/link";
import { Tooltip } from "@/components/tooltip";
import { createClient } from "@/lib/supabase/server";
import { venderProducto } from "./actions";

const TZ = "America/Santiago";

function clp(n: number) {
  return (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("es-CL");
}

export default async function Caja({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; err?: string }>;
}) {
  const { msg, err } = await searchParams;
  const supabase = await createClient();

  const { data: productos } = await supabase
    .from("items")
    .select("id, name, price_clp, cost_clp, stock, image_path")
    .eq("kind", "product")
    .eq("active", true)
    .order("name");

  const foto = (path: string | null) =>
    path ? supabase.storage.from("items").getPublicUrl(path).data.publicUrl : null;

  const { data: movimientos } = await supabase
    .from("ledger")
    .select("id, brand, direction, amount_clp, qty, reason, happened_at")
    .order("happened_at", { ascending: false })
    .limit(10);

  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">Caja</h1>

      {msg && <p className="mb-4 rounded-md border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-400">{msg}</p>}
      {err && <p className="mb-4 rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-400">{err}</p>}

      <section className="mb-8">
        <h2 className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">Vender producto</h2>
        <ul className="divide-y divide-neutral-800">
          {(productos ?? []).map((p) => {
            const src = foto(p.image_path);

            return (
              <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
                  {src ? (
                    <Image src={src} alt={p.name} width={48} height={48} className="h-12 w-12 shrink-0 rounded-md object-cover" />
                  ) : (
                    <div aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-neutral-800 text-sm font-semibold text-neutral-500">
                      {p.name.charAt(0)}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="text-sm text-neutral-500">
                      {p.price_clp === 0 ? (
                        <span className="text-amber-500">sin precio</span>
                      ) : (
                        <>
                          {clp(p.price_clp)} · margen {clp(p.price_clp - p.cost_clp)}
                        </>
                      )}{" "}
                      · stock {p.stock}
                    </p>
                  </div>
                </div>

                {p.stock ? (
                  <form action={venderProducto} className="ml-auto flex gap-1">
                    <input type="hidden" name="item_id" value={p.id} />
                    <input type="number" name="qty" defaultValue={1} min={1} max={p.stock} aria-label="Cantidad" className="w-14 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100" />
                    <select name="payment_method" aria-label="Medio de pago" className="rounded-md border border-neutral-700 bg-neutral-900 px-1 text-xs text-neutral-100">
                      <option value="efectivo">efec</option>
                      <option value="transferencia">transf</option>
                      <option value="debito">déb</option>
                      <option value="credito">créd</option>
                    </select>
                    <button className="rounded-md bg-white px-3 py-1 text-sm font-medium text-neutral-950">Vender</button>
                  </form>
                ) : (
                  <Tooltip text="No queda stock. Súmale en Administrar catálogo/cortes." align="end" className="ml-auto inline-flex">
                    <button type="button" className="cursor-help rounded-md border border-neutral-800 px-3 py-1 text-sm text-neutral-500">
                      Sin stock
                    </button>
                  </Tooltip>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <Link
        href="/panel/gastos"
        className="mb-8 flex items-center justify-between gap-3 rounded-lg border border-neutral-800 p-4 transition hover:border-neutral-600"
      >
        <span>
          <span className="block text-sm font-medium">¿Compraste algo para el negocio?</span>
          <span className="block text-xs text-neutral-500">
            Mercadería, navajas, tijeras, arriendo... anótalo en Gastos.
          </span>
        </span>
        <span aria-hidden className="text-neutral-400">
          →
        </span>
      </Link>

      <section>
        <h2 className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">Últimos movimientos</h2>
        <ul className="divide-y divide-neutral-800 text-sm">
          {(movimientos ?? []).map((m) => (
            <li key={m.id} className="flex items-center gap-2 py-2">
              <span className="w-12 text-xs text-neutral-600">
                {new Date(m.happened_at).toLocaleDateString("es-CL", {
                  day: "2-digit",
                  month: "2-digit",
                  timeZone: TZ,
                })}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {m.reason}
                {m.qty > 1 ? " ×" + m.qty : ""}
              </span>
              <span className="text-xs text-neutral-600">{m.brand}</span>
              <span
                className={
                  "w-20 text-right tabular-nums " +
                  (m.direction === "in" ? "text-emerald-400" : "text-red-400")
                }
              >
                {m.direction === "in" ? "+" : "−"}
                {clp(m.amount_clp)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
