/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ArrowRight,
  Check,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  X
} from 'lucide-react';
import { calcularFolhaSalario } from '../db_tax';
import { db, doc, setDoc } from '../lib/firebase';
import { useToast } from '../context/ToastContext';

interface LandingPageProps {
  onEnterLogin: () => void;
  onEnterRegister?: () => void;
  onEnterPlanDemo: (plan: 'Bronze' | 'Silver' | 'Gold') => void;
}

type ModuleTab = 'salarios' | 'faturacao' | 'fintech' | 'crm';

const MODULE_CONTENT: Record<
  ModuleTab,
  {
    eyebrow: string;
    title: string;
    description: string;
    bullets: string[];
    previewTitle: string;
    previewSubtitle: string;
    rows: { label: string; value: string; tone?: 'neutral' | 'muted' | 'positive' | 'negative' }[];
  }
> = {
  salarios: {
    eyebrow: 'Recursos Humanos',
    title: 'Processamento salarial e obrigações ao INSS',
    description:
      'Apuramento automático do INSS (3% trabalhador e 4% entidade empregadora), retenção progressiva de IRPS por dependentes e preparação de mapas para o portal SISSMO.',
    bullets: [
      'Recibos de vencimento mensais prontos a emitir em PDF',
      'Controlo de contratos de trabalho e prazos legais (Lei 13/2023)',
      'Gestão de faltas, subsídios e adiantamentos salariais'
    ],
    previewTitle: 'Exemplo de Demonstrativo Salarial',
    previewSubtitle: 'Estrutura mensal por colaborador',
    rows: [
      { label: 'Salário Base', value: '35.000,00 MT' },
      { label: 'INSS Trabalhador (3%)', value: '-1.050,00 MT', tone: 'negative' },
      { label: 'Retenção IRPS (Tabela 2026)', value: '-1.275,00 MT', tone: 'negative' },
      { label: 'Encargo Patronal INSS (4%)', value: '1.400,00 MT', tone: 'muted' },
      { label: 'Líquido a Transferir', value: '32.675,00 MT', tone: 'positive' }
    ]
  },
  faturacao: {
    eyebrow: 'Vendas & Fiscalidade',
    title: 'Faturação estruturada em Meticais',
    description:
      'Emita Faturas (FT), Faturas-Recibo (FR), Vendas a Dinheiro (VD) e Cotações Pró-Forma com suporte para Regime Geral de IVA (16%) e regime simplificado ISPC (3%).',
    bullets: [
      'Numeração sequencial e cálculo automático de IVA ou ISPC',
      'Registo de clientes com validação de NUIT',
      'Partilha direta de documentos em PDF por e-mail ou WhatsApp'
    ],
    previewTitle: 'Estrutura de Documento Comercial',
    previewSubtitle: 'Exemplo de fatura emitida',
    rows: [
      { label: 'Documento', value: 'Fatura FT 2026/089' },
      { label: 'Regime Fiscal', value: 'Regime Geral (IVA 16%)' },
      { label: 'Base Tributável', value: '50.000,00 MT' },
      { label: 'IVA Liquidado (16%)', value: '8.000,00 MT', tone: 'muted' },
      { label: 'Total da Fatura', value: '58.000,00 MT', tone: 'positive' }
    ]
  },
  fintech: {
    eyebrow: 'Carteiras Móveis',
    title: 'Pagamentos e dispersão via M-Pesa, e-Mola e mKesh',
    description:
      'Centralize recebimentos de clientes e execute pagamentos salariais diretamente para carteiras móveis nacionais com rastreabilidade e reconciliação automática.',
    bullets: [
      'Deteção automática da operadora pelos prefixos 82 a 87',
      'Processamento de folhas em lote sem circulação de numerário',
      'Registo de referência, estado e extrato por transação'
    ],
    previewTitle: 'Fluxo de Liquidação Móvel',
    previewSubtitle: 'Canais suportados em Moçambique',
    rows: [
      { label: 'Vodacom M-Pesa', value: 'Prefixos 84 / 85' },
      { label: 'Movitel e-Mola', value: 'Prefixos 86 / 87' },
      { label: 'Tmcel mKesh', value: 'Prefixos 82 / 83' },
      { label: 'Formato MSISDN', value: '258 + 9 dígitos', tone: 'muted' },
      { label: 'Conciliação', value: 'Automática por referência', tone: 'positive' }
    ]
  },
  crm: {
    eyebrow: 'Gestão Comercial',
    title: 'Pipeline comercial e renovação de contratos',
    description:
      'Acompanhe propostas em curso, organize a carteira de clientes empresariais e converta orçamentos aprovados em faturação sem duplicação de dados.',
    bullets: [
      'Registo de oportunidades por fase comercial',
      'Alertas de vencimento e renovação de contratos',
      'Histórico consolidado de contas a receber por cliente'
    ],
    previewTitle: 'Acompanhamento Comercial',
    previewSubtitle: 'Visão operacional de carteira',
    rows: [
      { label: 'Propostas Emitidas', value: 'Conversão direta em FT' },
      { label: 'Controlo de Contratos', value: 'Alertas de renovação' },
      { label: 'Ficha de Cliente', value: 'NUIT, contacto e extrato' },
      { label: 'Contas Correntes', value: 'Pendentes e liquidados', tone: 'muted' },
      { label: 'Relatórios', value: 'Exportação mensal', tone: 'positive' }
    ]
  }
};

