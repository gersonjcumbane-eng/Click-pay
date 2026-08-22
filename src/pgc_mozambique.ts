import { CompraItem, VendaItem, LivroCaixaItem, Employee } from './types';

export interface LinhaLancamentoPGC {
  contaCodigo: string;
  contaNome: string;
  tipo: 'DEBITO' | 'CREDITO';
  valor: number;
  descricaoDetalhada: string;
}

export interface ClassificacaoPGCResultado {
  valido: boolean;
  erros: string[];
  alertas: string[];
  totalDebito: number;
  totalCredito: number;
  equilibrado: boolean;
  linhas: LinhaLancamentoPGC[];
  resumoLancamento: {
    tipoOperacao: 'COMPRA' | 'VENDA';
    documentoRef: string;
    entidade: string;
    nuit: string;
    data: string;
    valorBase: number;
    valorIva: number;
    totalGeral: number;
  };
}

export interface PgcConta {
  codigo: string;
  nome: string;
  classe: number;
  classeNome: string;
  natureza: 'Devedora' | 'Credora' | 'Mista';
  tipo: 'Patrimonial' | 'Resultados' | 'Disponibilidades';
  descricao: string;
  regrasLancamento: string;
}

export interface PgcContaComSaldo extends PgcConta {
  debito: number;
  credito: number;
  saldoDevedor: number;
  saldoCredor: number;
  saldoLiquido: number;
}

/**
 * Função de validação e classificação contabilística automática (Débito / Crédito)
 * em estrita conformidade com as normas do PGC-NIRF de Moçambique (Decreto 70/2009)
 */
export function validarEClassificarLancamentoPGC(
  tipo: 'compra' | 'venda',
  dados: {
    fornecedor?: string;
    cliente?: string;
    nuit_fornecedor?: string;
    nuit_cliente?: string;
    nuit?: string;
    numero_factura?: string;
    data?: string;
    descricao?: string;
    categoria?: string;
    valor_base: number;
    taxa_iva: number;
    estado?: string;
    metodo_pagamento?: string;
    metodo_recebimento?: string;
  }
): ClassificacaoPGCResultado {
  const erros: string[] = [];
  const alertas: string[] = [];
  const linhas: LinhaLancamentoPGC[] = [];

  const valorBase = Number(dados.valor_base) || 0;
  const taxaIva = Number(dados.taxa_iva) || 0;
  const valorIvaCalculado = Number(((valorBase * taxaIva) / 100).toFixed(2));
  const totalGeral = Number((valorBase + valorIvaCalculado).toFixed(2));

  const entidade = (tipo === 'compra' ? dados.fornecedor : dados.cliente) || 'Consumidor / Terceiro';
  const nuit = (tipo === 'compra' ? dados.nuit_fornecedor : dados.nuit_cliente) || dados.nuit || 'Consumidor Final';
  const documentoRef = dados.numero_factura || (tipo === 'compra' ? 'FT-COMP-PROVISORIA' : 'FT-VD-PROVISORIA');
  const data = dados.data || new Date().toISOString().split('T')[0];
  const descricao = dados.descricao || (tipo === 'compra' ? 'Aquisição Operacional' : 'Faturação / Prestação de Serviços');
  const estado = dados.estado || (tipo === 'compra' ? 'Pago' : 'Cobrado');
  const metodo = (tipo === 'compra' ? dados.metodo_pagamento : dados.metodo_recebimento) || 'Transferencia_Bancaria';

  // Validações básicas de requisitos PGC e tributários
  if (valorBase <= 0) {
    erros.push('O valor base do documento deve ser estritamente superior a 0,00 MT.');
  }

  if (tipo === 'compra' && (!dados.fornecedor || dados.fornecedor.trim() === '')) {
    erros.push('O nome do fornecedor é obrigatório para a classificação do passivo/despesa no PGC (Conta 4.2).');
  }

  if (tipo === 'venda' && (!dados.cliente || dados.cliente.trim() === '')) {
    erros.push('O nome do cliente é obrigatório para a classificação do ativo/receita no PGC (Conta 4.1).');
  }

  if (taxaIva !== 0 && taxaIva !== 16) {
    alertas.push(`Taxa de IVA de ${taxaIva}% difere da taxa legal padrão de 16% em Moçambique (Art. 1 da Lei do IVA).`);
  }

  if (nuit && nuit !== 'Consumidor Final' && !/^\d{9}$/.test(nuit.replace(/\s+/g, ''))) {
    alertas.push(`NUIT "${nuit}" não possui o formato padrão de 9 dígitos da Autoridade Tributária de Moçambique.`);
  }

  if (tipo === 'compra') {
    // -------------------------------------------------------------
    // CLASSIFICAÇÃO CONTABILÍSTICA PARA COMPRAS (PGC MOÇAMBIQUE)
    // -------------------------------------------------------------
    const categoria = dados.categoria || 'Insumos';
    
    // 1. DÉBITO - Custo / Inventário
    let contaCustoCodigo = '2.1.1';
    let contaCustoNome = '2.1.1 — Mercadorias (Compras)';
    if (categoria === 'Servicos' || categoria === 'Outros') {
      contaCustoCodigo = '6.3.2';
      contaCustoNome = '6.3.2 — Fornecimentos e Serviços de Terceiros (FST)';
    } else if (categoria === 'Equipamento') {
      contaCustoCodigo = '3.2.2';
      contaCustoNome = '3.2.2 — Ativos Tangíveis - Equipamentos e Instalações';
    } else if (categoria === 'Insumos') {
      contaCustoCodigo = '2.1.2';
      contaCustoNome = '2.1.2 — Matérias-primas e Insumos Operacionais';
    }

    linhas.push({
      contaCodigo: contaCustoCodigo,
      contaNome: contaCustoNome,
      tipo: 'DEBITO',
      valor: valorBase,
      descricaoDetalhada: `Reconhecimento do custo/matéria-prima de ${descricao} (${documentoRef})`
    });

    // 2. DÉBITO - IVA Dedutível (se aplicável)
    if (valorIvaCalculado > 0) {
      linhas.push({
        contaCodigo: '4.4.3.2',
        contaNome: '4.4.3.2 — Estado: IVA Dedutível (16%)',
        tipo: 'DEBITO',
        valor: valorIvaCalculado,
        descricaoDetalhada: `Apuramento do IVA Suportado dedutível junto à AT de Moçambique`
      });
    }

    // 3. CRÉDITO - Contrapartida (Passivo ou Disponibilidades)
    if (estado === 'Pendente') {
      // A Prazo -> Fornecedores C/C
      linhas.push({
        contaCodigo: '4.2.1',
        contaNome: `4.2.1 — Fornecedores C/C (${entidade})`,
        tipo: 'CREDITO',
        valor: totalGeral,
        descricaoDetalhada: `Reconhecimento da obrigação a pagar ao fornecedor ${entidade}`
      });
    } else {
      // Pronto Pagamento -> Meios Financeiros
      if (metodo === 'Caixa') {
        linhas.push({
          contaCodigo: '1.1',
          contaNome: '1.1 — Caixa Geral (Numerário)',
          tipo: 'CREDITO',
          valor: totalGeral,
          descricaoDetalhada: `Saída de numerário para liquidação da compra ${documentoRef}`
        });
      } else {
        linhas.push({
          contaCodigo: '1.2.1',
          contaNome: '1.2.1 — Bancos e Carteiras Móveis (Millennium BIM/BCI/M-Pesa/e-Mola)',
          tipo: 'CREDITO',
          valor: totalGeral,
          descricaoDetalhada: `Saída de fundos bancários/eletrónicos para pagamento ao fornecedor ${entidade}`
        });
      }
    }
  } else {
    // -------------------------------------------------------------
    // CLASSIFICAÇÃO CONTABILÍSTICA PARA VENDAS (PGC MOÇAMBIQUE)
    // -------------------------------------------------------------
    const categoria = dados.categoria || 'Servicos';

    // 1. DÉBITO - Contrapartida (Ativo ou Disponibilidades)
    if (estado === 'Pendente') {
      // A Prazo -> Clientes C/C
      linhas.push({
        contaCodigo: '4.1.1',
        contaNome: `4.1.1 — Clientes C/C (${entidade})`,
        tipo: 'DEBITO',
        valor: totalGeral,
        descricaoDetalhada: `Reconhecimento do direito de crédito sobre o cliente ${entidade}`
      });
    } else {
      // Pronto Pagamento -> Meios Financeiros
      if (metodo === 'Caixa') {
        linhas.push({
          contaCodigo: '1.1',
          contaNome: '1.1 — Caixa Geral (Numerário)',
          tipo: 'DEBITO',
          valor: totalGeral,
          descricaoDetalhada: `Entrada de numerário proveniente da venda ${documentoRef}`
        });
      } else {
        linhas.push({
          contaCodigo: '1.2.1',
          contaNome: '1.2.1 — Bancos e Carteiras Móveis (Millennium BIM/BCI/M-Pesa/e-Mola)',
          tipo: 'DEBITO',
          valor: totalGeral,
          descricaoDetalhada: `Recebimento bancário/eletrónico da venda efetuada ao cliente ${entidade}`
        });
      }
    }

    // 2. CRÉDITO - Proveitos / Vendas
    let contaVendaCodigo = '7.1.1';
    let contaVendaNome = '7.1.1 — Vendas de Mercadorias e Produtos';
    if (categoria === 'Servicos') {
      contaVendaCodigo = '7.2';
      contaVendaNome = '7.2 — Prestação de Serviços (Proveitos Operacionais)';
    }

    linhas.push({
      contaCodigo: contaVendaCodigo,
      contaNome: contaVendaNome,
      tipo: 'CREDITO',
      valor: valorBase,
      descricaoDetalhada: `Reconhecimento da receita ilíquida de ${descricao}`
    });

    // 3. CRÉDITO - IVA Liquidado (se aplicável)
    if (valorIvaCalculado > 0) {
      linhas.push({
        contaCodigo: '4.4.3.3',
        contaNome: '4.4.3.3 — Estado: IVA Liquidado (16%)',
        tipo: 'CREDITO',
        valor: valorIvaCalculado,
        descricaoDetalhada: `Obrigação fiscal de repasse de IVA cobrado ao cliente para a AT`
      });
    }
  }

  // Cálculo e Verificação do Equilíbrio Fundamental (Partidas Dobradas)
  const totalDebito = Number(linhas.filter(l => l.tipo === 'DEBITO').reduce((a, b) => a + b.valor, 0).toFixed(2));
  const totalCredito = Number(linhas.filter(l => l.tipo === 'CREDITO').reduce((a, b) => a + b.valor, 0).toFixed(2));
  const equilibrado = Math.abs(totalDebito - totalCredito) < 0.01;

  if (!equilibrado) {
    erros.push(`Desequilíbrio de Partidas Dobradas: Total Débitos (${totalDebito.toFixed(2)} MT) difere de Total Créditos (${totalCredito.toFixed(2)} MT).`);
  }

  const valido = erros.length === 0;

  return {
    valido,
    erros,
    alertas,
    totalDebito,
    totalCredito,
    equilibrado,
    linhas,
    resumoLancamento: {
      tipoOperacao: tipo === 'compra' ? 'COMPRA' : 'VENDA',
      documentoRef,
      entidade,
      nuit,
      data,
      valorBase,
      valorIva: valorIvaCalculado,
      totalGeral
    }
  };
}

