import { updateLead } from "../store";
import type { Lead, Tenant } from "../types";
import { powerApi } from "./power-api";
import { powerMock } from "./power-mock";
import type { CrmConnector } from "./types";

export function getCrm(): CrmConnector {
  return process.env.CRM_MODE === "power" ? powerApi : powerMock;
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
