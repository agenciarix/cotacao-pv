import type { Tenant } from "@/lib/types";

const PLANS = [
  {
    id: "essencial",
    name: "Essencial",
    description: "Roubo, furto e assistência 24h.",
    coverages: ["Roubo e furto", "Assistência 24h", "Reboque até 200 km"],
  },
  {
    id: "completo",
    name: "Completo",
    description: "Tudo do Essencial mais colisão e terceiros.",
    coverages: [
      "Roubo e furto",
      "Colisão e incêndio",
      "Fenômenos naturais",
      "Terceiros até R$ 30 mil",
      "Assistência 24h",
    ],
    highlight: true,
  },
  {
    id: "premium",
    name: "Premium",
    description: "Proteção completa com carro reserva e vidros.",
    coverages: [
      "Tudo do Completo",
      "Terceiros até R$ 100 mil",
      "Carro reserva 15 dias",
      "Vidros, faróis e retrovisores",
    ],
  },
];

/**
 * Cliente de demonstração. Valores fictícios, só para testar o fluxo.
 * As tabelas reais virão do Power CRM de cada associação.
 */
export const demo: Tenant = {
  slug: "demo",
  branding: {
    name: "Protege Demo",
    primaryColor: "#0f766e",
    whatsapp: "5511999990000",
    legalName: "Associação Protege Demo (fictícia)",
  },
  acceptance: {
    vehicleTypes: ["carro", "moto", "utilitario"],
    minYear: 1990,
    maxFipeCents: 25_000_000,
    blockedBrands: ["Ferrari", "Lamborghini", "Porsche"],
    blockedModels: [],
    states: [],
    blockedCities: [],
    usageTypes: ["particular", "aplicativo", "taxi"],
  },
  pricing: {
    plans: PLANS,
    bands: {
      carro: [
        { minFipeCents: 0, maxFipeCents: 3_000_000, monthlyCents: { essencial: 8_990, completo: 12_990, premium: 16_990 } },
        { minFipeCents: 3_000_001, maxFipeCents: 6_000_000, monthlyCents: { essencial: 11_990, completo: 16_990, premium: 21_990 } },
        { minFipeCents: 6_000_001, maxFipeCents: 10_000_000, monthlyCents: { essencial: 15_990, completo: 22_990, premium: 28_990 } },
        { minFipeCents: 10_000_001, maxFipeCents: 25_000_000, monthlyCents: { essencial: 21_990, completo: 31_990, premium: 39_990 } },
      ],
      moto: [
        { minFipeCents: 0, maxFipeCents: 1_500_000, monthlyCents: { essencial: 5_990, completo: 8_990 } },
        { minFipeCents: 1_500_001, maxFipeCents: 5_000_000, monthlyCents: { essencial: 7_990, completo: 11_990 } },
      ],
      utilitario: [
        { minFipeCents: 0, maxFipeCents: 15_000_000, monthlyCents: { essencial: 18_990, completo: 26_990 } },
      ],
    },
    stateMultiplier: { SP: 1.15, RJ: 1.2 },
    usageMultiplier: { aplicativo: 1.2, taxi: 1.25 },
    enrollmentFeeCents: 19_900,
    coupons: { BEMVINDO10: { percentOff: 10, description: "10% na mensalidade" } },
  },
  crm: { provider: "powercrm", tokenEnv: "POWER_TOKEN_DEMO" },
};
