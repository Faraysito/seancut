import Link from "next/link";
import { MesNav } from "@/components/mes-nav";
import { NOMBRE_MARCA, clp, mensajeGastos, nombreCategoria } from "@/lib/gastos";
import { TZ } from "@/lib/local";
import { mesActual, mesValido, nombreMes } from "@/lib/mes";
import { movimientosDelMes } from "@/lib/movimientos";
import { hoyISO } from "@/lib/semana";
import { BorrarGasto, GastoForm } from "./forms";

function fechaCorta(iso: string) {
  return new Date(iso)
    .toLocaleDateString("es-CL", { day: "numeric", month: "short", timeZone: TZ })
    .replace(".", "");
}

export default async function Gastos({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const actual = mesActual();
  const elegido = mesValido(mes);

  const { filas: gastos, error } = await movimientosDelMes(elegido, true);

  const total = gastos.reduce((s, g) => s + g.amount_clp, 0);

  const sumas = new Map<string, number>();
  for (const g of gastos) {
    const k = nombreCategoria(g.category);
    sumas.set(k, (sumas.get(k) ?? 0) + g.amount_clp);
  }
  const porCategoria = [...sumas].sort((a, b) => b[1] - a[1]);

  return (
    <>
      <h1 className="text-xl font-semibold">Gastos</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Anota acá todo lo que compras para el negocio: mercadería, navajas, tijeras, el arriendo...
        En Resumen se resta de lo que vendiste para ver si el mes dejó ganancia o pérdida.
      </p>

      <GastoForm hoy={hoyISO()} />

      <section className="mt-10 border-t border-neutral-800 pt-6">
        <MesNav ruta="/panel/gastos" mes={elegido} actual={actual} />

        {error ? (
          <p className="mt-4 rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-400">
            {mensajeGastos(error)}
          </p>
        ) : gastos.length === 0 ? (
          <p className="mt-4 rounded-md border border-dashed border-neutral-800 p-6 text-center text-sm text-neutral-500">
            No hay gastos anotados en {nombreMes(elegido, false)}.
          </p>
        ) : (
          <>
            <div className="mt-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
              <p className={"text-xs uppercase tracking-[0.2em] text-neutral-500"}>
                Gastaste en {nombreMes(elegido, false)}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-red-400">{clp(total)}</p>
              <ul className="mt-3 flex flex-wrap gap-2 text-xs text-neutral-300">
                {porCategoria.map(([nombre, monto]) => (
                  <li key={nombre} className="rounded-full border border-neutral-700 px-2.5 py-1">
                    {nombre} · <span className="tabular-nums">{clp(monto)}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={"/panel/resumen" + (elegido === actual ? "" : "?mes=" + elegido)}
                className="mt-4 inline-block text-xs text-neutral-400 underline underline-offset-4 transition hover:text-white"
              >
                ¿Ganaste o perdiste este mes? Ver resumen →
              </Link>
            </div>

            <ul className="mt-4 divide-y divide-neutral-800">
              {gastos.map((g) => (
                <li key={g.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
                  <span className="w-12 shrink-0 text-xs text-neutral-500">{fechaCorta(g.happened_at)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{g.reason}</p>
                    <p className="truncate text-xs text-neutral-500">
                      {nombreCategoria(g.category)} · {NOMBRE_MARCA[g.brand] ?? g.brand}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm tabular-nums text-red-400">−{clp(g.amount_clp)}</span>
                  <BorrarGasto id={g.id} detalle={g.reason} />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
