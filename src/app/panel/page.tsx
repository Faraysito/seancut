import { fromZonedTime } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import { cobrarCita } from "./actions";

const TZ = "America/Santiago";

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  });
}

function waLink(phone?: string | null) {
  if (!phone) return "#";
  return "https://wa.me/" + phone.replace("+", "");
}

function clp(n: number) {
  return "$" + n.toLocaleString("es-CL");
}

export default async function Panel({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: aviso } = await searchParams;
  const supabase = await createClient();

  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: TZ });
  const desde = fromZonedTime(hoy + "T00:00:00", TZ);
  const hasta = fromZonedTime(hoy + "T23:59:59.999", TZ);

  const { data: citas, error } = await supabase
    .from("appointments")
    .select("id, starts_at, status, clients(name, phone), items(name, price_clp)")
    .gte("starts_at", desde.toISOString())
    .lte("starts_at", hasta.toISOString())
    .order("starts_at");

  if (error) {
    return <pre className="text-red-400">{error.message}</pre>;
  }

  const lista = citas ?? [];
  const fecha = new Date().toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TZ,
  });

  return (
    <>
      <h1 className="text-xl font-semibold">Hoy</h1>
      <p className="mb-4 text-sm text-neutral-500">{fecha}</p>

      {aviso && (
        <p className="mb-4 rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-400">{aviso}</p>
      )}

      {lista.length === 0 && (
        <p className="rounded-md border border-dashed border-neutral-800 p-8 text-center text-sm text-neutral-500">
          Sin horas para hoy
        </p>
      )}

      <ul className="divide-y divide-neutral-800">
        {lista.map((c) => (
          <li key={c.id} className="flex items-center gap-3 py-3">
            <span className="w-12 font-mono text-sm">{hora(c.starts_at)}</span>

            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{c.clients?.name}</p>
              <p className="truncate text-sm text-neutral-500">
                {c.items?.name} · {clp(c.items?.price_clp ?? 0)}
              </p>
            </div>

            <a href={waLink(c.clients?.phone)} target="_blank" rel="noreferrer" className="text-sm text-emerald-400">WA</a>

            {c.status === "done" ? (
              <span className="text-sm text-neutral-600">cobrado</span>
            ) : (
              <form action={cobrarCita} className="flex gap-1">
                <input type="hidden" name="id" value={c.id} />
                <select name="payment_method" className="rounded-md border border-neutral-700 bg-neutral-900 px-1 text-xs text-neutral-100">
                  <option value="efectivo">efec</option>
                  <option value="transferencia">transf</option>
                  <option value="debito">déb</option>
                  <option value="credito">créd</option>
                </select>
                <button className="rounded-md bg-white px-3 py-1 text-sm font-medium text-neutral-950">Cobrar</button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
