/**
 * Demonstração estática: roda o checkout inteiro no navegador, sem servidor.
 * As chamadas /api/... são atendidas aqui mesmo pelas mesmas regras de negócio
 * (preço, aceitação, Power CRM simulado). Gera um único HTML com `npm run demo`.
 */
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Checkout } from "@/components/Checkout";
import { advanceCheckout, publicLead, startCheckout } from "@/lib/checkout";
import { normalizePlate } from "@/lib/format";
import { getLead, listCrmLog, type CrmLogEntry } from "@/lib/store";
import type { VehicleType } from "@/lib/types";
import { mockFipe, mockPlates } from "@/lib/vehicles/mock";
import { getTenant, listTenants } from "@/tenants";

const realFetch = window.fetch.bind(window);
const listeners = new Set<() => void>();

function reply(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, location.href);
  const m = url.pathname.match(/^\/api\/([^/]+)\/(.*)$/);
  if (!m) return realFetch(input, init);
  const tenant = getTenant(m[1]);
  if (!tenant) return reply({ error: "Cliente não encontrado." }, 404);
  const path = m[2];
  const body = init?.body ? JSON.parse(String(init.body)) : null;
  await new Promise((r) => setTimeout(r, 250));
  try {
    if (path === "leads" && init?.method === "POST") {
      const r = await startCheckout(tenant, body);
      return r.ok ? reply(publicLead(r.lead), 201) : reply({ error: r.error }, r.status);
    }
    const lm = path.match(/^leads\/(.+)$/);
    if (lm && init?.method === "PATCH") {
      const lead = getLead(tenant.slug, lm[1]);
      if (!lead) return reply({ error: "Cotação não encontrada." }, 404);
      const r = await advanceCheckout(tenant, lead, body);
      return r.ok ? reply(publicLead(r.lead)) : reply({ error: r.error }, r.status);
    }
    if (path === "vehicles/lookup") {
      const plate = normalizePlate(body?.plate ?? "");
      if (!plate) return reply({ error: "Placa inválida." }, 400);
      return reply({ plate, ...(await mockPlates.lookup(plate)) });
    }
    if (path === "fipe") {
      const q = url.searchParams;
      const type = q.get("type") as VehicleType;
      const brand = q.get("brand"), model = q.get("model"), year = q.get("year");
      if (brand && model && year) {
        const p = await mockFipe.price(type, brand, model, year);
        return p ? reply(p) : reply({ error: "Valor FIPE não encontrado." }, 404);
      }
      if (brand && model) return reply(await mockFipe.years(type, brand, model));
      if (brand) return reply(await mockFipe.models(type, brand));
      return reply(await mockFipe.brands(type));
    }
    return reply({ error: "Rota não encontrada." }, 404);
  } finally {
    listeners.forEach((l) => l());
  }
};

function CrmLog({ tenant }: { tenant: string }) {
  const [log, setLog] = useState<CrmLogEntry[]>(() => listCrmLog(tenant));
  useEffect(() => {
    const l = () => setLog(listCrmLog(tenant));
    listeners.add(l);
    l();
    return () => void listeners.delete(l);
  }, [tenant]);
  return (
    <section className="card demo-log">
      <h2>O que seria enviado ao Power CRM</h2>
      <p className="note">Simulação: nada sai desta página. Cada etapa cria ou atualiza a cotação no CRM da associação.</p>
      {log.length === 0 ? (
        <p className="note">Preencha a primeira etapa para ver o primeiro envio.</p>
      ) : (
        log.map((e, i) => (
          <details key={`${e.at}-${i}`} open={i === 0}>
            <summary>
              {e.action === "create" ? "Criar cotação" : "Atualizar cotação"} · {e.result} · etapa {(e.payload as { pwrStep?: string }).pwrStep}
            </summary>
            <pre>{JSON.stringify(e.payload, null, 2)}</pre>
          </details>
        ))
      )}
    </section>
  );
}

function App() {
  const [slug, setSlug] = useState("demo");
  const [run, setRun] = useState(0);
  const tenant = getTenant(slug)!;
  const { branding } = tenant;
  return (
    <div className="demo-grid" style={{ ["--primary" as string]: branding.primaryColor }}>
      <div className="demo-bar">
        <label htmlFor="tenant-pick">Cliente (white label)</label>
        <select id="tenant-pick" value={slug} onChange={(e) => setSlug(e.target.value)}>
          {listTenants().map((t) => <option key={t.slug} value={t.slug}>{t.branding.name}</option>)}
        </select>
        <button type="button" className="link" onClick={() => setRun((n) => n + 1)}>Recomeçar cotação</button>
        <span className="note">Placas de teste: ABC1D23, BRA2E19, MOT0A12. Outras placas caem na FIPE.</span>
      </div>
      <main>
        <header className="header"><span className="brand">{branding.name}</span></header>
        <Checkout
          key={`${slug}-${run}`}
          tenant={slug}
          branding={branding}
          plans={tenant.pricing.plans}
          vehicleTypes={tenant.acceptance.vehicleTypes}
          usageTypes={tenant.acceptance.usageTypes}
        />
        <p className="footer">{branding.legalName ?? branding.name}</p>
      </main>
      <CrmLog tenant={slug} />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
