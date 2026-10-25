import React, { useState, useEffect, useRef } from 'react';
import { Shield, Eye, EyeOff, Key, Lock, CheckCircle2, AlertTriangle, Copy, Check } from 'lucide-react';

export interface MaskedEnvItem {
  id: string;
  label: string;
  envKey: string;
  category: 'MASTER_KEY' | 'PAYMENT_TOKEN' | 'WEBHOOK_SECRET';
  provider: string;
  value: string;
}

interface EnvironmentMaskingProps {
  userRole?: string | null;
  containerId?: string;
}

const SENSITIVE_FIELD_PATTERNS = /chave|mestre|master|token|secret|api_key|apikey|password|senha|pin|mpesa|emola|webhook|bearer|private/i;

export default function EnvironmentMasking({
  userRole: propUserRole,
  containerId = 'settings_panel'
}: EnvironmentMaskingProps) {
  const localRole = typeof window !== 'undefined' ? localStorage.getItem('paytek_role') : null;
  const effectiveRole = propUserRole || localRole;
  const isAdmin = effectiveRole === 'SUPER_ADMIN' || effectiveRole === 'ADMIN';

  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [globalReveal, setGlobalReveal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [detectedDomFieldsCount, setDetectedDomFieldsCount] = useState<number>(0);
  const [autoMaskActive, setAutoMaskActive] = useState<boolean>(true);

  const [envSecrets, setEnvSecrets] = useState<MaskedEnvItem[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('paytek_env_masked_keys') : null;
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback to defaults
      }
    }
    return [
      {
        id: 'mk_erp_root',
        label: 'Chave Mestra de Encriptação ERP (AES-256)',
        envKey: 'PAYTEK_MASTER_ENCRYPTION_KEY',
        category: 'MASTER_KEY',
        provider: 'ClickPay Core Security',
        value: 'pk_master_mz_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c'
      },
      {
        id: 'tok_mpesa_b2c',
        label: 'Token de Pagamento M-Pesa Business (Vodacom MZ)',
        envKey: 'MPESA_API_BEARER_TOKEN',
        category: 'PAYMENT_TOKEN',
        provider: 'Vodacom M-Pesa API',
        value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mpesa_live_9001823'
      },
      {
        id: 'tok_emola_b2c',
        label: 'Token de Liquidação e-Mola Corporativo (Movitel)',
        envKey: 'EMOLA_MERCHANT_SECRET_TOKEN',
        category: 'PAYMENT_TOKEN',
        provider: 'Movitel e-Mola Gateway',
        value: 'emola_sec_live_77482910485729103847'
      },
      {
        id: 'wh_sissmo_at',
        label: 'Chave de Assinatura Digital SISSMO / AT',
        envKey: 'AT_SISSMO_SIGNING_SECRET',
        category: 'WEBHOOK_SECRET',
        provider: 'Autoridade Tributária MZ',
        value: 'whsec_sissmo_mz_44581920394857612300'
      }
    ];
  });

  const observerRef = useRef<MutationObserver | null>(null);

  // Deteta automaticamente campos de chaves mestras e tokens no DOM do painel de configurações
  useEffect(() => {
    const applyDomMasking = () => {
      const root = document.getElementById(containerId) || document;
      const inputs = root.querySelectorAll<HTMLInputElement>('input[data-env-sensitive="true"], input[name], input[placeholder], input[id]');
      let count = 0;

      inputs.forEach((input) => {
        const identifier = `${input.name || ''} ${input.id || ''} ${input.placeholder || ''} ${input.getAttribute('aria-label') || ''} ${input.getAttribute('data-env-key') || ''}`;
        const isSensitive = input.getAttribute('data-env-sensitive') === 'true' || SENSITIVE_FIELD_PATTERNS.test(identifier);

        if (isSensitive) {
          count++;
          input.setAttribute('data-masked-by-env-guard', 'true');
          if (autoMaskActive && !globalReveal && !revealedIds[input.id || input.name]) {
            if (input.type !== 'password') {
              input.setAttribute('data-original-type', input.type);
              input.type = 'password';
            }
          } else if (isAdmin && (globalReveal || revealedIds[input.id || input.name])) {
            const orig = input.getAttribute('data-original-type') || 'text';
            if (input.type === 'password') {
              input.type = orig;
            }
          }
        }
      });

      setDetectedDomFieldsCount(count + envSecrets.length);
    };

    applyDomMasking();

    const targetNode = document.getElementById(containerId) || document.body;
    observerRef.current = new MutationObserver(() => {
      applyDomMasking();
    });

    observerRef.current.observe(targetNode, {
      childList: true,
      subtree: true
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [containerId, autoMaskActive, globalReveal, revealedIds, isAdmin, envSecrets.length]);

  const formatAsterisks = (val: string) => {
    if (!val) return '••••••••••••••••';
    const len = Math.min(Math.max(val.length, 12), 24);
    return '*'.repeat(len);
  };

  const toggleSingleVisibility = (id: string) => {
    if (!isAdmin) return;
    setRevealedIds((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleAllVisibility = () => {
    if (!isAdmin) return;
    const nextState = !globalReveal;
    setGlobalReveal(nextState);
    const updated: Record<string, boolean> = {};
    envSecrets.forEach((item) => {
      updated[item.id] = nextState;
    });
    setRevealedIds(updated);
  };

  const handleSecretChange = (id: string, newValue: string) => {
    if (!isAdmin) return;
    const updated = envSecrets.map((item) =>
      item.id === id ? { ...item, value: newValue } : item
    );
    setEnvSecrets(updated);
    localStorage.setItem('paytek_env_masked_keys', JSON.stringify(updated));
  };

  const handleCopy = (id: string, value: string) => {
    if (!isAdmin) return;
    navigator.clipboard.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      id="environment_masking_panel"
      className="bg-white rounded-2xl p-6 shadow-sm border-2 border-slate-900 space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-900 text-amber-400 rounded-xl shadow-xs">
            <Shield size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-900 text-sm">
                Environment Masking (Proteção de Chaves Mestras & Tokens)
              </h3>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                ATIVO
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Deteção automática e ofuscação por asteriscos de variáveis de ambiente, chaves mestras e tokens de pagamento.
            </p>
          </div>
        </div>

        {/* Admin Global Visibility Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {isAdmin ? (
            <button
              type="button"
              onClick={toggleAllVisibility}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer border ${
                globalReveal
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-600 shadow-xs'
                  : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-800'
              }`}
              title={globalReveal ? 'Ocultar todas as chaves com asteriscos' : 'Revelar chaves (Apenas Admin)'}
            >
              {globalReveal ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>{globalReveal ? 'Mascarar Todas (***)' : 'Revelar Chaves (Admin)'}</span>
            </button>
          ) : (
            <div className="px-3 py-1.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-[10px] font-bold flex items-center gap-1.5">
              <Lock size={12} className="text-slate-500" />
              <span>Visibilidade Restrita ao Perfil Admin</span>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Campos Sensíveis Detetados</span>
            <span className="font-mono font-extrabold text-slate-800">{detectedDomFieldsCount} Campos Protegidos</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Key size={16} className="text-blue-700 shrink-0" />
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Modo de Mascaramento</span>
            <span className="font-mono font-extrabold text-slate-800">Substituição por Asteriscos (***)</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Lock size={16} className={isAdmin ? 'text-amber-600 shrink-0' : 'text-rose-600 shrink-0'} />
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Nível de Permissão Atual</span>
            <span className="font-mono font-extrabold text-slate-800">
              {isAdmin ? 'Administrador (Toggle Permitido)' : 'Cliente / Operador (Bloqueado)'}
            </span>
          </div>
        </div>
      </div>

      {/* Masked Environment Keys List */}
      <div className="space-y-3">
        {envSecrets.map((secret) => {
          const isRevealed = isAdmin && (globalReveal || !!revealedIds[secret.id]);
          const maskedDisplay = formatAsterisks(secret.value);

          return (
            <div
              key={secret.id}
              className="p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[9px] font-black px-2 py-0.5 rounded uppercase font-mono ${
                      secret.category === 'MASTER_KEY'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : secret.category === 'PAYMENT_TOKEN'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                    }`}
                  >
                    {secret.category === 'MASTER_KEY'
                      ? 'CHAVE MESTRA'
                      : secret.category === 'PAYMENT_TOKEN'
                      ? 'TOKEN PAGAMENTO'
                      : 'ASSINATURA API'}
                  </span>
                  <span className="text-xs font-bold text-slate-800">{secret.label}</span>
                </div>
                <span className="text-[10px] font-mono font-semibold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                  ENV: {secret.envKey}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  {isRevealed ? (
                    <input
                      type="text"
                       data-env-sensitive="true"
                      data-env-key={secret.envKey}
                      value={secret.value}
                      onChange={(e) => handleSecretChange(secret.id, e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-400 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    />
                  ) : (
                    <input
                      type="text"
                      readOnly
                      data-env-sensitive="true"
                      data-env-key={secret.envKey}
                      value={maskedDisplay}
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-black tracking-widest text-slate-600 select-none cursor-not-allowed focus:outline-none"
                      title="Campo protegido por Environment Masking"
                    />
                  )}
                </div>

                {/* Visibility Toggle Button (Only active/rendered for Admin) */}
                {isAdmin ? (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleSingleVisibility(secret.id)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                        isRevealed
                          ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                      title={isRevealed ? 'Ocultar chave com asteriscos' : 'Mostrar chave original'}
                    >
                      {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                      <span className="hidden sm:inline">{isRevealed ? 'Ocultar' : 'Mostrar'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy(secret.id, secret.value)}
                      className="p-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                      title="Copiar valor"
                    >
                      {copiedId === secret.id ? (
                        <Check size={14} className="text-emerald-600" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </>
                ) : (
                  <span
                    className="px-2.5 py-2 bg-slate-100 text-slate-400 border border-slate-200 rounded-lg text-[10px] font-bold flex items-center gap-1 select-none"
                    title="Apenas administradores podem revelar chaves mestras e tokens"
                  >
                    <Lock size={12} />
                    Bloqueado
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Security Footer Notice */}
      <div className="bg-slate-900 text-slate-200 p-3.5 rounded-xl flex items-start gap-3 text-[11px] leading-relaxed">
        <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white">Proteção de Ambiente Ativa: </span>
          Todos os campos detetados como chaves mestras (`MASTER_KEY`) ou credenciais de gateway (`PAYMENT_TOKEN`) são automaticamente substituídos por asteriscos (`*`) na interface. Apenas contas com perfil de <b>Administrador</b> possuem o controlo de alternância (toggle) de visibilidade.
        </div>
      </div>
    </div>
  );
}
