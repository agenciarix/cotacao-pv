export type VehicleType = "carro" | "moto" | "caminhao" | "utilitario";

export const VEHICLE_TYPE_LABEL: Record<VehicleType, string> = {
  carro: "Carro",
  moto: "Moto",
  caminhao: "Caminhão",
  utilitario: "Utilitário",
};

export type UsageType = "particular" | "aplicativo" | "taxi";

export interface Branding {
  name: string;
  /** Cor principal em hexadecimal, usada em botões e destaques. */
  primaryColor: string;
  logoUrl?: string;
  faviconUrl?: string;
  /** Somente dígitos com DDI, ex.: 5531999999999 */
  whatsapp: string;
  legalName?: string;
  cnpj?: string;
}

export interface AcceptanceRules {
  vehicleTypes: VehicleType[];
  minYear: number;
  maxFipeCents: number;
  /** Marcas recusadas (comparação sem acento e sem diferenciar maiúsculas). */
  blockedBrands: string[];
  /** Trechos de nome de modelo recusados. */
  blockedModels: string[];
  /** UFs atendidas. Vazio = todas. */
  states: string[];
  /** Cidades recusadas no formato "Cidade/UF". */
  blockedCities: string[];
  usageTypes: UsageType[];
}

/** Uma faixa de valor FIPE com a mensalidade de cada plano. */
export interface PriceBand {
  minFipeCents: number;
  maxFipeCents: number;
  /** Mensalidade por id de plano, em centavos. */
  monthlyCents: Record<string, number>;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  coverages: string[];
  /** Plano em destaque na tela de preços. */
  highlight?: boolean;
}

export interface PricingTable {
  plans: Plan[];
  /** Tabelas por tipo de veículo. */
  bands: Partial<Record<VehicleType, PriceBand[]>>;
  /** Multiplicador por UF, ex.: { SP: 1.15 }. Padrão 1. */
  stateMultiplier: Record<string, number>;
  /** Multiplicador por uso, ex.: { aplicativo: 1.2 }. Padrão 1. */
  usageMultiplier: Partial<Record<UsageType, number>>;
  enrollmentFeeCents: number;
  coupons: Record<string, { percentOff: number; description: string }>;
}

export type CrmProvider = "powercrm";

export interface CrmConfig {
  provider: CrmProvider;
  /**
   * "power": preços, planos e catálogo de veículos vêm do Power do cliente.
   * "simulado": usa a tabela local (`pricing`) e só registra o que seria enviado.
   */
  mode: "power" | "simulado";
  /** Nome da variável de ambiente que guarda o token deste cliente. */
  tokenEnv: string;
  /** Ids da conta Power do cliente. */
  power?: {
    /** Id da cooperativa (Minha empresa > Cooperativas). */
    coop?: number;
    origemId?: number;
    leadSource?: number;
    /** Código do consultor que recebe as cotações. */
    slsmnId?: string;
  };
}

export interface Tenant {
  slug: string;
  /**
   * Domínios onde o checkout responde por este cliente, sem protocolo.
   * Ex.: "cotacao.cliente.com.br" (subdomínio apontado para nós) ou
   * "cliente.com.br" (site do cliente repassa /cotacao para nós).
   */
  domains: string[];
  branding: Branding;
  acceptance: AcceptanceRules;
  /** Tabela local, usada só no modo "simulado". No modo "power" o preço vem do Power. */
  pricing: PricingTable;
  crm: CrmConfig;
  /** Pixel do Meta, opcional. */
  metaPixelId?: string;
}

export interface Vehicle {
  type: VehicleType;
  plate?: string;
  brand: string;
  model: string;
  year: number;
  fipeCode?: string;
  /** Valor FIPE. Obrigatório no modo simulado; no modo Power quem consulta é o Power. */
  fipeValueCents?: number;
  usage: UsageType;
  /** Ids do catálogo usado (no Power: marca, ano e modelo). */
  refs?: Record<string, string>;
}

export interface Address {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export type FunnelStep = "contato" | "veiculo" | "cotacao" | "dados" | "concluido";

export interface QuoteOption {
  planId: string;
  planName: string;
  monthlyCents: number;
  enrollmentFeeCents: number;
  discountPercent: number;
  /** Id do plano na tabela do CRM (no Power, tablePricePlanId). */
  externalId?: string;
  /** Coberturas e assistências vindas do CRM. */
  coverages?: string[];
}

export interface Lead {
  id: string;
  tenant: string;
  createdAt: string;
  updatedAt: string;
  step: FunnelStep;
  name: string;
  phone: string;
  email?: string;
  cpf?: string;
  vehicle?: Vehicle;
  city?: string;
  state?: string;
  address?: Address;
  coupon?: string;
  quoteOptions?: QuoteOption[];
  chosenPlanId?: string;
  crmQuoteId?: string;
  crmSyncError?: string;
}
