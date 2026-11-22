/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Wallet,
  X,
  Printer
} from 'lucide-react';
import {
  ResponsiveContainer,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ComposedChart,
  Line
} from 'recharts';
import { Employee, CompanyData, PayrollSummary, PaymentLog } from '../types';
import {
  vendasStore,
  comprasStore,
  caixaStore,
  getCurrentPeriod,
  getAvailablePeriods,
  calcularFolhaSalario
} from '../db_tax';
import { useToast } from '../context/ToastContext';
import PayslipA4Modal, { PayslipA4Data } from './PayslipA4Modal';

interface DashboardProps {
  employees: Employee[];
  company: CompanyData;
  summary: PayrollSummary;
  logs: PaymentLog[];
  onReload: () => void;
  selectedPeriod: string;
  onResetCosts?: () => void;
  userRole?: string | null;
  onNavigateTab?: (tab: string, subTab?: string) => void;
}

function formatMzn(value: number): string {
  return `${value.toLocaleString('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} MT`;
}

export default function Dashboard({
  employees,
  company,
  summary,
  logs,
  onReload,
  selectedPeriod,
  userRole,
  onNavigateTab
}: DashboardProps) {
  const { showError } = useToast();
  const periodosDisponiveis = getAvailablePeriods();
  const [selectedDashboardPeriod, setSelectedDashboardPeriod] = useState<string>(
    () => selectedPeriod || getCurrentPeriod()
  );

  useEffect(() => {
    if (selectedPeriod) {
      setSelectedDashboardPeriod(selectedPeriod);
    }
  }, [selectedPeriod]);

  const [activeChartTab, setActiveChartTab] = useState<'dre' | 'composicao' | 'saldo'>('dre');
  const [modalDetalhesMetrics, setModalDetalhesMetrics] = useState<
    'saldo' | 'receitas' | 'custos' | 'despesas' | 'lucro' | null
  >(null);
  const [selectedPayslipA4, setSelectedPayslipA4] = useState<PayslipA4Data | null>(null);

  const handleOpenLogPayslipA4 = (log: PaymentLog) => {
    const matchedEmp =
      employees.find((e) => e.id === log.employeeId) ||
      employees.find((e) => e.nome.toLowerCase() === log.employeeName.toLowerCase());
    const baseSalary = matchedEmp ? matchedEmp.salario_base : Math.round((log.salarioLiquido / 0.88) * 100) / 100;
    const deps = matchedEmp ? matchedEmp.numero_dependentes : 0;
    const calc = calcularFolhaSalario(baseSalary, 0, deps);
    const shortId = (log.employeeId || log.id || '001').replace(/[^A-Z0-9]/gi, '').slice(-4).toUpperCase() || '001';
    const pdfUrl = `/download/recibo_${log.employeeId}_${log.periodo.replace(/\s+/g, '_')}.pdf`;

    setSelectedPayslipA4({
      numeroRecibo: `RV-${log.periodo.replace(/\s+/g, '').slice(0, 6).toUpperCase()}/${shortId}`,
      periodo: log.periodo,
      dataEmissao: log.timestamp ? new Date(log.timestamp).toLocaleDateString('pt-PT') : new Date().toLocaleDateString('pt-PT'),
      empresa: {
        nome: company.nome || 'ClickPay Moçambique, Lda',
        nuit: company.nuit,
        nuel: company.nuel,
        endereco: company.endereco,
        provincia: company.provincia,
        email: company.email,
        telefone: company.telefone,
        logo: company.logo
      },
      colaborador: {
        nome: log.employeeName,
        cargo: matchedEmp?.cargo || 'Colaborador',
        nuit: matchedEmp?.nuit,
        inss_numero: matchedEmp?.inss_numero,
        numero_dependentes: deps,
        carteira_movel: log.carteira_movel || matchedEmp?.carteira_movel
      },
      valores: {
        salarioBase: baseSalary,
        descontoFaltas: matchedEmp ? calc.descontoFaltas : 0,
        diasFaltas: 0,
        inssTrabalhador: matchedEmp ? calc.inssTrabalhador : Math.round(baseSalary * 0.03 * 100) / 100,
        inssEmpresa: matchedEmp ? calc.inssEmpresa : Math.round(baseSalary * 0.04 * 100) / 100,
        irpsConstatado: matchedEmp
          ? calc.irpsConstatado
          : Math.max(0, Math.round((baseSalary - baseSalary * 0.03 - log.salarioLiquido) * 100) / 100),
        descontoVales: 0,
        totalDescontos: matchedEmp ? calc.totalDescontos : Math.max(0, Math.round((baseSalary - log.salarioLiquido) * 100) / 100),
        salarioLiquido: log.salarioLiquido
      },
      pdfDownloadUrl: pdfUrl
    });
  };

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  })();

  // 1. Receitas reais do período
  const vendasFiltradas = vendasStore.filter(
    (v) =>
      v.estado !== 'Anulado' &&
      (selectedDashboardPeriod === 'todos' ||
        v.periodo.toLowerCase() === selectedDashboardPeriod.toLowerCase())
  );
  const totalReceitasComIVA = vendasFiltradas.reduce((a, b) => a + (b.total_com_iva || 0), 0);
  const totalReceitasBase = vendasFiltradas.reduce((a, b) => a + (b.valor_base || 0), 0);
  const totalIvaLiquidadoVendas = vendasFiltradas.reduce((a, b) => a + (b.valor_iva || 0), 0);

  // 2. Custos diretos reais
  const comprasFiltradas = comprasStore.filter(
    (c) =>
      c.estado !== 'Cancelado' &&
      (selectedDashboardPeriod === 'todos' ||
        c.periodo.toLowerCase() === selectedDashboardPeriod.toLowerCase())
  );
  const totalCustosDirectos = comprasFiltradas
    .filter(
      (c) =>
        c.categoria === 'Insumos' ||
        c.categoria === 'Equipamentos' ||
        c.categoria === 'Servicos'
    )
    .reduce((a, b) => a + (b.total_com_iva || 0), 0);

  // 3. Despesas operacionais e folha salarial
  const caixaFiltrado = caixaStore.filter(
    (c) =>
      selectedDashboardPeriod === 'todos' ||
      c.periodo.toLowerCase() === selectedDashboardPeriod.toLowerCase()
  );
  const totalDespesasOperacionais = caixaFiltrado
    .filter((c) => c.tipo === 'Saida' && c.categoria !== 'Compra')
    .reduce((a, b) => a + (b.valor || 0), 0);

  const totalCustoFolhaPessoal = summary.kpis?.custoEmpresaTotal || 0;
  const totalDespesasGlobal = totalDespesasOperacionais + totalCustoFolhaPessoal;

  // 4. Resultado líquido real
  const lucroLiquidoRealTime =
    totalReceitasComIVA - totalCustosDirectos - totalDespesasGlobal;
  const margemLucroPercent =
    totalReceitasComIVA > 0
      ? ((lucroLiquidoRealTime / totalReceitasComIVA) * 100).toFixed(1)
      : '0.0';

  // 5. Saldo real de caixa
  const totalEntradasCaixa = caixaFiltrado
    .filter((c) => c.tipo === 'Entrada')
    .reduce((a, b) => a + (b.valor || 0), 0);
  const totalSaidasCaixa = caixaFiltrado
    .filter((c) => c.tipo === 'Saida')
    .reduce((a, b) => a + (b.valor || 0), 0);
  const saldoContaTotalRealTime = totalEntradasCaixa - totalSaidasCaixa;

  const saldoBIM = Math.round(saldoContaTotalRealTime * 0.65);
  const saldoMPesa = Math.round(saldoContaTotalRealTime * 0.25);
  const saldoCaixaLocal = Math.round(saldoContaTotalRealTime * 0.1);

  // Série histórica baseada nos dados reais registados
  const mesesAbreviados = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez'
  ];
  const dataHoje = new Date();
  const hasFinancialData =
    totalReceitasComIVA !== 0 ||
    totalCustosDirectos !== 0 ||
    totalDespesasGlobal !== 0 ||
    saldoContaTotalRealTime !== 0;

  const dadosGraficoDRE = [5, 4, 3, 2, 1, 0].map((offset) => {
    const d = new Date(dataHoje.getFullYear(), dataHoje.getMonth() - offset, 1);
    const mName =
      offset === 0
        ? `${mesesAbreviados[d.getMonth()]} (Atual)`
        : mesesAbreviados[d.getMonth()];
    const monthLabelLong = `${
      [
        'Janeiro',
        'Fevereiro',
        'Março',
        'Abril',
        'Maio',
        'Junho',
        'Julho',
        'Agosto',
        'Setembro',
        'Outubro',
        'Novembro',
        'Dezembro'
      ][d.getMonth()]
    } ${d.getFullYear()}`.toLowerCase();

    if (offset === 0) {
      return {
        mes: mName,
        receitas: totalReceitasComIVA,
        custos: totalCustosDirectos,
        despesas: totalDespesasGlobal,
        lucro: lucroLiquidoRealTime,
        saldo: saldoContaTotalRealTime
      };
    }

    const recMes = vendasStore
      .filter((v) => v.estado !== 'Anulado' && v.periodo.toLowerCase() === monthLabelLong)
      .reduce((a, b) => a + (b.total_com_iva || 0), 0);
    const cusMes = comprasStore
      .filter((c) => c.estado !== 'Cancelado' && c.periodo.toLowerCase() === monthLabelLong)
      .reduce((a, b) => a + (b.total_com_iva || 0), 0);
    const entMes = caixaStore
      .filter((c) => c.tipo === 'Entrada' && c.periodo.toLowerCase() === monthLabelLong)
      .reduce((a, b) => a + (b.valor || 0), 0);
    const saiMes = caixaStore
      .filter((c) => c.tipo === 'Saida' && c.periodo.toLowerCase() === monthLabelLong)
      .reduce((a, b) => a + (b.valor || 0), 0);
    const despMes = caixaStore
      .filter(
        (c) =>
          c.tipo === 'Saida' &&
          c.categoria !== 'Compra' &&
          c.periodo.toLowerCase() === monthLabelLong
      )
      .reduce((a, b) => a + (b.valor || 0), 0);

    return {
      mes: mName,
      receitas: recMes,
      custos: cusMes,
      despesas: despMes,
      lucro: recMes - cusMes - despMes,
      saldo: entMes - saiMes
    };
  });

  const dadosComposicao = [
    { name: 'Faturação', value: totalReceitasComIVA, color: '#047857' },
    { name: 'Custos Diretos', value: totalCustosDirectos, color: '#b45309' },
    { name: 'Folha & INSS', value: totalCustoFolhaPessoal, color: '#1e3a8a' },
    { name: 'OPEX', value: totalDespesasOperacionais, color: '#be123c' },
    { name: 'Resultado Líquido', value: Math.max(0, lucroLiquidoRealTime), color: '#0f172a' }
  ];

  // Contratos laborais (Lei nº 13/2023)
  const [contratos, setContratos] = useState<any[]>([]);

  const carregarContratos = async () => {
    try {
      const usuarioSimulado = JSON.stringify({
        funcao: 'CLIENTE_EMPRESA',
        empresa_id: localStorage.getItem('paytek_company_id') || 'emp_piloto_01'
      });
      const res = await fetch('/api/clientes/listar-contratos', {
        headers: { 'usuario-simulado': usuarioSimulado }
      });
      if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
        const data = await res.json();
        setContratos(data);
      }
    } catch {
      // Silencioso caso offline/estático
    }
  };

  useEffect(() => {
    carregarContratos();
  }, [employees]);

  // Carteira Fintech & Processamento em Lote
  const [saldoCarteira, setSaldoCarteira] = useState<number>(0);
  const [loadingCarteira, setLoadingCarteira] = useState(false);
  const [autopilotRunning, setAutopilotRunning] = useState(false);
  const [autopilotResult, setAutopilotResult] = useState<any | null>(null);
  const [autopilotError, setAutopilotError] = useState<string | null>(null);
  const [autopilotLogs, setAutopilotLogs] = useState<string[]>([]);

  const carregarCarteira = async () => {
    setLoadingCarteira(true);
    try {
      const res = await fetch('/api/fintech/carteira');
      if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
        const data = await res.json();
        setSaldoCarteira(data.saldo_disponivel_mz || 0);
      }
    } catch {
      // Fallback silencioso
    } finally {
      setLoadingCarteira(false);
    }
  };

  const dispararAutopilot = async () => {
    setAutopilotRunning(true);
    setAutopilotError(null);
    setAutopilotResult(null);
    setAutopilotLogs([
      `${new Date().toLocaleTimeString('pt-MZ')} · A iniciar processamento salarial do período ${selectedPeriod}.`
    ]);

    try {
      const res = await fetch('/api/fintech/autopilot/executar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodo: selectedPeriod,
          bancoOrigem: 'Millennium BIM',
          autoRecharge: true
        })
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Serviço de liquidação indisponível neste ambiente.');
      }

      const data = await res.json();
      if (!res.ok || data.sucesso === false) {
        throw new Error(data.erro || 'Não foi possível executar o pagamento da folha.');
      }

      setAutopilotLogs((prev) => [
        ...prev,
        `${new Date().toLocaleTimeString('pt-MZ')} · Liquidação concluída. Saldo remanescente: ${formatMzn(data.novoSaldoCarteira || 0)}`
      ]);
      setAutopilotResult(data);
      carregarCarteira();
      onReload();
    } catch (err: any) {
      const msg = err.message || 'Erro ao processar pagamentos.';
      setAutopilotError(msg);
      setAutopilotLogs((prev) => [...prev, `${new Date().toLocaleTimeString('pt-MZ')} · Erro: ${msg}`]);
    } finally {
      setAutopilotRunning(false);
    }
  };

  useEffect(() => {
    carregarCarteira();
  }, [summary, employees]);

  const [loadingAviso, setLoadingAviso] = useState<string | null>(null);
  const handleEmitirAvisoPrevio = async (
    empId: string,
    empName: string,
    empInss: string,
    empCargo: string
  ) => {
    setLoadingAviso(empId);
    try {
      const res = await fetch('/api/contratos/emitir-aviso-previo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dadosEmpresa: {
            nome: company.nome || 'Empresa Lda',
            nuit: company.nuit || '400555321',
            endereco: company.endereco || 'Av. Eduardo Mondlane, Maputo'
          },
          dadosFuncionario: {
            nome: empName,
            cargo: empCargo,
            inss_numero: empInss
          },
          dadosContrato: {
            data_fim: '25 de Julho de 2026',
            dia_atual: '25',
            mes_atual: 'Julho',
            ano_atual: '2026'
          }
        })
      });

      if (!res.ok) throw new Error('Falha ao emitir o aviso prévio.');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `aviso_previo_${empInss.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      showError(err.message || 'Erro ao gerar o aviso prévio em PDF.');
    } finally {
      setLoadingAviso(null);
    }
  };

  const downloadEndpoint = async (url: string, filename: string, errMsg: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(errMsg);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      showError(err.message || errMsg);
    }
  };

  const handleDownloadMapaPDF = () =>
    downloadEndpoint(
      `/api/exportar/mapa-pdf?periodo=${encodeURIComponent(selectedPeriod)}`,
      `mapa_salarios_${selectedPeriod.replace(/\s+/g, '_')}.pdf`,
      'Falha ao gerar o PDF de mapa de salários.'
    );

  const handleDownloadMapaExcel = () =>
    downloadEndpoint(
      `/api/exportar/mapa-excel?periodo=${encodeURIComponent(selectedPeriod)}`,
      `mapa_salarios_${selectedPeriod.replace(/\s+/g, '_')}.csv`,
      'Falha ao gerar o Excel de mapa de salários.'
    );

  const handleDownloadHistoricoPDF = () =>
    downloadEndpoint(
      `/api/exportar/historico-pdf`,
      `relatorio_historico_financeiro.pdf`,
      'Falha ao gerar o PDF de histórico financeiro.'
    );

  const contratosCriticos = contratos.filter((c: any) => c.auditoria?.statusRisco === 'VERMELHO');
  const contratosAviso = contratos.filter((c: any) => c.auditoria?.statusRisco === 'AMARELO');

  return (
    <div id="dashboard_panel" className="space-y-6">
      {/* 1. Workspace Header */}
      <div className="bg-white rounded-xl px-5 py-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 space-y-0.5">
          <p className="text-[11px] font-medium text-slate-500">
            Visão Geral · {company.nome || 'ClickPay Moçambique'}
          </p>
          <h1 className="text-lg sm:text-xl font-semibold text-slate-950 tracking-tight truncate">
            {greeting}, {company.nome ? company.nome.split(' ')[0] : 'ClickPay'}
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs text-slate-700">
            <Calendar size={14} className="text-slate-500 shrink-0" />
            <span className="font-medium whitespace-nowrap">
              {selectedPeriod || getCurrentPeriod()}
            </span>
          </div>

          <select
            value={selectedDashboardPeriod}
            onChange={(e) => setSelectedDashboardPeriod(e.target.value)}
            aria-label="Selecionar período de análise"
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-900 cursor-pointer"
          >
            {periodosDisponiveis.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onReload}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Atualizar dados do painel"
          >
            <RefreshCw size={13} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* 2. Demonstração de Resultados & Tesouraria */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
          <div className="space-y-0.5">
            <h2 className="text-base font-semibold text-slate-950 tracking-tight">
              Demonstração de Resultados &amp; Tesouraria
            </h2>
            <p className="text-xs text-slate-500">
              Consolidação de faturação, compras, folha salarial ({employees.length}{' '}
              {employees.length === 1 ? 'colaborador' : 'colaboradores'}) e movimentos de caixa.
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap">
            {selectedDashboardPeriod === 'todos' ? 'Acumulado' : selectedDashboardPeriod}
          </span>
        </div>

        {/* 5 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Saldo */}
          <button
            type="button"
            onClick={() => setModalDetalhesMetrics('saldo')}
            className="text-left bg-white hover:bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 cursor-pointer transition-colors"
          >
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-[11px] font-medium">Saldo Disponível</span>
              <Wallet size={14} className="text-blue-900" />
            </div>
            <p className="text-lg font-semibold text-slate-950 font-mono tabular-nums tracking-tight">
              {formatMzn(saldoContaTotalRealTime)}
            </p>
            <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              Bancos &amp; Carteiras
            </p>
          </button>

          {/* Receitas */}
          <button
            type="button"
            onClick={() => setModalDetalhesMetrics('receitas')}
            className="text-left bg-white hover:bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 cursor-pointer transition-colors"
          >
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-[11px] font-medium">Faturação Bruta</span>
              <ArrowUpRight size={14} className="text-emerald-700" />
            </div>
            <p className="text-lg font-semibold text-slate-950 font-mono tabular-nums tracking-tight">
              {formatMzn(totalReceitasComIVA)}
            </p>
            <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 font-mono tabular-nums">
              IVA: {totalIvaLiquidadoVendas.toLocaleString('pt-MZ')} MT
            </p>
          </button>

          {/* Custos Diretos */}
          <button
            type="button"
            onClick={() => setModalDetalhesMetrics('custos')}
            className="text-left bg-white hover:bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 cursor-pointer transition-colors"
          >
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-[11px] font-medium">Custos Diretos</span>
              <ShoppingCart size={14} className="text-amber-700" />
            </div>
            <p className="text-lg font-semibold text-slate-950 font-mono tabular-nums tracking-tight">
              {formatMzn(totalCustosDirectos)}
            </p>
            <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              Compras &amp; Fornecedores
            </p>
          </button>

          {/* OPEX & Folha */}
          <button
            type="button"
            onClick={() => setModalDetalhesMetrics('despesas')}
            className="text-left bg-white hover:bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 cursor-pointer transition-colors"
          >
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-[11px] font-medium">OPEX &amp; Folha</span>
              <ArrowDownRight size={14} className="text-rose-700" />
            </div>
            <p className="text-lg font-semibold text-slate-950 font-mono tabular-nums tracking-tight">
              {formatMzn(totalDespesasGlobal)}
            </p>
            <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              Salários &amp; Encargos
            </p>
          </button>

          {/* Resultado Líquido */}
          <button
            type="button"
            onClick={() => setModalDetalhesMetrics('lucro')}
            className={`text-left p-4 rounded-xl border space-y-2 cursor-pointer transition-colors ${
              lucroLiquidoRealTime >= 0
                ? 'bg-slate-950 text-white border-slate-950 hover:bg-slate-900'
                : 'bg-rose-950 text-white border-rose-950 hover:bg-rose-900'
            }`}
          >
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-[11px] font-medium">Resultado Líquido</span>
              <TrendingUp size={14} className="text-slate-300" />
            </div>
            <p className="text-lg font-semibold font-mono tabular-nums tracking-tight text-white">
              {formatMzn(lucroLiquidoRealTime)}
            </p>
            <p className="text-[11px] text-slate-300 pt-1 border-t border-white/10 font-mono tabular-nums">
              Margem: {margemLucroPercent}%
            </p>
          </button>
        </div>

        {/* Chart Tabs & Visualização */}
        <div className="space-y-4 pt-1">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
            <button
              type="button"
              onClick={() => setActiveChartTab('dre')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeChartTab === 'dre'
                  ? 'bg-white text-slate-950 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Evolução da DRE
            </button>
            <button
              type="button"
              onClick={() => setActiveChartTab('composicao')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeChartTab === 'composicao'
                  ? 'bg-white text-slate-950 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Composição do Resultado
            </button>
            <button
              type="button"
              onClick={() => setActiveChartTab('saldo')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeChartTab === 'saldo'
                  ? 'bg-white text-slate-950 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Evolução de Saldo
            </button>
          </div>

          {!hasFinancialData ? (
            <div className="h-60 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center px-6 space-y-3">
              <p className="text-xs font-semibold text-slate-700">
                Sem movimentos financeiros registados para este período
              </p>
              <p className="text-xs text-slate-500 max-w-md">
                Registe colaboradores, emita faturas ou lance movimentos de caixa para acompanhar a
                evolução mensal.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigateTab && onNavigateTab('financial', 'vendas')}
                  className="px-3.5 py-1.5 bg-blue-900 hover:bg-blue-950 text-white rounded-lg text-xs font-medium cursor-pointer transition-colors"
                >
                  Emitir Fatura
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab && onNavigateTab('employees')}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                >
                  Gerir Folha
                </button>
              </div>
            </div>
          ) : (
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {activeChartTab === 'dre' ? (
                  <ComposedChart data={dadosGraficoDRE}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="mes"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(val: any) => [formatMzn(Number(val)), '']}
                      contentStyle={{
                        borderRadius: '8px',
                        borderColor: '#e2e8f0',
                        fontSize: '12px'
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
                    />
                    <Bar
                      dataKey="receitas"
                      name="Receitas Brutas"
                      fill="#047857"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="custos"
                      name="Custos Diretos"
                      fill="#b45309"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="despesas"
                      name="OPEX & Folha"
                      fill="#be123c"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      type="monotone"
                      dataKey="lucro"
                      name="Resultado Líquido"
                      stroke="#1e3a8a"
                      strokeWidth={2.5}
                      dot={{ r: 3.5 }}
                    />
                  </ComposedChart>
                ) : activeChartTab === 'composicao' ? (
                  <BarChart
                    data={[
                      {
                        name: 'Exercício',
                        ...Object.fromEntries(dadosComposicao.map((d) => [d.name, d.value]))
                      }
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip formatter={(val: any) => [formatMzn(Number(val)), '']} />
                    <Legend
                      verticalAlign="top"
                      wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
                    />
                    {dadosComposicao.map((item, idx) => (
                      <Bar
                        key={idx}
                        dataKey={item.name}
                        fill={item.color}
                        radius={[4, 4, 0, 0]}
                      />
                    ))}
                  </BarChart>
                ) : (
                  <AreaChart data={dadosGraficoDRE}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="mes"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip formatter={(val: any) => [formatMzn(Number(val)), 'Saldo']} />
                    <Area
                      type="monotone"
                      dataKey="saldo"
                      stroke="#1e3a8a"
                      fill="#1e3a8a"
                      fillOpacity={0.12}
                      strokeWidth={2}
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {/* Drilldown Modal for KPI Cards */}
      <AnimatePresence>
        {modalDetalhesMetrics && (
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="bg-white rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl border border-slate-200"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-semibold text-slate-950 text-sm">
                  Detalhamento Financeiro
                </h3>
                <button
                  type="button"
                  onClick={() => setModalDetalhesMetrics(null)}
                  aria-label="Fechar detalhamento"
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {modalDetalhesMetrics === 'saldo' && (
                <div className="space-y-3 text-xs">
                  <p className="text-slate-600">Composição do saldo disponível:</p>
                  <div className="bg-slate-50 p-3.5 rounded-lg space-y-2 border border-slate-200">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Conta Bancária (Millennium BIM)</span>
                      <span className="font-mono tabular-nums text-slate-900 font-semibold">
                        {formatMzn(saldoBIM)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Carteiras Móveis (M-Pesa / e-Mola)</span>
                      <span className="font-mono tabular-nums text-slate-900 font-semibold">
                        {formatMzn(saldoMPesa)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Caixa Físico</span>
                      <span className="font-mono tabular-nums text-slate-900 font-semibold">
                        {formatMzn(saldoCaixaLocal)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {modalDetalhesMetrics === 'receitas' && (
                <div className="space-y-3 text-xs">
                  <p className="text-slate-600">Consolidação de faturação:</p>
                  <div className="bg-slate-50 p-3.5 rounded-lg space-y-2 border border-slate-200">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Valor Base Tributável</span>
                      <span className="font-mono tabular-nums text-slate-900 font-semibold">
                        {formatMzn(totalReceitasBase)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">IVA Liquidado</span>
                      <span className="font-mono tabular-nums text-slate-900 font-semibold">
                        {formatMzn(totalIvaLiquidadoVendas)}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold border-t border-slate-200 pt-2">
                      <span className="text-slate-900">Total Faturado</span>
                      <span className="font-mono tabular-nums text-emerald-800">
                        {formatMzn(totalReceitasComIVA)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {modalDetalhesMetrics === 'custos' && (
                <div className="space-y-3 text-xs">
                  <p className="text-slate-600">Custos diretos com fornecedores:</p>
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 flex justify-between">
                    <span className="text-slate-600">Total de Compras</span>
                    <span className="font-mono tabular-nums text-slate-900 font-semibold">
                      {formatMzn(totalCustosDirectos)}
                    </span>
                  </div>
                </div>
              )}

              {modalDetalhesMetrics === 'despesas' && (
                <div className="space-y-3 text-xs">
                  <p className="text-slate-600">Encargos com pessoal e operação:</p>
                  <div className="bg-slate-50 p-3.5 rounded-lg space-y-2 border border-slate-200">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Folha Salarial &amp; INSS Patronal</span>
                      <span className="font-mono tabular-nums text-slate-900 font-semibold">
                        {formatMzn(totalCustoFolhaPessoal)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Despesas Operacionais (OPEX)</span>
                      <span className="font-mono tabular-nums text-slate-900 font-semibold">
                        {formatMzn(totalDespesasOperacionais)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {modalDetalhesMetrics === 'lucro' && (
                <div className="space-y-3 text-xs">
                  <p className="text-slate-600">Apuramento do resultado do período:</p>
                  <div className="bg-slate-50 p-3.5 rounded-lg space-y-2 border border-slate-200 font-mono tabular-nums">
                    <div className="flex justify-between">
                      <span className="font-sans text-slate-600">(+) Receitas</span>
                      <span className="text-slate-900">{formatMzn(totalReceitasComIVA)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans text-slate-600">(-) Custos Diretos</span>
                      <span className="text-rose-700">-{formatMzn(totalCustosDirectos)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans text-slate-600">(-) OPEX &amp; Folha</span>
                      <span className="text-rose-700">-{formatMzn(totalDespesasGlobal)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
                      <span className="font-sans text-slate-900">(=) Resultado Líquido</span>
                      <span
                        className={
                          lucroLiquidoRealTime >= 0 ? 'text-emerald-800' : 'text-rose-700'
                        }
                      >
                        {formatMzn(lucroLiquidoRealTime)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setModalDetalhesMetrics(null)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-950 text-white font-semibold rounded-lg text-xs cursor-pointer transition-colors"
              >
                Fechar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Processamento Salarial & Liquidação Móvel */}
      {userRole !== 'CLIENTE_EMPRESA' && (
        <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-blue-900">
                Tesouraria &amp; Pagamentos em Lote
              </p>
              <h3 className="text-base font-semibold text-slate-950 tracking-tight">
                Processamento Salarial e Dispersão Móvel
              </h3>
              <p className="text-xs text-slate-500 max-w-2xl">
                Liquidação direta de salários líquidos para carteiras M-Pesa e e-Mola em
                conformidade com a Lei nº 13/2023.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-lg self-start md:self-center shrink-0">
              <div>
                <p className="text-[11px] text-slate-500">Saldo da Carteira</p>
                <p className="text-base font-semibold text-slate-950 font-mono tabular-nums">
                  {formatMzn(saldoCarteira)}
                </p>
              </div>
              <button
                type="button"
                onClick={carregarCarteira}
                disabled={loadingCarteira}
                aria-label="Sincronizar saldo da carteira"
                className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-slate-600 transition-colors cursor-pointer"
              >
                <RefreshCw size={13} className={loadingCarteira ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={dispararAutopilot}
                disabled={autopilotRunning}
                className="px-4 py-2 bg-blue-900 hover:bg-blue-950 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {autopilotRunning ? 'A processar folha...' : 'Executar Pagamento da Folha'}
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab('employees')}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Gerir Colaboradores</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {autopilotResult && (
              <span className="text-xs font-medium text-emerald-800">
                Processamento concluído para o período atual.
              </span>
            )}
            {autopilotError && (
              <span className="text-xs font-medium text-rose-700">{autopilotError}</span>
            )}
          </div>

          {autopilotLogs.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 font-mono text-[11px] text-slate-700 max-h-32 overflow-y-auto">
              {autopilotLogs.map((log, index) => (
                <div key={index}>{log}</div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 4. Obrigações Laborais & Prazos (Lei nº 13/2023) */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3.5 gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-950">
              Contratos e Obrigações Laborais
            </h3>
            <p className="text-xs text-slate-500">
              Monitorização de vencimentos contratuais nos termos da Lei do Trabalho nº 13/2023.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
            Lei nº 13/2023
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {contratosCriticos.length > 0 ? (
            <div className="space-y-2.5">
              {contratosCriticos.map((ct) => (
                <div
                  key={ct.id}
                  className="bg-rose-50/70 border border-rose-200 p-4 rounded-xl space-y-2"
                >
                  <div className="flex items-center gap-2 text-rose-900">
                    <AlertCircle size={15} className="shrink-0" />
                    <h4 className="font-semibold text-xs">Contrato a Terminar</h4>
                  </div>
                  <p className="text-xs text-rose-800">
                    Colaborador: <span className="font-semibold">{ct.nome_funcionario}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      handleEmitirAvisoPrevio(
                        ct.id,
                        ct.nome_funcionario,
                        '77654321',
                        ct.cargo
                      )
                    }
                    disabled={loadingAviso === ct.id}
                    className="px-2.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-[11px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Download size={12} />
                    <span>
                      {loadingAviso === ct.id ? 'A emitir...' : 'Emitir Aviso Prévio (PDF)'}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-slate-800">
                <CheckCircle2 size={15} className="text-slate-500 shrink-0" />
                <h4 className="font-semibold text-xs">Contratos Próximos do Fim</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sem contratos com término crítico nos próximos 30 dias.
              </p>
            </div>
          )}

          {contratosAviso.length > 0 ? (
            <div className="space-y-2.5">
              {contratosAviso.map((ct) => (
                <div
                  key={ct.id}
                  className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl space-y-1.5"
                >
                  <div className="flex items-center gap-2 text-amber-900">
                    <Clock size={15} className="shrink-0" />
                    <h4 className="font-semibold text-xs">Fim do Período Experimental</h4>
                  </div>
                  <p className="text-xs text-amber-800">
                    Colaborador: <span className="font-semibold">{ct.nome_funcionario}</span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-slate-800">
                <Clock size={15} className="text-slate-500 shrink-0" />
                <h4 className="font-semibold text-xs">Período Experimental</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sem colaboradores em término de período experimental esta semana.
              </p>
            </div>
          )}

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-800">
              <CheckCircle2 size={15} className="shrink-0" />
              <h4 className="font-semibold text-xs text-slate-900">Conformidade Laboral</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Colaboradores ativos com enquadramento regular sob a Lei nº 13/2023.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Histórico de Liquidações & Exportação de Relatórios */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div>
              <h3 className="text-base font-semibold text-slate-950">
                Histórico de Liquidações Móveis
              </h3>
              <p className="text-xs text-slate-500">
                Registo de transferências diretas efetuadas para carteiras móveis.
              </p>
            </div>
          </div>

          {logs.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <p className="text-xs font-medium text-slate-700">
                Nenhuma transferência liquidada neste período.
              </p>
              <p className="text-xs text-slate-500">
                As liquidações salariais via M-Pesa e e-Mola aparecerão aqui após processamento.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-medium">
                    <th className="py-2.5 pr-3">Colaborador</th>
                    <th className="py-2.5 pr-3">Carteira</th>
                    <th className="py-2.5 pr-3 text-right">Valor Líquido</th>
                    <th className="py-2.5 pr-3">Período</th>
                    <th className="py-2.5 pr-3">Estado</th>
                    <th className="py-2.5 text-right">Comprovativo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 pr-3 font-medium text-slate-900">
                        {log.employeeName}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-600 font-mono tabular-nums">
                        {log.carteira_movel}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums font-semibold text-emerald-800">
                        {formatMzn(log.salarioLiquido)}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-600">{log.periodo}</td>
                      <td className="py-2.5 pr-3 font-medium text-emerald-800">{log.status}</td>
                      <td className="py-2.5 text-right">
                        <div className="inline-flex items-center gap-3 justify-end">
                          <button
                            type="button"
                            onClick={() => handleOpenLogPayslipA4(log)}
                            className="inline-flex items-center gap-1 font-semibold text-slate-900 hover:text-blue-900 cursor-pointer"
                            title="Abrir Recibo A4 Estilo Primavera V10"
                          >
                            <Printer size={12} /> A4
                          </button>
                          <a
                            href={`/download/recibo_${log.employeeId}_${log.periodo.replace(
                              /\s+/g,
                              '_'
                            )}.pdf`}
                            className="inline-flex items-center gap-1 font-medium text-blue-900 hover:underline"
                          >
                            PDF <Download size={11} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-semibold text-slate-950">
                Exportação de Mapas
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Descarregue mapas salariais e extratos financeiros em PDF ou Excel.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadMapaPDF}
                className="w-full py-2 px-3 bg-blue-900 hover:bg-blue-950 text-white font-medium rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <FileText size={14} /> Mapa de Salários (PDF)
                </span>
                <Download size={13} />
              </button>

              <button
                type="button"
                onClick={handleDownloadMapaExcel}
                className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-medium rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <FileSpreadsheet size={14} className="text-emerald-700" /> Mapa de Salários (Excel)
                </span>
                <Download size={13} />
              </button>

              <button
                type="button"
                onClick={handleDownloadHistoricoPDF}
                className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-medium rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <FileText size={14} className="text-slate-600" /> Histórico Financeiro (PDF)
                </span>
                <Download size={13} />
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab('financial', 'relatorios')}
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-blue-900 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-200 cursor-pointer"
            >
              <span>Relatórios Contabilísticos</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </section>
      </div>

      {/* 6. Enquadramento Fiscal & Alertas */}
      <section className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg text-blue-900 shrink-0">
            <BookOpen size={18} />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xs font-semibold text-slate-950">
              Enquadramento Legal e Alertas Fiscais (Lei nº 13/2023 e IRPS)
            </h3>
            <p className="text-xs text-slate-500">
              Consulte prazos da Autoridade Tributária, obrigações de segurança social e regras de
              indemnização laboral.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab && onNavigateTab('alerts')}
          className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-900 font-medium rounded-lg text-xs inline-flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors whitespace-nowrap"
        >
          <span>Abrir Alertas &amp; Legislação</span>
          <ArrowRight size={13} />
        </button>
      </section>

      <PayslipA4Modal
        isOpen={!!selectedPayslipA4}
        onClose={() => setSelectedPayslipA4(null)}
        data={selectedPayslipA4}
      />
    </div>
  );
}
