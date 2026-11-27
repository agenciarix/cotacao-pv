import type { Lead } from "./types";

/**
 * Armazenamento provisório em memória. Na próxima fase vira Postgres
 * (Supabase), com as mesmas funções.
 */
interface Store {
  leads: Map<string, Lead>;
  crmLog: CrmLogEntry[];
}

export interface CrmLogEntry {
  at: string;
  tenant: string;
  leadId: string;
  action: "create" | "update";
  payload: unknown;
  result: string;
}

const g = globalThis as unknown as { __cotacaoStore?: Store };
const store: Store = (g.__cotacaoStore ??= { leads: new Map(), crmLog: [] });

export function createLead(data: Pick<Lead, "tenant" | "name" | "phone">): Lead {
  const now = new Date().toISOString();
  const lead: Lead = { id: globalThis.crypto.randomUUID(), createdAt: now, updatedAt: now, step: "contato", ...data };
  store.leads.set(lead.id, lead);
  return lead;
}

export function getLead(tenant: string, id: string): Lead | undefined {
  const lead = store.leads.get(id);
  return lead && lead.tenant === tenant ? lead : undefined;
}

export function updateLead(lead: Lead, patch: Partial<Lead>): Lead {
  const updated: Lead = { ...lead, ...patch, id: lead.id, tenant: lead.tenant, updatedAt: new Date().toISOString() };
  store.leads.set(lead.id, updated);
  return updated;
}

export function listLeads(tenant: string): Lead[] {
  return [...store.leads.values()]
    .filter((l) => l.tenant === tenant)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function logCrm(entry: CrmLogEntry) {
  store.crmLog.unshift(entry);
  store.crmLog.length = Math.min(store.crmLog.length, 500);
}

export function listCrmLog(tenant: string): CrmLogEntry[] {
  return store.crmLog.filter((e) => e.tenant === tenant);
}

/** Só para testes. */
export function resetStore() {
  store.leads.clear();
  store.crmLog.length = 0;
}
