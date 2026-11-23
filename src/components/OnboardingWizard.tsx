/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Search, 
  Upload, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  CreditCard, 
  Check, 
  X, 
  Mail, 
  Lock, 
  ShieldCheck, 
  ChevronRight,
  Warehouse,
  Tag,
  Eye,
  EyeOff,
  FileText
} from 'lucide-react';
import { syncRegisteredAccountToFirestore } from '../lib/firebase';
import { scanFileForMalware } from '../lib/security';
import {
  BillingCycle,
  CLICKPAY_PLANS,
  formatMzn,
  getPlanFeeMzn,
  getPlanSpec,
  normalizePlanToInternal
} from '../lib/pricing';

interface OnboardingWizardProps {
  onCancel: () => void;
  onEnterLogin?: () => void;
  onSuccess: (userData: any) => void;
}

export default function OnboardingWizard({ onCancel, onEnterLogin, onSuccess }: OnboardingWizardProps) {
  // Main view stage: 'ACCOUNT' (Register screen) | 'WIZARD' (optional configuration steps)
  const [stage, setStage] = useState<'ACCOUNT' | 'WIZARD'>('ACCOUNT');
  
  // Core Account Form State (Nome da Empresa, E-mail corporativo, NUIT, Senha)
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [email, setEmail] = useState('');
  const [nuit, setNuit] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);
  const [createdCompanyId, setCreatedCompanyId] = useState<string | null>(null);
  const [createdSessionData, setCreatedSessionData] = useState<any | null>(null);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  
  // Wizard Steps State
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [companySubStep, setCompanySubStep] = useState<'LOOKUP' | 'FORM'>('LOOKUP');
  
  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Step 1: Additional Company Profile State
  const [nuelSearch, setNuelSearch] = useState('');
  const [isSearchingNuel, setIsSearchingNuel] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [empresaPais, setEmpresaPais] = useState('Moçambique');
  const [provincia, setProvincia] = useState('Maputo Cidade');
  const [distrito, setDistrito] = useState('KaMpfumo');
  const [regimeIva, setRegimeIva] = useState('IVA Normal');
  const [nuel, setNuel] = useState('');
  const [empresaEmail, setEmpresaEmail] = useState('');
  const [empresaTelefone, setEmpresaTelefone] = useState('');
  const [endereco, setEndereco] = useState('');

  // Step 2: Subscription & Payment State
  const [selectedPlan, setSelectedPlan] = useState<'Starter' | 'Growth' | 'Business' | 'Vitalicio'>('Starter');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('mensal');
  const [paymentSubStep, setPaymentSubStep] = useState<'PLANS' | 'PAYMENT'>('PLANS');
  const [metodoPagamento, setMetodoPagamento] = useState<'ONLINE' | 'VOUCHER'>('ONLINE');
  const [carteiraNumero, setCarteiraNumero] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [isPayingPlan, setIsPayingPlan] = useState(false);

  // Step 3: Warehouse Initial State
  const [armazemNome, setArmazemNome] = useState('Armazém Principal');
  const [armazemCodigo, setArmazemCodigo] = useState('CPY1');
  const [armazemEndereco, setArmazemEndereco] = useState('Endereço do armazém');

  // Form Submission & Error State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Criar conta imediatamente no servidor ClickPay e no Firebase Firestore
  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanEmpresa = nomeEmpresa.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanNuit = nuit.replace(/\s+/g, '').trim();

    if (!cleanEmpresa || !cleanEmail || !cleanNuit || !senha) {
      setFormError('Por favor preencha Nome da Empresa, E-mail corporativo, NUIT e Senha.');
      return;
    }

    if (!/^\d{9}$/.test(cleanNuit)) {
      setFormError('O NUIT deve conter exatamente 9 dígitos numéricos.');
      return;
    }

    if (senha.length < 8) {
      setFormError('A senha deve ter no mínimo 8 caracteres.');
      return;
    }

    if (!acceptedTerms) {
      setFormError('É necessário aceitar os Termos de Uso e a Política de Privacidade da ClickPay.');
      return;
    }

    setIsCreatingAccount(true);
    let clientId = `cli_reg_${Date.now()}`;
    let serverData: any = null;

    const isJsonRes = (r: Response | null) =>
      !!r && (r.headers.get('content-type') || '').includes('application/json');

    let serverCreated = false;
    try {
      const res = await fetch('/api/auth/register-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomeEmpresa: cleanEmpresa,
          email: cleanEmail,
          nuit: cleanNuit,
          password: senha,
          plano: 'Starter',
          billingCycle: 'mensal'
        })
      }).catch(() => null);

      if (res && res.ok && isJsonRes(res)) {
        serverData = await res.json().catch(() => null);
        serverCreated = Boolean(serverData?.sucesso);
        if (serverData?.usuario?.id || serverData?.usuario?.empresa_id) {
          clientId = serverData.usuario.id || serverData.usuario.empresa_id;
        }
      } else if (res && !res.ok && isJsonRes(res) && res.status >= 400 && res.status < 500 && res.status !== 404 && res.status !== 405) {
        const errData = await res.json().catch(() => ({}));
        setFormError(errData.erro || 'Não foi possível criar a conta. Verifique os dados.');
        setIsCreatingAccount(false);
        return;
      }

      // Garantir gravação imediata na nuvem ClickPay e cofre local
      const fbResult = await syncRegisteredAccountToFirestore({
        clientId,
        nomeEmpresa: cleanEmpresa,
        email: cleanEmail,
        nuit: cleanNuit,
        password: senha,
        plano: 'Starter',
        feeBase: getPlanFeeMzn('Starter', 'mensal'),
        isUpdate: false
      });

      if (!serverCreated && fbResult.syncedCollections.length === 0) {
        setFormError('Não foi possível criar a conta neste momento. Verifique a ligação e tente novamente.');
        setIsCreatingAccount(false);
        return;
      }

      setCreatedCompanyId(clientId);
      setCreatedSessionData(serverData);
      setEmpresaEmail(cleanEmail);

      // Inicializar espaço de trabalho limpo para a nova empresa (zero dados de outras empresas)
      try {
        localStorage.setItem(
          `clickpay_tenant_${clientId}`,
          JSON.stringify({
            company: {
              nome: cleanEmpresa,
              nuit: cleanNuit,
              endereco: endereco || 'Moçambique',
              provincia: provincia || 'Maputo Cidade',
              distrito: distrito || 'KaMpfumo',
              regime_iva: regimeIva,
              nuel: nuel || '',
              email: cleanEmail,
              telefone: empresaTelefone || '+258 84 000 0000',
              logo: '/clickpay-logo.png',
              subscription_status: 'ativo',
              subscription_plan: 'Bronze'
            },
            employees: [],
            logs: [],
            contracts: [],
            vales: [],
            deletedIds: []
          })
        );
      } catch {
        // Ignore storage quota warning
      }

      // Persistir sessão básica para que o utilizador já fique registado
      localStorage.setItem('paytek_auth', 'true');
      localStorage.setItem('paytek_token', serverData?.token || `token_cliente_${clientId}`);
      localStorage.setItem('paytek_user', cleanEmail);
      localStorage.setItem('paytek_role', serverData?.usuario?.funcao || 'CLIENTE_EMPRESA');
      localStorage.setItem('paytek_company_id', clientId);
      localStorage.setItem('paytek_sub_status', 'ativo');
      localStorage.setItem('paytek_sub_plan', 'Bronze');
      localStorage.setItem('paytek_company_name', cleanEmpresa);

      setStage('WIZARD');
      showToast('Conta ClickPay criada e gravada com sucesso!');
    } catch (err: any) {
      console.error('Erro ao criar conta ClickPay:', err);
      setFormError('Erro ao registar a conta. Tente novamente.');
    } finally {
      setIsCreatingAccount(false);
    }
  };

  // Handle NUEL Search
  const handleConsultarNuel = async () => {
    if (!nuelSearch.trim()) return;
    setIsSearchingNuel(true);
    try {
      const res = await fetch(`/api/nuel/consultar?nuel=${encodeURIComponent(nuelSearch)}`);
      const isJson = (res.headers.get('content-type') || '').includes('application/json');
      if (res.ok && isJson) {
        const data = await res.json();
        if (data.sucesso && data.empresa) {
          setNomeEmpresa(data.empresa.nome || `Empresa ${nuelSearch}`);
          setNuit(data.empresa.nuit || nuit || '400123456');
          setNuel(data.empresa.nuel || nuelSearch);
          if (data.empresa.provincia) setProvincia(data.empresa.provincia);
          if (data.empresa.distrito) setDistrito(data.empresa.distrito);
          if (data.empresa.endereco) setEndereco(data.empresa.endereco);
          if (data.empresa.email) setEmpresaEmail(data.empresa.email);
          if (data.empresa.telefone) setEmpresaTelefone(data.empresa.telefone);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingNuel(false);
      setCompanySubStep('FORM');
    }
  };

  // Handle Final Onboarding Registration / Update
  const handleFinishOnboarding = async () => {
    setIsSubmitting(true);
    setFormError(null);

    const cleanEmpresa = nomeEmpresa.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanNuit = nuit.replace(/\s+/g, '').trim();
    const targetPlan = selectedPlan === 'Vitalicio' ? 'Business' : selectedPlan;
    const feeBase = getPlanFeeMzn(targetPlan, billingCycle);
    const mappedPlan = normalizePlanToInternal(targetPlan);
    const billingDays = billingCycle === 'anual' ? 365 : 30;

    try {
      const payload = {
        existingCompanyId: createdCompanyId,
        email: cleanEmail,
        password: senha,
        contacto: empresaTelefone || '+258 84 000 0000',
        nomeEmpresa: cleanEmpresa,
        nuit: cleanNuit,
        nuel,
        endereco,
        provincia,
        distrito,
        regimeIva,
        logo: logoUrl,
        plano: targetPlan,
        billingCycle,
        feeBase,
        metodoPagamento,
        armazemNome,
        armazemCodigo
      };

      const res = await fetch('/api/auth/register-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => null);

      const isJson = !!res && (res.headers.get('content-type') || '').includes('application/json');

      if (res && isJson && res.ok) {
        const data = await res.json().catch(() => ({}));
        const clientId = createdCompanyId || data.usuario?.id || data.usuario?.empresa_id || `cli_reg_${Date.now()}`;
        await syncRegisteredAccountToFirestore({
          clientId,
          nomeEmpresa: cleanEmpresa,
          email: cleanEmail,
          nuit: cleanNuit || '400000000',
          password: senha,
          plano: targetPlan,
          feeBase,
          telefone: empresaTelefone || '+258 84 000 0000',
          endereco,
          provincia,
          isUpdate: Boolean(createdCompanyId)
        });

        try {
          const tenantRaw = localStorage.getItem(`clickpay_tenant_${clientId}`);
          const tenantObj = tenantRaw ? JSON.parse(tenantRaw) : {};
          localStorage.setItem(
            `clickpay_tenant_${clientId}`,
            JSON.stringify({
              employees: tenantObj.employees || [],
              logs: tenantObj.logs || [],
              contracts: tenantObj.contracts || [],
              vales: tenantObj.vales || [],
              deletedIds: tenantObj.deletedIds || [],
              company: {
                ...(tenantObj.company || {}),
                nome: cleanEmpresa,
                nuit: cleanNuit,
                nuel,
                endereco,
                provincia,
                distrito,
                regime_iva: regimeIva,
                email: cleanEmail,
                telefone: empresaTelefone || '+258 84 000 0000',
                logo: logoUrl || '/clickpay-logo.png',
                subscription_status: 'ativo',
                subscription_plan: mappedPlan
              }
            })
          );
        } catch {
          // Ignore storage quota warning
        }

        localStorage.setItem('paytek_auth', 'true');
        localStorage.setItem('paytek_token', data.token || `token_cliente_${clientId}`);
        localStorage.setItem('paytek_user', cleanEmail);
        localStorage.setItem('paytek_role', data.usuario?.funcao || 'CLIENTE_EMPRESA');
        localStorage.setItem('paytek_company_id', clientId);
        localStorage.setItem('paytek_sub_status', data.usuario?.subscription_status || 'ativo');
        localStorage.setItem('paytek_sub_plan', mappedPlan);
        const defaultExp = new Date(Date.now() + billingDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        localStorage.setItem('paytek_sub_expire', data.usuario?.next_billing_date || defaultExp);
        localStorage.setItem('paytek_company_name', data.usuario?.nome_empresa || cleanEmpresa);
        onSuccess({
          ...data.usuario,
          subscription_plan: mappedPlan
        });
        return;
      }

      // Modo nuvem / deploy estático: concluir diretamente e atualizar cofre local/empresa
      const clientId = createdCompanyId || `cli_reg_${Date.now()}`;
      await syncRegisteredAccountToFirestore({
        clientId,
        nomeEmpresa: cleanEmpresa,
        email: cleanEmail,
        nuit: cleanNuit || '400000000',
        password: senha,
        plano: targetPlan,
        feeBase,
        telefone: empresaTelefone || '+258 84 000 0000',
        endereco,
        provincia,
        isUpdate: Boolean(createdCompanyId)
      });

      try {
        const tenantRaw = localStorage.getItem(`clickpay_tenant_${clientId}`);
        const tenantObj = tenantRaw ? JSON.parse(tenantRaw) : {};
        localStorage.setItem(
          `clickpay_tenant_${clientId}`,
          JSON.stringify({
            employees: tenantObj.employees || [],
            logs: tenantObj.logs || [],
            contracts: tenantObj.contracts || [],
            vales: tenantObj.vales || [],
            deletedIds: tenantObj.deletedIds || [],
            company: {
              ...(tenantObj.company || {}),
              nome: cleanEmpresa,
              nuit: cleanNuit,
              nuel,
              endereco,
              provincia,
              distrito,
              regime_iva: regimeIva,
              email: cleanEmail,
              telefone: empresaTelefone || '+258 84 000 0000',
              logo: logoUrl || '/clickpay-logo.png',
              subscription_status: 'ativo',
              subscription_plan: mappedPlan
            }
          })
        );
      } catch {
        // Ignore storage quota warning
      }

      const defaultExp = new Date(Date.now() + billingDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const fallbackUser = {
        id: clientId,
        email: cleanEmail,
        funcao: 'CLIENTE_EMPRESA',
        empresa_id: clientId,
        nome_empresa: cleanEmpresa,
        subscription_status: 'ativo',
        subscription_plan: mappedPlan,
        next_billing_date: defaultExp
      };

      localStorage.setItem('paytek_auth', 'true');
      localStorage.setItem('paytek_token', `token_cliente_${clientId}`);
      localStorage.setItem('paytek_user', cleanEmail);
      localStorage.setItem('paytek_role', 'CLIENTE_EMPRESA');
      localStorage.setItem('paytek_company_id', clientId);
      localStorage.setItem('paytek_sub_status', 'ativo');
      localStorage.setItem('paytek_sub_plan', mappedPlan);
      localStorage.setItem('paytek_sub_expire', defaultExp);
      localStorage.setItem('paytek_company_name', cleanEmpresa);
      onSuccess(fallbackUser);
    } catch (err) {
      console.error(err);
      setFormError('Erro ao concluir a configuração da conta. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Price formatting helper
  const getPlanPrice = (plan: 'Starter' | 'Growth' | 'Business' | 'Vitalicio') => {
    return formatMzn(getPlanFeeMzn(plan, billingCycle), { spaceGrouping: true });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800 antialiased relative selection:bg-blue-600 selection:text-white">
      
      {/* Toast Banner Top-Right */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 right-5 z-[100] bg-emerald-50 text-emerald-900 border border-emerald-200 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-bold"
          >
            <div className="w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center shrink-0">
              <Check size={12} strokeWidth={3} />
            </div>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Limpo e Minimalista ClickPay */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={onCancel}>
            <img
              src="/clickpay-logo.png"
              alt="ClickPay"
              className="h-9 w-auto object-contain shrink-0"
              referrerPolicy="no-referrer"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
            <div>
              <span className="text-base font-black text-slate-950 tracking-tight block leading-none">
                ClickPay
              </span>
              <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                Salários &amp; Gestão num só Clique
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
            >
              <ArrowLeft size={13} />
              <span>Início</span>
            </button>
            <button
              type="button"
              onClick={onEnterLogin || onCancel}
              className="px-3.5 py-1.5 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              Entrar
            </button>
          </div>
        </div>
      </header>

      {/* STAGE 1: FORMULÁRIO SIMPLIFICADO DE CRIAÇÃO DE CONTA CLICKPAY */}
      {stage === 'ACCOUNT' && (
        <div className="flex-1 flex flex-col items-center justify-center p-4 lg:p-8">
          <main className="w-full max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="bg-white rounded-2xl p-7 sm:p-9 shadow-xl shadow-slate-200/60 border border-slate-100 space-y-5"
            >
              <div className="text-center space-y-2">
                <img
                  src="/clickpay-logo.png"
                  alt="ClickPay"
                  className="h-12 w-auto mx-auto object-contain"
                  referrerPolicy="no-referrer"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
                <div>
                  <h1 className="text-2xl font-black text-slate-950 tracking-tight">
                    Criar Conta ClickPay
                  </h1>
                  <p className="text-xs font-medium text-slate-500 mt-1">
                    Registe a sua empresa e comece a gerir salários e faturação num só lugar.
                  </p>
                </div>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 text-rose-800 border border-rose-100 rounded-xl text-xs font-semibold">
                  {formError}
                </div>
              )}

              <form onSubmit={handleAccountSubmit} className="space-y-4">
                {/* 1. Nome da Empresa */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Nome da Empresa <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      autoComplete="organization"
                      value={nomeEmpresa}
                      onChange={(e) => setNomeEmpresa(e.target.value)}
                      placeholder="Ex: Comercial Maputo Lda"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-900 transition-all"
                    />
                  </div>
                </div>

                {/* 2. E-mail corporativo */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    E-mail corporativo <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contacto@suaempresa.co.mz"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-900 transition-all"
                    />
                  </div>
                </div>

                {/* 3. NUIT */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    NUIT <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <FileText size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={9}
                      required
                      value={nuit}
                      onChange={(e) => setNuit(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ex: 400123456 (9 dígitos)"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-900 transition-all"
                    />
                  </div>
                </div>

                {/* 4. Senha */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Senha <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-900 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <span className={`text-[10px] font-medium block ${senha.length >= 8 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {senha.length >= 8 ? '✓ Mínimo de 8 caracteres cumprido' : 'Mínimo 8 caracteres'}
                  </span>
                </div>

                {/* Aceitação dos Termos */}
                <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-900 focus:ring-blue-900 cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-600 leading-relaxed">
                    Concordo com os{' '}
                    <button
                      type="button"
                      onClick={() => setLegalModal('terms')}
                      className="font-bold text-blue-900 hover:underline cursor-pointer"
                    >
                      Termos de Uso
                    </button>{' '}
                    e a{' '}
                    <button
                      type="button"
                      onClick={() => setLegalModal('privacy')}
                      className="font-bold text-blue-900 hover:underline cursor-pointer"
                    >
                      Política de Privacidade
                    </button>{' '}
                    da ClickPay.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isCreatingAccount}
                  className="w-full py-3 bg-blue-900 hover:bg-blue-950 disabled:bg-slate-400 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-900/15 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isCreatingAccount ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>A criar conta ClickPay...</span>
                    </>
                  ) : (
                    <>
                      <span>Criar Conta</span>
                      <ChevronRight size={14} />
                    </>
                  )}
                </button>

                <div className="text-center pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500 font-medium">Já tem uma conta? </span>
                  <button
                    type="button"
                    onClick={onEnterLogin || onCancel}
                    className="text-xs font-extrabold text-blue-900 hover:underline cursor-pointer"
                  >
                    Entrar
                  </button>
                </div>
              </form>
            </motion.div>
          </main>

          {/* Rodapé Discreto ClickPay */}
          <footer className="mt-8 text-center text-[10px] text-slate-400 max-w-md px-4 space-y-1">
            <p className="flex items-center justify-center gap-1 font-semibold text-slate-500">
              <ShieldCheck size={12} className="text-emerald-600" />
              ClickPay Moçambique · Acesso Encriptado SSL
            </p>
            <p>© 2026 ClickPay Moçambique · NUIT: 402302399 | NUEL: 105086659</p>
          </footer>
        </div>
      )}

      {/* Modal Informativo de Termos / Privacidade */}
      {legalModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-950">
                {legalModal === 'terms' ? 'Termos de Uso — ClickPay' : 'Política de Privacidade — ClickPay'}
              </h3>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="text-xs text-slate-600 leading-relaxed space-y-2">
              {legalModal === 'terms' ? (
                <>
                  <p>A plataforma <b>ClickPay Moçambique</b> (NUIT 402302399 · NUEL 105086659) disponibiliza ferramentas empresariais de gestão salarial, faturação eletrónica e contabilidade em conformidade com a legislação moçambicana vigente.</p>
                  <p>Cada empresa é responsável pela veracidade dos dados fiscais, colaboradores e movimentações financeiras registadas na sua conta.</p>
                </>
              ) : (
                <>
                  <p>Os seus dados pessoais e empresariais são protegidos por encriptação em trânsito e em repouso, sendo utilizados exclusivamente para autenticação, cumprimento fiscal e processamento autorizado dentro do ClickPay ERP.</p>
                  <p>A ClickPay não partilha nem comercializa informações confidenciais com terceiros sem autorização legal ou expressa.</p>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setAcceptedTerms(true);
                setLegalModal(null);
              }}
              className="w-full py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs cursor-pointer"
            >
              Aceitar e Fechar
            </button>
          </div>
        </div>
      )}

      {/* STAGE 2: 3-STEP ONBOARDING WIZARD (Configuração Opcional) */}
      {stage === 'WIZARD' && (
        <main className="max-w-4xl mx-auto w-full px-4 py-8 flex-1">
          <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <p className="text-xs font-extrabold text-emerald-950">
                  Conta ClickPay criada e sincronizada na nuvem ({nomeEmpresa})
                </p>
                <p className="text-[11px] text-emerald-800">
                  Pode concluir a configuração fiscal/armazém abaixo ou aceder diretamente ao painel ERP.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const resolvedId = createdCompanyId || localStorage.getItem('paytek_company_id') || `cli_reg_${Date.now()}`;
                onSuccess(
                  createdSessionData?.usuario || {
                    id: resolvedId,
                    empresa_id: resolvedId,
                    email: email.trim().toLowerCase(),
                    funcao: 'CLIENTE_EMPRESA',
                    nome_empresa: nomeEmpresa.trim(),
                    subscription_status: 'ativo',
                    subscription_plan: normalizePlanToInternal(selectedPlan)
                  }
                );
              }}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              <span>Entrar no ERP agora</span>
              <ArrowRight size={13} />
            </button>
          </div>
          
          {/* Stepper Header Bar */}
          <div className="flex items-center justify-center gap-4 sm:gap-8 mb-8 text-xs font-bold">
            
            {/* Step 1 Pill */}
            <div className={`flex items-center gap-2 ${currentStep === 1 ? 'text-blue-900 font-extrabold' : currentStep > 1 ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${currentStep === 1 ? 'bg-blue-900 text-white shadow-md shadow-blue-900/20' : currentStep > 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {currentStep > 1 ? <Check size={14} /> : '1'}
              </div>
              <span>Empresa</span>
            </div>

            <div className={`w-12 h-0.5 ${currentStep > 1 ? 'bg-emerald-500' : 'bg-slate-200'}`} />

            {/* Step 2 Pill */}
            <div className={`flex items-center gap-2 ${currentStep === 2 ? 'text-blue-900 font-extrabold' : currentStep > 2 ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${currentStep === 2 ? 'bg-blue-900 text-white shadow-md shadow-blue-900/20' : currentStep > 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {currentStep > 2 ? <Check size={14} /> : '2'}
              </div>
              <span>Subscrição</span>
            </div>

            <div className={`w-12 h-0.5 ${currentStep > 2 ? 'bg-emerald-500' : 'bg-slate-200'}`} />

            {/* Step 3 Pill */}
            <div className={`flex items-center gap-2 ${currentStep === 3 ? 'text-blue-900 font-extrabold' : 'text-slate-400'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${currentStep === 3 ? 'bg-blue-900 text-white shadow-md shadow-blue-900/20' : 'bg-slate-200 text-slate-600'}`}>
                3
              </div>
              <span>Configuração</span>
            </div>

          </div>

          {/* STEP 1: EMPRESA (Images 1, 4, 5) */}
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-6 sm:p-10 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6 max-w-2xl mx-auto"
            >
              {companySubStep === 'LOOKUP' ? (
                /* Step 1.1: NUEL Search (Image 1) */
                <div className="space-y-6 text-center">
                  <div className="w-12 h-12 bg-blue-50 text-blue-900 rounded-2xl flex items-center justify-center mx-auto">
                    <Building2 size={24} />
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-slate-900">
                      Bem-vindo! Vamos configurar a sua empresa
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                      Se a sua empresa está registada em Moçambique, insira o NUEL para preencher automaticamente. Caso contrário, avance para o registo manual.
                    </p>
                  </div>

                  <div className="space-y-3 text-left max-w-md mx-auto">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                        NUEL <span className="text-slate-400 font-normal">APENAS MOÇAMBIQUE</span>
                      </label>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={nuelSearch}
                        onChange={(e) => setNuelSearch(e.target.value)}
                        placeholder="Ex: 100123456"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-900 transition-all pr-10"
                      />
                      <Search size={16} className="absolute right-3 top-3.5 text-slate-400" />
                    </div>

                    <button
                      onClick={handleConsultarNuel}
                      disabled={isSearchingNuel}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs transition-all shadow-md shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isSearchingNuel ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          A consultar base de dados do NUEL...
                        </>
                      ) : (
                        <>
                          <Search size={14} />
                          Procurar empresa (Moçambique)
                        </>
                      )}
                    </button>
                  </div>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                    <div className="relative flex justify-center text-[10px] font-bold uppercase"><span className="bg-white px-3 text-slate-400">OU</span></div>
                  </div>

                  <button
                    onClick={() => setCompanySubStep('FORM')}
                    className="w-full py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Registar empresa manualmente (qualquer país)
                  </button>
                </div>
              ) : (
                /* Step 1.2: Perfil da Empresa Form (Images 4 & 5) */
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center shrink-0">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900">Perfil da Empresa</h2>
                      <p className="text-xs text-slate-500">Confirme os dados fiscais e de contacto.</p>
                    </div>
                  </div>

                  {/* Logótipo */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                      LOGÓTIPO DA EMPRESA
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden">
                        {logoUrl ? (
                          <img src={logoUrl} alt="Logo preview" className="w-full h-full object-contain" />
                        ) : (
                          <Building2 className="text-slate-300" size={24} />
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs cursor-pointer inline-flex items-center gap-1.5 shadow-xs">
                          <Upload size={13} />
                          <span>Carregar</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 2 * 1024 * 1024) {
                                  showToast('O logótipo excede o limite máximo de 2MB.');
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onloadend = async () => {
                                  const result = reader.result as string;
                                  const avScan = await scanFileForMalware({
                                    base64: result.split(',')[1] || '',
                                    mimeType: file.type || 'image/png',
                                    fileName: file.name,
                                    maxBytes: 2 * 1024 * 1024
                                  });
                                  if (!avScan.safe) {
                                    showToast(`Ficheiro bloqueado por segurança: ${avScan.reason}`);
                                    return;
                                  }
                                  setLogoUrl(result);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                        <p className="text-[10px] text-slate-400">PNG, JPG, WebP ou SVG. Máx. 2MB.</p>
                      </div>
                    </div>
                  </div>

                  {/* Nome da Empresa */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                      NOME DA EMPRESA <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={nomeEmpresa}
                      onChange={(e) => setNomeEmpresa(e.target.value)}
                      placeholder="Ex: Comercial Maputo Lda"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-900 transition-all"
                    />
                  </div>

                  {/* País */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                      PAÍS
                    </label>
                    <select
                      value={empresaPais}
                      onChange={(e) => setEmpresaPais(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-900 transition-all cursor-pointer"
                    >
                      <option value="Moçambique">Moçambique</option>
                      <option value="África do Sul">África do Sul</option>
                      <option value="Angola">Angola</option>
                    </select>
                  </div>

                  {/* Província & Distrito */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                        PROVÍNCIA / ESTADO
                      </label>
                      <select
                        value={provincia}
                        onChange={(e) => setProvincia(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-900 transition-all cursor-pointer"
                      >
                        <option value="Maputo Cidade">Maputo Cidade</option>
                        <option value="Maputo Província">Maputo Província</option>
                        <option value="Gaza">Gaza</option>
                        <option value="Inhambane">Inhambane</option>
                        <option value="Sofala">Sofala</option>
                        <option value="Manica">Manica</option>
                        <option value="Tete">Tete</option>
                        <option value="Zambézia">Zambézia</option>
                        <option value="Nampula">Nampula</option>
                        <option value="Cabo Delgado">Cabo Delgado</option>
                        <option value="Niassa">Niassa</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                        DISTRITO / CIDADE
                      </label>
                      <input
                        type="text"
                        value={distrito}
                        onChange={(e) => setDistrito(e.target.value)}
                        placeholder="Distrito / Cidade"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-900 transition-all"
                      />
                    </div>
                  </div>

                  {/* Regime de IVA */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                      <Tag size={12} className="text-indigo-600" />
                      REGIME DE IVA
                    </label>
                    <select
                      value={regimeIva}
                      onChange={(e) => setRegimeIva(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-900 transition-all cursor-pointer"
                    >
                      <option value="IVA Normal">IVA Normal (16%) — contabilidade completa</option>
                      <option value="IVA Isento">IVA Isento — artigo 9º do Código do IVA</option>
                      <option value="IVA Simplificado">IVA Simplificado (5%)</option>
                    </select>
                    <p className="text-[10px] text-slate-400">
                      Regime normal de IVA (16%) — contabilidade completa. Iremos criar as taxas de imposto correspondentes automaticamente.
                    </p>
                  </div>

                  {/* NUEL & NUIT */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                        NUEL
                      </label>
                      <input
                        type="text"
                        value={nuel}
                        onChange={(e) => setNuel(e.target.value)}
                        placeholder="100123456"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-900 transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                        NUIT
                      </label>
                      <input
                        type="text"
                        value={nuit}
                        onChange={(e) => setNuit(e.target.value)}
                        placeholder="400123456"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-900 transition-all"
                      />
                    </div>
                  </div>

                  {/* Email & Telefone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                        EMAIL
                      </label>
                      <input
                        type="email"
                        value={empresaEmail}
                        onChange={(e) => setEmpresaEmail(e.target.value)}
                        placeholder="empresa@exemplo.com"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-900 transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                        TELEFONE
                      </label>
                      <input
                        type="tel"
                        value={empresaTelefone}
                        onChange={(e) => setEmpresaTelefone(e.target.value)}
                        placeholder="+258..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-900 transition-all"
                      />
                    </div>
                  </div>

                  {/* Endereço */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                      ENDEREÇO
                    </label>
                    <input
                      type="text"
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                      placeholder="Rua..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-900 transition-all"
                    />
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button
                      onClick={() => setCompanySubStep('LOOKUP')}
                      className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ArrowLeft size={14} />
                      Voltar
                    </button>

                    <button
                      onClick={() => {
                        showToast('Empresa criada!');
                        setCurrentStep(2);
                      }}
                      className="px-6 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shadow-blue-900/15 cursor-pointer"
                    >
                      Continuar
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 2: SUBSCRIÇÃO & PAGAMENTO (Images 6 & 7) */}
          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              {paymentSubStep === 'PLANS' ? (
                /* Step 2.1: Plan Selector (Image 6) */
                <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-black text-slate-900">Escolha o seu Plano</h2>
                      <p className="text-xs text-slate-500">
                        Preços em Meticais adaptados ao mercado moçambicano. Poupe 20% na subscrição anual.
                      </p>
                    </div>

                    <div className="inline-flex items-center bg-slate-100 rounded-xl p-1 self-start sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => setBillingCycle('mensal')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          billingCycle === 'mensal'
                            ? 'bg-blue-900 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Mensal
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingCycle('anual')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          billingCycle === 'anual'
                            ? 'bg-blue-900 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span>Anual</span>
                        <span className="text-[10px] font-black bg-emerald-400 text-slate-950 px-1.5 py-0.5 rounded">
                          -20%
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {CLICKPAY_PLANS.map((plan) => {
                      const isSelected = selectedPlan === plan.id;
                      const displayMonthly =
                        billingCycle === 'anual' ? plan.annualMonthlyEquivalentMzn : plan.monthlyPriceMzn;
                      return (
                        <div
                          key={plan.id}
                          onClick={() => setSelectedPlan(plan.id)}
                          className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 relative ${
                            plan.recommended
                              ? isSelected
                                ? 'border-blue-900 bg-blue-50/30 shadow-lg'
                                : 'border-amber-300 bg-amber-50/10 hover:border-amber-400'
                              : isSelected
                              ? 'border-blue-900 bg-blue-50/20 shadow-md'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {plan.recommended && (
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-xs tracking-wider">
                              RECOMENDADO
                            </span>
                          )}

                          <div className="space-y-2">
                            <h3 className="text-sm font-extrabold text-slate-900">
                              {plan.name} <span className="text-[11px] font-semibold text-slate-500">· {plan.segment}</span>
                            </h3>
                            <div>
                              <span className="text-xl font-black text-slate-900">
                                {formatMzn(displayMonthly, { spaceGrouping: true })}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold">/mês</span>
                              {billingCycle === 'anual' && (
                                <p className="text-[10px] font-bold text-emerald-700 mt-0.5">
                                  Total anual: {formatMzn(plan.annualTotalMzn, { spaceGrouping: true })} (Poupe {formatMzn(plan.annualSavingsMzn, { spaceGrouping: true })})
                                </p>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 font-semibold">
                              {plan.includedUsersLabel} · Até {plan.includedEmployees} colaboradores
                            </p>

                            <ul className="space-y-2 pt-2 text-[11px] text-slate-600 font-medium">
                              {plan.features.map((feat) => (
                                <li key={feat} className="flex items-start gap-1.5">
                                  <Check size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                                  <span>{feat}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ArrowLeft size={14} />
                      Voltar
                    </button>

                    <button
                      onClick={() => setPaymentSubStep('PAYMENT')}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                    >
                      Prosseguir para Pagamento
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                /* Step 2.2: Payment Screen (Image 7) */
                <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6 max-w-2xl mx-auto">
                  <div>
                    <h2 className="text-base font-black text-slate-900">Pagamento & Activação</h2>
                    <p className="text-xs text-slate-500">Finalize a sua subscrição para começar a usar o ClickPay ERP.</p>
                  </div>

                  {/* Summary Box */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">
                        PLANO SELECCIONADO
                      </span>
                      <span className="text-sm font-black text-slate-900">
                        {getPlanSpec(selectedPlan).name} · {billingCycle === 'anual' ? 'Anual (-20%)' : 'Mensal'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">
                        TOTAL A PAGAR
                      </span>
                      <span className="text-base font-black text-blue-900">{getPlanPrice(selectedPlan)}</span>
                    </div>
                  </div>

                  {/* Payment Method Option */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                      MÉTODO DE PAGAMENTO
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Pagamento Online */}
                      <div
                        onClick={() => setMetodoPagamento('ONLINE')}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all space-y-2 ${
                          metodoPagamento === 'ONLINE'
                            ? 'border-blue-900 bg-blue-50/30 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <CreditCard size={18} className="text-blue-900" />
                          <span className="text-xs font-black text-slate-900">Pagamento Online</span>
                        </div>
                        <p className="text-[10px] text-slate-500">M-Pesa, e-Mola, mKesh ou Cartão</p>

                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">m-pesa</span>
                          <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">e-mola</span>
                          <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">mKesh</span>
                          <span className="text-[9px] font-bold bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">VISA</span>
                        </div>
                      </div>

                      {/* Cupão / Voucher */}
                      <div
                        onClick={() => setMetodoPagamento('VOUCHER')}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all space-y-2 ${
                          metodoPagamento === 'VOUCHER'
                            ? 'border-blue-900 bg-blue-50/30 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Tag size={18} className="text-blue-900" />
                          <span className="text-xs font-black text-slate-900">Cupão / Voucher</span>
                        </div>
                        <p className="text-[10px] text-slate-500">Activar com código promocional</p>
                      </div>
                    </div>
                  </div>

                  {/* Input depending on method */}
                  {metodoPagamento === 'ONLINE' ? (
                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                        NÚMERO DA CARTEIRA MÓVEL (M-PESA / E-MOLA)
                      </label>
                      <div className="flex gap-2">
                        <span className="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-slate-700 flex items-center justify-center shrink-0">
                          +258
                        </span>
                        <input
                          type="tel"
                          value={carteiraNumero}
                          onChange={(e) => setCarteiraNumero(e.target.value)}
                          placeholder="841234567"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-900 transition-all"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400">Receberá um pedido de confirmação com código PIN no seu telemóvel.</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                        CÓDIGO DO CUPÃO / VOUCHER
                      </label>
                      <input
                        type="text"
                        value={voucherCode}
                        onChange={(e) => setVoucherCode(e.target.value)}
                        placeholder="EX: CLICKPAY2026"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-900 transition-all"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button
                      onClick={() => setPaymentSubStep('PLANS')}
                      className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ArrowLeft size={14} />
                      Voltar
                    </button>

                    <button
                      type="button"
                      disabled={isPayingPlan}
                      onClick={async () => {
                        if (metodoPagamento === 'ONLINE' && carteiraNumero.trim()) {
                          setIsPayingPlan(true);
                          const amountNum = getPlanFeeMzn(selectedPlan, billingCycle);
                          try {
                            const res = await fetch('/api/payments/c2b/collect', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                phone: carteiraNumero.trim(),
                                amount: amountNum,
                                description: `Plano ${getPlanSpec(selectedPlan).name} (${billingCycle}) ClickPay ERP`
                              })
                            });
                            const payData = await res.json().catch(() => null);
                            if (payData?.transaction?.responseMessage) {
                              showToast(payData.transaction.responseMessage);
                            }
                          } catch {
                            // Continua para configuração de armazém mesmo em modo offline
                          } finally {
                            setIsPayingPlan(false);
                          }
                        }
                        setCurrentStep(3);
                      }}
                      className="px-6 py-2.5 bg-blue-900 hover:bg-blue-950 disabled:bg-slate-400 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shadow-blue-900/15 cursor-pointer"
                    >
                      {isPayingPlan ? 'A processar carteira móvel...' : 'Finalizar e Activar Conta'}
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 3: CONFIGURAÇÃO INICIAL (ARMAZÉM) (Image 8) */}
          {currentStep === 3 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-6 sm:p-10 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6 max-w-2xl mx-auto"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center shrink-0">
                  <Warehouse size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">Armazém Inicial</h2>
                  <p className="text-xs text-slate-500">Crie o seu primeiro armazém — pode adicionar mais depois em Inventário.</p>
                </div>
              </div>

              {formError && (
                <div className="p-3.5 bg-rose-50 text-rose-800 border border-rose-100 rounded-xl text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                    NOME DO ARMAZÉM <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={armazemNome}
                    onChange={(e) => setArmazemNome(e.target.value)}
                    placeholder="Armazém Principal"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-900 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                    CÓDIGO
                  </label>
                  <input
                    type="text"
                    value={armazemCodigo}
                    onChange={(e) => setArmazemCodigo(e.target.value)}
                    placeholder="CPY1"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-900 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                    ENDEREÇO
                  </label>
                  <input
                    type="text"
                    value={armazemEndereco}
                    onChange={(e) => setArmazemEndereco(e.target.value)}
                    placeholder="Endereço do armazém"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-900 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleFinishOnboarding}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 text-slate-500 hover:text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Saltar
                </button>

                <button
                  type="button"
                  onClick={handleFinishOnboarding}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-blue-900 hover:bg-blue-950 disabled:bg-slate-300 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shadow-blue-900/15 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      A configurar ERP...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      Finalizar configuração
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

        </main>
      )}

    </div>
  );
}
