import { NextResponse } from "next/server";
import { publicLead, startCheckout } from "@/lib/checkout";
import { body, error, json, tenantOr404 } from "@/lib/http";

export async function POST(req: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const tenant = await tenantOr404(params);
  if (tenant instanceof NextResponse) return tenant;
  const result = await startCheckout(tenant, await body(req));
  if (!result.ok) return error(result.error, result.status);
  return json(publicLead(result.lead), 201);
}
