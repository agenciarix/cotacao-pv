import { NextResponse } from "next/server";
import { advanceCheckout, publicLead } from "@/lib/checkout";
import { body, error, json, tenantOr404 } from "@/lib/http";
import { getLead } from "@/lib/store";

type Ctx = { params: Promise<{ tenant: string; id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const tenant = await tenantOr404(params);
  if (tenant instanceof NextResponse) return tenant;
  const { id } = await params;
  const lead = getLead(tenant.slug, id);
  if (!lead) return error("Cotação não encontrada.", 404);
  const result = await advanceCheckout(tenant, lead, await body(req));
  if (!result.ok) return error(result.error, result.status);
  return json(publicLead(result.lead));
}