/**
 * CÓDIGO DE CONTAS OFICIAL PGC-NIRF DE MOÇAMBIQUE
 * Decreto n.º 70/2009, de 22 de Dezembro (Sistema de Contabilidade para o Sector Empresarial em Moçambique - SCE)
 */
export const PLANO_CONTAS_PGC_MOZAMBIQUE: PgcConta[] = [
  // ==========================================
  // CLASSE 1 — MEIOS FINANCEIROS
  // ==========================================
  {
    codigo: '1.1',
    nome: 'CAIXA',
    classe: 1,
    classeNome: 'Classe 1 — Meios Financeiros',
    natureza: 'Devedora',
    tipo: 'Disponibilidades',
    descricao: 'Numerário em poder da empresa, notas e moedas nacionais (Meticais) e divisas estrangeiras.',
    regrasLancamento: 'Debita-se pelas entradas em dinheiro (recebimentos, vendas a dinheiro). Credita-se pelos pagamentos efetuados em numerário.'
  },
  {
    codigo: '1.2',
    nome: 'BANCOS',
    classe: 1,
    classeNome: 'Classe 1 — Meios Financeiros',
    natureza: 'Devedora',
    tipo: 'Disponibilidades',
    descricao: 'Contas bancárias à ordem, com pré-aviso e a prazo mantidas no sistema financeiro moçambicano.',
    regrasLancamento: 'Debita-se pelos depósitos, transferências e cobranças recebidas. Credita-se por cheques emitidos, transferências e despesas bancárias.'
  },
  {
    codigo: '1.2.1',
    nome: 'Depósitos à ordem (Millennium BIM / BCI / Standard Bank / Carteiras Móveis)',
    classe: 1,
    classeNome: 'Classe 1 — Meios Financeiros',
    natureza: 'Devedora',
    tipo: 'Disponibilidades',
    descricao: 'Depósitos à ordem imediatamente disponíveis em bancos comerciais e carteiras móveis (M-Pesa / e-Mola / mKesh).',
    regrasLancamento: 'Débito: Recebimentos de clientes e vendas via banco. Crédito: Pagamentos de fornecedores, ordenados e guias fiscais.'
  },
  {
    codigo: '1.2.2',
    nome: 'Depósitos com pré-aviso',
    classe: 1,
    classeNome: 'Classe 1 — Meios Financeiros',
    natureza: 'Devedora',
    tipo: 'Disponibilidades',
    descricao: 'Depósitos bancários sujeitos a aviso prévio para mobilização.',
    regrasLancamento: 'Débito: Transferências de contas à ordem. Crédito: Mobilização de fundos.'
  },
  {
    codigo: '1.2.3',
    nome: 'Depósitos a prazo',
    classe: 1,
    classeNome: 'Classe 1 — Meios Financeiros',
    natureza: 'Devedora',
    tipo: 'Disponibilidades',
    descricao: 'Aplicações financeiras a prazo fixo geradoras de juros.',
    regrasLancamento: 'Débito: Aplicação do capital. Crédito: Resgate na maturidade.'
  },
  {
    codigo: '1.3',
    nome: 'OUTROS INSTRUMENTOS FINANCEIROS',
    classe: 1,
    classeNome: 'Classe 1 — Meios Financeiros',
    natureza: 'Devedora',
    tipo: 'Disponibilidades',
    descricao: 'Derivados, ativos detidos para negociação e outros instrumentos ao justo valor.',
    regrasLancamento: 'Débito: Aquisição ou revalorização favorável. Crédito: Alienação ou perda de valor.'
  },

  // ==========================================
  // CLASSE 2 — INVENTÁRIOS E ATIVOS BIOLÓGICOS
  // ==========================================
  {
    codigo: '2.1',
    nome: 'COMPRAS',
    classe: 2,
    classeNome: 'Classe 2 — Inventários e Ativos Biológicos',
    natureza: 'Devedora',
    tipo: 'Patrimonial',
    descricao: 'Aquisições de mercadorias, matérias-primas e materiais destinados ao consumo ou revenda.',
    regrasLancamento: 'Debita-se pelo custo de aquisição (valor base sem IVA dedutível). Credita-se por devoluções ou transferência para inventários.'
  },
  {
    codigo: '2.1.1',
    nome: 'Mercadorias',
    classe: 2,
    classeNome: 'Classe 2 — Inventários e Ativos Biológicos',
    natureza: 'Devedora',
    tipo: 'Patrimonial',
    descricao: 'Compras de bens destinados a venda direta sem transformação.',
    regrasLancamento: 'Débito: Faturas de fornecedores de mercadorias. Crédito: Transferência para conta 2.2 Mercadorias.'
  },
  {
    codigo: '2.1.2',
    nome: 'Matérias-primas, auxiliares e materiais',
    classe: 2,
    classeNome: 'Classe 2 — Inventários e Ativos Biológicos',
    natureza: 'Devedora',
    tipo: 'Patrimonial',
    descricao: 'Compras de insumos, combustíveis, lubrificantes e materiais para incorporação.',
    regrasLancamento: 'Débito: Faturas de compras de materiais e insumos industriais ou de construção.'
  },
  {
    codigo: '2.1.7',
    nome: 'Devoluções de compras',
    classe: 2,
    classeNome: 'Classe 2 — Inventários e Ativos Biológicos',
    natureza: 'Credora',
    tipo: 'Patrimonial',
    descricao: 'Devolução de compras de bens aos fornecedores.',
    regrasLancamento: 'Crédito: Notas de crédito recebidas dos fornecedores.'
  },
  {
    codigo: '2.1.8',
    nome: 'Descontos e abatimentos em compras',
    classe: 2,
    classeNome: 'Classe 2 — Inventários e Ativos Biológicos',
    natureza: 'Credora',
    tipo: 'Patrimonial',
    descricao: 'Descontos comerciais obtidos nas faturas dos fornecedores.',
    regrasLancamento: 'Crédito: Valor dos descontos comerciais obtidos fora da fatura inicial.'
  },
  {
    codigo: '2.2',
    nome: 'MERCADORIAS',
    classe: 2,
    classeNome: 'Classe 2 — Inventários e Ativos Biológicos',
    natureza: 'Devedora',
    tipo: 'Patrimonial',
    descricao: 'Existências físicas de mercadorias em armazém ou em trânsito.',
    regrasLancamento: 'Debita-se pela entrada em armazém. Credita-se pela saída para venda (CMVMC - 6.1).'
  },
  {
    codigo: '2.2.3',
    nome: 'Mercadorias em armazém',
    classe: 2,
    classeNome: 'Classe 2 — Inventários e Ativos Biológicos',
    natureza: 'Devedora',
    tipo: 'Patrimonial',
    descricao: 'Produtos armazenados disponíveis para comercialização imediata.',
    regrasLancamento: 'Débito: Stock de fecho / entradas. Crédito: Custo das mercadorias vendidas.'
  },
  {
    codigo: '2.3',
    nome: 'PRODUTOS ACABADOS E INTERMÉDIOS',
    classe: 2,
    classeNome: 'Classe 2 — Inventários e Ativos Biológicos',
    natureza: 'Devedora',
    tipo: 'Patrimonial',
    descricao: 'Bens resultantes da atividade produtiva da empresa prontos para venda.',
    regrasLancamento: 'Débito: Produção acabada ao custo de fabrico. Crédito: Saída por venda.'
  },
  {
    codigo: '2.6',
    nome: 'MATÉRIAS-PRIMAS, AUXILIARES E MATERIAIS',
    classe: 2,
    classeNome: 'Classe 2 — Inventários e Ativos Biológicos',
    natureza: 'Devedora',
    tipo: 'Patrimonial',
    descricao: 'Insumos, combustíveis, embalagens e peças em armazém.',
    regrasLancamento: 'Débito: Entrada de materiais em armazém. Crédito: Consumo na produção/obras.'
  },
  {
    codigo: '2.7',
    nome: 'ATIVOS BIOLÓGICOS',
    classe: 2,
    classeNome: 'Classe 2 — Inventários e Ativos Biológicos',
    natureza: 'Devedora',
    tipo: 'Patrimonial',
    descricao: 'Animais e plantas vivos (de produção ou consumíveis) para atividade agrícola/pecuária.',
    regrasLancamento: 'Débito: Nascimento ou aquisição de animais/plantas. Crédito: Abate ou venda.'
  },
  {
    codigo: '2.10',
    nome: 'ADIANTAMENTOS POR CONTA DE COMPRAS',
    classe: 2,
    classeNome: 'Classe 2 — Inventários e Ativos Biológicos',
    natureza: 'Devedora',
    tipo: 'Patrimonial',
    descricao: 'Entregas efetuadas previamente a fornecedores por conta de compras futuras.',
    regrasLancamento: 'Débito: Adiantamento efetuado. Crédito: Anulação aquando da receção da fatura definitiva.'
  },

  // ==========================================
  // CLASSE 3 — INVESTIMENTOS DE CAPITAL
  // ==========================================
  {
    codigo: '3.1',
    nome: 'INVESTIMENTOS FINANCEIROS',
    classe: 3,
    classeNome: 'Classe 3 — Investimentos de capital',
    natureza: 'Devedora',
    tipo: 'Patrimonial',
    descricao: 'Participações de capital em subsidiárias, associadas e títulos de longo prazo.',
    regrasLancamento: 'Débito: Subscrição ou compra de quotas/ações. Crédito: Venda da participação.'
  },
  {
    codigo: '3.2',
    nome: 'ATIVOS TANGÍVEIS',
    classe: 3,
    classeNome: 'Classe 3 — Investimentos de capital',
    natureza: 'Devedora',
    tipo: 'Patrimonial',
    descricao: 'Bens corpóreos imobilizados de uso duradouro destinados à atividade operacional.',
    regrasLancamento: 'Debita-se pelo custo de aquisição ou construção. Credita-se por abate ou alienação.'
  },
  {
    codigo: '3.2.1',
    nome: 'Construções (Edifícios industriais, administrativos e comerciais)',
    classe: 3,
    classeNome: 'Classe 3 — Investimentos de capital',
    natureza: 'Devedora',
    tipo: 'Patrimonial',
    descricao: 'Imóveis, edifícios e instalações fabris/administrativas de propriedade da empresa.',
    regrasLancamento: 'Débito: Aquisição ou conclusão de obras de construção.'
  },
  {
    codigo: '3.2.2',
    nome: 'Equipamento básico',
    classe: 3,
    classeNome: 'Classe 3 — Investimentos de capital',
    natureza: 'Devedora',
    tipo: 'Patrimonial',
    descricao: 'Máquinas, geradores e instalações técnicas fabris ou de obras.',
    regrasLancamento: 'Débito: Aquisição de maquinaria pesada e equipamentos industriais.'
  },
  {
    codigo: '3.2.3',
    nome: 'Mobiliário e equipamento administrativo social',
    classe: 3,
    classeNome: 'Classe 3 — Investimentos de capital',
    natureza: 'Devedora',
    tipo: 'Patrimonial',
    descricao: 'Móveis de escritório, secretárias, cadeiras e aparelhos de ar condicionado.',
    regrasLancamento: 'Débito: Faturas de mobiliário corporativo.'
  },
  {
    codigo: '3.2.4',
    nome: 'Equipamento de transporte',
    classe: 3,
    classeNome: 'Classe 3 — Investimentos de capital',
    natureza: 'Devedora',
    tipo: 'Patrimonial',
    descricao: 'Viaturas ligeiras de passageiros, camiões de carga, carrinhas e tratores.',
    regrasLancamento: 'Débito: Compra de veículos automóveis corporativos.'
  },
  {
    codigo: '3.2.6',
    nome: 'Ferramentas e utensílios',
    classe: 3,
    classeNome: 'Classe 3 — Investimentos de capital',
    natureza: 'Devedora',
    tipo: 'Patrimonial',
    descricao: 'Ferramentas de oficina e aparelhos de precisão de longa duração.',
    regrasLancamento: 'Débito: Aquisição de equipamentos manuais e ferramentas mecânicas.'
  },
  {
    codigo: '3.3',
    nome: 'ATIVOS INTANGÍVEIS',
    classe: 3,
    classeNome: 'Classe 3 — Investimentos de capital',
    natureza: 'Devedora',
    tipo: 'Patrimonial',
    descricao: 'Bens incorpóreos tais como marcas, patentes, software e direitos de exploração.',
    regrasLancamento: 'Débito: Aquisição de programas de computador (ERP), licenças e patentes.'
  },
  {
    codigo: '3.3.5',
    nome: 'Programas de computador (Software ERP)',
    classe: 3,
    classeNome: 'Classe 3 — Investimentos de capital',
    natureza: 'Devedora',
    tipo: 'Patrimonial',
    descricao: 'Sistemas informáticos de gestão, software de contabilidade e licenças corporativas.',
    regrasLancamento: 'Débito: Licenciamento do software Payroll Tech MZ ERP Cloud.'
  },
  {
    codigo: '3.8',
    nome: 'AMORTIZAÇÕES ACUMULADAS',
    classe: 3,
    classeNome: 'Classe 3 — Investimentos de capital',
    natureza: 'Credora',
    tipo: 'Patrimonial',
    descricao: 'Depreciações e amortizações acumuladas do imobilizado tangível e intangível.',
    regrasLancamento: 'Credita-se pela quota anual de depreciação. Debita-se pelo abate do bem.'
  },

  // ==========================================
  // CLASSE 4 — CONTAS A RECEBER, CONTAS A PAGAR, ACRÉSCIMOS E DIFERIMENTOS
  // ==========================================
  {
    codigo: '4.1',
    nome: 'CLIENTES',
    classe: 4,
    classeNome: 'Classe 4 — Contas a receber, contas a pagar, acréscimos e diferimentos',
    natureza: 'Devedora',
    tipo: 'Patrimonial',
    descricao: 'Direitos de crédito sobre clientes resultantes da venda de bens ou prestação de serviços.',
    regrasLancamento: 'Debita-se pelas faturas emitidas. Credita-se pelos recebimentos ou notas de crédito.'
  },
  {
    codigo: '4.1.1',
    nome: 'Clientes c/c (Conta Corrente)',
    classe: 4,
    classeNome: 'Classe 4 — Contas a receber, contas a pagar, acréscimos e diferimentos',
    natureza: 'Devedora',
    tipo: 'Patrimonial',
    descricao: 'Saldos em aberto faturados a clientes pendentes de pagamento.',
    regrasLancamento: 'Débito: Emissão da Fatura com IVA. Crédito: Liquidação por transferência bancária ou M-Pesa.'
  },
  {
    codigo: '4.1.9',
    nome: 'Adiantamentos de clientes',
    classe: 4,
    classeNome: 'Classe 4 — Contas a receber, contas a pagar, acréscimos e diferimentos',
    natureza: 'Credora',
    tipo: 'Patrimonial',
    descricao: 'Valores recebidos antecipadamente de clientes por conta de serviços ou mercadorias futuras.',
    regrasLancamento: 'Crédito: Recebimento do sinal do cliente. Débito: Emissão da fatura definitiva.'
  },
  {
    codigo: '4.2',
    nome: 'FORNECEDORES',
    classe: 4,
    classeNome: 'Classe 4 — Contas a receber, contas a pagar, acréscimos e diferimentos',
    natureza: 'Credora',
    tipo: 'Patrimonial',
    descricao: 'Dívidas e obrigações a pagar a fornecedores por compras e serviços prestados.',
    regrasLancamento: 'Credita-se pelas faturas recebidas. Debita-se pelos pagamentos efetuados.'
  },
  {
    codigo: '4.2.1',
    nome: 'Fornecedores c/c (Conta Corrente)',
    classe: 4,
    classeNome: 'Classe 4 — Contas a receber, contas a pagar, acréscimos e diferimentos',
    natureza: 'Credora',
    tipo: 'Patrimonial',
    descricao: 'Saldos devedores a fornecedores por faturas comerciais pendentes de liquidação.',
    regrasLancamento: 'Crédito: Entrada da fatura do fornecedor com IVA. Débito: Pagamento por banco ou dinheiro.'
  },
  {
    codigo: '4.2.9',
    nome: 'Adiantamentos a fornecedores',
    classe: 4,
    classeNome: 'Classe 4 — Contas a receber, contas a pagar, acréscimos e diferimentos',
    natureza: 'Devedora',
    tipo: 'Patrimonial',
    descricao: 'Adiantamentos financeiros concedidos a fornecedores.',
    regrasLancamento: 'Débito: Transferência de sinal. Crédito: Liquidação na fatura do fornecedor.'
  },
  {
    codigo: '4.3',
    nome: 'EMPRÉSTIMOS OBTIDOS',
    classe: 4,
    classeNome: 'Classe 4 — Contas a receber, contas a pagar, acréscimos e diferimentos',
    natureza: 'Credora',
    tipo: 'Patrimonial',
    descricao: 'Financiamentos bancários, descobertos e empréstimos obtidos.',
    regrasLancamento: 'Crédito: Concessão do empréstimo bancário. Débito: Amortização do capital.'
  },
  {
    codigo: '4.3.1',
    nome: 'Empréstimos bancários (Curto / Médio e Longo Prazo)',
    classe: 4,
    classeNome: 'Classe 4 — Contas a receber, contas a pagar, acréscimos e diferimentos',
    natureza: 'Credora',
    tipo: 'Patrimonial',
    descricao: 'Créditos concedidos por bancos comerciais em Moçambique.',
    regrasLancamento: 'Crédito: Entrada do capital no banco. Débito: Pagamento de prestações.'
  },
  {
    codigo: '4.4',
    nome: 'ESTADO',
    classe: 4,
    classeNome: 'Classe 4 — Contas a receber, contas a pagar, acréscimos e diferimentos',
    natureza: 'Mista',
    tipo: 'Patrimonial',
    descricao: 'Relações fiscais e obrigações tributárias com a Autoridade Tributária (AT) de Moçambique.',
    regrasLancamento: 'Sintetiza subcontas de IRPC, IRPS, IVA, INSS e impostos autárquicos.'
  },
  {
    codigo: '4.4.1',
    nome: 'Imposto sobre o rendimento (IRPC - 32%)',
    classe: 4,
    classeNome: 'Classe 4 — Contas a receber, contas a pagar, acréscimos e diferimentos',
    natureza: 'Credora',
    tipo: 'Patrimonial',
    descricao: 'Apuramento do Imposto sobre o Rendimento de Pessoas Colectivas (Decreto 34/2013).',
    regrasLancamento: 'Crédito: Estimativa do IRPC do período. Débito: Pagamentos por conta e liquidação anual.'
  },
  {
    codigo: '4.4.1.1',
    nome: 'Estimativa de imposto (IRPC)',
    classe: 4,
    classeNome: 'Classe 4 — Contas a receber, contas a pagar, acréscimos e diferimentos',
    natureza: 'Credora',
    tipo: 'Patrimonial',
    descricao: 'Apuramento da estimativa de imposto a pagar ao Estado sobre os lucros tributáveis.',
    regrasLancamento: 'Crédito: Apuramento em contrapartida da conta 8.5 Imposto sobre o Rendimento.'
  },
  {
    codigo: '4.4.2',
    nome: 'Impostos retidos na fonte (IRPS / IRPC)',
    classe: 4,
    classeNome: 'Classe 4 — Contas a receber, contas a pagar, acréscimos e diferimentos',
    natureza: 'Credora',
    tipo: 'Patrimonial',
    descricao: 'Retenções na fonte efetuadas na folha salarial ou a prestadores de serviços.',
    regrasLancamento: 'Credita-se pela retenção no pagamento. Debita-se pela entrega da Guia M/20 na AT.'
  },
  {
    codigo: '4.4.2.1',
    nome: 'Rendimentos do trabalho dependente (IRPS Trabalho - Lei 13/2023)',
    classe: 4,
    classeNome: 'Classe 4 — Contas a receber, contas a pagar, acréscimos e diferimentos',
    natureza: 'Credora',
    tipo: 'Patrimonial',
    descricao: 'IRPS retido na fonte aos trabalhadores na folha mensal de salários a entregar à AT até ao dia 20.',
    regrasLancamento: 'Crédito: Retenção no processamento do mapa de salários. Débito: Liquidação da Guia M/20 no banco.'
  },
  {
    codigo: '4.4.2.2',
    nome: 'Rendimentos profissionais (Retenções a consultores / terceiros)',
    classe: 4,
    classeNome: 'Classe 4 — Contas a receber, contas a pagar, acréscimos e diferimentos',
    natureza: 'Credora',
    tipo: 'Patrimonial',
    descricao: 'Retenção na fonte a trabalhadores independentes e prestadores de serviços sem fatura formal.',
    regrasLancamento: 'Crédito: Retenção no pagamento de honorários. Débito: Pagamento na repartição de finanças.'
  },
  {
    codigo: '4.4.3',
    nome: 'Imposto sobre o valor acrescentado (IVA 16%)',
    classe: 4,
    classeNome: 'Classe 4 — Contas a receber, contas a pagar, acréscimos e diferimentos',
    natureza: 'Mista',
    tipo: 'Patrimonial',
    descricao: 'Operações de IVA suportado, dedutível, liquidado e apuramento mensal (Declaração M/01).',
    regrasLancamento: 'Registo de débitos (suportado/dedutível) e créditos (liquidado) do imposto.'
  },
  {
    codigo: '4.4.3.1',
    nome: 'IVA suportado em compras',
    classe: 4,
    classeNome: 'Classe 4 — Contas a receber, contas a pagar, acréscimos e diferimentos',
    natureza: 'Devedora',
    tipo: 'Patrimonial',
    descricao: 'IVA de 16% pago aos fornecedores nas compras de bens e serviços.',
    regrasLancamento: 'Débito: Destaque do IVA em faturas de fornecedores com NUIT.'
  },
  {
    codigo: '4.4.3.2',
    nome: 'IVA dedutível',
    classe: 4,
    classeNome: 'Classe 4 — Contas a receber, contas a pagar, acréscimos e diferimentos',
    natureza: 'Devedora',
    tipo: 'Patrimonial',
    descricao: 'Parcela de IVA suportado legally passível de dedução na declaração M/01.',
    regrasLancamento: 'Débito: IVA dedutível do mês.'
  },
  {
    codigo: '4.4.3.3',
    nome: 'IVA liquidado em vendas e serviços',
    classe: 4,
    classeNome: 'Classe 4 — Contas a receber, contas a pagar, acréscimos e diferimentos',
    natureza: 'Credora',
    tipo: 'Patrimonial',
    descricao: 'IVA de 16% cobrado aos clientes nas faturas de vendas e serviços.',
    regrasLancamento: 'Crédito: IVA faturado nas vendas e serviços.'
  },
  {
    codigo: '4.4.3.4',
    nome: 'IVA a pagar',
    classe: 4,
    classeNome: 'Classe 4 — Contas a receber, contas a pagar, acréscimos e diferimentos',
    natureza: 'Credora',
    tipo: 'Patrimonial',
    descricao: 'Saldo devedor ao Estado quando IVA Liquidado é superior ao IVA Dedutível.',
    regrasLancamento: 'Crédito: Transferência de apuramento mensal de IVA. Débito: Pagamento da guia à AT.'
  },
  {
    codigo: '4.4.3.5',
    nome: 'IVA a recuperar / transportar',
    classe: 4,
    classeNome: 'Classe 4 — Contas a receber, contas a pagar, acréscimos e diferimentos',
    natureza: 'Devedora',
    tipo: 'Patrimonial',
    descricao: 'Crédito do contribuinte a transportar para o mês seguinte quando IVA Dedutível excede IVA Liquidado.',
    regrasLancamento: 'Débito: Saldo credor de IVA a recuperar do mês.'
  },
  {
    codigo: '4.4.9',
    nome: 'Outros impostos (INSS / ISPC / Autárquicos)',
    classe: 4,
    classeNome: 'Classe 4 — Contas a receber, contas a pagar, acréscimos e diferimentos',
    natureza: 'Credora',
    tipo: 'Patrimonial',
    descricao: 'Obrigações de Segurança Social (INSS), ISPC (3%) e taxas municipais.',
    regrasLancamento: 'Credita-se pelo valor devido. Debita-se pelo pagamento da guia.'
  },
  {
    codigo: '4.4.9.1',
    nome: 'INSS - Instituto Nacional de Segurança Social (3% Trabalhador + 4% Empresa = 7%)',
    classe: 4,
    classeNome: 'Classe 4 — Contas a receber, contas a pagar, acréscimos e diferimentos',
    natureza: 'Credora',
    tipo: 'Patrimonial',
    descricao: 'Contribuições obrigatórias de Segurança Social apuradas no mapa mensal SISSMO a pagar até dia 15.',
    regrasLancamento: 'Crédito: Lançamento do mapa salarial (3% retido + 4% encargo patronal). Débito: Pagamento da guia SISSMO.'
  },
  {
    codigo: '4.5',
    nome: 'OUTROS DEVEDORES E CREDORES',
    classe: 4,
    classeNome: 'Classe 4 — Contas a receber, contas a pagar, acréscimos e diferimentos',
    natureza: 'Mista',
    tipo: 'Patrimonial',
    descricao: 'Contas com o pessoal, órgãos sociais, sócios e devedores/credores diversos.',
    regrasLancamento: 'Agrupa adiantamentos e salários a pagar ao pessoal e transações com sócios.'
  },
  {
    codigo: '4.5.2',
    nome: 'Pessoal',
    classe: 4,
    classeNome: 'Classe 4 — Contas a receber, contas a pagar, acréscimos e diferimentos',
    natureza: 'Credora',
    tipo: 'Patrimonial',
    descricao: 'Obrigações salariais e adiantamentos com o quadro de pessoal da empresa.',
    regrasLancamento: 'Subcontas para salários líquidos a pagar e vales concedidos.'
  },
  {
    codigo: '4.5.2.1',
    nome: 'Remunerações a pagar aos trabalhadores (Salários Líquidos)',
    classe: 4,
    classeNome: 'Classe 4 — Contas a receber, contas a pagar, acréscimos e diferimentos',
    natureza: 'Credora',
    tipo: 'Patrimonial',
    descricao: 'Montante líquido líquido que a empresa deve aos trabalhadores após deduções legais de IRPS e INSS.',
    regrasLancamento: 'Crédito: Processamento do mapa mensal de vencimentos. Débito: Transferência dos salários no banco.'
  },
  {
    codigo: '4.5.2.2',
    nome: 'Adiantamentos e Vales ao Pessoal',
    classe: 4,
    classeNome: 'Classe 4 — Contas a receber, contas a pagar, acréscimos e diferimentos',
    natureza: 'Devedora',
    tipo: 'Patrimonial',
    descricao: 'Vales e adiantamentos de salário concedidos aos trabalhadores antes da data habitual de pagamento.',
    regrasLancamento: 'Débito: Concessão do vale via M-Pesa ou banco. Crédito: Desconto efetuado no fecho do mês.'
  },

  // ==========================================
  // CLASSE 5 — CAPITAL PRÓPRIO E RESERVAS
  // ==========================================
  {
    codigo: '5.1',
    nome: 'CAPITAL',
    classe: 5,
    classeNome: 'Classe 5 — Capital próprio e reservas',
    natureza: 'Credora',
    tipo: 'Patrimonial',
    descricao: 'Capital social subscrito e realizado pelos sócios constante do Boletim da República (BR).',
    regrasLancamento: 'Credita-se pela constituição da sociedade ou aumento de capital registado.'
  },
  {
    codigo: '5.4',
    nome: 'RESERVAS',
    classe: 5,
    classeNome: 'Classe 5 — Capital próprio e reservas',
    natureza: 'Credora',
    tipo: 'Patrimonial',
    descricao: 'Reservas legais, estatutárias e livres constituídas por lucros retidos.',
    regrasLancamento: 'Crédito: Aplicação de lucros de exercícios anteriores.'
  },
  {
    codigo: '5.5',
    nome: 'RESULTADOS TRANSITADOS',
    classe: 5,
    classeNome: 'Classe 5 — Capital próprio e reservas',
    natureza: 'Mista',
    tipo: 'Patrimonial',
    descricao: 'Lucros ou prejuízos acumulados de exercícios anteriores pendentes de aplicação.',
    regrasLancamento: 'Crédito: Lucros de anos anteriores. Débito: Prejuízos ou distribuição de dividendos.'
  },
  {
    codigo: '5.9',
    nome: 'RESULTADO LÍQUIDO DO PERÍODO',
    classe: 5,
    classeNome: 'Classe 5 — Capital próprio e reservas',
    natureza: 'Mista',
    tipo: 'Patrimonial',
    descricao: 'Resultado apurado no exercício corrente (Lucro Líquido ou Prejuízo).',
    regrasLancamento: 'Saldo final resultante da transferência do saldo da conta 8.8.'
  },

  // ==========================================
  // CLASSE 6 — GASTOS E PERDAS
  // ==========================================
  {
    codigo: '6.1',
    nome: 'CUSTO DOS INVENTÁRIOS',
    classe: 6,
    classeNome: 'Classe 6 — Gastos e perdas',
    natureza: 'Devedora',
    tipo: 'Resultados',
    descricao: 'Custo das mercadorias vendidas e das matérias-primas e insumos consumidos na atividade.',
    regrasLancamento: 'Debita-se pelo valor das saídas de stock para venda ou consumo produtivo.'
  },
  {
    codigo: '6.1.1',
    nome: 'Custo dos inventários vendidos ou consumidos (CMVMC)',
    classe: 6,
    classeNome: 'Classe 6 — Gastos e perdas',
    natureza: 'Devedora',
    tipo: 'Resultados',
    descricao: 'Custo direto das mercadorias e materiais que originaram as receitas do período.',
    regrasLancamento: 'Débito: Saída de armazém ao custo histórico de aquisição.'
  },
  {
    codigo: '6.1.1.2',
    nome: 'De mercadorias',
    classe: 6,
    classeNome: 'Classe 6 — Gastos e perdas',
    natureza: 'Devedora',
    tipo: 'Resultados',
    descricao: 'Custo de aquisição de mercadorias revendidas aos clientes.',
    regrasLancamento: 'Débito: Registo do Custo das Mercadorias Vendidas.'
  },
  {
    codigo: '6.2',
    nome: 'GASTOS COM O PESSOAL',
    classe: 6,
    classeNome: 'Classe 6 — Gastos e perdas',
    natureza: 'Devedora',
    tipo: 'Resultados',
    descricao: 'Remunerações ilíquidas dos órgãos sociais e trabalhadores, encargos patronais de INSS e seguros.',
    regrasLancamento: 'Debita-se mensalmente pelo valor bruto da folha salarial e encargos da empresa.'
  },
  {
    codigo: '6.2.1',
    nome: 'Remunerações dos órgãos sociais',
    classe: 6,
    classeNome: 'Classe 6 — Gastos e perdas',
    natureza: 'Devedora',
    tipo: 'Resultados',
    descricao: 'Honorários e salários dos administradores e gerentes da sociedade.',
    regrasLancamento: 'Débito pelo valor ilíquido das remunerações dos gerentes.'
  },
  {
    codigo: '6.2.2',
    nome: 'Remunerações dos trabalhadores (Salários Brutos)',
    classe: 6,
    classeNome: 'Classe 6 — Gastos e perdas',
    natureza: 'Devedora',
    tipo: 'Resultados',
    descricao: 'Vencimentos base, horas extras, subsídios e bónus ilíquidos dos empregados.',
    regrasLancamento: 'Débito: Total dos salários brutos no mapa de processamento mensal.'
  },
  {
    codigo: '6.2.3',
    nome: 'Encargos sobre remunerações (INSS Patronal 4%)',
    classe: 6,
    classeNome: 'Classe 6 — Gastos e perdas',
    natureza: 'Devedora',
    tipo: 'Resultados',
    descricao: 'Contribuição obrigatória de 4% a cargo da entidade patronal para o INSS.',
    regrasLancamento: 'Débito: 4% sobre a massa salarial bruta contra crédito em 4.4.9.1 INSS.'
  },
  {
    codigo: '6.2.7',
    nome: 'Seguros de acidentes no trabalho e doenças profissionais (SISSMO)',
    classe: 6,
    classeNome: 'Classe 6 — Gastos e perdas',
    natureza: 'Devedora',
    tipo: 'Resultados',
    descricao: 'Prémio do seguro de acidentes de trabalho obrigatório por lei em Moçambique.',
    regrasLancamento: 'Débito: Faturas de seguradoras da apólice de acidentes de trabalho.'
  },
  {
    codigo: '6.3',
    nome: 'FORNECIMENTOS E SERVIÇOS DE TERCEIROS (FST)',
    classe: 6,
    classeNome: 'Classe 6 — Gastos e perdas',
    natureza: 'Devedora',
    tipo: 'Resultados',
    descricao: 'Gastos operacionais com energia, água, combustíveis, rendas, comunicações e honorários.',
    regrasLancamento: 'Debita-se pelo valor base (sem IVA) das faturas de serviços consumidos.'
  },
  {
    codigo: '6.3.2.1.1',
    nome: 'Água (FIPAG / Fornecedores Locais)',
    classe: 6,
    classeNome: 'Classe 6 — Gastos e perdas',
    natureza: 'Devedora',
    tipo: 'Resultados',
    descricao: 'Consumos de água potável para uso nas instalações da empresa.',
    regrasLancamento: 'Débito: Faturas de água.'
  },
  {
    codigo: '6.3.2.1.2',
    nome: 'Electricidade (EDM Credelec / Contrato)',
    classe: 6,
    classeNome: 'Classe 6 — Gastos e perdas',
    natureza: 'Devedora',
    tipo: 'Resultados',
    descricao: 'Energia elétrica fornecida pela Electricidade de Moçambique (EDM).',
    regrasLancamento: 'Débito: Recibos Credelec ou faturas de energia elétrica.'
  },
  {
    codigo: '6.3.2.1.3',
    nome: 'Combustíveis (Gasóleo / Gasolina / Lubrificantes)',
    classe: 6,
    classeNome: 'Classe 6 — Gastos e perdas',
    natureza: 'Devedora',
    tipo: 'Resultados',
    descricao: 'Abastecimento de viaturas de serviço e geradores de emergência.',
    regrasLancamento: 'Débito: Talões e faturas de abastecimento de combustível.'
  },
  {
    codigo: '6.3.2.2.4',
    nome: 'Comunicações (Vodacom / Tmcel / Movitel / Fibra)',
    classe: 6,
    classeNome: 'Classe 6 — Gastos e perdas',
    natureza: 'Devedora',
    tipo: 'Resultados',
    descricao: 'Serviços de internet de banda larga, telefonia móvel corporativa e comunicações.',
    regrasLancamento: 'Débito: Faturas de operadoras de telecomunicações.'
  },
  {
    codigo: '6.3.2.2.5',
    nome: 'Honorários (Contabilidade, Advocacia e Auditoria)',
    classe: 6,
    classeNome: 'Classe 6 — Gastos e perdas',
    natureza: 'Devedora',
    tipo: 'Resultados',
    descricao: 'Serviços profissionais prestados por contabilistas certificados OCAM, advogados e auditores.',
    regrasLancamento: 'Débito: Faturas de honorários profissionais de terceiros.'
  },
  {
    codigo: '6.3.2.3.2',
    nome: 'Rendas e alugueres (Instalações corporativas e equipamentos)',
    classe: 6,
    classeNome: 'Classe 6 — Gastos e perdas',
    natureza: 'Devedora',
    tipo: 'Resultados',
    descricao: 'Arrendamento mensal do imóvel das instalações administrativas ou industriais.',
    regrasLancamento: 'Débito: Recibos/faturas de renda do imóvel corporativo.'
  },
  {
    codigo: '6.5',
    nome: 'AMORTIZAÇÕES DO PERÍODO',
    classe: 6,
    classeNome: 'Classe 6 — Gastos e perdas',
    natureza: 'Devedora',
    tipo: 'Resultados',
    descricao: 'Depreciação e amortização anual de ativos tangíveis e intangíveis.',
    regrasLancamento: 'Débito: Quota de amortização do exercício (Decreto 28/2014).'
  },
  {
    codigo: '6.8',
    nome: 'OUTROS GASTOS E PERDAS OPERACIONAIS',
    classe: 6,
    classeNome: 'Classe 6 — Gastos e perdas',
    natureza: 'Devedora',
    tipo: 'Resultados',
    descricao: 'Impostos autárquicos, imposto de selo, taxas aduaneiras e donativos.',
    regrasLancamento: 'Débito: Guias de impostos autárquicos e despesas operacionais diversas.'
  },
  {
    codigo: '6.9',
    nome: 'GASTOS E PERDAS FINANCEIROS',
    classe: 6,
    classeNome: 'Classe 6 — Gastos e perdas',
    natureza: 'Devedora',
    tipo: 'Resultados',
    descricao: 'Juros de empréstimos, comissões bancárias e diferenças de câmbio desfavoráveis.',
    regrasLancamento: 'Débito: Comissões bancárias de conta e juros suportados.'
  },

  // ==========================================
  // CLASSE 7 — RENDIMENTOS E GANHOS
  // ==========================================
  {
    codigo: '7.1',
    nome: 'VENDAS',
    classe: 7,
    classeNome: 'Classe 7 — Rendimentos e ganhos',
    natureza: 'Credora',
    tipo: 'Resultados',
    descricao: 'Receita proveniente da venda de mercadorias e produtos acabados no mercado.',
    regrasLancamento: 'Credita-se pelo valor base (sem IVA) das faturas emitidas aos clientes.'
  },
  {
    codigo: '7.1.1',
    nome: 'Mercadorias',
    classe: 7,
    classeNome: 'Classe 7 — Rendimentos e ganhos',
    natureza: 'Credora',
    tipo: 'Resultados',
    descricao: 'Faturação de vendas de mercadorias no mercado nacional.',
    regrasLancamento: 'Crédito: Preço de venda base das faturas emitidas.'
  },
  {
    codigo: '7.2',
    nome: 'PRESTAÇÃO DE SERVIÇOS',
    classe: 7,
    classeNome: 'Classe 7 — Rendimentos e ganhos',
    natureza: 'Credora',
    tipo: 'Resultados',
    descricao: 'Receita gerada pela prestação de serviços, empreitadas e consultorias técnicas.',
    regrasLancamento: 'Credita-se pelo valor base faturado pelas prestações de serviços.'
  },
  {
    codigo: '7.6',
    nome: 'OUTROS RENDIMENTOS E GANHOS OPERACIONAIS',
    classe: 7,
    classeNome: 'Classe 7 — Rendimentos e ganhos',
    natureza: 'Credora',
    tipo: 'Resultados',
    descricao: 'Subsídios à exploração, ganhos em inventários e receitas suplementares.',
    regrasLancamento: 'Crédito: Recebimento de subsídios ou rendimentos diversos.'
  },
  {
    codigo: '7.8',
    nome: 'RENDIMENTOS E GANHOS FINANCEIROS',
    classe: 7,
    classeNome: 'Classe 7 — Rendimentos e ganhos',
    natureza: 'Credora',
    tipo: 'Resultados',
    descricao: 'Juros de depósitos bancários, diferenças de câmbio favoráveis e descontos obtidos.',
    regrasLancamento: 'Crédito: Juros creditados na conta bancária pela instituição financeira.'
  },

  // ==========================================
  // CLASSE 8 — RESULTADOS
  // ==========================================
  {
    codigo: '8.1',
    nome: 'RESULTADOS OPERACIONAIS',
    classe: 8,
    classeNome: 'Classe 8 — Resultados',
    natureza: 'Mista',
    tipo: 'Resultados',
    descricao: 'Diferença entre Rendimentos Operacionais (Classe 7) e Gastos Operacionais (Classe 6).',
    regrasLancamento: 'Apuramento do lucro operacional bruto do exercício.'
  },
  {
    codigo: '8.2',
    nome: 'RESULTADOS FINANCEIROS',
    classe: 8,
    classeNome: 'Classe 8 — Resultados',
    natureza: 'Mista',
    tipo: 'Resultados',
    descricao: 'Resultado apurado entre rendimentos financeiros (7.8) e gastos financeiros (6.9).',
    regrasLancamento: 'Apuramento do saldo financeiro.'
  },
  {
    codigo: '8.3',
    nome: 'RESULTADOS CORRENTES',
    classe: 8,
    classeNome: 'Classe 8 — Resultados',
    natureza: 'Mista',
    tipo: 'Resultados',
    descricao: 'Resultado das atividades correntes antes de impostos (Lucro Contabilístico / RAI).',
    regrasLancamento: 'Soma dos resultados operacionais e financeiros.'
  },
  {
    codigo: '8.5',
    nome: 'IMPOSTO SOBRE O RENDIMENTO (IRPC 32%)',
    classe: 8,
    classeNome: 'Classe 8 — Resultados',
    natureza: 'Devedora',
    tipo: 'Resultados',
    descricao: 'Montante do imposto sobre o rendimento (IRPC) apurado sobre o lucro tributável.',
    regrasLancamento: 'Débito: Estimativa do imposto contra crédito na conta 4.4.1.1 Estimativa de Imposto.'
  },
  {
    codigo: '8.8',
    nome: 'RESULTADO LÍQUIDO DO PERÍODO',
    classe: 8,
    classeNome: 'Classe 8 — Resultados',
    natureza: 'Mista',
    tipo: 'Resultados',
    descricao: 'Lucro Líquido final do exercício após deduções do IRPC a transferir para o Capital Próprio (5.9).',
    regrasLancamento: 'Saldo final definitivo das operações da empresa no período.'
  }
];

