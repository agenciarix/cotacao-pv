/**
 * Cliente da Power API (https://power-crm.readme.io). Ver docs/power-api.md.
 * O fetch é injetável para os testes.
 */
export interface PowerItem {
  id: number;
  text: string;
}

export interface PowerPlanItem {
  id?: number;
  name?: string;
  description?: string;
  value?: number;
}

export interface PowerPlan {
  planId: number;
  name: string;
  tablePricePlanId: number;
  price: number;
  accessPrice?: number;
  active?: boolean;
  isSelected?: boolean;
  coverages?: PowerPlanItem[];
  assistances?: PowerPlanItem[];
  benefits?: PowerPlanItem[];
}

export interface PowerPlansResponse {
  quotationCode: string;
  acquisitionPrice?: number;
  monthlyPrice?: number;
  trackerPrice?: number;
  plans: PowerPlan[];
}

export class PowerApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Fetch = typeof fetch;

export class PowerClient {
  constructor(
    private token: string,
    private base = "https://api.powercrm.com.br",
    private fetchImpl: Fetch = fetch,
  ) {}

  private async request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const res = await this.fetchImpl(this.base + path, {
      method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.token}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
    const text = await res.text();
    if (!res.ok) {
      let message = text.slice(0, 300);
      try {
        const j = JSON.parse(text);
        message = (j.errors ?? j.errorVO?.errors ?? [j.message ?? j.error]).join("; ") || message;
      } catch {
        /* texto puro */
      }
      throw new PowerApiError(res.status, `Power API ${res.status}: ${message}`);
    }
    return (text ? JSON.parse(text) : {}) as T;
  }

  async createQuotation(data: Record<string, unknown>): Promise<string> {
    const r = await this.request<{ quotationResponse?: { quotationCode?: string }; quotationCode?: string }>(
      "POST",
      "/api/quotation/add",
      data,
    );
    const code = r.quotationResponse?.quotationCode ?? r.quotationCode;
    if (!code) throw new PowerApiError(502, "Power API não devolveu o código da cotação.");
    return code;
  }

  updateQuotation(code: string, data: Record<string, unknown>) {
    return this.request<unknown>("POST", "/api/quotation/update", { ...data, code });
  }

  plans(code: string) {
    return this.request<PowerPlansResponse>("GET", `/api/quotation/plansQuotation?quotationCode=${encodeURIComponent(code)}`);
  }

  brands(type: 1 | 2 | 3) {
    return this.request<PowerItem[]>("GET", `/api/quotation/cb?type=${type}`);
  }
  years(brandId: string | number) {
    return this.request<PowerItem[]>("GET", `/api/quotation/bmy?cb=${encodeURIComponent(brandId)}`);
  }
  models(brandId: string | number, yearId: string | number) {
    return this.request<PowerItem[]>("GET", `/api/quotation/cmby?cb=${encodeURIComponent(brandId)}&cy=${encodeURIComponent(yearId)}`);
  }
  states() {
    return this.request<PowerItem[]>("GET", "/api/quotation/stt");
  }
  cities(stateId: number) {
    return this.request<PowerItem[]>("GET", `/api/quotation/ct?st=${stateId}`);
  }
}

export function powerClientFor(tokenEnv: string, fetchImpl?: Fetch): PowerClient {
  const token = process.env[tokenEnv];
  if (!token) throw new PowerApiError(500, `Token do Power não configurado (${tokenEnv}).`);
  return new PowerClient(token, process.env.POWER_API_BASE || "https://api.powercrm.com.br", fetchImpl);
}
