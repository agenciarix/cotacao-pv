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
  /** Nome da variável de ambiente que guarda o token deste cliente. */
  tokenEnv: string;
  /** Campos específicos da conta Power do cliente (ids de funil, origem etc.). */
  options?: Record<string, string>;
}

export interface Tenant {
  slug: string;
  branding: Branding;
  acceptance: AcceptanceRules;
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
  fipeValueCents: number;
  usage: UsageType;
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
