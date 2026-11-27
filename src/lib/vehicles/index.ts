import { mockFipe, mockPlates } from "./mock";
import { parallelumFipe } from "./parallelum";
import type { FipeProvider, PlateProvider } from "./types";

export function getFipeProvider(): FipeProvider {
  return process.env.FIPE_MODE === "parallelum" ? parallelumFipe : mockFipe;
}

export function getPlateProvider(): PlateProvider {
  // Trocar aqui quando escolhermos o serviço pago de consulta de placa.
  return mockPlates;
}

export type * from "./types";
