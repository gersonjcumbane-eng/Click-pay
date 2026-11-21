/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ArrowRight,
  Building2,
  Check,
  Eye,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Target
} from 'lucide-react';

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
              ClickPay Moçambique · Gestão Empresarial e Pagamentos
            </p>

            <h1 className="text-[clamp(2.25rem,4vw,3.4rem)] font-semibold text-slate-950 tracking-tight leading-[1.1] text-balance">
              Gestão salarial, faturação e pagamentos móveis num único sistema.
            </h1>

            <p className="text-[15px] sm:text-base text-slate-600 leading-relaxed max-w-2xl">
              Automatize salários com IRPS e INSS, emita faturas em Meticais e liquide pagamentos
              via M-Pesa e e-Mola numa plataforma concebida para empresas em Moçambique.
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
        <div className="max-w-2xl space-y-2 mb-10">
          <p className="text-[12px] font-medium text-blue-900">Planos em Meticais</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-950 tracking-tight text-balance">
            Escolha o plano adequado à sua empresa
          </h2>
          <p className="text-sm text-slate-600">
            Preços mensais sem fidelização, com pagamento via M-Pesa, e-Mola ou transferência bancária.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Starter */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <p className="text-[12px] font-semibold text-slate-500">Starter · Microempresa</p>
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
                  <span>Cálculo IRPS (Lei 11/2025) &amp; INSS</span>
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
              className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 font-semibold rounded-lg text-xs cursor-pointer transition-colors whitespace-nowrap shrink-0"
            >
              Escolher Starter
            </button>
          </div>

          {/* Profissional */}
          <div className="bg-white rounded-xl p-6 border-2 border-blue-900 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-semibold text-blue-900">
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
                  <span>Ficheiros SISSMO &amp; guias do INSS</span>
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
                  <span>Pagamentos via M-Pesa e e-Mola</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => onEnterPlanDemo('Silver')}
              className="w-full py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-semibold rounded-lg text-xs cursor-pointer transition-colors whitespace-nowrap shrink-0"
            >
              Escolher Profissional
            </button>
          </div>

          {/* Empresarial */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <p className="text-[12px] font-semibold text-slate-500">
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
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-semibold rounded-lg text-xs cursor-pointer transition-colors whitespace-nowrap shrink-0"
            >
              Escolher Empresarial
            </button>
          </div>
        </div>
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
                Desenvolvemos tecnologia de gestão empresarial e pagamentos digitais concebida para a
                realidade fiscal e laboral de Moçambique. A nossa plataforma reúne processamento de
                salários com cálculo de IRPS e INSS, faturação em Meticais, contabilidade e
                liquidações diretas via M-Pesa e e-Mola.
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
                Ser a plataforma de referência em gestão empresarial e pagamentos digitais em
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
                <li>• Inovação prática em carteiras móveis</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Contactos — Apenas Telemóvel e E-mails */}
      <section id="contacto" className="bg-[#FAFAFB] border-t border-slate-200 py-14 md:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
          <div className="space-y-1">
            <p className="text-[12px] font-medium text-blue-900">Contactos</p>
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-950 tracking-tight">
              Fale com a nossa equipa
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl">
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center gap-2 text-slate-900">
                <Phone size={15} className="text-blue-900 shrink-0" />
                <span className="text-xs font-semibold">Telemóvel</span>
              </div>
              <div className="space-y-1.5 text-sm font-mono tabular-nums text-slate-700">
                <div>
                  <a href="tel:+258842014173" className="hover:text-blue-900 transition-colors">
                    +258 84 201 4173
                  </a>
                </div>
                <div>
                  <a href="tel:+258861390061" className="hover:text-blue-900 transition-colors">
                    +258 86 139 0061
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center gap-2 text-slate-900">
                <Mail size={15} className="text-blue-900 shrink-0" />
                <span className="text-xs font-semibold">E-mail</span>
              </div>
              <div className="space-y-1.5 text-sm text-slate-700">
                <div>
                  <a
                    href="mailto:click@payrolltech.co.mz"
                    className="text-blue-900 hover:underline font-medium"
                  >
                    click@payrolltech.co.mz
                  </a>
                </div>
                <div>
                  <a
                    href="mailto:gersonjcumbane@gmail.com"
                    className="text-blue-900 hover:underline font-medium"
                  >
                    gersonjcumbane@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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
