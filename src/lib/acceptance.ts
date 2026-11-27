import { normalize } from "./format";
import type { AcceptanceRules, UsageType, Vehicle } from "./types";

export type AcceptanceResult = { accepted: true } | { accepted: false; reason: string };

const OK: AcceptanceResult = { accepted: true };

export function checkVehicle(rules: AcceptanceRules, v: Vehicle): AcceptanceResult {
  if (!rules.vehicleTypes.includes(v.type)) {
    return { accepted: false, reason: "Ainda não protegemos esse tipo de veículo." };
  }
  if (!rules.usageTypes.includes(v.usage as UsageType)) {
    return { accepted: false, reason: "Ainda não protegemos veículos com esse tipo de uso." };
  }
  if (v.year < rules.minYear) {
    return { accepted: false, reason: `Aceitamos veículos a partir de ${rules.minYear}.` };
  }
  if ((v.fipeValueCents ?? 0) > rules.maxFipeCents) {
    return { accepted: false, reason: "O valor FIPE do veículo está acima do limite aceito." };
  }
  const brand = normalize(v.brand);
  if (rules.blockedBrands.some((b) => normalize(b) === brand)) {
    return { accepted: false, reason: "Ainda não protegemos veículos dessa marca." };
  }
  const model = normalize(v.model);
  if (rules.blockedModels.some((m) => model.includes(normalize(m)))) {
    return { accepted: false, reason: "Ainda não protegemos esse modelo." };
  }
  return OK;
}

export function checkCity(rules: AcceptanceRules, city: string, state: string): AcceptanceResult {
  const uf = state.toUpperCase();
  if (rules.states.length > 0 && !rules.states.includes(uf)) {
    return { accepted: false, reason: "Ainda não atendemos o seu estado." };
  }
  const key = normalize(`${city}/${uf}`);
  if (rules.blockedCities.some((c) => normalize(c) === key)) {
    return { accepted: false, reason: "Ainda não atendemos a sua cidade." };
  }
  return OK;
}
