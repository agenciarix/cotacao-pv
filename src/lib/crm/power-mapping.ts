import { onlyDigits } from "../format";
import type { Lead } from "../types";

/**
 * Resumo do lead mostrado no painel do modo simulado. Os nomes seguem o
 * formulário dinâmico público do Power. O modo real usa os campos da Power
 * API em src/lib/power/engine.ts.
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
    if (v.fipeValueCents) payload.pwrVhclFipeVl = v.fipeValueCents / 100;
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
