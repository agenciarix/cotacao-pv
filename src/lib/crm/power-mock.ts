import { logCrm } from "../store";
import { toPowerPayload } from "./power-mapping";
import type { CrmConnector } from "./types";

/**
 * Power CRM simulado: monta exatamente o que seria enviado, guarda no log
 * (visível no painel do cliente) e devolve um id falso.
 */
export const powerMock: CrmConnector = {
  async createQuote(tenant, lead) {
    const crmQuoteId = `SIM-${lead.id.slice(0, 8).toUpperCase()}`;
    logCrm({
      at: new Date().toISOString(),
      tenant: tenant.slug,
      leadId: lead.id,
      action: "create",
      payload: toPowerPayload(lead),
      result: crmQuoteId,
    });
    return { crmQuoteId };
  },
  async updateQuote(tenant, lead) {
    logCrm({
      at: new Date().toISOString(),
      tenant: tenant.slug,
      leadId: lead.id,
      action: "update",
      payload: toPowerPayload(lead),
      result: lead.crmQuoteId,
    });
    return { crmQuoteId: lead.crmQuoteId };
  },
};
