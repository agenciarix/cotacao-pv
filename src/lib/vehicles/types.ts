import type { VehicleType } from "../types";

export interface FipeItem {
  code: string;
  name: string;
}

export interface FipePrice {
  fipeCode: string;
  brand: string;
  model: string;
  year: number;
  valueCents: number;
  reference: string;
}

/** Fonte de marcas, modelos, anos e valores da tabela FIPE. */
export interface FipeProvider {
  brands(type: VehicleType): Promise<FipeItem[]>;
  models(type: VehicleType, brandCode: string): Promise<FipeItem[]>;
  years(type: VehicleType, brandCode: string, modelCode: string): Promise<FipeItem[]>;
  price(type: VehicleType, brandCode: string, modelCode: string, yearCode: string): Promise<FipePrice | null>;
}

export interface PlateLookupResult {
  found: boolean;
  type?: VehicleType;
  brand?: string;
  model?: string;
  year?: number;
  fipeCode?: string;
  fipeValueCents?: number;
}

/**
 * Consulta de placa. Serviços reais são pagos (a escolher). Enquanto isso,
 * o modo de exemplo reconhece algumas placas e, para as outras, cai na
 * seleção manual pela FIPE, igual ao fluxo real.
 */
export interface PlateProvider {
  lookup(plate: string): Promise<PlateLookupResult>;
}
