import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Checkout } from "@/components/Checkout";
import { getTenant } from "@/tenants";

type Props = { params: Promise<{ tenant: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tenant = getTenant((await params).tenant);
  if (!tenant) return {};
  return {
    title: `Cotação | ${tenant.branding.name}`,
    icons: tenant.branding.faviconUrl ? [{ url: tenant.branding.faviconUrl }] : undefined,
  };
}

export default async function CotacaoPage({ params }: Props) {
  const tenant = getTenant((await params).tenant);
  if (!tenant) notFound();
  const { branding } = tenant;
  // Pelo domínio do cliente, a API é chamada no mesmo domínio (ex.: /cotacao/api).
  const h = await headers();
  const viaClientDomain = h.get("x-cotacao-tenant") === tenant.slug;
  const apiBase = viaClientDomain ? `${h.get("x-cotacao-base") ?? ""}/api` : `/api/${tenant.slug}`;
  return (
    <main className="wrap" style={{ ["--primary" as string]: branding.primaryColor }}>
      <header className="header">
        {branding.logoUrl ? <img src={branding.logoUrl} alt={branding.name} /> : null}
        <span className="brand">{branding.name}</span>
      </header>
      <Checkout
        tenant={tenant.slug}
        apiBase={apiBase}
        plateLookup={tenant.crm.mode !== "power"}
        coupons={tenant.crm.mode !== "power"}
        branding={branding}
        plans={tenant.pricing.plans}
        vehicleTypes={tenant.acceptance.vehicleTypes}
        usageTypes={tenant.acceptance.usageTypes}
      />
      <p className="footer">
        {branding.legalName ?? branding.name}
        {branding.cnpj ? ` · CNPJ ${branding.cnpj}` : ""}
      </p>
    </main>
  );
}
