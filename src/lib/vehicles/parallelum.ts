import type { VehicleType } from "../types";
import type { CatalogItem, CatalogVehicle, VehicleCatalog } from "./types";

/**
 * Tabela FIPE pela API pública parallelum (https://deividfortuna.github.io/fipe/).
 * Tem limite de uso; para produção vale um plano pago ou cache próprio.
 */
const BASE = "https://parallelum.com.br/fipe/api/v1";

const PATH: Record<VehicleType, string> = {
  carro: "carros",
  utilitario: "carros",
  moto: "motos",
  caminhao: "caminhoes",
};

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 86_400 } } as RequestInit);
  if (!res.ok) throw new Error(`FIPE ${res.status}`);
  return res.json() as Promise<T>;
}

interface Item { codigo: string | number; nome: string }

const toItems = (list: Item[]): CatalogItem[] => list.map((i) => ({ code: String(i.codigo), name: i.nome }));

function parseBRL(value: string): number {
  return Math.round(Number(value.replace(/[^\d,]/g, "").replace(",", ".")) * 100);
}

export const parallelumCatalog: VehicleCatalog = {
  async brands(type) {
    return toItems(await get<Item[]>(`${BASE}/${PATH[type]}/marcas`));
  },
  async step2(type, brand) {
    const data = await get<{ modelos: Item[] }>(`${BASE}/${PATH[type]}/marcas/${brand}/modelos`);
    return { level: "modelo", items: toItems(data.modelos) };
  },
  async step3(type, brand, model) {
    return { level: "ano", items: toItems(await get<Item[]>(`${BASE}/${PATH[type]}/marcas/${brand}/modelos/${model}/anos`)) };
  },
  async resolve(type, brand, model, year): Promise<CatalogVehicle | null> {
    const d = await get<{ Valor: string; Marca: string; Modelo: string; AnoModelo: number; CodigoFipe: string }>(
      `${BASE}/${PATH[type]}/marcas/${brand}/modelos/${model}/anos/${year}`,
    );
    return { fipeCode: d.CodigoFipe, brand: d.Marca, model: d.Modelo, year: d.AnoModelo, fipeValueCents: parseBRL(d.Valor) };
  },
};