export function getPlanoContasComSaldos(
  compras: CompraItem[],
  vendas: VendaItem[],
  caixa: LivroCaixaItem[],
  funcionarios: Employee[]
): PgcContaComSaldo[] {
  // Aggregate real operational totals
  const totalEntradasCaixa = caixa.filter(c => c.tipo === 'Entrada').reduce((a, b) => a + b.valor, 0);
  const totalSaidasCaixa = caixa.filter(c => c.tipo === 'Saida').reduce((a, b) => a + b.valor, 0);

  const totalVendasBase = vendas.filter(v => v.estado !== 'Anulado').reduce((a, b) => a + b.valor_base, 0);
  const totalIvaVendas = vendas.filter(v => v.estado !== 'Anulado').reduce((a, b) => a + b.valor_iva, 0);
  const totalVendasCobrado = vendas.filter(v => v.estado === 'Cobrado').reduce((a, b) => a + b.total_com_iva, 0);
  const totalVendasPendente = vendas.filter(v => v.estado === 'Pendente').reduce((a, b) => a + b.total_com_iva, 0);

  const totalComprasBase = compras.filter(c => c.estado !== 'Cancelado').reduce((a, b) => a + b.valor_base, 0);
  const totalIvaCompras = compras.filter(c => c.estado !== 'Cancelado').reduce((a, b) => a + b.valor_iva, 0);
  const totalComprasPago = compras.filter(c => c.estado === 'Pago').reduce((a, b) => a + b.total_com_iva, 0);
  const totalComprasPendente = compras.filter(c => c.estado === 'Pendente').reduce((a, b) => a + b.total_com_iva, 0);

  const totalSalariosBrutos = funcionarios.reduce((a, b) => a + b.salario_base, 0);
  const totalInssPatronal = totalSalariosBrutos * 0.04;
  const totalInssTrabalhador = totalSalariosBrutos * 0.03;
  const totalInssTotal = totalInssPatronal + totalInssTrabalhador;
  const totalIrpsTrabalho = totalSalariosBrutos * 0.05; // Estimativa de IRPS em retenção

  return PLANO_CONTAS_PGC_MOZAMBIQUE.map(conta => {
    let debito = 0;
    let credito = 0;

    switch (conta.codigo) {
      case '1.1':
        debito = totalEntradasCaixa * 0.2;
        credito = totalSaidasCaixa * 0.2;
        break;
      case '1.2':
      case '1.2.1':
        debito = totalEntradasCaixa * 0.8;
        credito = totalSaidasCaixa * 0.8;
        break;
      case '2.1':
      case '2.1.1':
        debito = totalComprasBase;
        credito = 0;
        break;
      case '2.2':
      case '2.2.3':
        debito = totalComprasBase;
        credito = 0;
        break;
      case '3.2':
      case '3.2.2':
      case '3.2.3':
      case '3.2.4':
        debito = 150000;
        credito = 0;
        break;
      case '3.3.5':
        debito = 25000;
        credito = 0;
        break;
      case '4.1':
      case '4.1.1':
        debito = totalVendasBase + totalIvaVendas;
        credito = totalVendasCobrado;
        break;
      case '4.2':
      case '4.2.1':
        debito = totalComprasPago;
        credito = totalComprasBase + totalIvaCompras;
        break;
      case '4.4.1':
      case '4.4.1.1':
        const lucroEstimado = Math.max(0, totalVendasBase - (totalComprasBase + totalSalariosBrutos + totalInssPatronal));
        credito = lucroEstimado * 0.32;
        break;
      case '4.4.2':
      case '4.4.2.1':
        credito = totalIrpsTrabalho;
        break;
      case '4.4.3':
      case '4.4.3.4':
        debito = totalIvaCompras;
        credito = totalIvaVendas;
        break;
      case '4.4.3.1':
      case '4.4.3.2':
        debito = totalIvaCompras;
        break;
      case '4.4.3.3':
        credito = totalIvaVendas;
        break;
      case '4.4.9':
      case '4.4.9.1':
        credito = totalInssTotal;
        break;
      case '4.5.2':
      case '4.5.2.1':
        credito = totalSalariosBrutos - totalInssTrabalhador - totalIrpsTrabalho;
        break;
      case '5.1':
        credito = 100000;
        break;
      case '6.1':
      case '6.1.1':
      case '6.1.1.2':
        debito = totalComprasBase;
        break;
      case '6.2':
      case '6.2.2':
        debito = totalSalariosBrutos;
        break;
      case '6.2.3':
        debito = totalInssPatronal;
        break;
      case '6.3':
      case '6.3.2.1.2':
      case '6.3.2.2.4':
      case '6.3.2.3.2':
        debito = totalComprasBase > 0 ? totalComprasBase * 0.3 : 15000;
        break;
      case '7.1':
      case '7.1.1':
      case '7.2':
        credito = totalVendasBase;
        break;
      case '8.8':
        const res = totalVendasBase - (totalComprasBase + totalSalariosBrutos + totalInssPatronal);
        if (res >= 0) credito = res;
        else debito = Math.abs(res);
        break;
      default:
        debito = 0;
        credito = 0;
        break;
    }

    const saldoDevedor = debito > credito ? debito - credito : 0;
    const saldoCredor = credito > debito ? credito - debito : 0;
    const saldoLiquido = conta.natureza === 'Devedora' ? (debito - credito) : (credito - debito);

    return {
      ...conta,
      debito,
      credito,
      saldoDevedor,
      saldoCredor,
      saldoLiquido
    };
  });
}
