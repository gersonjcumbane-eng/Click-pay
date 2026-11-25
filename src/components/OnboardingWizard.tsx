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
  FileText,
  Clock,
  RefreshCw,
  Key,
  AlertTriangle,
  Send,
  Phone,
  CreditCard,
  Calendar,
  User
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

const TRANSFER_CHANNELS = [
  'Millennium BIM (Transferência / NIB)',
  'BCI Fomento (Transferência / NIB)',
  'Standard Bank Moçambique',
  'M-Pesa (+258 84 201 4173)',
  'e-Mola (+258 86 139 0061)',
  'Outro Banco Nacional (NIB)'
];

export default function OnboardingWizard({ onCancel, onEnterLogin, onSuccess }: OnboardingWizardProps) {
  // Stage: 'ACCOUNT' -> 'WIZARD' -> 'PENDING_PAYMENT'
  const [stage, setStage] = useState<'ACCOUNT' | 'WIZARD' | 'PENDING_PAYMENT'>('ACCOUNT');

  // Core Account Form State
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [responsavelNome, setResponsavelNome] = useState('');
  const [email, setEmail] = useState('');
  const [nuit, setNuit] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);

  // Wizard Steps: Step 1 (Empresa) -> Step 2 (Armazém) -> Step 3 (Pacote & Validação de Transferência)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [companySubStep, setCompanySubStep] = useState<'LOOKUP' | 'FORM'>('LOOKUP');

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Step 1: Company Profile State
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

  // Step 2: Warehouse Initial State
  const [armazemNome, setArmazemNome] = useState('Armazém Principal');
  const [armazemCodigo, setArmazemCodigo] = useState('CPY1');
  const [armazemEndereco, setArmazemEndereco] = useState('Maputo, Moçambique');

  // Step 3: Subscription & Transfer Proof Validation State
  const [selectedPlan, setSelectedPlan] = useState<'Starter' | 'Growth' | 'Business'>('Starter');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('mensal');
  const [paymentSubStep, setPaymentSubStep] = useState<'PLANS' | 'PAYMENT'>('PLANS');

  const [transferMethod, setTransferMethod] = useState<string>(TRANSFER_CHANNELS[0]);
  const [transferReference, setTransferReference] = useState<string>('');
  const [transferDate, setTransferDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [transferAmount, setTransferAmount] = useState<string>(() => String(getPlanFeeMzn('Starter', 'mensal')));
  const [transferProofName, setTransferProofName] = useState<string>('');
  const [transferProofMime, setTransferProofMime] = useState<string>('');
  const [transferProofBase64, setTransferProofBase64] = useState<string>('');
  const [transferProofSizeKb, setTransferProofSizeKb] = useState<number>(0);
  const [transferProofVerified, setTransferProofVerified] = useState<boolean>(false);
  const [transferProofError, setTransferProofError] = useState<string | null>(null);
  const [confirmTransferHonesty, setConfirmTransferHonesty] = useState<boolean>(false);

  // Pending Approval & Code Activation State
  const [pendingInfo, setPendingInfo] = useState<{
    requestId: string;
    email: string;
    empresa: string;
    plano: string;
    billingCycle: BillingCycle;
    valorEsperado: number;
    metodoTransferencia: string;
    referenciaTransferencia: string;
    valorTransferido: number;
    dataTransferencia: string;
    comprovativoNome: string;
    status: string;
    motivoRejeicao?: string;
    mailtoUrl?: string;
    whatsappUrl?: string;
    emailGateway?: string;
  } | null>(null);
  const [activationCodeInput, setActivationCodeInput] = useState('');
  const [activationEmailInput, setActivationEmailInput] = useState('');
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isActivatingCode, setIsActivatingCode] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);

  // Form Submission & Error State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const expectedFee = getPlanFeeMzn(selectedPlan, billingCycle);
  const selectedPlanSpec = getPlanSpec(selectedPlan);

  const handlePlanChange = (planId: 'Starter' | 'Growth' | 'Business', cycle: BillingCycle = billingCycle) => {
    setSelectedPlan(planId);
    setBillingCycle(cycle);
    const fee = getPlanFeeMzn(planId, cycle);
    setTransferAmount(String(fee));
  };

  // Etapa inicial: valida apenas localmente e avança para o assistente (NÃO cria acesso ao ERP)
  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanEmpresa = nomeEmpresa.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanNuit = nuit.replace(/\D/g, '').trim();

    if (!cleanEmpresa || !cleanEmail || !cleanNuit || !senha) {
      setFormError('Por favor preencha Nome da Empresa, E-mail corporativo, NUIT e Senha.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setFormError('Indique um endereço de e-mail corporativo válido.');
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

    setEmpresaEmail(cleanEmail);
    setActivationEmailInput(cleanEmail);
    setStage('WIZARD');
    setCurrentStep(1);
    showToast('Dados iniciais validados. Complete os passos e envie o comprovativo de transferência no final.');
  };

  // Consultar NUEL
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

  // Carregar e validar ficheiro comprovativo de transferência
  const handleTransferProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setTransferProofError(null);
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setTransferProofVerified(false);
      setTransferProofBase64('');
      setTransferProofError('O comprovativo excede o limite máximo de 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = String(reader.result || '');
      const base64Part = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      const mime = file.type || 'application/pdf';

      const avScan = await scanFileForMalware({
        base64: base64Part,
        mimeType: mime,
        fileName: file.name,
        maxBytes: 2 * 1024 * 1024
      });

      if (!avScan.safe) {
        setTransferProofVerified(false);
        setTransferProofBase64('');
        setTransferProofError(avScan.reason || 'Ficheiro inválido ou bloqueado. Utilize PDF, PNG ou JPG legível.');
        return;
      }

      setTransferProofName(file.name);
      setTransferProofMime(mime);
      setTransferProofBase64(base64Part);
      setTransferProofSizeKb(Math.max(1, Math.round(file.size / 1024)));
      setTransferProofVerified(true);
      setTransferProofError(null);
      showToast(`Comprovativo "${file.name}" validado com sucesso.`);
    };
    reader.readAsDataURL(file);
  };

  const numericTransferredAmount = Number(transferAmount || 0);
  const isTransferProofValid =
    transferMethod.trim().length >= 2 &&
    transferReference.trim().length >= 4 &&
    transferDate.trim().length >= 8 &&
    Number.isFinite(numericTransferredAmount) &&
    numericTransferredAmount >= expectedFee &&
    transferProofVerified &&
    Boolean(transferProofBase64) &&
    confirmTransferHonesty;

  // Submeter registo + comprovativo (BLOQUEADO até confirmação do pagamento pelo Fundador)
  const handleSubmitTransferProof = async () => {
    setFormError(null);

    if (!isTransferProofValid) {
      setFormError(
        `Complete todos os campos do comprovativo de transferência e anexe o recibo (valor mínimo: ${formatMzn(expectedFee)}) para prosseguir.`
      );
      return;
    }

    setIsSubmitting(true);
    const cleanEmpresa = nomeEmpresa.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanNuit = nuit.replace(/\D/g, '').trim();
    const cleanTelefone = empresaTelefone.trim() || '+258 84 000 0000';

    try {
      const payload = {
        nome: responsavelNome.trim() || cleanEmpresa,
        email: cleanEmail,
        password: senha,
        contacto: cleanTelefone,
        nomeEmpresa: cleanEmpresa,
        nuit: cleanNuit,
        nuel,
        endereco: endereco || 'Maputo, Moçambique',
        provincia,
        distrito,
        regimeIva,
        logo: logoUrl,
        plano: selectedPlan,
        billingCycle,
        feeBase: expectedFee,
        transferMethod: transferMethod.trim(),
        transferReference: transferReference.trim(),
        transferDate: transferDate.trim(),
        transferAmount: numericTransferredAmount,
        transferProofName,
        transferProofMimeType: transferProofMime,
        transferProofBase64,
        armazemNome,
        armazemCodigo
      };

      const res = await fetch('/api/auth/register-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => null);

      const isJson = !!res && (res.headers.get('content-type') || '').includes('application/json');
      const isStaticHost = !res || !isJson || res.status === 404 || res.status === 405;

      let data: any = {};
      if (!isStaticHost && res) {
        data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.sucesso) {
          setFormError(data?.erro || 'Não foi possível validar e enviar o comprovativo de transferência.');
          setIsSubmitting(false);
          return;
        }
      }

      const reqId = data.requestId || `REQ-${Date.now()}`;
      const plainSummary = [
        `Novo pedido de activação ClickPay ERP`,
        `Pedido: #${reqId}`,
        `Empresa: ${cleanEmpresa} (NUIT: ${cleanNuit})`,
        `E-mail: ${cleanEmail}`,
        `Telefone: ${cleanTelefone}`,
        `Pacote: ${selectedPlanSpec.name} (${billingCycle === 'anual' ? 'Anual' : 'Mensal'})`,
        `Valor esperado: ${expectedFee.toLocaleString('pt-MZ')} MT`,
        `Método: ${transferMethod.trim()} | Ref: ${transferReference.trim()}`,
        `Valor transferido: ${numericTransferredAmount.toLocaleString('pt-MZ')} MT em ${transferDate.trim()}`,
        `Comprovativo: ${transferProofName}`
      ].join('\n');

      const fallbackMailto = `mailto:gersonjcumbane@gmail.com?subject=${encodeURIComponent(
        `Comprovativo ClickPay #${reqId} - ${cleanEmpresa} (${selectedPlanSpec.name})`
      )}&body=${encodeURIComponent(plainSummary)}`;
      const fallbackWhatsapp = `https://wa.me/258842014173?text=${encodeURIComponent(plainSummary)}`;

      // Sincronizar pedido pendente com Firestore (status pendente/PENDENTE_PAGAMENTO)
      await syncRegisteredAccountToFirestore({
        clientId: `cli_pending_${reqId}`,
        requestId: reqId,
        nomeEmpresa: cleanEmpresa,
        email: cleanEmail,
        nuit: cleanNuit,
        password: senha,
        plano: selectedPlanSpec.name,
        billingCycle,
        feeBase: expectedFee,
        telefone: cleanTelefone,
        endereco,
        provincia,
        transferMethod: transferMethod.trim(),
        transferReference: transferReference.trim(),
        transferAmount: numericTransferredAmount,
        transferDate: transferDate.trim(),
        comprovativoNome: transferProofName,
        subscriptionStatus: 'pendente'
      }).catch(() => null);

      // Garantir que NÃO existe sessão ativa no navegador antes da confirmação do Fundador
      localStorage.removeItem('paytek_auth');
      localStorage.removeItem('paytek_token');
      localStorage.setItem('paytek_pending_request_id', reqId);
      localStorage.setItem('paytek_pending_email', cleanEmail);

      setPendingInfo({
        requestId: reqId,
        email: cleanEmail,
        empresa: cleanEmpresa,
        plano: selectedPlanSpec.name,
        billingCycle,
        valorEsperado: expectedFee,
        metodoTransferencia: transferMethod.trim(),
        referenciaTransferencia: transferReference.trim(),
        valorTransferido: numericTransferredAmount,
        dataTransferencia: transferDate.trim(),
        comprovativoNome: transferProofName,
        status: data.status || 'PENDENTE_PAGAMENTO',
        mailtoUrl: data.mailtoUrl || fallbackMailto,
        whatsappUrl: data.whatsappUrl || fallbackWhatsapp,
        emailGateway: data.emailDelivery?.gateway || (isStaticHost ? 'Firestore + E-mail/WhatsApp Directo' : undefined)
      });
      setActivationEmailInput(cleanEmail);
      setStage('PENDING_PAYMENT');
      showToast('Comprovativo registado para validação de gersonjcumbane@gmail.com!');
    } catch (err) {
      console.error(err);
      setFormError('Erro de comunicação ao submeter o comprovativo. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Atualizar estado do pagamento junto do servidor
  const handleRefreshPaymentStatus = async () => {
    const queryEmail = (pendingInfo?.email || activationEmailInput || email).trim().toLowerCase();
    const queryReqId = pendingInfo?.requestId || '';
    if (!queryEmail && !queryReqId) return;

    setIsCheckingStatus(true);
    setActivationError(null);
    try {
      const params = new URLSearchParams();
      if (queryEmail) params.set('email', queryEmail);
      if (queryReqId) params.set('requestId', queryReqId);
      const res = await fetch(`/api/onboarding/status?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.found) {
        setPendingInfo((prev) => ({
          ...(prev || {
            requestId: data.requestId,
            email: data.email,
            empresa: data.empresa,
            plano: data.planoEscolhido,
            billingCycle: data.billingCycle || 'mensal',
            valorEsperado: data.valorEsperado,
            metodoTransferencia: data.metodoTransferencia,
            referenciaTransferencia: data.referenciaTransferencia,
            valorTransferido: data.valorTransferido,
            dataTransferencia: data.dataTransferencia,
            comprovativoNome: data.comprovativoNome,
            status: data.status
          }),
          status: data.status,
          motivoRejeicao: data.motivoRejeicao || ''
        }));

        if (data.status === 'CREDENCIAIS_ENVIADAS' || data.status === 'APROVADO') {
          showToast('Pagamento confirmado! Introduza o código recebido no seu e-mail para entrar.');
        } else if (data.status === 'REJEITADO') {
          setActivationError(
            `Comprovativo recusado: ${data.motivoRejeicao || 'verifique os dados enviados.'}`
          );
        } else {
          showToast('Ainda a aguardar confirmação do Fundador (gersonjcumbane@gmail.com).');
        }
      }
    } catch {
      setActivationError('Não foi possível consultar o estado do pedido.');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Ativar conta com código recebido após confirmação de pagamento pelo Fundador
  const handleActivateWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setActivationError(null);
    const cleanEmail = (activationEmailInput || pendingInfo?.email || email).trim().toLowerCase();
    const cleanCode = activationCodeInput.trim().toUpperCase();

    if (!cleanEmail || !cleanCode) {
      setActivationError('Preencha o e-mail e o código de ativação enviado após confirmação do pagamento.');
      return;
    }

    setIsActivatingCode(true);
    try {
      const res = await fetch('/api/onboarding/activate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          requestId: pendingInfo?.requestId,
          activationCode: cleanCode
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.sucesso || !data?.token) {
        setActivationError(data?.erro || 'Código inválido ou pagamento ainda não confirmado.');
        setIsActivatingCode(false);
        return;
      }

      const u = data.usuario || {};
      const clientId = u.empresa_id || u.id || `cli_reg_${Date.now()}`;
      const mappedPlan = normalizePlanToInternal(u.subscription_plan || selectedPlan);

      localStorage.removeItem('paytek_pending_request_id');
      localStorage.removeItem('paytek_pending_email');
      localStorage.setItem('paytek_auth', 'true');
      localStorage.setItem('paytek_token', data.token);
      localStorage.setItem('paytek_user', cleanEmail);
      localStorage.setItem('paytek_role', u.funcao || 'CLIENTE_EMPRESA');
      localStorage.setItem('paytek_company_id', clientId);
      localStorage.setItem('paytek_sub_status', 'ativo');
      localStorage.setItem('paytek_sub_plan', mappedPlan);
      localStorage.setItem('paytek_sub_expire', u.next_billing_date || '');
      localStorage.setItem('paytek_company_name', u.nome_empresa || nomeEmpresa);
      localStorage.setItem('paytek_payments_locked', 'true');

      onSuccess({
        ...u,
        subscription_status: 'ativo',
        subscription_plan: mappedPlan,
        pagamentos_bloqueados: true
      });
    } catch {
      setActivationError('Erro ao validar o código de ativação. Tente novamente.');
    } finally {
      setIsActivatingCode(false);
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
              onClick={() => {
                setStage('PENDING_PAYMENT');
                setActivationEmailInput(email.trim().toLowerCase());
              }}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <Key size={12} />
              <span>Já tenho Código</span>
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

      {/* STAGE 1: DADOS INICIAIS DA CONTA CLICKPAY */}
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
                    Preencha os dados da empresa, escolha o pacote e envie o comprovativo de transferência para ativação.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-950 flex items-start gap-2.5">
                <Lock size={15} className="text-blue-800 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Ativação Mediante Comprovativo de Transferência</p>
                  <p className="text-blue-800 leading-relaxed mt-0.5">
                    O acesso ao ERP permanece bloqueado até enviar o comprovativo de transferência e o Fundador confirmar a recepção do valor, emitindo o seu código e credenciais.
                  </p>
                </div>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 text-rose-800 border border-rose-100 rounded-xl text-xs font-semibold">
                  {formError}
                </div>
              )}

              <form onSubmit={handleAccountSubmit} className="space-y-4">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      Nome do Responsável
                    </label>
                    <div className="relative">
                      <User size={14} className="absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        value={responsavelNome}
                        onChange={(e) => setResponsavelNome(e.target.value)}
                        placeholder="Ex: João Sitoe"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-900 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      Telefone / WhatsApp
                    </label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3 top-3 text-slate-400" />
                      <input
                        type="tel"
                        value={empresaTelefone}
                        onChange={(e) => setEmpresaTelefone(e.target.value)}
                        placeholder="+258 84 000 0000"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15 focus:border-blue-900 transition-all"
                      />
                    </div>
                  </div>
                </div>

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

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Senha Desejada <span className="text-rose-500">*</span>
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
                  className="w-full py-3 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-900/15 cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Prosseguir para Configuração &amp; Subscrição</span>
                  <ChevronRight size={14} />
                </button>

                <div className="text-center pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500 font-medium">Já tem uma conta ativa? </span>
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

          <footer className="mt-8 text-center text-[10px] text-slate-400 max-w-md px-4 space-y-1">
            <p className="flex items-center justify-center gap-1 font-semibold text-slate-500">
              <ShieldCheck size={12} className="text-emerald-600" />
              ClickPay Moçambique · Acesso Encriptado SSL
            </p>
            <p>© 2026 ClickPay Moçambique · NUIT: 402302399 | NUEL: 105086659</p>
          </footer>
        </div>
      )}

      {/* Modal Termos / Privacidade */}
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
                  <p>O acesso ao sistema fica ativo após validação do comprovativo de transferência bancária ou móvel pela equipa ClickPay.</p>
                </>
              ) : (
                <>
                  <p>Os seus dados pessoais, fiscais e comprovativos de pagamento são protegidos por encriptação em trânsito e em repouso.</p>
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

      {/* STAGE 2: WIZARD DE CONFIGURAÇÃO + BLOQUEIO FINAL ATÉ COMPROVATIVO DE TRANSFERÊNCIA */}
      {stage === 'WIZARD' && (
        <main className="max-w-4xl mx-auto w-full px-4 py-8 flex-1">
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
              <Lock size={17} />
            </div>
            <div>
              <p className="text-xs font-extrabold text-amber-950">
                Pré-registo em curso para {nomeEmpresa} ({email})
              </p>
              <p className="text-[11px] text-amber-800">
                Conclua os dados da empresa e anexe o comprovativo de transferência no Passo 3. O acesso ao ERP só é desbloqueado após confirmação do pagamento pelo Fundador.
              </p>
            </div>
          </div>

          {/* Stepper Header Bar */}
          <div className="flex items-center justify-center gap-4 sm:gap-8 mb-8 text-xs font-bold">
            <div className={`flex items-center gap-2 ${currentStep === 1 ? 'text-blue-900 font-extrabold' : currentStep > 1 ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${currentStep === 1 ? 'bg-blue-900 text-white shadow-md shadow-blue-900/20' : currentStep > 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {currentStep > 1 ? <Check size={14} /> : '1'}
              </div>
              <span>Empresa</span>
            </div>

            <div className={`w-10 h-0.5 ${currentStep > 1 ? 'bg-emerald-500' : 'bg-slate-200'}`} />

            <div className={`flex items-center gap-2 ${currentStep === 2 ? 'text-blue-900 font-extrabold' : currentStep > 2 ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${currentStep === 2 ? 'bg-blue-900 text-white shadow-md shadow-blue-900/20' : currentStep > 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {currentStep > 2 ? <Check size={14} /> : '2'}
              </div>
              <span>Armazém</span>
            </div>

            <div className={`w-10 h-0.5 ${currentStep > 2 ? 'bg-emerald-500' : 'bg-slate-200'}`} />

            <div className={`flex items-center gap-2 ${currentStep === 3 ? 'text-blue-900 font-extrabold' : 'text-slate-400'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${currentStep === 3 ? 'bg-blue-900 text-white shadow-md shadow-blue-900/20' : 'bg-slate-200 text-slate-600'}`}>
                3
              </div>
              <span>Pacote &amp; Comprovativo</span>
            </div>
          </div>

          {/* STEP 1: EMPRESA */}
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-6 sm:p-10 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6 max-w-2xl mx-auto"
            >
              {companySubStep === 'LOOKUP' ? (
                <div className="space-y-6 text-center">
                  <div className="w-12 h-12 bg-blue-50 text-blue-900 rounded-2xl flex items-center justify-center mx-auto">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">
                      Dados Fiscais da Empresa
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                      Se a empresa está registada em Moçambique, insira o NUEL para preenchimento rápido ou confirme manualmente.
                    </p>
                  </div>

                  <div className="space-y-3 text-left max-w-md mx-auto">
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide block">
                      NUEL <span className="text-slate-400 font-normal">MOÇAMBIQUE</span>
                    </label>
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
                      type="button"
                      onClick={handleConsultarNuel}
                      disabled={isSearchingNuel}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs transition-all shadow-md shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isSearchingNuel ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          A consultar NUEL...
                        </>
                      ) : (
                        <>
                          <Search size={14} />
                          Procurar empresa (NUEL)
                        </>
                      )}
                    </button>
                  </div>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                    <div className="relative flex justify-center text-[10px] font-bold uppercase"><span className="bg-white px-3 text-slate-400">OU</span></div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => setStage('ACCOUNT')}
                      className="px-4 py-3 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      Voltar aos dados iniciais
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompanySubStep('FORM')}
                      className="flex-1 py-3 border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      Confirmar dados manualmente
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center shrink-0">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900">Perfil da Empresa</h2>
                      <p className="text-xs text-slate-500">Confirme os dados fiscais e de contacto.</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                      LOGÓTIPO DA EMPRESA (OPCIONAL)
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden">
                        {logoUrl ? (
                          <img src={logoUrl} alt="Logo preview" className="w-full h-full object-contain" />
                        ) : (
                          <Building2 className="text-slate-300" size={24} />
                        )}
                      </div>
                      <label className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs cursor-pointer inline-flex items-center gap-1.5 shadow-xs">
                        <Upload size={13} />
                        <span>Carregar</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 2 * 1024 * 1024) {
                              showToast('O logótipo excede o limite de 2 MB.');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = async () => {
                              const result = String(reader.result || '');
                              const avScan = await scanFileForMalware({
                                base64: result.split(',')[1] || '',
                                mimeType: file.type || 'image/png',
                                fileName: file.name,
                                maxBytes: 2 * 1024 * 1024
                              });
                              if (!avScan.safe) {
                                showToast(`Ficheiro bloqueado: ${avScan.reason}`);
                                return;
                              }
                              setLogoUrl(result);
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">PAÍS</label>
                      <select
                        value={empresaPais}
                        onChange={(e) => setEmpresaPais(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15"
                      >
                        <option value="Moçambique">Moçambique</option>
                        <option value="África do Sul">África do Sul</option>
                        <option value="Angola">Angola</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">PROVÍNCIA</label>
                      <select
                        value={provincia}
                        onChange={(e) => setProvincia(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15"
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
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">DISTRITO / CIDADE</label>
                      <input
                        type="text"
                        value={distrito}
                        onChange={(e) => setDistrito(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                        <Tag size={12} className="text-indigo-600" />
                        REGIME DE IVA
                      </label>
                      <select
                        value={regimeIva}
                        onChange={(e) => setRegimeIva(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                      >
                        <option value="IVA Normal">IVA Normal (16%)</option>
                        <option value="IVA Isento">IVA Isento (Art. 9º)</option>
                        <option value="IVA Simplificado">IVA Simplificado (5%)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">NUEL</label>
                      <input
                        type="text"
                        value={nuel}
                        onChange={(e) => setNuel(e.target.value)}
                        placeholder="100123456"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">ENDEREÇO</label>
                      <input
                        type="text"
                        value={endereco}
                        onChange={(e) => setEndereco(e.target.value)}
                        placeholder="Av. 25 de Setembro..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setCompanySubStep('LOOKUP')}
                      className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft size={14} />
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="px-6 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-blue-900/15"
                    >
                      Continuar
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 2: ARMAZÉM INICIAL */}
          {currentStep === 2 && (
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
                  <h2 className="text-base font-black text-slate-900">Armazém / Unidade Inicial</h2>
                  <p className="text-xs text-slate-500">Defina a unidade operacional principal antes de escolher o pacote.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                    NOME DO ARMAZÉM
                  </label>
                  <input
                    type="text"
                    value={armazemNome}
                    onChange={(e) => setArmazemNome(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">CÓDIGO</label>
                    <input
                      type="text"
                      value={armazemCodigo}
                      onChange={(e) => setArmazemCodigo(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">LOCALIZAÇÃO</label>
                    <input
                      type="text"
                      value={armazemEndereco}
                      onChange={(e) => setArmazemEndereco(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(3);
                    setPaymentSubStep('PLANS');
                  }}
                  className="px-6 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-blue-900/15"
                >
                  Escolher Pacote &amp; Transferência
                  <ArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: ESCOLHA DO PACOTE + ENVIO E VALIDAÇÃO DE COMPROVATIVO DE TRANSFERÊNCIA (BLOQUEIO FINAL) */}
          {currentStep === 3 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              {paymentSubStep === 'PLANS' ? (
                <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-black text-slate-900">Escolha o seu Pacote ClickPay</h2>
                      <p className="text-xs text-slate-500">
                        As credenciais e o código de ativação serão emitidos exatamente para o pacote que selecionar abaixo.
                      </p>
                    </div>

                    <div className="inline-flex items-center bg-slate-100 rounded-xl p-1 self-start sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => handlePlanChange(selectedPlan, 'mensal')}
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
                        onClick={() => handlePlanChange(selectedPlan, 'anual')}
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
                          onClick={() => handlePlanChange(plan.id, billingCycle)}
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
                                  Total anual a transferir: {formatMzn(plan.annualTotalMzn, { spaceGrouping: true })}
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
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft size={14} />
                      Voltar
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTransferAmount(String(expectedFee));
                        setPaymentSubStep('PAYMENT');
                      }}
                      className="px-6 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-blue-900/15"
                    >
                      Continuar para Pagamento &amp; Comprovativo ({formatMzn(expectedFee)})
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                /* Sub-step 3.2: Gate Obrigatório de Transferência + Upload & Validação de Comprovativo */
                <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6 max-w-2xl mx-auto">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg mb-2">
                        <Lock size={11} />
                        Etapa Obrigatória de Confirmação
                      </span>
                      <h2 className="text-lg font-black text-slate-900">
                        Pagamento por Transferência &amp; Validação de Comprovativo
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Não é possível finalizar nem entrar no ERP sem enviar um comprovativo válido do valor do pacote. O ficheiro será enviado automaticamente para <b>gersonjcumbane@gmail.com</b>.
                      </p>
                    </div>
                  </div>

                  {/* Resumo do Pacote e Valor */}
                  <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">
                        PACOTE ESCOLHIDO
                      </span>
                      <span className="text-base font-black">
                        {selectedPlanSpec.name} · {billingCycle === 'anual' ? 'Subscrição Anual (-20%)' : 'Subscrição Mensal'}
                      </span>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        {selectedPlanSpec.includedUsersLabel} · Até {selectedPlanSpec.includedEmployees} colaboradores
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">
                        VALOR EXATO A TRANSFERIR
                      </span>
                      <span className="text-2xl font-black text-emerald-400 font-mono">
                        {formatMzn(expectedFee)}
                      </span>
                    </div>
                  </div>

                  {/* Coordenadas Bancárias & Carteiras Móveis */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                    <p className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
                      Coordenadas Oficiais para Transferência (ClickPay Moçambique, Lda)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] font-mono">
                      <div className="bg-white border border-slate-200 rounded-xl p-2.5">
                        <span className="font-bold text-slate-900 block font-sans">Millennium BIM</span>
                        <span>Conta: 9944-8833-MZ</span>
                        <span className="block text-slate-500 text-[10px]">NIB: 0001 0000 9944 8833 01</span>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-xl p-2.5">
                        <span className="font-bold text-slate-900 block font-sans">BCI Fomento</span>
                        <span>Conta: 1122-3344-MZ</span>
                        <span className="block text-slate-500 text-[10px]">NIB: 0008 0000 1122 3344 02</span>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-xl p-2.5">
                        <span className="font-bold text-slate-900 block font-sans">M-Pesa / e-Mola</span>
                        <span>84 201 4173 / 86 139 0061</span>
                        <span className="block text-slate-500 text-[10px]">Titular: Gerson Cumbane</span>
                      </div>
                    </div>
                  </div>

                  {formError && (
                    <div className="p-3.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-semibold flex items-start gap-2">
                      <AlertTriangle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Campos Obrigatórios de Validação do Comprovativo */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                          <CreditCard size={12} className="text-blue-900" />
                          CANAL DA TRANSFERÊNCIA <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={transferMethod}
                          onChange={(e) => setTransferMethod(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                        >
                          {TRANSFER_CHANNELS.map((ch) => (
                            <option key={ch} value={ch}>{ch}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                          <Calendar size={12} className="text-blue-900" />
                          DATA DA TRANSFERÊNCIA <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={transferDate}
                          onChange={(e) => setTransferDate(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                          REFERÊNCIA / Nº TALÃO DA OPERAÇÃO <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={transferReference}
                          onChange={(e) => setTransferReference(e.target.value)}
                          placeholder="Ex: TRF-2026-88412 ou MP2611..."
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15"
                        />
                        {transferReference.trim().length > 0 && transferReference.trim().length < 4 && (
                          <span className="text-[10px] text-rose-600 font-semibold block">
                            Mínimo de 4 caracteres.
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                          VALOR TRANSFERIDO (MT) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          min={expectedFee}
                          step="1"
                          required
                          value={transferAmount}
                          onChange={(e) => setTransferAmount(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15"
                        />
                        <span className={`text-[10px] font-bold block ${numericTransferredAmount >= expectedFee ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {numericTransferredAmount >= expectedFee
                            ? `✓ Valor compatível com o pacote (${formatMzn(expectedFee)})`
                            : `O valor transferido deve ser pelo menos ${formatMzn(expectedFee)}`}
                        </span>
                      </div>
                    </div>

                    {/* Campo de Validação & Anexo do Comprovativo */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide block">
                        ANEXAR COMPROVATIVO DE TRANSFERÊNCIA (PDF, PNG OU JPG · MÁX. 2 MB) <span className="text-rose-500">*</span>
                      </label>
                      <label
                        className={`flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                          transferProofVerified
                            ? 'border-emerald-400 bg-emerald-50/70'
                            : transferProofError
                            ? 'border-rose-400 bg-rose-50/60'
                            : 'border-slate-300 bg-slate-50 hover:border-blue-900 hover:bg-blue-50/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${transferProofVerified ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                            {transferProofVerified ? <CheckCircle2 size={20} /> : <Upload size={18} />}
                          </div>
                          <div>
                            {transferProofVerified ? (
                              <>
                                <p className="text-xs font-extrabold text-emerald-950">
                                  ✓ Comprovativo Validado: {transferProofName}
                                </p>
                                <p className="text-[11px] text-emerald-700">
                                  {transferProofSizeKb} KB · Verificado e pronto para envio automático a gersonjcumbane@gmail.com
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-xs font-bold text-slate-800">
                                  Clique aqui para selecionar o comprovativo da transferência
                                </p>
                                <p className="text-[10px] text-slate-500">
                                  Aceita recibo bancário em PDF, captura de ecrã M-Pesa/e-Mola em PNG ou JPG
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                        <span className="px-3.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 shrink-0 shadow-xs">
                          {transferProofVerified ? 'Substituir' : 'Selecionar Ficheiro'}
                        </span>
                        <input
                          type="file"
                          accept=".pdf,application/pdf,image/png,image/jpeg,image/webp"
                          onChange={handleTransferProofUpload}
                          className="hidden"
                        />
                      </label>
                      {transferProofError && (
                        <p className="text-[11px] font-bold text-rose-700">{transferProofError}</p>
                      )}
                    </div>

                    <label className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={confirmTransferHonesty}
                        onChange={(e) => setConfirmTransferHonesty(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-900 focus:ring-blue-900 cursor-pointer"
                      />
                      <span className="text-[11px] text-slate-700 leading-relaxed">
                        Confirmo que efetuei a transferência para o pacote <b>{selectedPlanSpec.name}</b> e autorizo o envio automático do comprovativo para <b>gersonjcumbane@gmail.com</b> para emissão do código de ativação e credenciais.
                      </span>
                    </label>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setPaymentSubStep('PLANS')}
                      className="w-full sm:w-auto px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft size={14} />
                      Alterar Pacote
                    </button>

                    <button
                      type="button"
                      disabled={!isTransferProofValid || isSubmitting}
                      onClick={handleSubmitTransferProof}
                      className="w-full sm:w-auto px-6 py-3 bg-blue-900 hover:bg-blue-950 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-900/15 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>A validar e enviar comprovativo...</span>
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          <span>Enviar Comprovativo &amp; Solicitar Ativação</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </main>
      )}

      {/* STAGE 3: CONTA BLOQUEADA A AGUARDAR CONFIRMAÇÃO + ATIVAÇÃO POR CÓDIGO */}
      {stage === 'PENDING_PAYMENT' && (
        <main className="max-w-2xl mx-auto w-full px-4 py-10 flex-1 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 border border-slate-100 space-y-6"
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                pendingInfo?.status === 'CREDENCIAIS_ENVIADAS' || pendingInfo?.status === 'APROVADO'
                  ? 'bg-emerald-100 text-emerald-700'
                  : pendingInfo?.status === 'REJEITADO'
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {pendingInfo?.status === 'CREDENCIAIS_ENVIADAS' || pendingInfo?.status === 'APROVADO' ? (
                  <CheckCircle2 size={24} />
                ) : pendingInfo?.status === 'REJEITADO' ? (
                  <AlertTriangle size={24} />
                ) : (
                  <Clock size={24} />
                )}
              </div>
              <div className="space-y-1">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white">
                  {pendingInfo?.status === 'CREDENCIAIS_ENVIADAS' || pendingInfo?.status === 'APROVADO'
                    ? 'Pagamento Confirmado · Introduza o Código'
                    : pendingInfo?.status === 'REJEITADO'
                    ? 'Comprovativo Recusado'
                    : 'Acesso Bloqueado · Aguardando Confirmação'}
                </span>
                <h1 className="text-xl font-black text-slate-950">
                  {pendingInfo
                    ? `Pedido #${pendingInfo.requestId} (${pendingInfo.plano})`
                    : 'Ativar Conta com Código Confirmado'}
                </h1>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {pendingInfo
                    ? `O comprovativo de ${formatMzn(pendingInfo.valorTransferido)} (${pendingInfo.metodoTransferencia} · Ref: ${pendingInfo.referenciaTransferencia}) foi encaminhado para gersonjcumbane@gmail.com. Assim que o Fundador confirmar a recepção do valor, receberá o código de ativação e as credenciais do pacote ${pendingInfo.plano}.`
                    : 'Se já enviou o seu comprovativo e o Fundador confirmou o pagamento, introduza o e-mail e o código de ativação recebido.'}
                </p>
              </div>
            </div>

            {pendingInfo && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Empresa</span>
                    <span className="font-bold text-slate-900">{pendingInfo.empresa}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Pacote</span>
                    <span className="font-bold text-blue-900">{pendingInfo.plano}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Transferido</span>
                    <span className="font-mono font-bold text-emerald-700">{formatMzn(pendingInfo.valorTransferido)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Comprovativo</span>
                    <span className="font-medium text-slate-700 truncate block">{pendingInfo.comprovativoNome}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={handleRefreshPaymentStatus}
                    disabled={isCheckingStatus}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw size={13} className={isCheckingStatus ? 'animate-spin' : ''} />
                    {isCheckingStatus ? 'A verificar...' : 'Verificar Confirmação'}
                  </button>

                  {pendingInfo.mailtoUrl && (
                    <a
                      href={pendingInfo.mailtoUrl}
                      className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                    >
                      <Mail size={13} />
                      Enviar Cópia por E-mail
                    </a>
                  )}

                  {pendingInfo.whatsappUrl && (
                    <a
                      href={pendingInfo.whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                    >
                      <Phone size={13} />
                      Notificar WhatsApp
                    </a>
                  )}

                  {pendingInfo.status === 'REJEITADO' && (
                    <button
                      type="button"
                      onClick={() => {
                        setStage('WIZARD');
                        setCurrentStep(3);
                        setPaymentSubStep('PAYMENT');
                      }}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Reenviar Comprovativo
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Formulário de Ativação por Código */}
            <form onSubmit={handleActivateWithCode} className="border-t border-slate-200 pt-5 space-y-4">
              <div>
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Key size={16} className="text-blue-900" />
                  Já Recebi o Código de Ativação
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Após o Fundador confirmar o recebimento da transferência, introduza o código recebido para desbloquear o sistema no seu pacote.
                </p>
              </div>

              {activationError && (
                <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-semibold">
                  {activationError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">E-mail da Conta</label>
                  <input
                    type="email"
                    required
                    value={activationEmailInput}
                    onChange={(e) => setActivationEmailInput(e.target.value)}
                    placeholder="empresa@exemplo.co.mz"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">Código de Ativação</label>
                  <input
                    type="text"
                    required
                    value={activationCodeInput}
                    onChange={(e) => setActivationCodeInput(e.target.value.toUpperCase())}
                    placeholder="Ex: CP-PRO-9A4B2C1D"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={isActivatingCode}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
                >
                  {isActivatingCode ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>A validar código...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      <span>Validar Código &amp; Entrar no ERP</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onEnterLogin || onCancel}
                  className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Ir para Login
                </button>
              </div>
            </form>
          </motion.div>
        </main>
      )}
    </div>
  );
}
