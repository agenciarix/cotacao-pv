import type { Lead, Tenant } from "../types";

export interface CrmSyncResult {
  crmQuoteId: string;
}

/**
 * Contrato de qualquer CRM. O checkout só conhece esta interface, então
 * trocar o modo simulado pelo Power real (ou outro CRM) não mexe no fluxo.
 */
export interface CrmConnector {
  /** Cria a cotação no CRM. Chamado quando o lead deixa nome e telefone. */
  createQuote(tenant: Tenant, lead: Lead): Promise<CrmSyncResult>;
  /** Atualiza a cotação a cada etapa (veículo, preço, dados, conclusão). */
  updateQuote(tenant: Tenant, lead: Lead & { crmQuoteId: string }): Promise<CrmSyncResult>;
}
