import Link from "next/link";
import { MesNav } from "@/components/mes-nav";
import { InfoTip } from "@/components/tooltip";
import { MARCAS, clp, mensajeGastos, nombreCategoria } from "@/lib/gastos";
import { mesActual, mesValido, nombreMes } from "@/lib/mes";
import { movimientosDelMes, type Movimiento } from "@/lib/movimientos";

// lo que entró (cortes y productos cobrados) menos lo que salió (lo que se
// anota en Gastos). no se resta además el "costo de lo vendido": si sean
// anota la compra de poleras como gasto y encima se descuenta el costo al
// venderlas, esas poleras se contarían dos veces
function sumar(filas: Movimiento[]) {
  let entro = 0;
  let salio = 0;
  for (const f of filas) {
    if (f.direction === "in") entro += f.amount_clp;
    else if (f.direction === "out") salio += f.amount_clp;
  }
  return { entro, salio, resultado: entro - salio };
}

function Resultado({ n }: { n: number }) {
  return (
    <span className={"tabular-nums " + (n > 0 ? "text-emerald-400" : n < 0 ? "text-red-400" : "text-neutral-300")}>
      {clp(n)}
    </span>
  );
}

export default async function Resumen({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const actual = mesActual();
  const elegido = mesValido(mes);
  const delMes = nombreMes(elegido, false);

  const { filas, error } = await movimientosDelMes(elegido);

  const total = sumar(filas);
  const hayMovimientos = filas.length > 0;

  const negocios = MARCAS.map((m) => ({ ...m, ...sumar(filas.filter((f) => f.brand === m.id)) })).filter(
    (n) => n.entro > 0 || n.salio > 0
  );

  const sumas = new Map<string, number>();
  for (const f of filas) {
    if (f.direction !== "out") continue;
    const k = nombreCategoria(f.category);
    sumas.set(k, (sumas.get(k) ?? 0) + f.amount_clp);
  }
  const porCategoria = [...sumas].sort((a, b) => b[1] - a[1]);
  const linkGastos = "/panel/gastos" + (elegido === actual ? "" : "?mes=" + elegido);

  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">Resumen</h1>
      <MesNav ruta="/panel/resumen" mes={elegido} actual={actual} />

      {error ? (
        <p className="mt-6 rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-400">
          {mensajeGastos(error)}
        </p>
      ) : (
        <>
          <div
            className={
              "mt-6 rounded-lg border p-5 " +
              (total.resultado > 0
                ? "border-emerald-900 bg-emerald-950/30"
                : total.resultado < 0
                  ? "border-red-900 bg-red-950/30"
                  : "border-neutral-800 bg-neutral-900")
            }
          >
            <div className="flex items-center gap-1.5">
              <p className="text-sm text-neutral-300">
                {!hayMovimientos
                  ? "Sin movimientos en " + delMes
                  : total.resultado > 0
                    ? "En " + delMes + " ganaste"
                    : total.resultado < 0
                      ? "En " + delMes + " perdiste"
                      : "En " + delMes + " quedaste justo en"}
              </p>
              <InfoTip
                align="start"
                text="Lo que entró por cortes y productos cobrados, menos lo que anotaste en Gastos. Si es positivo ganaste; si es negativo, gastaste más de lo que vendiste."
              />
            </div>
            <p
              className={
                "mt-1 text-4xl font-semibold tabular-nums " +
                (total.resultado > 0 ? "text-emerald-400" : total.resultado < 0 ? "text-red-400" : "text-neutral-200")
              }
            >
              {/* "perdiste $10.000" se lee mejor que "perdiste -$10.000" */}
              {clp(Math.abs(total.resultado))}
            </p>

            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
              <div>
                <dt className="text-xs text-neutral-500">Entró (ventas)</dt>
                <dd className="text-lg tabular-nums text-emerald-400">{clp(total.entro)}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Salió (gastos)</dt>
                <dd className="text-lg tabular-nums text-red-400">−{clp(total.salio)}</dd>
              </div>
            </dl>

            {elegido === actual && hayMovimientos && (
              <p className="mt-3 text-xs text-neutral-500">El mes todavía no termina: esto es lo que llevas hasta hoy.</p>
            )}
          </div>

          {negocios.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">Por negocio</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {negocios.map((n) => (
                  <div key={n.id} className="rounded-lg border border-neutral-800 p-4">
                    <p className="font-medium">
                      {n.label} <span className="text-xs font-normal text-neutral-500">· {n.ayuda}</span>
                    </p>
                    <dl className="mt-2 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-neutral-500">Ventas</dt>
                        <dd className="tabular-nums text-emerald-400">{clp(n.entro)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-neutral-500">Gastos</dt>
                        <dd className="tabular-nums text-red-400">−{clp(n.salio)}</dd>
                      </div>
                      <div className="flex justify-between border-t border-neutral-800 pt-1 font-medium">
                        <dt>{n.resultado < 0 ? "Pérdida" : "Ganancia"}</dt>
                        <dd>
                          <Resultado n={n.resultado} />
                        </dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-8">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="text-xs uppercase tracking-[0.2em] text-neutral-500">En qué se fue la plata</h2>
              <Link
                href={linkGastos}
                className="text-xs text-neutral-400 underline underline-offset-4 transition hover:text-white"
              >
                Ver gastos →
              </Link>
            </div>

            {porCategoria.length === 0 ? (
              <p className="rounded-md border border-dashed border-neutral-800 p-5 text-center text-sm text-neutral-500">
                No hay gastos anotados en {delMes}.{" "}
                <Link href={linkGastos} className="text-neutral-300 underline underline-offset-4">
                  Anótalos en Gastos
                </Link>{" "}
                para que la cuenta sea real.
              </p>
            ) : (
              <ul className="space-y-3">
                {porCategoria.map(([nombre, monto]) => (
                  <li key={nombre}>
                    <div className="flex justify-between gap-3 text-sm">
                      <span>{nombre}</span>
                      <span className="tabular-nums text-neutral-300">{clp(monto)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-800">
                      <div
                        className="h-full rounded-full bg-red-500/70"
                        style={{ width: Math.max(2, Math.round((monto / total.salio) * 100)) + "%" }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
