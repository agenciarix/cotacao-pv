import type { VehicleType } from "../types";

export interface CatalogItem {
  code: string;
  name: string;
}

export type CatalogLevel = "modelo" | "ano";

/** Próximo nível do catálogo: a FIPE vai marca > modelo > ano; o Power vai marca > ano > modelo. */
export interface CatalogStep {
  level: CatalogLevel;
  items: CatalogItem[];
}

export interface CatalogVehicle {
  brand: string;
  model: string;
  year: number;
  fipeCode?: string;
  fipeValueCents?: number;
  /** Ids do catálogo, enviados de volta ao CRM. */
  refs?: Record<string, string>;
}

/** Catálogo de veículos em três níveis a partir da marca. */
export interface VehicleCatalog {
  brands(type: VehicleType): Promise<CatalogItem[]>;
  step2(type: VehicleType, brand: string): Promise<CatalogStep>;
  step3(type: VehicleType, brand: string, second: string): Promise<CatalogStep>;
  resolve(type: VehicleType, brand: string, second: string, third: string): Promise<CatalogVehicle | null>;
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
 * Consulta de placa. Serviços reais são pagos (a escolher). O modo de
 * exemplo reconhece algumas placas e, para as outras, cai no catálogo.
 */
export interface PlateProvider {
  lookup(plate: string): Promise<PlateLookupResult>;
}
