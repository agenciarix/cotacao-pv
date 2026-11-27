import type { Tenant } from "@/lib/types";

/** Segundo cliente fictício, para mostrar marca, regras e preços diferentes. */
export const sulminas: Tenant = {
  slug: "sulminas",
  domains: ["cotacao.mutuasuldeminas.com.br", "mutuasuldeminas.com.br"],
  branding: {
    name: "Mútua Sul de Minas",
    primaryColor: "#b45309",
    whatsapp: "5535999990000",
    legalName: "Mútua Sul de Minas (fictícia)",
  },
  acceptance: {
    vehicleTypes: ["carro", "moto"],
    minYear: 2000,
    maxFipeCents: 15_000_000,
    blockedBrands: [],
    blockedModels: ["Leilão"],
    states: ["MG", "SP"],
    blockedCities: ["São Paulo/SP"],
    usageTypes: ["particular", "aplicativo"],
  },
  pricing: {
    plans: [
      {
        id: "basico",
        name: "Básico",
        description: "Roubo, furto e guincho.",
        coverages: ["Roubo e furto", "Guincho 24h"],
      },
      {
        id: "total",
        name: "Total",
        description: "Colisão, terceiros e carro reserva.",
        coverages: ["Roubo e furto", "Colisão", "Terceiros até R$ 50 mil", "Carro reserva 7 dias"],
        highlight: true,
      },
    ],
    bands: {
      carro: [
        { minFipeCents: 0, maxFipeCents: 5_000_000, monthlyCents: { basico: 7_990, total: 13_990 } },
        { minFipeCents: 5_000_001, maxFipeCents: 15_000_000, monthlyCents: { basico: 12_990, total: 21_990 } },
      ],
      moto: [{ minFipeCents: 0, maxFipeCents: 4_000_000, monthlyCents: { basico: 4_990, total: 7_990 } }],
    },
    stateMultiplier: { SP: 1.1 },
    usageMultiplier: { aplicativo: 1.15 },
    enrollmentFeeCents: 14_900,
    coupons: {},
  },
  crm: { provider: "powercrm", mode: "simulado", tokenEnv: "POWER_TOKEN_SULMINAS" },
};
