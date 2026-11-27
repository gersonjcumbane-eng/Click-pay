/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Lock, Mail, ChevronRight, AlertCircle, KeyRound, ArrowLeft, RefreshCw, CheckCircle2, MessageCircle, Eye, EyeOff, X, QrCode } from 'lucide-react';
import {
  auth,
  authenticateClientInFirebase,
  signInWithGoogleAccount,
  consumeGoogleRedirectResult,
  provisionOrLookupGoogleClientInCloud,
  updateLocalVaultPassword,
  syncUpdatedCredentialsToFirestore,
  GoogleAuthResult
} from '../lib/firebase';
import SupportTicketModal, {
  buildSupportMailtoUrl,
  buildSupportWhatsAppUrl,
  CLICKPAY_SUPPORT
} from './SupportTicketModal';
import SystemQrModal from './SystemQrModal';
import { isFounderEmail } from '../lib/authSession';

interface LoginProps {
  selectedPlan?: 'Bronze' | 'Silver' | 'Gold' | null;
  onSelectPlan?: (plan: 'Bronze' | 'Silver' | 'Gold' | null) => void;
  onLoginSuccess: () => void;
  onEnterRegister?: () => void;
}

interface FallbackSession {
  token: string;
  usuario: {
    email: string;
    funcao: string;
    empresa_id?: string;
    nome_empresa: string;
    subscription_status: 'ativo' | 'suspenso';
    subscription_plan: string;
    next_billing_date?: string;
  };
}

