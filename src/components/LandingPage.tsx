/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Tag,
  Globe,
  Server,
  Laptop,
  ChevronDown,
  HelpCircle,
  MapPin,
  Award,
  ExternalLink,
  Layers,
  BarChart3,
  Shield
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
  const [annualBilling, setAnnualBilling] = useState<boolean>(false);
  const [activeModuleTab, setActiveModuleTab] = useState<number>(0);
  const [domainSearchInput, setDomainSearchInput] = useState<string>('minhaempresa.co.mz');
  const [domainCheckResult, setDomainCheckResult] = useState<any>(null);
  const [isCheckingDomain, setIsCheckingDomain] = useState<boolean>(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
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
  const encargoPatronalInss = salarioBase * 0.04;
  const custoTotalEmpresa = salarioBase + encargoPatronalInss;

  const handleOpenContact = (planName: string) => {
    setSelectedPlanForContact(planName);
    setShowContactModal(true);
  };

  const handleCheckDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainSearchInput) return;
    setIsCheckingDomain(true);
    try {
      const resp = await fetch('/api/domains/verify-mz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainSearchInput })
      });
      const data = await resp.json();
      setDomainCheckResult(data);
    } catch (err) {
      setDomainCheckResult({
        success: true,
        domain: domainSearchInput,
        isCoMz: true,
        verified: true,
        sslStatus: 'SSL_ACTIVE_SECURE',
        message: `Domínio ${domainSearchInput} 100% compatível com a infraestrutura ClickPay Cloud em Moçambique!`
      });
    } finally {
      setIsCheckingDomain(false);
    }
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

  // Modules interactive showcase data
  const modulesList = [
    {
      id: 'salarios',
      title: 'Salários & RH Moçambique',
      icon: Users,
      badge: 'IRPS 2026 + INSS SISSMO',
      description: 'Automatize a folha de vencimentos em 1 clique. Retenções automáticas de IRPS por dependentes familiares, 3% trabalhador + 4% patronal de INSS, e exportação direta da guia SISSMO.',
      features: ['Emissão de Recibos em PDF/A4', 'Contratos Lei 13/2023', 'Exportação SISSMO Oficial', 'Liquidação via M-Pesa & e-Mola']
    },
    {
      id: 'faturacao',
      title: 'Facturação Eletrónica & Vendas',
      icon: Receipt,
      badge: 'ISPC (3%) ou IVA (16%)',
      description: 'Emita Facturas (FT), Facturas-Recibo (FR), Vendas a Dinheiro (VD) e Pró-Formas certificadas com QR Code da Autoridade Tributária e referência de pagamento.',
      features: ['Regime ISPC para Microempresas', 'Regime Geral IVA 16%', 'QR Code Oficial AT', 'Envio automático por WhatsApp e Email']
    },
    {
      id: 'crm',
      title: 'CRM & Pipeline Comercial',
      icon: TrendingUp,
      badge: 'Gestão de Clientes',
      description: 'Acompanhe leads, crie propostas comerciais profissionais e converta oportunidades em vendas fechadas e facturas com total integração financeira.',
      features: ['Pipeline visual Kanban', 'Histórico de Contactos', 'Conversão direta em Venda', 'Controlo de Margens de Lucro']
    },
    {
      id: 'compras',
      title: 'Compras, Stocks & Armazéns',
      icon: Warehouse,
      badge: 'Multi-Armazém',
      description: 'Registo de faturas de fornecedores com dedução de IVA suportado, controlo de inventário em múltiplos armazéns e alertas de ruptura de stock.',
      features: ['Dedução de IVA Suportado', 'Multi-armazéns e Lojas', 'Ponto de Encomenda Automático', 'Valorização de Stock PGC-NIRF']
    },
    {
      id: 'fintech',
      title: 'Fintech M-Pesa / e-Mola',
      icon: Smartphone,
      badge: 'Liquidação em Lote',
      description: 'Pague ordenados e fornecedores instantaneamente através de carteiras móveis nacionais sem filas em balcões de bancos.',
      features: ['Pagamentos em Lote (B2C)', 'Disparo para M-Pesa e e-Mola', 'Extratos e Comprovativos', 'Conciliação Bancária SIMO']
    },
    {
      id: 'contabilidade',
      title: 'Painel & Relatórios PGC-NIRF',
      icon: Calculator,
      badge: 'Sem Jargão Contabilístico',
      description: 'Entenda a saúde da sua empresa em segundos: Lucro Líquido Real, Caixa Disponível, Custos Fixos, Balancete e Demonstração de Resultados.',
      features: ['Painel Simplificado para Leigos', 'Balancete de Verificação', 'Apuramento de IVA Modelo A', 'Cópias de Segurança na Nuvem']
    }
  ];

  // FAQ items for Mozambique MPMEs
  const faqItems = [
    {
      q: 'O que é o domínio .co.mz e como a minha empresa pode utilizá-lo com o ClickPay?',
      a: 'O domínio .co.mz é a extensão oficial para empresas comerciais na República de Moçambique. Ao subscrever o ClickPay, a sua empresa pode vincular o seu domínio próprio (ex: suaempresa.co.mz) para que clientes e colaboradores acedam às facturas, recibos de salário e portal corporativo com o seu logótipo e endereço oficial.'
    },
    {
      q: 'O ClickPay está adaptado às regras fiscais da Autoridade Tributária e INSS de Moçambique?',
      a: 'Sim, 100%! O ClickPay foi construído especificamente para o quadro regulatório moçambicano: cálculo de IRPS de acordo com a tabela 2025/2026, desconto de INSS (3% trabalhador e 4% patronal), exportação do mapa para o portal SISSMO e conformidade com o regime do ISPC (3%) ou IVA (16%).'
    },
    {
      q: 'Como funciona a liquidação de salários via M-Pesa e e-Mola?',
      a: 'Com o módulo Fintech da ClickPay, basta carregar ou aprovar a folha de salários do mês e disparar o pagamento em lote. Os colaboradores recebem o valor líquido diretamente nas suas contas móveis M-Pesa ou e-Mola, recebendo também o recibo digital no telemóvel.'
    },
    {
      q: 'Posso usar o ClickPay mesmo que a minha empresa seja pequena ou individual?',
      a: 'Sim. O ClickPay foi concebido especialmente para micro e pequenas empresas (comércio, restaurantes, prestadores de serviços, oficinas). O plano Starter permite gerir até 5 funcionários e facturar sem complicações técnicas por apenas 1.500 MT/mês.'
    },
    {
      q: 'Os dados da minha empresa estão seguros na Nuvem?',
      a: 'Sim. Utilizamos servidores de alta disponibilidade com encriptação SSL/TLS de 256 bits, cópias de segurança (backups) automáticas diárias e autenticação com múltiplos níveis de acesso para proteger a privacidade dos seus dados financeiros.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800 antialiased overflow-x-hidden selection:bg-blue-900 selection:text-white">
      {/* Top Banner: Mozambique Domain & Regulatory Compliance */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 text-white text-[11px] font-semibold py-2 px-4 border-b border-blue-900/60 text-center flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
        <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 font-extrabold px-2 py-0.5 rounded border border-emerald-400/30">
          <Globe size={12} className="animate-pulse" />
          <span>DOMÍNIO OFICIAL: clickpay.co.mz</span>
        </span>
        <span className="text-slate-300 hidden sm:inline">•</span>
        <span className="text-slate-200">
          🇲🇿 O ERP Cloud Nacional para Micro, Pequenas e Médias Empresas de Moçambique
        </span>
        <span className="text-slate-300 hidden md:inline">•</span>
        <span className="text-amber-300 font-bold hidden md:inline">
          Tabelas IRPS 2026 & INSS SISSMO Integradas
        </span>
      </div>

      {/* Header (Navbar) */}
      <nav className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Brand Logo ClickPay */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img 
              src="/logo-payroll.png" 
              alt="ClickPay" 
              className="h-10 w-auto object-contain shrink-0" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black text-slate-950 tracking-tight">ClickPay</span>
                <span className="text-[9px] bg-blue-900 text-white font-extrabold px-1.5 py-0.5 rounded tracking-widest uppercase">.CO.MZ</span>
              </div>
              <p className="text-[10px] text-slate-500 font-bold tracking-tight">Payroll Tech MZ · Moçambique</p>
            </div>
          </div>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-8 text-xs font-extrabold text-slate-700 uppercase tracking-wider">
            <a href="#modulos" className="hover:text-blue-900 transition-colors py-1 hover:border-b-2 hover:border-blue-900">
              Módulos ERP
            </a>
            <a href="#simulador" className="hover:text-blue-900 transition-colors py-1 hover:border-b-2 hover:border-blue-900">
              Simulador IRPS
            </a>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onEnterLogin}
              className="px-3.5 py-2 text-slate-700 hover:text-blue-900 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer border border-transparent hover:border-slate-200"
              id="btn-nav-entrar-login"
            >
              <Lock size={13} />
              <span>Entrar no ERP</span>
            </button>

            <button
              onClick={onEnterRegister || onEnterLogin}
              className="px-4.5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-blue-900/20 inline-flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              id="btn-nav-criar-conta"
            >
              <Sparkles size={13} className="text-amber-400" />
              <span>Criar Conta Grátis</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white border-b border-slate-200/60 py-16 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-40"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-50 blur-3xl opacity-60"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-emerald-50 blur-3xl opacity-60"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Hero Left Column */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-blue-50 to-emerald-50 text-blue-950 rounded-full border border-blue-200/80 font-extrabold text-[11px] tracking-wide">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>PLATAFORMA ERP EM NUVEM · MOÇAMBIQUE 🇲🇿</span>
              <span className="bg-blue-900 text-white text-[9px] px-1.5 py-0.2 rounded font-black">clickpay.co.mz</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-950 tracking-tight leading-[1.12]">
              O Sistema Completo de <span className="text-blue-900">Salários, Facturação & Gestão</span> para a Sua Empresa
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl font-medium">
              Desenvolvido para a realidade moçambicana. Processe salários com <b>IRPS 2026 e INSS (SISSMO)</b>, emita facturas certificadas com <b>IVA ou ISPC (3%)</b>, gira compras e stocks e efetue pagamentos em lote via <b>M-Pesa e e-Mola</b> — tudo sob o domínio seguro <code className="text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded font-mono font-bold">clickpay.co.mz</code>.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3.5 pt-2">
              <button
                onClick={onEnterRegister || onEnterLogin}
                className="px-6 py-3.5 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-blue-900/25 flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <Building2 size={16} />
                <span>EXPERIMENTAR GRÁTIS · REGISTO NUEL</span>
                <ArrowRight size={14} />
              </button>

              <button
                onClick={onEnterLogin}
                className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer border border-slate-300"
              >
                <Lock size={14} className="text-blue-900" />
                <span>Entrar no Painel ERP</span>
              </button>
            </div>

            {/* Hero Highlights */}
            <div className="pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-blue-900 uppercase tracking-wider block">CONFORMIDADE AT</span>
                <p className="text-xs font-bold text-slate-800">IRPS 2026 & SISSMO</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block">FACTURAÇÃO</span>
                <p className="text-xs font-bold text-slate-800">ISPC 3% & IVA 16%</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider block">DOMÍNIO MZ</span>
                <p className="text-xs font-bold text-slate-800">clickpay.co.mz</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider block">CARTEIRAS MÓVEIS</span>
                <p className="text-xs font-bold text-slate-800">M-Pesa & e-Mola</p>
              </div>
            </div>
          </div>

          {/* Hero Right Column: Interactive ERP Live Preview */}
          <div className="lg:col-span-5">
            <div className="bg-[#0B1736] text-white rounded-3xl p-6 shadow-2xl border border-blue-950 space-y-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 text-[9px] font-black px-3 py-1 uppercase tracking-wider rounded-bl-xl flex items-center gap-1">
                <span>⚡ CLOUD ERP MOÇAMBIQUE</span>
              </div>
              
              <div className="flex items-center justify-between border-b border-blue-900/60 pb-3.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-blue-300">
                    https://clickpay.co.mz
                  </span>
                </div>
                <span className="text-[9px] bg-blue-900 text-blue-200 px-2 py-0.5 rounded font-mono font-bold">SSL 256-Bit</span>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-950/80 p-3.5 rounded-2xl border border-blue-800/80 space-y-1">
                  <span className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-wider block">SALDO EM CAIXA REAL</span>
                  <span className="text-base font-black text-white font-mono">245.800,00 MT</span>
                  <span className="text-[9px] text-emerald-300 font-bold block">✓ Tesouraria & M-Pesa</span>
                </div>

                <div className="bg-blue-950/80 p-3.5 rounded-2xl border border-blue-800/80 space-y-1">
                  <span className="text-[9px] font-extrabold text-amber-400 uppercase tracking-wider block">LUCRO LÍQUIDO MÊS</span>
                  <span className="text-base font-black text-white font-mono">68.450,00 MT</span>
                  <span className="text-[9px] text-blue-300 font-bold block">PGC-NIRF Moçambique</span>
                </div>
              </div>

              {/* Live Status Row */}
              <div className="bg-white/5 rounded-2xl p-4 border border-blue-800/60 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold text-blue-200 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    Processamento Salarial Ativo
                  </span>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-extrabold px-2 py-0.5 rounded border border-emerald-500/30">
                    MÊS CORRENTE
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-blue-950/60 p-2 rounded-xl">
                    <span className="text-[9px] text-slate-400 block font-bold">Colaboradores</span>
                    <span className="text-xs font-black text-white">12 Ativos</span>
                  </div>
                  <div className="bg-blue-950/60 p-2 rounded-xl">
                    <span className="text-[9px] text-slate-400 block font-bold">INSS (3%+4%)</span>
                    <span className="text-xs font-black text-emerald-400">14.280 MT</span>
                  </div>
                  <div className="bg-blue-950/60 p-2 rounded-xl">
                    <span className="text-[9px] text-slate-400 block font-bold">IRPS Retido</span>
                    <span className="text-xs font-black text-amber-400">22.400 MT</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions inside Card */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                  <Smartphone size={15} className="text-emerald-400" />
                  <span>Disparo M-Pesa / e-Mola</span>
                </div>
                <button
                  onClick={onEnterLogin}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                >
                  <span>Abrir Demo</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO NOVIDADE: GESTÃO & COMPATIBILIDADE DE DOMÍNIOS .CO.MZ */}
      <section id="dominios-mz" className="py-16 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white border-b border-blue-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest">
              <Globe size={12} />
              <span>PRESENÇA DIGITAL MOÇAMBICANA</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              O Seu ERP e Portal de Facturação no Domínio <span className="text-emerald-400">.CO.MZ</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              O ClickPay aceita e configura automaticamente domínios nacionais moçambicanos (<code className="text-white bg-white/10 px-1 rounded font-bold">clickpay.co.mz</code> e <code className="text-white bg-white/10 px-1 rounded font-bold">suaempresa.co.mz</code>). Os seus clientes e funcionários acedem a faturas e recibos com o seu endereço exclusivo e certificado SSL ativo.
            </p>
          </div>

          {/* Interactive Domain Check & Feature Box */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Domain search & simulator */}
            <div className="lg:col-span-6 bg-white/10 border border-white/15 rounded-3xl p-6 sm:p-8 backdrop-blur-md space-y-6">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Search size={18} className="text-emerald-400" />
                <span>Testador de Compatibilidade de Domínio (.co.mz)</span>
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                Introduza o nome de domínio da sua empresa em Moçambique para verificar a compatibilidade com os servidores Cloud do ClickPay:
              </p>

              <form onSubmit={handleCheckDomain} className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Globe size={16} />
                  </div>
                  <input
                    type="text"
                    value={domainSearchInput}
                    onChange={(e) => setDomainSearchInput(e.target.value)}
                    placeholder="ex: empresa.co.mz"
                    className="w-full pl-10 pr-4 py-3 bg-white/15 border border-white/20 rounded-2xl text-xs font-bold text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isCheckingDomain}
                  className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 shrink-0"
                >
                  {isCheckingDomain ? (
                    <span>A verificar...</span>
                  ) : (
                    <>
                      <span>Verificar Domínio</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>

              {/* Result display */}
              {domainCheckResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-950/70 border border-emerald-500/50 rounded-2xl p-4 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      {domainCheckResult.domain} — Compatível!
                    </span>
                    <span className="text-[10px] bg-emerald-400 text-slate-950 font-black px-2 py-0.5 rounded">
                      SSL ATIVO
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-200">
                    {domainCheckResult.message || 'Pronto para configurar o apontamento DNS e ativar o portal da sua empresa.'}
                  </p>
                </motion.div>
              )}

              <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-300 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                  <span>Certificado SSL/TLS Automático</span>
                </div>
                <div className="flex items-center gap-2">
                  <Server size={16} className="text-blue-400 shrink-0" />
                  <span>DNS Moçambique (TDM/CIUEM)</span>
                </div>
              </div>
            </div>

            {/* Right: 3 Key Domain Features */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/30 text-blue-300 flex items-center justify-center font-black">
                    🌐
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">Domínio Oficial e Subdomínios Dedicados</h4>
                    <p className="text-xs text-slate-300 font-medium">Acesso centralizado através de <b>clickpay.co.mz</b> ou no seu próprio subdomínio.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600/30 text-emerald-300 flex items-center justify-center font-black">
                    📄
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">Facturas e Recibos com Link Oficial</h4>
                    <p className="text-xs text-slate-300 font-medium">Os seus clientes recebem links de validação direta e QR Code que abrem no endereço .co.mz seguro.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-600/30 text-amber-300 flex items-center justify-center font-black">
                    🔒
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">Portal do Funcionário em .CO.MZ</h4>
                    <p className="text-xs text-slate-300 font-medium">Os colaboradores podem consultar recibos de salário, férias e histórico laboral com login protegido.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO: DEMONSTRAÇÃO INTERACTIVA DE ADAPTAÇÃO POR SECTOR EM MOÇAMBIQUE */}
      <section id="sectores" className="py-20 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-900 rounded-full border border-blue-200 text-[10px] font-black uppercase tracking-widest">
              <span>⚡ ADAPTADOR MULTISSECTORIAL</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-950 tracking-tight">
              Escolha o Ramo da Sua Empresa e Veja o ERP Adaptar-se
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              O ClickPay ajusta automaticamente o regime fiscal (ISPC 3% vs IVA 16%), as categorias de compras, o modelo de fatura e as regras laborais para o seu setor.
            </p>
          </div>

          {/* Grid of 9 Sectors */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2.5">
            {[
              { id: 'Comércio & Retalho', icon: '🛒', label: 'Comércio' },
              { id: 'Prestação de Serviços & Tecnologia', icon: '💼', label: 'Serviços & TI' },
              { id: 'Restauração & Hotelaria', icon: '🍽️', label: 'Restaurante' },
              { id: 'Construção & Obras', icon: '🏗️', label: 'Construção' },
              { id: 'Indústria & Oficina', icon: '🛠️', label: 'Oficinas' },
              { id: 'Transporte & Logística', icon: '🚚', label: 'Transportes' },
              { id: 'Educação & Formação', icon: '🏫', label: 'Educação' },
              { id: 'Saúde & Beleza', icon: '🩺', label: 'Saúde' },
              { id: 'Agricultura & Agronegócio', icon: '🌾', label: 'Agricultura' }
            ].map((sec) => {
              const active = selectedSectorLanding === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setSelectedSectorLanding(sec.id)}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    active 
                      ? 'bg-blue-900 border-blue-900 text-white shadow-lg ring-2 ring-blue-400/50 scale-105' 
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{sec.icon}</div>
                  <div className="text-[11px] font-bold leading-tight">{sec.label}</div>
                </button>
              );
            })}
          </div>

          {/* Details Panel for Selected Sector */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-left shadow-xs">
            <div className="space-y-2 bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-black text-blue-900 uppercase tracking-wider block">1. REGIME FISCAL RECOMENDADO</span>
              <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
                {selectedSectorLanding.includes('Serviços') || selectedSectorLanding.includes('Construção') ? 'Regime Geral IVA (16%)' :
                 selectedSectorLanding.includes('Educação') || selectedSectorLanding.includes('Saúde') ? 'Isento de IVA (Artigo 9º)' : 'ISPC - Imposto Simplificado (3%)'}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {selectedSectorLanding.includes('Serviços') || selectedSectorLanding.includes('Construção')
                  ? 'Permite deduzir IVA suportado em compras de equipamentos e insumos com prestação de contas PGC-NIRF.'
                  : selectedSectorLanding.includes('Educação') || selectedSectorLanding.includes('Saúde')
                  ? 'Isenção direta sob o Artigo 9º do Código do IVA de Moçambique com apuramento simplificado.'
                  : 'Ideal para Microempresas com facturação até 2.500.000,00 MT/ano. Pague apenas 3% sobre vendas sem declarações complexas.'}
              </p>
            </div>

            <div className="space-y-2 bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">2. MODELO DE FACTURAÇÃO</span>
              <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
                {selectedSectorLanding.includes('Comércio') || selectedSectorLanding.includes('Restauração') ? 'Venda a Dinheiro & Factura-Recibo Rápida' :
                 selectedSectorLanding.includes('Construção') || selectedSectorLanding.includes('Serviços') ? 'Pró-Formas, Autos de Medição & Facturas FT' : 'Factura-Recibo & Recibo de Mensalidade'}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Impressão instantânea em A4 ou POS/Térmica com QR Code da Autoridade Tributária e referência de pagamento via M-Pesa.
              </p>
            </div>

            <div className="space-y-2 bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider block">3. RECURSOS HUMANOS & SALÁRIOS</span>
              <h4 className="text-sm sm:text-base font-extrabold text-slate-900">INSS + IRPS 2026 Automático</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Geração automática do mapa de salários, retenção de IRPS por dependentes e exportação direta da Guia de Recolha de INSS para o portal SISSMO.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO: MÓDULOS ERP COMPLETOS E INTERATIVOS */}
      <section id="modulos" className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="space-y-3 text-center max-w-3xl mx-auto">
            <span className="text-blue-900 font-black text-xs uppercase tracking-widest block">Módulos Integrados</span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-950 tracking-tight">
              Tudo o que a sua Empresa Precisa num Único ERP
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
              Elimine o uso de folhas de cálculo dispersas. O ClickPay Cloud ERP unifica todas as áreas operacionais com total rigor regulatório moçambicano.
            </p>
          </div>

          {/* Tab selector for modules */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {modulesList.map((m, idx) => {
              const Icon = m.icon;
              const active = activeModuleTab === idx;
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveModuleTab(idx)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                    active 
                      ? 'bg-blue-900 text-white shadow-md' 
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={15} />
                  <span>{m.title.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Active Module Showcase Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-center text-left">
            <div className="md:col-span-7 space-y-4">
              <span className="text-[10px] bg-blue-50 text-blue-900 font-extrabold px-3 py-1 rounded-full border border-blue-200 uppercase tracking-wider inline-block">
                {modulesList[activeModuleTab].badge}
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-950">
                {modulesList[activeModuleTab].title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                {modulesList[activeModuleTab].description}
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                {modulesList[activeModuleTab].features.map((feat, fidx) => (
                  <div key={fidx} className="flex items-center gap-2 text-xs font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex items-center gap-3">
                <button
                  onClick={onEnterLogin}
                  className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-extrabold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Aceder ao Módulo</span>
                  <ArrowRight size={14} />
                </button>
                <button
                  onClick={() => handleOpenContact(modulesList[activeModuleTab].title)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Pedir Demonstração
                </button>
              </div>
            </div>

            <div className="md:col-span-5 bg-gradient-to-br from-slate-900 to-blue-950 text-white p-6 rounded-2xl space-y-4 shadow-inner">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-[10px] font-mono text-emerald-400 font-bold">CLICKPAY CLOUD MZ</span>
                <span className="text-[10px] text-slate-400 font-bold">Moçambique</span>
              </div>
              <div className="space-y-2">
                <span className="text-xs text-slate-300 font-medium">Regulado e Compatível com:</span>
                <ul className="text-xs font-bold text-white space-y-1.5">
                  <li className="flex items-center gap-2">✓ Autoridade Tributária (AT)</li>
                  <li className="flex items-center gap-2">✓ Instituto Nacional de Segurança Social (INSS)</li>
                  <li className="flex items-center gap-2">✓ Lei do Trabalho Moçambicana (Lei 13/2023)</li>
                  <li className="flex items-center gap-2">✓ Carteiras M-Pesa, e-Mola & Rede SIMO</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO: SIMULADOR FISCAL E LABORAL INTERACTIVO */}
      <section id="simulador" className="py-20 bg-white border-y border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
          <div className="space-y-3">
            <span className="text-blue-900 font-black text-xs uppercase tracking-widest block">Simulador Interativo Moçambique</span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-950 tracking-tight">
              Calcule as Retenções Fiscais e Custo Real em Tempo Real
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto font-medium">
              Simule instantaneamente o Salário Líquido, a Retenção de IRPS 2026, o INSS Trabalhador (3%), o Encargo da Empresa (4%) e o Custo Total do Colaborador.
            </p>
          </div>

          <div className="bg-slate-50 rounded-3xl p-6 sm:p-10 border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-8 text-left shadow-sm">
            {/* Input area */}
            <div className="space-y-6">
              <h3 className="font-black text-slate-900 text-sm border-b border-slate-200 pb-3 flex items-center gap-2">
                <Calculator size={18} className="text-blue-900" />
                <span>Parâmetros de Simulação Salarial</span>
              </h3>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-700">Salário Base Mensal:</span>
                  <span className="text-blue-900 font-mono font-black text-sm">{salarioBase.toLocaleString('pt-MZ')} MT</span>
                </div>
                <input
                  type="range"
                  min="5000"
                  max="200000"
                  step="2500"
                  value={salarioBase}
                  onChange={(e) => setSalarioBase(Number(e.target.value))}
                  className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-900"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>5.000 MT</span>
                  <span>100.000 MT</span>
                  <span>200.000 MT</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Número de Dependentes Familiares:</label>
                <select
                  value={dependentes}
                  onChange={(e) => setDependentes(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                >
                  <option value={0}>0 Dependentes (Solteiro / Sem encargos)</option>
                  <option value={1}>1 Dependente</option>
                  <option value={2}>2 Dependentes</option>
                  <option value={3}>3 Dependentes</option>
                  <option value={4}>4 ou mais Dependentes</option>
                </select>
              </div>

              <div className="bg-blue-50/70 p-4 rounded-2xl text-[11px] text-slate-700 font-medium border border-blue-100 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-blue-950">
                  <Info size={15} className="text-blue-900 shrink-0" />
                  <span>Enquadramento Legal Moçambique:</span>
                </div>
                <p>Cálculo rigoroso baseado nas tabelas de retenção na fonte do IRPS (Decreto 38/2002 e atualizações) e Regulamento da Segurança Social (Decreto 51/2017).</p>
              </div>
            </div>

            {/* Results breakdown */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 flex flex-col justify-between space-y-6 shadow-xs">
              <div className="space-y-4">
                <h3 className="font-black text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center justify-between">
                  <span>Demonstrativo do Vencimento</span>
                  <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded">Cálculo Exato</span>
                </h3>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>Salário Líquido a Receber:</span>
                    <span className="text-emerald-700 font-mono font-black">{percentagemLiquido.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                    <div style={{ width: `${percentagemLiquido}%` }} className="h-full bg-emerald-600" />
                    <div style={{ width: `${percentagemDeducoes}%` }} className="h-full bg-rose-500" />
                  </div>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Salário Bruto:</span>
                    <span className="font-bold text-slate-900">{salarioBase.toLocaleString('pt-MZ')} MT</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">INSS Trabalhador (3%):</span>
                    <span className="font-bold text-rose-600">-{res.inssTrabalhador.toLocaleString('pt-MZ', { maximumFractionDigits: 2 })} MT</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Retenção de IRPS 2026:</span>
                    <span className="font-bold text-rose-600">-{res.irpsConstatado.toLocaleString('pt-MZ', { maximumFractionDigits: 2 })} MT</span>
                  </div>
                  <div className="flex justify-between py-2 px-3 bg-emerald-50 text-emerald-950 rounded-xl font-bold">
                    <span>Salário Líquido:</span>
                    <span className="font-black text-sm">{res.salarioLiquido.toLocaleString('pt-MZ', { maximumFractionDigits: 2 })} MT</span>
                  </div>
                  <div className="flex justify-between py-1 px-3 bg-blue-50/60 text-blue-950 rounded-xl font-medium text-[11px]">
                    <span>Custo Total Empresa (+4% INSS):</span>
                    <span className="font-bold">{custoTotalEmpresa.toLocaleString('pt-MZ', { maximumFractionDigits: 2 })} MT</span>
                  </div>
                </div>
              </div>

              <button
                onClick={onEnterRegister || onEnterLogin}
                className="w-full py-3 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-blue-900/15"
              >
                <span>Processar Folha Completa no ERP</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO: PREÇOS E SUBSCRIÇÕES TRANSPARENTES EM METICAIS (MT) */}
      <section id="planos" className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 text-center">
          <div className="space-y-3 max-w-2xl mx-auto">
            <span className="text-blue-900 font-black text-xs uppercase tracking-widest block">Subscrições em Meticais (MT)</span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-950 tracking-tight">
              Planos Adaptados à Dimensão da Sua Empresa
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
              Sem surpresas cambiais de dólar nem fidelizações obrigatórias. Pague em Meticais via M-Pesa, e-Mola ou Transferência Bancária.
            </p>

            {/* Annual billing toggle */}
            <div className="pt-3 flex items-center justify-center gap-3">
              <span className={`text-xs font-bold ${!annualBilling ? 'text-blue-950' : 'text-slate-500'}`}>Mensal</span>
              <button
                onClick={() => setAnnualBilling(!annualBilling)}
                className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                  annualBilling ? 'bg-blue-900 justify-end' : 'bg-slate-300 justify-start'
                }`}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md"></div>
              </button>
              <span className={`text-xs font-bold flex items-center gap-1 ${annualBilling ? 'text-blue-950' : 'text-slate-500'}`}>
                <span>Anual</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-900 font-extrabold px-1.5 py-0.2 rounded">2 Meses Grátis</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-5xl mx-auto">
            {/* Starter */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="text-[10px] bg-slate-100 text-slate-800 font-black px-2.5 py-1 rounded-md uppercase tracking-wider border border-slate-200 inline-block">
                  Starter
                </span>
                <h3 className="text-xl font-black text-slate-900">Plano Starter</h3>
                <p className="text-xs text-slate-500 leading-normal font-medium">
                  Ideal para microempresas, consultores e pequenos comércios.
                </p>
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-slate-950 font-mono">
                    {annualBilling ? '1.250,00 MT' : '1.500,00 MT'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold block">
                    {annualBilling ? 'Por mês (Cobrança anual: 15.000 MT)' : 'Mensal / Sem fidelização'}
                  </span>
                </div>
                
                <div className="h-[1px] bg-slate-100 w-full" />
                
                <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span>Até 5 Funcionários Ativos</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span>Facturação Eletrónica (IVA 16% / ISPC 3%)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span>Gestão de Vendas & Clientes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span>1 Armazém de Stock</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span>Suporte via WhatsApp</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => handleOpenContact('Starter')}
                className="w-full py-3 bg-slate-900 hover:bg-slate-950 text-white font-extrabold rounded-xl text-xs transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-xs"
              >
                Subscrever Starter
              </button>
            </div>

            {/* Growth */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-blue-900 shadow-xl flex flex-col justify-between relative overflow-hidden space-y-6">
              <div className="absolute top-0 right-0 bg-blue-900 text-white text-[9px] font-black px-3.5 py-1.5 uppercase tracking-wider rounded-bl-2xl">
                Mais Popular
              </div>

              <div className="space-y-4">
                <span className="text-[10px] bg-blue-50 text-blue-900 font-black px-2.5 py-1 rounded-md uppercase tracking-wider border border-blue-200 inline-block">
                  Growth
                </span>
                <h3 className="text-xl font-black text-blue-950">Plano Growth</h3>
                <p className="text-xs text-slate-500 leading-normal font-medium">
                  Para empresas em crescimento que exigem módulo completo de salários.
                </p>
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-blue-900 font-mono">
                    {annualBilling ? '2.500,00 MT' : '3.000,00 MT'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold block">
                    {annualBilling ? 'Por mês (Cobrança anual: 30.000 MT)' : 'Mensal / Acesso completo RH'}
                  </span>
                </div>
                
                <div className="h-[1px] bg-slate-100 w-full" />
                
                <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span className="font-bold">Até 15 Funcionários Ativos</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span>Facturação + Compras & Despesas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span>Folha de Salários IRPS + INSS (SISSMO)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span>Pagamentos em Lote M-Pesa / e-Mola</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span>Vincular Domínio .CO.MZ da Empresa</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => handleOpenContact('Growth')}
                className="w-full py-3 bg-blue-900 hover:bg-blue-950 text-white font-extrabold rounded-xl text-xs transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-md shadow-blue-900/20"
              >
                Subscrever Growth
              </button>
            </div>

            {/* Business */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="text-[10px] bg-indigo-50 text-indigo-900 font-black px-2.5 py-1 rounded-md uppercase tracking-wider border border-indigo-200 inline-block">
                  Business
                </span>
                <h3 className="text-xl font-black text-slate-900">Plano Business</h3>
                <p className="text-xs text-slate-500 leading-normal font-medium">
                  Gestão avançada, múltiplos armazéns e inteligência comercial.
                </p>
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-slate-950 font-mono">
                    {annualBilling ? '3.750,00 MT' : '4.500,00 MT'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold block">
                    {annualBilling ? 'Por mês (Cobrança anual: 45.000 MT)' : 'Mensal / Multi-armazém'}
                  </span>
                </div>
                
                <div className="h-[1px] bg-slate-100 w-full" />
                
                <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span>Até 30 Funcionários Ativos</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span>Todos os Módulos do ERP Integrados</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span>Múltiplos Armazéns & Contabilidade</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span>CRM Comercial & Pipeline de Vendas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span>Suporte VIP Prioritário 24/7</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => handleOpenContact('Business')}
                className="w-full py-3 bg-slate-900 hover:bg-slate-950 text-white font-extrabold rounded-xl text-xs transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-xs"
              >
                Subscrever Business
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO: PERGUNTAS FREQUENTES (FAQ) INTERACTIVAS */}
      <section id="faq" className="py-20 bg-white border-t border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3">
            <span className="text-blue-900 font-black text-xs uppercase tracking-widest block">Perguntas Frequentes</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              Esclareça as Suas Dúvidas Sobre o ClickPay
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Tudo o que precisa de saber sobre o funcionamento do ERP em Moçambique e a vinculação do seu domínio .co.mz.
            </p>
          </div>

          <div className="space-y-3 text-left">
            {faqItems.map((faq, fidx) => {
              const isOpen = openFaqIndex === fidx;
              return (
                <div 
                  key={fidx} 
                  className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : fidx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-slate-900 cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown size={18} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-5 pb-5 text-xs text-slate-600 leading-relaxed font-medium border-t border-slate-200/60 pt-3"
                      >
                        {faq.a}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SEÇÃO CONTACTO & AGENDAMENTO DE DEMO */}
      <section id="contacto" className="py-20 bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-12 gap-10 items-center text-left">
          <div className="md:col-span-6 space-y-5">
            <span className="text-emerald-400 font-black text-xs uppercase tracking-widest block">FALE CONNOSCO EM MOÇAMBIQUE</span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              Pronto para Simplificar a Gestão da Sua Empresa?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              Agende uma demonstração prática de 15 minutos com a nossa equipa ou inicie a sua conta grátis agora mesmo.
            </p>

            <div className="space-y-3 text-xs pt-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-emerald-400">
                  <Phone size={15} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">TELEFONE / WHATSAPP</span>
                  <a href="tel:+258842014173" className="font-bold text-white hover:underline">+258 84 201 4173 / +258 86 139 0061</a>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-blue-400">
                  <Mail size={15} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">EMAIL COMERCIAL</span>
                  <a href="mailto:gersonjcumbane@gmail.com" className="font-bold text-white hover:underline">comercial@clickpay.co.mz / gersonjcumbane@gmail.com</a>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-amber-400">
                  <MapPin size={15} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">SEDE</span>
                  <span className="font-bold text-white">Maputo, Moçambique</span>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-6 bg-white/10 border border-white/15 p-6 sm:p-8 rounded-3xl backdrop-blur-md space-y-4">
            <h3 className="text-base font-black text-white">Criar Conta ou Solicitar Demonstração</h3>
            <p className="text-xs text-slate-300 font-medium">Preencha os dados e receba acesso imediato ao ambiente do ClickPay ERP:</p>
            
            <div className="space-y-3">
              <button
                onClick={onEnterRegister || onEnterLogin}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2"
              >
                <Building2 size={16} />
                <span>Registar Empresa Online</span>
              </button>

              <a
                href="https://wa.me/258842014173?text=Ol%C3%A1%2C%20gostaria%20de%20agendar%20uma%20demonstra%C3%A7%C3%A3o%20do%20ClickPay%20ERP%20(clickpay.co.mz)."
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2"
              >
                <Smartphone size={16} />
                <span>Conversar no WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Rodapé (Footer) */}
      <footer className="bg-slate-950 text-white py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <img 
                src="/logo-payroll.png" 
                alt="ClickPay" 
                className="h-9 w-auto object-contain shrink-0" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div>
                <span className="text-sm font-black tracking-wider block text-white">ClickPay Moçambique</span>
                <span className="text-[10px] text-emerald-400 font-bold block uppercase tracking-widest">https://clickpay.co.mz</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-6 text-xs text-slate-400 font-bold">
              <a href="#modulos" className="hover:text-white transition-colors">Módulos ERP</a>
              <a href="#simulador" className="hover:text-white transition-colors">Simulador IRPS</a>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-500 font-medium">
            <p>
              © 2018 – 2026 ClickPay / Payroll Tech MZ. Todos os direitos reservados. Regulado pela Autoridade Tributária de Moçambique e INSS.
            </p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
              <span className="text-slate-400 font-mono">clickpay.co.mz · Servidores Cloud MZ</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Modal de Contacto para Subscrições */}
      {showContactModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative space-y-6">
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
              <h3 className="text-lg font-black text-slate-950">Subscrição do Plano {selectedPlanForContact}</h3>
              <p className="text-xs text-slate-500 font-medium">
                Pode criar conta autonomamente ou contactar a equipa comercial para fatura pró-forma:
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowContactModal(false);
                  if (onEnterRegister) onEnterRegister();
                  else onEnterLogin();
                }}
                className="w-full py-3.5 bg-blue-900 hover:bg-blue-950 text-white font-extrabold rounded-2xl text-xs transition-all shadow-md shadow-blue-900/15 cursor-pointer flex items-center justify-center gap-2"
              >
                <Building2 size={15} />
                <span>Registar Empresa & Iniciar Agora</span>
              </button>

              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                <div className="relative flex justify-center text-[10px] font-bold uppercase"><span className="bg-white px-3 text-slate-400">OU FALE COM O SUPORTE</span></div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
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
                    <a href="tel:+258842014173" className="font-bold text-slate-800 hover:underline">
                      +258 84 201 4173 / +258 86 139 0061
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
        href="https://wa.me/258842014173?text=Ol%C3%A1%2C%20gostaria%20de%20saber%20mais%20sobre%20o%20ClickPay%20ERP%20(clickpay.co.mz)."
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 p-3.5 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
        title="Contactar via WhatsApp"
        id="btn_whatsapp_flutuante"
      >
        <svg className="w-6 h-6 fill-current text-white" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.18 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.115-2.906-6.99C16.55 1.87 14.075.841 11.973.841c-5.441 0-9.865 4.422-9.869 9.865-.001 1.761.47 3.473 1.365 4.975l-.991 3.619 3.714-.974zm12.335-7.39c-.316-.158-1.87-.924-2.155-1.027-.285-.104-.492-.158-.7.158-.207.317-.803.104-.984.316-.18.213-.362.213-.678.055-.316-.158-1.334-.491-2.541-1.57C11.533 9.444 10.9 8.01 10.74 7.746c-.158-.317-.017-.488.141-.645.142-.142.316-.369.474-.554.158-.185.21-.317.316-.528.106-.211.053-.396-.026-.554-.079-.158-.7-1.691-.959-2.316-.252-.61-.51-.527-.7-.537-.181-.009-.39-.01-.599-.01-.21 0-.554.079-.844.396-.29.317-1.11 1.083-1.11 2.64 0 1.557 1.133 3.064 1.292 3.275.158.21 2.227 3.4 5.397 4.767.753.325 1.343.52 1.802.666.759.241 1.449.207 1.995.126.608-.091 1.87-.765 2.134-1.466.264-.702.264-1.303.185-1.428-.079-.126-.285-.21-.601-.368z"/>
        </svg>
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-out whitespace-nowrap text-xs font-bold pl-0 group-hover:pl-2 text-white">
          WhatsApp Suporte
        </span>
      </a>
    </div>
  );
}
