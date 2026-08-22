/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FaltaItem {
  id: string;
  data: string;
  tipo: 'Injustificada' | 'Doenca' | 'Casamento' | 'Nojo' | 'Academica' | 'Maternidade_Paternidade' | 'Outra_Justificada';
  remunerada: boolean;
  dias: number;
  documentoRef?: string;
  observacao?: string;
}

export interface Employee {
  id: string;
  nome: string;
  nuit: string;
  inss_numero: string;
  cargo: string;
  salario_base: number;
  numero_dependentes: number;
  carteira_movel: string;
  tipo_contrato?: 'Indeterminado' | 'Prazo Certo' | 'Prazo Incerto';
  data_inicio?: string;
  data_fim?: string;
  cargo_complexo?: boolean;
  faltas_historico?: FaltaItem[];
  timesheet?: Record<string, 'Presenca' | 'Falta_Justificada' | 'Falta_Injustificada' | 'Descanso'>;
}

export interface CompanyData {
  nome: string;
  nuit: string;
  endereco: string;
  pais?: string;
  provincia?: string;
  distrito?: string;
  regime_iva?: string;
  sector_negocio?: string;
  tamanho_empresa?: string;
  regime_fiscal_pme?: string;
  nuel?: string;
  email?: string;
  telefone?: string;
  logo?: string;
  subscription_status?: 'ativo' | 'suspenso' | 'pendente';
  subscription_plan?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  next_billing_date?: string;
  fee_base?: number;
  fee_por_slip?: number;
}

export interface PayrollCalculation {
  salarioBase: number;
  descontoFaltas: number;
  diasFaltas: number;
  inssTrabalhador: number;
  inssEmpresa: number;
  salarioTributavel: number;
  irpsConstatado: number;
  totalDescontos: number;
  salarioLiquido: number;
  ipaDesconto: number;
  periodo: string;
  descontoVales?: number;
}

export interface ConfigFiscal {
  taxa_inss_trabalhador: number;
  taxa_inss_entidade: number;
  valor_ipa_mensal: number;
  divisor_dias_faltas?: number;
  formula_faltas_modelo?: string;
  formula_irps_modelo?: string;
  escaloes_irps?: EscalaoFiscalMoz[];
}

export interface EscalaoIRPS {
  limite_minimo: number;
  limite_maximo: number | null;
  coeficiente_taxa: number;
  valores_base_por_dependente: {
    dep_0: number;
    dep_1: number;
    dep_2: number;
    dep_3: number;
    dep_4_mais: number;
  };
  valor_fixo_intervalo: number;
  parcela_base_0_dep: number;
  parcela_1_dep: number;
  parcela_2_dep: number;
  parcela_3_dep: number;
  parcela_4_mais_dep: number;
}

export interface EscalaoFiscalMoz {
  intervalo: string;
  limite_minimo: number;
  limite_maximo: number | null;
  valor_fixo_irps: number;
  coeficiente_taxa: number;
  deducao_por_dependente: {
    dep_0: number;
    dep_1: number;
    dep_2: number;
    dep_3: number;
    dep_4_mais: number;
  };
}

export interface PayrollSummary {
  periodoAtual: string;
  kpis: {
    custoEmpresaTotal: number;
    totalPagoAosFuncionarios: number;
    retencaoEstadoTotal: number;
  };
  dadosParaGraficoPizza: {
    labels: string[];
    valoresEmMeticais: number[];
  };
  historicoOperacoes?: any[];
}

export interface PaymentLog {
  id: string;
  employeeId: string;
  employeeName: string;
  carteira_movel: string;
  salarioLiquido: number;
  status: 'Pendente' | 'Processado' | 'Erro' | 'Liquidado';
  periodo: string;
  timestamp: string;
  txId?: string;
}

