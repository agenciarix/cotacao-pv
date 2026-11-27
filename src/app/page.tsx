import Link from "next/link";
import { listTenants } from "@/tenants";

export default function Home() {
  return (
    <main className="wrap">
      <h1>Checkout de cotação white label</h1>
      <p className="sub">Clientes configurados neste ambiente:</p>
      <div className="card">
        <table>
          <thead>
            <tr><th>Cliente</th><th>Cotação</th><th>Painel</th></tr>
          </thead>
          <tbody>
            {listTenants().map((t) => (
              <tr key={t.slug}>
                <td>{t.branding.name}</td>
                <td><Link href={`/${t.slug}/cotacao`}>/{t.slug}/cotacao</Link></td>
                <td><Link href={`/${t.slug}/painel`}>/{t.slug}/painel</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
