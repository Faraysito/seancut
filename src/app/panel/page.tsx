import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const IG_CORTES = "https://www.instagram.com/sean.cut/";
const IG_PRODUCTOS = "https://www.instagram.com/seannova.cl/";

// ⬇️ CAMBIA ESTO por los datos reales
const DIRECCION = "Av. Ejemplo 1234, Santiago";
const HORARIO = "Lun a Vie 10:00–20:00 · Sáb 10:00–18:00 · Dom cerrado";
const WHATSAPP = "https://wa.me/56900000000";

function clp(n: number) {
  return "$" + n.toLocaleString("es-CL");
}

export default async function Home() {
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("items")
    .select("id, name, price_clp, duration_min, brand")
    .eq("active", true)
    .order("price_clp");

  const servicios = (items ?? []).filter((i) => i.brand === "seancut");
  const productos = (items ?? []).filter((i) => i.brand === "seannova");

  return (
    <main className="min-h-dvh bg-neutral-950 text-neutral-100">
      <section className="mx-auto max-w-md px-6 pb-14 pt-16 text-center">
        <Image src="/seancut.png" alt="Sean Cut" width={130} height={130} className="mx-auto rounded-full" priority />
        <h1 className="mt-6 text-4xl font-bold tracking-tight">SEAN CUT</h1>
        <p className="mt-2 text-xs uppercase tracking-[0.35em] text-neutral-500">barbería</p>
        <Link href="/reservar" className="mt-8 block rounded-full bg-white py-4 text-center font-semibold text-neutral-950">Reservar hora</Link>
        <a href={IG_CORTES} className="mt-4 inline-block text-sm text-neutral-400 underline">@sean.cut</a>
      </section>

      <section className="mx-auto max-w-md px-6 pb-14">
        <h2 className="mb-4 text-xs uppercase tracking-[0.2em] text-neutral-500">Servicios</h2>
        <ul className="divide-y divide-neutral-800">
          {servicios.map((s) => (
            <li key={s.id} className="flex items-baseline justify-between py-3">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-neutral-500">{s.duration_min} min</p>
              </div>
              <p className="tabular-nums">{clp(s.price_clp)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-neutral-800 bg-neutral-900">
        <div className="mx-auto max-w-md px-6 py-14 text-center">
          <Image src="/seannova.png" alt="SeanNova" width={90} height={90} className="mx-auto rounded-full" />
          <h2 className="mt-4 text-2xl font-bold">SEANNOVA</h2>
          <p className="mt-1 text-sm text-neutral-400">Productos para el pelo y la barba</p>

          <ul className="mt-6 divide-y divide-neutral-800 text-left">
            {productos.map((p) => (
              <li key={p.id} className="flex items-baseline justify-between py-3">
                <p className="font-medium">{p.name}</p>
                <p className="tabular-nums">{clp(p.price_clp)}</p>
              </li>
            ))}
          </ul>

          <a href={IG_PRODUCTOS} className="mt-6 inline-block rounded-full border border-neutral-600 px-6 py-3 text-sm">Comprar por @seannova.cl</a>
        </div>
      </section>

      <section className="mx-auto max-w-md px-6 py-14">
        <h2 className="mb-4 text-xs uppercase tracking-[0.2em] text-neutral-500">Dónde y cuándo</h2>
        <p className="text-sm">{DIRECCION}</p>
        <p className="mt-2 text-sm text-neutral-400">{HORARIO}</p>
        <a href={WHATSAPP} className="mt-6 inline-block text-sm text-green-500 underline">Escribir por WhatsApp</a>
      </section>

      <footer className="border-t border-neutral-800 py-8 text-center text-xs text-neutral-600">
        Sean Cut · Santiago, Chile
      </footer>
    </main>
  );
}