import { NextResponse } from "next/server";
import { normalizePlate } from "@/lib/format";
import { body, error, json, tenantOr404 } from "@/lib/http";
import { getPlateProvider } from "@/lib/vehicles";

export async function POST(req: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const tenant = await tenantOr404(params);
  if (tenant instanceof NextResponse) return tenant;
  const data = (await body(req)) as { plate?: string } | null;
  const plate = normalizePlate(data?.plate ?? "");
  if (!plate) return error("Placa inválida.", 400);
  return json({ plate, ...(await getPlateProvider().lookup(plate)) });
}