export interface CompraItem {
  id: string;
  fornecedor: string;
  nuit_fornecedor: string;
  numero_factura: string;
  data: string;
  descricao: string;
  categoria: 'Insumos' | 'Equipamentos' | 'Servicos' | 'Renda' | 'Transporte' | 'Outros';
  valor_base: number;
  taxa_iva: number;
  valor_iva: number;
  total_com_iva: number;
  estado: 'Pendente' | 'Pago' | 'Cancelado';
  metodo_pagamento: 'Caixa' | 'M-Pesa' | 'E-Mola' | 'Transferencia_Bancaria' | 'Outro';
  periodo: string;
}

export interface VendaItem {
  id: string;
  cliente: string;
  nuit_cliente: string;
  numero_factura: string;
  data: string;
  descricao: string;
  categoria: 'Produtos' | 'Servicos' | 'Consultoria' | 'Assinatura' | 'Outros';
  valor_base: number;
  taxa_iva: number;
  valor_iva: number;
  total_com_iva: number;
  estado: 'Pendente' | 'Cobrado' | 'Anulado';
  metodo_recebimento: 'Caixa' | 'M-Pesa' | 'E-Mola' | 'Transferencia_Bancaria' | 'Outro';
  periodo: string;
}

export interface LivroCaixaItem {
  id: string;
  data: string;
  tipo: 'Entrada' | 'Saida';
  descricao: string;
  categoria: 'Venda' | 'Compra' | 'Salarios' | 'INSS_IRPS' | 'Renda' | 'Servicos' | 'Aporte_Capital' | 'Outros';
  valor: number;
  metodo: 'Caixa' | 'M-Pesa' | 'E-Mola' | 'Transferencia_Bancaria' | 'Outro';
  referencia_origem?: string;
  documento_ref?: string;
  entidade?: string;
  terceiro?: string;
  nuit_terceiro?: string;
  periodo: string;
}

export interface ApuramentoIVA {
  periodo: string;
  totalVendasBase: number;
  ivaLiquidadoVendas: number;
  totalComprasBase: number;
  ivaDeductivelCompras: number;
  saldoIVA: number;
}

// MÓDULO INTEGRADO CRM & VENDAS INTERFACES
export interface LeadItem {
  id: string;
  empresa_nome: string;
  nuit: string;
  contacto_nome: string;
  email: string;
  telefone: string;
  estagio: 'Prospecto' | 'Qualificado' | 'Proposta_Enviada' | 'Negociacao' | 'Fechado_Ganho' | 'Perdido';
  valor_estimado: number;
  probabilidade: number;
  origem: 'Website' | 'Indicação' | 'Redes Sociais' | 'Campanha' | 'Outro';
  vendedor: string;
  data_criacao: string;
  data_fecho_estimada: string;
  notas?: string;
}

export interface PropostaItem {
  id: string;
  numero_proposta: string;
  lead_id?: string;
  cliente_nome: string;
  nuit_cliente: string;
  email_cliente?: string;
  telefone_cliente?: string;
  data_emissao: string;
  data_validade: string;
  itens: {
    descricao: string;
    quantidade: number;
    preco_unitario: number;
    taxa_iva: number;
    desconto_percentual: number;
    total: number;
  }[];
  subtotal: number;
  valor_desconto: number;
  valor_iva: number;
  total_geral: number;
  condicoes_pagamento: string;
  estado: 'Rascunho' | 'Enviada' | 'Aprovada' | 'Rejeitada' | 'Convertida_Em_Venda';
  vendedor: string;
  venda_id_associada?: string;
  periodo: string;
}

export interface ContratoComercialItem {
  id: string;
  numero_contrato: string;
  cliente_nome: string;
  nuit_cliente: string;
  proposta_id_origem?: string;
  data_inicio: string;
  data_fim: string;
  valor_total: number;
  faturamento_mensal: number;
  ciclo_faturamento: 'Mensal' | 'Trimestral' | 'Anual' | 'Unico';
  estado: 'Ativo' | 'Em_Renovacao' | 'Finalizado' | 'Cancelado';
  vendedor: string;
  observacoes?: string;
}

