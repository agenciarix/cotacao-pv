import { normalize, onlyDigits } from "../format";
import { updateLead, logCrm } from "../store";
import type { Address, Lead, QuoteOption, Tenant } from "../types";
import { PowerApiError, type PowerClient, type PowerItem } from "./client";

/**
 * Checkout ligado ao Power: o Power guarda a cotação, calcula os preços com
 * as tabelas da associação e decide quais planos o veículo pode ter.
 */

const UF_NAME: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará", DF: "Distrito Federal",
  ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
  PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
};

const stateCache = new WeakMap<PowerClient, PowerItem[]>();
const cityCache = new WeakMap<PowerClient, Map<number, PowerItem[]>>();

/** Converte "Vila Velha" + "ES" no id de cidade do Power. */
export async function powerCityId(client: PowerClient, city: string, uf: string): Promise<number | null> {
  let states = stateCache.get(client);
  if (!states) {
    states = await client.states();
    stateCache.set(client, states);
  }
  const ufUp = uf.toUpperCase();
  const wanted = [normalize(ufUp), normalize(UF_NAME[ufUp] ?? "")];
  const state = states.find((s) => wanted.includes(normalize(s.text)));
  if (!state) return null;

  let byState = cityCache.get(client);
  if (!byState) cityCache.set(client, (byState = new Map()));
  let cities = byState.get(state.id);
  if (!cities) {
    cities = await client.cities(state.id);
    byState.set(state.id, cities);
  }
  const name = normalize(city);
  return cities.find((c) => normalize(c.text) === name)?.id ?? null;
}

