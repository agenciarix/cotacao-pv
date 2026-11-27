export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Normaliza para comparação: sem acento, minúsculas, sem espaços extras. */
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** Placa antiga (ABC1234) ou Mercosul (ABC1D23). */
export function normalizePlate(value: string): string | null {
  const plate = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(plate) ? plate : null;
}

/** Celular ou fixo brasileiro com DDD, 10 ou 11 dígitos. */
export function isValidPhone(value: string): boolean {
  const d = onlyDigits(value);
  return /^[1-9]{2}9?[0-9]{8}$/.test(d);
}

export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

export function whatsappLink(number: string, text: string): string {
  return `https://wa.me/${onlyDigits(number)}?text=${encodeURIComponent(text)}`;
}
