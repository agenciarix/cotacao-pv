import type { Tenant } from "@/lib/types";

/**
 * VIX Benefícios: primeiro cliente real, ligado ao Power CRM.
 * Planos, preços e regras de aceitação vêm do Power da VIX; `pricing` e
 * boa parte de `acceptance` só valem se o modo voltar para "simulado".
 */
export const vix: Tenant = {
  slug: "vix",
  domains: [],
  branding: {
    name: "VIX Benefícios",
    primaryColor: "#2563eb",
    whatsapp: "5527998771312",
    legalName: "VIX Benefícios e Socorro Mútuo",
    cnpj: "57.920.731/0001-72",
  },
  acceptance: {
    vehicleTypes: ["carro", "moto", "caminhao"],
    minYear: 1950,
    maxFipeCents: Number.MAX_SAFE_INTEGER,
    blockedBrands: [],
    blockedModels: [],
    states: [],
    blockedCities: [],
    usageTypes: ["particular", "aplicativo", "taxi"],
  },
  pricing: { plans: [], bands: {}, stateMultiplier: {}, usageMultiplier: {}, enrollmentFeeCents: 0, coupons: {} },
  crm: {
    provider: "powercrm",
    mode: "power",
    tokenEnv: "POWER_TOKEN_VIX",
    power: { coop: 11778 },
  },
};
