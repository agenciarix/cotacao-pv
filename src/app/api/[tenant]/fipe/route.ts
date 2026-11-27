import { NextResponse } from "next/server";
import { error, json, tenantOr404 } from "@/lib/http";
import type { VehicleType } from "@/lib/types";
import { getFipeProvider } from "@/lib/vehicles";

/**
 * Navegação pela FIPE, um nível por vez:
 * ?type=carro -> marcas; &brand= -> modelos; &model= -> anos; &year= -> preço.
 */
export async function GET(req: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const tenant = await tenantOr404(params);
  if (tenant instanceof NextResponse) return tenant;
  const q = new URL(req.url).searchParams;
  const type = q.get("type") as VehicleType | null;
  if (!type || !tenant.acceptance.vehicleTypes.includes(type)) return error("Tipo de veículo inválido.", 400);
  const brand = q.get("brand");
  const model = q.get("model");
  const year = q.get("year");
  const fipe = getFipeProvider();
  try {
    if (brand && model && year) {
      const price = await fipe.price(type, brand, model, year);
      return price ? json(price) : error("Valor FIPE não encontrado.", 404);
    }
    if (brand && model) return json(await fipe.years(type, brand, model));
    if (brand) return json(await fipe.models(type, brand));
    return json(await fipe.brands(type));
  } catch {
    return error("Tabela FIPE indisponível no momento.", 502);
  }
}
