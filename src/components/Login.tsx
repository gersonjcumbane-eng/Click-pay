/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Lock, Mail, ChevronRight, AlertCircle, Phone } from 'lucide-react';

interface LoginProps {
  selectedPlan?: 'Bronze' | 'Silver' | 'Gold' | null;
  onSelectPlan?: (plan: 'Bronze' | 'Silver' | 'Gold' | null) => void;
  onLoginSuccess: () => void;
  onEnterRegister?: () => void;
}

export default function Login({ onLoginSuccess, onEnterRegister }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok && data.sucesso) {
        // Guardar token e autenticar
        localStorage.setItem('paytek_auth', 'true');
        localStorage.setItem('paytek_token', data.token);
        localStorage.setItem('paytek_user', email);
        if (data.usuario) {
          if (data.usuario.funcao) {
            localStorage.setItem('paytek_role', data.usuario.funcao);
          }
          localStorage.setItem('paytek_sub_status', data.usuario.subscription_status || 'ativo');
          localStorage.setItem('paytek_sub_plan', data.usuario.subscription_plan || 'Bronze');
          localStorage.setItem('paytek_sub_expire', data.usuario.next_billing_date || '2026-07-28');
          localStorage.setItem('paytek_company_name', data.usuario.nome_empresa || '');
        }
        onLoginSuccess();
      } else {
        setError(data.erro || 'Falha na autenticação. Verifique os dados inseridos.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Não foi possível estabelecer ligação com o servidor da ClickPay.');
    } finally {
      setLoading(false);
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
          <div className="text-center mb-4" id="login_logo_area">
            <img 
              src="/logo-payroll.png" 
              alt="ClickPay Moçambique" 
              style={{ width: '110px', height: 'auto', marginBottom: '10px' }} 
              className="mx-auto"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="flex items-center justify-center gap-1.5">
              <h2 className="text-xl font-black text-slate-950 tracking-tight">
                ClickPay
              </h2>
              <span className="text-[10px] bg-blue-900 text-white font-extrabold px-1.5 py-0.5 rounded uppercase tracking-widest">
                .CO.MZ
              </span>
            </div>
            <p className="text-emerald-700 font-bold mt-1 text-[11px] uppercase tracking-wider">
              Acesso Seguro ao Painel ERP
            </p>
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

          {/* Login Form */}
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
                  ENTRAR NO ERP
                  <ChevronRight size={14} />
                </>
              )}
            </button>
          </form>

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
