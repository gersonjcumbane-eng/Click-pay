/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ArrowRight,
  Building2,
  Check,
  Eye,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Target
} from 'lucide-react';
import SupportTicketModal, {
  buildSupportMailtoUrl,
  buildSupportWhatsAppUrl,
  CLICKPAY_SUPPORT
} from './SupportTicketModal';
import { BillingCycle, CLICKPAY_PLANS, formatMzn } from '../lib/pricing';

interface LandingPageProps {
  onEnterLogin: () => void;
  onEnterRegister?: () => void;
  onEnterPlanDemo: (plan: 'Bronze' | 'Silver' | 'Gold') => void;
}

export default function LandingPage({
  onEnterLogin,
  onEnterRegister,
  onEnterPlanDemo
}: LandingPageProps) {
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('mensal');

  return (
    <div className="min-h-screen bg-[#FAFAFB] flex flex-col font-sans text-slate-900 antialiased selection:bg-blue-900 selection:text-white">
      {/* Header — 3 clean zones */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="flex items-center gap-2.5 shrink-0 whitespace-nowrap"
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
          </a>

          <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-slate-600">
            <a
              href="#sobre"
              className="hover:text-slate-950 transition-colors whitespace-nowrap shrink-0"
            >
              Sobre Nós
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

      {/* Focused Hero */}
      <section id="top" className="bg-white border-b border-slate-200 py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl space-y-6">
            <p className="text-[12px] font-medium text-blue-900">
              ClickPay Moçambique · Facturação &amp; Gestão Empresarial
            </p>

            <h1 className="text-[clamp(2.25rem,4vw,3.4rem)] font-semibold text-slate-950 tracking-tight leading-[1.1] text-balance">
              Facturação em Meticais, gestão salarial e conformidade fiscal num único sistema.
            </h1>

            <p className="text-[15px] sm:text-base text-slate-600 leading-relaxed max-w-2xl">
              Emita faturas A4 em Meticais, calcule salários com IRPS e INSS e gerencie a sua
              contabilidade numa plataforma concebida para empresas em Moçambique. As operações de
              pagamento encontram-se bloqueadas; o sistema opera em modo exclusivo de facturação.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
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
          </div>
        </div>
      </section>

      {/* Plans & Pricing */}
      <section id="planos" className="py-16 md:py-20 max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="max-w-2xl space-y-2">
            <p className="text-[12px] font-medium text-blue-900">Planos em Meticais (Sem Risco Cambial)</p>
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-950 tracking-tight text-balance">
              Escolha o plano adequado à sua empresa
            </h2>
            <p className="text-sm text-slate-600">
              Preços competitivos em Meticais para o mercado moçambicano. Activação dedicada à Facturação e Gestão (módulos de pagamento bloqueados para novos cadastros e contas ativas).
            </p>
          </div>

          <div
            role="group"
            aria-label="Ciclo de faturação"
            className="inline-flex items-center bg-white border border-slate-200 rounded-xl p-1 self-start md:self-auto shadow-2xs shrink-0"
          >
            <button
              type="button"
              onClick={() => setBillingCycle('mensal')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                billingCycle === 'mensal'
                  ? 'bg-blue-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('anual')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                billingCycle === 'anual'
                  ? 'bg-blue-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Anual</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  billingCycle === 'anual'
                    ? 'bg-emerald-400 text-slate-950'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                -20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CLICKPAY_PLANS.map((plan) => {
            const displayMonthly =
              billingCycle === 'anual' ? plan.annualMonthlyEquivalentMzn : plan.monthlyPriceMzn;
            const isRecommended = Boolean(plan.recommended);
            const isEnterprise = plan.internalCode === 'Gold';

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-xl p-6 flex flex-col justify-between space-y-6 ${
                  isRecommended ? 'border-2 border-blue-900 shadow-sm' : 'border border-slate-200'
                }`}
              >
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`text-[12px] font-semibold ${
                          isRecommended ? 'text-blue-900' : 'text-slate-500'
                        }`}
                      >
                        {plan.name} · {plan.segment}
                      </p>
                      {isRecommended && (
                        <span className="text-[11px] font-semibold text-blue-900">Recomendado</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{plan.tagline}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-1">
                    <div>
                      <span
                        className={`text-2xl font-semibold font-mono tabular-nums ${
                          isRecommended ? 'text-blue-900' : 'text-slate-950'
                        }`}
                      >
                        {formatMzn(displayMonthly)}
                      </span>
                      <span className="text-xs text-slate-500"> / mês</span>
                    </div>
                    {billingCycle === 'anual' ? (
                      <p className="text-[11px] text-emerald-700 font-medium">
                        Facturado {formatMzn(plan.annualTotalMzn)}/ano · Poupe {formatMzn(plan.annualSavingsMzn)}
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-500">
                        Ou {formatMzn(plan.annualMonthlyEquivalentMzn)}/mês no plano anual (-20%)
                      </p>
                    )}
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-700 pt-2">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2">
                        <Check
                          size={14}
                          className={`${isRecommended ? 'text-blue-900' : 'text-slate-500'} shrink-0 mt-0.5`}
                        />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => onEnterPlanDemo(plan.internalCode)}
                  className={`w-full py-2.5 font-semibold rounded-lg text-xs cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                    isRecommended
                      ? 'bg-blue-900 hover:bg-blue-950 text-white'
                      : isEnterprise
                      ? 'bg-slate-900 hover:bg-slate-950 text-white'
                      : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-300'
                  }`}
                >
                  Escolher {plan.name}
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-xs text-slate-500 leading-relaxed">
          Modelo híbrido transparente em Meticais (MZN): cada plano inclui o pacote de módulos, utilizadores e base de colaboradores; recibos salariais adicionais acima do limite são cobrados apenas pelos processamentos emitidos no mês.
        </p>
      </section>

      {/* Sobre Nós, Localização, Missão, Visão e Valores */}
      <section id="sobre" className="bg-white border-t border-slate-200 py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Resumo do que fazemos */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center border border-blue-100 shrink-0">
                  <Building2 size={16} />
                </div>
                <p className="text-[12px] font-semibold text-blue-900">Sobre Nós</p>
              </div>
              <h2 className="text-2xl sm:text-3xl font-semibold text-slate-950 tracking-tight text-balance">
                ClickPay Moçambique
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
                Desenvolvemos tecnologia de faturação eletrónica e gestão empresarial concebida para a
                realidade fiscal e laboral de Moçambique. A nossa plataforma reúne emissão de
                faturas A4 em Meticais, processamento documental de salários com IRPS e INSS e
                contabilidade PGC-NIRF.
              </p>
            </div>

            {/* Localização */}
            <div className="lg:col-span-4 bg-[#FAFAFB] rounded-xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center border border-blue-100 shrink-0">
                  <MapPin size={16} />
                </div>
                <p className="text-xs font-semibold text-slate-950">Localização</p>
              </div>
              <div className="space-y-1 text-[13px] text-slate-600 leading-relaxed">
                <p className="font-medium text-slate-900">Bairro São Dâmaso, Machava Q4</p>
                <p className="text-xs text-slate-500">Matola · Moçambique</p>
              </div>
            </div>
          </div>

          {/* Missão, Visão e Valores */}
          <div className="pt-10 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center border border-blue-100 shrink-0">
                  <Target size={16} />
                </div>
                <p className="text-xs font-semibold text-slate-950">Missão</p>
              </div>
              <p className="text-[13px] text-slate-600 leading-relaxed">
                Simplificar e automatizar a gestão salarial, fiscal e financeira das empresas em
                Moçambique, garantindo rigor legal e agilidade operacional no dia a dia.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center border border-blue-100 shrink-0">
                  <Eye size={16} />
                </div>
                <p className="text-xs font-semibold text-slate-950">Visão</p>
              </div>
              <p className="text-[13px] text-slate-600 leading-relaxed">
                Ser a plataforma de referência em faturação eletrónica e gestão empresarial em
                Moçambique, reconhecida pela fiabilidade e conformidade contínua.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center border border-blue-100 shrink-0">
                  <ShieldCheck size={16} />
                </div>
                <p className="text-xs font-semibold text-slate-950">Valores</p>
              </div>
              <ul className="text-[13px] text-slate-600 space-y-1.5 leading-relaxed">
                <li>• Rigor na conformidade fiscal e laboral</li>
                <li>• Transparência de preços em Meticais</li>
                <li>• Segurança e integridade da informação</li>
                <li>• Excelência documental em faturação A4</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Contactos — Telemóveis, WhatsApp, E-mail e Endereço Físico */}
      <section id="contacto" className="bg-[#FAFAFB] border-t border-slate-200 py-14 md:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[12px] font-medium text-blue-900">Contactos</p>
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-950 tracking-tight">
                Fale com a nossa equipa
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setSupportModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              <MessageCircle size={15} />
              <span>Abrir Suporte (E-mail &amp; WhatsApp)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Telemóvel & WhatsApp */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center gap-2.5 text-slate-950">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center border border-blue-100 shrink-0">
                  <Phone size={16} />
                </div>
                <span className="text-xs font-semibold">Telemóvel &amp; WhatsApp</span>
              </div>
              <div className="space-y-2 text-sm font-mono tabular-nums text-slate-700">
                <div className="flex items-center justify-between gap-2">
                  <a href="tel:+258842014173" className="hover:text-blue-900 transition-colors">
                    +258 84 201 4173
                  </a>
                  <a
                    href={buildSupportWhatsAppUrl({ number: CLICKPAY_SUPPORT.whatsappPrimaryNumber })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-sans text-[11px] font-semibold transition-colors"
                  >
                    <MessageCircle size={12} />
                    <span>WhatsApp</span>
                  </a>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <a href="tel:+258861390061" className="hover:text-blue-900 transition-colors">
                    +258 86 139 0061
                  </a>
                  <a
                    href={buildSupportWhatsAppUrl({ number: CLICKPAY_SUPPORT.whatsappSecondaryNumber })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-sans text-[11px] font-semibold transition-colors"
                  >
                    <MessageCircle size={12} />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>

            {/* E-mail */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center gap-2.5 text-slate-950">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center border border-blue-100 shrink-0">
                  <Mail size={16} />
                </div>
                <span className="text-xs font-semibold">E-mail</span>
              </div>
              <div className="space-y-1.5 text-sm text-slate-700">
                <div>
                  <a
                    href={buildSupportMailtoUrl()}
                    className="text-blue-900 hover:underline font-medium break-all"
                  >
                    click@payrolltech.co.mz
                  </a>
                </div>
                <p className="text-xs text-slate-500">
                  Suporte técnico e atendimento empresarial
                </p>
              </div>
            </div>

            {/* Endereço Físico */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center gap-2.5 text-slate-950">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center border border-blue-100 shrink-0">
                  <MapPin size={16} />
                </div>
                <span className="text-xs font-semibold">Endereço Físico</span>
              </div>
              <div className="space-y-1 text-sm text-slate-700 leading-relaxed">
                <p className="font-medium text-slate-900">Bairro São Dâmaso, Machava Q4</p>
                <p className="text-xs text-slate-500">Matola · Moçambique</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SupportTicketModal
        isOpen={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
        canalOrigem="Landing Page ClickPay"
      />

      {/* Quiet Footer */}
      <footer className="bg-slate-950 text-slate-400 py-6 border-t border-slate-900 text-xs mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p>© 2026 ClickPay Moçambique · NUIT 402302399 · NUEL 105086659</p>
          <p className="text-[11px] text-slate-500">
            IRPS (Lei 11/2025) · Lei do Trabalho 13/2023 · Regulamento SISSMO
          </p>
        </div>
      </footer>
    </div>
  );
}
