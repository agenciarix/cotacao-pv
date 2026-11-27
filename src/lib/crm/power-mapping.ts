import { onlyDigits } from "../format";
import type { Lead } from "../types";

/**
 * Converte o lead no formato que vamos enviar ao Power CRM.
 *
 * SUPOSIÇÃO: os nomes de campo abaixo seguem o formulário dinâmico público
 * do Power (pwrVhclPlts, pwrAssocNm...). Os nomes reais da Power API
 * ("cadastro de cotação" / "alterar cotação") precisam ser confirmados na
 * documentação logada. Quando confirmar, só este arquivo muda.
 */
export interface PowerQuotePayload {
  pwrAssocNm: string;
  pwrAssocPhn: string;
  pwrAssocEml?: string;
  pwrAssocCpf?: string;
  pwrVhclTp?: string;
  pwrVhclPlts?: string;
  pwrVhclBrnd?: string;
  pwrVhclMdl?: string;
  pwrVhclVrsn?: number;
  pwrVhclFipeCd?: string;
  pwrVhclFipeVl?: number;
  pwrWorkVhcl?: boolean;
  pwrStt?: string;
  pwrCty?: string;
  pwrCep?: string;
  pwrPlanNm?: string;
  pwrMonthlyVl?: number;
  pwrEnrollVl?: number;
  pwrCoupon?: string;
  /** Etapa do funil, para o consultor saber onde o lead parou. */
  pwrStep: string;
  pwrSource: string;
}

const VEHICLE_TYPE_CODE: Record<string, string> = {
  carro: "1",
  moto: "2",
  caminhao: "3",
  utilitario: "1",
};

export function toPowerPayload(lead: Lead): PowerQuotePayload {
  const v = lead.vehicle;
  const chosen = lead.quoteOptions?.find((o) => o.planId === lead.chosenPlanId);
  const payload: PowerQuotePayload = {
    pwrAssocNm: lead.name,
    pwrAssocPhn: onlyDigits(lead.phone),
    pwrStep: lead.step,
    pwrSource: "checkout-white-label",
  };
  if (lead.email) payload.pwrAssocEml = lead.email;
  if (lead.cpf) payload.pwrAssocCpf = onlyDigits(lead.cpf);
  if (v) {
    payload.pwrVhclTp = VEHICLE_TYPE_CODE[v.type];
    if (v.plate) payload.pwrVhclPlts = v.plate;
    payload.pwrVhclBrnd = v.brand;
    payload.pwrVhclMdl = v.model;
    payload.pwrVhclVrsn = v.year;
    if (v.fipeCode) payload.pwrVhclFipeCd = v.fipeCode;
    payload.pwrVhclFipeVl = v.fipeValueCents / 100;
    payload.pwrWorkVhcl = v.usage !== "particular";
  }
  const state = lead.address?.state ?? lead.state;
  const city = lead.address?.city ?? lead.city;
  if (state) payload.pwrStt = state;
  if (city) payload.pwrCty = city;
  if (lead.address?.cep) payload.pwrCep = onlyDigits(lead.address.cep);
  if (chosen) {
    payload.pwrPlanNm = chosen.planName;
    payload.pwrMonthlyVl = chosen.monthlyCents / 100;
    payload.pwrEnrollVl = chosen.enrollmentFeeCents / 100;
  }
  if (lead.coupon) payload.pwrCoupon = lead.coupon;
  return payload;
}
