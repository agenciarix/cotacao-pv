import { beforeEach, describe, expect, it } from "vitest";
import { demo } from "@/tenants/demo";
import { advanceCheckout, startCheckout } from "./checkout";
import type { CrmConnector } from "./crm/types";
import { listCrmLog, resetStore } from "./store";

const vehicleStep = {
  step: "veiculo",
  vehicle: { type: "carro", plate: "abc1d23", brand: "Fiat", model: "Argo Drive 1.0", year: 2022, fipeValueCents: 6_400_000, usage: "particular" },
  city: "Belo Horizonte",
  state: "mg",
};
const dataStep = {
  step: "dados",
  email: "teste@example.com",
  cpf: "529.982.247-25",
  address: { cep: "30130-000", street: "Av. Afonso Pena", number: "100", neighborhood: "Centro", city: "Belo Horizonte", state: "MG" },
};

beforeEach(() => resetStore());

describe("fluxo do checkout", () => {
  it("percorre todas as etapas e sincroniza com o Power simulado", async () => {
    const start = await startCheckout(demo, { name: "Maria Souza", phone: "(31) 98888-7777" });
    if (!start.ok) throw new Error(start.error);
    expect(start.lead.crmQuoteId).toMatch(/^SIM-/);
    expect(start.lead.phone).toBe("31988887777");

    const v = await advanceCheckout(demo, start.lead, vehicleStep);
    if (!v.ok) throw new Error(v.error);
    expect(v.lead.step).toBe("cotacao");
    expect(v.lead.vehicle?.plate).toBe("ABC1D23");
    expect(v.lead.quoteOptions).toHaveLength(3);

    const p = await advanceCheckout(demo, v.lead, { step: "cotacao", planId: "completo" });
    if (!p.ok) throw new Error(p.error);

    const d = await advanceCheckout(demo, p.lead, dataStep);
    if (!d.ok) throw new Error(d.error);
    expect(d.lead.step).toBe("concluido");
    expect(d.lead.cpf).toBe("52998224725");

    const log = listCrmLog("demo");
    expect(log.map((e) => e.action)).toEqual(["update", "update", "update", "create"]);
    const last = log[0].payload as Record<string, unknown>;
    expect(last).toMatchObject({
      pwrAssocNm: "Maria Souza",
      pwrVhclPlts: "ABC1D23",
      pwrPlanNm: "Completo",
      pwrMonthlyVl: 229.9,
      pwrCep: "30130000",
      pwrStep: "concluido",
    });
  });

  it("recusa dados inválidos e veículo não aceito", async () => {
    expect((await startCheckout(demo, { name: "Jo", phone: "123" })).ok).toBe(false);
    const start = await startCheckout(demo, { name: "João Lima", phone: "11988887777" });
    if (!start.ok) throw new Error(start.error);
    const r = await advanceCheckout(demo, start.lead, { ...vehicleStep, vehicle: { ...vehicleStep.vehicle, brand: "Porsche" } });
    expect(r).toMatchObject({ ok: false, status: 422 });
  });

  it("não deixa pular etapas", async () => {
    const start = await startCheckout(demo, { name: "Ana Paula", phone: "11988887777" });
    if (!start.ok) throw new Error(start.error);
    expect(await advanceCheckout(demo, start.lead, { step: "cotacao", planId: "completo" })).toMatchObject({ ok: false, status: 409 });
    expect(await advanceCheckout(demo, start.lead, dataStep)).toMatchObject({ ok: false, status: 409 });
  });

  it("segue o fluxo mesmo se o CRM falhar, guardando o erro", async () => {
    const broken: CrmConnector = {
      createQuote: async () => { throw new Error("Power fora do ar"); },
      updateQuote: async () => { throw new Error("Power fora do ar"); },
    };
    const start = await startCheckout(demo, { name: "Carlos Dias", phone: "11988887777" }, { crm: broken });
    if (!start.ok) throw new Error(start.error);
    expect(start.lead.crmQuoteId).toBeUndefined();
    expect(start.lead.crmSyncError).toBe("Power fora do ar");
  });
});
