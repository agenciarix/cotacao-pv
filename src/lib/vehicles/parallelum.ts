import type { VehicleType } from "../types";
import type { FipeItem, FipePrice, FipeProvider } from "./types";

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

const toItems = (list: Item[]): FipeItem[] => list.map((i) => ({ code: String(i.codigo), name: i.nome }));

function parseBRL(value: string): number {
  return Math.round(Number(value.replace(/[^\d,]/g, "").replace(",", ".")) * 100);
}

export const parallelumFipe: FipeProvider = {
  async brands(type) {
    return toItems(await get<Item[]>(`${BASE}/${PATH[type]}/marcas`));
  },
  async models(type, brand) {
    const data = await get<{ modelos: Item[] }>(`${BASE}/${PATH[type]}/marcas/${brand}/modelos`);
    return toItems(data.modelos);
  },
  async years(type, brand, model) {
    return toItems(await get<Item[]>(`${BASE}/${PATH[type]}/marcas/${brand}/modelos/${model}/anos`));
  },
  async price(type, brand, model, year): Promise<FipePrice | null> {
    const d = await get<{ Valor: string; Marca: string; Modelo: string; AnoModelo: number; CodigoFipe: string; MesReferencia: string }>(
      `${BASE}/${PATH[type]}/marcas/${brand}/modelos/${model}/anos/${year}`,
    );
    return {
      fipeCode: d.CodigoFipe,
      brand: d.Marca,
      model: d.Modelo,
      year: d.AnoModelo,
      valueCents: parseBRL(d.Valor),
      reference: d.MesReferencia,
    };
  },
};
