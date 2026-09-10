import { fromZonedTime } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import { logout } from "../login/actions";

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

export default async function Panel() {
  const supabase = await createClient();

  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: TZ });
  const desde = fromZonedTime(hoy + "T00:00:00", TZ);
  const hasta = fromZonedTime(hoy + "T23:59:59.999", TZ);

  const { data: citas, error } = await supabase
    .from("appointments")
    .select("id, starts_at, status, clients(name, phone), items(name)")
    .gte("starts_at", desde.toISOString())
    .lte("starts_at", hasta.toISOString())
    .order("starts_at");

  if (error) {
    return <pre className="p-8 text-red-600">{error.message}</pre>;
  }

  const fecha = new Date().toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TZ,
  });

  const lista = citas ?? [];

  return (
    <main className="mx-auto max-w-lg p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Hoy</h1>
          <p className="text-sm text-neutral-500">{fecha}</p>
        </div>
        <form action={logout}>
          <button className="text-sm text-neutral-500 underline">salir</button>
        </form>
      </header>

      {lista.length === 0 && (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-neutral-500">
          Sin horas para hoy
        </p>
      )}

      <ul className="divide-y">
        {lista.map((c) => (
          <li key={c.id} className="flex items-center gap-4 py-3">
            <span className="w-12 font-mono text-sm">{hora(c.starts_at)}</span>
            <div className="flex-1">
              <p className="font-medium">{c.clients?.name}</p>
              <p className="text-sm text-neutral-500">{c.items?.name}</p>
            </div>
            <a href={waLink(c.clients?.phone)} className="text-sm text-green-600">
              WhatsApp
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}