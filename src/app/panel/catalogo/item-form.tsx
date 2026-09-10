"use client";

import { useState } from "react";

export type ItemFormData = {
  id: string;
  brand: string;
  kind: string;
  name: string;
  description: string | null;
  price_clp: number;
  cost_clp: number;
  duration_min: number | null;
  stock: number | null;
  active: boolean;
};

const INPUT =
  "w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500";
const LABEL = "mb-1 block text-xs uppercase tracking-[0.2em] text-neutral-500";

export default function ItemForm({
  item,
  action,
  imagenUrl,
}: {
  item?: ItemFormData;
  action: (formData: FormData) => void;
  imagenUrl?: string | null;
}) {
  const [kind, setKind] = useState(item?.kind ?? "service");

  return (
    <form action={action} className="space-y-5">
      {item && <input type="hidden" name="id" value={item.id} />}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Marca</label>
          <select name="brand" defaultValue={item?.brand ?? "seancut"} className={INPUT}>
            <option value="seancut">Sean Cut</option>
            <option value="seannova">SeanNova</option>
          </select>
        </div>
        <div>
          <label className={LABEL}>Tipo</label>
          <select name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className={INPUT}>
            <option value="service">Servicio</option>
            <option value="product">Producto</option>
          </select>
        </div>
      </div>

      <div>
        <label className={LABEL}>Nombre</label>
        <input name="name" defaultValue={item?.name} required className={INPUT} />
      </div>

      <div>
        <label className={LABEL}>Descripción</label>
        <input name="description" defaultValue={item?.description ?? ""} placeholder="Tallas S / M / L / XL" className={INPUT} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Precio</label>
          <input type="number" name="price_clp" min={0} defaultValue={item?.price_clp ?? 0} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Costo</label>
          <input type="number" name="cost_clp" min={0} defaultValue={item?.cost_clp ?? 0} className={INPUT} />
          <p className="mt-1 text-xs text-neutral-600">Lo que te costó. Sirve para el margen.</p>
        </div>
      </div>

      {kind === "service" ? (
        <div>
          <label className={LABEL}>Duración (min)</label>
          <input type="number" name="duration_min" min={5} step={5} defaultValue={item?.duration_min ?? 30} className={INPUT} />
          <p className="mt-1 text-xs text-neutral-600">Con esto se calculan los bloques de la agenda.</p>
        </div>
      ) : (
        <div>
          <label className={LABEL}>Stock</label>
          <input type="number" name="stock" min={0} defaultValue={item?.stock ?? 0} className={INPUT} />
        </div>
      )}

      <div>
        <label className={LABEL}>Imagen</label>
        {imagenUrl && (
          <img src={imagenUrl} alt="" className="mb-2 h-24 w-24 rounded-md object-cover" />
        )}
        <input type="file" name="image" accept="image/*" className="w-full text-sm text-neutral-400 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-800 file:px-3 file:py-2 file:text-sm file:text-neutral-100" />
        <p className="mt-1 text-xs text-neutral-600">Máximo 5 MB. Si no subes nada, se queda la que ya tiene.</p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={item?.active ?? true} className="h-4 w-4" />
        Visible en la página pública
      </label>

      <button className="w-full rounded-full bg-white px-3 py-3 font-semibold text-neutral-950">
        {item ? "Guardar" : "Crear"}
      </button>
    </form>
  );
}
