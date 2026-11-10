/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  KeyRound, 
  Lock, 
  Unlock, 
  Copy, 
  Check, 
  RefreshCw, 
  UserPlus, 
  Trash2, 
  AlertTriangle, 
  Send, 
  Smartphone, 
  Mail, 
  FileText, 
  Sparkles, 
  ShieldAlert, 
  Globe, 
  Building, 
  CheckCircle2,
  Eye,
  EyeOff,
  Download,
  Clock,
  Zap,
  Server,
  Layers,
  PhoneCall
} from 'lucide-react';
import { CompanyData } from '../types';
import { useToast } from '../context/ToastContext';

interface AccessCredentialManagementProps {
  company: CompanyData;
  onUpdateCompany?: (updated: CompanyData) => void;
  userRole?: string | null;
}

interface SystemUser {
  id: string;
  name: string;
  email: string;
  passwordMasked: string;
  rawPassword?: string;
  role: string;
  roleLabel: string;
  plan: string;
  companyName: string;
  phone: string;
  status: 'ativo' | 'inativo';
  createdAt: string;
  lastLogin: string;
  apiTokenPrefix?: string;
}

interface ApiToken {
  id: string;
  name: string;
  tokenPrefix: string;
  fullToken?: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  status: 'ativo' | 'revogado';
  createdBy: string;
}

interface AuditLog {
  id: string;
  timestamp: string;
  event: string;
  details: string;
  userEmail: string;
  status: 'sucesso' | 'pendente' | 'bloqueado' | 'aviso';
  notifiedTo: string;
  meta?: any;
}

