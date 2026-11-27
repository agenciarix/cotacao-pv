import type { VehicleType } from "../types";
import type { FipeItem, FipePrice, FipeProvider, PlateLookupResult, PlateProvider } from "./types";

interface MockModel {
  code: string;
  name: string;
  /** Ano -> valor em centavos */
  prices: Record<number, number>;
}
interface MockBrand {
  code: string;
  name: string;
  models: MockModel[];
}

const DATA: Partial<Record<VehicleType, MockBrand[]>> = {
  carro: [
    {
      code: "21",
      name: "Fiat",
      models: [
        { code: "f1", name: "Argo Drive 1.0", prices: { 2020: 5_600_000, 2022: 6_400_000, 2024: 7_500_000 } },
        { code: "f2", name: "Strada Freedom 1.3", prices: { 2021: 8_200_000, 2023: 9_400_000 } },
      ],
    },
    {
      code: "23",
      name: "Volkswagen",
      models: [
        { code: "v1", name: "Gol 1.0", prices: { 2015: 3_100_000, 2018: 3_900_000, 2022: 5_100_000 } },
        { code: "v2", name: "T-Cross 200 TSI", prices: { 2021: 10_400_000, 2024: 13_200_000 } },
      ],
    },
    {
      code: "56",
      name: "Toyota",
      models: [{ code: "t1", name: "Corolla XEi 2.0", prices: { 2019: 10_100_000, 2023: 14_300_000 } }],
    },
    {
      code: "99",
      name: "Porsche",
      models: [{ code: "p1", name: "911 Carrera", prices: { 2022: 90_000_000 } }],
    },
  ],
  moto: [
    {
      code: "80",
      name: "Honda",
      models: [
        { code: "h1", name: "CG 160 Fan", prices: { 2020: 1_350_000, 2023: 1_650_000 } },
        { code: "h2", name: "PCX 160", prices: { 2023: 1_900_000 } },
      ],
    },
  ],
  utilitario: [
    {
      code: "59",
      name: "Renault",
      models: [{ code: "r1", name: "Master Furgão 2.3", prices: { 2021: 17_500_000, 2023: 21_000_000 } }],
    },
  ],
};

function findModel(type: VehicleType, brandCode: string, modelCode: string) {
  const brand = DATA[type]?.find((b) => b.code === brandCode);
  const model = brand?.models.find((m) => m.code === modelCode);
  return brand && model ? { brand, model } : null;
}

export const mockFipe: FipeProvider = {
  async brands(type) {
    return (DATA[type] ?? []).map((b): FipeItem => ({ code: b.code, name: b.name }));
  },
  async models(type, brandCode) {
    const brand = DATA[type]?.find((b) => b.code === brandCode);
    return (brand?.models ?? []).map((m) => ({ code: m.code, name: m.name }));
  },
  async years(type, brandCode, modelCode) {
    const found = findModel(type, brandCode, modelCode);
    if (!found) return [];
    return Object.keys(found.model.prices)
      .sort((a, b) => Number(b) - Number(a))
      .map((y) => ({ code: y, name: y }));
  },
  async price(type, brandCode, modelCode, yearCode): Promise<FipePrice | null> {
    const found = findModel(type, brandCode, modelCode);
    const year = Number(yearCode);
    const value = found?.model.prices[year];
    if (!found || value === undefined) return null;
    return {
      fipeCode: `MOCK-${brandCode}-${modelCode}`,
      brand: found.brand.name,
      model: found.model.name,
      year,
      valueCents: value,
      reference: "exemplo",
    };
  },
};

const PLATES: Record<string, PlateLookupResult> = {
  ABC1D23: { found: true, type: "carro", brand: "Fiat", model: "Argo Drive 1.0", year: 2022, fipeCode: "MOCK-21-f1", fipeValueCents: 6_400_000 },
  BRA2E19: { found: true, type: "carro", brand: "Toyota", model: "Corolla XEi 2.0", year: 2023, fipeCode: "MOCK-56-t1", fipeValueCents: 14_300_000 },
  MOT0A12: { found: true, type: "moto", brand: "Honda", model: "CG 160 Fan", year: 2023, fipeCode: "MOCK-80-h1", fipeValueCents: 1_650_000 },
};

export const mockPlates: PlateProvider = {
  async lookup(plate) {
    return PLATES[plate] ?? { found: false };
  },
};