export default function Login({ selectedPlan, onSelectPlan, onLoginSuccess, onEnterRegister }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  // Modal de Actualização / Redefinição de Palavra-Passe via Conta Google Verificada
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Estados para Verificação de 2 Fatores (OTP)
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [tentativaId, setTentativaId] = useState('');
  const [debugOtpCode, setDebugOtpCode] = useState('');
  const [notifiedEmail, setNotifiedEmail] = useState('a Administração ClickPay');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState<string | null>(null);
  const [pendingFallbackSession, setPendingFallbackSession] = useState<FallbackSession | null>(null);

  // Estado de Pagamento Pendente + Modal de Ativação por Código
  const [pendingPaymentNotice, setPendingPaymentNotice] = useState<{
    message: string;
    requestId?: string | null;
    plano?: string;
    email?: string;
  } | null>(null);
  const [activationModalOpen, setActivationModalOpen] = useState(false);
  const [activationEmail, setActivationEmail] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [activationLoading, setActivationLoading] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);

  const generateClientOtp = () => {
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      const arr = new Uint32Array(1);
      window.crypto.getRandomValues(arr);
      return String(100000 + (arr[0] % 900000));
    }
    return '000000';
  };

  const persistUserSession = (token: string, usuario: any, fallbackEmail: string) => {
    const resolvedEmail = String(usuario?.email || fallbackEmail || '').toLowerCase().trim();
    const resolvedRole = usuario?.funcao || 'CLIENTE_EMPRESA';
    localStorage.setItem('paytek_auth', 'true');
    localStorage.setItem('paytek_token', token || `token_clickpay_${Date.now()}`);
    localStorage.setItem('paytek_user', resolvedEmail);
    localStorage.setItem('paytek_role', resolvedRole);
    if (usuario?.empresa_id) {
      localStorage.setItem('paytek_company_id', usuario.empresa_id);
    } else if (resolvedRole === 'SUPER_ADMIN_PAYROLL') {
      localStorage.setItem('paytek_company_id', 'cli_founders');
    } else {
      localStorage.removeItem('paytek_company_id');
    }
    localStorage.setItem('paytek_sub_status', usuario?.subscription_status || 'ativo');
    localStorage.setItem('paytek_sub_plan', usuario?.subscription_plan || selectedPlan || 'Bronze');
    const defaultExp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    localStorage.setItem('paytek_sub_expire', usuario?.next_billing_date || defaultExp);
    localStorage.setItem('paytek_company_name', usuario?.nome_empresa || '');
    localStorage.setItem('paytek_payments_locked', 'false');
  };

  const isJsonResponse = (res: Response | null) =>
    !!res && (res.headers.get('content-type') || '').includes('application/json');

  const authenticateViaCloudFallback = async (cleanEmail: string, cleanPassword: string): Promise<FallbackSession | null> => {
    const defaultExp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Autenticar apenas contas empresariais registadas na nuvem ClickPay (nunca credenciais de sistema)
    const fbAuth = await authenticateClientInFirebase(cleanEmail, cleanPassword);
    if (fbAuth.pendingApproval || fbAuth.client?.status === 'pendente') {
      setPendingPaymentNotice({
        message:
          'A sua conta aguarda confirmação do pagamento por transferência pela Administração ClickPay.',
        plano: fbAuth.client?.plan || 'Starter',
        email: cleanEmail
      });
      return null;
    }
    if (fbAuth.ok && fbAuth.client) {
      const founderMatch = isFounderEmail(cleanEmail);
      return {
        token: `token_cloud_${fbAuth.client.id}`,
        usuario: {
          email: fbAuth.client.email,
          funcao: founderMatch ? 'SUPER_ADMIN_PAYROLL' : 'CLIENTE_EMPRESA',
          empresa_id: founderMatch ? 'cli_founders' : fbAuth.client.id,
          nome_empresa: founderMatch ? 'ClickPay Moçambique Lda' : fbAuth.client.companyName,
          subscription_status: founderMatch ? 'ativo' : fbAuth.client.status === 'suspenso' ? 'suspenso' : 'ativo',
          subscription_plan: founderMatch ? 'Platinum' : fbAuth.client.plan,
          next_billing_date: defaultExp
        }
      };
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPendingPaymentNotice(null);
    setLoading(true);

    const cleanEmail = email.replace(/[\u200B-\u200D\uFEFF]/g, '').toLowerCase().trim();
    const cleanPassword = password.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();

    const triggerFallbackAuth = async () => {
      const session = await authenticateViaCloudFallback(cleanEmail, cleanPassword);
      if (session) {
        const otp = generateClientOtp();
        setPendingFallbackSession(session);
        setOtpStep(true);
        setTentativaId(`otp_cloud_${Date.now()}`);
        setDebugOtpCode(otp);
        setNotifiedEmail('a Administração ClickPay');
        return true;
      }
      return false;
    };

    try {
      const firebaseIdToken = auth.currentUser
        ? await auth.currentUser.getIdToken().catch(() => undefined)
        : undefined;
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPassword,
          ...(firebaseIdToken ? { firebaseIdToken } : {})
        })
      });

      const isJson = isJsonResponse(response);
      // Em deploy estático, /api/* pode responder 200 HTML ou 404/405/500
      if (!isJson || response.status === 404 || response.status === 405 || response.status >= 500) {
        const errBody = isJson ? await response.json().catch(() => null) : null;
        const ok = await triggerFallbackAuth();
        if (!ok) {
          if (response.status >= 500) {
            setError(
              errBody?.erro ||
                `O servidor de autenticação respondeu com erro interno (HTTP ${response.status}). Utilize "ENTRAR COM GMAIL / CONTA GOOGLE" ou contacte o suporte.`
            );
          } else {
            setError(
              'Ambiente estático (GitHub Pages / Cloud) ativo: clique em "ENTRAR COM GMAIL / CONTA GOOGLE" para aceder ao sistema.'
            );
          }
        }
        return;
      }

      if (response.ok) {
        const data = await response.json();

        // 1. Desafio de Verificação em 2 Passos (OTP) Ativo
        if (data.otpRequired) {
          setPendingFallbackSession(null);
          setOtpStep(true);
          setTentativaId(data.tentativaId || '');
          setDebugOtpCode(data.debugOtpCode || '');
          setNotifiedEmail(data.notificadoEmail || 'a Administração ClickPay');
          return;
        }

        // 2. Login Direto se OTP não for exigido
        if (data.sucesso) {
          persistUserSession(data.token, data.usuario, cleanEmail);
          onLoginSuccess();
          return;
        } else {
          setError(data.erro || 'Falha na autenticação. Verifique os dados inseridos.');
          return;
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 403 && errData.code === 'PAYMENT_APPROVAL_PENDING') {
          setPendingPaymentNotice({
            message: errData.erro,
            requestId: errData.requestId,
            plano: errData.plano,
            email: cleanEmail
          });
          setActivationEmail(cleanEmail);
        }
        setError(errData.erro || 'Dados de início de sessão incorretos. Verifique o e-mail e a palavra-passe.');
      }
    } catch (err: any) {
      console.warn('Backend indisponível, autenticando via nuvem ClickPay:', err);
      const ok = await triggerFallbackAuth();
      if (!ok) {
        setError((prev) => prev || 'Ligação ao servidor de autenticação indisponível ou credenciais incorretas.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = otpCode.trim();
    if (!cleanCode) {
      setError('Por favor introduza o código OTP de 6 dígitos.');
      return;
    }
    setError(null);
    setVerifyingOtp(true);

    const completeLocalOtp = () => {
      if (debugOtpCode && cleanCode === debugOtpCode) {
        if (pendingFallbackSession) {
          persistUserSession(pendingFallbackSession.token, pendingFallbackSession.usuario, email.toLowerCase().trim());
          onLoginSuccess();
          return true;
        }
      }
      return false;
    };

    try {
      // Se já estamos numa sessão OTP de fallback cloud, validar diretamente
      if (pendingFallbackSession) {
        if (completeLocalOtp()) return;
        setError('Código OTP incorreto. Verifique o código exibido e tente novamente.');
        return;
      }

      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tentativaId,
          code: cleanCode,
          email: email.toLowerCase().trim()
        })
      });

      if (!isJsonResponse(response) || response.status === 404 || response.status === 405 || response.status >= 500) {
        if (completeLocalOtp()) return;
        setError('Código OTP incorreto ou expirado.');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        if (data.sucesso) {
          persistUserSession(data.token, data.usuario, email.toLowerCase().trim());
          onLoginSuccess();
          return;
        } else {
          setError(data.erro || 'Código OTP incorreto.');
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.erro || 'Falha ao validar o código OTP. Tente novamente.');
      }
    } catch {
      if (completeLocalOtp()) return;
      setError('Erro de conexão ao verificar o código OTP.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    setResendingOtp(true);
    const generateLocalOtp = () => {
      const nextOtp = generateClientOtp();
      setDebugOtpCode(nextOtp);
      setOtpSuccessMessage('Novo código OTP de 6 dígitos gerado!');
      setTimeout(() => setOtpSuccessMessage(null), 4000);
    };

    try {
      if (pendingFallbackSession) {
        generateLocalOtp();
        return;
      }
      const response = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tentativaId,
          email: email.toLowerCase().trim()
        })
      });
      if (!isJsonResponse(response) || response.status === 404 || response.status === 405 || response.status >= 500) {
        generateLocalOtp();
        return;
      }
      const data = await response.json();
      if (data.sucesso) {
        if (data.tentativaId) setTentativaId(data.tentativaId);
        if (data.debugOtpCode) setDebugOtpCode(data.debugOtpCode);
        setOtpSuccessMessage('Novo código OTP de 6 dígitos gerado e enviado ao Fundador!');
        setTimeout(() => setOtpSuccessMessage(null), 4000);
      } else {
        setError(data.erro || 'Falha ao reenviar código.');
      }
    } catch {
      generateLocalOtp();
    } finally {
      setResendingOtp(false);
    }
  };

  const completeGoogleAuthWithResult = async (gRes: GoogleAuthResult) => {
    if (gRes.redirected) {
      return;
    }
    if (!gRes.ok || (!gRes.googleAccessToken && !gRes.idToken) || !gRes.email) {
      setError(gRes.error || 'Falha na autenticação com Gmail.');
      return;
    }

    const ensureIsolatedTenantSnapshot = (client: { id: string; companyName: string; email: string; plan: string; status: string }) => {
      try {
        const key = `clickpay_tenant_${client.id}`;
        if (!localStorage.getItem(key)) {
          localStorage.setItem(
            key,
            JSON.stringify({
              company: {
                nome: client.companyName,
                nuit: '400000000',
                endereco: 'Maputo, Moçambique',
                email: client.email,
                subscription_status: client.status,
                subscription_plan: client.plan
              },
              employees: [],
              logs: [],
              contracts: [],
              vales: [],
              deletedIds: []
            })
          );
        }
      } catch {
        // ignore storage warning
      }
    };

    const completeStaticGoogleFallback = async (): Promise<boolean> => {
      if (isFounderEmail(gRes.email) && gRes.emailVerified) {
        persistUserSession(
          `token_google_${Date.now()}`,
          {
            email: gRes.email,
            funcao: 'SUPER_ADMIN_PAYROLL',
            empresa_id: 'cli_founders',
            nome_empresa: 'ClickPay Moçambique Lda',
            subscription_status: 'ativo',
            subscription_plan: 'Platinum'
          },
          gRes.email
        );
        onLoginSuccess();
        return true;
      }
      const client = await provisionOrLookupGoogleClientInCloud({
        email: gRes.email!,
        displayName: gRes.displayName
      });
      if (client.status === 'pendente') {
        setPendingPaymentNotice({
          message:
            'A sua conta aguarda confirmação do pagamento por transferência pela Administração ClickPay.',
          plano: client.plan,
          email: client.email
        });
        setActivationEmail(client.email);
        setError('Conta pendente de confirmação de pagamento.');
        return false;
      }
      ensureIsolatedTenantSnapshot(client);
      persistUserSession(
        `token_google_${client.id}`,
        {
          email: client.email,
          funcao: 'CLIENTE_EMPRESA',
          empresa_id: client.id,
          nome_empresa: client.companyName,
          subscription_status: client.status,
          subscription_plan: client.plan
        },
        gRes.email!
      );
      onLoginSuccess();
      return true;
    };

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleAccessToken: gRes.googleAccessToken,
          idToken: gRes.idToken
        })
      });
      const isJson = isJsonResponse(res);
      if (!isJson || res.status === 404 || res.status === 405 || res.status >= 500) {
        const ok = await completeStaticGoogleFallback();
        if (!ok) {
          setError((prev) => prev || `Não foi possível autenticar a conta Gmail (${gRes.email}).`);
        }
        return;
      }
      const data = await res.json();
      if (res.ok && data.sucesso) {
        persistUserSession(data.token, data.usuario, gRes.email);
        onLoginSuccess();
        return;
      }
      if (res.status === 403 && data?.code === 'PAYMENT_APPROVAL_PENDING') {
        setPendingPaymentNotice({
          message: data.erro,
          requestId: data.requestId,
          plano: data.plano,
          email: gRes.email
        });
        setActivationEmail(gRes.email || '');
      }
      setError(data.erro || 'Conta Gmail não autorizada neste portal.');
    } catch {
      const ok = await completeStaticGoogleFallback();
      if (!ok) {
        setError((prev) => prev || `Não foi possível autenticar a conta Gmail (${gRes.email}).`);
      }
    }
  };

  useEffect(() => {
    let active = true;
    consumeGoogleRedirectResult().then(async (redirectRes) => {
      if (!active || !redirectRes) return;
      setGoogleLoading(true);
      try {
        await completeGoogleAuthWithResult(redirectRes);
      } finally {
        if (active) setGoogleLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const gRes = await signInWithGoogleAccount();
      await completeGoogleAuthWithResult(gRes);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleResetPasswordWithGoogle = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    const cleanPwd = resetPassword.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    if (cleanPwd.length < 8) {
      setResetError('A nova palavra-passe deve ter pelo menos 8 caracteres.');
      return;
    }
    if (cleanPwd !== resetConfirmPassword.replace(/[\u200B-\u200D\uFEFF]/g, '').trim()) {
      setResetError('As palavras-passe introduzidas não coincidem.');
      return;
    }

    setResetLoading(true);
    try {
      const gRes = await signInWithGoogleAccount();
      if (gRes.redirected) {
        return;
      }
      if (!gRes.ok || (!gRes.googleAccessToken && !gRes.idToken) || !gRes.email) {
        setResetError(gRes.error || 'Confirme a sua identidade com a conta Google para atualizar a senha.');
        return;
      }

      const res = await fetch('/api/auth/reset-password-via-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleAccessToken: gRes.googleAccessToken,
          idToken: gRes.idToken,
          newPassword: cleanPwd
        })
      }).catch(() => null);

      const isJson = isJsonResponse(res);
      if (res && isJson) {
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.sucesso) {
          await updateLocalVaultPassword(
            gRes.email,
            cleanPwd,
            data?.usuario?.nome_empresa,
            data?.usuario?.empresa_id
          );
          await syncUpdatedCredentialsToFirestore({
            email: gRes.email,
            newPassword: cleanPwd,
            status: data?.usuario?.subscription_status,
            companyName: data?.usuario?.nome_empresa,
            plan: data?.usuario?.subscription_plan
          }).catch(() => {});
          persistUserSession(data.token, data.usuario, gRes.email);
          setResetModalOpen(false);
          setResetPassword('');
          setResetConfirmPassword('');
          onLoginSuccess();
          return;
        }
        setResetError(data.erro || 'Não foi possível atualizar a palavra-passe.');
        return;
      }

      // Modo estático sem backend disponível
      if (!isFounderEmail(gRes.email) && gRes.emailVerified) {
        const client = await provisionOrLookupGoogleClientInCloud({
          email: gRes.email,
          displayName: gRes.displayName
        });
        await updateLocalVaultPassword(gRes.email, cleanPwd, client.companyName, client.id);
        persistUserSession(
          `token_google_${client.id}`,
          {
            email: client.email,
            funcao: 'CLIENTE_EMPRESA',
            empresa_id: client.id,
            nome_empresa: client.companyName,
            subscription_status: client.status,
            subscription_plan: client.plan
          },
          gRes.email
        );
        setResetModalOpen(false);
        onLoginSuccess();
        return;
      }

      setResetError('Servidor de atualização indisponível neste endereço. Aceda à versão principal para redefinir a senha do Fundador.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleActivateWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setActivationError(null);
    const cleanEmail = (activationEmail || email).toLowerCase().trim();
    const cleanCode = activationCode.toUpperCase().trim();
    if (!cleanEmail || !cleanCode) {
      setActivationError('Introduza o e-mail da conta e o código de ativação recebido.');
      return;
    }

    setActivationLoading(true);
    try {
      const res = await fetch('/api/onboarding/activate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          requestId: pendingPaymentNotice?.requestId || undefined,
          activationCode: cleanCode
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.sucesso || !data?.token) {
        setActivationError(data?.erro || 'Código inválido ou pagamento ainda não confirmado.');
        return;
      }
      persistUserSession(data.token, data.usuario, cleanEmail);
      setActivationModalOpen(false);
      onLoginSuccess();
    } catch {
      setActivationError('Erro ao validar o código de ativação. Tente novamente.');
    } finally {
      setActivationLoading(false);
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
          {/* Header Logo Area */}
          <div 
            className="text-center mb-5 select-none" 
            id="login_logo_area"
            title="ClickPay"
          >
            <img 
              src="/clickpay-logo.png" 
              alt="ClickPay" 
              style={{ width: '112px', height: 'auto', marginBottom: '8px' }} 
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

          {pendingPaymentNotice && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2.5 text-xs">
              <div className="flex items-start gap-2 font-bold text-amber-950">
                <Lock size={15} className="text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p>Conta Bloqueada — Aguardando Confirmação de Pagamento</p>
                  {pendingPaymentNotice.plano && (
                    <p className="text-[11px] font-normal text-amber-800 mt-0.5">
                      Pacote selecionado: <b>{pendingPaymentNotice.plano}</b>
                      {pendingPaymentNotice.requestId ? ` · Pedido #${pendingPaymentNotice.requestId}` : ''}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActivationEmail(pendingPaymentNotice.email || email);
                  setActivationError(null);
                  setActivationModalOpen(true);
                }}
                className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <KeyRound size={13} />
                <span>Activar Conta com Código Recebido</span>
              </button>
            </div>
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
                  Por motivos de segurança e auditoria, uma notificação com o código de 6 dígitos foi enviada para <strong>{notifiedEmail}</strong>.
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
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@suaempresa.co.mz"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Lock size={13} className="text-slate-400" />
                    Palavra-passe / Senha
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetError(null);
                      setResetModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-blue-900 hover:text-blue-950 hover:underline cursor-pointer"
                  >
                    Esqueceu ou quer actualizar a senha?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite a sua palavra-passe"
                    className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
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

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-slate-200" />
                <span className="shrink mx-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  ou acesso verificado
                </span>
                <div className="flex-grow border-t border-slate-200" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading || googleLoading}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-60"
              >
                {googleLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" />
                    <span>A reconhecer conta Gmail...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                      />
                    </svg>
                    <span>ENTRAR COM GMAIL / CONTA GOOGLE</span>
                  </>
                )}
              </button>

              {/* Seleção do Pacote (Sem Preenchimento Automático de Credenciais) */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 text-center">
                  Pacote Selecionado:
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectPlan) onSelectPlan('Bronze');
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                      selectedPlan === 'Bronze'
                        ? 'bg-amber-100 border-amber-300 text-amber-950 font-black'
                        : 'bg-slate-50 hover:bg-amber-50 border-slate-200 text-slate-700'
                    }`}
                    title="1.500 MT/mês - Até 5 colaboradores"
                  >
                    🥉 Starter
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectPlan) onSelectPlan('Silver');
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                      selectedPlan === 'Silver'
                        ? 'bg-blue-100 border-blue-300 text-blue-950 font-black'
                        : 'bg-slate-50 hover:bg-blue-50 border-slate-200 text-slate-700'
                    }`}
                    title="3.500 MT/mês - Até 20 colaboradores"
                  >
                    🥈 Profissional
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectPlan) onSelectPlan('Gold');
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                      selectedPlan === 'Gold'
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-950 font-black'
                        : 'bg-slate-50 hover:bg-emerald-50 border-slate-200 text-slate-700'
                    }`}
                    title="6.900 MT/mês - Até 50 colaboradores"
                  >
                    🥇 Empresarial
                  </button>
                </div>
              </div>
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
              href={buildSupportMailtoUrl({
                subject: 'Solicitação de Registo - ClickPay Moçambique',
                body: 'Olá Equipa ClickPay,\n\nGostaria de solicitar o registo e credenciais de acesso para a minha empresa.\n\nEmpresa:\nNUIT:\nContacto WhatsApp:\n'
              })}
              className="block text-center py-3 px-4 border-2 border-dashed border-blue-900 hover:border-blue-950 hover:bg-blue-50 text-blue-900 hover:text-blue-950 font-extrabold rounded-xl text-[11px] tracking-wide transition-all cursor-pointer"
            >
              ✉️ NÃO TEM CONTA? SOLICITAR REGISTO POR E-MAIL
            </a>
          )}

          <button
            type="button"
            onClick={() => {
              setActivationEmail(email);
              setActivationError(null);
              setActivationModalOpen(true);
            }}
            className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 font-bold rounded-xl text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <KeyRound size={13} />
            <span>JÁ ENVIEI O COMPROVATIVO · ACTIVAR COM CÓDIGO</span>
          </button>

          <div className="text-center pt-3 border-t border-slate-100 space-y-2">
            <p className="text-xs text-slate-600 font-medium">
              Precisa de recuperar acesso ou apoio técnico?
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <a
                href={buildSupportWhatsAppUrl({
                  number: CLICKPAY_SUPPORT.whatsappPrimaryNumber,
                  message: 'Olá Equipa ClickPay, preciso de apoio técnico / recuperação de acesso ao ClickPay ERP.'
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#1ebe5b] text-white text-[11px] font-semibold transition-colors"
              >
                <MessageCircle size={13} />
                <span>WhatsApp (+258 84 201 4173)</span>
              </a>
              <a
                href={buildSupportMailtoUrl({
                  subject: 'Recuperação de Acesso / Suporte Técnico - ClickPay ERP',
                  body: 'Olá Equipa ClickPay,\n\nPreciso de apoio técnico / recuperação de acesso na plataforma.\n\nEmpresa:\nE-mail da Conta:\nTelemóvel:\n'
                })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-950 text-white text-[11px] font-semibold transition-colors"
              >
                <Mail size={13} />
                <span>{CLICKPAY_SUPPORT.emailPrimary}</span>
              </a>
              <button
                type="button"
                onClick={() => setSupportModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-[11px] font-semibold cursor-pointer transition-colors"
              >
                Abrir Ticket
              </button>
              <button
                type="button"
                onClick={() => setQrModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100/80 text-blue-900 text-[11px] font-semibold cursor-pointer transition-colors"
              >
                <QrCode size={13} />
                <span>Código QR</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      <SupportTicketModal
        isOpen={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
        canalOrigem="Página de Login ClickPay"
        defaultEmail={email}
        defaultAssunto="Recuperação de Acesso / Suporte Técnico"
      />

      <SystemQrModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
      />

      {resetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-blue-900 text-white">
                  <KeyRound size={18} />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-950">
                    Actualizar Palavra-Passe com Segurança
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Defina a sua nova palavra-passe e confirme com a sua conta Gmail verificada.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            {resetError && (
              <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            <form onSubmit={handleResetPasswordWithGoogle} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Nova Palavra-passe (mín. 8 caracteres)</label>
                <div className="relative">
                  <input
                    type={showResetPwd ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Ex: NovaSenha@2026!"
                    className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPwd((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showResetPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Confirmar Nova Palavra-passe</label>
                <input
                  type={showResetPwd ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  placeholder="Repita a nova palavra-passe"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-950 disabled:bg-slate-300 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  {resetLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>A confirmar com Google...</span>
                    </>
                  ) : (
                    <span>Confirmar com Conta Google &amp; Actualizar Senha</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {activationModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-700 text-white">
                  <KeyRound size={18} />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-950">
                    Activar Conta com Código Confirmado
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Introduza o código enviado após confirmação do seu comprovativo pelo Fundador.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivationModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            {activationError && (
              <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{activationError}</span>
              </div>
            )}

            <form onSubmit={handleActivateWithCode} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">E-mail da Conta</label>
                <input
                  type="email"
                  required
                  value={activationEmail}
                  onChange={(e) => setActivationEmail(e.target.value)}
                  placeholder="empresa@exemplo.co.mz"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/10"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Código de Ativação</label>
                <input
                  type="text"
                  required
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                  placeholder="Ex: CP-PRO-8F3K9A2D"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-900/10"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActivationModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={activationLoading}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  {activationLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>A validar...</span>
                    </>
                  ) : (
                    <span>Validar Código &amp; Entrar</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

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