export default function AccessCredentialManagement({
  company,
  onUpdateCompany,
  userRole
}: AccessCredentialManagementProps) {
  const { showSuccess, showError, showInfo } = useToast();

  // 1. Identificadores Oficiais ClickPayroll
  const [nuit, setNuit] = useState<string>(company.nuit || '402302399');
  const [nuel, setNuel] = useState<string>(company.nuel || '105086659');
  const [savingFiscal, setSavingFiscal] = useState<boolean>(false);

  // 2. Segurança OTP & Notificações
  const [otpRequired, setOtpRequired] = useState<boolean>(true);
  const [founderEmail] = useState<string>('gersonjcumbane@gmail.com');
  const [founderPhones] = useState<string[]>(['+258 86 139 0061', '+258 84 201 4173']);
  const [testingOtp, setTestingOtp] = useState<boolean>(false);
  const [togglingOtp, setTogglingOtp] = useState<boolean>(false);

  // 3. Utilizadores e Tokens
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 4. Modal de Geração Automática de Credenciais
  const [showGenModal, setShowGenModal] = useState<boolean>(false);
  const [genNome, setGenNome] = useState<string>('');
  const [genEmail, setGenEmail] = useState<string>('');
  const [genRole, setGenRole] = useState<string>('GESTOR_RH');
  const [genPlan, setGenPlan] = useState<string>('Silver');
  const [genPhone, setGenPhone] = useState<string>('+258 84 ');
  const [generating, setGenerating] = useState<boolean>(false);
  const [generatedResult, setGeneratedResult] = useState<any | null>(null);

  // 5. Modal de Novo Token
  const [showTokenModal, setShowTokenModal] = useState<boolean>(false);
  const [tokenName, setTokenName] = useState<string>('');
  const [tokenScopes, setTokenScopes] = useState<string[]>(['payroll:read', 'invoicing:write']);
  const [creatingToken, setCreatingToken] = useState<boolean>(false);

  // 6. Clipboard Feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string, label: string = 'Texto') => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showSuccess(`${label} copiado para a área de transferência!`);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Carregar dados gerais do servidor
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/access/overview');
      if (res.ok) {
        const data = await res.json();
        if (data.users) setUsers(data.users);
        if (data.tokens) setTokens(data.tokens);
        if (data.auditLogs) setAuditLogs(data.auditLogs);
        if (data.securityConfig) {
          setOtpRequired(data.securityConfig.requireOtpOnLogin ?? true);
        }
        if (data.nuitNuel) {
          if (data.nuitNuel.nuit) setNuit(data.nuitNuel.nuit);
          if (data.nuitNuel.nuel) setNuel(data.nuitNuel.nuel);
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar visão geral de acessos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Salvar NUIT e NUEL globalmente na configuração da empresa
  const handleSaveNuitNuel = async () => {
    if (!nuit || !nuel) {
      showError('O NUIT e o NUEL não podem ficar em branco.');
      return;
    }
    setSavingFiscal(true);
    try {
      const res = await fetch('/api/access/update-nuit-nuel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nuit, nuel })
      });
      const data = await res.json();
      if (data.sucesso) {
        showSuccess(`NUIT (${nuit}) e NUEL (${nuel}) gravados globalmente no ERP!`);
        if (onUpdateCompany) {
          onUpdateCompany({
            ...company,
            nuit: nuit.trim(),
            nuel: nuel.trim()
          });
        }
        loadData();
      } else {
        showError(data.erro || 'Falha ao gravar identificadores.');
      }
    } catch (err: any) {
      showError('Erro de conexão ao gravar NUIT/NUEL.');
    } finally {
      setSavingFiscal(false);
    }
  };

  // Restaurar padrões oficiais
  const handleResetOfficial = () => {
    setNuit('402302399');
    setNuel('105086659');
    showInfo('Valores restaurados para o oficial: NUIT 402302399 e NUEL 105086659.');
  };

  // Alternar / Trocar se o utilizador digitou invertido
  const handleSwapValues = () => {
    const temp = nuit;
    setNuit(nuel);
    setNuel(temp);
    showInfo('NUIT e NUEL alternados. Clique em "Salvar Globalmente" para aplicar.');
  };

  // Alternar exigência de OTP
  const handleToggleOtp = async () => {
    setTogglingOtp(true);
    const nextVal = !otpRequired;
    try {
      const res = await fetch('/api/access/toggle-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requireOtpOnLogin: nextVal })
      });
      if (res.ok) {
        setOtpRequired(nextVal);
        showSuccess(`Verificação OTP no login ${nextVal ? 'ATIVADA' : 'DESATIVADA'}! Fundador notificado.`);
        loadData();
      } else {
        showError('Falha ao atualizar segurança OTP.');
      }
    } catch (err) {
      showError('Erro de conexão ao alterar configuração de OTP.');
    } finally {
      setTogglingOtp(false);
    }
  };

  // Testar envio de OTP e notificação ao Fundador
  const handleTestNotification = async () => {
    setTestingOtp(true);
    try {
      const res = await fetch('/api/access/test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.sucesso) {
        showSuccess(`Alerta de Teste & Código OTP (${data.codigoOtpTeste}) disparados para ${data.notificadoPara}!`);
        loadData();
      } else {
        showError(data.erro || 'Falha ao testar notificação.');
      }
    } catch (err) {
      showError('Erro ao disparar teste de notificação.');
    } finally {
      setTestingOtp(false);
    }
  };

  // Submeter formulário de geração automática de credenciais
  const handleGenerateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genNome.trim() || !genEmail.trim()) {
      showError('Nome e E-mail são obrigatórios.');
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch('/api/access/auto-generate-credential', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: genNome.trim(),
          email: genEmail.trim(),
          role: genRole,
          plan: genPlan,
          phone: genPhone.trim(),
          companyName: company.nome
        })
      });
      const data = await res.json();
      if (data.sucesso) {
        setGeneratedResult(data.usuario);
        showSuccess(`Credenciais geradas e Fundador (${founderEmail}) notificado com sucesso!`);
        setGenNome('');
        setGenEmail('');
        loadData();
      } else {
        showError(data.erro || 'Erro ao gerar credenciais.');
      }
    } catch (err) {
      showError('Erro de rede ao gerar credenciais.');
    } finally {
      setGenerating(false);
    }
  };

  // Criar novo token de API
  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenName.trim()) {
      showError('Informe uma identificação para o Token de API.');
      return;
    }
    setCreatingToken(true);
    try {
      const res = await fetch('/api/access/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tokenName.trim(),
          scopes: tokenScopes
        })
      });
      const data = await res.json();
      if (data.sucesso) {
        showSuccess(`Token "${tokenName}" gerado com sucesso!`);
        setShowTokenModal(false);
        setTokenName('');
        loadData();
      } else {
        showError(data.erro || 'Falha ao criar token.');
      }
    } catch (err) {
      showError('Erro ao criar token de API.');
    } finally {
      setCreatingToken(false);
    }
  };

  // Revogar token
  const handleRevokeToken = async (id: string, name: string) => {
    if (!confirm(`Tem a certeza que deseja revogar o token "${name}"? Todas as integrações ativas com esta chave deixarão de funcionar imediatamente.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/access/tokens/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.sucesso) {
        showSuccess(`Token revogado com sucesso!`);
        loadData();
      } else {
        showError(data.erro || 'Falha ao revogar token.');
      }
    } catch (err) {
      showError('Erro ao revogar token.');
    }
  };

  // Descarregar ficha de credenciais
  const downloadCredentialsTxt = (user: any) => {
    const content = `=====================================================
CLICKPAY MOÇAMBIQUE - FICHA DE ACESSO AO SISTEMA ERP
=====================================================
Utilizador: ${user.name}
E-mail de Acesso: ${user.email}
Palavra-Passe Inicial: ${user.rawPassword || '••••••••'}
Nível de Acesso: ${user.roleLabel || user.role}
Plano Atribuído: ${user.plan}
Empresa: ${user.companyName || company.nome}
NUIT Oficial: ${nuit}
NUEL Oficial: ${nuel}

TOKEN DE API EXCLUSIVO:
${user.apiToken || user.apiTokenPrefix || 'Gerado no painel'}

PORTAL DE ACESSO:
https://clickpay.co.mz/
Data de Emissão: ${new Date().toLocaleDateString('pt-MZ')}

AVISO DE SEGURANÇA:
Por motivos de conformidade legal e segurança cibernética,
todos os acessos são auditados e protegidos por OTP (2FA).
O Fundador (gersonjcumbane@gmail.com) é notificado em cada tentativa.
=====================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Credenciais_ClickPay_${user.email.replace(/[@.]/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess('Ficha de credenciais descarregada com sucesso!');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. Header Hero com Identidade Executiva */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-900 text-white rounded-xl shadow-xs">
                <ShieldCheck size={22} strokeWidth={2.2} />
              </span>
              <h1 className="text-2xl font-black text-slate-950 tracking-tight">
                Gestão de Acesso, OTP & Credenciais
              </h1>
            </div>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              Controlo centralizado de utilizadores, níveis de permissão, tokens de API e autenticação em dois passos (OTP). 
              Notificações de segurança são despachadas instantaneamente para o Fundador em qualquer tentativa de acesso.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setShowGenModal(true)}
              className="py-2.5 px-4 bg-blue-900 hover:bg-blue-950 active:bg-blue-900 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Sparkles size={16} />
              <span>Gerar Credenciais Automaticamente</span>
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
              title="Recarregar dados de acesso"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Utilizadores Ativos
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-slate-950">{users.length}</span>
              <span className="text-[11px] text-emerald-600 font-semibold">100% Auditados</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Proteção OTP (2FA)
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${otpRequired ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-sm font-bold text-slate-900">
                {otpRequired ? 'Ativo em Todos Logins' : 'Desativado'}
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Tokens de API Ativos
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-slate-950">
                {tokens.filter(t => t.status === 'ativo').length}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Chaves Válidas</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Notificação Fundador
            </span>
            <div className="flex items-center gap-1.5 mt-1 truncate" title={founderEmail}>
              <Mail size={13} className="text-blue-900 shrink-0" />
              <span className="text-xs font-bold text-slate-900 truncate">
                {founderEmail}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Cartão de Identificadores Fiscais Oficiais (NUIT & NUEL) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building size={18} className="text-blue-900" />
              <h2 className="text-base font-bold text-slate-950">
                Identificadores Oficiais da ClickPayroll (AT & Registo Comercial)
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Estes valores são inseridos automaticamente em faturas M/01, folhas de pagamento, guias de INSS e relatórios fiscais.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSwapValues}
              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Inverter posições do NUIT e NUEL caso digitados trocados"
            >
              <RefreshCw size={13} />
              <span>Inverter NUIT / NUEL</span>
            </button>
            <button
              onClick={handleResetOfficial}
              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              title="Restaurar NUIT oficial: 402302399 e NUEL oficial: 105086659"
            >
              Restaurar Oficiais
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Campo NUIT */}
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="input-nuit-clickpay" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>NUIT Oficial (ClickPay / Payroll Tech Mz)</span>
              </label>
              <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-950 px-2 py-0.5 rounded">
                Oficial AT: 402302399
              </span>
            </div>
            <input
              id="input-nuit-clickpay"
              type="text"
              value={nuit}
              onChange={(e) => setNuit(e.target.value)}
              placeholder="Ex: 402302399 ou 105086659"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent"
            />
            <p className="text-[11px] text-slate-500">
              Número Único de Identificação Tributária registrado perante a Autoridade Tributária de Moçambique.
            </p>
          </div>

          {/* Campo NUEL */}
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="input-nuel-clickpay" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>NUEL Oficial (Conservatória de Registo)</span>
              </label>
              <span className="text-[10px] font-mono font-bold bg-indigo-100 text-indigo-950 px-2 py-0.5 rounded">
                Oficial: 105086659
              </span>
            </div>
            <input
              id="input-nuel-clickpay"
              type="text"
              value={nuel}
              onChange={(e) => setNuel(e.target.value)}
              placeholder="Ex: 105086659 ou 402302399"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent"
            />
            <p className="text-[11px] text-slate-500">
              Número Único das Entidades Legais no Balcão de Atendimento Único e Conservatória de Maputo.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end pt-2">
          <button
            onClick={handleSaveNuitNuel}
            disabled={savingFiscal}
            className="py-2.5 px-5 bg-blue-900 hover:bg-blue-950 active:bg-blue-900 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-60"
          >
            {savingFiscal ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={16} />}
            <span>Salvar Globalmente na Configuração da Empresa</span>
          </button>
        </div>
      </div>

      {/* 3. Painel de Segurança OTP & Notificações ao Fundador */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-blue-900" />
              <h2 className="text-base font-bold text-slate-950">
                Autenticação de 2 Fatores (OTP) & Notificações de Acesso
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Quando habilitado, todo utilizador deve inserir um código de 6 dígitos enviado e auditado. O Fundador é avisado em tempo real de cada tentativa.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTestNotification}
              disabled={testingOtp}
              className="py-2 px-3.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
            >
              {testingOtp ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              <span>Testar Disparo de Alerta & OTP</span>
            </button>
          </div>
        </div>

        {/* Toggle & Recipient Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Status do OTP Toggle */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Regra de Acesso
              </span>
              <p className="text-sm font-bold text-slate-900">
                Exigir Código OTP no Login
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Gera um código temporário de 6 dígitos válido por 5 minutos em cada início de sessão.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
              <span className={`text-xs font-bold ${otpRequired ? 'text-emerald-700' : 'text-slate-500'}`}>
                {otpRequired ? 'ATIVADO (Obrigatório)' : 'DESATIVADO (Livre)'}
              </span>
              <button
                onClick={handleToggleOtp}
                disabled={togglingOtp}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${
                  otpRequired ? 'bg-blue-900' : 'bg-slate-300'
                }`}
                title={otpRequired ? 'Clique para desativar' : 'Clique para ativar'}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    otpRequired ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Destinatário Principal de Alertas */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 lg:col-span-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Canais Oficiais de Notificação do Fundador
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
              <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center gap-3">
                <span className="p-2 bg-blue-50 text-blue-900 rounded-md">
                  <Mail size={16} />
                </span>
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">E-mail Principal</span>
                  <p className="text-xs font-bold text-slate-900 truncate">{founderEmail}</p>
                </div>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center gap-3">
                <span className="p-2 bg-emerald-50 text-emerald-900 rounded-md">
                  <PhoneCall size={16} />
                </span>
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">SMS & WhatsApp</span>
                  <p className="text-xs font-bold text-slate-900 truncate">{founderPhones.join(' | ')}</p>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 pt-1">
              ✓ Notificação em tempo real enviada a cada login e em toda emissão de novas credenciais com carimbo de data/hora oficial.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Tabela de Utilizadores & Níveis de Acesso */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <KeyRound size={18} className="text-blue-900" />
              <h2 className="text-base font-bold text-slate-950">
                Utilizadores & Níveis de Acesso ao Sistema
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Lista de administradores, gestores setoriais e clientes empresa registados com os respetivos planos e permissões.
            </p>
          </div>

          <button
            onClick={() => setShowGenModal(true)}
            className="py-2 px-3.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer self-start sm:self-auto"
          >
            <UserPlus size={15} />
            <span>Novo Utilizador</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Utilizador</th>
                <th className="py-3 px-4">Nível de Acesso (Função)</th>
                <th className="py-3 px-4">Plano ERP</th>
                <th className="py-3 px-4">Empresa / Contacto</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {users.map((u) => {
                const isSuperAdmin = u.role === 'SUPER_ADMIN_PAYROLL';
                const roleBadgeColor = isSuperAdmin 
                  ? 'bg-purple-100 text-purple-950 border-purple-200' 
                  : u.role === 'GESTOR_RH' 
                  ? 'bg-blue-100 text-blue-950 border-blue-200'
                  : u.role === 'CONTABILISTA'
                  ? 'bg-emerald-100 text-emerald-950 border-emerald-200'
                  : 'bg-slate-100 text-slate-900 border-slate-200';

                return (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0">
                          {u.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-950 truncate">{u.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold border ${roleBadgeColor}`}>
                        {u.roleLabel || u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900">
                        {u.plan}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-slate-900 truncate max-w-[180px]">{u.companyName}</p>
                      <p className="text-[11px] text-slate-500">{u.phone}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Ativo
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => copyToClipboard(u.email, `email_${u.id}`, 'E-mail')}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Copiar e-mail"
                        >
                          {copiedKey === `email_${u.id}` ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        </button>
                        <button
                          onClick={() => downloadCredentialsTxt(u)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Descarregar Ficha de Acesso (.txt)"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Tabela de Tokens de API Ativos */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Server size={18} className="text-blue-900" />
              <h2 className="text-base font-bold text-slate-950">
                Tokens de API Ativos & Integrações Externas
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Chaves de integração segura para o SISSMO do INSS, gateways de pagamento Fintech (M-Pesa e e-Mola) e POS.
            </p>
          </div>

          <button
            onClick={() => setShowTokenModal(true)}
            className="py-2 px-3.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer self-start sm:self-auto"
          >
            <KeyRound size={15} />
            <span>Gerar Novo Token de API</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Identificação / Finalidade</th>
                <th className="py-3 px-4">Prefixo da Chave</th>
                <th className="py-3 px-4">Escopos Permitidos</th>
                <th className="py-3 px-4">Criado Em</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {tokens.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-950">{t.name}</p>
                    <p className="text-[11px] text-slate-400">Criado por: {t.createdBy}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <code className="text-[11px] font-mono bg-slate-100 text-slate-800 px-2 py-1 rounded">
                      {t.tokenPrefix}
                    </code>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1">
                      {t.scopes.map((s, idx) => (
                        <span key={idx} className="text-[10px] bg-slate-100 text-slate-700 font-mono px-1.5 py-0.5 rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                    {t.createdAt}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      t.status === 'ativo' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {t.status === 'ativo' ? 'Ativo' : 'Revogado'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => copyToClipboard(t.fullToken || t.tokenPrefix, `token_${t.id}`, 'Token')}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Copiar Chave do Token"
                      >
                        {copiedKey === `token_${t.id}` ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      </button>
                      {t.status === 'ativo' && (
                        <button
                          onClick={() => handleRevokeToken(t.id, t.name)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Revogar Token"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Registo de Auditoria de Acessos & Notificações ao Fundador */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-blue-900" />
            <h2 className="text-base font-bold text-slate-950">
              Auditoria em Tempo Real: Tentativas de Acesso & Alertas ao Fundador
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            Últimos eventos registados
          </span>
        </div>

        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {auditLogs.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">Nenhum evento registado na sessão recente.</p>
          ) : (
            auditLogs.map((log) => (
              <div 
                key={log.id} 
                className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      log.status === 'sucesso' ? 'bg-emerald-500' : log.status === 'bloqueado' ? 'bg-red-500' : 'bg-amber-500'
                    }`} />
                    <span className="font-bold text-slate-900">{log.event}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({log.userEmail})</span>
                  </div>
                  <p className="text-slate-600 truncate">{log.details}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-[11px] text-slate-400 font-mono">
                  <span>{log.timestamp}</span>
                  <span className="bg-slate-200/80 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                    Notificado Fundador
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL: Gerar Credenciais Automaticamente */}
      <AnimatePresence>
        {showGenModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 lg:p-7 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-900 text-white rounded-xl">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-950">
                      Gerar Credenciais Automaticamente
                    </h3>
                    <p className="text-xs text-slate-500">
                      Cria senha forte, token de API e despacha notificação para {founderEmail}.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowGenModal(false);
                    setGeneratedResult(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Se acabou de gerar, mostra o resultado com botão de cópia */}
              {generatedResult ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                      <CheckCircle2 size={18} />
                      <span>Credenciais Geradas & Ativadas com Sucesso!</span>
                    </div>
                    <p className="text-xs text-emerald-700">
                      O utilizador já se encontra ativo no sistema. Foi enviado um alerta ao fundador com os dados.
                    </p>

                    <div className="bg-white p-3 rounded-lg border border-emerald-200 space-y-2 text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-slate-500">Utilizador:</span>
                        <span className="font-bold text-slate-900">{generatedResult.name}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-slate-500">E-mail de Login:</span>
                        <div className="flex items-center gap-2">
                          <code className="font-bold font-mono text-slate-900">{generatedResult.email}</code>
                          <button
                            onClick={() => copyToClipboard(generatedResult.email, 'res_email', 'E-mail')}
                            className="p-1 hover:bg-slate-100 rounded text-slate-500 cursor-pointer"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-slate-500">Palavra-Passe Inicial:</span>
                        <div className="flex items-center gap-2">
                          <code className="font-bold font-mono text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
                            {generatedResult.rawPassword}
                          </code>
                          <button
                            onClick={() => copyToClipboard(generatedResult.rawPassword, 'res_pwd', 'Palavra-passe')}
                            className="p-1 hover:bg-slate-100 rounded text-slate-500 cursor-pointer"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-500">Token de API:</span>
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-[10px] text-slate-700 truncate max-w-[200px]">
                            {generatedResult.apiToken}
                          </code>
                          <button
                            onClick={() => copyToClipboard(generatedResult.apiToken, 'res_tok', 'Token API')}
                            className="p-1 hover:bg-slate-100 rounded text-slate-500 cursor-pointer"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => downloadCredentialsTxt(generatedResult)}
                      className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Download size={14} />
                      <span>Descarregar TXT</span>
                    </button>
                    <button
                      onClick={() => setGeneratedResult(null)}
                      className="py-2 px-4 bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Gerar Outro Utilizador
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleGenerateCredentials} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800">Nome do Colaborador / Empresa</label>
                    <input
                      type="text"
                      required
                      value={genNome}
                      onChange={(e) => {
                        setGenNome(e.target.value);
                        if (!genEmail) {
                          const clean = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '.');
                          if (clean) setGenEmail(`${clean}@clickpay.co.mz`);
                        }
                      }}
                      placeholder="Ex: Marta Manjate"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800">E-mail de Acesso</label>
                      <input
                        type="email"
                        required
                        value={genEmail}
                        onChange={(e) => setGenEmail(e.target.value)}
                        placeholder="Ex: marta.manjate@clickpay.co.mz"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800">Telemóvel (Para Notificações)</label>
                      <input
                        type="tel"
                        value={genPhone}
                        onChange={(e) => setGenPhone(e.target.value)}
                        placeholder="+258 84 123 4567"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800">Nível de Permissão (Função)</label>
                      <select
                        value={genRole}
                        onChange={(e) => setGenRole(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900"
                      >
                        <option value="GESTOR_RH">Gestor de Recursos Humanos & Folha</option>
                        <option value="CONTABILISTA">Contabilista Certificado (PGC & Impostos)</option>
                        <option value="OPERADOR_VENDAS">Operador de Facturação & Vendas</option>
                        <option value="CLIENTE_EMPRESA">Cliente Empresa (Portal Completo)</option>
                        <option value="SUPER_ADMIN_PAYROLL">Super Administrador (Fundador)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800">Plano de Subscrição</label>
                      <select
                        value={genPlan}
                        onChange={(e) => setGenPlan(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900"
                      >
                        <option value="Bronze">Starter (Bronze: 3.500 MT/mês)</option>
                        <option value="Silver">Profissional (Silver: 6.500 MT/mês)</option>
                        <option value="Gold">Empresarial (Gold: 9.500 MT/mês)</option>
                        <option value="Platinum">Platinum / Mestre (Custom)</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-950 space-y-1">
                    <span className="font-bold flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-blue-900" />
                      Geração Automática Segura
                    </span>
                    <p className="text-[11px] text-blue-800">
                      O sistema criará uma palavra-passe aleatória com 12 caracteres (incluindo números e caracteres especiais) e um token de API. O Fundador ({founderEmail}) receberá a confirmação de auditoria imediatamente.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowGenModal(false)}
                      className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={generating}
                      className="py-2.5 px-5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                    >
                      {generating ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
                      <span>Gerar & Notificar Fundador</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Novo Token de API */}
      <AnimatePresence>
        {showTokenModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-slate-900 text-white rounded-xl">
                    <KeyRound size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-950">
                      Criar Novo Token de API
                    </h3>
                    <p className="text-xs text-slate-500">
                      Chave criptográfica para integração via webhook e serviços externos.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTokenModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateToken} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">Finalidade / Nome do Token</label>
                  <input
                    type="text"
                    required
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                    placeholder="Ex: Integração ERP Filial Beira"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800">Escopos de Permissão</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { key: 'payroll:read', label: 'Consultar Folha (RH)' },
                      { key: 'payroll:write', label: 'Emitir Salários' },
                      { key: 'invoicing:write', label: 'Emitir Faturas (POS)' },
                      { key: 'sissmo:export', label: 'Exportar SISSMO INSS' },
                      { key: 'reports:read', label: 'Relatórios Fiscais PGC' },
                      { key: 'fintech:payout', label: 'Pagamentos Carteira Móvel' }
                    ].map((scope) => {
                      const isSelected = tokenScopes.includes(scope.key);
                      return (
                        <label
                          key={scope.key}
                          onClick={() => {
                            if (isSelected) {
                              setTokenScopes(tokenScopes.filter(s => s !== scope.key));
                            } else {
                              setTokenScopes([...tokenScopes, scope.key]);
                            }
                          }}
                          className={`p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-blue-50/80 border-blue-300 text-blue-950 font-semibold' 
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="rounded text-blue-900 pointer-events-none"
                          />
                          <span className="text-[11px] truncate">{scope.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowTokenModal(false)}
                    className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creatingToken}
                    className="py-2.5 px-5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {creatingToken ? <RefreshCw size={15} className="animate-spin" /> : <KeyRound size={15} />}
                    <span>Gerar Token</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