function log(tenant: Tenant, lead: Lead, action: "create" | "update", payload: unknown, result: string) {
  logCrm({ at: new Date().toISOString(), tenant: tenant.slug, leadId: lead.id, action, payload, result });
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

/** Cria a cotação no Power (ou devolve a que já existe). */
export async function ensurePowerQuotation(tenant: Tenant, lead: Lead, client: PowerClient): Promise<Lead> {
  if (lead.crmQuoteId) return lead;
  const p = tenant.crm.power ?? {};
  const payload: Record<string, unknown> = {
    name: lead.name,
    phone: onlyDigits(lead.phone),
    ...(p.coop ? { coop: p.coop } : {}),
    ...(p.origemId ? { origemId: p.origemId } : {}),
    ...(p.leadSource ? { leadSource: p.leadSource } : {}),
    ...(p.slsmnId ? { slsmnId: p.slsmnId } : {}),
  };
  try {
    const code = await client.createQuotation(payload);
    log(tenant, lead, "create", payload, code);
    return updateLead(lead, { crmQuoteId: code, crmSyncError: undefined });
  } catch (err) {
    console.error(`[power] ${tenant.slug} criar cotação: ${errorMessage(err)}`);
    return updateLead(lead, { crmSyncError: errorMessage(err) });
  }
}

async function update(tenant: Tenant, lead: Lead, client: PowerClient, data: Record<string, unknown>) {
  await client.updateQuotation(lead.crmQuoteId!, data);
  log(tenant, lead, "update", { code: lead.crmQuoteId, ...data }, lead.crmQuoteId!);
}

export type PowerStep = { ok: true; lead: Lead } | { ok: false; status: number; error: string };

const UNAVAILABLE: PowerStep = {
  ok: false,
  status: 502,
  error: "Não conseguimos calcular sua cotação agora. Tente de novo em instantes ou fale com a gente no WhatsApp.",
};

function itemNames(list?: { name?: string }[]) {
  return (list ?? []).map((i) => i.name).filter((n): n is string => Boolean(n));
}

/** Envia veículo e cidade, e busca os planos com os preços calculados pelo Power. */
export async function powerQuoteVehicle(
  tenant: Tenant,
  lead: Lead,
  client: PowerClient,
  input: { vehicle: NonNullable<Lead["vehicle"]>; city: string; state: string },
): Promise<PowerStep> {
  const refs = input.vehicle.refs ?? {};
  if (!refs.mdl || !refs.mdlYr) {
    return { ok: false, status: 400, error: "Escolha marca, ano e modelo na lista." };
  }
  lead = await ensurePowerQuotation(tenant, lead, client);
  if (!lead.crmQuoteId) return UNAVAILABLE;

  try {
    const cityId = await powerCityId(client, input.city, input.state);
    if (cityId === null) return { ok: false, status: 422, error: "Não encontramos sua cidade. Confira o nome e a UF." };

    await update(tenant, lead, client, {
      mdl: Number(refs.mdl),
      mdlYr: Number(refs.mdlYr),
      city: cityId,
      workVehicle: input.vehicle.usage !== "particular",
      ...(input.vehicle.plate ? { plates: input.vehicle.plate } : {}),
    });

    const res = await client.plans(lead.crmQuoteId);
    const enrollment = Math.round((res.acquisitionPrice ?? 0) * 100);
    const options: QuoteOption[] = (res.plans ?? [])
      .filter((p) => p.active !== false && p.price > 0)
      .map((p) => ({
        planId: String(p.planId),
        planName: p.name,
        monthlyCents: Math.round(p.price * 100),
        enrollmentFeeCents: enrollment,
        discountPercent: 0,
        externalId: String(p.tablePricePlanId),
        coverages: [...itemNames(p.coverages), ...itemNames(p.assistances), ...itemNames(p.benefits)],
      }));
    if (options.length === 0) {
      return { ok: false, status: 422, error: "Ainda não temos plano para esse veículo na sua região. Fale com a gente no WhatsApp." };
    }
    return {
      ok: true,
      lead: updateLead(lead, {
        step: "cotacao",
        vehicle: input.vehicle,
        city: input.city,
        state: input.state.toUpperCase(),
        quoteOptions: options,
        chosenPlanId: undefined,
        crmSyncError: undefined,
      }),
    };
  } catch (err) {
    console.error(`[power] ${tenant.slug} cotação ${lead.crmQuoteId}: ${errorMessage(err)}`);
    updateLead(lead, { crmSyncError: errorMessage(err) });
    if (err instanceof PowerApiError && err.status === 412) return { ok: false, status: 422, error: errorMessage(err).replace(/^Power API 412: /, "") };
    return UNAVAILABLE;
  }
}

/** Grava o plano escolhido na cotação do Power. */
export async function powerChoosePlan(tenant: Tenant, lead: Lead, client: PowerClient, planId: string): Promise<PowerStep> {
  const option = lead.quoteOptions?.find((o) => o.planId === planId);
  if (!option || !lead.crmQuoteId) return { ok: false, status: 409, error: "Refaça a cotação do veículo." };
  try {
    await update(tenant, lead, client, { tppId: Number(option.externalId) });
    return { ok: true, lead: updateLead(lead, { step: "dados", chosenPlanId: planId }) };
  } catch (err) {
    console.error(`[power] ${tenant.slug} plano ${lead.crmQuoteId}: ${errorMessage(err)}`);
    // O cliente segue; o consultor vê o plano na observação se a gravação falhou.
    return { ok: true, lead: updateLead(lead, { step: "dados", chosenPlanId: planId, crmSyncError: errorMessage(err) }) };
  }
}

/** Grava os dados pessoais e o endereço. */
export async function powerSaveData(
  tenant: Tenant,
  lead: Lead,
  client: PowerClient,
  data: { email: string; cpf: string; address: Address },
): Promise<PowerStep> {
  const next = updateLead(lead, { step: "concluido", email: data.email, cpf: data.cpf, address: data.address });
  if (!lead.crmQuoteId) return { ok: true, lead: next };
  try {
    const cityId = await powerCityId(client, data.address.city, data.address.state);
    await update(tenant, lead, client, {
      fullName: lead.name,
      email: data.email,
      registration: data.cpf,
      addressZipcode: data.address.cep,
      addressAddress: data.address.street,
      addressNumber: data.address.number,
      addressComplement: data.address.complement ?? "",
      addressNeighborhood: data.address.neighborhood,
      ...(cityId !== null ? { city: cityId } : {}),
    });
    return { ok: true, lead: updateLead(next, { crmSyncError: undefined }) };
  } catch (err) {
    console.error(`[power] ${tenant.slug} dados ${lead.crmQuoteId}: ${errorMessage(err)}`);
    return { ok: true, lead: updateLead(next, { crmSyncError: errorMessage(err) }) };
  }
}
