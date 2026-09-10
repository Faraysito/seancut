import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const IG_CORTES = "https://www.instagram.com/sean.cut/";
const IG_PRODUCTOS = "https://www.instagram.com/seannova.cl/";
const DIRECCION = "Heriberto Palacios Bonilla 2731, Coquimbo";
const MAPS =
  "https://www.google.com/maps/search/?api=1&query=Heriberto+Palacios+Bonilla+2731+Coquimbo";

// TODO: confirmar con Sean. Tiene que calzar con los horarios
// que están hardcodeados en la función available_slots.
const HORARIO = "Lun a Vie 10:00–20:00 · Sáb 10:00–18:00 · Dom cerrado";

const BOTON =
  "mx-auto mt-8 block max-w-sm rounded-full bg-white py-4 text-center font-semibold text-neutral-950 transition hover:bg-neutral-200 md:mt-10 md:py-5 md:text-lg";

function clp(n: number) {
  return "$" + n.toLocaleString("es-CL");
}

export default async function Home() {
  const supabase = await createClient();

  const { data: items, error } = await supabase
    .from("items")
    .select("id, name, description, price_clp, duration_min, kind, brand")
    .eq("active", true)
    .order("name");

  const servicios = (items ?? [])
    .filter((i) => i.brand === "seancut" && i.kind === "service")
    .sort((a, b) => a.price_clp - b.price_clp);

  return (
    <main className="min-h-dvh bg-neutral-950 text-neutral-100">
      <section className="mx-auto w-full max-w-md px-6 pb-16 pt-16 text-center md:max-w-3xl md:pb-24 md:pt-24">
        <Image src="/seancut.png" alt="Sean Cut" width={240} height={240} className="mx-auto h-32 w-32 rounded-full object-cover md:h-48 md:w-48" priority />
        <h1 className="mt-6 text-4xl font-bold tracking-tight md:mt-8 md:text-6xl">SEAN CUT</h1>
        <p className="mt-2 text-xs uppercase tracking-[0.35em] text-neutral-500 md:mt-3 md:text-sm">barbería · coquimbo</p>
        <Link href="/reservar" className={BOTON}>Reservar hora</Link>
        <a href={IG_CORTES} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm text-neutral-400 underline md:text-base">@sean.cut</a>
      </section>

      <section className="mx-auto w-full max-w-md px-6 pb-16 md:max-w-2xl md:pb-24">
        <h2 className="mb-4 text-xs uppercase tracking-[0.2em] text-neutral-500 md:mb-6 md:text-sm">Servicios</h2>

        {error && (
          <p className="rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-400">
            {error.message}
          </p>
        )}

        {!error && servicios.length === 0 && (
          <p className="text-sm text-neutral-500">Todavía no hay servicios cargados.</p>
        )}

        <ul className="divide-y divide-neutral-800">
          {servicios.map((s) => (
            <li key={s.id} className="flex items-baseline justify-between gap-4 py-4 md:py-6">
              <div>
                <p className="font-medium md:text-xl">{s.name}</p>
                <p className="text-xs text-neutral-500 md:text-sm">{s.duration_min} min</p>
              </div>
              <p className="tabular-nums md:text-xl">{clp(s.price_clp)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-neutral-800 bg-neutral-900">
        <div className="mx-auto w-full max-w-md px-6 py-16 text-center md:max-w-3xl md:py-24">
          <Image src="/seannova.png" alt="SeanNova" width={200} height={200} className="mx-auto h-24 w-24 rounded-full object-cover md:h-36 md:w-36" />
          <h2 className="mt-4 text-2xl font-bold md:mt-6 md:text-4xl">SEANNOVA</h2>
          <p className="mt-1 text-sm text-neutral-400 md:mt-2 md:text-lg">Ropa y gorros · Envíos a todo Chile</p>
          <Link href="/catalogo" className={BOTON}>Ver catálogo</Link>
          <a href={IG_PRODUCTOS} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm text-neutral-400 underline md:text-base">@seannova.cl</a>
        </div>
      </section>

      <section className="mx-auto w-full max-w-md px-6 py-16 md:max-w-2xl md:py-24">
        <h2 className="mb-4 text-xs uppercase tracking-[0.2em] text-neutral-500 md:mb-6 md:text-sm">Dónde y cuándo</h2>
        <a href={MAPS} target="_blank" rel="noreferrer" className="text-sm underline md:text-lg">{DIRECCION}</a>
        <p className="mt-3 text-sm text-neutral-400 md:text-base">{HORARIO}</p>
      </section>

      <footer className="border-t border-neutral-800 py-10 text-center md:py-12">
        <div className="flex items-center justify-center gap-6 md:gap-10">
          <a href={IG_CORTES} target="_blank" rel="noreferrer" className="text-sm text-neutral-400 underline transition hover:text-white md:text-base">@sean.cut</a>
          <span className="text-neutral-700">·</span>
          <a href={IG_PRODUCTOS} target="_blank" rel="noreferrer" className="text-sm text-neutral-400 underline transition hover:text-white md:text-base">@seannova.cl</a>
        </div>
        <p className="mt-5 text-xs text-neutral-600 md:text-sm">Sean Cut · Coquimbo, Chile</p>
      </footer>
    </main>
  );
}
