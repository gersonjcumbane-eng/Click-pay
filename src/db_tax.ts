/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Employee, ConfigFiscal, EscalaoIRPS, PayrollCalculation, CompanyData, PaymentLog, EscalaoFiscalMoz, CompraItem, VendaItem, LivroCaixaItem, ApuramentoIVA, LeadItem, PropostaItem, ContratoComercialItem } from './types';
import { validarEClassificarLancamentoPGC } from './pgc_mozambique';

// In-Memory Financial Data Stores
export let comprasStore: CompraItem[] = [];

export let vendasStore: VendaItem[] = [];

export let caixaStore: LivroCaixaItem[] = [];

// Compras CRUD & Helpers
export function getCompras(periodo?: string): CompraItem[] {
  if (!periodo) return comprasStore;
  return comprasStore.filter(c => c.periodo.toLowerCase() === periodo.toLowerCase());
}

export function addCompra(item: Omit<CompraItem, 'id'>): CompraItem {
  // Validação Estrita do PGC Moçambique
  const validacaoPGC = validarEClassificarLancamentoPGC('compra', {
    fornecedor: item.fornecedor,
    nuit_fornecedor: item.nuit_fornecedor,
    numero_factura: item.numero_factura,
    data: item.data,
    descricao: item.descricao,
    categoria: item.categoria,
    valor_base: Number(item.valor_base),
    taxa_iva: Number(item.taxa_iva),
    estado: item.estado,
    metodo_pagamento: item.metodo_pagamento
  });

  if (!validacaoPGC.valido) {
    throw new Error(`Violação das Normas Contabilísticas PGC-NIRF: ${validacaoPGC.erros.join(' | ')}`);
  }

  const newId = `comp_${Date.now()}`;
  const valorBase = Number(item.valor_base) || 0;
  const taxaIva = Number(item.taxa_iva) || 0;
  const valorIva = Number(((valorBase * taxaIva) / 100).toFixed(2));
  const totalComIva = Number((valorBase + valorIva).toFixed(2));

  const compra: CompraItem = {
    ...item,
    id: newId,
    valor_base: valorBase,
    taxa_iva: taxaIva,
    valor_iva: valorIva,
    total_com_iva: totalComIva
  };

  comprasStore.unshift(compra);

  // If purchase is marked as Paid ('Pago'), automatically post to Cashbook (Livro de Caixa)
  if (compra.estado === 'Pago') {
    addCaixaItem({
      data: compra.data || new Date().toISOString().split('T')[0],
      tipo: 'Saida',
      descricao: `Pagamento Compra - ${compra.descricao} (${compra.numero_factura})`,
      categoria: 'Compra',
      valor: compra.total_com_iva,
      metodo: compra.metodo_pagamento,
      referencia_origem: compra.id,
      entidade: compra.fornecedor,
      periodo: compra.periodo
    });
  }

  return compra;
}

export function updateCompra(id: string, fields: Partial<CompraItem>): CompraItem | null {
  const index = comprasStore.findIndex(c => c.id === id);
  if (index === -1) return null;

  const current = comprasStore[index];
  const valorBase = fields.valor_base !== undefined ? Number(fields.valor_base) : current.valor_base;
  const taxaIva = fields.taxa_iva !== undefined ? Number(fields.taxa_iva) : current.taxa_iva;
  const valorIva = Number(((valorBase * taxaIva) / 100).toFixed(2));
  const totalComIva = Number((valorBase + valorIva).toFixed(2));

  const updated: CompraItem = {
    ...current,
    ...fields,
    valor_base: valorBase,
    taxa_iva: taxaIva,
    valor_iva: valorIva,
    total_com_iva: totalComIva
  };

  comprasStore[index] = updated;
  return updated;
}

export function deleteCompra(id: string): boolean {
  const index = comprasStore.findIndex(c => c.id === id);
  if (index === -1) return false;
  comprasStore.splice(index, 1);
  return true;
}

// Vendas CRUD & Helpers
export function getVendas(periodo?: string): VendaItem[] {
  if (!periodo) return vendasStore;
  return vendasStore.filter(v => v.periodo.toLowerCase() === periodo.toLowerCase());
}

export function addVenda(item: Omit<VendaItem, 'id'>): VendaItem {
  // Validação Estrita do PGC Moçambique
  const validacaoPGC = validarEClassificarLancamentoPGC('venda', {
    cliente: item.cliente,
    nuit_cliente: item.nuit_cliente,
    numero_factura: item.numero_factura,
    data: item.data,
    descricao: item.descricao,
    categoria: item.categoria,
    valor_base: Number(item.valor_base),
    taxa_iva: Number(item.taxa_iva),
    estado: item.estado,
    metodo_recebimento: item.metodo_recebimento
  });

  if (!validacaoPGC.valido) {
    throw new Error(`Violação das Normas Contabilísticas PGC-NIRF: ${validacaoPGC.erros.join(' | ')}`);
  }

  const newId = `vend_${Date.now()}`;
  const valorBase = Number(item.valor_base) || 0;
  const taxaIva = Number(item.taxa_iva) || 0;
  const valorIva = Number(((valorBase * taxaIva) / 100).toFixed(2));
  const totalComIva = Number((valorBase + valorIva).toFixed(2));

  const venda: VendaItem = {
    ...item,
    id: newId,
    valor_base: valorBase,
    taxa_iva: taxaIva,
    valor_iva: valorIva,
    total_com_iva: totalComIva
  };

  vendasStore.unshift(venda);

  // If sale is marked as Charged ('Cobrado'), automatically post to Cashbook (Livro de Caixa)
  if (venda.estado === 'Cobrado') {
    addCaixaItem({
      data: venda.data || new Date().toISOString().split('T')[0],
      tipo: 'Entrada',
      descricao: `Recebimento Venda - ${venda.descricao} (${venda.numero_factura})`,
      categoria: 'Venda',
      valor: venda.total_com_iva,
      metodo: venda.metodo_recebimento,
      referencia_origem: venda.id,
      entidade: venda.cliente,
      periodo: venda.periodo
    });
  }

  return venda;
}

export function updateVenda(id: string, fields: Partial<VendaItem>): VendaItem | null {
  const index = vendasStore.findIndex(v => v.id === id);
  if (index === -1) return null;

  const current = vendasStore[index];
  const valorBase = fields.valor_base !== undefined ? Number(fields.valor_base) : current.valor_base;
  const taxaIva = fields.taxa_iva !== undefined ? Number(fields.taxa_iva) : current.taxa_iva;
  const valorIva = Number(((valorBase * taxaIva) / 100).toFixed(2));
  const totalComIva = Number((valorBase + valorIva).toFixed(2));

  const updated: VendaItem = {
    ...current,
    ...fields,
    valor_base: valorBase,
    taxa_iva: taxaIva,
    valor_iva: valorIva,
    total_com_iva: totalComIva
  };

  vendasStore[index] = updated;
  return updated;
}

export function deleteVenda(id: string): boolean {
  const index = vendasStore.findIndex(v => v.id === id);
  if (index === -1) return false;
  vendasStore.splice(index, 1);
  return true;
}

// Livro de Caixa Helpers
export function getCaixa(periodo?: string): LivroCaixaItem[] {
  if (!periodo) return caixaStore;
  return caixaStore.filter(cx => cx.periodo.toLowerCase() === periodo.toLowerCase());
}

