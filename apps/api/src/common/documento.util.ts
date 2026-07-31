/**
 * Validação de CPF/CNPJ (dígitos verificadores).
 *
 * As funções recebem a string com ou sem máscara — só os dígitos são
 * considerados. Rejeitam também as sequências repetidas (ex.: 111.111.111-11),
 * que passam no cálculo mas nunca são documentos válidos.
 */

/** Remove tudo que não for dígito. */
export function onlyDigits(v: string): string {
  return (v ?? '').replace(/\D/g, '');
}

/** Valida um CPF (11 dígitos + dígitos verificadores). */
export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  // Rejeita sequências repetidas (00000000000, 11111111111, …)
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const calcDigit = (base: string, factorStart: number): number => {
    let sum = 0;
    let factor = factorStart;
    for (const ch of base) {
      sum += parseInt(ch, 10) * factor;
      factor -= 1;
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const d1 = calcDigit(cpf.slice(0, 9), 10);
  if (d1 !== parseInt(cpf[9], 10)) return false;
  const d2 = calcDigit(cpf.slice(0, 10), 11);
  if (d2 !== parseInt(cpf[10], 10)) return false;

  return true;
}

/** Valida um CNPJ (14 dígitos + dígitos verificadores). */
export function isValidCnpj(value: string): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const calcDigit = (base: string): number => {
    // Pesos: 5,4,3,2,9,8,7,6,5,4,3,2 (13 → começa em 6)
    let factor = base.length - 7;
    let sum = 0;
    for (const ch of base) {
      sum += parseInt(ch, 10) * factor;
      factor -= 1;
      if (factor < 2) factor = 9;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const d1 = calcDigit(cnpj.slice(0, 12));
  if (d1 !== parseInt(cnpj[12], 10)) return false;
  const d2 = calcDigit(cnpj.slice(0, 13));
  if (d2 !== parseInt(cnpj[13], 10)) return false;

  return true;
}

/**
 * Valida o documento de acordo com o tipo do cliente.
 * Se o tipo não for informado, infere pelo tamanho (11 → CPF, 14 → CNPJ).
 */
export function isValidDocumento(
  value: string,
  tipo?: 'PF' | 'PJ',
): boolean {
  const doc = onlyDigits(value);
  if (tipo === 'PF') return isValidCpf(doc);
  if (tipo === 'PJ') return isValidCnpj(doc);
  if (doc.length === 11) return isValidCpf(doc);
  if (doc.length === 14) return isValidCnpj(doc);
  return false;
}
