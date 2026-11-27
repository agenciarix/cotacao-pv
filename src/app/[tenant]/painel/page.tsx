import { notFound } from "next/navigation";
import { formatBRL } from "@/lib/format";
import { listCrmLog, listLeads } from "@/lib/store";
import { getTenant } from "@/tenants";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ chave?: string }>;
};

/**
 * Painel provisório: leads e o que foi (ou seria) enviado ao Power CRM.
 * Em produção, exige PAINEL_CHAVE na URL (?chave=...). Vira painel com login na fase seguinte.
 */
export default async function PainelPage({ params, searchParams }: Props) {
  const tenant = getTenant((await params).tenant);
  if (!tenant) notFound();
  const key = process.env.PAINEL_CHAVE;
  const { chave } = await searchParams;
  if ((key && chave !== key) || (!key && process.env.NODE_ENV === "production")) notFound();

  const leads = listLeads(tenant.slug);
  const log = listCrmLog(tenant.slug).slice(0, 50);
  const mode = process.env.CRM_MODE === "power" ? "Power API" : "simulado";

  return (
    <main className="wrap" style={{ maxWidth: 1000, ["--primary" as string]: tenant.branding.primaryColor }}>
      <h1>Painel · {tenant.branding.name}</h1>
      <p className="sub">Integração com o Power CRM: modo {mode}.</p>

      <div className="card">
        <h2>Leads ({leads.length})</h2>
        <table>
          <thead>
            <tr><th>Atualizado</th><th>Nome</th><th>Telefone</th><th>Etapa</th><th>Veículo</th><th>Plano</th><th>CRM</th></tr>
          </thead>
          <tbody>
            {leads.map((l) => {
              const plan = l.quoteOptions?.find((o) => o.planId === l.chosenPlanId);
              return (
                <tr key={l.id}>
                  <td>{new Date(l.updatedAt).toLocaleString("pt-BR")}</td>
                  <td>{l.name}</td>
                  <td>{l.phone}</td>
                  <td>{l.step}</td>
                  <td>{l.vehicle ? `${l.vehicle.brand} ${l.vehicle.model} ${l.vehicle.year}` : "—"}</td>
                  <td>{plan ? `${plan.planName} ${formatBRL(plan.monthlyCents)}` : "—"}</td>
                  <td>{l.crmSyncError ? `Erro: ${l.crmSyncError}` : l.crmQuoteId ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Envios ao Power CRM</h2>
        <table>
          <thead><tr><th>Quando</th><th>Ação</th><th>Id</th><th>Dados enviados</th></tr></thead>
          <tbody>
            {log.map((e, i) => (
              <tr key={i}>
                <td>{new Date(e.at).toLocaleString("pt-BR")}</td>
                <td>{e.action === "create" ? "Criar cotação" : "Atualizar cotação"}</td>
                <td>{e.result}</td>
                <td><pre>{JSON.stringify(e.payload, null, 2)}</pre></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