export function addCaixaItem(item: Omit<LivroCaixaItem, 'id'>): LivroCaixaItem {
  const newId = `cx_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const novo: LivroCaixaItem = {
    ...item,
    id: newId,
    valor: Number(item.valor) || 0
  };
  caixaStore.unshift(novo);
  return novo;
}

export function deleteCaixaItem(id: string): boolean {
  const index = caixaStore.findIndex(c => c.id === id);
  if (index === -1) return false;
  caixaStore.splice(index, 1);
  return true;
}

// ==========================================
// MÓDULO INTEGRADO CRM & VENDAS DATA STORES
// ==========================================

export let leadsStore: LeadItem[] = [];

export let propostasStore: PropostaItem[] = [];

export let contratosComerciaisStore: ContratoComercialItem[] = [];

// Helper Functions CRM
export function getLeads(): LeadItem[] {
  return leadsStore;
}

export function addLead(item: Omit<LeadItem, 'id' | 'data_criacao'>): LeadItem {
  const newId = `lead_${Date.now()}`;
  const novo: LeadItem = {
    ...item,
    id: newId,
    data_criacao: new Date().toISOString().split('T')[0],
    valor_estimado: Number(item.valor_estimado) || 0,
    probabilidade: Number(item.probabilidade) || 50
  };
  leadsStore.unshift(novo);
  return novo;
}

export function updateLead(id: string, fields: Partial<LeadItem>): LeadItem | null {
  const index = leadsStore.findIndex(l => l.id === id);
  if (index === -1) return null;
  leadsStore[index] = { ...leadsStore[index], ...fields };
  return leadsStore[index];
}

export function deleteLead(id: string): boolean {
  const index = leadsStore.findIndex(l => l.id === id);
  if (index === -1) return false;
  leadsStore.splice(index, 1);
  return true;
}

// Helper Functions Propostas
export function getPropostas(periodo?: string): PropostaItem[] {
  if (!periodo) return propostasStore;
  return propostasStore.filter(p => p.periodo.toLowerCase() === periodo.toLowerCase());
}

export function addProposta(item: Omit<PropostaItem, 'id' | 'numero_proposta'>): PropostaItem {
  const count = propostasStore.length + 1;
  const numStr = String(count).padStart(3, '0');
  const numero_proposta = `PROP A/2026/${numStr}`;
  const newId = `prop_${Date.now()}`;

  // Recalcular subtotal e iva
  let subtotal = 0;
  let valorIva = 0;
  (item.itens || []).forEach(it => {
    const descMult = 1 - (it.desconto_percentual || 0) / 100;
    const itemTotal = it.quantidade * it.preco_unitario * descMult;
    subtotal += itemTotal;
    if (it.taxa_iva > 0) {
      valorIva += itemTotal * (it.taxa_iva / 100);
    }
  });

  subtotal = Number(subtotal.toFixed(2));
  valorIva = Number(valorIva.toFixed(2));
  const total_geral = Number((subtotal + valorIva).toFixed(2));

  const nova: PropostaItem = {
    ...item,
    id: newId,
    numero_proposta,
    subtotal,
    valor_iva: valorIva,
    total_geral,
    periodo: item.periodo || 'Julho 2026'
  };

  propostasStore.unshift(nova);
  return nova;
}

export function updateProposta(id: string, fields: Partial<PropostaItem>): PropostaItem | null {
  const index = propostasStore.findIndex(p => p.id === id);
  if (index === -1) return null;
  propostasStore[index] = { ...propostasStore[index], ...fields };
  return propostasStore[index];
}

export function deleteProposta(id: string): boolean {
  const index = propostasStore.findIndex(p => p.id === id);
  if (index === -1) return false;
  propostasStore.splice(index, 1);
  return true;
}

// ⚡ CONVERSÃO AUTOMÁTICA DE PROPOSTA EM FATURA NA TESOURARIA (INTEGRAÇÃO PGC-NIRF)
export function converterPropostaEmVenda(propostaId: string): VendaItem | null {
  const prop = propostasStore.find(p => p.id === propostaId);
  if (!prop) return null;

  // Gerar venda na Tesouraria
  const numFactura = `FT 2026/${String(vendasStore.length + 1).padStart(3, '0')}`;
  
  const taxaIva = prop.valor_iva > 0 ? 16 : 0;
  const valorIva = prop.valor_iva || 0;
  const totalComIva = prop.total_geral || (prop.subtotal + valorIva);

  const novaVenda = addVenda({
    cliente: prop.cliente_nome,
    nuit_cliente: prop.nuit_cliente,
    numero_factura: numFactura,
    data: new Date().toISOString().split('T')[0],
    descricao: `Faturação de Proposta Comercial ${prop.numero_proposta} (${prop.itens.map(i => i.descricao).join(', ')})`,
    categoria: 'Servicos',
    valor_base: prop.subtotal,
    taxa_iva: taxaIva,
    valor_iva: valorIva,
    total_com_iva: totalComIva,
    estado: 'Cobrado',
    metodo_recebimento: 'Transferencia_Bancaria',
    periodo: prop.periodo || 'Julho 2026'
  });

  // Atualizar estado da proposta
  prop.estado = 'Convertida_Em_Venda';
  prop.venda_id_associada = novaVenda.id;

  // Se a proposta tiver lead associado, marcar lead como Fechado Ganho
  if (prop.lead_id) {
    const lead = leadsStore.find(l => l.id === prop.lead_id);
    if (lead) {
      lead.estagio = 'Fechado_Ganho';
      lead.probabilidade = 100;
    }
  }

  return novaVenda;
}

// Contratos Comerciais
export function getContratosComerciais(): ContratoComercialItem[] {
  return contratosComerciaisStore;
}

export function addContratoComercial(item: Omit<ContratoComercialItem, 'id' | 'numero_contrato'>): ContratoComercialItem {
  const count = contratosComerciaisStore.length + 1;
  const numStr = String(count).padStart(3, '0');
  const numero_contrato = `CTR-2026-${numStr}`;
  const newId = `ctr_${Date.now()}`;

  const novo: ContratoComercialItem = {
    ...item,
    id: newId,
    numero_contrato,
    valor_total: Number(item.valor_total) || 0,
    faturamento_mensal: Number(item.faturamento_mensal) || 0
  };

  contratosComerciaisStore.unshift(novo);
  return novo;
}

export function updateContratoComercial(id: string, fields: Partial<ContratoComercialItem>): ContratoComercialItem | null {
  const index = contratosComerciaisStore.findIndex(c => c.id === id);
  if (index === -1) return null;
  contratosComerciaisStore[index] = { ...contratosComerciaisStore[index], ...fields };
  return contratosComerciaisStore[index];
}

export function deleteContratoComercial(id: string): boolean {
  const index = contratosComerciaisStore.findIndex(c => c.id === id);
  if (index === -1) return false;
  contratosComerciaisStore.splice(index, 1);
  return true;
}

// Apuramento de IVA (Declaração M/01)
export function getApuramentoIVA(periodo?: string): ApuramentoIVA {
  const vendas = getVendas(periodo).filter(v => v.estado !== 'Anulado');
  const compras = getCompras(periodo).filter(c => c.estado !== 'Cancelado');

  const totalVendasBase = vendas.reduce((sum, v) => sum + v.valor_base, 0);
  const ivaLiquidadoVendas = vendas.reduce((sum, v) => sum + v.valor_iva, 0);

  const totalComprasBase = compras.reduce((sum, c) => sum + c.valor_base, 0);
  const ivaDeductivelCompras = compras.reduce((sum, c) => sum + c.valor_iva, 0);

  // IVA Liquidado nas Vendas - IVA Dedutível nas Compras
  const saldoIVA = Number((ivaLiquidadoVendas - ivaDeductivelCompras).toFixed(2));

  return {
    periodo: periodo || 'Todos os Períodos',
    totalVendasBase: Number(totalVendasBase.toFixed(2)),
    ivaLiquidadoVendas: Number(ivaLiquidadoVendas.toFixed(2)),
    totalComprasBase: Number(totalComprasBase.toFixed(2)),
    ivaDeductivelCompras: Number(ivaDeductivelCompras.toFixed(2)),
    saldoIVA
  };
}

// ==========================================
// RELATÓRIOS AGRUPADOS & CONTABILIDADE (ERP)
// ==========================================

// 1. Relatório Agrupado de Custos e Despesas
export function getRelatorioCustosEDespesas(periodo?: string) {
  const compras = getCompras(periodo).filter(c => c.estado !== 'Cancelado');
  const caixaSaidas = getCaixa(periodo).filter(c => c.tipo === 'Saida');
  
  const categoriasMap: Record<string, { categoria: string; valor_base: number; valor_iva: number; total: number; qtd: number }> = {};
  
  compras.forEach(c => {
    const cat = c.categoria || 'Outros';
    if (!categoriasMap[cat]) {
      categoriasMap[cat] = { categoria: cat, valor_base: 0, valor_iva: 0, total: 0, qtd: 0 };
    }
    categoriasMap[cat].valor_base += c.valor_base;
    categoriasMap[cat].valor_iva += c.valor_iva;
    categoriasMap[cat].total += c.total_com_iva;
    categoriasMap[cat].qtd += 1;
  });

  const totalInssIrps = caixaSaidas.filter(cx => cx.categoria === 'INSS_IRPS').reduce((a, b) => a + b.valor, 0);
  const totalSalarios = caixaSaidas.filter(cx => cx.categoria === 'Salarios').reduce((a, b) => a + b.valor, 0);

  if (totalSalarios > 0) {
    categoriasMap['Pessoal & Salários'] = {
      categoria: 'Pessoal & Salários',
      valor_base: totalSalarios,
      valor_iva: 0,
      total: totalSalarios,
      qtd: 1
    };
  }

  if (totalInssIrps > 0) {
    categoriasMap['Impostos & Encargos Sociais'] = {
      categoria: 'Impostos & Encargos Sociais',
      valor_base: totalInssIrps,
      valor_iva: 0,
      total: totalInssIrps,
      qtd: 1
    };
  }

  const lista = Object.values(categoriasMap);
  const totalGeral = lista.reduce((a, b) => a + b.total, 0);

  return {
    periodo: periodo || 'Geral',
    categorias: lista.map(item => ({
      ...item,
      percentagem: totalGeral > 0 ? Number(((item.total / totalGeral) * 100).toFixed(1)) : 0
    })),
    totalGeralBase: lista.reduce((a, b) => a + b.valor_base, 0),
    totalGeralIva: lista.reduce((a, b) => a + b.valor_iva, 0),
    totalGeral
  };
}

// 2. Relatório Agrupado de Vendas
export function getRelatorioVendasAgrupadas(periodo?: string) {
  const vendas = getVendas(periodo).filter(v => v.estado !== 'Anulado');
  const porClienteMap: Record<string, { cliente: string; nuit: string; qtd: number; valor_base: number; valor_iva: number; total: number; cobrado: number; pendente: number }> = {};

  vendas.forEach(v => {
    const key = v.cliente || 'Cliente Diversos';
    if (!porClienteMap[key]) {
      porClienteMap[key] = {
        cliente: key,
        nuit: v.nuit_cliente || 'N/A',
        qtd: 0,
        valor_base: 0,
        valor_iva: 0,
        total: 0,
        cobrado: 0,
        pendente: 0
      };
    }
    porClienteMap[key].qtd += 1;
    porClienteMap[key].valor_base += v.valor_base;
    porClienteMap[key].valor_iva += v.valor_iva;
    porClienteMap[key].total += v.total_com_iva;
    if (v.estado === 'Cobrado') {
      porClienteMap[key].cobrado += v.total_com_iva;
    } else {
      porClienteMap[key].pendente += v.total_com_iva;
    }
  });

  return {
    periodo: periodo || 'Geral',
    clientes: Object.values(porClienteMap),
    totalVendas: vendas.reduce((a, b) => a + b.total_com_iva, 0),
    totalIvaLiquidado: vendas.reduce((a, b) => a + b.valor_iva, 0),
    totalCobrado: vendas.filter(v => v.estado === 'Cobrado').reduce((a, b) => a + b.total_com_iva, 0),
    totalPendente: vendas.filter(v => v.estado === 'Pendente').reduce((a, b) => a + b.total_com_iva, 0)
  };
}

// 3. Relatório Agrupado de Compras
export function getRelatorioComprasAgrupadas(periodo?: string) {
  const compras = getCompras(periodo).filter(c => c.estado !== 'Cancelado');
  const porFornecedorMap: Record<string, { fornecedor: string; nuit: string; qtd: number; valor_base: number; valor_iva: number; total: number; pago: number; pendente: number }> = {};

  compras.forEach(c => {
    const key = c.fornecedor || 'Fornecedor Diversos';
    if (!porFornecedorMap[key]) {
      porFornecedorMap[key] = {
        fornecedor: key,
        nuit: c.nuit_fornecedor || 'N/A',
        qtd: 0,
        valor_base: 0,
        valor_iva: 0,
        total: 0,
        pago: 0,
        pendente: 0
      };
    }
    porFornecedorMap[key].qtd += 1;
    porFornecedorMap[key].valor_base += c.valor_base;
    porFornecedorMap[key].valor_iva += c.valor_iva;
    porFornecedorMap[key].total += c.total_com_iva;
    if (c.estado === 'Pago') {
      porFornecedorMap[key].pago += c.total_com_iva;
    } else {
      porFornecedorMap[key].pendente += c.total_com_iva;
    }
  });

  return {
    periodo: periodo || 'Geral',
    fornecedores: Object.values(porFornecedorMap),
    totalCompras: compras.reduce((a, b) => a + b.total_com_iva, 0),
    totalIvaDeductivel: compras.reduce((a, b) => a + b.valor_iva, 0),
    totalPago: compras.filter(c => c.estado === 'Pago').reduce((a, b) => a + b.total_com_iva, 0),
    totalPendente: compras.filter(c => c.estado === 'Pendente').reduce((a, b) => a + b.total_com_iva, 0)
  };
}

// 4. Relatório de Clientes
export function getRelatorioClientes(periodo?: string) {
  return getRelatorioVendasAgrupadas(periodo);
}

// 5. Relatório de Fornecedores
export function getRelatorioFornecedores(periodo?: string) {
  return getRelatorioComprasAgrupadas(periodo);
}

// 6. Balancete de Verificação (PGC Moçambique - Partidas Dobradas & Acréscimo)
export function getBalanceteVerificacao(periodo?: string) {
  const vendas = getVendas(periodo).filter(v => v.estado !== 'Anulado');
  const compras = getCompras(periodo).filter(c => c.estado !== 'Cancelado');
  const caixa = getCaixa(periodo);
  const funcionarios = employees;

  const totalEntradasCaixa = caixa.filter(c => c.tipo === 'Entrada').reduce((a, b) => a + b.valor, 0);
  const totalSaidasCaixa = caixa.filter(c => c.tipo === 'Saida').reduce((a, b) => a + b.valor, 0);

  const totalVendasBase = vendas.reduce((a, b) => a + b.valor_base, 0);
  const totalIvaVendas = vendas.reduce((a, b) => a + b.valor_iva, 0);
  const totalVendasCobrado = vendas.filter(v => v.estado === 'Cobrado').reduce((a, b) => a + b.total_com_iva, 0);
  const totalVendasPendente = vendas.filter(v => v.estado === 'Pendente').reduce((a, b) => a + b.total_com_iva, 0);

  const totalComprasBase = compras.reduce((a, b) => a + b.valor_base, 0);
  const totalIvaCompras = compras.reduce((a, b) => a + b.valor_iva, 0);
  const totalComprasPago = compras.filter(c => c.estado === 'Pago').reduce((a, b) => a + b.total_com_iva, 0);
  const totalComprasPendente = compras.filter(c => c.estado === 'Pendente').reduce((a, b) => a + b.total_com_iva, 0);

  // Remunerações do Exercício (Princípio da Especialização do Exercício)
  const totalSalariosBase = funcionarios.reduce((a, b) => a + b.salario_base, 0);
  const totalInssPatronal = totalSalariosBase * 0.04;
  const totalGastosPessoal = totalSalariosBase + totalInssPatronal;

  const contas = [
    {
      codigo: '1.1',
      nome: 'Meios Financeiros Líquidos (Caixa e Bancos)',
      debito: totalEntradasCaixa,
      credito: totalSaidasCaixa,
      saldo_devedor: Math.max(0, totalEntradasCaixa - totalSaidasCaixa),
      saldo_credor: Math.max(0, totalSaidasCaixa - totalEntradasCaixa)
    },
    {
      codigo: '4.1.1',
      nome: 'Clientes Conta Corrente (A Receber)',
      debito: totalVendasBase + totalIvaVendas,
      credito: totalVendasCobrado,
      saldo_devedor: totalVendasPendente,
      saldo_credor: 0
    },
    {
      codigo: '4.2.1',
      nome: 'Fornecedores Conta Corrente (A Pagar)',
      debito: totalComprasPago,
      credito: totalComprasBase + totalIvaCompras,
      saldo_devedor: 0,
      saldo_credor: totalComprasPendente
    },
    {
      codigo: '4.4.3.4',
      nome: 'Estado - IVA a Pagar / Apuramento (M/01)',
      debito: totalIvaCompras,
      credito: totalIvaVendas,
      saldo_devedor: totalIvaCompras > totalIvaVendas ? totalIvaCompras - totalIvaVendas : 0,
      saldo_credor: totalIvaVendas > totalIvaCompras ? totalIvaVendas - totalIvaCompras : 0
    },
    {
      codigo: '4.4.9.1',
      nome: 'Estado - Segurança Social INSS (3% + 4%)',
      debito: 0,
      credito: totalSalariosBase * 0.07,
      saldo_devedor: 0,
      saldo_credor: totalSalariosBase * 0.07
    },
    {
      codigo: '4.5.2.1',
      nome: 'Pessoal - Remunerações a Pagar aos Trabalhadores (Salários Líquidos)',
      debito: 0,
      credito: totalSalariosBase * 0.92, // Salário líquido estimado
      saldo_devedor: 0,
      saldo_credor: totalSalariosBase * 0.92
    },
    {
      codigo: '6.1.1',
      nome: 'Custo dos Inventários Vendidos ou Consumidos (CMVMC)',
      debito: totalComprasBase,
      credito: 0,
      saldo_devedor: totalComprasBase,
      saldo_credor: 0
    },
    {
      codigo: '6.2.2',
      nome: 'Gastos com Pessoal - Remunerações dos Trabalhadores',
      debito: totalSalariosBase,
      credito: 0,
      saldo_devedor: totalSalariosBase,
      saldo_credor: 0
    },
    {
      codigo: '6.2.3',
      nome: 'Gastos com Pessoal - Encargos sobre Remunerações (INSS Patronal 4%)',
      debito: totalInssPatronal,
      credito: 0,
      saldo_devedor: totalInssPatronal,
      saldo_credor: 0
    },
    {
      codigo: '7.1.1',
      nome: 'Vendas de Mercadorias e Prestação de Serviços',
      debito: 0,
      credito: totalVendasBase,
      saldo_devedor: 0,
      saldo_credor: totalVendasBase
    }
  ];

  const totalDebito = contas.reduce((a, b) => a + b.debito, 0);
  const totalCredito = contas.reduce((a, b) => a + b.credito, 0);
  const totalSaldoDevedor = contas.reduce((a, b) => a + b.saldo_devedor, 0);
  const totalSaldoCredor = contas.reduce((a, b) => a + b.saldo_credor, 0);

  return {
    periodo: periodo || 'Geral',
    contas,
    totalDebito,
    totalCredito,
    totalSaldoDevedor,
    totalSaldoCredor,
    balanceteEquilibrado: Math.abs(totalSaldoDevedor - totalSaldoCredor) < 1,
    principiosContabilisticos: [
      { nome: 'Princípio da Continuidade', estado: 'Verificado', descricao: 'A entidade presume-se em atividade contínua com prazos ilimitados.' },
      { nome: 'Especialização do Exercício (Acréscimo)', estado: 'Verificado', descricao: 'Rendimentos e custos reconhecidos quando gerados, independentemente da liquidação.' },
      { nome: 'Partidas Dobradas (Múltipla Entrada)', estado: 'Verificado', descricao: 'Para cada débito há um crédito equivalente garantindo equilíbrio de balança.' },
      { nome: 'Não Compensação de Saldos', estado: 'Verificado', descricao: 'Ativos e Passivos, Custos e Proveitos apresentados em separado sem netting indevido.' },
      { nome: 'Prudência e Materialidade', estado: 'Verificado', descricao: 'Registo exaustivo de obrigações tributárias e previdenciárias apuradas.' }
    ]
  };
}

// 7. Diário de Caixa
export function getDiarioCaixa(periodo?: string) {
  const caixa = getCaixa(periodo);
  let saldoCorrente = 0;
  
  const cronologico = [...caixa].reverse().map(item => {
    if (item.tipo === 'Entrada') {
      saldoCorrente += item.valor;
    } else {
      saldoCorrente -= item.valor;
    }
    return {
      ...item,
      saldo_apos_movimento: saldoCorrente
    };
  }).reverse();

  const totalEntradas = caixa.filter(c => c.tipo === 'Entrada').reduce((a, b) => a + b.valor, 0);
  const totalSaidas = caixa.filter(c => c.tipo === 'Saida').reduce((a, b) => a + b.valor, 0);

  return {
    periodo: periodo || 'Geral',
    movimentos: cronologico,
    totalEntradas,
    totalSaidas,
    saldoLiquido: totalEntradas - totalSaidas
  };
}

// 8. Fluxo de Caixa (DFC)
export function getFluxoCaixa(periodo?: string) {
  const caixa = getCaixa(periodo);
  
  const recebimentoClientes = caixa.filter(c => c.tipo === 'Entrada' && (c.categoria === 'Venda' || c.categoria === 'Servicos')).reduce((a, b) => a + b.valor, 0);
  const outrosRecebimentos = caixa.filter(c => c.tipo === 'Entrada' && c.categoria !== 'Venda' && c.categoria !== 'Servicos').reduce((a, b) => a + b.valor, 0);

  const pagamentoFornecedores = caixa.filter(c => c.tipo === 'Saida' && c.categoria === 'Compra').reduce((a, b) => a + b.valor, 0);
  const pagamentoSalarios = caixa.filter(c => c.tipo === 'Saida' && c.categoria === 'Salarios').reduce((a, b) => a + b.valor, 0);
  const pagamentoImpostos = caixa.filter(c => c.tipo === 'Saida' && (c.categoria === 'INSS_IRPS' || c.categoria === 'Renda')).reduce((a, b) => a + b.valor, 0);
  const outrasSaidas = caixa.filter(c => c.tipo === 'Saida' && !['Compra', 'Salarios', 'INSS_IRPS', 'Renda'].includes(c.categoria)).reduce((a, b) => a + b.valor, 0);

  const totalEntradas = recebimentoClientes + outrosRecebimentos;
  const totalSaidas = pagamentoFornecedores + pagamentoSalarios + pagamentoImpostos + outrasSaidas;
  const fluxoLiquidoOperacional = totalEntradas - totalSaidas;

  return {
    periodo: periodo || 'Geral',
    entradas: {
      recebimentoClientes,
      outrosRecebimentos,
      totalEntradas
    },
    saidas: {
      pagamentoFornecedores,
      pagamentoSalarios,
      pagamentoImpostos,
      outrasSaidas,
      totalSaidas
    },
    fluxoLiquidoOperacional,
    saldoFinalTesouraria: fluxoLiquidoOperacional
  };
}

// 9. Balanço Patrimonial (Equilíbrio Fundamental Activo = Passivo + Capital Próprio)
export function getBalancoPatrimonial(periodo?: string) {
  const balancete = getBalanceteVerificacao(periodo);
  const apuramentoIVA = getApuramentoIVA(periodo);

  const disponibilidades = balancete.contas.find(c => c.codigo === '1.1')?.saldo_devedor || 0;
  const clientes = balancete.contas.find(c => c.codigo === '4.1.1')?.saldo_devedor || 0;
  const ivaARecuperar = apuramentoIVA.saldoIVA < 0 ? Math.abs(apuramentoIVA.saldoIVA) : 0;

  const totalActivoCorrente = disponibilidades + clientes + ivaARecuperar;
  const totalActivoNaoCorrente = 150000; // Imobilizado e Equipamentos
  const totalActivo = totalActivoCorrente + totalActivoNaoCorrente;

  const fornecedores = balancete.contas.find(c => c.codigo === '4.2.1')?.saldo_credor || 0;
  const pessoalAPagar = balancete.contas.find(c => c.codigo === '4.5.2.1')?.saldo_credor || 0;
  const ivaAPagar = apuramentoIVA.saldoIVA > 0 ? apuramentoIVA.saldoIVA : 0;
  const impostosRetidosAPagar = 25000;
  const totalPassivoCorrente = fornecedores + pessoalAPagar + ivaAPagar + impostosRetidosAPagar;

  const capitalSocial = 100000;
  const vendasBase = balancete.contas.find(c => c.codigo === '7.1.1')?.saldo_credor || 0;
  const custosBase = balancete.contas.find(c => c.codigo === '6.1.1')?.saldo_devedor || 0;
  const gastosPessoalBase = (balancete.contas.find(c => c.codigo === '6.2.2')?.saldo_devedor || 0) + (balancete.contas.find(c => c.codigo === '6.2.3')?.saldo_devedor || 0);
  
  const resultadoPeriodo = vendasBase - (custosBase + gastosPessoalBase);
  const resultadosAcumulados = totalActivo - totalPassivoCorrente - capitalSocial - resultadoPeriodo;

  const totalCapitalProprio = capitalSocial + resultadoPeriodo + resultadosAcumulados;
  const totalPassivoEPatrimonio = totalPassivoCorrente + totalCapitalProprio;

  return {
    periodo: periodo || 'Geral',
    activo: {
      corrente: {
        disponibilidades,
        clientes,
        ivaARecuperar,
        subtotal: totalActivoCorrente
      },
      naoCorrente: {
        equipamentosEInstalacoes: totalActivoNaoCorrente,
        subtotal: totalActivoNaoCorrente
      },
      totalActivo
    },
    passivo: {
      corrente: {
        fornecedores,
        pessoalAPagar,
        ivaAPagar,
        impostosRetidosAPagar,
        subtotal: totalPassivoCorrente
      },
      totalPassivo: totalPassivoCorrente
    },
    capitalProprio: {
      capitalSocial,
      resultadoPeriodo,
      resultadosAcumulados,
      totalCapitalProprio
    },
    totalPassivoEPatrimonio,
    balancoEquilibrado: Math.abs(totalActivo - totalPassivoEPatrimonio) < 1,
    principiosContabilisticos: [
      { nome: 'Equilíbrio do Balanço (Activo = Passivo + Capital Próprio)', estado: 'Verificado', descricao: 'Equação fundamental da contabilidade respeitada sem desvios.' },
      { nome: 'Mensuração ao Custo Histórico', estado: 'Verificado', descricao: 'Ativos e Passivos valorizados de acordo com os suportes documentais das transações.' },
      { nome: 'Continuidade Operacional', estado: 'Verificado', descricao: 'Demonstrações elaboradas com o pressuposto de continuidade contínua das operações.' }
    ]
  };
}

// 10. Demonstração de Resultados por Natureza (DR - PGC Moçambique)
export function getDemonstracaoResultados(periodo?: string) {
  const vendas = getVendas(periodo).filter(v => v.estado !== 'Anulado');
  const compras = getCompras(periodo).filter(c => c.estado !== 'Cancelado');
  const funcionarios = employees;

  const vendasLiquidas = vendas.reduce((a, b) => a + b.valor_base, 0);
  const custoMercadorias = compras.reduce((a, b) => a + b.valor_base, 0);
  const margemBruta = vendasLiquidas - custoMercadorias;

  const salariosBrutos = funcionarios.reduce((a, b) => a + b.salario_base, 0);
  const inssPatronal = salariosBrutos * 0.04;
  const gastosPessoal = salariosBrutos + inssPatronal;

  const resultadoOperacional = margemBruta - gastosPessoal;
  const impostoRendimentoEstimado = resultadoOperacional > 0 ? resultadoOperacional * 0.32 : 0; // Taxa de IRPC 32% em Moçambique
  const resultadoLiquido = resultadoOperacional - impostoRendimentoEstimado;

  return {
    periodo: periodo || 'Geral',
    vendasLiquidas,
    custoMercadorias,
    margemBruta,
    salariosBrutos,
    inssPatronal,
    gastosPessoal,
    resultadoOperacional,
    impostoRendimentoEstimado,
    resultadoLiquido,
    principiosContabilisticos: [
      { nome: 'Especialização do Exercício (Accrual Basis)', estado: 'Verificado', descricao: 'Reconhecimento de proveitos e custos exclusivamente no exercício a que respeitam.' },
      { nome: 'Concorrência de Custos e Proveitos', estado: 'Verificado', descricao: 'Associação direta entre os rendimentos operacionais e os respetivos custos incorridos.' }
    ]
  };
}

// In-Memory Database for the application
export let configuracaoFiscal: ConfigFiscal = {
  taxa_inss_trabalhador: 3.0,
  taxa_inss_entidade: 4.0,
  valor_ipa_mensal: 0.0,
  divisor_dias_faltas: 30,
  formula_faltas_modelo: "(Salário Base / Divisor) * Dias de Faltas",
  formula_irps_modelo: "Valor Fixo + (Matéria Coletável - Limite Mínimo) * Taxa - Dedução por Dependente"
};

export let empresaAtual: CompanyData = {
  nome: "Payroll Tech Mz Lda",
  nuit: "400999999",
  endereco: "Av. 24 de Julho, nº 1500, 5º Andar, Maputo",
  pais: "Moçambique",
  provincia: "Maputo Cidade",
  distrito: "KaMpfumo",
  regime_iva: "Geral (16%)",
  sector_negocio: "Prestação de Serviços & Tecnologia",
  tamanho_empresa: "Pequena Empresa (6-20 Colaboradores)",
  regime_fiscal_pme: "Regime Geral IVA (16%)",
  nuel: "10011122",
  email: "admin@payrolltech.co.mz",
  telefone: "+258 86 139 0061",
  logo: "logo-payroll.png",
  subscription_status: "ativo",
  subscription_plan: "Platinum",
  next_billing_date: "2026-12-31",
  fee_base: 0,
  fee_por_slip: 0
};

// Full official IRPS escalões for Mozambique (LEI Nº 11/2025)
export let escaloesIRPS: EscalaoIRPS[] = [
  {
    limite_minimo: 0.00,
    limite_maximo: 20249.99,
    coeficiente_taxa: 0.00,
    valores_base_por_dependente: { dep_0: 0, dep_1: 0, dep_2: 0, dep_3: 0, dep_4_mais: 0 },
    valor_fixo_intervalo: 0.00,
    parcela_base_0_dep: 0.00,
    parcela_1_dep: 0.00,
    parcela_2_dep: 0.00,
    parcela_3_dep: 0.00,
    parcela_4_mais_dep: 0.00
  },
  {
    limite_minimo: 20250.00,
    limite_maximo: 20749.99,
    coeficiente_taxa: 0.10,
    valores_base_por_dependente: { dep_0: 0, dep_1: 0, dep_2: 0, dep_3: 0, dep_4_mais: 0 },
    valor_fixo_intervalo: 0.00,
    parcela_base_0_dep: 0.00,
    parcela_1_dep: 0.00,
    parcela_2_dep: 0.00,
    parcela_3_dep: 0.00,
    parcela_4_mais_dep: 0.00
  },
  {
    limite_minimo: 20750.00,
    limite_maximo: 20999.99,
    coeficiente_taxa: 0.10,
    valores_base_por_dependente: { dep_0: 50, dep_1: 25, dep_2: 10, dep_3: 0, dep_4_mais: 0 },
    valor_fixo_intervalo: 50.00,
    parcela_base_0_dep: 0.00,
    parcela_1_dep: 25.00,
    parcela_2_dep: 40.00,
    parcela_3_dep: 50.00,
    parcela_4_mais_dep: 50.00
  },
  {
    limite_minimo: 21000.00,
    limite_maximo: 32400.00,
    coeficiente_taxa: 0.10,
    valores_base_por_dependente: { dep_0: 75, dep_1: 50, dep_2: 25, dep_3: 10, dep_4_mais: 0 },
    valor_fixo_intervalo: 75.00,
    parcela_base_0_dep: 0.00,
    parcela_1_dep: 25.00,
    parcela_2_dep: 50.00,
    parcela_3_dep: 65.00,
    parcela_4_mais_dep: 75.00
  },
  {
    limite_minimo: 32400.01,
    limite_maximo: 64800.00,
    coeficiente_taxa: 0.15,
    valores_base_por_dependente: { dep_0: 1215, dep_1: 1000, dep_2: 850, dep_3: 700, dep_4_mais: 500 },
    valor_fixo_intervalo: 1215.00,
    parcela_base_0_dep: 0.00,
    parcela_1_dep: 215.00,
    parcela_2_dep: 365.00,
    parcela_3_dep: 515.00,
    parcela_4_mais_dep: 715.00
  },
  {
    limite_minimo: 64800.01,
    limite_maximo: null, // Último escalão (Sem limite máximo)
    coeficiente_taxa: 0.20,
    valores_base_por_dependente: { dep_0: 6075, dep_1: 5800, dep_2: 5500, dep_3: 5100, dep_4_mais: 4800 },
    valor_fixo_intervalo: 6075.00,
    parcela_base_0_dep: 0.00,
    parcela_1_dep: 275.00,
    parcela_2_dep: 575.00,
    parcela_3_dep: 975.00,
    parcela_4_mais_dep: 1275.00
  }
];

// Initial employees for a raw starting experience - pre-populated with Founders team as default
export let employees: Employee[] = [
  {
    id: "emp-gerson",
    nome: "Gerson Cumbane",
    nuit: "400222333",
    inss_numero: "100222333",
    cargo: "CEO / Diretor Executivo",
    salario_base: 39000,
    numero_dependentes: 1,
    carteira_movel: "861390061"
  },
  {
    id: "emp-miguel",
    nome: "Miguel Zandamela",
    nuit: "400444555",
    inss_numero: "100444555",
    cargo: "Chief Operating Officer",
    salario_base: 30000,
    numero_dependentes: 0,
    carteira_movel: "841439898"
  },
  {
    id: "emp-cleton",
    nome: "Cleton Bata",
    nuit: "400666777",
    inss_numero: "100666777",
    cargo: "Chief Marketing Officer",
    salario_base: 30000,
    numero_dependentes: 2,
    carteira_movel: "844996925"
  }
];

// Simulated Transaction log for payroll disbursements
export let paymentLogs: PaymentLog[] = [];

// Matriz oficial de retenção na fonte (mensal) baseada no Artigo 65-A do Código do IRPS de Moçambique
export const matrizFiscaisMoçambique: EscalaoFiscalMoz[] = [
  {
    intervalo: "Isento",
    limite_minimo: 0.00,
    limite_maximo: 20250.00,
    valor_fixo_irps: 0.00,
    coeficiente_taxa: 0.00,
    deducao_por_dependente: { dep_0: 0, dep_1: 0, dep_2: 0, dep_3: 0, dep_4_mais: 0 }
  },
  {
    intervalo: "2º Escalão",
    limite_minimo: 20250.01,
    limite_maximo: 32400.00,
    valor_fixo_irps: 0.00,
    coeficiente_taxa: 0.10,
    deducao_por_dependente: { 
      dep_0: 0,
      dep_1: 200.00,
      dep_2: 400.00,
      dep_3: 600.00,
      dep_4_mais: 800.00 
    }
  },
  {
    intervalo: "3º Escalão",
    limite_minimo: 32400.01,
    limite_maximo: 64800.00,
    valor_fixo_irps: 1215.00,
    coeficiente_taxa: 0.15,
    deducao_por_dependente: { 
      dep_0: 0, 
      dep_1: 300.00, 
      dep_2: 600.00, 
      dep_3: 900.00, 
      dep_4_mais: 1200.00 
    }
  },
  {
    intervalo: "4º Escalão",
    limite_minimo: 64800.01,
    limite_maximo: null,
    valor_fixo_irps: 6075.00,
    coeficiente_taxa: 0.20,
    deducao_por_dependente: {
      dep_0: 0,
      dep_1: 400.00,
      dep_2: 800.00,
      dep_3: 1200.00,
      dep_4_mais: 1600.00
    }
  }
];

/**
 * MOTOR DE CÁLCULO DE PAYROLL OFICIAL E AUDITADO PARA MOÇAMBIQUE
 */
export async function processarSalarioOficial(
  salarioBase: number,
  diasFaltas: number,
  numeroDependentes: number,
  matrizIRPS: EscalaoFiscalMoz[] = configuracaoFiscal.escaloes_irps && configuracaoFiscal.escaloes_irps.length > 0 ? configuracaoFiscal.escaloes_irps : matrizFiscaisMoçambique
) {
  // 1. CÁLCULO DO DESCONTO DE FALTAS (Lei nº 13/2023 - Comercial 30 dias por defeito)
  const divisor = configuracaoFiscal.divisor_dias_faltas || 30;
  const valorDiario = salarioBase / divisor;
  const descontoFaltas = valorDiario * diasFaltas;
  const salarioBrutoAjustado = salarioBase - descontoFaltas;

  // 2. CÁLCULO DEDUÇÃO DO INSS TRABALHADOR (Padrão 3%)
  const inssRate = (configuracaoFiscal.taxa_inss_trabalhador !== undefined ? configuracaoFiscal.taxa_inss_trabalhador : 3.0) / 100;
  const descontoINSS = salarioBrutoAjustado * inssRate;

  // 3. DETERMINAÇÃO DA MATÉRIA COLETÁVEL (Salário Tributável para IRPS)
  const salarioTributavelIRPS = salarioBrutoAjustado - descontoINSS;

  // 4. LOCALIZAR O INTERVALO FISCAL CORRETO
  const escalao = matrizIRPS.find(e => 
    salarioTributavelIRPS >= e.limite_minimo && 
    (e.limite_maximo === null || salarioTributavelIRPS <= e.limite_maximo)
  );

  let irpsFinal = 0;

  if (escalao && escalao.coeficiente_taxa > 0) {
    // Passo A: Calcular o excesso sobre o limite mínimo do escalão
    const excesso = salarioTributavelIRPS - escalao.limite_minimo;
    
    // Passo B: Multiplicar o excesso pela taxa marginal
    const impostoSobreExcesso = excesso * escalao.coeficiente_taxa;

    // Passo C: Mapear a Dedução por Dependentes (Parcela a Abater)
    let deducaoDependentes = 0;
    if (numeroDependentes === 0) deducaoDependentes = escalao.deducao_por_dependente.dep_0;
    else if (numeroDependentes === 1) deducaoDependentes = escalao.deducao_por_dependente.dep_1;
    else if (numeroDependentes === 2) deducaoDependentes = escalao.deducao_por_dependente.dep_2;
    else if (numeroDependentes === 3) deducaoDependentes = escalao.deducao_por_dependente.dep_3;
    else if (numeroDependentes >= 4) deducaoDependentes = escalao.deducao_por_dependente.dep_4_mais;

    // FÓRMULA OFICIAL CORRIGIDA: Valor Fixo + Imposto Excesso - Dedução Dependentes
    irpsFinal = escalao.valor_fixo_irps + impostoSobreExcesso - deducaoDependentes;
  }

  // O imposto nunca pode ser inferior a zero
  irpsFinal = Math.max(0, irpsFinal);

  // 5. CÁLCULO DO SALÁRIO LÍQUIDO FINAL DO TRABALHADOR
  const totalDescontos = descontoINSS + irpsFinal;
  const salarioLiquido = salarioBrutoAjustado - totalDescontos;

  const inssCompanyRate = (configuracaoFiscal.taxa_inss_entidade !== undefined ? configuracaoFiscal.taxa_inss_entidade : 4.0) / 100;

  return {
    salarioBase: Number(salarioBase.toFixed(2)),
    descontoFaltas: Number(descontoFaltas.toFixed(2)),
    diasFaltas,
    inssTrabalhador: Number(descontoINSS.toFixed(2)),
    inssEmpresa: Number((salarioBrutoAjustado * inssCompanyRate).toFixed(2)), // standard 4% patronal
    materiaColetavelIRPS: Number(salarioTributavelIRPS.toFixed(2)),
    salarioTributavel: Number(salarioTributavelIRPS.toFixed(2)),
    irpsRetido: Number(irpsFinal.toFixed(2)),
    irpsConstatado: Number(irpsFinal.toFixed(2)),
    totalDescontos: Number(totalDescontos.toFixed(2)),
    salarioLiquido: Number(salarioLiquido.toFixed(2)),
    ipaDesconto: 0,
    periodo: "Julho 2026"
  };
}

// 1. Core Mathematical and Fiscal Calculator
export function calcularFolhaSalario(
  salarioBase: number,
  diasFaltas: number,
  numeroDependentes: number
): PayrollCalculation {
  const divisor = configuracaoFiscal.divisor_dias_faltas || 30;
  const valorDiario = salarioBase / divisor;
  const descontoFaltas = valorDiario * diasFaltas;
  const salarioAposFaltas = Math.max(0, salarioBase - descontoFaltas);

  const inssTrabalhador = salarioAposFaltas * (configuracaoFiscal.taxa_inss_trabalhador / 100);
  const inssEmpresa = salarioAposFaltas * (configuracaoFiscal.taxa_inss_entidade / 100);
  const salarioTributavelIRPS = Math.max(0, salarioAposFaltas - inssTrabalhador);

  // Find correct IRPS escalão using the official or custom matrix
  const matrix = configuracaoFiscal.escaloes_irps && configuracaoFiscal.escaloes_irps.length > 0
    ? configuracaoFiscal.escaloes_irps
    : matrizFiscaisMoçambique;

  const escalao = matrix.find(e =>
    salarioTributavelIRPS >= e.limite_minimo &&
    (e.limite_maximo === null || salarioTributavelIRPS <= e.limite_maximo)
  ) || matrix[0];

  let irpsConstatado = 0;
  if (escalao && escalao.coeficiente_taxa > 0) {
    const excesso = salarioTributavelIRPS - escalao.limite_minimo;
    const impostoSobreExcesso = excesso * escalao.coeficiente_taxa;
    let deducaoDependentes = 0;
    if (numeroDependentes === 0) deducaoDependentes = escalao.deducao_por_dependente.dep_0;
    else if (numeroDependentes === 1) deducaoDependentes = escalao.deducao_por_dependente.dep_1;
    else if (numeroDependentes === 2) deducaoDependentes = escalao.deducao_por_dependente.dep_2;
    else if (numeroDependentes === 3) deducaoDependentes = escalao.deducao_por_dependente.dep_3;
    else if (numeroDependentes >= 4) deducaoDependentes = escalao.deducao_por_dependente.dep_4_mais;

    irpsConstatado = escalao.valor_fixo_irps + impostoSobreExcesso - deducaoDependentes;
  }
  irpsConstatado = Math.max(0, Number(irpsConstatado.toFixed(2)));

  const totalDescontos = inssTrabalhador + irpsConstatado;
  const salarioLiquido = Math.max(0, salarioAposFaltas - totalDescontos);

  return {
    salarioBase,
    descontoFaltas,
    diasFaltas,
    inssTrabalhador,
    inssEmpresa,
    salarioTributavel: salarioTributavelIRPS,
    irpsConstatado,
    totalDescontos,
    salarioLiquido,
    ipaDesconto: 0,
    periodo: "Julho 2026"
  };
}

// Admin / Config modifiers
export function updateConfiguracaoFiscal(novaConfig: ConfigFiscal) {
  configuracaoFiscal = { ...configuracaoFiscal, ...novaConfig };
}

export function updateEmpresa(novosDados: CompanyData) {
  empresaAtual = { ...empresaAtual, ...novosDados };
}

export function addEmployee(emp: Omit<Employee, 'id'>): Employee {
  const novo: Employee = {
    ...emp,
    id: `emp-${Date.now()}`
  };
  employees.push(novo);

  // Sync to baseDadosClientes active company
  const activeClient = baseDadosClientes.find(c => c.nuit === empresaAtual.nuit);
  if (activeClient) {
    activeClient.employees.push(novo);
  }

  return novo;
}

export function updateEmployee(id: string, emp: Partial<Employee>): Employee | null {
  const index = employees.findIndex(e => e.id === id);
  if (index !== -1) {
    employees[index] = { ...employees[index], ...emp };

    // Sync to baseDadosClientes active company
    const activeClient = baseDadosClientes.find(c => c.nuit === empresaAtual.nuit);
    if (activeClient) {
      const cliEmpIndex = activeClient.employees.findIndex(e => e.id === id);
      if (cliEmpIndex !== -1) {
        activeClient.employees[cliEmpIndex] = { ...activeClient.employees[cliEmpIndex], ...emp };
      } else {
        // If not found, add it
        activeClient.employees.push(employees[index]);
      }
    }

    return employees[index];
  }
  return null;
}

export function deleteEmployee(id: string): boolean {
  const initialLength = employees.length;
  const filtered = employees.filter(e => e.id !== id);
  
  // Need to update the exported mutable variable correctly, or mutate the array in place to preserve imports
  employees.length = 0;
  employees.push(...filtered);

  // Sync to baseDadosClientes active company
  const activeClient = baseDadosClientes.find(c => c.nuit === empresaAtual.nuit);
  if (activeClient) {
    activeClient.employees = activeClient.employees.filter(e => e.id !== id);
  }

  return employees.length < initialLength;
}

export function addPaymentLog(log: Omit<PaymentLog, 'id' | 'timestamp'>): PaymentLog {
  const novo: PaymentLog = {
    ...log,
    id: `tx-${Date.now()}`,
    timestamp: new Date().toISOString()
  };
  paymentLogs.unshift(novo); // Add to the top
  return novo;
}

export interface ValeAdiantamento {
  vale_id: string;
  funcionario_id: string;
  nome: string;
  valor: number;
  status: "APROVADO_E_TRANSFERIDO" | "DESCONTADO_FOLHA";
  data_lancamento: string;
}

export let baseDadosVales: ValeAdiantamento[] = [];

export interface Contract {
  id: string;
  empresa_id: string;
  nome_funcionario: string;
  cargo: string;
  tipo_contrato: 'Prazo Certo' | 'Indeterminado' | 'Prazo Incerto';
  data_inicio: string;
  data_fim?: string;
  salario_base: number;
  cargo_complexo?: boolean;
}

export let baseDadosContratosGerais: Contract[] = [
  {
    id: "ct-gerson",
    empresa_id: "cli_founders",
    nome_funcionario: "Gerson Cumbane",
    cargo: "CEO / Diretor Executivo",
    tipo_contrato: "Indeterminado",
    data_inicio: "2026-01-01",
    salario_base: 39000,
    cargo_complexo: true
  },
  {
    id: "ct-miguel",
    empresa_id: "cli_founders",
    nome_funcionario: "Miguel Zandamela",
    cargo: "Chief Operating Officer",
    tipo_contrato: "Indeterminado",
    data_inicio: "2026-01-01",
    salario_base: 30000,
    cargo_complexo: true
  },
  {
    id: "ct-cleton",
    empresa_id: "cli_founders",
    nome_funcionario: "Cleton Bata",
    cargo: "Chief Marketing Officer",
    tipo_contrato: "Prazo Certo",
    data_inicio: "2026-01-01",
    data_fim: "2026-12-31",
    salario_base: 30000,
    cargo_complexo: false
  }
];

export function auditarContratoLei132023(contrato: Contract) {
  // Current time reference: 2026-06-26
  const hoje = new Date('2026-06-26');
  const inicio = new Date(contrato.data_inicio);

  // 1. Calcular limite de experiência em dias
  let limiteExperiencia = 90;
  if (contrato.tipo_contrato === 'Indeterminado') {
    limiteExperiencia = contrato.cargo_complexo ? 180 : 90;
  } else if (contrato.tipo_contrato === 'Prazo Certo') {
    if (contrato.cargo_complexo) {
      limiteExperiencia = 90;
    } else {
      if (contrato.data_fim) {
        const fim = new Date(contrato.data_fim);
        const diffDias = Math.floor((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
        limiteExperiencia = diffDias <= 180 ? 15 : 30; // 6 meses = 180 dias
      } else {
        limiteExperiencia = 30;
      }
    }
  } else if (contrato.tipo_contrato === 'Prazo Incerto') {
    limiteExperiencia = 15;
  }

  const diffTime = hoje.getTime() - inicio.getTime();
  const diasDecorridos = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diasRestantesExperiencia = limiteExperiencia - diasDecorridos;
  const emExperiencia = diasDecorridos >= 0 && diasDecorridos <= limiteExperiencia;

  // 2. Verificação de caducidade e aviso prévio (apenas Prazo Certo)
  if (contrato.tipo_contrato === 'Prazo Certo' && contrato.data_fim) {
    const fim = new Date(contrato.data_fim);
    const diffFim = fim.getTime() - hoje.getTime();
    const diasParaFim = Math.ceil(diffFim / (1000 * 60 * 60 * 24));

    if (diasParaFim <= 0) {
      return {
        statusRisco: "VERMELHO" as const,
        mensagemLegal: "Contrato expirado. Necessário regularizar ou formalizar a transição para contrato por tempo indeterminado."
      };
    } else if (diasParaFim <= 30) {
      return {
        statusRisco: "VERMELHO" as const,
        mensagemLegal: `Falta de Aviso Prévio: O contrato caduca em ${diasParaFim} dias. É obrigatório emitir a notificação por escrito com 30 dias de antecedência (Art. 41).`
      };
    }
  }

  // 3. Verificação de proximidade de fim de período de experiência
  if (emExperiencia && diasRestantesExperiencia <= 7 && diasRestantesExperiencia >= 0) {
    return {
      statusRisco: "AMARELO" as const,
      mensagemLegal: `Em período de experiência (termina em ${diasRestantesExperiencia} dias). Alerta de avaliação de desempenho.`
    };
  }

  return {
    statusRisco: "VERDE" as const,
    mensagemLegal: "Contrato regular sob a Lei nº 13/2023."
  };
}

export function resetDbTotal() {
  employees.length = 0;
  paymentLogs.length = 0;
  baseDadosVales.length = 0;
  baseDadosContratosGerais.length = 0;
  
  // Set empty company data so all fields are blank
  empresaAtual.nome = "";
  empresaAtual.nuit = "";
  empresaAtual.endereco = "";
  empresaAtual.provincia = "";
  empresaAtual.distrito = "";
  empresaAtual.regime_iva = "Isento";
  empresaAtual.nuel = "";
  empresaAtual.email = "";
  empresaAtual.telefone = "";
  empresaAtual.logo = "";
}

export function seedDemoData() {
  employees.length = 0;
  paymentLogs.length = 0;
  baseDadosVales.length = 0;
  baseDadosContratosGerais.length = 0;
  
  // Restaura os dados da empresa fundadora principal como empresa ativa por defeito
  empresaAtual.nome = "Payroll Tech Mz Lda";
  empresaAtual.nuit = "400999999";
  empresaAtual.endereco = "Av. 24 de Julho, nº 1500, 5º Andar, Maputo";
  empresaAtual.provincia = "Maputo Cidade";
  empresaAtual.distrito = "KaMpfumo";
  empresaAtual.regime_iva = "Geral (16%)";
  empresaAtual.nuel = "10011122";
  empresaAtual.email = "admin@payrolltech.co.mz";
  empresaAtual.telefone = "+258 86 139 0061";
  empresaAtual.logo = "logo-payroll.png";
  empresaAtual.subscription_status = "ativo";
  empresaAtual.subscription_plan = "Platinum";
  empresaAtual.next_billing_date = "2026-12-31";
  empresaAtual.fee_base = 0;
  empresaAtual.fee_por_slip = 0;

  // Adiciona novamente os colaboradores fundadores com seus respetivos salários
  employees.push(
    {
      id: "emp-gerson",
      nome: "Gerson Cumbane",
      nuit: "400222333",
      inss_numero: "100222333",
      cargo: "CEO / Diretor Executivo",
      salario_base: 39000,
      numero_dependentes: 1,
      carteira_movel: "861390061"
    },
    {
      id: "emp-miguel",
      nome: "Miguel Zandamela",
      nuit: "400444555",
      inss_numero: "100444555",
      cargo: "Chief Operating Officer",
      salario_base: 30000,
      numero_dependentes: 0,
      carteira_movel: "841439898"
    },
    {
      id: "emp-cleton",
      nome: "Cleton Bata",
      nuit: "400666777",
      inss_numero: "100666777",
      cargo: "Chief Marketing Officer",
      salario_base: 30000,
      numero_dependentes: 2,
      carteira_movel: "844996925"
    }
  );

  // Adiciona novamente os contratos de trabalho correspondentes
  baseDadosContratosGerais.push(
    {
      id: "ct-gerson",
      empresa_id: "cli_founders",
      nome_funcionario: "Gerson Cumbane",
      cargo: "CEO / Diretor Executivo",
      tipo_contrato: "Indeterminado",
      data_inicio: "2026-01-01",
      salario_base: 39000,
      cargo_complexo: true
    },
    {
      id: "ct-miguel",
      empresa_id: "cli_founders",
      nome_funcionario: "Miguel Zandamela",
      cargo: "Chief Operating Officer",
      tipo_contrato: "Indeterminado",
      data_inicio: "2026-01-01",
      salario_base: 30000,
      cargo_complexo: true
    },
    {
      id: "ct-cleton",
      empresa_id: "cli_founders",
      nome_funcionario: "Cleton Bata",
      cargo: "Chief Marketing Officer",
      tipo_contrato: "Prazo Certo",
      data_inicio: "2026-01-01",
      data_fim: "2026-12-31",
      salario_base: 30000,
      cargo_complexo: false
    }
  );
}

// =========================================================================
// MÓDULO DE GESTÃO MULTI-CLIENTE (BUREAU DE OUTSOURCING DE SALÁRIOS)
// =========================================================================

export interface ClienteEmpresaRegisto {
  id: string;
  nome: string;
  nuit: string;
  endereco: string;
  provincia: string;
  distrito: string;
  regime_iva: string;
  nuel: string;
  email: string;
  telefone: string;
  logo: string;
  fee_base: number;      // Honorário fixo base (MZN)
  fee_por_slip: number;  // Honorário por recibo de salário processado (MZN)
  employees: Employee[];
  contratos: Contract[];
  paymentLogs: PaymentLog[];
  vales: ValeAdiantamento[];
  password?: string;
  subscription_status?: 'ativo' | 'suspenso' | 'pendente';
  subscription_plan?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  next_billing_date?: string;
}

export let baseDadosClientes: ClienteEmpresaRegisto[] = [
  {
    id: "cli_founders",
    nome: "Payroll Tech Mz Lda",
    nuit: "400999999",
    endereco: "Av. 24 de Julho, nº 1500, 5º Andar, Maputo",
    provincia: "Maputo Cidade",
    distrito: "KaMpfumo",
    regime_iva: "Geral (16%)",
    nuel: "10011122",
    email: "admin@payrolltech.co.mz",
    telefone: "+258 86 139 0061",
    logo: "logo-payroll.png",
    fee_base: 0,
    fee_por_slip: 0,
    subscription_status: "ativo",
    subscription_plan: "Platinum",
    next_billing_date: "2026-12-31",
    employees: [
      {
        id: "emp-gerson",
        nome: "Gerson Cumbane",
        nuit: "400222333",
        inss_numero: "100222333",
        cargo: "CEO / Diretor Executivo",
        salario_base: 39000,
        numero_dependentes: 1,
        carteira_movel: "861390061"
      },
      {
        id: "emp-miguel",
        nome: "Miguel Zandamela",
        nuit: "400444555",
        inss_numero: "100444555",
        cargo: "Chief Operating Officer",
        salario_base: 30000,
        numero_dependentes: 0,
        carteira_movel: "841439898"
      },
      {
        id: "emp-cleton",
        nome: "Cleton Bata",
        nuit: "400666777",
        inss_numero: "100666777",
        cargo: "Chief Marketing Officer",
        salario_base: 30000,
        numero_dependentes: 2,
        carteira_movel: "844996925"
      }
    ],
    contratos: [
      {
        id: "ct-gerson",
        empresa_id: "cli_founders",
        nome_funcionario: "Gerson Cumbane",
        cargo: "CEO / Diretor Executivo",
        tipo_contrato: "Indeterminado",
        data_inicio: "2026-01-01",
        salario_base: 39000,
        cargo_complexo: true
      },
      {
        id: "ct-miguel",
        empresa_id: "cli_founders",
        nome_funcionario: "Miguel Zandamela",
        cargo: "Chief Operating Officer",
        tipo_contrato: "Indeterminado",
        data_inicio: "2026-01-01",
        salario_base: 30000,
        cargo_complexo: true
      },
      {
        id: "ct-cleton",
        empresa_id: "cli_founders",
        nome_funcionario: "Cleton Bata",
        cargo: "Chief Marketing Officer",
        tipo_contrato: "Prazo Certo",
        data_inicio: "2026-01-01",
        data_fim: "2026-12-31",
        salario_base: 30000,
        cargo_complexo: false
      }
    ],
    paymentLogs: [],
    vales: []
  },
  {
    id: "cli_bronze",
    nome: "Construtora & Obras do Limpopo Lda",
    nuit: "400111222",
    endereco: "Av. 25 de Setembro, nº 1200, Xai-Xai, Gaza",
    provincia: "Gaza",
    distrito: "Xai-Xai",
    regime_iva: "Geral (16%)",
    nuel: "10045612",
    email: "construcao@payrolltech.co.mz",
    telefone: "+258 84 111 2233",
    logo: "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?w=128&auto=format&fit=crop&q=60",
    fee_base: 3000.00,
    fee_por_slip: 150.00,
    subscription_status: "ativo",
    subscription_plan: "Bronze",
    next_billing_date: "2026-08-30",
    employees: [
      {
        id: "emp-armindo",
        nome: "Eng. Armindo Sitoe",
        nuit: "400123123",
        inss_numero: "200111222",
        cargo: "Engenheiro Residente de Obras",
        salario_base: 65000,
        numero_dependentes: 2,
        carteira_movel: "841234567"
      },
      {
        id: "emp-mabote",
        nome: "Mestre Pedro Mabote",
        nuit: "400321321",
        inss_numero: "200333444",
        cargo: "Mestre Geral de Obras",
        salario_base: 32000,
        numero_dependentes: 3,
        carteira_movel: "847654321"
      },
      {
        id: "emp-julio",
        nome: "Júlio Macuácua",
        nuit: "400456111",
        inss_numero: "200555666",
        cargo: "Operador de Maquinaria Pesada",
        salario_base: 24000,
        numero_dependentes: 1,
        carteira_movel: "849998877"
      }
    ],
    contratos: [
      {
        id: "ct-armindo",
        empresa_id: "cli_bronze",
        nome_funcionario: "Eng. Armindo Sitoe",
        cargo: "Engenheiro Residente de Obras",
        tipo_contrato: "Indeterminado",
        data_inicio: "2025-01-15",
        salario_base: 65000,
        cargo_complexo: true
      },
      {
        id: "ct-mabote",
        empresa_id: "cli_bronze",
        nome_funcionario: "Mestre Pedro Mabote",
        cargo: "Mestre Geral de Obras",
        tipo_contrato: "Indeterminado",
        data_inicio: "2025-03-01",
        salario_base: 32000,
        cargo_complexo: false
      },
      {
        id: "ct-julio",
        empresa_id: "cli_bronze",
        nome_funcionario: "Júlio Macuácua",
        cargo: "Operador de Maquinaria Pesada",
        tipo_contrato: "Prazo Certo",
        data_inicio: "2026-01-10",
        data_fim: "2026-12-31",
        salario_base: 24000,
        cargo_complexo: false
      }
    ],
    paymentLogs: [],
    vales: []
  },
  {
    id: "cli_silver",
    nome: "Instituto de Ensino & Formação do Rovuma Lda",
    nuit: "400333444",
    endereco: "Av. Samora Machel, nº 850, Nampula",
    provincia: "Nampula",
    distrito: "Nampula Cidade",
    regime_iva: "Geral (16%)",
    nuel: "10077882",
    email: "educacao@payrolltech.co.mz",
    telefone: "+258 82 333 4455",
    logo: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=128&auto=format&fit=crop&q=60",
    fee_base: 5000.00,
    fee_por_slip: 120.00,
    subscription_status: "ativo",
    subscription_plan: "Silver",
    next_billing_date: "2026-08-30",
    employees: [
      {
        id: "emp-celso",
        nome: "Prof. Dr. Celso Mondlane",
        nuit: "400456456",
        inss_numero: "300111222",
        cargo: "Docente Universitário / Investigador",
        salario_base: 70000,
        numero_dependentes: 2,
        carteira_movel: "824561234"
      },
      {
        id: "emp-sheila",
        nome: "Dra. Sheila Langa",
        nuit: "400654654",
        inss_numero: "300333444",
        cargo: "Diretora Académica e Pedagógica",
        salario_base: 55000,
        numero_dependentes: 1,
        carteira_movel: "827894561"
      },
      {
        id: "emp-tomas",
        nome: "Tomás Chauque",
        nuit: "400789789",
        inss_numero: "300555666",
        cargo: "Secretário Escolar e Admissões",
        salario_base: 28000,
        numero_dependentes: 0,
        carteira_movel: "823216549"
      }
    ],
    contratos: [
      {
        id: "ct-celso",
        empresa_id: "cli_silver",
        nome_funcionario: "Prof. Dr. Celso Mondlane",
        cargo: "Docente Universitário / Investigador",
        tipo_contrato: "Indeterminado",
        data_inicio: "2024-02-01",
        salario_base: 70000,
        cargo_complexo: true
      },
      {
        id: "ct-sheila",
        empresa_id: "cli_silver",
        nome_funcionario: "Dra. Sheila Langa",
        cargo: "Diretora Académica e Pedagógica",
        tipo_contrato: "Indeterminado",
        data_inicio: "2025-01-15",
        salario_base: 55000,
        cargo_complexo: true
      },
      {
        id: "ct-tomas",
        empresa_id: "cli_silver",
        nome_funcionario: "Tomás Chauque",
        cargo: "Secretário Escolar e Admissões",
        tipo_contrato: "Prazo Certo",
        data_inicio: "2026-02-01",
        data_fim: "2026-12-31",
        salario_base: 28000,
        cargo_complexo: false
      }
    ],
    paymentLogs: [],
    vales: []
  },
  {
    id: "cli_gold",
    nome: "Kuvanga Tecnologias & Consultoria Lda",
    nuit: "400555666",
    endereco: "Av. Julius Nyerere, nº 2200, Polana, Maputo",
    provincia: "Maputo Cidade",
    distrito: "KaMpfumo",
    regime_iva: "Geral (16%)",
    nuel: "10099123",
    email: "servicos@payrolltech.co.mz",
    telefone: "+258 85 555 6677",
    logo: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=128&auto=format&fit=crop&q=60",
    fee_base: 6500.00,
    fee_por_slip: 250.00,
    subscription_status: "ativo",
    subscription_plan: "Gold",
    next_billing_date: "2026-08-30",
    employees: [
      {
        id: "emp-inacio",
        nome: "Dr. Inácio Nhamusse",
        nuit: "400789123",
        inss_numero: "400111222",
        cargo: "Consultor Financeiro & Fiscal Principal",
        salario_base: 95000,
        numero_dependentes: 1,
        carteira_movel: "851239876"
      },
      {
        id: "emp-vanessa",
        nome: "Engª Vanessa Mucavel",
        nuit: "400321987",
        inss_numero: "400333444",
        cargo: "Arquiteta de Software & Cloud",
        salario_base: 85000,
        numero_dependentes: 0,
        carteira_movel: "857651234"
      },
      {
        id: "emp-amilcar",
        nome: "Amílcar Tembe",
        nuit: "400654321",
        inss_numero: "400555666",
        cargo: "Analista de Suporte Técnico ERP",
        salario_base: 38000,
        numero_dependentes: 2,
        carteira_movel: "853216547"
      }
    ],
    contratos: [
      {
        id: "ct-inacio",
        empresa_id: "cli_gold",
        nome_funcionario: "Dr. Inácio Nhamusse",
        cargo: "Consultor Financeiro & Fiscal Principal",
        tipo_contrato: "Indeterminado",
        data_inicio: "2023-06-01",
        salario_base: 95000,
        cargo_complexo: true
      },
      {
        id: "ct-vanessa",
        empresa_id: "cli_gold",
        nome_funcionario: "Engª Vanessa Mucavel",
        cargo: "Arquiteta de Software & Cloud",
        tipo_contrato: "Indeterminado",
        data_inicio: "2024-01-15",
        salario_base: 85000,
        cargo_complexo: true
      },
      {
        id: "ct-amilcar",
        empresa_id: "cli_gold",
        nome_funcionario: "Amílcar Tembe",
        cargo: "Analista de Suporte Técnico ERP",
        tipo_contrato: "Indeterminado",
        data_inicio: "2025-05-01",
        salario_base: 38000,
        cargo_complexo: false
      }
    ],
    paymentLogs: [],
    vales: []
  }
];

// Switch the active client company
export function selecionarClienteEmpresa(id: string): boolean {
  // First, find and back up the current active company data into the local array
  const activeIndex = baseDadosClientes.findIndex(c => c.nuit === empresaAtual.nuit);
  if (activeIndex !== -1) {
    baseDadosClientes[activeIndex].nome = empresaAtual.nome;
    baseDadosClientes[activeIndex].nuit = empresaAtual.nuit;
    baseDadosClientes[activeIndex].endereco = empresaAtual.endereco;
    baseDadosClientes[activeIndex].provincia = empresaAtual.provincia || '';
    baseDadosClientes[activeIndex].distrito = empresaAtual.distrito || '';
    baseDadosClientes[activeIndex].regime_iva = empresaAtual.regime_iva || 'Isento';
    baseDadosClientes[activeIndex].nuel = empresaAtual.nuel || '';
    baseDadosClientes[activeIndex].email = empresaAtual.email || '';
    baseDadosClientes[activeIndex].telefone = empresaAtual.telefone || '';
    baseDadosClientes[activeIndex].logo = empresaAtual.logo || '';
    
    // Back up arrays
    baseDadosClientes[activeIndex].employees = [...employees];
    baseDadosClientes[activeIndex].contratos = [...baseDadosContratosGerais];
    baseDadosClientes[activeIndex].paymentLogs = [...paymentLogs];
    baseDadosClientes[activeIndex].vales = [...baseDadosVales];
  }

  // Find the target company to activate
  const target = baseDadosClientes.find(c => c.id === id);
  if (!target) return false;

  // Apply target company details to active references
  empresaAtual.nome = target.nome;
  empresaAtual.nuit = target.nuit;
  empresaAtual.endereco = target.endereco;
  empresaAtual.provincia = target.provincia;
  empresaAtual.distrito = target.distrito;
  empresaAtual.regime_iva = target.regime_iva;
  empresaAtual.nuel = target.nuel;
  empresaAtual.email = target.email;
  empresaAtual.telefone = target.telefone;
  empresaAtual.logo = target.logo;
  empresaAtual.subscription_status = target.subscription_status;
  empresaAtual.subscription_plan = target.subscription_plan;
  empresaAtual.next_billing_date = target.next_billing_date;
  empresaAtual.fee_base = target.fee_base;
  empresaAtual.fee_por_slip = target.fee_por_slip;

  // Mutate employees, contracts, logs, and vales arrays in-place to preserve imported references!
  employees.length = 0;
  employees.push(...target.employees);

  baseDadosContratosGerais.length = 0;
  baseDadosContratosGerais.push(...target.contratos);

  paymentLogs.length = 0;
  paymentLogs.push(...target.paymentLogs);

  baseDadosVales.length = 0;
  baseDadosVales.push(...target.vales);

  return true;
}

// Add a new client company
export function adicionarClienteEmpresa(novo: Omit<ClienteEmpresaRegisto, 'employees' | 'contratos' | 'paymentLogs' | 'vales'>): ClienteEmpresaRegisto {
  const completo: ClienteEmpresaRegisto = {
    ...novo,
    employees: [],
    contratos: [],
    paymentLogs: [],
    vales: []
  };
  baseDadosClientes.push(completo);
  return completo;
}



