import { describe, expect, it } from "vitest";
import { demo } from "@/tenants/demo";
import { sulminas } from "@/tenants/sulminas";
import { checkCity, checkVehicle } from "./acceptance";
import type { Vehicle } from "./types";

const car: Vehicle = { type: "carro", brand: "Fiat", model: "Argo", year: 2022, fipeValueCents: 6_400_000, usage: "particular" };

describe("checkVehicle", () => {
  it("aceita veículo dentro das regras", () => {
    expect(checkVehicle(demo.acceptance, car).accepted).toBe(true);
  });
  it("recusa marca bloqueada sem diferenciar maiúsculas", () => {
    expect(checkVehicle(demo.acceptance, { ...car, brand: "PORSCHE" }).accepted).toBe(false);
  });
  it("recusa ano abaixo do mínimo, tipo e uso não aceitos", () => {
    expect(checkVehicle(sulminas.acceptance, { ...car, year: 1998 }).accepted).toBe(false);
    expect(checkVehicle(sulminas.acceptance, { ...car, type: "utilitario" }).accepted).toBe(false);
    expect(checkVehicle(sulminas.acceptance, { ...car, usage: "taxi" }).accepted).toBe(false);
  });
  it("recusa modelo bloqueado por trecho do nome", () => {
    expect(checkVehicle(sulminas.acceptance, { ...car, model: "Argo leilao" }).accepted).toBe(false);
  });
});

describe("checkCity", () => {
  it("respeita UFs atendidas e cidades bloqueadas, ignorando acentos", () => {
    expect(checkCity(sulminas.acceptance, "Pouso Alegre", "mg").accepted).toBe(true);
    expect(checkCity(sulminas.acceptance, "Curitiba", "PR").accepted).toBe(false);
    expect(checkCity(sulminas.acceptance, "Sao Paulo", "SP").accepted).toBe(false);
    expect(checkCity(sulminas.acceptance, "Campinas", "SP").accepted).toBe(true);
  });
  it("aceita qualquer UF quando a lista está vazia", () => {
    expect(checkCity(demo.acceptance, "Manaus", "AM").accepted).toBe(true);
  });
});
