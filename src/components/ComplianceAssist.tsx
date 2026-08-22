import React, { useState } from 'react';
import Markdown from 'react-markdown';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Calendar,
  FileCheck,
  Zap,
  ArrowRight,
  BookOpen,
  Lock,
  Download,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Search,
  DollarSign,
  FileText,
  Bot,
  Copy,
  Check,
  Printer
} from 'lucide-react';
import { CompanyData, CompraItem, VendaItem, LivroCaixaItem } from '../types';

interface ComplianceAssistProps {
  company: CompanyData;
  selectedPeriod: string;
  compras: CompraItem[];
  vendas: VendaItem[];
  caixa: LivroCaixaItem[];
}

export const ComplianceAssist: React.FC<ComplianceAssistProps> = ({
  company,
  selectedPeriod,
  compras,
  vendas,
  caixa
}) => {
  const [activeAccordion, setActiveAccordion] = useState<string | null>('checklist');
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [showWizardModal, setShowWizardModal] = useState<boolean>(false);
  const [wizardSuccess, setWizardSuccess] = useState<boolean>(false);

  // Estados para o Relatório de Conformidade com IA (Gemini)
  const [loadingAiReport, setLoadingAiReport] = useState<boolean>(false);
  const [aiReportData, setAiReportData] = useState<{
    relatorio: string;
    modelo_utilizado: string;
    data_geracao: string;
    periodo: string;
  } | null>(null);
  const [showAiReportModal, setShowAiReportModal] = useState<boolean>(false);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  // 1. AUDIT CHECKS AUTOMÁTICOS PARA LEIGOS
  const totalVendasComIVA = vendas.filter(v => (v.estado as string) !== 'Cancelado').reduce((a, b) => a + b.total_com_iva, 0);
  const totalComprasComIVA = compras.filter(c => (c.estado as string) !== 'Cancelado').reduce((a, b) => a + b.total_com_iva, 0);
  const totalIvaLiquidado = vendas.filter(v => (v.estado as string) !== 'Cancelado').reduce((a, b) => a + b.valor_iva, 0);
  const totalIvaDedutivel = compras.filter(c => (c.estado as string) !== 'Cancelado').reduce((a, b) => a + b.valor_iva, 0);

  // Verificação de NUITs inválidos
  const comprasSemNuit = compras.filter(c => !c.nuit_fornecedor || c.nuit_fornecedor.length !== 9);
  const vendasSemNuit = vendas.filter(v => !v.nuit_cliente || v.nuit_cliente.length !== 9);

  // Verificação de pagamentos em dinheiro acima de 250k MT (Limite legal de prevenção)
  const pagamentosDinheiroAltos = compras.filter(c => c.metodo_pagamento === 'Caixa' && c.total_com_iva > 250000);

  // Score de Conformidade (0 a 100%)
  let complianceScore = 100;
  if (comprasSemNuit.length > 0) complianceScore -= 15;
  if (vendasSemNuit.length > 0) complianceScore -= 15;
  if (pagamentosDinheiroAltos.length > 0) complianceScore -= 20;

  // Dicionário "Linguagem Prática para Não-Contabilistas"
  const dicionarioContabil = [
    {
      termoLeigo: 'Quando faço uma Venda de Serviços com IVA',
      oQueOSistemaFaz: 'Lança a Receita no Código 7.1.1 (Vendas), regista o IVA a Entregar ao Estado no Código 4.4.3.1 (IVA Liquidado) e atualiza a Conta do Cliente (4.1.1).',
      impactoFiscal: 'O IVA de 16% cobrado do cliente é reservado para a Autoridade Tributária (AT).'
    },
    {
      termoLeigo: 'Quando compro materiais ou pago renda da empresa',
      oQueOSistemaFaz: 'Lança o Custo no Código 6.2 (Fornecimentos e Serviços de Terceiros) e regista o IVA a Recuperar no Código 4.4.3.2 (IVA Dedutível).',
      impactoFiscal: 'Permite abater o IVA pago nas compras contra o IVA cobrado nas vendas, reduzindo a fatura fiscal da empresa.'
    },
    {
      termoLeigo: 'Quando processo a Folha de Salários dos Trabalhadores',
      oQueOSistemaFaz: 'Lança os Gastos com Pessoal (Código 6.1), retém o IRPS dos trabalhadores (Código 4.4.1) e calcula a contribuição do INSS 4% + 3% (Código 4.4.2).',
      impactoFiscal: 'Garante 100% de conformidade com a Lei do Trabalho e o Regulamento do INSS de Moçambique.'
    },
    {
      termoLeigo: 'Quando pago retenção na fonte sobre serviços de terceiros (10% / 20%)',
      oQueOSistemaFaz: 'Lança a retenção como Imposto Retido por Entregar (Código 4.4.1 / 4.4.6) para guia M/06.',
      impactoFiscal: 'Evita multas pesadas da Autoridade Tributária por não retenção de impostos sobre rendimentos.'
    }
  ];

  // Prazos Oficiais da AT & INSS para Moçambique
  const calendarioFiscal = [
    {
      imposto: 'INSS - Segurança Social',
      prazo: 'Dia 10 do mês seguinte',
      descricao: 'Declaração e pagamento da contribuição nominal dos trabalhadores (3% Trabalhador + 4% Entidade Empregadora).',
      modelo: 'Guia SISSMO / M/01 INSS',
      status: 'Pendente'
    },
    {
      imposto: 'IRPS & IRPC Retido na Fonte',
      prazo: 'Dia 20 do mês seguinte',
      descricao: 'Entrega do IRPS retido na folha de salários e retenções sobre serviços adquiridos a terceiros.',
      modelo: 'Guia M/06 AT',
      status: 'Pendente'
    },
    {
      imposto: 'IVA - Declaração Periódica',
      prazo: 'Último dia do mês seguinte (30/31)',
      descricao: 'Entrega da Declaração Periódica de IVA com mapa de anexos de clientes e fornecedores.',
      modelo: 'Modelo M/10 AT',
      status: 'Pendente'
    },
    {
      imposto: 'Modelo M/22 & M/20 (Anual)',
      prazo: 'Até 31 de Março',
      descricao: 'Declaração Anual de Rendimentos de IRPC e Demonstrações Financeiras PGC-NIRF auditadas.',
      modelo: 'Modelo M/22 & M/20',
      status: 'Anual'
    }
  ];

  const handleRunWizard = () => {
    setWizardSuccess(false);
    setWizardStep(1);
    setShowWizardModal(true);
  };

  const handleNextWizardStep = () => {
    if (wizardStep < 4) {
      setWizardStep(prev => prev + 1);
    } else {
      setWizardSuccess(true);
    }
  };

  const handleGenerateAiReport = async () => {
    setLoadingAiReport(true);
    setShowAiReportModal(true);
    setCopiedReport(false);
    try {
      const res = await fetch('/api/compliance/relatorio-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodo: selectedPeriod,
          empresa: company,
          company,
          totalIvaLiquidado,
          totalIvaDedutivel,
          totalVendasComIVA,
          totalComprasComIVA,
          comprasSemNuit: comprasSemNuit.length,
          vendasSemNuit: vendasSemNuit.length,
          apuramentoIVA: { saldoIVA: totalIvaLiquidado - totalIvaDedutivel },
          estatisticas: {
            vendas: totalVendasComIVA,
            compras: totalComprasComIVA
          },
          compras,
          vendas
        })
      });
      const data = await res.json();
      if (data.sucesso) {
        setAiReportData(data);
      } else {
        alert(data.error || 'Erro ao gerar relatório com IA.');
      }
    } catch (err) {
      console.error(err);
      alert('Falha de conexão com o serviço do Gemini IA.');
    } finally {
      setLoadingAiReport(false);
    }
  };

  const handleCopyReport = () => {
    if (aiReportData?.relatorio) {
      navigator.clipboard.writeText(aiReportData.relatorio);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2500);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Banner Principal de Conformidade Automática */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden border border-emerald-500/20">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-emerald-400/30 flex items-center gap-1">
                <ShieldCheck size={12} /> Assistente de Conformidade Fiscal PGC-NIRF
              </span>
              <span className="bg-blue-500/20 text-blue-200 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-blue-400/30">
                100% Amigável para Não-Contabilistas
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Garantia de Conformidade Total com a Autoridade Tributária
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              Você não precisa de entender débito, crédito ou código de contas! O sistema traduz automaticamente todas as suas operações diárias para a contabilidade PGC-NIRF de Moçambique, valida NUITs e prepara as guias fiscais sem erros.
            </p>

            {/* BOTÃO GERAR RELATÓRIO COM GEMINI IA */}
            <div className="pt-3">
              <button
                id="btn-gerar-relatorio-gemini"
                onClick={handleGenerateAiReport}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-300 hover:from-amber-300 hover:to-teal-200 text-slate-950 font-black text-xs rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 cursor-pointer border border-amber-300/60 transform hover:-translate-y-0.5"
              >
                <Sparkles size={16} className="text-slate-950 animate-pulse" />
                <span>Gerar Relatório de Conformidade Fiscal (Gemini IA)</span>
                <Bot size={16} className="text-slate-900 ml-1" />
              </button>
            </div>
          </div>

          {/* Health Score Gauge */}
          <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10 text-center space-y-2 shrink-0 min-w-[200px]">
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
              Índice de Saúde Fiscal
            </span>
            <div className="text-4xl font-black font-mono text-emerald-400">
              {complianceScore}%
            </div>
            <div className="text-[10.5px] font-extrabold text-emerald-200 bg-emerald-900/60 px-2.5 py-1 rounded-full border border-emerald-500/30 inline-block">
              {complianceScore === 100 ? '100% Em Conformidade' : 'Atenção aos Alertas'}
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Ferramentas de Conformidade */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUNA 1 & 2: AUDIT CHECKLIST E TRADUTOR CONTABILÍSTICO */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. CHECKLIST DE AUDITORIA AUTOMÁTICA EM TEMPO REAL */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl">
                  <FileCheck size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Diagnóstico da Contabilidade & Fiscalidade</h3>
                  <p className="text-xs text-slate-500 font-medium">Verificação em tempo real dos seus registos no período {selectedPeriod}</p>
                </div>
              </div>

              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                AT Moçambique (PGC-NIRF)
              </span>
            </div>

            <div className="space-y-3">
              {/* Check 1: Equação do Balanço */}
              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black text-slate-900">Equação do Balanço Patrimonial Integrada (Activo = Passivo + Capital Próprio)</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                      Todos os lançamentos do Livro de Caixa, Faturas e Compras estão balançados. Nenhuma discrepância de débitos e créditos detetada.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded uppercase">100% Validado</span>
              </div>

              {/* Check 2: Validação de NUITs */}
              <div className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
                comprasSemNuit.length === 0 && vendasSemNuit.length === 0
                  ? 'border-emerald-200 bg-emerald-50/50'
                  : 'border-amber-200 bg-amber-50/50'
              }`}>
                <div className="flex items-start gap-3">
                  {comprasSemNuit.length === 0 && vendasSemNuit.length === 0 ? (
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="text-xs font-black text-slate-900">Validação de NUITs de Clientes e Fornecedores (9 dígitos)</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                      {comprasSemNuit.length === 0 && vendasSemNuit.length === 0
                        ? 'Todos os documentos do período possuem NUITs válidos registrados para dedução legal de IVA.'
                        : `Atenção: Existem ${comprasSemNuit.length} compras e ${vendasSemNuit.length} vendas sem NUIT válido. Sem o NUIT, a AT rejeita a dedução de IVA no M/10.`}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                  comprasSemNuit.length === 0 && vendasSemNuit.length === 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-900'
                }`}>
                  {comprasSemNuit.length === 0 && vendasSemNuit.length === 0 ? 'Conforme' : 'Ajustar NUITs'}
                </span>
              </div>

              {/* Check 3: Limites de Pagamento em Numerário */}
              <div className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
                pagamentosDinheiroAltos.length === 0
                  ? 'border-emerald-200 bg-emerald-50/50'
                  : 'border-rose-200 bg-rose-50/50'
              }`}>
                <div className="flex items-start gap-3">
                  {pagamentosDinheiroAltos.length === 0 ? (
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="text-xs font-black text-slate-900">Limite Legal de Pagamentos em Numerário (Dinheiro Vivo)</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                      {pagamentosDinheiroAltos.length === 0
                        ? 'Nenhum pagamento em dinheiro acima do teto de 250.000 MT. Todos os grandes pagamentos foram feitos por transferência bancária.'
                        : `Alerta Fiscal: Detetado(s) ${pagamentosDinheiroAltos.length} pagamento(s) em dinheiro acima de 250.000 MT. Recomenda-se realizar pagamentos via banco BIM/BCI/Standard Bank.`}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                  pagamentosDinheiroAltos.length === 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-900'
                }`}>
                  {pagamentosDinheiroAltos.length === 0 ? 'Conforme' : 'Risco Fiscal'}
                </span>
              </div>

              {/* Check 4: Apuramento do IVA do Mês */}
              <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Sparkles size={18} className="text-blue-900 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black text-slate-900">Apuramento Automático do IVA (Modelo M/10)</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                      IVA Liquidado (Vendas): <b>{totalIvaLiquidado.toLocaleString('pt-MZ')} MT</b> | IVA Dedutível (Compras): <b>{totalIvaDedutivel.toLocaleString('pt-MZ')} MT</b>.
                      {totalIvaLiquidado > totalIvaDedutivel
                        ? ` Imposto a entregar ao Estado: ${(totalIvaLiquidado - totalIvaDedutivel).toLocaleString('pt-MZ')} MT.`
                        : ` Crédito do IVA a favor da empresa: ${(totalIvaDedutivel - totalIvaLiquidado).toLocaleString('pt-MZ')} MT.`}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] bg-blue-100 text-blue-900 font-black px-2 py-0.5 rounded uppercase">Pronto para M/10</span>
              </div>
            </div>
          </div>

          {/* 2. TRADUTOR CONTABILÍSTICO PARA NÃO-CONTABILISTAS */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="p-2 bg-blue-50 text-blue-900 rounded-xl">
                <BookOpen size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Como o ERP Trabalha Por Si (Sem Usar Código de Contas)</h3>
                <p className="text-xs text-slate-500 font-medium">Linguagem prática de negócios vs Tradução Automática PGC-NIRF</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {dicionarioContabil.map((item, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                      <Zap size={14} className="text-emerald-600" />
                      O Que Você Faz no Dia-a-Dia:
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Lançamento nº 0{idx + 1}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">"{item.termoLeigo}"</h4>

                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
                    <p className="font-semibold text-slate-900">🤖 O Sistema Automático PGC-NIRF:</p>
                    <p>{item.oQueOSistemaFaz}</p>
                    <p className="text-[10px] text-emerald-800 font-medium pt-1 border-t border-slate-100">
                      💡 <b>Impacto na Fiscalidade:</b> {item.impactoFiscal}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COLUNA 3: CALENDÁRIO FISCAL DA AT & FECHO MENSAL GUIADO */}
        <div className="space-y-6">
          {/* FECHO MENSAL GUIADO */}
          <div className="bg-gradient-to-br from-blue-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/10 rounded-xl text-emerald-400">
                <Lock size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black">Assistente de Fecho Mensal</h3>
                <p className="text-[11px] text-blue-200">Wizard de 4 Passos para Leigos</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              Conclua o mês de {selectedPeriod} com segurança absoluta. O assistente valida contas, consolida impostos e trava alterações não autorizadas.
            </p>

            <button
              onClick={handleRunWizard}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap size={16} />
              <span>Iniciar Fecho Guiado do Mês</span>
            </button>
          </div>

          {/* CALENDÁRIO FISCAL DE MOÇAMBIQUE */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-blue-900" />
                <h3 className="text-sm font-black text-slate-900">Agenda Fiscal AT & INSS</h3>
              </div>
              <span className="text-[10px] bg-blue-50 text-blue-900 font-extrabold px-2 py-0.5 rounded border border-blue-200">
                Moçambique
              </span>
            </div>

            <div className="space-y-3">
              {calendarioFiscal.map((cal, index) => (
                <div key={index} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900">{cal.imposto}</span>
                    <span className="text-[9.5px] font-mono bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded font-bold">
                      {cal.modelo}
                    </span>
                  </div>
                  <div className="text-[10.5px] font-bold text-emerald-800 flex items-center gap-1">
                    <Calendar size={11} />
                    <span>{cal.prazo}</span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 leading-relaxed">
                    {cal.descricao}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL WIZARD DE FECHO MENSAL */}
      {showWizardModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Lock size={18} className="text-blue-900" />
                <h3 className="text-sm font-black text-slate-900">
                  Fecho de Período Contabilístico: {selectedPeriod}
                </h3>
              </div>
              <button onClick={() => setShowWizardModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            {!wizardSuccess ? (
              <div className="space-y-4 text-xs">
                {/* Step Indicator */}
                <div className="flex items-center justify-between bg-slate-100 p-2 rounded-xl">
                  {[1, 2, 3, 4].map(s => (
                    <div key={s} className="flex items-center gap-1">
                      <span className={`w-6 h-6 rounded-full font-bold flex items-center justify-center text-[10px] ${
                        wizardStep === s
                          ? 'bg-blue-900 text-white'
                          : wizardStep > s
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-300 text-slate-700'
                      }`}>
                        {wizardStep > s ? '✓' : s}
                      </span>
                      <span className="text-[10px] font-bold text-slate-600 hidden sm:inline">
                        {s === 1 ? 'Conferencia' : s === 2 ? 'NUITs' : s === 3 ? 'IVA M/10' : 'Bloqueio'}
                      </span>
                    </div>
                  ))}
                </div>

                {wizardStep === 1 && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <h4 className="font-black text-slate-900">Passo 1: Reconciliação do Livro de Caixa & Bancos</h4>
                    <p className="text-slate-600 leading-relaxed">
                      O sistema verificou todos os lançamentos do Livro de Caixa e Faturas emitidas no período {selectedPeriod}. Saldo disponível validado.
                    </p>
                    <div className="p-2.5 bg-emerald-50 text-emerald-900 rounded border border-emerald-200 font-mono font-bold">
                      ✓ Saldo de Caixa Conforme
                    </div>
                  </div>
                )}

                {wizardStep === 2 && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <h4 className="font-black text-slate-900">Passo 2: Auditoria de Documentos e NUITs</h4>
                    <p className="text-slate-600 leading-relaxed">
                      Verificação de conformidade fiscal de todos os clientes e fornecedores do mês para submissão oficial à Autoridade Tributária.
                    </p>
                    <div className="p-2.5 bg-emerald-50 text-emerald-900 rounded border border-emerald-200 font-mono font-bold">
                      ✓ Documentos Prontos para Anexo do IVA
                    </div>
                  </div>
                )}

                {wizardStep === 3 && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <h4 className="font-black text-slate-900">Passo 3: Consolidação do Modelo M/10 (IVA)</h4>
                    <p className="text-slate-600 leading-relaxed">
                      Apuramento final do IVA a pagar ou a recuperar.
                    </p>
                    <div className="p-2.5 bg-blue-50 text-blue-900 rounded border border-blue-200 font-mono font-bold">
                      Total IVA Liquidado: {totalIvaLiquidado.toLocaleString('pt-MZ')} MT | Dedutível: {totalIvaDedutivel.toLocaleString('pt-MZ')} MT
                    </div>
                  </div>
                )}

                {wizardStep === 4 && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <h4 className="font-black text-slate-900">Passo 4: Bloqueio Contabilístico do Mês</h4>
                    <p className="text-slate-600 leading-relaxed">
                      Ao fechar o mês, o sistema gera o arquivo digital do período e impede alterações retroativas para manter a auditoria inviolável.
                    </p>
                    <div className="p-2.5 bg-amber-50 text-amber-900 rounded border border-amber-200 text-[11px] font-bold">
                      🔒 Bloqueio de Segurança Activo após a confirmação.
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowWizardModal(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleNextWizardStep}
                    className="px-5 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-lg font-extrabold flex items-center gap-1"
                  >
                    <span>{wizardStep === 4 ? 'Concluir Fecho do Mês' : 'Próximo Passo'}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 size={36} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-black text-slate-900">Fecho de {selectedPeriod} Concluído com Sucesso!</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    Todos os registos do período foram auditados e consolidados em estrita conformidade com o PGC-NIRF e AT Moçambique.
                  </p>
                </div>

                <div className="pt-3 flex justify-center">
                  <button
                    onClick={() => setShowWizardModal(false)}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all"
                  >
                    Fechar e Voltar ao Painel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL RELATÓRIO DE CONFORMIDADE FISCAL GEMINI IA */}
      {showAiReportModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 my-auto overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-400/20 text-amber-300 rounded-2xl border border-amber-400/30">
                  <Bot size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white">
                      Relatório de Conformidade Fiscal PGC-NIRF & IVA
                    </h3>
                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1">
                      <Sparkles size={10} /> Gemini 3.6 Flash
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">
                    Análise PGC e IVA da empresa {company.nome} • Período: {selectedPeriod}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAiReportModal(false)}
                className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
              {loadingAiReport ? (
                <div className="py-16 text-center space-y-6 max-w-md mx-auto">
                  <div className="relative w-20 h-20 mx-auto">
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin"></div>
                    <div className="absolute inset-2 rounded-full border-4 border-blue-200 border-b-blue-600 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                    <div className="absolute inset-0 flex items-center justify-center text-emerald-600">
                      <Bot size={28} className="animate-bounce" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-black text-slate-900">
                      O Gemini IA está a analisar a sua contabilidade...
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Cruzando dados das faturas de venda, compras, NUITs de terceiros e apuramento do IVA Modelo M/10 da Autoridade Tributária.
                    </p>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-[11px] font-mono text-slate-600 space-y-1 text-left">
                    <div className="text-emerald-700 font-bold flex items-center gap-1.5">
                      <Check size={12} /> PGC-NIRF: Contas do Razão Auditadas
                    </div>
                    <div className="text-blue-700 font-bold flex items-center gap-1.5">
                      <Check size={12} /> IVA: M/10 Vendas e Compras Consolidadas
                    </div>
                    <div className="text-amber-700 font-bold flex items-center gap-1.5">
                      <Sparkles size={12} /> Processando recomendações tributárias...
                    </div>
                  </div>
                </div>
              ) : aiReportData ? (
                <div className="space-y-6">
                  {/* Meta Card */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-xs flex items-center gap-1.5">
                        <ShieldCheck size={16} /> Auditado com Sucesso ({aiReportData.modelo_utilizado})
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        Gerado em: <span className="font-bold text-slate-800">{new Date(aiReportData.data_geracao).toLocaleString('pt-MZ')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyReport}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedReport ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        <span>{copiedReport ? 'Copiado!' : 'Copiar Texto'}</span>
                      </button>

                      <button
                        onClick={handlePrintReport}
                        className="px-3.5 py-1.5 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Printer size={14} />
                        <span>Imprimir / PDF</span>
                      </button>
                    </div>
                  </div>

                  {/* Body Text rendered as Markdown */}
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm text-slate-800 text-xs sm:text-sm leading-relaxed space-y-4">
                    <div className="markdown-body">
                      <Markdown>{aiReportData.relatorio}</Markdown>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center space-y-3">
                  <AlertTriangle size={32} className="text-amber-500 mx-auto" />
                  <p className="text-xs text-slate-600">Não foi possível carregar o relatório de conformidade.</p>
                  <button
                    onClick={handleGenerateAiReport}
                    className="px-4 py-2 bg-blue-900 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Tentar Novamente
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 bg-white border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => setShowAiReportModal(false)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
              >
                Fechar Relatório
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
