import { beforeEach, describe, expect, it } from "vitest";
import { vix } from "@/tenants/vix";
import { advanceCheckout, startCheckout } from "../checkout";
import { listCrmLog, resetStore } from "../store";
import { PowerClient } from "./client";
import { powerCatalog } from "./catalog";

type Call = { method: string; path: string; body?: Record<string, unknown>; auth?: string };

/** Power falso com as respostas da documentação. */
function fakePower(opts: { plans?: unknown[]; failAdd?: boolean } = {}) {
  const calls: Call[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    const u = new URL(url);
    const path = u.pathname + u.search;
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method: String(init.method), path, body, auth: (init.headers as Record<string, string>).Authorization });
    const ok = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
    if (u.pathname === "/api/quotation/add") {
      return opts.failAdd ? ok({ errors: ["Telefone inválido"] }, 412) : ok({ sucess: true, quotationResponse: { quotationCode: "Q123" } }, 201);
    }
    if (u.pathname === "/api/quotation/update") return ok({ statusCode: "OK" });
    if (u.pathname === "/api/quotation/stt") return ok([{ id: 8, text: "Espírito Santo" }, { id: 11, text: "Minas Gerais" }]);
    if (u.pathname === "/api/quotation/ct") return ok([{ id: 3205, text: "Vila Velha" }, { id: 3206, text: "Vitória" }]);
    if (u.pathname === "/api/quotation/cb") return ok([{ id: 21, text: "FIAT" }]);
    if (u.pathname === "/api/quotation/bmy") return ok([{ id: 900, text: "2022 Gasolina" }]);
    if (u.pathname === "/api/quotation/cmby") return ok([{ id: 7001, text: "ARGO DRIVE 1.0" }]);
    if (u.pathname === "/api/quotation/plansQuotation") {
      return ok({
        quotationCode: "Q123",
        acquisitionPrice: 250,
        plans: opts.plans ?? [
          { planId: 1, name: "Ouro", tablePricePlanId: 55, price: 189.9, active: true, coverages: [{ name: "Roubo e furto" }], assistances: [{ name: "Guincho 400 km" }] },
          { planId: 2, name: "Prata", tablePricePlanId: 56, price: 139.9, active: true },
          { planId: 3, name: "Inativo", tablePricePlanId: 57, price: 99.9, active: false },
        ],
      });
    }
    return ok({ error: "rota desconhecida" }, 404);
  }) as unknown as typeof fetch;
  return { client: new PowerClient("tok-teste", "https://api.powercrm.com.br", fetchImpl), calls };
}

const vehicleStep = {
  step: "veiculo",
  vehicle: { type: "carro", plate: "abc1d23", brand: "FIAT", model: "ARGO DRIVE 1.0", year: 2022, usage: "aplicativo", refs: { cb: "21", mdlYr: "900", mdl: "7001" } },
  city: "Vila Velha",
  state: "es",
};

beforeEach(() => resetStore());

