import type { Tenant, VehicleType } from "../types";
import type { CatalogItem, CatalogVehicle, VehicleCatalog } from "../vehicles/types";
import { powerClientFor, type PowerClient, type PowerItem } from "./client";

const TYPE: Record<VehicleType, 1 | 2 | 3> = { carro: 1, utilitario: 1, moto: 2, caminhao: 3 };

const toItems = (list: PowerItem[]): CatalogItem[] => list.map((i) => ({ code: String(i.id), name: i.text }));

function yearFromText(text: string): number {
  const m = text.match(/(19|20)\d{2}/);
  return m ? Number(m[0]) : NaN;
}

/** Catálogo do próprio Power: marca > ano > modelo, com os ids que a cotação exige. */
export function powerCatalog(client: PowerClient): VehicleCatalog {
  return {
    async brands(type) {
      return toItems(await client.brands(TYPE[type]));
    },
    async step2(_type, brand) {
      return { level: "ano", items: toItems(await client.years(brand)) };
    },
    async step3(_type, brand, year) {
      return { level: "modelo", items: toItems(await client.models(brand, year)) };
    },
    async resolve(type, brandId, yearId, modelId): Promise<CatalogVehicle | null> {
      const [brands, years, models] = await Promise.all([
        client.brands(TYPE[type]),
        client.years(brandId),
        client.models(brandId, yearId),
      ]);
      const brand = brands.find((b) => String(b.id) === brandId);
      const year = years.find((y) => String(y.id) === yearId);
      const model = models.find((m) => String(m.id) === modelId);
      if (!brand || !year || !model) return null;
      return {
        brand: brand.text,
        model: model.text,
        year: yearFromText(year.text),
        refs: { cb: brandId, mdlYr: yearId, mdl: modelId },
      };
    },
  };
}

export function powerCatalogFor(tenant: Tenant): VehicleCatalog {
  return powerCatalog(powerClientFor(tenant.crm.tokenEnv));
}
