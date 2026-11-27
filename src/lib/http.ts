import { NextResponse } from "next/server";
import { getTenant } from "@/tenants";
import type { Tenant } from "./types";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function tenantOr404(params: Promise<{ tenant: string }>): Promise<Tenant | NextResponse> {
  const { tenant } = await params;
  return getTenant(tenant) ?? error("Cliente não encontrado.", 404);
}

export async function body(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
