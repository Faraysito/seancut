import { fromZonedTime } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";

const TZ = "America/Santiago";

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  });
}

export default async function Agenda({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string; servicio?: string }>;
}) {
  const { dia, servicio } = await searchParams;
  const supabase = await createClient();

  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: TZ });
  const diaElegido = dia && /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : hoy;

  const { data: servicios } = await supabase
    .from("items")
    .select("id, name, duration_min")
    .eq("kind", "service")
    .eq("active", true)
    .order("price_clp");

  const lista = servicios ?? [];
  const servicioId = servicio && lista.some((s) => s.id === servicio) ? servicio : lista[0]?.id;

  const desde = fromZonedTime(diaElegido + "T00:00:00", TZ);
  const hasta = fromZonedTime(diaElegido + "T23:59:59.999", TZ);

  const { data: citas } = await supabase
    .from("appointments")
    .select("id, starts_at, ends_at, status, clients(name, phone), items(name)")
    .gte("starts_at", desde.toISOString())
    .lte("starts_at", hasta.toISOString())
    .order("starts_at");

  const { data: libres } = servicioId
    ? await supabase.rpc("available_slots", { p_date: diaElegido, p_item_id: servicioId })
    : { data: [] };

  const ocupadas = (citas ?? []).filter((c) => c.status !== "cancelled");
  const etiqueta = new Date(diaElegido + "T12:00:00").toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <>
      <h1 className="text-xl font-semibold">Agenda</h1>
      <p className="mb-4 text-sm capitalize text-neutral-500">{etiqueta}</p>

      <form className="mb-6 flex flex-wrap gap-2">
        <input type="date" name="dia" defaultValue={diaElegido} className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100" />
        <select name="servicio" defaultValue={servicioId} className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100">
          {lista.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.duration_min} min)
            </option>
          ))}
        </select>
        <button className="rounded-md border border-neutral-600 px-3 py-1 text-sm">Ver</button>
      </form>

      <h2 className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">
        Reservadas ({ocupadas.length})
      </h2>
      {ocupadas.length === 0 ? (
        <p className="mb-8 rounded-md border border-dashed border-neutral-800 p-6 text-center text-sm text-neutral-500">
          Nadie reservó ese día
        </p>
      ) : (
        <ul className="mb-8 divide-y divide-neutral-800">
          {ocupadas.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-3">
              <span className="w-20 font-mono text-sm">
                {hora(c.starts_at)}–{hora(c.ends_at)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.clients?.name}</p>
                <p className="truncate text-xs text-neutral-500">{c.items?.name}</p>
              </div>
              {c.status === "done" && <span className="text-xs text-neutral-600">cobrado</span>}
              {c.status === "no_show" && <span className="text-xs text-amber-500">no llegó</span>}
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">
        Libres ({(libres ?? []).length})
      </h2>
      {(libres ?? []).length === 0 ? (
        <p className="rounded-md border border-dashed border-neutral-800 p-6 text-center text-sm text-neutral-500">
          Sin horas libres. Puede ser día cerrado, o ya pasó la hora.
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {(libres ?? []).map((s) => (
            <span key={s.slot} className="rounded-md border border-neutral-800 py-2 text-center text-sm text-neutral-400">
              {hora(s.slot)}
            </span>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-neutral-600">
        Las horas libres dependen del servicio elegido: una Barba de 25 min cabe en huecos
        donde no cabe un Corte + Barba de 60.
      </p>
    </>
  );
}
