import { describe, expect, it } from "vitest";
import { demo } from "@/tenants/demo";
import { calculateQuote } from "./pricing";

describe("calculateQuote", () => {
  const car = { type: "carro" as const, fipeValueCents: 6_400_000, usage: "particular" as const };

  it("usa a faixa de FIPE certa e devolve todos os planos", () => {
    const r = calculateQuote(demo.pricing, { vehicle: car, state: "MG" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.options.map((o) => [o.planId, o.monthlyCents])).toEqual([
      ["essencial", 15_990],
      ["completo", 22_990],
      ["premium", 28_990],
    ]);
    expect(r.options[0].enrollmentFeeCents).toBe(19_900);
  });

  it("aplica multiplicador de UF e de uso", () => {
    const r = calculateQuote(demo.pricing, { vehicle: { ...car, usage: "aplicativo" }, state: "sp" });
    if (!r.ok) throw new Error(r.reason);
    // 15990 * 1.15 * 1.2 = 22066 -> R$ 220,90
    expect(r.options[0].monthlyCents).toBe(22_090);
  });

  it("aplica cupom válido e ignora cupom inválido", () => {
    const ok = calculateQuote(demo.pricing, { vehicle: car, state: "MG", coupon: "bemvindo10" });
    if (!ok.ok) throw new Error(ok.reason);
    expect(ok.couponApplied).toBe("BEMVINDO10");
    expect(ok.options[0].discountPercent).toBe(10);
    expect(ok.options[0].monthlyCents).toBe(14_390);

    const bad = calculateQuote(demo.pricing, { vehicle: car, state: "MG", coupon: "NADA" });
    if (!bad.ok) throw new Error(bad.reason);
    expect(bad.couponApplied).toBeUndefined();
  });

  it("só oferece os planos que existem na faixa", () => {
    const r = calculateQuote(demo.pricing, { vehicle: { type: "moto", fipeValueCents: 1_650_000, usage: "particular" }, state: "MG" });
    if (!r.ok) throw new Error(r.reason);
    expect(r.options.map((o) => o.planId)).toEqual(["essencial", "completo"]);
  });

  it("recusa valor fora das faixas e tipo sem tabela", () => {
    expect(calculateQuote(demo.pricing, { vehicle: { ...car, fipeValueCents: 99_000_000 }, state: "MG" }).ok).toBe(false);
    expect(calculateQuote(demo.pricing, { vehicle: { ...car, type: "caminhao" }, state: "MG" }).ok).toBe(false);
  });
});
