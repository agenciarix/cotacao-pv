import { describe, expect, it } from "vitest";
import { isValidCpf, isValidPhone, normalizePlate } from "./format";

describe("format", () => {
  it("normaliza placas antigas e Mercosul", () => {
    expect(normalizePlate("abc-1234")).toBe("ABC1234");
    expect(normalizePlate("BRA 2E19")).toBe("BRA2E19");
    expect(normalizePlate("12ABC34")).toBeNull();
  });
  it("valida telefone com DDD", () => {
    expect(isValidPhone("(31) 99999-0000")).toBe(true);
    expect(isValidPhone("3133283600")).toBe(true);
    expect(isValidPhone("99999-0000")).toBe(false);
  });
  it("valida CPF pelos dígitos verificadores", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("529.982.247-24")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
  });
});
