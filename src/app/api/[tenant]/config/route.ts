import { NextResponse } from "next/server";
import { json, tenantOr404 } from "@/lib/http";

/** Configuração pública do cliente: marca, planos e tipos aceitos. Sem preços internos nem CRM. */
export async function GET(_req: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const tenant = await tenantOr404(params);
  if (tenant instanceof NextResponse) return tenant;
  return json({
    slug: tenant.slug,
    branding: tenant.branding,
    plans: tenant.pricing.plans,
    vehicleTypes: tenant.acceptance.vehicleTypes,
    usageTypes: tenant.acceptance.usageTypes,
  });
}
