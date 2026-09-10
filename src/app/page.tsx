import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();

  const { data: items, error } = await supabase
    .from("items")
    .select("name, price_clp, kind, brand")
    .eq("brand", "seancut")
    .order("price_clp");

  if (error) return <pre className="p-8 text-red-500">{error.message}</pre>;

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-6 text-2xl font-bold">Sean Cut</h1>
      <ul className="divide-y">
        {items?.map((i) => (
          <li key={i.name} className="flex justify-between py-3">
            <span>{i.name}</span>
            <span className="tabular-nums">
              ${i.price_clp.toLocaleString("es-CL")}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}