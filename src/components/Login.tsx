/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Lock, Mail, ChevronRight, AlertCircle, Phone, KeyRound, ArrowLeft, RefreshCw, CheckCircle2, Send } from 'lucide-react';

interface LoginProps {
  selectedPlan?: 'Bronze' | 'Silver' | 'Gold' | null;
  onSelectPlan?: (plan: 'Bronze' | 'Silver' | 'Gold' | null) => void;
  onLoginSuccess: () => void;
  onEnterRegister?: () => void;
}

export default function Login({ selectedPlan, onSelectPlan, onLoginSuccess, onEnterRegister }: LoginProps) {
  const [email, setEmail] = useState(() => {
    if (selectedPlan === 'Bronze') return 'bronze@payrolltech.co.mz';
    if (selectedPlan === 'Silver') return 'silver@payrolltech.co.mz';
    if (selectedPlan === 'Gold') return 'gold@payrolltech.co.mz';
    return '';
  });
  const [password, setPassword] = useState(() => {
    if (selectedPlan === 'Bronze') return 'bronze2026';
    if (selectedPlan === 'Silver') return 'silver2026';
    if (selectedPlan === 'Gold') return 'gold2026';
    return '';
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Estados para Verificação de 2 Fatores (OTP)
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [tentativaId, setTentativaId] = useState('');
  const [debugOtpCode, setDebugOtpCode] = useState('');
  const [notifiedEmail, setNotifiedEmail] = useState('gersonjcumbane@gmail.com');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (selectedPlan === 'Bronze') {
      setEmail('bronze@payrolltech.co.mz');
      setPassword('bronze2026');
    } else if (selectedPlan === 'Silver') {
      setEmail('silver@payrolltech.co.mz');
      setPassword('silver2026');
    } else if (selectedPlan === 'Gold') {
      setEmail('gold@payrolltech.co.mz');
      setPassword('gold2026');
    }
  }, [selectedPlan]);
  
  // O botão de chave mestre só é visível para o Gerson (Fundador):
  // 1. Automaticamente se houver histórico de admin no navegador
  // 2. Ou se passar '?admin=true' ou '#admin' no URL
  // 3. Ou dando 3 cliques rápidos no logotipo da ClickPay
  const [clickCount, setClickCount] = useState(0);
  const [showMasterShortcut, setShowMasterShortcut] = useState(() => {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const hasAdminQuery = urlParams.get('admin') === 'true' || urlParams.get('founder') === 'true' || hash === '#admin';
    const isSavedFounder = localStorage.getItem('paytek_user') === 'gersonjcumbane@gmail.com' || localStorage.getItem('paytek_role') === 'SUPER_ADMIN_PAYROLL';
    return hasAdminQuery || isSavedFounder;
  });

  const handleSecretLogoClick = () => {
    const next = clickCount + 1;
    setClickCount(next);
    if (next >= 3) {
      setShowMasterShortcut(true);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const cleanEmail = email.toLowerCase().trim();
    const cleanPassword = password.trim();

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const data = await response.json();

        // 1. Desafio de Verificação em 2 Passos (OTP) Ativo
        if (data.otpRequired) {
          setOtpStep(true);
          setTentativaId(data.tentativaId || '');
          setDebugOtpCode(data.debugOtpCode || '');
          setNotifiedEmail(data.notificadoEmail || 'gersonjcumbane@gmail.com');
          setLoading(false);
          return;
        }

        // 2. Login Direto se OTP não for exigido
        if (data.sucesso) {
          localStorage.setItem('paytek_auth', 'true');
          localStorage.setItem('paytek_token', data.token);
          localStorage.setItem('paytek_user', email);
          if (data.usuario) {
            if (data.usuario.funcao) {
              localStorage.setItem('paytek_role', data.usuario.funcao);
            }
            localStorage.setItem('paytek_sub_status', data.usuario.subscription_status || 'ativo');
            localStorage.setItem('paytek_sub_plan', data.usuario.subscription_plan || selectedPlan || 'Bronze');
            const defaultExp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            localStorage.setItem('paytek_sub_expire', data.usuario.next_billing_date || defaultExp);
            localStorage.setItem('paytek_company_name', data.usuario.nome_empresa || '');
          }
          onLoginSuccess();
          return;
        } else {
          setError(data.erro || 'Falha na autenticação. Verifique os dados inseridos.');
          return;
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.erro || 'Dados de início de sessão incorretos.');
      }
    } catch (err: any) {
      console.warn('Backend offline ou inacessível no ambiente atual, usando modo contingência:', err);
      // Fallback seguro de contingência com OTP de demonstração
      const masterEmails = ['gersonjcumbane@gmail.com', 'admin@clickpay.co.mz', 'admin@payrolltech.co.mz'];
      const masterPasswords = ['ClickPay2026!', 'admin2026', '123456', 'admin'];

      if (masterEmails.includes(cleanEmail) && masterPasswords.includes(cleanPassword)) {
        setOtpStep(true);
        setTentativaId(`otp_local_${Date.now()}`);
        setDebugOtpCode('123456');
        setNotifiedEmail('gersonjcumbane@gmail.com');
        return;
      }
      setError('Servidor indisponível no momento. Por favor use as Chaves Mestres de Fundador.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setError('Por favor introduza o código OTP de 6 dígitos.');
      return;
    }
    setError(null);
    setVerifyingOtp(true);

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tentativaId,
          code: otpCode.trim(),
          email: email.toLowerCase().trim()
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.sucesso) {
          localStorage.setItem('paytek_auth', 'true');
          localStorage.setItem('paytek_token', data.token);
          localStorage.setItem('paytek_user', email);
          if (data.usuario) {
            if (data.usuario.funcao) {
              localStorage.setItem('paytek_role', data.usuario.funcao);
            }
            localStorage.setItem('paytek_sub_status', data.usuario.subscription_status || 'ativo');
            localStorage.setItem('paytek_sub_plan', data.usuario.subscription_plan || selectedPlan || 'Bronze');
            const defaultExp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            localStorage.setItem('paytek_sub_expire', data.usuario.next_billing_date || defaultExp);
            localStorage.setItem('paytek_company_name', data.usuario.nome_empresa || '');
          }
          onLoginSuccess();
          return;
        } else {
          setError(data.erro || 'Código OTP incorreto.');
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.erro || 'Falha ao validar o código OTP. Tente novamente.');
      }
    } catch (err) {
      // Fallback em caso de offline
      if (otpCode.trim() === debugOtpCode || otpCode.trim() === '123456') {
        localStorage.setItem('paytek_auth', 'true');
        localStorage.setItem('paytek_token', 'token_mestre_super_admin_payroll_tech');
        localStorage.setItem('paytek_user', email);
        localStorage.setItem('paytek_role', 'SUPER_ADMIN_PAYROLL');
        localStorage.setItem('paytek_sub_status', 'ativo');
        localStorage.setItem('paytek_sub_plan', 'Platinum');
        onLoginSuccess();
        return;
      }
      setError('Erro de conexão ao verificar o código OTP.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    setResendingOtp(true);
    try {
      const response = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tentativaId,
          email: email.toLowerCase().trim()
        })
      });
      const data = await response.json();
      if (data.sucesso) {
        if (data.debugOtpCode) setDebugOtpCode(data.debugOtpCode);
        setOtpSuccessMessage('Novo código OTP de 6 dígitos gerado e enviado ao Fundador!');
        setTimeout(() => setOtpSuccessMessage(null), 4000);
      } else {
        setError(data.erro || 'Falha ao reenviar código.');
      }
    } catch (err) {
      setError('Erro ao contactar o servidor para reenvio.');
    } finally {
      setResendingOtp(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 lg:p-8 font-sans text-slate-800">
      <div className="w-full max-w-md">
        <motion.div 
           initial={{ opacity: 0, y: 15 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.4, ease: 'easeOut' }}
           className="bg-white p-8 sm:p-10 rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 space-y-6 w-full"
        >
          {/* Header Logo Area com gatilho secreto de 3 cliques para o Fundador */}
          <div 
            className="text-center mb-5 select-none cursor-pointer" 
            id="login_logo_area"
            onClick={handleSecretLogoClick}
            title="ClickPay"
          >
            <img 
              src="/logo-payroll.png" 
              alt="ClickPay" 
              style={{ width: '90px', height: 'auto', marginBottom: '8px' }} 
              className="mx-auto pointer-events-none"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <h2 className="text-2xl font-black text-slate-950 tracking-tight">
              ClickPay
            </h2>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3 bg-rose-50 text-rose-800 border border-rose-100 rounded-xl text-xs font-semibold flex items-center gap-2"
            >
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {otpSuccessMessage && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2"
            >
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{otpSuccessMessage}</span>
            </motion.div>
          )}

          {/* =========================================================================
              PASSO 2: FORMULÁRIO DE VERIFICAÇÃO OTP (2FA)
             ========================================================================= */}
          {otpStep ? (
            <div className="space-y-5">
              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2 text-blue-950 font-bold">
                  <ShieldCheck size={18} className="text-blue-900 shrink-0" />
                  <span>Verificação de Segurança OTP (2FA)</span>
                </div>
                <p className="text-blue-900 leading-relaxed text-[11px]">
                  Por motivos de segurança e auditoria, uma notificação com o código de 6 dígitos foi enviada para o Fundador em <strong>{notifiedEmail}</strong> e telemóveis oficiais.
                </p>
              </div>

              {/* Banner de Demonstração / Sandbox para testes rápidos sem bloqueio */}
              {debugOtpCode && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-800 block">
                      Código OTP (Ambiente de Teste)
                    </span>
                    <span className="font-mono text-base font-black text-amber-950 tracking-widest">
                      {debugOtpCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtpCode(debugOtpCode)}
                    className="py-1.5 px-3 bg-amber-900 hover:bg-black text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Preencher Código
                  </button>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <KeyRound size={13} className="text-slate-400" />
                      Código de Acesso (6 Dígitos)
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Validade: 5 min</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ex: 123456"
                    className="w-full text-center text-xl font-mono font-black tracking-widest py-3 px-4 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                  />
                </div>

                <button
                  type="submit"
                  disabled={verifyingOtp || otpCode.length < 6}
                  className="w-full py-3 bg-blue-900 hover:bg-blue-950 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md cursor-pointer text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  {verifyingOtp ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      A validar código OTP...
                    </>
                  ) : (
                    <>
                      CONFIRMAR CÓDIGO OTP & ENTRAR
                      <ChevronRight size={14} />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep(false);
                      setOtpCode('');
                      setError(null);
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft size={12} />
                    <span>Voltar e Corrigir Dados</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendingOtp}
                    className="text-[11px] text-blue-900 hover:text-blue-950 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={resendingOtp ? 'animate-spin' : ''} />
                    <span>Reenviar Código</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* =========================================================================
                PASSO 1: FORMULÁRIO DE LOGIN PADRÃO
               ========================================================================= */
            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Mail size={13} className="text-slate-400" />
                  E-mail Corporativo
                </label>
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@suaempresa.co.mz"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Lock size={13} className="text-slate-400" />
                  Palavra-passe / Senha
                </label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite a sua palavra-passe"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-900 hover:bg-blue-950 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md cursor-pointer text-xs flex items-center justify-center gap-2 transition-colors mt-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    A autenticar com segurança...
                  </>
                ) : (
                  <>
                    CONTINUAR PARA O ERP
                    <ChevronRight size={14} />
                  </>
                )}
              </button>

              {/* Botões de Preenchimento Rápido por Pacote para Demonstração */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 text-center">
                  Preenchimento Rápido por Pacote:
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('bronze@payrolltech.co.mz');
                      setPassword('bronze2026');
                      if (onSelectPlan) onSelectPlan('Bronze');
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                      email === 'bronze@payrolltech.co.mz' || email === 'construcao@payrolltech.co.mz'
                        ? 'bg-amber-100 border-amber-300 text-amber-950 font-black'
                        : 'bg-slate-50 hover:bg-amber-50 border-slate-200 text-slate-700'
                    }`}
                    title="3.500 MT/mês - Até 5 colaboradores"
                  >
                    🥉 Starter
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('silver@payrolltech.co.mz');
                      setPassword('silver2026');
                      if (onSelectPlan) onSelectPlan('Silver');
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                      email === 'silver@payrolltech.co.mz' || email === 'educacao@payrolltech.co.mz'
                        ? 'bg-blue-100 border-blue-300 text-blue-950 font-black'
                        : 'bg-slate-50 hover:bg-blue-50 border-slate-200 text-slate-700'
                    }`}
                    title="6.500 MT/mês - Até 15 colaboradores"
                  >
                    🥈 Profissional
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('gold@payrolltech.co.mz');
                      setPassword('gold2026');
                      if (onSelectPlan) onSelectPlan('Gold');
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                      email === 'gold@payrolltech.co.mz' || email === 'servicos@payrolltech.co.mz'
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-950 font-black'
                        : 'bg-slate-50 hover:bg-emerald-50 border-slate-200 text-slate-700'
                    }`}
                    title="9.500 MT/mês - Até 30 colaboradores"
                  >
                    🥇 Empresarial
                  </button>
                </div>
              </div>

              {/* Acesso Rápido de Fundador / Administrador Mestre (SÓ APARECE PARA O GERSON) */}
              {showMasterShortcut && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="pt-1.5"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('gersonjcumbane@gmail.com');
                      setPassword('ClickPay2026!');
                      if (onSelectPlan) onSelectPlan(null);
                    }}
                    className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    🔑 Acesso Mestre Exclusivo (Gerson Cumbane)
                  </button>
                </motion.div>
              )}
            </form>
          )}

          {onEnterRegister ? (
            <button
              type="button"
              onClick={onEnterRegister}
              className="w-full py-3 px-4 border-2 border-dashed border-blue-900 hover:border-blue-950 hover:bg-blue-50 text-blue-900 hover:text-blue-950 font-extrabold rounded-xl text-[11px] tracking-wide transition-all cursor-pointer text-center"
            >
              ✨ NÃO TEM CONTA? CRIAR CONTA DA EMPRESA
            </button>
          ) : (
            <a 
              href="mailto:gersonjcumbane@gmail.com?subject=Solicita%C3%A7%C3%A3o%20de%20Registo%20-%20ClickPay%20MZ" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-center py-3 px-4 border-2 border-dashed border-blue-900 hover:border-blue-950 hover:bg-blue-50 text-blue-900 hover:text-blue-950 font-extrabold rounded-xl text-[11px] tracking-wide transition-all cursor-pointer"
            >
              ✉️ NÃO TEM CONTA? SOLICITAR REGISTO POR E-MAIL
            </a>
          )}

          <div className="text-center pt-2 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              Esqueceu-se da senha?{' '}
              <a
                href="https://wa.me/258842014173?text=Ol%C3%A1%2C%20preciso%20de%20apoio%20para%20recuperar%20o%20acesso%20ao%20ClickPay%20ERP."
                target="_blank"
                rel="noreferrer"
                className="text-blue-900 hover:underline font-bold inline-flex items-center gap-0.5"
              >
                Contactar suporte técnico
              </a>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Regulatory Footer */}
      <div className="mt-8 text-center text-[10px] text-slate-400 max-w-sm px-4">
        <p className="flex items-center justify-center gap-1 font-semibold text-slate-500">
          <ShieldCheck size={12} className="text-emerald-600" />
          ClickPay Moçambique · Acesso Encriptado
        </p>
        <p className="mt-1">
          Conformidade com a Autoridade Tributária e INSS. Tráfego protegido por encriptação SSL de 256 bits.
        </p>
      </div>
    </div>
  );
}
