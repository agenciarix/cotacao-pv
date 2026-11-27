import { powerCatalogFor } from "../power/catalog";
import type { Tenant } from "../types";
import { mockCatalog, mockPlates } from "./mock";
import { parallelumCatalog } from "./parallelum";
import type { PlateProvider, VehicleCatalog } from "./types";

/** No modo Power o catálogo vem do Power (os ids são exigidos na cotação). */
export function getCatalog(tenant: Tenant): VehicleCatalog {
  if (tenant.crm.mode === "power") return powerCatalogFor(tenant);
  return process.env.FIPE_MODE === "parallelum" ? parallelumCatalog : mockCatalog;
}

export function getPlateProvider(): PlateProvider {
  // Trocar aqui quando escolhermos o serviço pago de consulta de placa.
  return mockPlates;
}

export type * from "./types";
