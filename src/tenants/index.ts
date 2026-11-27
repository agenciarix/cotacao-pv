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

/** Cliente dono de um domínio (sem porta, sem diferenciar maiúsculas). */
export function getTenantByHost(host: string | null | undefined): Tenant | undefined {
  if (!host) return undefined;
  const h = host.split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
  return Object.values(TENANTS).find((t) => t.domains.some((d) => d.toLowerCase() === h));
}
