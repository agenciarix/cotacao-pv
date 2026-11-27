import type { PricingTable, QuoteOption, UsageType, VehicleType } from "./types";

export interface QuoteInput {
  vehicle: { type: VehicleType; fipeValueCents: number; usage: UsageType };
  state: string;
  coupon?: string;
}

export type QuoteResult =
  | { ok: true; options: QuoteOption[]; couponApplied?: string }
  | { ok: false; reason: string };

/** Arredonda para o centavo e termina em ,90 (padrão comum de preço). */
function roundPrice(cents: number): number {
  const reais = Math.floor(cents / 100);
  return reais * 100 + 90;
}

export function calculateQuote(table: PricingTable, input: QuoteInput): QuoteResult {
  const bands = table.bands[input.vehicle.type];
  if (!bands || bands.length === 0) {
    return { ok: false, reason: "Sem tabela de preço para esse tipo de veículo." };
  }
  const fipe = input.vehicle.fipeValueCents;
  const band = bands.find((b) => fipe >= b.minFipeCents && fipe <= b.maxFipeCents);
  if (!band) {
    return { ok: false, reason: "Sem preço para esse valor de veículo." };
  }

  const stateMult = table.stateMultiplier[input.state.toUpperCase()] ?? 1;
  const usageMult = table.usageMultiplier[input.vehicle.usage] ?? 1;

  const code = input.coupon?.trim().toUpperCase();
  const coupon = code ? table.coupons[code] : undefined;
  const discount = coupon?.percentOff ?? 0;

  const options: QuoteOption[] = [];
  for (const plan of table.plans) {
    const base = band.monthlyCents[plan.id];
    if (base === undefined) continue;
    const gross = base * stateMult * usageMult;
    const net = gross * (1 - discount / 100);
    options.push({
      planId: plan.id,
      planName: plan.name,
      monthlyCents: roundPrice(net),
      enrollmentFeeCents: table.enrollmentFeeCents,
      discountPercent: discount,
    });
  }
  if (options.length === 0) {
    return { ok: false, reason: "Nenhum plano disponível para esse veículo." };
  }
  return { ok: true, options, couponApplied: coupon ? code : undefined };
}
