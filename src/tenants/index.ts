import type { Tenant } from "@/lib/types";
import { demo } from "./demo";
import { sulminas } from "./sulminas";

/**
 * Registro dos clientes. Por enquanto em código; depois vai para o banco
 * e para o painel administrativo.
 */
const TENANTS: Record<string, Tenant> = {
  [demo.slug]: demo,
  [sulminas.slug]: sulminas,
};

export function getTenant(slug: string): Tenant | undefined {
  return TENANTS[slug];
}

export function listTenants(): Tenant[] {
  return Object.values(TENANTS);
}
