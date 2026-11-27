import { describe, expect, it } from "vitest";
import { getTenantByHost } from "@/tenants";
import { routeForTenantHost } from "./routing";

describe("getTenantByHost", () => {
  it("acha o cliente pelo domínio, ignorando porta e maiúsculas", () => {
    expect(getTenantByHost("Cotacao.ProtegeDemo.com.br:443")?.slug).toBe("demo");
    expect(getTenantByHost("mutuasuldeminas.com.br")?.slug).toBe("sulminas");
    expect(getTenantByHost("localhost:3000")).toBeUndefined();
  });
});

describe("routeForTenantHost", () => {
  it("subdomínio: raiz é o checkout e /api vai para a API do cliente", () => {
    expect(routeForTenantHost("demo", "/")).toEqual({ path: "/demo/cotacao", base: "" });
    expect(routeForTenantHost("demo", "/api/leads")).toEqual({ path: "/api/demo/leads", base: "" });
  });
  it("caminho /cotacao no site do cliente", () => {
    expect(routeForTenantHost("demo", "/cotacao")).toEqual({ path: "/demo/cotacao", base: "/cotacao" });
    expect(routeForTenantHost("demo", "/cotacao/")).toEqual({ path: "/demo/cotacao", base: "/cotacao" });
    expect(routeForTenantHost("demo", "/cotacao/api/leads/abc")).toEqual({ path: "/api/demo/leads/abc", base: "/cotacao" });
    expect(routeForTenantHost("demo", "/cotacao/painel")).toEqual({ path: "/demo/painel", base: "/cotacao" });
  });
  it("não deixa um domínio acessar outro cliente", () => {
    expect(routeForTenantHost("demo", "/api/sulminas/leads")?.path).toBe("/api/demo/sulminas/leads");
    expect(routeForTenantHost("demo", "/api/demo/leads")?.path).toBe("/api/demo/leads");
  });
  it("deixa passar o que não é do checkout", () => {
    expect(routeForTenantHost("demo", "/sobre")).toBeNull();
  });
});
