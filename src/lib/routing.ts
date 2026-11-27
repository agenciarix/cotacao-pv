/**
 * Decide para onde vai uma requisição que chegou pelo domínio de um cliente.
 *
 * Dois formatos:
 * - Subdomínio próprio (cotacao.cliente.com.br): "/" é o checkout.
 * - Caminho no site do cliente (cliente.com.br/cotacao): o servidor do
 *   cliente repassa /cotacao/* para nós, mantendo o caminho.
 *
 * Retorna o caminho interno e a base pública (usada pelo navegador para
 * chamar a API pelo mesmo domínio), ou null para seguir sem mudança.
 */
export interface HostRoute {
  path: string;
  base: "" | "/cotacao";
}

export function routeForTenantHost(slug: string, pathname: string): HostRoute | null {
  const base: HostRoute["base"] = pathname === "/cotacao" || pathname.startsWith("/cotacao/") ? "/cotacao" : "";
  const rest = (base ? pathname.slice(base.length) : pathname) || "/";

  if (rest === "/" ) return { path: `/${slug}/cotacao`, base };
  if (rest === "/painel") return { path: `/${slug}/painel`, base };
  if (rest.startsWith("/api/")) {
    const apiRest = rest.slice("/api/".length);
    // Nunca deixa um domínio acessar a API de outro cliente.
    const own = apiRest.startsWith(`${slug}/`) ? apiRest.slice(slug.length + 1) : apiRest;
    return { path: `/api/${slug}/${own}`, base };
  }
  return null;
}
