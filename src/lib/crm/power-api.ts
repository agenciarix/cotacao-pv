import { logCrm } from "../store";
import type { Tenant } from "../types";
import { toPowerPayload } from "./power-mapping";
import type { CrmConnector } from "./types";

/**
 * Conector real da Power API. ESQUELETO: os caminhos e o cabeçalho de
 * autenticação são suposições e precisam ser confirmados na documentação
 * da Power API (Minha empresa > Integrações > Power API).
 */
const PATHS = {
  // TODO(power): confirmar caminho de "cadastro de cotação".
  create: "/api/quotation/add",
  // TODO(power): confirmar caminho de "alterar cotação".
  update: (id: string) => `/api/quotation/${encodeURIComponent(id)}`,
};

function tokenFor(tenant: Tenant): string {
  const token = process.env[tenant.crm.tokenEnv];
  if (!token) throw new Error(`Token do Power não configurado (${tenant.crm.tokenEnv}).`);
  return token;
}

async function call(tenant: Tenant, method: string, path: string, body: unknown): Promise<unknown> {
  const base = process.env.POWER_API_BASE ?? "https://app.powercrm.com.br";
  const res = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      // TODO(power): confirmar formato do cabeçalho de autenticação.
      Authorization: `Bearer ${tokenFor(tenant)}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Power API ${res.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : {};
}

function extractId(data: unknown): string {
  const d = data as Record<string, unknown>;
  // TODO(power): confirmar onde a resposta traz o id da cotação.
  const id = d?.id ?? d?.quotationId ?? (d?.data as Record<string, unknown> | undefined)?.id;
  if (id === undefined || id === null) throw new Error("Resposta do Power sem id de cotação.");
  return String(id);
}

export const powerApi: CrmConnector = {
  async createQuote(tenant, lead) {
    const payload = { ...toPowerPayload(lead), ...tenant.crm.options };
    const data = await call(tenant, "POST", PATHS.create, payload);
    const crmQuoteId = extractId(data);
    logCrm({ at: new Date().toISOString(), tenant: tenant.slug, leadId: lead.id, action: "create", payload, result: crmQuoteId });
    return { crmQuoteId };
  },
  async updateQuote(tenant, lead) {
    const payload = { ...toPowerPayload(lead), ...tenant.crm.options };
    await call(tenant, "PUT", PATHS.update(lead.crmQuoteId), payload);
    logCrm({ at: new Date().toISOString(), tenant: tenant.slug, leadId: lead.id, action: "update", payload, result: lead.crmQuoteId });
    return { crmQuoteId: lead.crmQuoteId };
  },
};
