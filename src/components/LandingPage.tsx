/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Calculator, 
  Percent, 
  ShieldCheck, 
  ArrowRight, 
  Lock, 
  FileSpreadsheet, 
  Users, 
  CreditCard, 
  Bell, 
  FileText, 
  CheckCircle2, 
  Zap, 
  ChevronRight, 
  Info, 
  Briefcase,
  Play,
  Sparkles,
  DollarSign,
  Smartphone,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  Cpu,
  Mail,
  Phone,
  X,
  Building2,
  Warehouse,
  Receipt,
  Search,
  Check,
  Tag
} from 'lucide-react';
import { calcularFolhaSalario } from '../db_tax';

interface LandingPageProps {
  onEnterLogin: () => void;
  onEnterRegister?: () => void;
  onEnterPlanDemo: (plan: 'Bronze' | 'Silver' | 'Gold') => void;
}

export default function LandingPage({ onEnterLogin, onEnterRegister, onEnterPlanDemo }: LandingPageProps) {
  // Mini calculator state
  const [salarioBase, setSalarioBase] = useState<number>(35000);
  const [dependentes, setDependentes] = useState<number>(1);
  const [selectedSectorLanding, setSelectedSectorLanding] = useState<string>('Comércio & Retalho');
  const [loadingPlan, setLoadingPlan] = useState<'Bronze' | 'Silver' | 'Gold' | null>(null);
  const [showContactModal, setShowContactModal] = useState<boolean>(false);
  const [selectedPlanForContact, setSelectedPlanForContact] = useState<string>('Growth');
  const [erpUrl, setErpUrl] = useState<string>('');

  useEffect(() => {
    const fetchLink = async () => {
      try {
        const response = await fetch('/api/fintech/obter-link-erp');
        const data = await response.json();
        if (data.sucesso) {
          setErpUrl(data.url_ativa_producao);
        }
      } catch (err) {
        console.error("A aguardar propagação estável do Cloud Run:", err);
      }
    };
    fetchLink();
  }, []);

  // Compute live tax data for the landing page hero calculator
  const res = calcularFolhaSalario(salarioBase, 0, dependentes);
  const percentagemLiquido = salarioBase > 0 ? (res.salarioLiquido / salarioBase) * 100 : 0;
  const percentagemDeducoes = salarioBase > 0 ? (res.totalDescontos / salarioBase) * 100 : 0;

  const handleOpenContact = (planName: string) => {
    setSelectedPlanForContact(planName);
    setShowContactModal(true);
  };

  const handlePlanClick = async (plan: 'Bronze' | 'Silver' | 'Gold') => {
    setLoadingPlan(plan);
    try {
      await onEnterPlanDemo(plan);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800 antialiased overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* Header (Navbar) */}
      <nav className="bg-white border-b border-slate-200/80 sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo "PAYROLL TECH MZ" */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-xl bg-[#1E3A8A] text-white flex items-center justify-center font-black text-xl shadow-md shadow-blue-900/20">
              P
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black text-[#1E3A8A] tracking-tight">PAYROLL TECH MZ</span>
                <span className="text-[10px] bg-emerald-600 text-white font-black px-1.5 py-0.5 rounded tracking-widest uppercase">ERP</span>
              </div>
              <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider">Moçambique · Salários, Facturação & Gestão</p>
            </div>
          </div>

          {/* Links ao centro */}
          <div className="hidden md:flex items-center gap-7 text-xs font-extrabold text-slate-600 uppercase tracking-wider">
            <a href="#modulos" className="hover:text-blue-900 transition-colors">MÓDULOS ERP</a>
            <a href="#onboarding" className="hover:text-blue-900 transition-colors">REGISTO NUEL</a>
            <a href="#planos" className="hover:text-blue-900 transition-colors">PLANOS & PREÇOS</a>
            <a href="#simulador" className="hover:text-blue-900 transition-colors">SIMULADOR</a>
            <a href="#compliance" className="hover:text-blue-900 transition-colors">COMPLIANCE AT</a>
          </div>

          {/* Botões à direita */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onEnterLogin}
              className="px-3.5 py-2 text-slate-700 hover:text-blue-900 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Lock size={13} />
              <span>Entrar</span>
            </button>

            <button
              onClick={onEnterRegister || onEnterLogin}
              className="px-4.5 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-lg text-xs font-extrabold transition-all shadow-md shadow-blue-900/20 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles size={13} className="text-amber-400" />
              <span>Criar Conta</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Seção Hero (Abertura Comercial) */}
      <section className="relative overflow-hidden bg-white border-b border-slate-200/60 py-16 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-40"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-50 blur-3xl opacity-50"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-emerald-50 blur-3xl opacity-50"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Lado Esquerdo */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-gradient-to-r from-blue-50 to-emerald-50 text-blue-900 rounded-full border border-blue-200/80 font-bold text-[10px] tracking-wide uppercase">
              <Sparkles size={11} className="text-amber-500 animate-spin" />
              O ERP UNIVERSAL PARA MICRO E PEQUENAS EMPRESAS EM MOÇAMBIQUE 🇲🇿
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.12]">
              O Sistema de Gestão Perfeito para o <span className="text-blue-900">Seu Ramo de Negócio</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl font-medium">
              Quer tenha uma <b>mercearia, restaurante, empresa de serviços, oficina, construtora, transporte ou clínica</b>, o Payroll Tech MZ adapta-se instantaneamente: facturação PGC-NIRF com IVA ou <b>ISPC (3%)</b>, salários com INSS/IRPS, CRM de Vendas e dashboard simplificado sem complicações contabilísticas.
            </p>

            <div className="flex flex-wrap gap-3.5 pt-2">
              <button
                onClick={onEnterRegister || onEnterLogin}
                className="px-6 py-3.5 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-blue-900/25 flex items-center gap-2 cursor-pointer"
              >
                <Building2 size={16} />
                <span>EXPERIMENTAR GRÁTIS VIA NUEL</span>
                <ArrowRight size={14} />
              </button>

              <button
                onClick={onEnterLogin}
                className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer border border-slate-200"
              >
                <Lock size={14} />
                <span>Entrar no Sistema</span>
              </button>
            </div>

            {/* Destaques de Compliance & Universalidade */}
            <div className="pt-6 border-t border-slate-100 grid grid-cols-3 gap-4 max-w-xl">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-blue-900 uppercase tracking-wider block">PAINEL SIMPLIFICADO</span>
                <p className="text-xs font-bold text-slate-700">Lucro, Saldo & Caixa para Leigos</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block">REGIME ISPC / IVA</span>
                <p className="text-xs font-bold text-slate-700">Imposto Simplificado 3% ou IVA 16%</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider block">M-PESA & E-MOLA</span>
                <p className="text-xs font-bold text-slate-700">Salários & Cobranças Diretas</p>
              </div>
            </div>
          </div>

          {/* Lado Direito: Preview da Interface ERP */}
          <div className="lg:col-span-5">
            <div className="bg-[#0B1736] text-white rounded-2xl p-6 shadow-2xl border border-blue-950 space-y-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 text-[9px] font-black px-3 py-1 uppercase tracking-wider rounded-bl-lg flex items-center gap-1">
                <span>⚡ ADAPTADOR UNIVERSAL PME</span>
              </div>
              
              <div className="flex items-center gap-2.5 border-b border-blue-900/60 pb-3.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-blue-300">
                  Payroll Tech MZ · Painel Principal
                </span>
              </div>

              {/* KPI Preview Card */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-950/80 p-3.5 rounded-xl border border-blue-800/80 space-y-1">
                  <span className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-wider block">SALDO LÍQUIDO DISPONÍVEL</span>
                  <span className="text-base font-black text-white font-mono">245.800,00 MT</span>
                  <span className="text-[9px] text-emerald-300 font-bold block">✓ Tesouraria Real + Caixa</span>
                </div>

                <div className="bg-blue-950/80 p-3.5 rounded-xl border border-blue-800/80 space-y-1">
                  <span className="text-[9px] font-extrabold text-amber-400 uppercase tracking-wider block">LUCRO ESTIMADO MÊS</span>
                  <span className="text-base font-black text-white font-mono">68.450,00 MT</span>
                  <span className="text-[9px] text-blue-300 font-bold block">Receitas - Custos - Despesas</span>
                </div>
              </div>

              {/* Onboarding Wizard Feature Highlight */}
              <div className="bg-white/5 rounded-xl p-4 border border-blue-800/60 space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold text-blue-200 flex items-center gap-1.5">
                    <Search size={13} className="text-amber-400" />
                    Registo por NUEL em 1-Clique
                  </span>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-extrabold px-2 py-0.5 rounded border border-emerald-500/30">
                    SISTEMA AT MOÇAMBIQUE
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-normal">
                  Insira o NUEL da sua empresa para preencher automaticamente NUIT, endereço social, regime fiscal e parâmetros de IVA/ISPC sem burocracia.
                </p>
              </div>

              {/* Instant M-Pesa Disparos */}
              <div className="bg-blue-950/40 rounded-xl p-3.5 border border-blue-900/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Smartphone size={16} className="text-emerald-400" />
                  <span className="font-bold text-slate-200">Disparo M-Pesa & e-Mola</span>
                </div>
                <span className="text-[10px] font-black text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded">
                  Salários & Fornecedores
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO NOVIDADE: DEMONSTRAÇÃO INTERACTIVA DE ADAPTAÇÃO POR SECTOR */}
      <section className="py-16 bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 text-white border-b border-blue-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-blue-300 font-black text-xs uppercase tracking-widest block">⚡ Adaptador Multissectorial Moçambique</span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Selecione o seu Ramo de Negócio e veja como o sistema se adapta
            </h2>
            <p className="text-xs sm:text-sm text-blue-100 font-medium">
              O Payroll Tech MZ altera automaticamente as opções tributárias (ISPC 3% vs IVA 16%), categorias de despesas, folhas de vencimento e tipos de facturas para o seu sector.
            </p>
          </div>

          {/* Grid de 9 Sectores */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2.5">
            {[
              { id: 'Comércio & Retalho', icon: '🛒', label: 'Comércio' },
              { id: 'Prestação de Serviços & Tecnologia', icon: '💼', label: 'Serviços' },
              { id: 'Restauração & Hotelaria', icon: '🍽️', label: 'Restaurante' },
              { id: 'Construção & Obras', icon: '🏗️', label: 'Construção' },
              { id: 'Indústria & Oficina', icon: '🛠️', label: 'Oficinas' },
              { id: 'Transporte & Logística', icon: '🚚', label: 'Transporte' },
              { id: 'Educação & Formação', icon: '🏫', label: 'Educação' },
              { id: 'Saúde & Beleza', icon: '🩺', label: 'Saúde' },
              { id: 'Agricultura & Agronegócio', icon: '🌾', label: 'Agricultura' }
            ].map((sec) => {
              const active = selectedSectorLanding === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setSelectedSectorLanding(sec.id)}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    active 
                      ? 'bg-blue-600 border-blue-400 text-white shadow-lg ring-2 ring-blue-300 scale-105' 
                      : 'bg-white/10 border-white/15 text-blue-100 hover:bg-white/20'
                  }`}
                >
                  <div className="text-2xl mb-1">{sec.icon}</div>
                  <div className="text-[11px] font-bold leading-tight">{sec.label}</div>
                </button>
              );
            })}
          </div>

          {/* Painel com detalhes do sector seleccionado */}
          <div className="bg-white/10 border border-white/20 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-left backdrop-blur-xs">
            <div className="space-y-2">
              <span className="text-[10px] font-black text-blue-300 uppercase tracking-wider block">1. REGIME FISCAL RECOMENDADO</span>
              <h4 className="text-base font-extrabold text-white">
                {selectedSectorLanding.includes('Serviços') || selectedSectorLanding.includes('Construção') ? 'Regime Geral IVA (16%)' :
                 selectedSectorLanding.includes('Educação') || selectedSectorLanding.includes('Saúde') ? 'Isento de IVA (Artigo 9º)' : 'ISPC - Imposto Simplificado (3%)'}
              </h4>
              <p className="text-xs text-blue-100 leading-relaxed font-medium">
                {selectedSectorLanding.includes('Serviços') || selectedSectorLanding.includes('Construção')
                  ? 'Permite deduzir IVA suportado em compras de equipamentos e insumos com prestação de contas PGC-NIRF.'
                  : selectedSectorLanding.includes('Educação') || selectedSectorLanding.includes('Saúde')
                  ? 'Isenção direta sob o Artigo 9º do Código do IVA de Moçambique com apuramento simplificado.'
                  : 'Ideal para Microempresas com facturação até 2.500.000,00 MT/ano. Pague apenas 3% sobre vendas sem obrigações de IVA complexas.'}
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black text-blue-200 uppercase tracking-wider block">2. MODELO DE FACTURAÇÃO</span>
              <h4 className="text-base font-extrabold text-white">
                {selectedSectorLanding.includes('Comércio') || selectedSectorLanding.includes('Restauração') ? 'Venda a Dinheiro & Factura-Recibo Rápida' :
                 selectedSectorLanding.includes('Construção') || selectedSectorLanding.includes('Serviços') ? 'Pró-Formas, Autos de Medição & Facturas FT' : 'Factura-Recibo & Recibo de Inscrição'}
              </h4>
              <p className="text-xs text-blue-100 leading-relaxed font-medium">
                Impressão instantânea em A4 ou POS/Térmica com QR Code da Autoridade Tributária e referência de pagamento via M-Pesa.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black text-sky-300 uppercase tracking-wider block">3. PROCESSAMENTO DE RH & SALÁRIOS</span>
              <h4 className="text-base font-extrabold text-white">INSS + IRPS 2026 Automático</h4>
              <p className="text-xs text-blue-100 leading-relaxed font-medium">
                Geração automática do mapa de salários, retenção de IRPS por dependentes e exportação direta da Guia de Recolha de INSS para o portal SISSMO.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Seção Módulos do ERP */}
      <section id="modulos" className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="space-y-3 text-center max-w-3xl mx-auto">
            <span className="text-blue-900 font-black text-xs uppercase tracking-widest block">Módulos Integrados</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Tudo o que a sua Empresa Precisa num Único ERP
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium">
              Elimine aplicações separadas. O Payroll Tech MZ Cloud ERP unifica todas as áreas operacionais com total rigor regulatório moçambicano.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Módulo Dashboard Financeiro para Leigos */}
            <div className="bg-white rounded-2xl p-6 border border-emerald-200 shadow-xs hover:shadow-md transition-all space-y-3 text-left relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-emerald-600 text-white rounded-xl w-12 h-12 flex items-center justify-center font-bold">
                  <Calculator size={22} />
                </div>
                <span className="text-[10px] bg-emerald-50 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full border border-emerald-200">
                  ⚡ Painel para Leigos
                </span>
              </div>
              <h3 className="font-black text-slate-900 text-sm">Dashboard Financeiro em Tempo Real</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Visualização clara sem jargão contabilístico: Saldo em Caixa, Receitas Totais com IVA/ISPC, Custos Directos de Insumos, Despesas de Pessoal e Lucro Líquido Real.
              </p>
              <button
                onClick={onEnterLogin}
                className="text-xs font-black text-emerald-700 hover:text-emerald-900 flex items-center gap-1 pt-1 group-hover:translate-x-1 transition-transform cursor-pointer"
              >
                <span>Ver Demonstração</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Módulo CRM & Vendas */}
            <div className="bg-white rounded-2xl p-6 border border-blue-200 shadow-xs hover:shadow-md transition-all space-y-3 text-left relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-blue-900 text-white rounded-xl w-12 h-12 flex items-center justify-center font-bold">
                  <TrendingUp size={22} />
                </div>
                <span className="text-[10px] bg-blue-50 text-blue-800 font-extrabold px-2 py-0.5 rounded-full border border-blue-200">
                  ⚡ CRM Completo
                </span>
              </div>
              <h3 className="font-black text-slate-900 text-sm">Módulo CRM & Pipeline de Vendas</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Gestão de contactos, oportunidades de negócio, emissão de propostas comerciais e conversão direta em Factura-Recibo (FR) ou Venda a Dinheiro.
              </p>
              <button
                onClick={onEnterLogin}
                className="text-xs font-black text-blue-900 hover:text-blue-950 flex items-center gap-1 pt-1 group-hover:translate-x-1 transition-transform cursor-pointer"
              >
                <span>Acessar Módulo</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Módulo Facturação & Vendas */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3 text-left">
              <div className="p-3 bg-blue-50 text-blue-900 rounded-xl w-12 h-12 flex items-center justify-center font-bold">
                <Receipt size={22} />
              </div>
              <h3 className="font-black text-slate-900 text-sm">Facturação com IVA (16%) & ISPC (3%)</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Emita Pró-Formas, Facturas-Recibo (FR), Facturas (FT) e Vendas a Dinheiro (VD) em PDF profissional com QR Code e referência M-Pesa.
              </p>
            </div>

            {/* Módulo Stocks & Armazéns */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3 text-left">
              <div className="p-3 bg-amber-50 text-amber-700 rounded-xl w-12 h-12 flex items-center justify-center font-bold">
                <Warehouse size={22} />
              </div>
              <h3 className="font-black text-slate-900 text-sm">Compras, Stocks & Armazéns</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Registo de compras a fornecedores, deduções de IVA suportado, controlo de stock em múltiplos armazéns e alertas de reposição.
              </p>
            </div>

            {/* Módulo Salários & RH */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3 text-left">
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl w-12 h-12 flex items-center justify-center font-bold">
                <Users size={22} />
              </div>
              <h3 className="font-black text-slate-900 text-sm">Salários & RH (IRPS / INSS)</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Cálculo de IRPS atualizado em 2026, INSS (3% trabalhador + 4% patronal), mapa de folha, recibos de vencimento em PDF e pagamentos em lote.
              </p>
            </div>

            {/* Módulo Alertas Fiscais */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3 text-left">
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl w-12 h-12 flex items-center justify-center font-bold">
                <Bell size={22} />
              </div>
              <h3 className="font-black text-slate-900 text-sm">Alertas Fiscais & Lei 13/2023</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Alertas automáticos para liquidação do IVA M/01, guias do INSS (até dia 10) e aviso prévio do fim de contratos sob a Lei do Trabalho.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Seção Onboarding Highlights */}
      <section id="onboarding" className="py-16 bg-white border-y border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-7 space-y-4 text-left">
            <span className="text-xs font-black text-blue-900 uppercase tracking-widest block">ASSISTENTE ONBOARDING WIZARD</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Registe a sua Empresa em Menos de 2 Minutos
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
              O nosso assistente orienta o utilizador na definição da conta, carregamento do logótipo da empresa, escolha do plano de subscrição e criação automática do primeiro armazém de stock.
            </p>
            <ul className="space-y-2 text-xs font-semibold text-slate-700 pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>Preenchimento por NUEL para empresas registadas em Moçambique</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>Seleção flexível do regime de IVA (Normal 16%, Isento ou Simplificado 5%)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>Pagamento facilitado via M-Pesa, e-Mola ou Voucher de Reseller</span>
              </li>
            </ul>
          </div>

          <div className="md:col-span-5 bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold">
                100%
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900">Activação Automática de Produção</h4>
                <p className="text-[10px] text-slate-500 font-medium">Sem necessidade de aprovações manuais nem burocracia.</p>
              </div>
            </div>

            <button
              onClick={onEnterRegister || onEnterLogin}
              className="w-full py-3 bg-blue-900 hover:bg-blue-950 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-900/15 cursor-pointer flex items-center justify-center gap-2"
            >
              <Building2 size={15} />
              <span>Iniciar Wizard de Registo</span>
            </button>
          </div>
        </div>
      </section>

      {/* Seção de Preços e Planos */}
      <section id="planos" className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 text-center">
          <div className="space-y-3 max-w-xl mx-auto">
            <span className="text-blue-900 font-black text-xs uppercase tracking-widest block">Subscrições Oficiais ERP</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Planos Adaptados à Dimensão do Seu Negócio
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium">
              Escolha a licença ideal. Pague mensalmente com total transparência em Meticais.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-5xl mx-auto">
            {/* Starter */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="text-[10px] bg-slate-100 text-slate-800 font-black px-2 py-0.5 rounded uppercase tracking-wider border border-slate-200">
                  Starter
                </span>
                <h3 className="text-lg font-black text-slate-900">Plano Starter</h3>
                <p className="text-xs text-slate-500 leading-normal font-medium">
                  Ideal para startups e micro-negócios em fase inicial.
                </p>
                <div>
                  <span className="text-2xl font-black text-slate-900 font-mono">1.500,00 MT</span>
                  <span className="text-[10px] text-slate-400 font-bold block">Mensal / Isento de fidelização</span>
                </div>
                
                <div className="h-[1px] bg-slate-100 w-full" />
                
                <ul className="space-y-2 text-xs text-slate-600 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    Até 5 Funcionários Ativos
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    Facturação Eletrónica (IVA 16%)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    Gestão de Vendas & Clientes
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    1 Armazém de Stock
                  </li>
                </ul>
              </div>

              <button
                onClick={() => handleOpenContact('Starter')}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-extrabold rounded-xl text-xs transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-xs"
              >
                Subscrever Starter
              </button>
            </div>

            {/* Growth */}
            <div className="bg-white rounded-2xl p-6 border-2 border-blue-900 shadow-xl flex flex-col justify-between relative overflow-hidden space-y-6">
              <div className="absolute top-0 right-0 bg-blue-900 text-white text-[9px] font-black px-3 py-1 uppercase tracking-wider rounded-bl-xl">
                Mais Popular
              </div>

              <div className="space-y-4">
                <span className="text-[10px] bg-blue-50 text-blue-900 font-black px-2 py-0.5 rounded uppercase tracking-wider border border-blue-200">
                  Growth
                </span>
                <h3 className="text-lg font-black text-blue-900">Plano Growth</h3>
                <p className="text-xs text-slate-500 leading-normal font-medium">
                  Para empresas em expansão que exigem módulo completo de salários.
                </p>
                <div>
                  <span className="text-2xl font-black text-blue-900 font-mono">3.000,00 MT</span>
                  <span className="text-[10px] text-slate-400 font-bold block">Mensal / Acesso completo RH</span>
                </div>
                
                <div className="h-[1px] bg-slate-100 w-full" />
                
                <ul className="space-y-2 text-xs text-slate-600 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    Até 15 Funcionários Ativos
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    Facturação + Compras & Despesas
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    Folha de Salários IRPS + INSS (SISSMO)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    Pagamentos em Lote M-Pesa / e-Mola
                  </li>
                </ul>
              </div>

              <button
                onClick={() => handleOpenContact('Growth')}
                className="w-full py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-extrabold rounded-xl text-xs transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-md shadow-blue-900/20"
              >
                Subscrever Growth
              </button>
            </div>

            {/* Business */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="text-[10px] bg-indigo-50 text-indigo-900 font-black px-2 py-0.5 rounded uppercase tracking-wider border border-indigo-200">
                  Business
                </span>
                <h3 className="text-lg font-black text-slate-900">Plano Business</h3>
                <p className="text-xs text-slate-500 leading-normal font-medium">
                  Gestão avançada, múltiplos armazéns e inteligência artificial.
                </p>
                <div>
                  <span className="text-2xl font-black text-slate-900 font-mono">4.500,00 MT</span>
                  <span className="text-[10px] text-slate-400 font-bold block">Mensal / Multi-armazém</span>
                </div>
                
                <div className="h-[1px] bg-slate-100 w-full" />
                
                <ul className="space-y-2 text-xs text-slate-600 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    Até 30 Funcionários Ativos
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    Todos os Módulos do ERP Integrados
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    Múltiplos Armazéns & Contabilidade
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    Payroll Tech IA Insights & Alertas Fiscais
                  </li>
                </ul>
              </div>

              <button
                onClick={() => handleOpenContact('Business')}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-extrabold rounded-xl text-xs transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-xs"
              >
                Subscrever Business
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Seção de Simulador Rápido */}
      <section id="simulador" className="py-20 bg-white border-t border-slate-200/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
          <div className="space-y-3">
            <span className="text-blue-900 font-black text-xs uppercase tracking-widest block">Simulador Interativo Moçambique</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Calcule as Retenções Fiscais em Tempo Real
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto font-medium">
              Veja a simulação de retenção na fonte do IRPS e do INSS (3%) de acordo com as tabelas em vigor na República de Moçambique.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 sm:p-10 border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-8 text-left shadow-xs">
            {/* Input area */}
            <div className="space-y-6">
              <h3 className="font-black text-slate-900 text-sm border-b border-slate-200 pb-3 flex items-center gap-2">
                <Calculator size={16} className="text-blue-900" />
                Parâmetros de Simulação
              </h3>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-600">Salário Base Mensal:</span>
                  <span className="text-blue-900 font-mono font-black">{salarioBase.toLocaleString('pt-MZ')} MT</span>
                </div>
                <input
                  type="range"
                  min="5000"
                  max="150000"
                  step="5000"
                  value={salarioBase}
                  onChange={(e) => setSalarioBase(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 block">Dependentes Familiares:</label>
                <select
                  value={dependentes}
                  onChange={(e) => setDependentes(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-900/15"
                >
                  <option value={0}>0 Dependentes</option>
                  <option value={1}>1 Dependente</option>
                  <option value={2}>2 Dependentes</option>
                  <option value={3}>3 Dependentes</option>
                  <option value={4}>4 ou mais Dependentes</option>
                </select>
              </div>

              <div className="bg-blue-50/60 p-3.5 rounded-xl text-[11px] text-slate-600 font-medium border border-blue-100">
                <Info size={14} className="text-blue-900 inline-block mr-1.5 shrink-0 align-text-bottom" />
                Cálculos alinhados com o Código do IRPS e Regulamento do INSS da República de Moçambique.
              </div>
            </div>

            {/* Results breakdown */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 flex flex-col justify-between space-y-6 shadow-xs">
              <div className="space-y-4">
                <h3 className="font-black text-slate-900 text-sm border-b border-slate-100 pb-2">
                  Deduções Estimadas
                </h3>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-600">
                    <span>Salário Líquido Recebido:</span>
                    <span className="text-emerald-700 font-mono font-black">{percentagemLiquido.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                    <div style={{ width: `${percentagemLiquido}%` }} className="h-full bg-emerald-600" />
                    <div style={{ width: `${percentagemDeducoes}%` }} className="h-full bg-rose-500" />
                  </div>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Salário Bruto:</span>
                    <span className="font-bold text-slate-800">{salarioBase.toLocaleString('pt-MZ')} MT</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">INSS Trabalhador (3%):</span>
                    <span className="font-bold text-rose-600">-{res.inssTrabalhador.toLocaleString('pt-MZ', { maximumFractionDigits: 2 })} MT</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Retenção de IRPS:</span>
                    <span className="font-bold text-rose-600">-{res.irpsConstatado.toLocaleString('pt-MZ', { maximumFractionDigits: 2 })} MT</span>
                  </div>
                  <div className="flex justify-between py-2 px-3 bg-emerald-50 text-emerald-900 rounded-xl font-bold">
                    <span>Salário Líquido:</span>
                    <span className="font-black text-sm">{res.salarioLiquido.toLocaleString('pt-MZ', { maximumFractionDigits: 2 })} MT</span>
                  </div>
                </div>
              </div>

              <button
                onClick={onEnterRegister || onEnterLogin}
                className="w-full py-3 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-blue-900/15"
              >
                <span>Processar no ERP Completo</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Conformidade & Legislação */}
      <section id="compliance" className="py-16 bg-[#0B1736] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="p-3 bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-2xl w-12 h-12 flex items-center justify-center font-bold mx-auto">
            <ShieldCheck size={26} />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            100% de Conformidade Regulamentar em Moçambique
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl mx-auto font-medium">
            Facturação em conformidade com as diretivas do Ministério das Finanças e Autoridade Tributária de Moçambique, tabelas de IRPS actualizadas e recolha de INSS pronta a exportar para o portal SISSMO.
          </p>
        </div>
      </section>

      {/* Rodapé (Footer) */}
      <footer className="bg-slate-950 text-white py-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-900 text-white flex items-center justify-center font-black text-sm">
              P
            </div>
            <div>
              <span className="text-xs font-black tracking-wider block text-white">PAYROLL TECH MZ ERP</span>
              <span className="text-[9px] text-emerald-400 font-bold block uppercase tracking-widest">Moçambique</span>
            </div>
          </div>
          
          <p className="text-[10px] text-slate-400 text-center md:text-left">
            © 2018 – 2026 PAYROLL TECH MZ. Todos os direitos reservados.
          </p>
          
          <div className="flex gap-4 text-[10px] text-slate-400 font-bold">
            <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
            <span>•</span>
            <a href="#" className="hover:text-white transition-colors">Privacidade</a>
            <span>•</span>
            <a href="#" className="hover:text-white transition-colors">Suporte Técnico</a>
          </div>
        </div>
      </footer>

      {/* Modal de Contacto para Subscrições */}
      {showContactModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative space-y-6">
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="space-y-2 text-center">
              <div className="w-12 h-12 bg-blue-50 text-blue-900 rounded-2xl flex items-center justify-center mx-auto text-xl font-bold">
                🏢
              </div>
              <h3 className="text-lg font-black text-slate-900">Activação do Plano {selectedPlanForContact}</h3>
              <p className="text-xs text-slate-500 font-medium">
                Pode subscrever autonomamente criando conta no sistema ou contactando a nossa equipa de vendas:
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowContactModal(false);
                  if (onEnterRegister) onEnterRegister();
                  else onEnterLogin();
                }}
                className="w-full py-3 bg-blue-900 hover:bg-blue-950 text-white font-extrabold rounded-xl text-xs transition-all shadow-md shadow-blue-900/15 cursor-pointer flex items-center justify-center gap-2"
              >
                <Building2 size={15} />
                <span>Criar Conta & Registar Empresa Agora</span>
              </button>

              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                <div className="relative flex justify-center text-[10px] font-bold uppercase"><span className="bg-white px-3 text-slate-400">OU FALE COM O FUNDADOR</span></div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                <div className="flex items-center gap-3">
                  <Mail size={15} className="text-blue-900 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Email Direto</p>
                    <a href="mailto:gersonjcumbane@gmail.com" className="font-bold text-blue-900 hover:underline">
                      gersonjcumbane@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone size={15} className="text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Telefone / WhatsApp</p>
                    <a href="tel:+258861390061" className="font-bold text-slate-800 hover:underline">
                      +258 861390061 / 842014173
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botão de WhatsApp Flutuante */}
      <a
        href="https://wa.me/258842014173?text=Ol%C3%A1%2C%20gostaria%20de%20saber%20mais%20sobre%20o%20Payroll%20Tech%20MZ."
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#20ba5a] text-white p-3.5 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
        title="Contactar via WhatsApp"
        id="btn_whatsapp_flutuante"
      >
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.18 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.115-2.906-6.99C16.55 1.87 14.075.841 11.973.841c-5.441 0-9.865 4.422-9.869 9.865-.001 1.761.47 3.473 1.365 4.975l-.991 3.619 3.714-.974zm12.335-7.39c-.316-.158-1.87-.924-2.155-1.027-.285-.104-.492-.158-.7.158-.207.317-.803.104-.984.316-.18.213-.362.213-.678.055-.316-.158-1.334-.491-2.541-1.57C11.533 9.444 10.9 8.01 10.74 7.746c-.158-.317-.017-.488.141-.645.142-.142.316-.369.474-.554.158-.185.21-.317.316-.528.106-.211.053-.396-.026-.554-.079-.158-.7-1.691-.959-2.316-.252-.61-.51-.527-.7-.537-.181-.009-.39-.01-.599-.01-.21 0-.554.079-.844.396-.29.317-1.11 1.083-1.11 2.64 0 1.557 1.133 3.064 1.292 3.275.158.21 2.227 3.4 5.397 4.767.753.325 1.343.52 1.802.666.759.241 1.449.207 1.995.126.608-.091 1.87-.765 2.134-1.466.264-.702.264-1.303.185-1.428-.079-.126-.285-.21-.601-.368z"/>
        </svg>
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-out whitespace-nowrap text-xs font-bold pl-0 group-hover:pl-2">
          WhatsApp Suporte
        </span>
      </a>
    </div>
  );
}
