import { NextResponse, type NextRequest } from "next/server";
import { routeForTenantHost } from "@/lib/routing";
import { getTenantByHost, listTenants } from "@/tenants";

/**
 * Reconhece o cliente pelo domínio. Atrás do proxy do site do cliente, o
 * domínio original chega em X-Forwarded-Host.
 */
export function proxy(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const tenant = getTenantByHost(host);
  if (!tenant) return NextResponse.next();

  const pathname = request.nextUrl.pathname;
  const first = pathname.split("/")[1];
  // No domínio de um cliente, as páginas dos outros clientes não existem.
  if (listTenants().some((t) => t.slug === first && t.slug !== tenant.slug)) {
    return new NextResponse("Não encontrado", { status: 404 });
  }

  const route = routeForTenantHost(tenant.slug, pathname);
  if (!route) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = route.path;
  const headers = new Headers(request.headers);
  headers.set("x-cotacao-base", route.base);
  headers.set("x-cotacao-tenant", tenant.slug);
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico).*)"],
};
