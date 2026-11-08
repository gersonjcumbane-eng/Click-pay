/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Building2, 
  Lock, 
  ArrowRight, 
  CheckCircle2, 
  Users, 
  Receipt, 
  TrendingUp, 
  Smartphone, 
  ShieldCheck, 
  Calculator, 
  Sparkles,
  Phone,
  Mail,
  MapPin,
  X,
  FileText,
  Compass,
  Eye,
  Award,
  RefreshCw
} from 'lucide-react';
import { calcularFolhaSalario } from '../db_tax';
import { db, doc, setDoc } from '../lib/firebase';

interface LandingPageProps {
  onEnterLogin: () => void;
  onEnterRegister?: () => void;
  onEnterPlanDemo: (plan: 'Bronze' | 'Silver' | 'Gold') => void;
}

export default function LandingPage({ onEnterLogin, onEnterRegister, onEnterPlanDemo }: LandingPageProps) {
  // Simulador inicial começa com 0 para simulação limpa
  const [salarioBase, setSalarioBase] = useState<number>(0);
  const [dependentes, setDependentes] = useState<number>(0);
  const [showContactModal, setShowContactModal] = useState<boolean>(false);
  const [selectedPlanForContact, setSelectedPlanForContact] = useState<string>('Starter');
  const [activeTab, setActiveTab] = useState<'salarios' | 'faturacao' | 'fintech' | 'crm'>('salarios');

  // Contact modal state
  const [reqEmpresa, setReqEmpresa] = useState<string>('');
  const [reqResponsavel, setReqResponsavel] = useState<string>('');
  const [reqEmail, setReqEmail] = useState<string>('');
  const [reqTelefone, setReqTelefone] = useState<string>('');
  const [reqSubmitting, setReqSubmitting] = useState<boolean>(false);
  const [reqSuccess, setReqSuccess] = useState<boolean>(false);

  // Acesso exclusivo do Fundador (Gerson Cumbane) para zerar cálculos da Landing Page
  const [isFounder, setIsFounder] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    const hasAdminParam = urlParams.get('admin') === 'true' || window.location.hash === '#admin';
    const isSavedFounder = localStorage.getItem('paytek_user') === 'gersonjcumbane@gmail.com' || localStorage.getItem('paytek_role') === 'SUPER_ADMIN_PAYROLL';
    return hasAdminParam || isSavedFounder;
  });

  const [founderClicks, setFounderClicks] = useState<number>(0);
  const handleSecretFounderTrigger = () => {
    const next = founderClicks + 1;
    setFounderClicks(next);
    if (next >= 3) {
      setIsFounder(true);
      alert('Modo Fundador Ativado: Controles de reset e gestão de cálculos liberados!');
    }
  };

  const handleZerarCalculosLanding = () => {
    setSalarioBase(0);
    setDependentes(0);
  };

  // Cálculo ao vivo oficial
  const res = calcularFolhaSalario(salarioBase, 0, dependentes);
  const encargoPatronalInss = salarioBase * 0.04;
  const custoTotalEmpresa = salarioBase + encargoPatronalInss;

  const handleOpenContact = (planName: string) => {
    setSelectedPlanForContact(planName);
    setReqSuccess(false);
    setShowContactModal(true);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqEmpresa || !reqEmail || !reqTelefone) return;
    setReqSubmitting(true);
    const reqId = `REQ-${Date.now()}`;
    const payload = {
      id: reqId,
      empresa: reqEmpresa,
      responsavel: reqResponsavel,
      email: reqEmail,
      telefone: reqTelefone,
      plano: selectedPlanForContact,
      status: 'PENDENTE',
      createdAt: new Date().toISOString()
    };
    try {
      await fetch('/api/auth/request-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => null);
      await setDoc(doc(db, 'credential_requests', reqId), payload, { merge: true }).catch(() => null);
    } finally {
      setReqSubmitting(false);
      setReqSuccess(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-blue-900 selection:text-white">
      {/* Navbar Minimalista e Limpa */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2.5 cursor-pointer select-none" 
            onClick={handleSecretFounderTrigger}
            title="ClickPay"
          >
            <img 
              src="/logo-payroll.png" 
              alt="ClickPay" 
              className="h-8 w-auto object-contain pointer-events-none" 
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
            <span className="text-xl font-black text-slate-950 tracking-tight">ClickPay</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-600">
            <a href="#institucional" className="hover:text-blue-900 transition-colors">Quem somos</a>
            <a href="#modulos" className="hover:text-blue-900 transition-colors">Funcionalidades</a>
            <a href="#planos" className="hover:text-blue-900 transition-colors">Planos & Preços</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={onEnterLogin}
              className="px-4 py-2 text-slate-700 hover:text-blue-900 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200"
            >
              <Lock size={13} />
              <span>Entrar</span>
            </button>
            <button
              onClick={onEnterRegister || onEnterLogin}
              className="px-4.5 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles size={13} className="text-amber-400" />
              <span>Criar Conta</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section Direto e Profissional */}
      <section className="py-16 md:py-24 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6 text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-900 rounded-full text-xs font-bold border border-blue-100">
              <ShieldCheck size={14} className="text-blue-700" />
              Conforme a Autoridade Tributária & INSS Moçambique · Padrão Primavera V10
            </span>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-950 tracking-tight leading-[1.15]">
              Gestão Financeira, Salários e Facturação <span className="text-blue-900">num só lugar.</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal max-w-xl">
              Elimine o papel e as folhas de cálculo. O <b>ClickPay</b> automatiza o processamento salarial com a nova tabela de <b>IRPS 2026</b>, gera guias do <b>SISSMO</b>, emite facturas certificadas no padrão <b>Primavera ERP V10</b> com IVA ou ISPC (3%) e liquida pagamentos em lote via <b>M-Pesa e e-Mola</b>.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={onEnterRegister || onEnterLogin}
                className="px-6 py-3 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Building2 size={15} />
                <span>Iniciar Demonstração Gratuita</span>
                <ArrowRight size={14} />
              </button>

              <button
                onClick={onEnterLogin}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-slate-200"
              >
                <Lock size={14} />
                <span>Aceder ao Painel ERP</span>
              </button>
            </div>

            <div className="pt-6 border-t border-slate-100 grid grid-cols-3 gap-4 max-w-md">
              <div>
                <span className="text-lg font-black text-slate-900 block font-mono">100%</span>
                <span className="text-[11px] text-slate-500 font-medium">Leis de Moçambique</span>
              </div>
              <div>
                <span className="text-lg font-black text-slate-900 block font-mono">SISSMO</span>
                <span className="text-[11px] text-slate-500 font-medium">Exportação Oficial</span>
              </div>
              <div>
                <span className="text-lg font-black text-slate-900 block font-mono">M-Pesa</span>
                <span className="text-[11px] text-slate-500 font-medium">Pagamento em Lote</span>
              </div>
            </div>
          </div>

          {/* Hero Preview Card */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  <span className="text-xs font-bold tracking-wider text-slate-300">clickpay.co.mz</span>
                </div>
                <span className="text-[10px] bg-slate-800 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">Primavera V10 Compliant</span>
              </div>

              <div className="space-y-3">
                <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Resumo da Folha Salarial</span>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xl font-bold font-mono text-white">450.000,00 MT</span>
                    <span className="text-xs text-emerald-400 font-bold">12 Funcionários</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 block font-medium">INSS (3% + 4%)</span>
                    <span className="font-bold font-mono text-slate-200">31.500,00 MT</span>
                  </div>
                  <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 block font-medium">IRPS Retido</span>
                    <span className="font-bold font-mono text-slate-200">42.800,00 MT</span>
                  </div>
                </div>

                <div className="p-3 bg-blue-950/60 border border-blue-900/60 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-200 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    Piloto Automático M-Pesa
                  </span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 font-bold px-2 py-0.5 rounded">
                    Dispersão Pronta
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO INSTITUCIONAL: MISSÃO, VISÃO & VALORES PROFISSIONAIS */}
      <section id="institucional" className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto space-y-2 mb-12">
            <span className="text-blue-900 font-bold text-xs uppercase tracking-widest">Identidade Corporativa</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">Compromisso com o Futuro de Moçambique</h2>
            <p className="text-xs sm:text-sm text-slate-600 font-normal">
              Construímos tecnologia financeira e de gestão desenhada especificamente para capacitar as empresas moçambicanas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Missão */}
            <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold">
                <Compass size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-950">Nossa Missão</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Desmistificar e automatizar a gestão financeira, salarial e fiscal para micro, pequenas e médias empresas em Moçambique, eliminando a burocracia do papel e promovendo a inclusão digital e financeira de trabalhadores e empreendedores.
              </p>
            </div>

            {/* Visão */}
            <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                <Eye size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-950">Nossa Visão</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Ser o ecossistema ERP e Fintech de referência em Moçambique e nos PALOP, reconhecido pela excelência em conformidade fiscal, inovação em pagamentos móveis e confiabilidade rigorosa no padrão de auditoria internacional.
              </p>
            </div>

            {/* Valores */}
            <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-900 flex items-center justify-center font-bold">
                <Award size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-950">Nossos Valores</h3>
              <ul className="text-xs text-slate-600 space-y-1.5 font-normal">
                <li>• <b>Rigor e Conformidade:</b> Respeito estrito às leis fiscais e laborais nacionais.</li>
                <li>• <b>Segurança e Integridade:</b> Proteção absoluta dos dados e salários das empresas.</li>
                <li>• <b>Inovação Prática:</b> Tecnologia útil adaptada às carteiras M-Pesa e e-Mola.</li>
                <li>• <b>Transparência Total:</b> Preços em Meticais e sem encargos ocultos.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Módulos do Sistema Padrão Primavera V10 */}
      <section id="modulos" className="py-16 max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-10">
          <span className="text-blue-900 font-bold text-xs uppercase tracking-widest">Módulos Integrados</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">Arquitetura ERP Conforme Primavera V10 & PGC-NIRF</h2>
          <p className="text-xs sm:text-sm text-slate-600 font-normal">Todos os documentos gerados seguem o layout oficial das grandes referências de mercado.</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {[
            { id: 'salarios', label: 'Salários & INSS', icon: Users },
            { id: 'faturacao', label: 'Facturação Eletrónica', icon: Receipt },
            { id: 'fintech', label: 'Pagamentos M-Pesa', icon: Smartphone },
            { id: 'crm', label: 'CRM & Vendas', icon: TrendingUp }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                  active ? 'bg-blue-900 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Box */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-4xl mx-auto">
          {activeTab === 'salarios' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-blue-900 uppercase">Recursos Humanos</span>
                <h3 className="text-lg font-bold text-slate-900">Processamento Salarial sem Erros</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Cálculo automático de INSS (3% trabalhador e 4% patronal), escalões progressivos de IRPS por dependentes familiares e geração do ficheiro oficial para carregamento no portal SISSMO.
                </p>
                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex items-center gap-2">✓ Recibos de vencimento em layout padrão Primavera ERP V10</li>
                  <li className="flex items-center gap-2">✓ Auditoria de contratos e avisos prévios (Lei 13/2023)</li>
                  <li className="flex items-center gap-2">✓ Controlo de faltas e adiantamentos (vales)</li>
                </ul>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                <span className="font-bold text-slate-800 block">Layout Recibo Primavera V10</span>
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between"><span>Salário Base:</span><span>35.000,00 MT</span></div>
                  <div className="flex justify-between text-rose-600"><span>INSS (3%):</span><span>-1.050,00 MT</span></div>
                  <div className="flex justify-between text-rose-600"><span>IRPS Retido:</span><span>-1.275,00 MT</span></div>
                  <div className="border-t border-slate-200 pt-1 flex justify-between font-bold text-emerald-700">
                    <span>Líquido a Transferir:</span><span>32.675,00 MT</span>
                  </div>
                  <div className="text-[9px] text-slate-400 pt-1">Software de Facturação Certificado nº 01/AT/2026</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'faturacao' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-blue-900 uppercase">Vendas & Clientes</span>
                <h3 className="text-lg font-bold text-slate-900">Facturação Conforme a Autoridade Tributária</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Emita Facturas (FT), Facturas-Recibo (FR), Vendas a Dinheiro (VD) e Cotações Pró-Forma. Suporte completo para o regime simplificado ISPC (3%) ou Regime Geral de IVA (16%).
                </p>
                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex items-center gap-2">✓ QR Code oficial da Autoridade Tributária</li>
                  <li className="flex items-center gap-2">✓ Layout corporativo idêntico a Primavera V10</li>
                  <li className="flex items-center gap-2">✓ Envio por WhatsApp e E-mail em 1 clique</li>
                </ul>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                <span className="font-bold text-slate-800 block">Factura Oficial Certificada</span>
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5 text-[11px]">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>FACTURA FT 2026/089</span>
                    <span className="text-emerald-700">QR CODE AT ✓</span>
                  </div>
                  <div className="text-slate-500">Cliente: Empresa Comercial Lda (NUIT 400123456)</div>
                  <div className="border-t border-slate-100 pt-1 flex justify-between font-bold font-mono">
                    <span>Total com IVA:</span><span>58.000,00 MT</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fintech' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-blue-900 uppercase">Canais de Pagamento</span>
                <h3 className="text-lg font-bold text-slate-900">Dispersão em Massa via Carteiras Móveis</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Liquide os salários da equipa diretamente para as contas M-Pesa e e-Mola dos trabalhadores, sem filas nos bancos ou circulação perigosa de dinheiro físico.
                </p>
                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex items-center gap-2">✓ Pagamentos instantâneos para 84, 85, 86, 87</li>
                  <li className="flex items-center gap-2">✓ Piloto Automático com 1 clique</li>
                  <li className="flex items-center gap-2">✓ Extrato e comprovativos detalhados</li>
                </ul>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                <span className="font-bold text-slate-800 block">Piloto Automático M-Pesa</span>
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 text-[11px]">
                  <div className="flex justify-between items-center text-emerald-700 font-bold">
                    <span>12 de 12 Pagamentos Concluídos</span>
                    <span>✓ Sucesso</span>
                  </div>
                  <p className="text-slate-500 text-[10px]">Todos os funcionários receberam SMS de confirmação no telemóvel.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'crm' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-blue-900 uppercase">Comercial</span>
                <h3 className="text-lg font-bold text-slate-900">CRM & Gestão de Contratos</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Gerencie oportunidades de negócio, elabore propostas comerciais profissionais e converta cotações diretamente em vendas sem retrabalho.
                </p>
                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex items-center gap-2">✓ Pipeline visual de negociações</li>
                  <li className="flex items-center gap-2">✓ Controlo de datas de renovação de contratos</li>
                  <li className="flex items-center gap-2">✓ Histórico de faturamento por cliente</li>
                </ul>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                <span className="font-bold text-slate-800 block">Pipeline de Oportunidades</span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-[9px] text-slate-400 block">Em Negociação</span>
                    <span className="font-bold text-slate-800">180.000 MT</span>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-[9px] text-emerald-600 block">Fechado / Ganho</span>
                    <span className="font-bold text-emerald-800">420.000 MT</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Simulador de Salário IRPS 2026 com opção de Zerar Cálculos (Exclusivo Fundador) */}
      <section id="simulador" className="py-16 bg-white border-t border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center space-y-2 mb-8">
            <span className="text-blue-900 font-bold text-xs uppercase tracking-widest">Simulador Interativo</span>
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-2xl font-black text-slate-950">Simulador de Salário & Impostos Moçambique</h2>
              {/* Botão de Zerar Cálculos Exclusivo para Gerson Cumbane */}
              {isFounder && (
                <button
                  onClick={handleZerarCalculosLanding}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                  title="Opção exclusiva do Fundador: Zerar valores do simulador"
                >
                  <RefreshCw size={11} />
                  <span>Zerar Cálculos (Fundador)</span>
                </button>
              )}
            </div>
            <p className="text-xs text-slate-600">Teste o cálculo do IRPS 2026 e INSS em tempo real:</p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Salário Base Mensal:
                  </label>
                  <span className="font-mono text-blue-900 font-bold text-xs">{salarioBase.toLocaleString()} MT</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="150000" 
                  step="1000" 
                  value={salarioBase} 
                  onChange={(e) => setSalarioBase(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Número de Dependentes: <span className="text-blue-900 font-bold">{dependentes}</span>
                </label>
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDependentes(d)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                        dependentes === d ? 'bg-blue-900 text-white' : 'bg-white text-slate-700 border border-slate-200'
                      }`}
                    >
                      {d === 4 ? '4+' : d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600 font-sans">INSS Trabalhador (3%):</span>
                <span className="text-rose-600 font-bold">-{res.inssTrabalhador.toFixed(2)} MT</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600 font-sans">Retenção IRPS 2026:</span>
                <span className="text-rose-600 font-bold">-{res.irpsConstatado.toFixed(2)} MT</span>
              </div>
              <div className="flex justify-between py-1.5 px-2 bg-emerald-50 text-emerald-950 rounded-lg font-bold">
                <span className="font-sans">Salário Líquido:</span>
                <span className="text-sm font-bold text-emerald-700">{res.salarioLiquido.toFixed(2)} MT</span>
              </div>
              <div className="flex justify-between py-1 px-2 text-slate-500 text-[10px] font-sans">
                <span>Custo Total Empregador (+4% INSS):</span>
                <span>{custoTotalEmpresa.toFixed(2)} MT</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Planos & Preços Transparentes */}
      <section id="planos" className="py-16 max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-10">
          <span className="text-blue-900 font-bold text-xs uppercase tracking-widest">Preços em Meticais</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-950">Planos sem Fidelização</h2>
          <p className="text-xs text-slate-600">Sem surpresas de câmbio em dólares. Pague via M-Pesa, e-Mola ou Transferência Bancária.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Starter */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded uppercase">Starter</span>
              <h3 className="text-lg font-bold text-slate-900">Microempresa</h3>
              <p className="text-xs text-slate-500 font-normal">Ideal para pequenos negócios e comércio local.</p>
              <div className="pt-2">
                <span className="text-2xl font-black text-slate-950 font-mono">3.000,00 MT</span>
                <span className="text-[10px] text-slate-400 block">/mês</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">✓ Até 5 Funcionários</li>
                <li className="flex items-center gap-2">✓ Facturação ISPC (3%) ou IVA</li>
                <li className="flex items-center gap-2">✓ Recibos de Salário & SISSMO</li>
                <li className="flex items-center gap-2">✓ Suporte via WhatsApp</li>
              </ul>
            </div>
            <button
              onClick={() => onEnterPlanDemo('Bronze')}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
            >
              Escolher Starter
            </button>
          </div>

          {/* Growth / Silver */}
          <div className="bg-white rounded-2xl p-6 border-2 border-blue-900 shadow-md flex flex-col justify-between space-y-5 relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-900 text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
              Mais Popular
            </span>
            <div className="space-y-3">
              <span className="text-[10px] bg-blue-50 text-blue-900 font-bold px-2 py-0.5 rounded uppercase">Profissional</span>
              <h3 className="text-lg font-bold text-slate-900">Pequena Empresa</h3>
              <p className="text-xs text-slate-500 font-normal">Para empresas com equipa em crescimento e mais movimento.</p>
              <div className="pt-2">
                <span className="text-2xl font-black text-blue-900 font-mono">5.000,00 MT</span>
                <span className="text-[10px] text-slate-400 block">/mês</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">✓ Até 15 Funcionários</li>
                <li className="flex items-center gap-2">✓ Piloto Automático M-Pesa / e-Mola</li>
                <li className="flex items-center gap-2">✓ CRM de Vendas & Propostas</li>
                <li className="flex items-center gap-2">✓ Gestão de Compras e Despesas</li>
                <li className="flex items-center gap-2">✓ Apoio prioritário</li>
              </ul>
            </div>
            <button
              onClick={() => onEnterPlanDemo('Silver')}
              className="w-full py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors shadow-sm"
            >
              Escolher Profissional
            </button>
          </div>

          {/* Business / Gold */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded uppercase">Empresarial</span>
              <h3 className="text-lg font-bold text-slate-900">Média Empresa</h3>
              <p className="text-xs text-slate-500 font-normal">Solução avançada com relatórios PGC-NIRF completos.</p>
              <div className="pt-2">
                <span className="text-2xl font-black text-slate-950 font-mono">6.500,00 MT</span>
                <span className="text-[10px] text-slate-400 block">/mês</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">✓ Até 25 Funcionários</li>
                <li className="flex items-center gap-2">✓ Multi-Armazém de Stock</li>
                <li className="flex items-center gap-2">✓ Demonstração de Resultados (DRE)</li>
                <li className="flex items-center gap-2">✓ Assistente IA Financeiro</li>
                <li className="flex items-center gap-2">✓ Gestor de conta dedicado</li>
              </ul>
            </div>
            <button
              onClick={() => onEnterPlanDemo('Gold')}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
            >
              Escolher Empresarial
            </button>
          </div>
        </div>
      </section>

      {/* Secção de Contacto Simples e Direta */}
      <section id="contacto" className="py-12 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="text-lg font-bold">Precisa de assistência ou demonstração presencial?</h3>
            <p className="text-xs text-slate-400">A nossa equipa técnica e de suporte em Maputo está disponível para apoiar.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a 
              href="https://wa.me/258842014173?text=Ol%C3%A1%2C%20gostaria%20de%20saber%20mais%20sobre%20o%20ClickPay%20ERP%20(clickpay.co.mz)."
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-colors"
            >
              <span>WhatsApp: +258 84 201 4173</span>
            </a>
            <button
              onClick={() => handleOpenContact('Starter')}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Mail size={13} />
              <span>Solicitar Acesso</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-8 border-t border-slate-800 text-xs text-center">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 ClickPay Moçambique · clickpay.co.mz. Todos os direitos reservados.</p>
          <p className="text-[11px] text-slate-500">Conforme o Código do IRPS, Lei do Trabalho 13/2023, Regulamento SISSMO e Padrão Primavera V10.</p>
        </div>
      </footer>

      {/* Modal de Solicitação de Credenciais */}
      {showContactModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 relative space-y-4">
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-950">Solicitar Acesso ao ERP</h3>
              <p className="text-xs text-slate-500">Preencha os dados e receba as credenciais da sua empresa:</p>
            </div>

            {reqSuccess ? (
              <div className="p-4 bg-emerald-50 text-emerald-900 rounded-xl text-xs text-center space-y-2">
                <p className="font-bold">✓ Solicitação Registada!</p>
                <p className="text-[11px]">As credenciais de acesso para a empresa <b>{reqEmpresa}</b> foram enviadas ao administrador.</p>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="mt-2 w-full py-2 bg-emerald-700 text-white rounded-lg font-bold"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitRequest} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nome da Empresa *</label>
                  <input
                    type="text"
                    required
                    value={reqEmpresa}
                    onChange={(e) => setReqEmpresa(e.target.value)}
                    placeholder="Ex: Comercial Limpopo Lda"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nome do Responsável</label>
                  <input
                    type="text"
                    value={reqResponsavel}
                    onChange={(e) => setReqResponsavel(e.target.value)}
                    placeholder="Seu Nome"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">E-mail *</label>
                  <input
                    type="email"
                    required
                    value={reqEmail}
                    onChange={(e) => setReqEmail(e.target.value)}
                    placeholder="email@empresa.co.mz"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Telefone / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={reqTelefone}
                    onChange={(e) => setReqTelefone(e.target.value)}
                    placeholder="+258 84..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-900"
                  />
                </div>
                <button
                  type="submit"
                  disabled={reqSubmitting}
                  className="w-full py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  {reqSubmitting ? 'A Enviar...' : 'Enviar Pedido'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
