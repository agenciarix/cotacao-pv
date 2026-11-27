import { updateLead } from "../store";
import type { Lead, Tenant } from "../types";
import { powerMock } from "./power-mock";
import type { CrmConnector } from "./types";

/** Modo simulado: registra o que seria enviado ao Power, sem sair do sistema. */
export function getCrm(): CrmConnector {
  return powerMock;
}

/**
 * Sincroniza o lead com o CRM sem travar o checkout: se o CRM falhar,
 * o cliente segue e o erro fica gravado no lead para reenvio.
 */
export async function syncLead(tenant: Tenant, lead: Lead, crm: CrmConnector = getCrm()): Promise<Lead> {
  try {
    const result = lead.crmQuoteId
      ? await crm.updateQuote(tenant, lead as Lead & { crmQuoteId: string })
      : await crm.createQuote(tenant, lead);
    return updateLead(lead, { crmQuoteId: result.crmQuoteId, crmSyncError: undefined });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[crm] ${tenant.slug} lead ${lead.id}: ${message}`);
    return updateLead(lead, { crmSyncError: message });
  }
}
