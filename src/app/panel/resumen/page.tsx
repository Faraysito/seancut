import { createClient } from "@/lib/supabase/server";

const TZ = "America/Santiago";

const NOMBRE: Record<string, string> = {
  seancut: "Sean Cut",
  seannova: "SeanNova",
};

function clp(n: number) {
  return (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("es-CL");
}

export default async function Resumen({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const supabase = await createClient();

  // sin ?mes en la URL, el mes actual en Chile (no en UTC)
  const mesActual = new Date()
    .toLocaleDateString("en-CA", { timeZone: TZ })
    .slice(0, 7);
  const mesElegido = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : mesActual;

  const { data: filas, error } = await supabase.rpc("monthly_summary", {
    p_month: mesElegido + "-01",
  });

  if (error) return <pre className="text-red-600">{error.message}</pre>;

  const resumen = filas ?? [];

  const total = resumen.reduce(
    (acc, r) => ({
      ingresos: acc.ingresos + r.ingresos,
      gastos: acc.gastos + r.gastos,
      ganancia: acc.ganancia + r.ganancia,
    }),
    { ingresos: 0, gastos: 0, ganancia: 0 }
  );

  // mediodía para que ningún corrimiento de zona me cambie el mes
  const etiqueta = new Date(mesElegido + "-01T12:00:00").toLocaleDateString(
    "es-CL",
    { month: "long", year: "numeric" }
  );

  return (
    <>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Resumen</h1>
          <p className="text-sm text-neutral-500">{etiqueta}</p>
        </div>
        <form className="flex gap-2">
          <input
            type="month"
            name="mes"
            defaultValue={mesElegido}
            max={mesActual}
            className="rounded-md border px-2 py-1 text-sm"
          />
          <button className="rounded-md border px-3 py-1 text-sm">Ver</button>
        </form>
      </div>

      <div className="mb-6 rounded-md border p-4">
        <p className="text-sm text-neutral-500">Ganancia del mes</p>
        <p
          className={
            "text-3xl font-semibold tabular-nums " +
            (total.ganancia >= 0 ? "text-green-700" : "text-red-600")
          }
        >
          {clp(total.ganancia)}
        </p>
        <p className="mt-1 text-sm text-neutral-500">
          {clp(total.ingresos)} en ventas, {clp(total.gastos)} en gastos
        </p>
      </div>

      {resumen.length === 0 && (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-neutral-500">
          Sin movimientos este mes
        </p>
      )}

      <div className="space-y-3">
        {resumen.map((r) => (
          <div key={r.marca} className="rounded-md border p-4">
            <p className="mb-2 font-medium">{NOMBRE[r.marca] ?? r.marca}</p>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-500">Ventas</dt>
                <dd className="tabular-nums text-green-700">{clp(r.ingresos)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Costo de lo vendido</dt>
                <dd className="tabular-nums text-neutral-600">−{clp(r.costos)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Gastos</dt>
                <dd className="tabular-nums text-red-600">−{clp(r.gastos)}</dd>
              </div>
              <div className="flex justify-between border-t pt-1 font-medium">
                <dt>Ganancia</dt>
                <dd
                  className={
                    "tabular-nums " +
                    (r.ganancia >= 0 ? "text-green-700" : "text-red-600")
                  }
                >
                  {clp(r.ganancia)}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </>
  );
}