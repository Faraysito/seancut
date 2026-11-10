import { createClient } from "@/lib/supabase/server";
import { publicarNota, quitarNota, reutilizarNota } from "./actions";

const TZ = "America/Santiago";

export default async function Notas({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; err?: string }>;
}) {
  const { msg, err } = await searchParams;
  const supabase = await createClient();

  const { data: activa } = await supabase
    .from("notices")
    .select("id, message, created_at")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: historial } = await supabase
    .from("notices")
    .select("id, message, created_at")
    .eq("active", false)
    .order("created_at", { ascending: false })
    .limit(8);

  return (
    <>
      <h1 className="text-xl font-semibold">Notas</h1>
      <p className="mb-4 text-sm text-neutral-500">
        Lo que escribas acá aparece en un recuadro amarillo en la página que ven los
        clientes. Si no hay nada publicado, no aparece nada.
      </p>

      {msg && <p className="mb-4 rounded-md border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-400">{msg}</p>}
      {err && <p className="mb-4 rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-400">{err}</p>}

      {activa ? (
        <div className="mb-6 rounded-lg bg-amber-400 p-4 text-neutral-950">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]">Publicado ahora</p>
          <p className="mt-2 font-medium">{activa.message}</p>
        </div>
      ) : (
        <p className="mb-6 rounded-md border border-dashed border-neutral-800 p-6 text-center text-sm text-neutral-500">
          No hay ningún aviso publicado
        </p>
      )}

      <form action={publicarNota} className="space-y-3">
        <textarea
          name="message"
          rows={3}
          maxLength={280}
          required
          defaultValue={activa?.message ?? ""}
          placeholder="Esta semana no corto pelo. Vuelvo el lunes."
          className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 placeholder-neutral-600 md:px-4 md:py-3"
        />
        <button className="w-full rounded-full bg-white px-3 py-3 font-semibold text-neutral-950 transition hover:bg-neutral-200">
          {activa ? "Actualizar aviso" : "Publicar aviso"}
        </button>
      </form>

      {activa && (
        <form action={quitarNota} className="mt-3">
          <button className="w-full rounded-full border border-neutral-700 px-3 py-3 text-sm text-neutral-300 transition hover:border-neutral-500">
            Quitar aviso de la página
          </button>
        </form>
      )}

      {historial && historial.length > 0 && (
        <section className="mt-10 border-t border-neutral-800 pt-6">
          <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-neutral-500">Anteriores</h2>
          <ul className="divide-y divide-neutral-800">
            {historial.map((n) => (
              <li key={n.id} className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-neutral-400">{n.message}</p>
                  <p className="mt-1 text-xs text-neutral-600">
                    {new Date(n.created_at).toLocaleDateString("es-CL", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                      timeZone: TZ,
                    })}
                  </p>
                </div>
                <form action={reutilizarNota}>
                  <input type="hidden" name="id" value={n.id} />
                  <button className="shrink-0 text-xs text-neutral-400 underline">volver a usar</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
