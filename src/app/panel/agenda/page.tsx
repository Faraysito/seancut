import { fromZonedTime } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import BookingForm from "@/app/reservar/booking-form";
import { DatosCliente } from "@/components/datos-cliente";
import { FALTA_SQL_CONTACTO } from "@/lib/contacto";
import { semanaParaReservar, serviciosReservables } from "@/lib/reservas";
import { cambiarEstado } from "./actions";

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
  searchParams: Promise<{ dia?: string; servicio?: string; err?: string }>;
}) {
  const { dia, servicio, err } = await searchParams;
  const supabase = await createClient();

  // para agendar a mano: mismo formulario y misma semana que ve el cliente
  const [reservables, { dias, titulo }] = await Promise.all([
    serviciosReservables(),
    semanaParaReservar(),
  ]);

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

  const { data: citas, error: errorCitas } = await supabase
    .from("appointments")
    .select("id, starts_at, ends_at, status, clients(name, phone, instagram), items(name)")
    .gte("starts_at", desde.toISOString())
    .lte("starts_at", hasta.toISOString())
    .order("starts_at");

  const { data: libres } = servicioId
    ? await supabase.rpc("available_slots", { p_date: diaElegido, p_item_id: servicioId })
    : { data: [] };

  const todas = citas ?? [];
  const activas = todas.filter((c) => c.status !== "cancelled");
  const canceladas = todas.filter((c) => c.status === "cancelled");

  const etiqueta = new Date(diaElegido + "T12:00:00").toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <>
      <h1 className="text-xl font-semibold">Agenda</h1>
      <p className="mb-4 text-sm capitalize text-neutral-500">{etiqueta}</p>

      {err && (
        <p className="mb-4 rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-400">{err}</p>
      )}

      {errorCitas && (
        <p className="mb-4 rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-400">
          {errorCitas.code === "42703" ? FALTA_SQL_CONTACTO : errorCitas.message}
        </p>
      )}

      <details className="group mb-8 rounded-lg border border-neutral-800 open:border-neutral-600">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block font-medium">Agendar un cliente</span>
            <span className="block text-xs text-neutral-500">
              Para cuando alguien te escribe o te llama directo, en vez de reservar por la página.
            </span>
          </span>
          <span
            aria-hidden
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xl leading-none text-neutral-950 transition group-open:rotate-45"
          >
            +
          </span>
        </summary>
        <div className="border-t border-neutral-800 p-4 md:p-6">
          <BookingForm modo="panel" servicios={reservables} dias={dias} titulo={titulo} />
        </div>
      </details>

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
        Reservadas ({activas.length})
      </h2>

      {activas.length === 0 ? (
        <p className="mb-8 rounded-md border border-dashed border-neutral-800 p-6 text-center text-sm text-neutral-500">
          Nadie reservó ese día
        </p>
      ) : (
        <ul className="mb-8 divide-y divide-neutral-800">
          {activas.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
              <span className="w-20 shrink-0 font-mono text-sm">
                {hora(c.starts_at)}–{hora(c.ends_at)}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.clients?.name}</p>
                <p className="truncate text-xs text-neutral-500">
                  {c.items?.name}
                  {c.clients?.phone ? " · " + c.clients.phone : ""}
                </p>
              </div>

              <DatosCliente
                nombre={c.clients?.name ?? "Cliente"}
                telefono={c.clients?.phone ?? null}
                instagram={c.clients?.instagram ?? null}
              />

              {c.status === "done" && <span className="text-xs text-neutral-600">cobrado</span>}
              {c.status === "no_show" && <span className="text-xs text-amber-500">no llegó</span>}

              {c.status === "booked" && (
                <div className="flex shrink-0 gap-3">
                  <form action={cambiarEstado}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="estado" value="no_show" />
                    <input type="hidden" name="dia" value={diaElegido} />
                    <input type="hidden" name="servicio" value={servicioId ?? ""} />
                    <button className="text-xs text-amber-500 underline">no llegó</button>
                  </form>

                  <form action={cambiarEstado}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="estado" value="cancelled" />
                    <input type="hidden" name="dia" value={diaElegido} />
                    <input type="hidden" name="servicio" value={servicioId ?? ""} />
                    <button className="text-xs text-red-400 underline">cancelar</button>
                  </form>
                </div>
              )}
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
        <div className="grid grid-cols-4 gap-2 md:grid-cols-6">
          {(libres ?? []).map((s) => (
            <span key={s.slot} className="rounded-md border border-neutral-800 py-2 text-center text-sm text-neutral-400">
              {hora(s.slot)}
            </span>
          ))}
        </div>
      )}

      {canceladas.length > 0 && (
        <section className="mt-10 border-t border-neutral-800 pt-6">
          <h2 className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">
            Canceladas ({canceladas.length})
          </h2>
          <ul className="divide-y divide-neutral-800">
            {canceladas.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2 text-sm text-neutral-600">
                <span className="w-20 shrink-0 font-mono line-through">{hora(c.starts_at)}</span>
                <span className="min-w-0 flex-1 truncate line-through">{c.clients?.name}</span>
                <DatosCliente
                  compacto
                  nombre={c.clients?.name ?? "Cliente"}
                  telefono={c.clients?.phone ?? null}
                  instagram={c.clients?.instagram ?? null}
                />
                <form action={cambiarEstado}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="estado" value="booked" />
                  <input type="hidden" name="dia" value={diaElegido} />
                  <input type="hidden" name="servicio" value={servicioId ?? ""} />
                  <button className="text-xs text-neutral-400 underline">reactivar</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-6 text-xs text-neutral-600">
        Al cancelar, esa hora vuelve a quedar disponible para que otra persona la tome.
      </p>
    </>
  );
}
