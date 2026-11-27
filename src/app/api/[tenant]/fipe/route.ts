import { NextResponse } from "next/server";
import { error, json, tenantOr404 } from "@/lib/http";
import type { VehicleType } from "@/lib/types";
import { getCatalog } from "@/lib/vehicles";

/**
 * Catálogo de veículos, um nível por vez:
 * ?type= -> marcas; &brand= -> 2º nível; &a= -> 3º nível; &b= -> veículo.
 * Cada nível diz se é "modelo" ou "ano" (a FIPE e o Power usam ordens diferentes).
 */
export async function GET(req: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const tenant = await tenantOr404(params);
  if (tenant instanceof NextResponse) return tenant;
  const q = new URL(req.url).searchParams;
  const type = q.get("type") as VehicleType | null;
  if (!type || !tenant.acceptance.vehicleTypes.includes(type)) return error("Tipo de veículo inválido.", 400);
  const brand = q.get("brand");
  const a = q.get("a");
  const b = q.get("b");
  try {
    const catalog = getCatalog(tenant);
    if (brand && a && b) {
      const v = await catalog.resolve(type, brand, a, b);
      return v ? json(v) : error("Veículo não encontrado no catálogo.", 404);
    }
    if (brand && a) return json(await catalog.step3(type, brand, a));
    if (brand) return json(await catalog.step2(type, brand));
    return json(await catalog.brands(type));
  } catch (err) {
    console.error(`[catalogo] ${tenant.slug}:`, err);
    return error("Catálogo de veículos indisponível no momento.", 502);
  }
}
