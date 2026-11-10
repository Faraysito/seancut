import { ViewTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const IG_PRODUCTOS = "https://www.instagram.com/seannova.cl/";

export const metadata = {
  title: "Catálogo · SeanNova",
  description: "Ropa y gorros SeanNova. Envíos a todo Chile.",
};

export default async function CatalogoPublico() {
  const supabase = await createClient();

  // solo productos: los cortes y la barba se quedan en la landing
  const { data: productos, error } = await supabase
    .from("items")
    .select("id, name, description, image_path")
    .eq("brand", "seannova")
    .eq("kind", "product")
    .eq("active", true)
    .order("name");

  const url = (path: string | null) =>
    path ? supabase.storage.from("items").getPublicUrl(path).data.publicUrl : null;

  const lista = productos ?? [];

  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      default="none"
    >
    <main className="min-h-dvh bg-neutral-950 text-neutral-100">
      <div className="mx-auto w-full max-w-md px-6 py-12 md:max-w-6xl md:px-10 md:py-16">
        <Link href="/" transitionTypes={["nav-back"]} className="inline-flex items-center gap-2 rounded-full border border-neutral-700 px-5 py-2.5 text-sm text-neutral-300 transition hover:border-neutral-500 hover:text-white md:px-6 md:py-3 md:text-base">← Volver</Link>

        <div className="mb-10 mt-8 text-center md:mb-16 md:mt-10">
          <Image src="/seannova.png" alt="SeanNova" width={200} height={200} className="mx-auto h-24 w-24 rounded-full object-cover md:h-32 md:w-32" priority />
          <h1 className="mt-4 text-3xl font-bold tracking-tight md:mt-6 md:text-5xl">SEANNOVA</h1>
          <p className="mt-1 text-sm text-neutral-400 md:mt-2 md:text-lg">Ropa y gorros · Envíos a todo Chile</p>
          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-neutral-500 md:mt-6 md:text-sm">
            Precios y tallas por DM
          </p>
        </div>

        {error && (
          <p className="rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-400">
            {error.message}
          </p>
        )}

        {!error && lista.length === 0 && (
          <p className="rounded-md border border-dashed border-neutral-800 p-8 text-center text-sm text-neutral-500">
            Todavía no hay productos publicados.
          </p>
        )}

        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-8">
          {lista.map((p) => (
            <li key={p.id}>
              <a href={IG_PRODUCTOS} target="_blank" rel="noreferrer" className="group block">
                {url(p.image_path) ? (
                  <img src={url(p.image_path)!} alt={p.name} className="aspect-square w-full rounded-lg object-cover transition group-hover:opacity-75" />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-neutral-900 text-xs text-neutral-700">
                    sin foto
                  </div>
                )}
                <p className="mt-3 text-sm font-medium leading-tight md:text-lg">{p.name}</p>
                {p.description ? <p className="mt-1 text-xs text-neutral-500 md:text-sm">{p.description}</p> : null}
                <p className="mt-1 text-xs text-neutral-600 md:text-sm">Consultar por DM →</p>
              </a>
            </li>
          ))}
        </ul>

        <div className="mx-auto max-w-sm">
          <a href={IG_PRODUCTOS} target="_blank" rel="noreferrer" className="mt-12 block rounded-full bg-white py-4 text-center font-semibold text-neutral-950 transition hover:bg-neutral-200 md:mt-16 md:py-5 md:text-lg">Consultar por Instagram</a>
          <p className="mt-3 text-center text-xs text-neutral-600 md:text-sm">@seannova.cl · La Serena y Coquimbo</p>
        </div>
      </div>
    </main>
    </ViewTransition>
  );
}