function formatMzn(value: number): string {
  return `${value.toLocaleString('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} MT`;
}

export default function LandingPage({
  onEnterLogin,
  onEnterRegister,
  onEnterPlanDemo
}: LandingPageProps) {
  const { showSuccess, showError } = useToast();
  const [salarioBase, setSalarioBase] = useState<number>(0);
  const [dependentes, setDependentes] = useState<number>(0);
  const [showContactModal, setShowContactModal] = useState<boolean>(false);
  const [selectedPlanForContact, setSelectedPlanForContact] = useState<string>('Profissional');
  const [activeTab, setActiveTab] = useState<ModuleTab>('salarios');

  const [reqEmpresa, setReqEmpresa] = useState<string>('');
  const [reqResponsavel, setReqResponsavel] = useState<string>('');
  const [reqEmail, setReqEmail] = useState<string>('');
  const [reqTelefone, setReqTelefone] = useState<string>('');
  const [reqSubmitting, setReqSubmitting] = useState<boolean>(false);
  const [reqSuccess, setReqSuccess] = useState<boolean>(false);

  const [isFounder, setIsFounder] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    const hasAdminParam = urlParams.get('admin') === 'true' || window.location.hash === '#admin';
    const isSavedFounder =
      localStorage.getItem('paytek_user') === 'gersonjcumbane@gmail.com' ||
      localStorage.getItem('paytek_role') === 'SUPER_ADMIN_PAYROLL';
    return hasAdminParam || isSavedFounder;
  });

  const [founderClicks, setFounderClicks] = useState<number>(0);
  const handleSecretFounderTrigger = () => {
    const next = founderClicks + 1;
    setFounderClicks(next);
    if (next >= 3) {
      setIsFounder(true);
      showSuccess('Controlo de reposição do simulador ativado.');
    }
  };

  const handleZerarCalculosLanding = () => {
    setSalarioBase(0);
    setDependentes(0);
  };

  const res = calcularFolhaSalario(salarioBase, 0, dependentes);
  const encargoPatronalInss = salarioBase * 0.04;
  const custoTotalEmpresa = salarioBase + encargoPatronalInss;
  const currentModule = MODULE_CONTENT[activeTab];

  const handleOpenContact = (planName: string) => {
    setSelectedPlanForContact(planName);
    setReqSuccess(false);
    setShowContactModal(true);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqEmpresa.trim() || !reqEmail.trim() || !reqTelefone.trim()) return;

    setReqSubmitting(true);
    const reqId = `REQ-${Date.now()}`;
    const payload = {
      id: reqId,
      empresa: reqEmpresa.trim(),
      responsavel: reqResponsavel.trim(),
      email: reqEmail.trim(),
      telefone: reqTelefone.trim(),
      plano: selectedPlanForContact,
      status: 'PENDENTE',
      createdAt: new Date().toISOString()
    };

    try {
      const apiPromise = fetch('/api/auth/request-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then((r) => r.ok)
        .catch(() => false);

      const firestorePromise = setDoc(doc(db, 'credential_requests', reqId), payload, {
        merge: true
      })
        .then(() => true)
        .catch(() => false);

      const [apiOk, firestoreOk] = await Promise.all([apiPromise, firestorePromise]);
      if (!apiOk && !firestoreOk) {
        showError('Não foi possível registar o pedido. Tente via WhatsApp.');
        return;
      }
      setReqSuccess(true);
    } finally {
      setReqSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFB] flex flex-col font-sans text-slate-900 antialiased selection:bg-blue-900 selection:text-white">
      {/* Header — 3 clean zones */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <div
            className="flex items-center gap-2.5 cursor-pointer select-none shrink-0"
            onClick={handleSecretFounderTrigger}
            title="ClickPay"
          >
            <img
              src="/clickpay-logo.png"
              alt="ClickPay"
              className="h-8 w-auto object-contain pointer-events-none"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span className="text-lg font-semibold tracking-tight text-slate-950 whitespace-nowrap">
              ClickPay
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-slate-600">
            <a
              href="#modulos"
              className="hover:text-slate-950 transition-colors whitespace-nowrap shrink-0"
            >
              Funcionalidades
            </a>
            <a
              href="#simulador"
              className="hover:text-slate-950 transition-colors whitespace-nowrap shrink-0"
            >
              Simulador
            </a>
            <a
              href="#planos"
              className="hover:text-slate-950 transition-colors whitespace-nowrap shrink-0"
            >
              Planos
            </a>
            <a
              href="#contacto"
              className="hover:text-slate-950 transition-colors whitespace-nowrap shrink-0"
            >
              Contacto
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onEnterLogin}
              className="px-3.5 py-2 text-[13px] font-medium text-slate-700 hover:text-slate-950 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={onEnterRegister || onEnterLogin}
              className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-lg text-[13px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Criar Conta
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200 py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          <div className="lg:col-span-7 space-y-6">
            <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-blue-900">
              IRPS 2026 (Lei 11/2025) · Lei do Trabalho 13/2023 · SISSMO INSS
            </p>

            <h1 className="text-[clamp(2rem,3.6vw,3.15rem)] font-semibold text-slate-950 tracking-tight leading-[1.1]">
              Gestão salarial, faturação e pagamentos móveis num único sistema.
            </h1>

            <p className="text-[15px] sm:text-base text-slate-600 leading-relaxed max-w-xl">
              Automatize o processamento de salários, declarações ao INSS e emissão de faturas em
              Meticais, com liquidação direta via M-Pesa e e-Mola para empresas em Moçambique.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onEnterRegister || onEnterLogin}
                className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-lg text-[13px] font-semibold transition-colors inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Criar Conta</span>
                <ArrowRight size={15} />
              </button>

              <button
                type="button"
                onClick={onEnterLogin}
                className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg text-[13px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Aceder ao Painel
              </button>
            </div>

            <div className="pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-[13px] font-semibold text-slate-950">Salários & SISSMO</p>
                <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">
                  Retenção de IRPS por dependentes e guias INSS 3% + 4%.
                </p>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-slate-950">Faturação IVA / ISPC</p>
                <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">
                  Emissão de faturas, recibos e cotações em Meticais.
                </p>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-slate-950">Carteiras Móveis</p>
                <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">
                  Recebimentos e pagamentos via M-Pesa, e-Mola e mKesh.
                </p>
              </div>
            </div>
          </div>

          {/* Architectural Operational Specification Card — Zero fake metrics */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-6 py-4 bg-slate-950 text-white flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
                    Plataforma Empresarial
                  </p>
                  <p className="text-sm font-semibold text-white mt-0.5">clickpay.co.mz</p>
                </div>
                <span className="text-[12px] font-mono text-slate-300">MZN</span>
              </div>

              <div className="divide-y divide-slate-100">
                <div className="px-6 py-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-mono text-slate-400">01</p>
                    <p className="text-sm font-semibold text-slate-950">Folha Salarial & IRPS</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Cálculo mensal conforme Lei 11/2025 e subsídios
                    </p>
                  </div>
                  <span className="text-xs font-medium text-slate-700 whitespace-nowrap shrink-0">
                    Automático
                  </span>
                </div>

                <div className="px-6 py-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-mono text-slate-400">02</p>
                    <p className="text-sm font-semibold text-slate-950">Segurança Social (INSS)</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Apuramento 3% + 4% e exportação para SISSMO
                    </p>
                  </div>
                  <span className="text-xs font-medium text-slate-700 whitespace-nowrap shrink-0">
                    Mensal
                  </span>
                </div>

                <div className="px-6 py-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-mono text-slate-400">03</p>
                    <p className="text-sm font-semibold text-slate-950">Faturação & Contabilidade</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Regime Geral (IVA 16%), ISPC (3%) e PGC-NIRF
                    </p>
                  </div>
                  <span className="text-xs font-medium text-slate-700 whitespace-nowrap shrink-0">
                    AT / PGC
                  </span>
                </div>

                <div className="px-6 py-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-mono text-slate-400">04</p>
                    <p className="text-sm font-semibold text-slate-950">Pagamentos Móveis</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Cobranças e dispersão salarial M-Pesa e e-Mola
                    </p>
                  </div>
                  <span className="text-xs font-medium text-blue-900 whitespace-nowrap shrink-0">
                    84–87
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities */}
      <section id="modulos" className="py-16 md:py-20 max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <div className="max-w-2xl space-y-2 mb-10">
          <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-blue-900">
            Módulos Integrados
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-950 tracking-tight">
            Operação financeira, fiscal e laboral numa única plataforma
          </h2>
          <p className="text-sm text-slate-600">
            Estruturado para empresas em Moçambique que precisam de controlo documental e rigor nos
            cálculos.
          </p>
        </div>

        {/* Clean Tab Bar */}
        <div className="border-b border-slate-200 flex flex-wrap gap-6 mb-8">
          {[
            { id: 'salarios', label: 'Salários & INSS' },
            { id: 'faturacao', label: 'Faturação' },
            { id: 'fintech', label: 'Pagamentos Móveis' },
            { id: 'crm', label: 'CRM & Contratos' }
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as ModuleTab)}
                className={`pb-3 text-[13px] font-medium transition-colors border-b-2 -mb-px cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'border-blue-900 text-blue-900 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Single-Level Detail Panel */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-900">
              {currentModule.eyebrow}
            </p>
            <h3 className="text-xl font-semibold text-slate-950 tracking-tight">
              {currentModule.title}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">{currentModule.description}</p>
            <ul className="space-y-2.5 pt-2">
              {currentModule.bullets.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[13px] text-slate-700">
                  <Check size={15} className="text-blue-900 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-5 border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <p className="text-xs font-semibold text-slate-900">{currentModule.previewTitle}</p>
              <p className="text-[11px] text-slate-500">{currentModule.previewSubtitle}</p>
            </div>
            <div className="divide-y divide-slate-100 bg-white">
              {currentModule.rows.map((row) => (
                <div
                  key={row.label}
                  className="px-4 py-2.5 flex items-center justify-between gap-4 text-xs"
                >
                  <span className="text-slate-600">{row.label}</span>
                  <span
                    className={`font-mono tabular-nums font-medium text-right ${
                      row.tone === 'negative'
                        ? 'text-rose-700'
                        : row.tone === 'positive'
                        ? 'text-emerald-800 font-semibold'
                        : row.tone === 'muted'
                        ? 'text-slate-500'
                        : 'text-slate-900'
                    }`}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Live Salary & Tax Simulator */}
      <section id="simulador" className="py-16 md:py-20 bg-white border-t border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div className="space-y-2 max-w-xl">
              <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-blue-900">
                Simulador Fiscal
              </p>
              <h2 className="text-2xl sm:text-3xl font-semibold text-slate-950 tracking-tight">
                Simulador de Salário, IRPS e INSS
              </h2>
              <p className="text-sm text-slate-600">
                Calcule em tempo real os descontos legais e o custo total para a entidade
                empregadora.
              </p>
            </div>

            {isFounder && (
              <button
                type="button"
                onClick={handleZerarCalculosLanding}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors self-start sm:self-auto"
              >
                <RefreshCw size={12} />
                <span>Repor Valores</span>
              </button>
            )}
          </div>

          <div className="bg-[#FAFAFB] rounded-xl border border-slate-200 p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-6 space-y-6">
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <label
                    htmlFor="simulador-salario"
                    className="text-xs font-semibold text-slate-800"
                  >
                    Salário Base Mensal (MZN)
                  </label>
                  <span className="font-mono tabular-nums text-sm font-semibold text-blue-900">
                    {formatMzn(salarioBase)}
                  </span>
                </div>

                <div className="space-y-3">
                  <input
                    id="simulador-salario"
                    type="number"
                    min={0}
                    max={1000000}
                    step={500}
                    value={salarioBase || ''}
                    onChange={(e) => {
                      const v = Math.max(0, Number(e.target.value) || 0);
                      setSalarioBase(v);
                    }}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-mono tabular-nums text-slate-950 focus:outline-none focus:border-blue-900"
                  />
                  <input
                    type="range"
                    min={0}
                    max={150000}
                    step={1000}
                    value={Math.min(salarioBase, 150000)}
                    onChange={(e) => setSalarioBase(Number(e.target.value))}
                    aria-label="Ajustar salário base mensal"
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-900"
                  />
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-800 block mb-2">
                  Número de Dependentes
                </span>
                <div className="grid grid-cols-5 gap-2">
                  {[0, 1, 2, 3, 4].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDependentes(d)}
                      className={`py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors border ${
                        dependentes === d
                          ? 'bg-blue-900 text-white border-blue-900'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {d === 4 ? '4+' : d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
              <div className="px-5 py-3 flex justify-between items-center text-xs">
                <span className="text-slate-600">Salário Bruto</span>
                <span className="font-mono tabular-nums font-medium text-slate-900">
                  {formatMzn(salarioBase)}
                </span>
              </div>
              <div className="px-5 py-3 flex justify-between items-center text-xs">
                <span className="text-slate-600">INSS Trabalhador (3%)</span>
                <span className="font-mono tabular-nums font-medium text-rose-700">
                  -{formatMzn(res.inssTrabalhador)}
                </span>
              </div>
              <div className="px-5 py-3 flex justify-between items-center text-xs">
                <span className="text-slate-600">Retenção IRPS 2026</span>
                <span className="font-mono tabular-nums font-medium text-rose-700">
                  -{formatMzn(res.irpsConstatado)}
                </span>
              </div>
              <div className="px-5 py-3.5 bg-slate-50 flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-900">Salário Líquido</span>
                <span className="text-base font-mono tabular-nums font-semibold text-emerald-800">
                  {formatMzn(res.salarioLiquido)}
                </span>
              </div>
              <div className="px-5 py-3 flex justify-between items-center text-xs">
                <span className="text-slate-500">INSS Empregador (+4%) · Custo Total</span>
                <span className="font-mono tabular-nums font-medium text-slate-700">
                  {formatMzn(custoTotalEmpresa)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Plans & Pricing */}
      <section id="planos" className="py-16 md:py-20 max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <div className="max-w-2xl space-y-2 mb-10">
          <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-blue-900">
            Preços em Meticais
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-950 tracking-tight">
            Planos transparentes, sem fidelização
          </h2>
          <p className="text-sm text-slate-600">
            Faturação em Meticais sem exposição cambial. Liquidação via M-Pesa, e-Mola ou
            transferência bancária.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Starter */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  Starter · Microempresa
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Para negócios em início de atividade e prestadores de serviços.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-2xl font-semibold text-slate-950 font-mono tabular-nums">
                  3.500,00 MT
                </span>
                <span className="text-xs text-slate-500"> / mês</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-700 pt-2">
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-slate-500 shrink-0 mt-0.5" />
                  <span>Até 5 colaboradores</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-slate-500 shrink-0 mt-0.5" />
                  <span>Faturação e vendas (IVA / ISPC)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-slate-500 shrink-0 mt-0.5" />
                  <span>Recibos de salário mensais</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-slate-500 shrink-0 mt-0.5" />
                  <span>Cálculo IRPS (Lei 11/2025) & INSS</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-slate-500 shrink-0 mt-0.5" />
                  <span>Suporte técnico via WhatsApp</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => onEnterPlanDemo('Bronze')}
              className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 font-semibold rounded-lg text-xs cursor-pointer transition-colors"
            >
              Escolher Starter
            </button>
          </div>

          {/* Profissional */}
          <div className="bg-white rounded-xl p-6 border-2 border-blue-900 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-blue-900">
                    Profissional · Pequena Empresa
                  </p>
                  <span className="text-[11px] font-semibold text-blue-900">Recomendado</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Para equipas ativas com gestão de stocks e obrigações ao SISSMO.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-2xl font-semibold text-blue-900 font-mono tabular-nums">
                  6.500,00 MT
                </span>
                <span className="text-xs text-slate-500"> / mês</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-700 pt-2">
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-blue-900 shrink-0 mt-0.5" />
                  <span>Até 15 colaboradores</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-blue-900 shrink-0 mt-0.5" />
                  <span>Ficheiros SISSMO & guias do INSS</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-blue-900 shrink-0 mt-0.5" />
                  <span>Contratos de trabalho (Lei 13/2023)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-blue-900 shrink-0 mt-0.5" />
                  <span>Compras, fornecedores e inventário</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-blue-900 shrink-0 mt-0.5" />
                  <span>Alertas de prazos fiscais da AT</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-blue-900 shrink-0 mt-0.5" />
                  <span>Pagamentos via M-Pesa e e-Mola</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => onEnterPlanDemo('Silver')}
              className="w-full py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-semibold rounded-lg text-xs cursor-pointer transition-colors"
            >
              Escolher Profissional
            </button>
          </div>

          {/* Empresarial */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  Empresarial · Média Empresa
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Contabilidade PGC-NIRF completa e gestão multi-armazém.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-2xl font-semibold text-slate-950 font-mono tabular-nums">
                  9.500,00 MT
                </span>
                <span className="text-xs text-slate-500"> / mês</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-700 pt-2">
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-slate-500 shrink-0 mt-0.5" />
                  <span>Até 30 colaboradores</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-slate-500 shrink-0 mt-0.5" />
                  <span>Contabilidade PGC: DRE, Balanço e Fluxo de Caixa</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-slate-500 shrink-0 mt-0.5" />
                  <span>Gestão avançada de stocks e múltiplos armazéns</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-slate-500 shrink-0 mt-0.5" />
                  <span>Reconciliação financeira e tesouraria</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-slate-500 shrink-0 mt-0.5" />
                  <span>Acompanhamento executivo prioritário</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => onEnterPlanDemo('Gold')}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-semibold rounded-lg text-xs cursor-pointer transition-colors"
            >
              Escolher Empresarial
            </button>
          </div>
        </div>
      </section>

      {/* Sobre Nós, Missão, Visão, Valores & Contactos */}
      <section id="contacto" className="bg-white border-t border-slate-200 py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
          {/* Sobre Nós + Contactos */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            {/* Sobre Nós */}
            <div className="lg:col-span-7 space-y-4">
              <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-blue-900">
                Sobre Nós
              </p>
              <h2 className="text-2xl sm:text-3xl font-semibold text-slate-950 tracking-tight">
                ClickPay Moçambique
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
                Desenvolvemos tecnologia de gestão empresarial e pagamentos digitais concebida para a
                realidade fiscal e laboral de Moçambique. A nossa plataforma reúne processamento de
                salários com cálculo de IRPS e INSS, faturação em Meticais, contabilidade e
                liquidações diretas via M-Pesa e e-Mola.
              </p>
            </div>

            {/* Contactos */}
            <div className="lg:col-span-5 bg-[#FAFAFB] rounded-xl border border-slate-200 p-6 space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-900">
                Contactos
              </p>

              <div className="divide-y divide-slate-200 text-xs">
                <div className="pb-3 flex items-start gap-3">
                  <MapPin size={15} className="text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900">Maputo · Moçambique</p>
                    <p className="text-slate-600 mt-0.5">Seg – Sex: 08:00 – 17:00 | Sáb: 08:00 – 12:00</p>
                  </div>
                </div>

                <div className="py-3 flex items-start gap-3">
                  <Phone size={15} className="text-slate-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-900">Telefone &amp; WhatsApp</p>
                    <p className="font-mono tabular-nums text-slate-700">+258 84 201 4173</p>
                    <p className="font-mono tabular-nums text-slate-700">+258 86 139 0061</p>
                  </div>
                </div>

                <div className="pt-3 flex items-start gap-3">
                  <Mail size={15} className="text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900">E-mail</p>
                    <a
                      href="mailto:gersonjcumbane@gmail.com"
                      className="text-blue-900 hover:underline font-medium"
                    >
                      gersonjcumbane@gmail.com
                    </a>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-2.5">
                <a
                  href="https://wa.me/258842014173?text=Ol%C3%A1%2C%20gostaria%20de%20entrar%20em%20contacto%20com%20a%20ClickPay%20Mo%C3%A7ambique."
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-950 text-white font-medium rounded-lg text-xs inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                >
                  <MessageSquare size={13} />
                  <span>WhatsApp</span>
                </a>
                <button
                  type="button"
                  onClick={() => handleOpenContact('Geral')}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-900 font-medium rounded-lg text-xs inline-flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                >
                  <Mail size={13} />
                  <span>Enviar Mensagem</span>
                </button>
              </div>
            </div>
          </div>

          {/* Missão, Visão e Valores */}
          <div className="pt-10 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-900">
                Missão
              </p>
              <p className="text-[13px] text-slate-600 leading-relaxed">
                Simplificar e automatizar a gestão salarial, fiscal e financeira das empresas em
                Moçambique, garantindo rigor legal e agilidade operacional no dia a dia.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-900">
                Visão
              </p>
              <p className="text-[13px] text-slate-600 leading-relaxed">
                Ser a plataforma de referência em gestão empresarial e pagamentos digitais em
                Moçambique, reconhecida pela fiabilidade e conformidade contínua.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-900">
                Valores
              </p>
              <ul className="text-[13px] text-slate-600 space-y-1.5 leading-relaxed">
                <li>• Rigor na conformidade fiscal e laboral</li>
                <li>• Transparência de preços em Meticais</li>
                <li>• Segurança e integridade da informação</li>
                <li>• Inovação prática em carteiras móveis</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="bg-slate-950 text-slate-400 py-6 border-t border-slate-900 text-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p>© 2026 ClickPay Moçambique · NUIT 402302399 · NUEL 105086659</p>
          <p className="text-[11px] text-slate-500">
            IRPS (Lei 11/2025) · Lei do Trabalho 13/2023 · Regulamento SISSMO
          </p>
        </div>
      </footer>

      {/* Credential Request Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 relative space-y-4">
            <button
              type="button"
              onClick={() => setShowContactModal(false)}
              aria-label="Fechar janela"
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-950">Entrar em Contacto</h3>
              <p className="text-xs text-slate-500">
                Indique os dados da sua empresa para receber contacto da equipa ClickPay.
              </p>
            </div>

            {reqSuccess ? (
              <div className="p-4 bg-slate-50 border border-slate-200 text-slate-900 rounded-lg text-xs space-y-2">
                <p className="font-semibold text-emerald-800">Pedido registado com sucesso</p>
                <p className="text-slate-600">
                  A solicitação da empresa <b>{reqEmpresa}</b> foi enviada à nossa equipa.
                </p>
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="mt-2 w-full py-2 bg-slate-900 hover:bg-slate-950 text-white rounded-lg font-semibold cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitRequest} className="space-y-3 text-xs">
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Nome da Empresa *</label>
                  <input
                    type="text"
                    required
                    value={reqEmpresa}
                    onChange={(e) => setReqEmpresa(e.target.value)}
                    placeholder="Ex: Comercial Limpopo Lda"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-900"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700 block mb-1">
                    Nome do Responsável
                  </label>
                  <input
                    type="text"
                    value={reqResponsavel}
                    onChange={(e) => setReqResponsavel(e.target.value)}
                    placeholder="Nome completo"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-900"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700 block mb-1">E-mail *</label>
                  <input
                    type="email"
                    required
                    value={reqEmail}
                    onChange={(e) => setReqEmail(e.target.value)}
                    placeholder="email@empresa.co.mz"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-900"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700 block mb-1">
                    Telefone / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={reqTelefone}
                    onChange={(e) => setReqTelefone(e.target.value)}
                    placeholder="+258 84..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-900"
                  />
                </div>
                <button
                  type="submit"
                  disabled={reqSubmitting}
                  className="w-full py-2.5 bg-blue-900 hover:bg-blue-950 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  {reqSubmitting ? 'A enviar...' : 'Enviar Pedido'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
