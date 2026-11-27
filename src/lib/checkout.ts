import { z } from "zod";
import { checkCity, checkVehicle } from "./acceptance";
import { syncLead } from "./crm";
import type { CrmConnector } from "./crm/types";
import { isValidCpf, isValidPhone, normalizePlate, onlyDigits } from "./format";
import { calculateQuote } from "./pricing";
import { createLead, updateLead } from "./store";
import type { Lead, Tenant } from "./types";

/** Regras de negócio do checkout, separadas das rotas HTTP para poder testar. */

export const contactSchema = z.object({
  name: z.string().trim().min(3, "Informe seu nome completo."),
  phone: z.string().refine(isValidPhone, "Informe um telefone com DDD."),
});

const vehicleSchema = z.object({
  type: z.enum(["carro", "moto", "caminhao", "utilitario"]),
  plate: z.string().optional(),
  brand: z.string().min(1),
  model: z.string().min(1),
  year: z.coerce.number().int().min(1950).max(2100),
  fipeCode: z.string().optional(),
  fipeValueCents: z.coerce.number().int().positive("Valor FIPE inválido."),
  usage: z.enum(["particular", "aplicativo", "taxi"]),
});

export const stepSchema = z.discriminatedUnion("step", [
  z.object({
    step: z.literal("veiculo"),
    vehicle: vehicleSchema,
    city: z.string().trim().min(2, "Informe sua cidade."),
    state: z.string().trim().length(2, "Informe a UF."),
    coupon: z.string().trim().optional(),
  }),
  z.object({
    step: z.literal("cotacao"),
    planId: z.string().min(1),
  }),
  z.object({
    step: z.literal("dados"),
    email: z.string().trim().email("E-mail inválido."),
    cpf: z.string().refine(isValidCpf, "CPF inválido."),
    address: z.object({
      cep: z.string().refine((v) => onlyDigits(v).length === 8, "CEP inválido."),
      street: z.string().trim().min(2),
      number: z.string().trim().min(1),
      complement: z.string().trim().optional(),
      neighborhood: z.string().trim().min(2),
      city: z.string().trim().min(2),
      state: z.string().trim().length(2),
    }),
  }),
]);

export type StepInput = z.infer<typeof stepSchema>;

export type StepResult = { ok: true; lead: Lead } | { ok: false; status: number; error: string };

export async function startCheckout(tenant: Tenant, input: unknown, crm?: CrmConnector): Promise<StepResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: parsed.error.issues[0].message };
  const lead = createLead({ tenant: tenant.slug, name: parsed.data.name, phone: onlyDigits(parsed.data.phone) });
  return { ok: true, lead: await syncLead(tenant, lead, crm) };
}

export async function advanceCheckout(tenant: Tenant, lead: Lead, input: unknown, crm?: CrmConnector): Promise<StepResult> {
  const parsed = stepSchema.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: parsed.error.issues[0].message };
  const data = parsed.data;

  let next: Lead;
  switch (data.step) {
    case "veiculo": {
      const plate = data.vehicle.plate ? normalizePlate(data.vehicle.plate) ?? undefined : undefined;
      const vehicle = { ...data.vehicle, plate };
      const city = checkCity(tenant.acceptance, data.city, data.state);
      if (!city.accepted) return { ok: false, status: 422, error: city.reason };
      const accepted = checkVehicle(tenant.acceptance, vehicle);
      if (!accepted.accepted) return { ok: false, status: 422, error: accepted.reason };
      const quote = calculateQuote(tenant.pricing, { vehicle, state: data.state, coupon: data.coupon });
      if (!quote.ok) return { ok: false, status: 422, error: quote.reason };
      next = updateLead(lead, {
        step: "cotacao",
        vehicle,
        city: data.city,
        state: data.state.toUpperCase(),
        coupon: quote.couponApplied,
        quoteOptions: quote.options,
        chosenPlanId: undefined,
      });
      break;
    }
    case "cotacao": {
      if (!lead.quoteOptions?.some((o) => o.planId === data.planId)) {
        return { ok: false, status: 409, error: "Refaça a cotação do veículo." };
      }
      next = updateLead(lead, { step: "dados", chosenPlanId: data.planId });
      break;
    }
    case "dados": {
      if (!lead.chosenPlanId) return { ok: false, status: 409, error: "Escolha um plano antes." };
      const addr = data.address;
      const city = checkCity(tenant.acceptance, addr.city, addr.state);
      if (!city.accepted) return { ok: false, status: 422, error: city.reason };
      next = updateLead(lead, {
        step: "concluido",
        email: data.email,
        cpf: onlyDigits(data.cpf),
        address: { ...addr, cep: onlyDigits(addr.cep), state: addr.state.toUpperCase() },
      });
      break;
    }
  }
  return { ok: true, lead: await syncLead(tenant, next, crm) };
}

/** O que o navegador pode ver do lead (sem erros internos de CRM). */
export function publicLead(lead: Lead) {
  const { crmSyncError: _err, ...rest } = lead;
  return rest;
}