describe("checkout no modo Power", () => {
  it("cria a cotação, usa os preços do Power, grava plano e dados", async () => {
    const { client, calls } = fakePower();
    const start = await startCheckout(vix, { name: "Maria Souza", phone: "(27) 98888-7777" }, { power: client });
    if (!start.ok) throw new Error(start.error);
    expect(start.lead.crmQuoteId).toBe("Q123");
    expect(calls[0]).toMatchObject({ method: "POST", path: "/api/quotation/add", auth: "Bearer tok-teste", body: { name: "Maria Souza", phone: "27988887777", coop: 11778 } });

    const v = await advanceCheckout(vix, start.lead, vehicleStep, { power: client });
    if (!v.ok) throw new Error(v.error);
    const upd = calls.find((c) => c.path === "/api/quotation/update")!;
    expect(upd.body).toEqual({ code: "Q123", mdl: 7001, mdlYr: 900, city: 3205, workVehicle: true, plates: "ABC1D23" });
    expect(v.lead.quoteOptions).toEqual([
      { planId: "1", planName: "Ouro", monthlyCents: 18_990, enrollmentFeeCents: 25_000, discountPercent: 0, externalId: "55", coverages: ["Roubo e furto", "Guincho 400 km"] },
      { planId: "2", planName: "Prata", monthlyCents: 13_990, enrollmentFeeCents: 25_000, discountPercent: 0, externalId: "56", coverages: [] },
    ]);

    const p = await advanceCheckout(vix, v.lead, { step: "cotacao", planId: "1" }, { power: client });
    if (!p.ok) throw new Error(p.error);
    expect(calls.at(-1)!.body).toEqual({ code: "Q123", tppId: 55 });

    const d = await advanceCheckout(
      vix,
      p.lead,
      {
        step: "dados",
        email: "maria@example.com",
        cpf: "529.982.247-25",
        address: { cep: "29111-400", street: "Rua A", number: "10", neighborhood: "Centro", city: "Vila Velha", state: "ES" },
      },
      { power: client },
    );
    if (!d.ok) throw new Error(d.error);
    expect(d.lead.step).toBe("concluido");
    expect(calls.at(-1)!.body).toMatchObject({ code: "Q123", registration: "52998224725", addressZipcode: "29111400", city: 3205, fullName: "Maria Souza" });
    expect(listCrmLog("vix").length).toBe(4);
  });

  it("avisa quando o Power não tem plano para o veículo", async () => {
    const { client } = fakePower({ plans: [] });
    const start = await startCheckout(vix, { name: "João Lima", phone: "27988887777" }, { power: client });
    if (!start.ok) throw new Error(start.error);
    const r = await advanceCheckout(vix, start.lead, vehicleStep, { power: client });
    expect(r).toMatchObject({ ok: false, status: 422 });
  });

  it("recusa cidade que o Power não conhece", async () => {
    const { client } = fakePower();
    const start = await startCheckout(vix, { name: "João Lima", phone: "27988887777" }, { power: client });
    if (!start.ok) throw new Error(start.error);
    const r = await advanceCheckout(vix, start.lead, { ...vehicleStep, city: "Cidade Inexistente" }, { power: client });
    expect(r).toMatchObject({ ok: false, status: 422 });
  });

  it("se a criação falhar no início, tenta de novo na etapa do veículo", async () => {
    const failing = fakePower({ failAdd: true });
    const start = await startCheckout(vix, { name: "Ana Paula", phone: "27988887777" }, { power: failing.client });
    if (!start.ok) throw new Error(start.error);
    expect(start.lead.crmQuoteId).toBeUndefined();
    expect(start.lead.crmSyncError).toContain("Telefone inválido");

    const working = fakePower();
    const v = await advanceCheckout(vix, start.lead, vehicleStep, { power: working.client });
    if (!v.ok) throw new Error(v.error);
    expect(v.lead.crmQuoteId).toBe("Q123");
  });

  it("exige veículo escolhido no catálogo do Power", async () => {
    const { client } = fakePower();
    const start = await startCheckout(vix, { name: "Ana Paula", phone: "27988887777" }, { power: client });
    if (!start.ok) throw new Error(start.error);
    const r = await advanceCheckout(vix, start.lead, { ...vehicleStep, vehicle: { ...vehicleStep.vehicle, refs: undefined } }, { power: client });
    expect(r).toMatchObject({ ok: false, status: 400 });
  });
});

describe("catálogo do Power", () => {
  it("segue marca > ano > modelo e devolve os ids", async () => {
    const { client } = fakePower();
    const cat = powerCatalog(client);
    expect(await cat.brands("carro")).toEqual([{ code: "21", name: "FIAT" }]);
    expect(await cat.step2("carro", "21")).toEqual({ level: "ano", items: [{ code: "900", name: "2022 Gasolina" }] });
    expect((await cat.step3("carro", "21", "900")).level).toBe("modelo");
    expect(await cat.resolve("carro", "21", "900", "7001")).toEqual({
      brand: "FIAT",
      model: "ARGO DRIVE 1.0",
      year: 2022,
      refs: { cb: "21", mdlYr: "900", mdl: "7001" },
    });
  });
});
