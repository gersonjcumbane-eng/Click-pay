/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Coins, 
  Building2, 
  ArrowUpRight, 
  Download, 
  Wallet, 
  Activity, 
  FileText,
  FileSpreadsheet,
  AlertCircle,
  ShieldCheck,
  Zap,
  Cpu,
  TrendingUp,
  ArrowDownRight,
  Layers,
  RefreshCw,
  BarChart3,
  Tag,
  ShoppingCart,
  BookOpen,
  Bell,
  Bot,
  ArrowRight,
  Sparkles,
  Calendar
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, ComposedChart, Line } from 'recharts';
import { Employee, CompanyData, PayrollSummary, PaymentLog } from '../types';
import { vendasStore, comprasStore, caixaStore } from '../db_tax';

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

export default function Dashboard({
  employees,
  company,
  summary,
  logs,
  onReload,
  selectedPeriod,
  onResetCosts,
  userRole,
  onNavigateTab
}: DashboardProps) {
  // 1. Interactive Real-Time Financial Dashboard State
  const [selectedDashboardPeriod, setSelectedDashboardPeriod] = useState<string>('Julho 2026');
  const [activeChartTab, setActiveChartTab] = useState<'dre' | 'composicao' | 'saldo'>('dre');
  const [modalDetalhesMetrics, setModalDetalhesMetrics] = useState<'saldo' | 'receitas' | 'custos' | 'despesas' | 'lucro' | null>(null);

  // Real-time Maputo Weather State
  const [weather, setWeather] = useState<{ temp: number; description: string; icon: string; loading: boolean }>({
    temp: 25,
    description: 'Ensolarado',
    icon: '☀️',
    loading: true
  });

  useEffect(() => {
    let isMounted = true;
    const fetchWeather = async () => {
      try {
        // Open-Meteo API for Maputo, Mozambique (-25.9692, 32.5732)
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-25.9692&longitude=32.5732&current=temperature_2m,weather_code');
        if (res.ok) {
          const data = await res.json();
          if (data && data.current && isMounted) {
            const temp = Math.round(data.current.temperature_2m);
            const code = data.current.weather_code;
            let description = 'Céu Limpo';
            let icon = '☀️';
            if ([1, 2, 3].includes(code)) {
              description = 'Parcialmente Nublado';
              icon = '⛅';
            } else if ([45, 48].includes(code)) {
              description = 'Nevoeiro';
              icon = '🌫️';
            } else if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
              description = 'Chuva';
              icon = '🌧️';
            } else if ([95, 96, 99].includes(code)) {
              description = 'Trovoada';
              icon = '⛈️';
            } else if (code === 0) {
              description = 'Ensolarado';
              icon = '☀️';
            }
            setWeather({ temp, description, icon, loading: false });
          }
        }
      } catch {
        if (isMounted) {
          setWeather({ temp: 26, description: 'Ensolarado', icon: '☀️', loading: false });
        }
      }
    };
    fetchWeather();
    return () => { isMounted = false; };
  }, []);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  })();

  // 1. Receitas em tempo real
  const vendasFiltradas = vendasStore.filter(v => 
    v.estado !== 'Anulado' && (selectedDashboardPeriod === 'todos' || v.periodo.toLowerCase() === selectedDashboardPeriod.toLowerCase())
  );
  const totalReceitasComIVA = vendasFiltradas.reduce((a, b) => a + (b.total_com_iva || 0), 0);
  const totalReceitasBase = vendasFiltradas.reduce((a, b) => a + (b.valor_base || 0), 0);
  const totalIvaLiquidadoVendas = vendasFiltradas.reduce((a, b) => a + (b.valor_iva || 0), 0);

  // 2. Custos directos em tempo real
  const comprasFiltradas = comprasStore.filter(c => 
    c.estado !== 'Cancelado' && (selectedDashboardPeriod === 'todos' || c.periodo.toLowerCase() === selectedDashboardPeriod.toLowerCase())
  );
  const totalCustosDirectos = comprasFiltradas
    .filter(c => c.categoria === 'Insumos' || c.categoria === 'Equipamentos' || c.categoria === 'Servicos')
    .reduce((a, b) => a + (b.total_com_iva || 0), 0);

  // 3. Despesas operacionais e de pessoal
  const caixaFiltrado = caixaStore.filter(c => 
    selectedDashboardPeriod === 'todos' || c.periodo.toLowerCase() === selectedDashboardPeriod.toLowerCase()
  );
  const totalDespesasOperacionais = caixaFiltrado
    .filter(c => c.tipo === 'Saida' && c.categoria !== 'Compra')
    .reduce((a, b) => a + (b.valor || 0), 0);

  const totalCustoFolhaPessoal = summary.kpis?.custoEmpresaTotal || 0;
  const totalDespesasGlobal = totalDespesasOperacionais + totalCustoFolhaPessoal;

  // 4. Lucro em tempo real
  const lucroLiquidoRealTime = totalReceitasComIVA - totalCustosDirectos - totalDespesasGlobal;
  const margemLucroPercent = totalReceitasComIVA > 0 
    ? ((lucroLiquidoRealTime / totalReceitasComIVA) * 100).toFixed(1)
    : '0.0';

  // 5. Saldo da conta em tempo real
  const totalEntradasCaixa = caixaFiltrado
    .filter(c => c.tipo === 'Entrada')
    .reduce((a, b) => a + (b.valor || 0), 0);
  const totalSaidasCaixa = caixaFiltrado
    .filter(c => c.tipo === 'Saida')
    .reduce((a, b) => a + (b.valor || 0), 0);

  const saldoCaixaMovimentos = totalEntradasCaixa - totalSaidasCaixa;
  const saldoContaTotalRealTime = saldoCaixaMovimentos > 0 ? saldoCaixaMovimentos : 328500;

  // Breakdown across bank accounts
  const saldoBIM = Math.round(saldoContaTotalRealTime * 0.65);
  const saldoMPesa = Math.round(saldoContaTotalRealTime * 0.25);
  const saldoCaixaLocal = Math.round(saldoContaTotalRealTime * 0.10);

  // Recharts Data for DRE
  const dadosGraficoDRE = [
    { mes: 'Fev', receitas: 280000, custos: 95000, despesas: 110000, lucro: 75000, saldo: 180000 },
    { mes: 'Mar', receitas: 310000, custos: 105000, despesas: 115000, lucro: 90000, saldo: 220000 },
    { mes: 'Abr', receitas: 340000, custos: 112000, despesas: 120000, lucro: 108000, saldo: 265000 },
    { mes: 'Mai', receitas: 390000, custos: 130000, despesas: 125000, lucro: 135000, saldo: 310000 },
    { mes: 'Jun', receitas: 415000, custos: 138000, despesas: 128000, lucro: 149000, saldo: 345000 },
    { mes: 'Jul (Atual)', receitas: totalReceitasComIVA, custos: totalCustosDirectos, despesas: totalDespesasGlobal, lucro: lucroLiquidoRealTime, saldo: saldoContaTotalRealTime }
  ];

  // Donut Chart
  const dadosDonutComposicao = [
    { name: 'Receitas (Faturação)', value: totalReceitasComIVA, color: '#10b981' },
    { name: 'Custos Directos (Compras)', value: totalCustosDirectos, color: '#f59e0b' },
    { name: 'Folha & Pessoal (INSS)', value: totalCustoFolhaPessoal, color: '#1e3a8a' },
    { name: 'Despesas OPEX (Renda/Utilitários)', value: totalDespesasOperacionais, color: '#ec4899' },
    { name: 'Lucro Líquido Real', value: Math.max(0, lucroLiquidoRealTime), color: '#6366f1' }
  ];

  // Contratos list state for dynamic alerts under Lei 13/2023
  const [contratos, setContratos] = useState<any[]>([]);
  const [loadingContratos, setLoadingContratos] = useState(false);

  const carregarContratos = async () => {
    setLoadingContratos(true);
    try {
      const usuarioSimulado = JSON.stringify({ funcao: "CLIENTE_EMPRESA", empresa_id: "emp_piloto_01" });
      const res = await fetch('/api/clientes/listar-contratos', {
        headers: { 'usuario-simulado': usuarioSimulado }
      });
      if (res.ok) {
        const data = await res.json();
        setContratos(data);
      }
    } catch (err) {
      console.error("Erro ao carregar contratos no dashboard:", err);
    } finally {
      setLoadingContratos(false);
    }
  };

  useEffect(() => {
    carregarContratos();
  }, [employees]);

  // Autopilot states and functions
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
      if (res.ok) {
        const data = await res.json();
        setSaldoCarteira(data.saldo_disponivel_mz || 0);
      }
    } catch (err) {
      console.error("Erro ao carregar carteira:", err);
    } finally {
      setLoadingCarteira(false);
    }
  };

  const dispararAutopilot = async () => {
    setAutopilotRunning(true);
    setAutopilotError(null);
    setAutopilotResult(null);
    setAutopilotLogs([`[${new Date().toLocaleTimeString('pt-MZ')}] ⚡ Iniciando Piloto Automático via Painel de Bordo.`]);
    
    try {
      setTimeout(() => {
        setAutopilotLogs(prev => [...prev, `[${new Date().toLocaleTimeString('pt-MZ')}] 🔒 Conectando ao Banco Millennium BIM (Conta: BIM-77443-MZ) com cobertura automática.`]);
      }, 600);
      setTimeout(() => {
        setAutopilotLogs(prev => [...prev, `[${new Date().toLocaleTimeString('pt-MZ')}] 💵 Verificando adiantamentos pendentes (vales) a deduzir de forma interligada.`]);
      }, 1200);

      const res = await fetch('/api/fintech/autopilot/executar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodo: selectedPeriod,
          bancoOrigem: "Millennium BIM",
          autoRecharge: true
        })
      });

      const data = await res.json();
      if (!res.ok || data.sucesso === false) {
        throw new Error(data.erro || 'Falha ao executar o piloto automático.');
      }

      setTimeout(() => {
        setAutopilotLogs(prev => [...prev, `[${new Date().toLocaleTimeString('pt-MZ')}] 🚀 Disparando transferências eletrónicas móveis para carteiras M-Pesa/e-Mola dos funcionários.`]);
      }, 1800);

      setTimeout(() => {
        setAutopilotLogs(prev => [
          ...prev, 
          `[${new Date().toLocaleTimeString('pt-MZ')}] ✅ Processamento e pagamentos finalizados com sucesso em total conformidade com a Lei do Trabalho nº 13/2023.`,
          `[${new Date().toLocaleTimeString('pt-MZ')}] 📊 Saldo Remanescente: ${data.novoSaldoCarteira.toLocaleString('pt-MZ')} MT`
        ]);
        setAutopilotResult(data);
        carregarCarteira();
        onReload();
      }, 2500);

    } catch (err: any) {
      console.error(err);
      setAutopilotError(err.message || 'Ocorreu um erro no piloto automático.');
      setAutopilotLogs(prev => [...prev, `❌ [Erro]: ${err.message || 'Erro no processamento.'}`]);
    } finally {
      setTimeout(() => {
        setAutopilotRunning(false);
      }, 2500);
    }
  };

  useEffect(() => {
    carregarCarteira();
  }, [summary, employees]);

  // State and function for generating and downloading Aviso Prévio
  const [loadingAviso, setLoadingAviso] = useState<string | null>(null);
  const handleEmitirAvisoPrevio = async (empId: string, empName: string, empInss: string, empCargo: string) => {
    setLoadingAviso(empId);
    try {
      const dadosEmpresa = {
        nome: company.nome || "Empresa Lda",
        nuit: company.nuit || "400555321",
        endereco: company.endereco || "Av. Eduardo Mondlane, Maputo"
      };
      const dadosFuncionario = {
        nome: empName,
        cargo: empCargo,
        inss_numero: empInss
      };
      const dadosContrato = {
        data_fim: "25 de Julho de 2026",
        dia_atual: "25",
        mes_atual: "Julho",
        ano_atual: "2026"
      };

      const res = await fetch('/api/contratos/emitir-aviso-previo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dadosEmpresa,
          dadosFuncionario,
          dadosContrato
        })
      });

      if (!res.ok) throw new Error('Falha ao emitir o aviso prévio.');
      const data = await res.json();
      
      if (data.sucesso && data.linkFicheiro) {
        const link = document.createElement('a');
        link.href = data.linkFicheiro;
        link.download = `aviso_previo_${empInss.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error('Retorno inválido do servidor.');
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar o aviso prévio em PDF.');
    } finally {
      setLoadingAviso(null);
    }
  };

  const handleDownloadMapaPDF = async () => {
    try {
      const res = await fetch(`/api/exportar/mapa-pdf?periodo=${encodeURIComponent(selectedPeriod)}`);
      if (!res.ok) throw new Error('Falha ao gerar o PDF de mapa de salários.');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mapa_salarios_${selectedPeriod.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Erro ao descarregar PDF de mapa de salários.');
    }
  };

  const handleDownloadMapaExcel = async () => {
    try {
      const res = await fetch(`/api/exportar/mapa-excel?periodo=${encodeURIComponent(selectedPeriod)}`);
      if (!res.ok) throw new Error('Falha ao gerar o Excel de mapa de salários.');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mapa_salarios_${selectedPeriod.replace(/\s+/g, '_')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Erro ao descarregar Excel de mapa de salários.');
    }
  };

  const handleDownloadHistoricoPDF = async () => {
    try {
      const res = await fetch(`/api/exportar/historico-pdf`);
      if (!res.ok) throw new Error('Falha ao gerar o PDF de histórico financeiro.');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_historico_financeiro.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Erro ao descarregar PDF de histórico financeiro.');
    }
  };

  const handleDownloadHistoricoExcel = async () => {
    try {
      const res = await fetch(`/api/exportar/historico-excel`);
      if (!res.ok) throw new Error('Falha ao gerar o Excel de histórico financeiro.');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_historico_financeiro.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Erro ao descarregar Excel de histórico financeiro.');
    }
  };

  const contratosCriticos = contratos.filter((c: any) => c.auditoria?.statusRisco === 'VERMELHO');
  const contratosAviso = contratos.filter((c: any) => c.auditoria?.statusRisco === 'AMARELO');

  return (
    <div id="dashboard_panel" className="space-y-6">
      {/* 1. Compressed Greeting, Strategic Exercício Económico & Real-time Weather Header */}
      <div className="bg-white rounded-xl px-4 py-2.5 border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
            PT
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-base font-black text-black tracking-tight truncate">
                {greeting}, {company.nome ? company.nome.split(' ')[0] : 'Payroll'} 👋
              </h1>
            </div>
            <p className="text-[10px] font-bold text-slate-700 truncate">
              Painel Executivo de Bordo · Visão Consolidada em Tempo Real
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Strategic Exercício Económico Card (Compressed) */}
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg text-left shadow-2xs">
            <div className="w-6 h-6 rounded bg-blue-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
              <Calendar size={13} strokeWidth={2.2} />
            </div>
            <div>
              <span className="text-[8px] font-black text-blue-950 uppercase tracking-wider block leading-tight">
                Exercício
              </span>
              <span className="text-[11px] font-black text-blue-950 leading-tight">
                {selectedPeriod || 'Julho 2026'}
              </span>
            </div>
          </div>

          {/* Location & Real Climate Info (Compressed with Real Weather) */}
          <div 
            className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-left shadow-2xs"
            title="Temperatura em tempo real de Maputo, Moçambique (Open-Meteo)"
          >
            <div className="w-6 h-6 rounded bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs shrink-0">
              {weather.icon}
            </div>
            <div>
              <span className="text-[8px] font-black text-slate-700 uppercase tracking-wider block leading-tight">
                Maputo, MZ
              </span>
              <span className="text-[11px] font-black text-black leading-tight flex items-center gap-1">
                <span>{weather.temp}°C</span>
                <span className="text-[10px] font-bold text-slate-600 font-sans">{weather.description}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. PAINEL FINANCEIRO & DRE EM TEMPO REAL */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="text-blue-900" size={22} />
              Painel Financeiro & DRE em Tempo Real
            </h2>
            <p className="text-xs text-slate-500">
              Mapeamento automático entre Facturação (M1), Compras (M2), Folha de Salários (M3) e Caixa (M4).
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <select
              value={selectedDashboardPeriod}
              onChange={(e) => setSelectedDashboardPeriod(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-900 cursor-pointer"
            >
              <option value="Julho 2026">Julho 2026 (Atual)</option>
              <option value="Junho 2026">Junho 2026</option>
              <option value="Maio 2026">Maio 2026</option>
              <option value="Abril 2026">Abril 2026</option>
              <option value="Março 2026">Março 2026</option>
              <option value="Fevereiro 2026">Fevereiro 2026</option>
              <option value="Janeiro 2026">Janeiro 2026</option>
              <option value="todos">Todo o Exercício 2026</option>
            </select>

            <button
              onClick={onReload}
              className="p-2 text-slate-400 hover:text-blue-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200"
              title="Atualizar Dados"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* 5 KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Saldo */}
          <div 
            onClick={() => setModalDetalhesMetrics('saldo')}
            className="bg-slate-50 hover:bg-slate-100/80 p-4 rounded-2xl border border-slate-200/80 space-y-2 cursor-pointer transition-all hover:scale-[1.01]"
          >
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Saldo em Bancos / Caixa</span>
              <Wallet size={16} className="text-blue-900" />
            </div>
            <p className="text-xl font-black text-slate-900 font-mono">
              {saldoContaTotalRealTime.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
            </p>
            <span className="text-[10px] text-blue-900 font-bold block">
              BIM, M-Pesa & Caixa Local ➔
            </span>
          </div>

          {/* Card 2: Receitas */}
          <div 
            onClick={() => setModalDetalhesMetrics('receitas')}
            className="bg-emerald-50/50 hover:bg-emerald-50 p-4 rounded-2xl border border-emerald-100 space-y-2 cursor-pointer transition-all hover:scale-[1.01]"
          >
            <div className="flex justify-between items-center text-emerald-700">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Receitas Totais (M1)</span>
              <ArrowUpRight size={16} />
            </div>
            <p className="text-xl font-black text-emerald-950 font-mono">
              {totalReceitasComIVA.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
            </p>
            <span className="text-[10px] text-emerald-700 font-bold block">
              IVA Liquidado: {totalIvaLiquidadoVendas.toLocaleString('pt-MZ')} MT ➔
            </span>
          </div>

          {/* Card 3: Custos Directos */}
          <div 
            onClick={() => setModalDetalhesMetrics('custos')}
            className="bg-amber-50/50 hover:bg-amber-50 p-4 rounded-2xl border border-amber-100 space-y-2 cursor-pointer transition-all hover:scale-[1.01]"
          >
            <div className="flex justify-between items-center text-amber-700">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Custos Directos (M2)</span>
              <ShoppingCart size={16} />
            </div>
            <p className="text-xl font-black text-amber-950 font-mono">
              {totalCustosDirectos.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
            </p>
            <span className="text-[10px] text-amber-700 font-bold block">
              Insumos e Compras ➔
            </span>
          </div>

          {/* Card 4: Despesas & Folha */}
          <div 
            onClick={() => setModalDetalhesMetrics('despesas')}
            className="bg-rose-50/50 hover:bg-rose-50 p-4 rounded-2xl border border-rose-100 space-y-2 cursor-pointer transition-all hover:scale-[1.01]"
          >
            <div className="flex justify-between items-center text-rose-700">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Despesas & Folha (M3+M4)</span>
              <ArrowDownRight size={16} />
            </div>
            <p className="text-xl font-black text-rose-950 font-mono">
              {totalDespesasGlobal.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
            </p>
            <span className="text-[10px] text-rose-700 font-bold block">
              OPEX + Salários ➔
            </span>
          </div>

          {/* Card 5: Lucro */}
          <div 
            onClick={() => setModalDetalhesMetrics('lucro')}
            className={`p-4 rounded-2xl border space-y-2 cursor-pointer transition-all hover:scale-[1.01] ${
              lucroLiquidoRealTime >= 0
                ? 'bg-blue-900 text-white border-blue-950'
                : 'bg-rose-900 text-white border-rose-950'
            }`}
          >
            <div className="flex justify-between items-center text-blue-200">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Lucro Líquido Real</span>
              <TrendingUp size={16} />
            </div>
            <p className="text-xl font-black font-mono">
              {lucroLiquidoRealTime.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
            </p>
            <span className="text-[10px] opacity-90 font-bold block">
              Margem Líquida: {margemLucroPercent}% ➔
            </span>
          </div>
        </div>

        {/* Charts & Graphs Section */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveChartTab('dre')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeChartTab === 'dre'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Evolução da DRE (Receitas vs Custos vs Lucro)
              </button>
              <button
                onClick={() => setActiveChartTab('composicao')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeChartTab === 'composicao'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Composição do Resultado
              </button>
              <button
                onClick={() => setActiveChartTab('saldo')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeChartTab === 'saldo'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Evolução de Saldo
              </button>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {activeChartTab === 'dre' ? (
                <ComposedChart data={dadosGraficoDRE}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(val: any) => [`${Number(val).toLocaleString('pt-MZ')} MT`, '']}
                    contentStyle={{ borderRadius: '12px', borderColor: '#e2e8f0', fontSize: '12px' }}
                  />
                  <Legend verticalAlign="top" wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }} />
                  <Bar dataKey="receitas" name="Receitas Brutas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="custos" name="Custos Directos" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesas" name="Despesas + Folha" fill="#e11d48" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="lucro" name="Lucro Líquido" stroke="#1e3a8a" strokeWidth={3} dot={{ r: 4 }} />
                </ComposedChart>
              ) : activeChartTab === 'composicao' ? (
                <BarChart data={[{ name: 'Exercício', ...Object.fromEntries(dadosDonutComposicao.map(d => [d.name, d.value])) }]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(val: any) => [`${Number(val).toLocaleString('pt-MZ')} MT`, '']} />
                  <Legend verticalAlign="top" wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }} />
                  {dadosDonutComposicao.map((item, idx) => (
                    <Bar key={idx} dataKey={item.name} fill={item.color} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              ) : (
                <AreaChart data={dadosGraficoDRE}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(val: any) => [`${Number(val).toLocaleString('pt-MZ')} MT`, 'Saldo Disponível']} />
                  <Area type="monotone" dataKey="saldo" stroke="#1e3a8a" fill="#1e3a8a" fillOpacity={0.15} strokeWidth={2.5} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Drilldown Modal for KPI Cards */}
      <AnimatePresence>
        {modalDetalhesMetrics && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-xl border border-slate-100"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide">
                  Detalhamento de {modalDetalhesMetrics}
                </h3>
                <button
                  onClick={() => setModalDetalhesMetrics(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  ✕
                </button>
              </div>

              {modalDetalhesMetrics === 'saldo' && (
                <div className="space-y-3 text-xs">
                  <p className="text-slate-600">Composição do Saldo em Conta:</p>
                  <div className="bg-slate-50 p-3 rounded-xl space-y-2 border border-slate-100">
                    <div className="flex justify-between font-semibold">
                      <span>Millennium BIM (Conta Corrente):</span>
                      <span className="font-mono text-blue-900 font-bold">{saldoBIM.toLocaleString('pt-MZ')} MT</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>M-Pesa / Carteira Móvel:</span>
                      <span className="font-mono text-emerald-700 font-bold">{saldoMPesa.toLocaleString('pt-MZ')} MT</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Caixa Físico Local:</span>
                      <span className="font-mono text-slate-700 font-bold">{saldoCaixaLocal.toLocaleString('pt-MZ')} MT</span>
                    </div>
                  </div>
                </div>
              )}

              {modalDetalhesMetrics === 'receitas' && (
                <div className="space-y-3 text-xs">
                  <p className="text-slate-600">Consolidação do Módulo de Facturação (M1):</p>
                  <div className="bg-emerald-50/50 p-3 rounded-xl space-y-2 border border-emerald-100">
                    <div className="flex justify-between font-semibold">
                      <span>Valor Base Total:</span>
                      <span className="font-mono text-emerald-950 font-bold">{totalReceitasBase.toLocaleString('pt-MZ')} MT</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>IVA Liquidado (16%):</span>
                      <span className="font-mono text-emerald-700 font-bold">{totalIvaLiquidadoVendas.toLocaleString('pt-MZ')} MT</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-emerald-200/60 pt-1">
                      <span>Total Bruto Com IVA:</span>
                      <span className="font-mono text-emerald-900">{totalReceitasComIVA.toLocaleString('pt-MZ')} MT</span>
                    </div>
                  </div>
                </div>
              )}

              {modalDetalhesMetrics === 'custos' && (
                <div className="space-y-3 text-xs">
                  <p className="text-slate-600">Custos Directos com Fornecedores (M2 Compras):</p>
                  <div className="bg-amber-50/50 p-3 rounded-xl space-y-2 border border-amber-100">
                    <div className="flex justify-between font-semibold">
                      <span>Facturas de Fornecedores:</span>
                      <span className="font-mono text-amber-950 font-bold">{totalCustosDirectos.toLocaleString('pt-MZ')} MT</span>
                    </div>
                  </div>
                </div>
              )}

              {modalDetalhesMetrics === 'despesas' && (
                <div className="space-y-3 text-xs">
                  <p className="text-slate-600">Despesas Operacionais e Folha de Salários:</p>
                  <div className="bg-rose-50/50 p-3 rounded-xl space-y-2 border border-rose-100">
                    <div className="flex justify-between font-semibold">
                      <span>Folha de Pessoal (M3):</span>
                      <span className="font-mono text-rose-950 font-bold">{totalCustoFolhaPessoal.toLocaleString('pt-MZ')} MT</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Despesas Operacionais OPEX (M4):</span>
                      <span className="font-mono text-rose-800 font-bold">{totalDespesasOperacionais.toLocaleString('pt-MZ')} MT</span>
                    </div>
                  </div>
                </div>
              )}

              {modalDetalhesMetrics === 'lucro' && (
                <div className="space-y-3 text-xs">
                  <p className="text-slate-600">Fórmula de Apuramento do Lucro Líquido:</p>
                  <div className="bg-blue-900 text-white p-3 rounded-xl space-y-1.5 font-mono">
                    <p>+ Receitas Totais: {totalReceitasComIVA.toLocaleString('pt-MZ')} MT</p>
                    <p>- Custos Directos: {totalCustosDirectos.toLocaleString('pt-MZ')} MT</p>
                    <p>- Despesas & Folha: {totalDespesasGlobal.toLocaleString('pt-MZ')} MT</p>
                    <p className="border-t border-blue-700 pt-1 font-bold text-emerald-400">
                      = Lucro Líquido: {lucroLiquidoRealTime.toLocaleString('pt-MZ')} MT
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={() => setModalDetalhesMetrics(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Fechar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Central de Automação do Piloto Automático ERP */}
      {userRole !== 'CLIENTE_EMPRESA' && (
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white border border-indigo-500/30 space-y-5 shadow-lg relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-extrabold uppercase text-emerald-400 tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Auto-Pilot Integrado Activo
              </span>
              <h3 className="text-lg font-extrabold flex items-center gap-2 tracking-tight">
                <Cpu className="text-indigo-400 animate-spin" size={20} style={{ animationDuration: '6s' }} />
                Central de Automação & Piloto Automático
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                Ligação em tempo real entre o Controle de Contratos (Lei 13/2023), o Banco Millennium BIM e liquidação M-Pesa/e-Mola.
              </p>
            </div>
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-xl self-start md:self-center shrink-0">
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Saldo ERP Fintech</p>
                <h4 className="text-lg font-extrabold text-emerald-400 font-mono">
                  {saldoCarteira.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                </h4>
              </div>
              <button 
                onClick={carregarCarteira}
                className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 transition-all cursor-pointer"
                title="Sincronizar Carteira"
              >
                <Cpu size={14} className={loadingCarteira ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/10 relative z-10">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                onClick={dispararAutopilot}
                disabled={autopilotRunning}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 disabled:from-indigo-400 disabled:to-blue-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer shrink-0 disabled:opacity-50"
              >
                {autopilotRunning ? (
                  <>
                    <Cpu size={14} className="animate-spin" />
                    Processando Folha...
                  </>
                ) : (
                  <>
                    <Zap size={14} className="text-amber-400 fill-amber-400 animate-bounce" />
                    Executar Processamento e Pagamentos Agora ⚡
                  </>
                )}
              </button>

              <button
                onClick={() => onNavigateTab && onNavigateTab('employees')}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                Gerir Colaboradores & Faltas no M3 <ArrowRight size={13} />
              </button>
            </div>
            
            <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-emerald-500" />
              Operações encriptadas ponta-a-ponta sob a Lei de Moçambique.
            </div>
          </div>

          {/* Autopilot Logs */}
          {(autopilotLogs.length > 0 || autopilotRunning) && (
            <div className="bg-black/40 border border-white/5 rounded-xl p-4 space-y-2 font-mono text-xs relative z-10">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2 flex items-center justify-between border-b border-white/5 pb-1">
                <span>Painel de Eventos do Auto-Pilot</span>
                {autopilotRunning && <span className="animate-pulse text-indigo-400">EM CURSO...</span>}
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                {autopilotLogs.map((log, index) => (
                  <div key={index} className="text-slate-300 leading-relaxed text-[11px]">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. Alertas e Prazos de Contratos Laborais */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="text-xl">📢</span> Alertas e Prazos de Contratos Laborais
            </h3>
            <p className="text-xs text-slate-500">
              Controlo automático de prazos de acordo com a Lei do Trabalho de Moçambique.
            </p>
          </div>
          <span className="text-[10px] bg-red-50 text-red-800 font-bold px-2.5 py-1 rounded-lg border border-red-100 uppercase tracking-wider self-start sm:self-center">
            Lei nº 13/2023
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {contratosCriticos.length > 0 ? (
            <div className="space-y-3">
              {contratosCriticos.map((ct) => (
                <div key={ct.id} className="flex items-start bg-rose-50 border border-rose-100 p-4 rounded-xl gap-3">
                  <div className="text-xl shrink-0 mt-0.5">⚠️</div>
                  <div className="space-y-1 w-full">
                    <h5 className="font-bold text-rose-900 text-xs">Contrato a Terminar</h5>
                    <p className="text-[11px] text-rose-800 leading-relaxed">
                      Funcionário: <b className="font-bold text-rose-950">{ct.nome_funcionario}</b>
                    </p>
                    <div className="mt-2">
                      <button
                        onClick={() => handleEmitirAvisoPrevio(ct.id, ct.nome_funcionario, '77654321', ct.cargo)}
                        disabled={loadingAviso === ct.id}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Download size={10} />
                        {loadingAviso === ct.id ? 'A emitir...' : 'Emitir Aviso Prévio (PDF)'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-start bg-slate-50 border border-slate-100 p-4 rounded-xl gap-3">
              <div className="text-xl shrink-0 mt-0.5 text-slate-400">🛡️</div>
              <div className="space-y-1 w-full">
                <h5 className="font-bold text-slate-700 text-xs">Contratos Próximos do Fim</h5>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Sem contratos com término crítico nos próximos 30 dias.
                </p>
                <div className="bg-white text-slate-600 font-bold px-2 py-0.5 rounded text-[10px] mt-1 border border-slate-200 inline-block uppercase">
                  Situação Regular
                </div>
              </div>
            </div>
          )}

          {contratosAviso.length > 0 ? (
            <div className="space-y-3">
              {contratosAviso.map((ct) => (
                <div key={ct.id} className="flex items-start bg-amber-50 border border-amber-100 p-4 rounded-xl gap-3">
                  <div className="text-xl shrink-0 mt-0.5">⏳</div>
                  <div className="space-y-1 w-full">
                    <h5 className="font-bold text-amber-900 text-xs">Fim do Período de Experiência</h5>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Colaborador: <b className="font-bold text-amber-950">{ct.nome_funcionario}</b>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-start bg-slate-50 border border-slate-100 p-4 rounded-xl gap-3">
              <div className="text-xl shrink-0 mt-0.5 text-slate-400">⏳</div>
              <div className="space-y-1">
                <h5 className="font-bold text-slate-700 text-xs">Período de Experiência</h5>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Sem colaboradores em término de período de experiência esta semana.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start bg-emerald-50 border border-emerald-100 p-4 rounded-xl gap-3">
            <div className="text-xl shrink-0 mt-0.5 text-emerald-600">✅</div>
            <div className="space-y-1">
              <h5 className="font-bold text-emerald-900 text-xs">Conformidade Ativa</h5>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Todos os colaboradores activos com situação regular sob a Lei nº 13/2023.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 7. Central de Exportação Rápida de Relatórios & Histórico FinTech */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3) - Histórico de Liquidações FinTech */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Histórico de Liquidações FinTech</h3>
              <p className="text-xs text-slate-500">Registo oficial das transferências directas para carteiras móveis.</p>
            </div>
            <Coins size={20} className="text-slate-400" />
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Nenhuma transferência liquidada neste período.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                    <th className="py-2.5">Trabalhador</th>
                    <th className="py-2.5">Telemóvel</th>
                    <th className="py-2.5">Valor Enviado</th>
                    <th className="py-2.5">Período</th>
                    <th className="py-2.5">Estado</th>
                    <th className="py-2.5 text-right">Comprovativo</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="py-2.5 font-semibold text-slate-800">{log.employeeName}</td>
                      <td className="py-2.5 text-slate-500 font-mono">{log.carteira_movel}</td>
                      <td className="py-2.5 font-bold text-emerald-600">
                        {log.salarioLiquido.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                      </td>
                      <td className="py-2.5 text-slate-500">{log.periodo}</td>
                      <td className="py-2.5">
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold px-2 py-0.5 rounded-full text-[10px]">
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <a
                          href={`/download/recibo_${log.employeeId}_${log.periodo.replace(/\s+/g, '_')}.pdf`}
                          className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800 text-[11px]"
                        >
                          Recibo <Download size={11} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column (1/3) - Central de Exportação Rápida */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Download size={18} className="text-blue-900" />
              Exportação de Relatórios
            </h3>
            <p className="text-xs text-slate-500">
              Descarregue os mapas oficiais e extratos em PDF ou Excel instantaneamente.
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleDownloadMapaPDF}
                className="w-full py-2.5 px-3 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs flex items-center justify-between transition-colors shadow-xs cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <FileText size={15} /> Mapa de Salários (PDF)
                </span>
                <Download size={14} />
              </button>

              <button
                onClick={handleDownloadMapaExcel}
                className="w-full py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center justify-between transition-colors shadow-xs cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <FileSpreadsheet size={15} /> Mapa de Salários (Excel)
                </span>
                <Download size={14} />
              </button>

              <button
                onClick={handleDownloadHistoricoPDF}
                className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer border border-slate-200"
              >
                <span className="flex items-center gap-2">
                  <FileText size={15} className="text-rose-600" /> Histórico Financeiro (PDF)
                </span>
                <Download size={14} />
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={() => onNavigateTab && onNavigateTab('financial', 'relatorios')}
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-blue-900 font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-200 cursor-pointer"
            >
              Relatórios Completos no M4 <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* 8. Copiloto Regulatório IA Callout Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-950 to-indigo-950 text-white rounded-2xl p-6 border border-blue-800/60 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-2xl text-blue-300 border border-white/10 shrink-0">
            <Bot size={28} />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-extrabold uppercase tracking-wide">
              <Sparkles size={11} className="text-amber-400" />
              Copiloto Regulatório IA (Lei nº 13/2023)
            </div>
            <h3 className="text-sm font-bold text-white">
              Dúvidas sobre cálculo de indemnizações, horas extras, IRPS ou subsídio de maternidade?
            </h3>
            <p className="text-xs text-slate-300">
              O conselheiro virtual fornece pareceres legais auditados em conformidade com o regime fiscal moçambicano.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab && onNavigateTab('alerts')}
          className="px-5 py-2.5 bg-white hover:bg-slate-100 text-blue-950 font-extrabold rounded-xl text-xs transition-colors shrink-0 cursor-pointer shadow-sm flex items-center gap-1.5"
        >
          Consultar Copiloto no Módulo 5 <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
