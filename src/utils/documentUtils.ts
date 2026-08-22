/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BankAccountDetails {
  banco: string;
  conta: string;
  nib: string;
  swift?: string;
  titular: string;
}

export const DEFAULT_BANK_ACCOUNTS: BankAccountDetails[] = [
  {
    banco: 'Millennium BIM',
    conta: '9944-8833-MZ',
    nib: '0001 0000 9944 8833 01',
    swift: 'BIMOMZMA',
    titular: 'Payroll Tech MZ, Lda'
  },
  {
    banco: 'BCI Fomento',
    conta: '1122-3344-MZ',
    nib: '0008 0000 1122 3344 02',
    swift: 'BCIMMZMA',
    titular: 'Payroll Tech MZ, Lda'
  },
  {
    banco: 'Absa Bank Moçambique',
    conta: '5566-7788-MZ',
    nib: '0003 0000 5566 7788 03',
    titular: 'Payroll Tech MZ, Lda'
  }
];

export const DEFAULT_MOBILE_WALLETS = {
  mpesa: '+258 861390061',
  emola: '+258 871234567',
  mkesh: '+258 821234567'
};

/**
 * Converte um valor numérico em meticais para formato extenso em português.
 */
export function numeroParaExtenso(num: number): string {
  if (num === 0) return "Zero Meticais";
  
  const unidades = ["", "Um", "Dois", "Três", "Quatro", "Cinco", "Seis", "Sete", "Oito", "Nove"];
  const dezenas_10_19 = ["Dez", "Onze", "Doze", "Treze", "Catorze", "Quinze", "Dezasseis", "Dezassete", "Dezoito", "Dezanove"];
  const dezenas = ["", "", "Vinte", "Trinta", "Quarenta", "Cinquenta", "Sessenta", "Setenta", "Oitenta", "Noventa"];
  const centenas = ["", "Cento", "Duzentos", "Trezentos", "Quatrocentos", "Quinhentos", "Seiscentos", "Setecentos", "Oitocentos", "Novecentos"];

  function converterGrupo(n: number): string {
    if (n === 0) return "";
    let extenso = "";
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;

    if (c > 0) {
      if (c === 1 && d === 0 && u === 0) {
        extenso += "Cem";
      } else {
        extenso += centenas[c];
      }
    }

    if (d > 0) {
      if (extenso !== "") extenso += " e ";
      if (d === 1) {
        extenso += dezenas_10_19[u];
        return extenso;
      } else {
        extenso += dezenas[d];
      }
    }

    if (u > 0) {
      if (extenso !== "") extenso += " e ";
      extenso += unidades[u];
    }

    return extenso;
  }

  const inteira = Math.floor(num);
  const centavos = Math.round((num - inteira) * 100);

  let resultado = "";

  if (inteira > 0) {
    const milhoes = Math.floor(inteira / 1000000);
    const milhares = Math.floor((inteira % 1000000) / 1000);
    const unidades_fim = inteira % 1000;

    let partes: string[] = [];

    if (milhoes > 0) {
      partes.push(converterGrupo(milhoes) + (milhoes === 1 ? " Milhão" : " Milhões"));
    }
    if (milhares > 0) {
      partes.push(converterGrupo(milhares) + " Mil");
    }
    if (unidades_fim > 0) {
      partes.push(converterGrupo(unidades_fim));
    }

    resultado = partes.join(" e ") + (inteira === 1 ? " Metical" : " Meticais");
  }

  if (centavos > 0) {
    if (resultado !== "") resultado += " e ";
    resultado += converterGrupo(centavos) + (centavos === 1 ? " Centavo" : " Centavos");
  }

  return resultado;
}
