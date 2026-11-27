"use client";

import { useState } from "react";
import { formatBRL, onlyDigits, whatsappLink } from "@/lib/format";
import { VEHICLE_TYPE_LABEL, type Branding, type Plan, type UsageType, type Vehicle, type VehicleType } from "@/lib/types";

type PublicLead = {
  id: string;
  step: string;
  name: string;
  vehicle?: Vehicle;
  quoteOptions?: { planId: string; planName: string; monthlyCents: number; enrollmentFeeCents: number; discountPercent: number; coverages?: string[] }[];
  chosenPlanId?: string;
  crmQuoteId?: string;
};

type Item = { code: string; name: string };
type Level = "modelo" | "ano";
const LEVEL_LABEL: Record<Level, string> = { modelo: "Modelo", ano: "Ano" };

const USAGE_LABEL: Record<UsageType, string> = {
  particular: "Uso particular",
  aplicativo: "Motorista de aplicativo",
  taxi: "Táxi",
};

const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

function maskPhone(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
}
function maskCpf(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function maskCep(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

interface Props {
  tenant: string;
  /** Onde o navegador chama a API. Padrão: /api/<cliente>. */
  apiBase?: string;
  /** Busca de veículo pela placa. Desligada quando o catálogo vem do CRM. */
  plateLookup?: boolean;
  /** Campo de cupom (só no modo simulado por enquanto). */
  coupons?: boolean;
  branding: Branding;
  plans: Plan[];
  vehicleTypes: VehicleType[];
  usageTypes: UsageType[];
}

export function Checkout({ tenant, apiBase, plateLookup = true, coupons = true, branding, plans, vehicleTypes, usageTypes }: Props) {
  const api = apiBase ?? `/api/${tenant}`;
  const [lead, setLead] = useState<PublicLead | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Etapa 1
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Etapa 2
  const [type, setType] = useState<VehicleType>(vehicleTypes[0]);
  const [usage, setUsage] = useState<UsageType>(usageTypes[0]);
  const [plate, setPlate] = useState("");
  const [vehicle, setVehicle] = useState<Omit<Vehicle, "usage" | "type"> | null>(null);
  const [manual, setManual] = useState(false);
  const [brands, setBrands] = useState<Item[]>([]);
  const [level2, setLevel2] = useState<{ level: Level; items: Item[] } | null>(null);
  const [level3, setLevel3] = useState<{ level: Level; items: Item[] } | null>(null);
  const [sel, setSel] = useState({ brand: "", a: "", b: "" });
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("");
  const [coupon, setCoupon] = useState("");

  // Etapa 3
  const [planId, setPlanId] = useState<string | null>(null);

  // Etapa 4
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [addr, setAddr] = useState({ cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" });

  const step = lead?.step ?? "contato";
  const stepIndex = ["contato", "cotacao", "dados", "concluido"].indexOf(step === "veiculo" ? "contato" : step);
  const onVehicleStep = lead !== null && step === "contato";

  async function call<T>(url: string, init?: RequestInit): Promise<T | null> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível continuar. Tente de novo.");
        return null;
      }
      return data as T;
    } catch {
      setError("Sem conexão. Tente de novo.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function submitContact(e: React.FormEvent) {
    e.preventDefault();
    const data = await call<PublicLead>(`${api}/leads`, { method: "POST", body: JSON.stringify({ name, phone }) });
    if (data) {
      setLead(data);
      if (!plateLookup) void startManualFor(type);
    }
  }

  async function loadFipe(params: Record<string, string>) {
    const q = new URLSearchParams({ type, ...params });
    const res = await fetch(`${api}/fipe?${q}`);
    return res.ok ? res.json() : null;
  }

  async function startManual() {
    setManual(true);
    setVehicle(null);
    setSel({ brand: "", a: "", b: "" });
    setLevel2(null);
    setLevel3(null);
    const list = await loadFipe({});
    if (!list) setError("Não conseguimos carregar a lista de veículos. Tente de novo.");
    setBrands(list ?? []);
  }

  function changeType(t: VehicleType) {
    setType(t);
    setVehicle(null);
    setManual(false);
    setBrands([]);
    if (!plateLookup) void startManualFor(t);
  }

  async function startManualFor(t: VehicleType) {
    setManual(true);
    setSel({ brand: "", a: "", b: "" });
    setLevel2(null);
    setLevel3(null);
    const res = await fetch(`${api}/fipe?${new URLSearchParams({ type: t })}`);
    setBrands(res.ok ? await res.json() : []);
  }

  async function lookupPlate() {
    const data = await call<{ found: boolean; plate: string; type?: VehicleType; brand?: string; model?: string; year?: number; fipeCode?: string; fipeValueCents?: number }>(
      `${api}/vehicles/lookup`,
      { method: "POST", body: JSON.stringify({ plate }) },
    );
    if (!data) return;
    if (!data.found || !data.fipeValueCents) {
      setError("Não encontramos essa placa. Escolha marca, modelo e ano abaixo.");
      await startManual();
      return;
    }
    if (data.type && data.type !== type && vehicleTypes.includes(data.type)) setType(data.type);
    setManual(false);
    setVehicle({ plate: data.plate, brand: data.brand!, model: data.model!, year: data.year!, fipeCode: data.fipeCode, fipeValueCents: data.fipeValueCents });
  }

  async function pickBrand(code: string) {
    setSel({ brand: code, a: "", b: "" });
    setLevel3(null);
    setVehicle(null);
    setLevel2(code ? await loadFipe({ brand: code }) : null);
  }
  async function pickA(code: string) {
    setSel((s) => ({ ...s, a: code, b: "" }));
    setVehicle(null);
    setLevel3(code ? await loadFipe({ brand: sel.brand, a: code }) : null);
  }
  async function pickB(code: string) {
    setSel((s) => ({ ...s, b: code }));
    if (!code) return setVehicle(null);
    const v = await loadFipe({ brand: sel.brand, a: sel.a, b: code });
    if (!v) return setError("Não encontramos esse veículo. Escolha de novo.");
    setError(null);
    setVehicle({ plate: plate || undefined, brand: v.brand, model: v.model, year: v.year, fipeCode: v.fipeCode, fipeValueCents: v.fipeValueCents, refs: v.refs });
  }

  async function submitVehicle(e: React.FormEvent) {
    e.preventDefault();
    if (!lead || !vehicle) return setError("Informe o veículo.");
    const data = await call<PublicLead>(`${api}/leads/${lead.id}`, {
      method: "PATCH",
      body: JSON.stringify({ step: "veiculo", vehicle: { ...vehicle, plate: plate || vehicle.plate, type, usage }, city, state: uf, coupon: coupon || undefined }),
    });
    if (data) {
      setLead(data);
      setPlanId(data.quoteOptions?.find((o) => plans.find((p) => p.id === o.planId)?.highlight)?.planId ?? data.quoteOptions?.[0]?.planId ?? null);
      setAddr((a) => ({ ...a, city, state: uf }));
    }
  }

  async function submitPlan() {
    if (!lead || !planId) return;
    const data = await call<PublicLead>(`${api}/leads/${lead.id}`, { method: "PATCH", body: JSON.stringify({ step: "cotacao", planId }) });
    if (data) setLead(data);
  }

  async function fillCep(value: string) {
    const masked = maskCep(value);
    setAddr((a) => ({ ...a, cep: masked }));
    const d = onlyDigits(masked);
    if (d.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const j = await r.json();
      if (!j.erro) setAddr((a) => ({ ...a, street: j.logradouro || a.street, neighborhood: j.bairro || a.neighborhood, city: j.localidade || a.city, state: j.uf || a.state }));
    } catch {
      /* preenchimento manual */
    }
  }

  async function submitData(e: React.FormEvent) {
    e.preventDefault();
    if (!lead) return;
    const data = await call<PublicLead>(`${api}/leads/${lead.id}`, {
      method: "PATCH",
      body: JSON.stringify({ step: "dados", email, cpf, address: { ...addr, complement: addr.complement || undefined } }),
    });
    if (data) setLead(data);
  }

  const chosen = lead?.quoteOptions?.find((o) => o.planId === (lead.chosenPlanId ?? planId));

  return (
    <div className="card">
      <div className="steps" aria-hidden>
        {[0, 1, 2, 3].map((i) => <span key={i} className={i <= stepIndex ? "on" : ""} />)}
      </div>

      {!lead && (
        <form onSubmit={submitContact}>
          <h1>Vamos começar</h1>
          <p className="sub">Só seu nome e telefone para ver o valor da proteção.</p>
          <label htmlFor="name">Nome</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" autoComplete="name" required />
          <label htmlFor="phone">Telefone / WhatsApp</label>
          <input id="phone" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" inputMode="tel" autoComplete="tel" required />
          <button className="btn" disabled={busy}>{busy ? "Enviando..." : "Cotar agora"}</button>
          <p className="note">Seus dados ficam seguros e não enviamos spam.</p>
        </form>
      )}

      {onVehicleStep && (
        <form onSubmit={submitVehicle}>
          <h1>Seu veículo</h1>
          <p className="sub">Informe a placa ou escolha pela tabela FIPE.</p>
          <div className="tabs" role="group" aria-label="Tipo de veículo">
            {vehicleTypes.map((t) => (
              <button type="button" key={t} className={t === type ? "on" : ""} onClick={() => changeType(t)}>{VEHICLE_TYPE_LABEL[t]}</button>
            ))}
          </div>
          {usageTypes.length > 1 && (
            <>
              <label htmlFor="usage">Uso do veículo</label>
              <select id="usage" value={usage} onChange={(e) => setUsage(e.target.value as UsageType)}>
                {usageTypes.map((u) => <option key={u} value={u}>{USAGE_LABEL[u]}</option>)}
              </select>
            </>
          )}
          <label htmlFor="plate">Placa{plateLookup ? "" : " (opcional)"}</label>
          {plateLookup ? (
            <div className="row3">
              <input id="plate" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase().slice(0, 8))} placeholder="ABC1D23" />
              <button type="button" className="btn ghost" style={{ marginTop: 0 }} onClick={lookupPlate} disabled={busy || plate.length < 7}>Buscar</button>
            </div>
          ) : (
            <input id="plate" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase().slice(0, 8))} placeholder="ABC1D23" />
          )}
          {!manual && (
            <p className="note">
              <button type="button" className="link" onClick={startManual}>{plateLookup ? "Não sei a placa / escolher pela FIPE" : "Escolher marca, ano e modelo"}</button>
            </p>
          )}

          {manual && (
            <>
              <label htmlFor="brand">Marca</label>
              <select id="brand" value={sel.brand} onChange={(e) => pickBrand(e.target.value)}>
                <option value="">Selecione</option>
                {brands.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
              </select>
              <label htmlFor="lvl2">{level2 ? LEVEL_LABEL[level2.level] : plateLookup ? "Modelo" : "Ano"}</label>
              <select id="lvl2" value={sel.a} onChange={(e) => pickA(e.target.value)} disabled={!sel.brand || !level2}>
                <option value="">Selecione</option>
                {level2?.items.map((m) => <option key={m.code} value={m.code}>{m.name}</option>)}
              </select>
              <label htmlFor="lvl3">{level3 ? LEVEL_LABEL[level3.level] : plateLookup ? "Ano" : "Modelo"}</label>
              <select id="lvl3" value={sel.b} onChange={(e) => pickB(e.target.value)} disabled={!sel.a || !level3}>
                <option value="">Selecione</option>
                {level3?.items.map((y) => <option key={y.code} value={y.code}>{y.name}</option>)}
              </select>
            </>
          )}

          {vehicle && (
            <div className="vehicle">
              <strong>{vehicle.brand} {vehicle.model} {vehicle.year}</strong>
              {vehicle.fipeValueCents ? <div className="note">Valor FIPE: {formatBRL(vehicle.fipeValueCents)}</div> : null}
            </div>
          )}

          <div className="row3">
            <div>
              <label htmlFor="city">Cidade</label>
              <input id="city" value={city} onChange={(e) => setCity(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="uf">UF</label>
              <select id="uf" value={uf} onChange={(e) => setUf(e.target.value)} required>
                <option value="">--</option>
                {UFS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          {coupons && (
            <>
              <label htmlFor="coupon">Cupom ou código de indicação (opcional)</label>
              <input id="coupon" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} />
            </>
          )}
          <button className="btn" disabled={busy || !vehicle}>{busy ? "Calculando..." : "Ver preço"}</button>
        </form>
      )}

      {lead?.step === "cotacao" && (
        <div>
          <h1>Escolha seu plano</h1>
          <p className="sub">{lead.vehicle?.brand} {lead.vehicle?.model} {lead.vehicle?.year}</p>
          <div className="plans">
            {lead.quoteOptions?.map((o) => {
              const plan = plans.find((p) => p.id === o.planId);
              return (
                <button type="button" key={o.planId} className={`plan ${planId === o.planId ? "on" : ""}`} onClick={() => setPlanId(o.planId)} aria-pressed={planId === o.planId}>
                  {plan?.highlight && <span className="tag">Mais escolhido</span>}
                  <div><strong>{o.planName}</strong></div>
                  <div className="price">{formatBRL(o.monthlyCents)}<small style={{ fontSize: ".9rem", fontWeight: 400 }}>/mês</small></div>
                  <div className="note">{o.enrollmentFeeCents ? `Adesão única de ${formatBRL(o.enrollmentFeeCents)}` : "Sem taxa de adesão"}{o.discountPercent ? ` · ${o.discountPercent}% de desconto aplicado` : ""}</div>
                  {(o.coverages?.length ? o.coverages : plan?.coverages ?? []).length > 0 && (
                    <ul>{(o.coverages?.length ? o.coverages : plan?.coverages ?? []).map((c) => <li key={c}>{c}</li>)}</ul>
                  )}
                </button>
              );
            })}
          </div>
          <button className="btn" onClick={submitPlan} disabled={busy || !planId}>Quero esse plano</button>
          <p className="note"><button type="button" className="link" onClick={() => setLead({ ...lead, step: "contato" })}>Alterar veículo</button></p>
        </div>
      )}

      {lead?.step === "dados" && (
        <form onSubmit={submitData}>
          <h1>Seus dados</h1>
          <p className="sub">Para gerar sua proposta do plano {chosen?.planName}.</p>
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          <label htmlFor="cpf">CPF</label>
          <input id="cpf" value={cpf} onChange={(e) => setCpf(maskCpf(e.target.value))} inputMode="numeric" required />
          <label htmlFor="cep">CEP</label>
          <input id="cep" value={addr.cep} onChange={(e) => fillCep(e.target.value)} inputMode="numeric" autoComplete="postal-code" required />
          <label htmlFor="street">Endereço</label>
          <input id="street" value={addr.street} onChange={(e) => setAddr({ ...addr, street: e.target.value })} required />
          <div className="row">
            <div>
              <label htmlFor="number">Número</label>
              <input id="number" value={addr.number} onChange={(e) => setAddr({ ...addr, number: e.target.value })} required />
            </div>
            <div>
              <label htmlFor="complement">Complemento</label>
              <input id="complement" value={addr.complement} onChange={(e) => setAddr({ ...addr, complement: e.target.value })} />
            </div>
          </div>
          <label htmlFor="neighborhood">Bairro</label>
          <input id="neighborhood" value={addr.neighborhood} onChange={(e) => setAddr({ ...addr, neighborhood: e.target.value })} required />
          <div className="row3">
            <div>
              <label htmlFor="acity">Cidade</label>
              <input id="acity" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} required />
            </div>
            <div>
              <label htmlFor="astate">UF</label>
              <select id="astate" value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })} required>
                <option value="">--</option>
                {UFS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <button className="btn" disabled={busy}>{busy ? "Enviando..." : "Finalizar cotação"}</button>
        </form>
      )}

      {lead?.step === "concluido" && (
        <div>
          <h1>Cotação enviada!</h1>
          <p className="sub">
            {lead.name.split(" ")[0]}, sua cotação do plano <strong>{chosen?.planName}</strong> por{" "}
            <strong>{chosen ? formatBRL(chosen.monthlyCents) : ""}/mês</strong> foi registrada. Um consultor vai falar com você para a vistoria e a contratação.
          </p>
          <a
            className="btn"
            href={whatsappLink(
              branding.whatsapp,
              `Olá! Acabei de fazer a cotação ${lead.crmQuoteId ?? ""} do plano ${chosen?.planName ?? ""} para meu ${lead.vehicle?.brand ?? ""} ${lead.vehicle?.model ?? ""}. Quero contratar.`,
            )}
            target="_blank"
            rel="noreferrer"
          >
            Falar no WhatsApp agora
          </a>
        </div>
      )}

      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
