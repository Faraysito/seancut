import { createClient } from "@/lib/supabase/server";
import { venderProducto, registrarGasto } from "./actions";

const TZ = "America/Santiago";

function clp(n: number) {
  return (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("es-CL");
}

const INPUT =
  "rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500";

export default async function Caja({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; err?: string }>;
}) {
  const { msg, err } = await searchParams;
  const supabase = await createClient();

  const { data: productos } = await supabase
    .from("items")
    .select("id, name, price_clp, cost_clp, stock")
    .eq("kind", "product")
    .eq("active", true)
    .order("name");

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
          {(productos ?? []).map((p) => (
            <li key={p.id} className="flex items-center gap-2 py-3">
              <div className="min-w-0 flex-1">
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

              <form action={venderProducto} className="flex gap-1">
                <input type="hidden" name="item_id" value={p.id} />
                <input type="number" name="qty" defaultValue={1} min={1} max={p.stock ?? 1} className="w-14 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100" />
                <select name="payment_method" className="rounded-md border border-neutral-700 bg-neutral-900 px-1 text-xs text-neutral-100">
                  <option value="efectivo">efec</option>
                  <option value="transferencia">transf</option>
                  <option value="debito">déb</option>
                  <option value="credito">créd</option>
                </select>
                <button disabled={!p.stock} className="rounded-md bg-white px-3 py-1 text-sm font-medium text-neutral-950 disabled:opacity-30">Vender</button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">Registrar gasto</h2>
        <form action={registrarGasto} className="space-y-2">
          <div className="flex gap-2">
            <select name="brand" className={INPUT}>
              <option value="seancut">Sean Cut</option>
              <option value="seannova">SeanNova</option>
            </select>
            <input type="number" name="amount" required min={1} placeholder="Monto" className={INPUT + " w-32"} />
          </div>
          <input name="reason" required placeholder="Motivo: compra stock, arriendo, luz..." className={INPUT + " w-full"} />
          <button className="w-full rounded-md border border-neutral-600 py-2 text-sm">Registrar gasto</button>
        </form>
      </section>

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
