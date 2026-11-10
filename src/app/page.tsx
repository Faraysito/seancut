import { ViewTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const IG_CORTES = "https://www.instagram.com/sean.cut/";
const IG_PRODUCTOS = "https://www.instagram.com/seannova.cl/";
const DIRECCION = "Heriberto Palacios Bonilla 2731, Coquimbo";
const MAPS =
  "https://www.google.com/maps/search/?api=1&query=Heriberto+Palacios+Bonilla+2731+Coquimbo";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const BOTON =
  "mt-8 block w-full rounded-full bg-white py-4 text-center font-semibold text-neutral-950 transition hover:bg-neutral-200 md:py-5 md:text-lg";

function clp(n: number) {
  return "$" + n.toLocaleString("es-CL");
}

export default async function Home() {
  const supabase = await createClient();

  const { data: items, error } = await supabase
    .from("items")
    .select("id, name, description, price_clp, duration_min, kind, brand, image_path")
    .eq("active", true)
    .order("name");

  const { data: tramos } = await supabase
    .from("business_hours")
    .select("dow, opens, closes")
    .order("dow")
    .order("opens");

  const { data: aviso } = await supabase
    .from("notices")
    .select("message")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const url = (path: string | null) =>
    path ? supabase.storage.from("items").getPublicUrl(path).data.publicUrl : null;

  // el horario que se muestra sale de la misma tabla que usa el buscador
  // de horas: no pueden contradecirse
  const horario = DIAS.map((label, i) => ({
    label,
    rangos: (tramos ?? [])
      .filter((t) => t.dow === i + 1)
      .map((t) => t.opens.slice(0, 5) + "–" + t.closes.slice(0, 5)),
  }));

  const servicios = (items ?? [])
    .filter((i) => i.brand === "seancut" && i.kind === "service")
    .sort((a, b) => a.price_clp - b.price_clp);

  const vitrina = (items ?? [])
    .filter((i) => i.brand === "seannova" && i.kind === "product" && i.image_path)
    .slice(0, 4);

  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      default="none"
    >
    <main className="min-h-dvh bg-neutral-950 text-neutral-100">
      {aviso && (
        <header className="sticky top-0 z-30 bg-amber-400 text-neutral-950">
          <div className="mx-auto flex max-w-5xl items-baseline gap-3 px-6 py-3 md:px-10">
            <span className="shrink-0 text-xs font-bold uppercase tracking-[0.2em]">Aviso</span>
            <p className="text-sm font-medium md:text-base">{aviso.message}</p>
          </div>
        </header>
      )}

      <div className="grid md:grid-cols-2">
        <section className="border-b border-neutral-800 px-6 py-16 md:border-b-0 md:border-r md:px-10 md:py-24">
          <div className="mx-auto w-full max-w-md">
            <div className="text-center">
              <Image src="/seancut.png" alt="Sean Cut" width={240} height={240} className="mx-auto h-32 w-32 rounded-full object-cover md:h-40 md:w-40" priority />
              <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-5xl">SEAN CUT</h1>
              <p className="mt-2 text-xs uppercase tracking-[0.35em] text-neutral-500">barbería</p>
              <Link href="/reservar" transitionTypes={["nav-forward"]} className={BOTON}>Reservar hora</Link>
              <a href={IG_CORTES} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm text-neutral-400 underline">@sean.cut</a>
            </div>

            <h2 className="mb-2 mt-12 text-xs uppercase tracking-[0.2em] text-neutral-500">Servicios</h2>

            {error && (
              <p className="rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-400">
                {error.message}
              </p>
            )}

            <ul className="divide-y divide-neutral-800">
              {servicios.map((s) => (
                <li key={s.id} className="flex items-baseline justify-between gap-4 py-4">
                  <div>
                    <p className="font-medium md:text-lg">{s.name}</p>
                    <p className="text-xs text-neutral-500">{s.duration_min} min</p>
                  </div>
                  <p className="tabular-nums md:text-lg">{clp(s.price_clp)}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bg-neutral-900 px-6 py-16 md:px-10 md:py-24">
          <div className="mx-auto w-full max-w-md">
            <div className="text-center">
              <Image src="/seannova.png" alt="SeanNova" width={240} height={240} className="mx-auto h-32 w-32 rounded-full object-cover md:h-40 md:w-40" />
              <h2 className="mt-6 text-4xl font-bold tracking-tight md:text-5xl">SEANNOVA</h2>
              <p className="mt-2 text-xs uppercase tracking-[0.35em] text-neutral-500">ropa y gorros</p>
              <Link href="/catalogo" transitionTypes={["nav-forward"]} className={BOTON}>Ver catálogo</Link>
              <a href={IG_PRODUCTOS} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm text-neutral-400 underline">@seannova.cl</a>
            </div>

            {vitrina.length > 0 && (
              <Link href="/catalogo" transitionTypes={["nav-forward"]} className="mt-12 grid grid-cols-2 gap-3">
                {vitrina.map((p) => (
                  <img key={p.id} src={url(p.image_path)!} alt={p.name} className="aspect-square w-full rounded-lg object-cover transition hover:opacity-75" />
                ))}
              </Link>
            )}

            <p className="mt-6 text-center text-xs text-neutral-500">
              Envíos a todo Chile · Precios y tallas por DM
            </p>
          </div>
        </section>
      </div>

      <footer className="border-t border-neutral-800">
        <div className="mx-auto w-full max-w-5xl px-6 py-14 md:px-10 md:py-16">
          <div className="grid gap-10 md:grid-cols-3 md:gap-8">
            <div>
              <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-neutral-500">Dónde</h2>
              <a href={MAPS} target="_blank" rel="noreferrer" className="text-sm underline transition hover:text-white md:text-base">{DIRECCION}</a>
            </div>

            <div>
              <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-neutral-500">Horarios</h2>
              <ul className="space-y-1">
                {horario.map((d) => (
                  <li key={d.label} className="flex justify-between gap-4 text-sm">
                    <span className="w-12 text-neutral-500">{d.label}</span>
                    <span className={d.rangos.length ? "text-neutral-300" : "text-neutral-600"}>
                      {d.rangos.length ? d.rangos.join(" · ") : "Cerrado"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-neutral-500">Síguenos</h2>
              <div className="flex flex-col gap-2">
                <a href={IG_CORTES} target="_blank" rel="noreferrer" className="text-sm text-neutral-400 underline transition hover:text-white md:text-base">@sean.cut</a>
                <a href={IG_PRODUCTOS} target="_blank" rel="noreferrer" className="text-sm text-neutral-400 underline transition hover:text-white md:text-base">@seannova.cl</a>
              </div>
            </div>
          </div>

          <p className="mt-12 border-t border-neutral-900 pt-6 text-center text-xs text-neutral-600">
            Sean Cut · Coquimbo, Chile
          </p>
        </div>
      </footer>
    </main>
    </ViewTransition>
  );
}
