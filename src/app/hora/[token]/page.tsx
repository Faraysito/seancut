import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DIRECCION, MAPS, fechaLarga, horaCorta, linkConfirmacion } from "@/lib/local";
import { cancelarConToken } from "./actions";

export const metadata = {
  title: "Tu hora · Sean Cut",
};

export default async function Hora({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ err?: string }>;
}) {
  const { token } = await params;
  const { err } = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase.rpc("appointment_by_token", { p_token: token });
  const cita = data?.[0];

  if (!cita) notFound();

  const cancelada = cita.status === "cancelled";
  const pasada = new Date(cita.starts_at) <= new Date();

  return (
    <main className="min-h-dvh bg-neutral-950 text-neutral-100">
      <div className="mx-auto w-full max-w-md px-6 py-12 md:max-w-lg md:py-20">
        <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-neutral-700 px-5 py-2.5 text-sm text-neutral-300 transition hover:border-neutral-500 hover:text-white">← Volver</Link>

        <h1 className="mt-8 text-2xl font-bold tracking-tight md:text-4xl">
          {cancelada ? "Hora cancelada" : "Tu hora"}
        </h1>
        <p className="mb-8 text-xs uppercase tracking-[0.3em] text-neutral-500">sean cut</p>

        {err && (
          <p className="mb-6 rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-400">{err}</p>
        )}

        <div
          className={
            "rounded-lg border p-6 " +
            (cancelada
              ? "border-neutral-800 bg-neutral-900/60"
              : "border-emerald-800 bg-emerald-950/30")
          }
        >
          <p className={"text-2xl font-semibold " + (cancelada ? "text-neutral-500 line-through" : "")}>
            {horaCorta(cita.starts_at)}
          </p>
          <p className={"mt-1 capitalize " + (cancelada ? "text-neutral-600" : "text-neutral-300")}>
            {fechaLarga(cita.starts_at)}
          </p>

          <dl className="mt-6 space-y-2 border-t border-neutral-800 pt-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Servicio</dt>
              <dd>{cita.servicio}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Valor</dt>
              <dd className="tabular-nums">${cita.price_clp.toLocaleString("es-CL")}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">A nombre de</dt>
              <dd>{cita.cliente}</dd>
            </div>
          </dl>
        </div>

        {cancelada ? (
          <Link href="/reservar" className="mt-8 block rounded-full bg-white py-4 text-center font-semibold text-neutral-950 transition hover:bg-neutral-200">Reservar otra hora</Link>
        ) : (
          <>
            <a href={linkConfirmacion(cita.cliente, cita.servicio, cita.starts_at)} target="_blank" rel="noreferrer" className="mt-8 block rounded-full bg-emerald-500 py-4 text-center font-semibold text-neutral-950 transition hover:bg-emerald-400">Confirmar por WhatsApp</a>

            <a href={"/api/hora/" + token + "/ics"} className="mt-3 block rounded-full border border-neutral-600 py-4 text-center text-sm transition hover:border-neutral-400">Agregar a mi calendario</a>
            <p className="mt-2 text-center text-xs text-neutral-600">
              Te avisa la noche anterior y 15 minutos antes.
            </p>
          </>
        )}

        <div className="mt-10 border-t border-neutral-800 pt-6">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Dónde</p>
          <a href={MAPS} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm underline">{DIRECCION}</a>
        </div>

        {!cancelada && !pasada && (
          <form action={cancelarConToken} className="mt-10 border-t border-neutral-800 pt-6">
            <input type="hidden" name="token" value={token} />
            <button className="text-sm text-red-400 underline">Cancelar mi hora</button>
            <p className="mt-1 text-xs text-neutral-600">
              Si no vas a poder venir, cancela para que otra persona pueda tomarla.
            </p>
          </form>
        )}

        <p className="mt-10 text-center text-xs text-neutral-700">
          Guarda este link para volver a ver o cancelar tu hora.
        </p>
      </div>
    </main>
  );
}
