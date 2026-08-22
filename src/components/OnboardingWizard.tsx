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
  Smartphone, 
  Globe, 
  Check, 
  X, 
  Package, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  ShieldCheck, 
  Sparkles,
  Sun,
  Moon,
  ChevronRight,
  Warehouse,
  Tag
} from 'lucide-react';

interface OnboardingWizardProps {
  onCancel: () => void;
  onSuccess: (userData: any) => void;
}

export default function OnboardingWizard({ onCancel, onSuccess }: OnboardingWizardProps) {
  // Main view stage: 'ACCOUNT' (Register screen) | 'WIZARD' (3 steps)
  const [stage, setStage] = useState<'ACCOUNT' | 'WIZARD'>('ACCOUNT');
  
  // Account Form State (Image 2 & 3)
  const [nome, setNome] = useState('Tomas');
  const [apelido, setApelido] = useState('Workshop');
  const [pais, setPais] = useState('Moçambique');
  const [contacto, setContacto] = useState('841234567');
  const [email, setEmail] = useState('workshop.demo.843538@payrolltech.mz');
  const [senha, setSenha] = useState('12345678');
  const [confirmarSenha, setConfirmarSenha] = useState('12345678');
  const [resellerCode, setResellerCode] = useState('00000');
  
  // Wizard Steps State
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [companySubStep, setCompanySubStep] = useState<'LOOKUP' | 'FORM'>('LOOKUP');
  
  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Step 1: Company Profile State (Image 4 & 5)
  const [nuelSearch, setNuelSearch] = useState('100123456');
  const [isSearchingNuel, setIsSearchingNuel] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [nomeEmpresa, setNomeEmpresa] = useState('Workshop Demo 843538');
  const [empresaPais, setEmpresaPais] = useState('Moçambique');
  const [provincia, setProvincia] = useState('Maputo Cidade');
  const [distrito, setDistrito] = useState('KaMpfumo');
  const [regimeIva, setRegimeIva] = useState('IVA Normal');
  const [nuel, setNuel] = useState('100123456');
  const [nuit, setNuit] = useState('400123456');
  const [empresaEmail, setEmpresaEmail] = useState('workshop.demo.843538@payrolltech.mz');
  const [empresaTelefone, setEmpresaTelefone] = useState('+258841234567');
  const [endereco, setEndereco] = useState('Av. 25 Setembro, 1234, Maputo');

  // Step 2: Subscription & Payment State (Image 6 & 7)
  const [selectedPlan, setSelectedPlan] = useState<'Starter' | 'Growth' | 'Business' | 'Vitalicio'>('Starter');
  const [paymentSubStep, setPaymentSubStep] = useState<'PLANS' | 'PAYMENT'>('PLANS');
  const [metodoPagamento, setMetodoPagamento] = useState<'ONLINE' | 'VOUCHER'>('ONLINE');
  const [carteiraNumero, setCarteiraNumero] = useState('841234567');
  const [voucherCode, setVoucherCode] = useState('');

  // Step 3: Warehouse Initial State (Image 8)
  const [armazemNome, setArmazemNome] = useState('Armazém Principal');
  const [armazemCodigo, setArmazemCodigo] = useState('PRI');
  const [armazemEndereco, setArmazemEndereco] = useState('Endereço do armazém');

  // Form Submission & Error State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Handle Initial Account Form submit (Image 2 -> 3 -> 1)
  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!nome.trim() || !apelido.trim() || !email.trim() || !senha) {
      setFormError('Por favor preencha todos os campos obrigatórios (*).');
      return;
    }

    if (senha !== confirmarSenha) {
      setFormError('As senhas introduzidas não coincidem.');
      return;
    }

    if (senha.length < 8) {
      setFormError('A senha deve ter no mínimo 8 caracteres.');
      return;
    }

    // Advance to 3-step Wizard & show success toast (Image 1)
    setStage('WIZARD');
    showToast('Conta criada! Bem-vindo.');
  };

  // Handle NUEL Search (Image 1)
  const handleConsultarNuel = async () => {
    if (!nuelSearch.trim()) return;
    setIsSearchingNuel(true);
    try {
      const res = await fetch(`/api/nuel/consultar?nuel=${encodeURIComponent(nuelSearch)}`);
      const data = await res.json();
      if (data.sucesso && data.empresa) {
        setNomeEmpresa(data.empresa.nome || `Empresa ${nuelSearch}`);
        setNuit(data.empresa.nuit || '400123456');
        setNuel(data.empresa.nuel || nuelSearch);
        if (data.empresa.provincia) setProvincia(data.empresa.provincia);
        if (data.empresa.distrito) setDistrito(data.empresa.distrito);
        if (data.empresa.endereco) setEndereco(data.empresa.endereco);
        if (data.empresa.email) setEmpresaEmail(data.empresa.email);
        if (data.empresa.telefone) setEmpresaTelefone(data.empresa.telefone);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingNuel(false);
      setCompanySubStep('FORM');
    }
  };

  // Handle Final Onboarding Registration
  const handleFinishOnboarding = async () => {
    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        nome,
        apelido,
        email,
        password: senha,
        contacto: `+258${contacto}`,
        resellerCode,
        nomeEmpresa,
        nuit,
        nuel,
        endereco,
        provincia,
        distrito,
        regimeIva,
        logo: logoUrl,
        plano: selectedPlan === 'Vitalicio' ? 'Gold' : selectedPlan,
        metodoPagamento,
        armazemNome,
        armazemCodigo
      };

      const res = await fetch('/api/auth/register-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.sucesso) {
        localStorage.setItem('paytek_auth', 'true');
        localStorage.setItem('paytek_token', data.token);
        localStorage.setItem('paytek_user', email);
        if (data.usuario) {
          localStorage.setItem('paytek_role', data.usuario.funcao || 'CLIENTE_EMPRESA');
          localStorage.setItem('paytek_sub_status', data.usuario.subscription_status || 'ativo');
          localStorage.setItem('paytek_sub_plan', data.usuario.subscription_plan || 'Growth');
          localStorage.setItem('paytek_sub_expire', data.usuario.next_billing_date || '2026-08-28');
          localStorage.setItem('paytek_company_name', data.usuario.nome_empresa || nomeEmpresa);
        }
        onSuccess(data.usuario);
      } else {
        setFormError(data.erro || 'Falha ao concluir registo. Verifique os dados.');
      }
    } catch (err) {
      console.error(err);
      setFormError('Erro de ligação com o servidor Payroll Tech MZ ERP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Price formatting helper
  const getPlanPrice = (plan: 'Starter' | 'Growth' | 'Business') => {
    switch (plan) {
      case 'Starter': return '1 500,00 MT';
      case 'Growth': return '3 000,00 MT';
      case 'Business': return '4 500,00 MT';
    }
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

      {/* Top Navbar Header (Images 2 & 3) */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo Payroll Tech MZ ERP */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={onCancel}>
            <div className="w-9 h-9 bg-blue-700 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-700/20">
              <span className="font-black text-lg tracking-tighter">P</span>
            </div>
            <div>
              <span className="text-base font-black text-blue-900 tracking-tight block leading-none">
                PAYROLL TECH
              </span>
              <span className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-widest block">
                MZ ERP
              </span>
            </div>
          </div>

          {/* Center Navigation Links */}
          <div className="hidden md:flex items-center gap-7 text-xs font-extrabold text-slate-600 uppercase tracking-wider">
            <a href="#" className="hover:text-blue-900 transition-colors">INÍCIO</a>
            <a href="#" className="hover:text-blue-900 transition-colors">PRODUTO</a>
            <a href="#" className="hover:text-blue-900 transition-colors">RECURSOS</a>
            <a href="#" className="hover:text-blue-900 transition-colors">PLANOS</a>
            <a href="#" className="hover:text-blue-900 transition-colors">EVENTOS</a>
            <a href="#" className="hover:text-blue-900 transition-colors">DEMO</a>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-slate-200 rounded-lg p-0.5 text-[10px] font-black">
              <span className="px-1.5 py-0.5 bg-blue-900 text-white rounded">PT</span>
              <span className="px-1.5 py-0.5 text-slate-500 hover:text-slate-900">EN</span>
            </div>

            <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer">
              <Moon size={16} />
            </button>

            <button 
              onClick={onCancel}
              className="text-xs font-bold text-slate-600 hover:text-blue-900 px-3 py-1.5 transition-colors cursor-pointer"
            >
              Entrar
            </button>

            <button 
              onClick={() => setStage('ACCOUNT')}
              className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-900/15 cursor-pointer"
            >
              Criar conta
            </button>
          </div>

        </div>
      </nav>

      {/* STAGE 1: ACCOUNT CREATION FORM (Images 2 & 3) */}
      {stage === 'ACCOUNT' && (
        <div className="flex-1 flex flex-col justify-between">
          <main className="max-w-2xl mx-auto w-full px-4 py-10">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 sm:p-10 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6"
            >
              <div className="text-center space-y-1">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Criar a sua conta
                </h1>
                <p className="text-xs font-semibold text-slate-500">
                  Comece a usar o <span className="font-extrabold text-blue-900">Payroll Tech MZ ERP</span> hoje
                </p>
              </div>

              {formError && (
                <div className="p-3.5 bg-rose-50 text-rose-800 border border-rose-100 rounded-xl text-xs font-semibold">
                  {formError}
                </div>
              )}

              <form onSubmit={handleAccountSubmit} className="space-y-4">
                {/* Nome & Apelido */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                      NOME <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User size={15} className="absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="Tomas"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-900 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                      APELIDO <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User size={15} className="absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={apelido}
                        onChange={(e) => setApelido(e.target.value)}
                        placeholder="Workshop"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-900 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* País */}
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                    PAÍS <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Globe size={15} className="absolute left-3 top-3 text-slate-400" />
                    <select
                      value={pais}
                      onChange={(e) => setPais(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-900 transition-all cursor-pointer"
                    >
                      <option value="Moçambique">🇲🇿 Moçambique</option>
                      <option value="África do Sul">🇿🇦 África do Sul</option>
                      <option value="Angola">🇦🇴 Angola</option>
                      <option value="Portugal">🇵🇹 Portugal</option>
                    </select>
                  </div>
                </div>

                {/* Contacto */}
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                    CONTACTO <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <span className="px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-slate-600 flex items-center justify-center shrink-0">
                      +258
                    </span>
                    <input
                      type="tel"
                      required
                      value={contacto}
                      onChange={(e) => setContacto(e.target.value)}
                      placeholder="841234567"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-900 transition-all"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                    E-MAIL <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-900 transition-all"
                    />
                  </div>
                </div>

                {/* Senha & Confirmar Senha */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                      SENHA <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3 top-3 text-slate-400" />
                      <input
                        type="password"
                        required
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-900 transition-all"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">Mínimo 8 caracteres</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                      CONFIRMAR SENHA <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3 top-3 text-slate-400" />
                      <input
                        type="password"
                        required
                        value={confirmarSenha}
                        onChange={(e) => setConfirmarSenha(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-900 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Código de Reseller */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                      CÓDIGO DE RESELLER
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">(opcional — 5 dígitos)</span>
                  </div>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      maxLength={5}
                      value={resellerCode}
                      onChange={(e) => setResellerCode(e.target.value)}
                      placeholder="00000"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-900 transition-all"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Se um reseller o indicou, insira o código de 5 dígitos para que a comissão recorrente lhe seja atribuída.
                  </p>
                </div>

                <p className="text-[11px] text-slate-400 text-center pt-2">
                  Os dados da empresa serão pedidos no próximo passo.
                </p>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-blue-900 hover:bg-blue-950 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-900/20 cursor-pointer"
                >
                  Criar Conta
                </button>

                <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                  Ao criar uma conta, concorda com os nossos{' '}
                  <a href="#" className="font-bold text-blue-900 hover:underline">Termos de Uso</a> e{' '}
                  <a href="#" className="font-bold text-blue-900 hover:underline">Política de Privacidade</a>.
                </p>

                <div className="text-center pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-500 font-medium">Já tem conta? </span>
                  <button
                    type="button"
                    onClick={onCancel}
                    className="text-xs font-extrabold text-blue-900 hover:underline cursor-pointer"
                  >
                    Entrar
                  </button>
                </div>
              </form>
            </motion.div>
          </main>

          {/* Full Footer (Images 2 & 3) */}
          <footer className="bg-[#0B1736] text-white pt-12 pb-8 border-t border-blue-950 mt-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
                
                {/* Column 1: Brand & Newsletter */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white text-base">
                      P
                    </div>
                    <div>
                      <span className="font-black text-sm tracking-tight block">PAYROLL TECH</span>
                      <span className="text-[9px] text-emerald-400 font-black uppercase tracking-widest block">MZ ERP</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed max-w-sm">
                    Gestão empresarial na cloud para empresas africanas. Organize e controle as suas operações com simplicidade.
                  </p>

                  <div className="space-y-2 pt-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                      SUBSCREVA A NOSSA NEWSLETTER
                    </p>
                    <div className="flex gap-2 max-w-sm">
                      <input
                        type="email"
                        placeholder="Seu e-mail"
                        className="bg-blue-950/80 border border-blue-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                      />
                      <button className="px-3.5 py-2 bg-white text-blue-900 hover:bg-slate-100 font-extrabold text-xs rounded-lg transition-colors cursor-pointer">
                        Subscrever
                      </button>
                    </div>
                  </div>
                </div>

                {/* Column 2: Produto */}
                <div className="space-y-2.5">
                  <p className="text-xs font-black uppercase tracking-widest text-blue-400">PRODUTO</p>
                  <ul className="space-y-1.5 text-xs text-slate-300 font-medium">
                    <li><a href="#" className="hover:text-white transition-colors">Financeiro</a></li>
                    <li><a href="#" className="hover:text-white transition-colors">Facturação</a></li>
                    <li><a href="#" className="hover:text-white transition-colors">Stock e Inventário</a></li>
                    <li><a href="#" className="hover:text-white transition-colors">Recursos Humanos</a></li>
                    <li><a href="#" className="hover:text-white transition-colors">CRM</a></li>
                    <li><a href="#" className="hover:text-white transition-colors">Projectos</a></li>
                    <li><a href="#" className="hover:text-white transition-colors">Knowledge Base</a></li>
                  </ul>
                </div>

                {/* Column 3: Soluções */}
                <div className="space-y-2.5">
                  <p className="text-xs font-black uppercase tracking-widest text-blue-400">SOLUÇÕES</p>
                  <ul className="space-y-1.5 text-xs text-slate-300 font-medium">
                    <li><a href="#" className="hover:text-white transition-colors">Sistema de Facturação</a></li>
                    <li><a href="#" className="hover:text-white transition-colors">Reseller Program</a></li>
                    <li><a href="#" className="hover:text-white transition-colors">Software Contabilidade</a></li>
                    <li><a href="#" className="hover:text-white transition-colors">ERP Clínicas</a></li>
                    <li><a href="#" className="hover:text-white transition-colors">ERP Construção</a></li>
                    <li><a href="#" className="hover:text-white transition-colors">ERP Maputo</a></li>
                    <li><a href="#" className="hover:text-white transition-colors">ERP Nampula</a></li>
                    <li><a href="#" className="hover:text-white transition-colors">Marcar Demo</a></li>
                    <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                  </ul>
                </div>

                {/* Column 4: Contacto */}
                <div className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-widest text-blue-400">CONTACTO</p>
                  
                  <div className="space-y-1 text-xs text-slate-300">
                    <p className="font-extrabold text-white flex items-center gap-1.5">
                      <span>🇲🇿</span> Moçambique
                    </p>
                    <p className="text-[11px] text-slate-400">Av. de Moçambique Nr. 1843, Maputo</p>
                    <p className="text-[11px] text-slate-400"><b className="text-slate-300">P:</b> (+258) 21 610 130 / 84 282 8400</p>
                    <p className="text-[11px] text-slate-400"><b className="text-slate-300">E:</b> info@payrolltech.mz</p>
                  </div>

                  <div className="space-y-1 text-xs text-slate-300 pt-1">
                    <p className="font-extrabold text-white flex items-center gap-1.5">
                      <span>🇿🇦</span> África do Sul
                    </p>
                    <p className="text-[11px] text-slate-400">90 Rivonia Road, 2nd Floor, Sandton, 2097</p>
                    <p className="text-[11px] text-slate-400"><b className="text-slate-300">P:</b> (+27) 63 595 7929</p>
                    <p className="text-[11px] text-slate-400"><b className="text-slate-300">E:</b> info@payrolltech.mz</p>
                  </div>

                  <div className="pt-1 text-[10px] text-slate-400">
                    <p className="font-bold text-slate-300 uppercase tracking-wide">HORÁRIO DE FUNCIONAMENTO</p>
                    <p>Seg – Sex: 08:00 – 17:00 | Sáb: 08:00 – 12:00</p>
                  </div>
                </div>

              </div>

              <div className="pt-6 border-t border-blue-900/60 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-400 gap-2">
                <p>© 2018 – 2026 Payroll Tech MZ. Todos os direitos reservados.</p>
                <div className="flex gap-4">
                  <a href="#" className="hover:text-white">Termos de Serviço</a>
                  <a href="#" className="hover:text-white">Privacidade</a>
                  <a href="#" className="hover:text-white">Suporte Técnico</a>
                </div>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* STAGE 2: 3-STEP ONBOARDING WIZARD (Images 1, 4, 5, 6, 7, 8) */}
      {stage === 'WIZARD' && (
        <main className="max-w-4xl mx-auto w-full px-4 py-8 flex-1">
          
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
                                const reader = new FileReader();
                                reader.onloadend = () => setLogoUrl(reader.result as string);
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
                      placeholder="Ex: Payroll Tech Lda"
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
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Escolha o seu Plano</h2>
                    <p className="text-xs text-slate-500">Seleccione o plano que melhor se adapta às suas necessidades.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Starter */}
                    <div
                      onClick={() => setSelectedPlan('Starter')}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                        selectedPlan === 'Starter'
                          ? 'border-blue-900 bg-blue-50/20 shadow-md'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-2">
                        <h3 className="text-sm font-extrabold text-slate-900">Starter</h3>
                        <div>
                          <span className="text-xl font-black text-slate-900">1 500,00 MT</span>
                          <span className="text-[10px] text-slate-400 font-bold">/mês</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-semibold">Até 2 utilizador(es)</p>

                        <ul className="space-y-2 pt-2 text-[11px] text-slate-600 font-medium">
                          <li className="flex items-start gap-1.5"><Check size={13} className="text-emerald-600 shrink-0 mt-0.5" /> 2 utilizadores</li>
                          <li className="flex items-start gap-1.5"><Check size={13} className="text-emerald-600 shrink-0 mt-0.5" /> Acesso completo a todas as funcionalidades</li>
                          <li className="flex items-start gap-1.5"><Check size={13} className="text-emerald-600 shrink-0 mt-0.5" /> Conformidade fiscal MZ/ZA</li>
                          <li className="flex items-start gap-1.5"><Check size={13} className="text-emerald-600 shrink-0 mt-0.5" /> Suporte por email</li>
                        </ul>
                      </div>
                    </div>

                    {/* Growth (RECOMENDADO) */}
                    <div
                      onClick={() => setSelectedPlan('Growth')}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 relative ${
                        selectedPlan === 'Growth'
                          ? 'border-blue-900 bg-blue-50/30 shadow-lg'
                          : 'border-amber-300 bg-amber-50/10 hover:border-amber-400'
                      }`}
                    >
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-xs tracking-wider">
                        RECOMENDADO
                      </span>

                      <div className="space-y-2">
                        <h3 className="text-sm font-extrabold text-slate-900">Growth</h3>
                        <div>
                          <span className="text-xl font-black text-slate-900">3 000,00 MT</span>
                          <span className="text-[10px] text-slate-400 font-bold">/mês</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-semibold">Até 4 utilizador(es)</p>

                        <ul className="space-y-2 pt-2 text-[11px] text-slate-600 font-medium">
                          <li className="flex items-start gap-1.5"><Check size={13} className="text-emerald-600 shrink-0 mt-0.5" /> Até 4 utilizadores</li>
                          <li className="flex items-start gap-1.5"><Check size={13} className="text-emerald-600 shrink-0 mt-0.5" /> Acesso completo a todas as funcionalidades</li>
                          <li className="flex items-start gap-1.5"><Check size={13} className="text-emerald-600 shrink-0 mt-0.5" /> Conformidade fiscal MZ/ZA</li>
                          <li className="flex items-start gap-1.5"><Check size={13} className="text-emerald-600 shrink-0 mt-0.5" /> Suporte prioritário</li>
                        </ul>
                      </div>
                    </div>

                    {/* Business */}
                    <div
                      onClick={() => setSelectedPlan('Business')}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                        selectedPlan === 'Business'
                          ? 'border-blue-900 bg-blue-50/20 shadow-md'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-2">
                        <h3 className="text-sm font-extrabold text-slate-900">Business</h3>
                        <div>
                          <span className="text-xl font-black text-slate-900">4 500,00 MT</span>
                          <span className="text-[10px] text-slate-400 font-bold">/mês</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-semibold">Até 6 utilizador(es)</p>

                        <ul className="space-y-2 pt-2 text-[11px] text-slate-600 font-medium">
                          <li className="flex items-start gap-1.5"><Check size={13} className="text-emerald-600 shrink-0 mt-0.5" /> Até 6 utilizadores</li>
                          <li className="flex items-start gap-1.5"><Check size={13} className="text-emerald-600 shrink-0 mt-0.5" /> Acesso completo a todas as funcionalidades</li>
                          <li className="flex items-start gap-1.5"><Check size={13} className="text-emerald-600 shrink-0 mt-0.5" /> Conformidade fiscal MZ/ZA</li>
                          <li className="flex items-start gap-1.5"><Check size={13} className="text-emerald-600 shrink-0 mt-0.5" /> Suporte prioritário</li>
                        </ul>
                      </div>
                    </div>

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
                    <p className="text-xs text-slate-500">Finalize a sua subscrição para começar a usar o Payroll Tech MZ ERP.</p>
                  </div>

                  {/* Summary Box */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">
                        PLANO SELECCIONADO
                      </span>
                      <span className="text-sm font-black text-slate-900">{selectedPlan}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">
                        TOTAL A PAGAR
                      </span>
                      <span className="text-base font-black text-blue-900">{getPlanPrice(selectedPlan as any)}</span>
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
                        placeholder="EX: PAYROLL2026"
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
                      onClick={() => setCurrentStep(3)}
                      className="px-6 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shadow-blue-900/15 cursor-pointer"
                    >
                      Finalizar e Activar Conta
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
                    placeholder="PRI"
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
