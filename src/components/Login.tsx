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
}

export default function Login({ selectedPlan, onSelectPlan, onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fill credentials helper
  const handlePrefill = (prefEmail: string, prefPass: string, plan: 'Bronze' | 'Silver' | 'Gold' | null) => {
    setEmail(prefEmail);
    setPassword(prefPass);
    if (onSelectPlan && plan) {
      onSelectPlan(plan);
    }
  };

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
      setError('Não foi possível estabelecer ligação com o servidor da Payroll Tech.');
    } finally {
      setLoading(false);
    }
  };

  const showDemoCredentials = true;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 lg:p-8 font-sans text-slate-800">
      <div className={showDemoCredentials ? "w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start" : "w-full max-w-md"}>
        {/* Left column: Login Card */}
        <motion.div 
           initial={{ opacity: 0, y: 15 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.4, ease: 'easeOut' }}
           className={`${showDemoCredentials ? 'lg:col-span-7' : ''} bg-white p-8 sm:p-10 rounded-2xl shadow-xl shadow-slate-100 border border-slate-100 space-y-6 w-full`}
        >
          {/* Header Logo Area */}
          <div className="text-center mb-[20px]" id="login_logo_area">
            <img 
              src="logo-payroll.png" 
              alt="PAYROLL TECH MZ" 
              style={{ width: '120px', height: 'auto', marginBottom: '8px' }} 
              className="mx-auto"
              referrerPolicy="no-referrer"
            />
            <h2 style={{ color: '#1e3a8a', margin: 0, fontSize: '22px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
              PAYROLL TECH MZ
            </h2>
            <p style={{ color: '#059669', fontWeight: 600, margin: '5px 0 0 0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Gestão salarial e pagamentos num clique.
            </p>
          </div>

          {/* PLAN PREVIEW CARD & SELECTOR (INTEGRADO DO ERP) */}
          {(() => {
            const planDetailsMap = {
              'Bronze': {
                nome: "Construtora & Obras do Limpopo Lda 🏗️",
                preco: "1.500,00 MT/mês",
                limite: "Sector: Construção & Engenharia",
                email: "construcao@payrolltech.co.mz",
                senha: "construcao2026",
                cor: "text-amber-700 border-amber-200 bg-amber-50/10"
              },
              'Silver': {
                nome: "Instituto de Ensino do Rovuma Lda 🎓",
                preco: "3.000,00 MT/mês",
                limite: "Sector: Educação & Formação",
                email: "educacao@payrolltech.co.mz",
                senha: "educacao2026",
                cor: "text-[#059669] border-emerald-200 bg-emerald-50/10"
              },
              'Gold': {
                nome: "Kuvanga Tecnologias & Consultoria Lda 💻",
                preco: "4.500,00 MT/mês",
                limite: "Sector: Serviços & Tecnologia",
                email: "servicos@payrolltech.co.mz",
                senha: "servicos2026",
                cor: "text-[#1E3A8A] border-blue-200 bg-blue-50/10"
              }
            };

            const activePlan = selectedPlan || 'Bronze';
            const details = planDetailsMap[activePlan];

            return (
              <div id="cartao_plano_preview" className="bg-blue-50/60 border-2 border-blue-600/80 p-4 rounded-xl space-y-3.5 shadow-sm text-left">
                <div>
                  <span className="text-[9px] text-blue-900 font-extrabold uppercase tracking-widest block mb-1">
                    🌟 Plano Pré-Selecionado na Landing Page:
                  </span>
                  <div className="flex justify-between items-center">
                    <div>
                      <b id="lbl_nome_plano" className="text-sm font-black text-blue-950 block">
                        {details.nome}
                      </b>
                      <div id="lbl_limite_plano" className="text-[10px] text-slate-500 font-bold mt-0.5">
                        Limite: {details.limite}
                      </div>
                    </div>
                    <div className="text-right">
                      <span id="lbl_preco_plano" className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                        {details.preco}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-blue-100/80 space-y-2">
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wide">
                    Deseja alterar o seu plano de teste?
                  </label>
                  <select 
                    id="seletor_planos_manual"
                    value={activePlan === 'Bronze' && new URLSearchParams(window.location.search).get('plano') === 'teste-gratis' ? 'teste-gratis' : activePlan}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (onSelectPlan) {
                        if (val === 'teste-gratis') {
                          onSelectPlan('Bronze');
                          // Update credentials to bronze too
                          setEmail('bronze@payrolltech.co.mz');
                          setPassword('bronze2026');
                        } else {
                          onSelectPlan(val as 'Bronze' | 'Silver' | 'Gold');
                          const planCreds = planDetailsMap[val as 'Bronze' | 'Silver' | 'Gold'];
                          setEmail(planCreds.email);
                          setPassword(planCreds.senha);
                        }
                      }
                    }}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-900/15 cursor-pointer shadow-xs"
                  >
                    <option value="Bronze">Plano Base - 1.500 MT/mês (Até 5 colaboradores)</option>
                    <option value="Silver">Plano Profissional - 3.000 MT/mês (Até 15 colaboradores)</option>
                    <option value="Gold">Plano Empresarial - 4.500 MT/mês (Até 20 colaboradores)</option>
                    <option value="teste-gratis">Teste Gratuito por 30 Dias (Sem custos iniciais)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEmail(details.email);
                    setPassword(details.senha);
                  }}
                  className="w-full py-1.5 bg-blue-900 hover:bg-blue-950 text-white font-extrabold rounded-lg text-[10px] uppercase tracking-wider transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-xs"
                >
                  ⚡ Aplicar Credenciais deste Plano
                </button>
              </div>
            );
          })()}

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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Mail size={13} className="text-slate-400" />
                E-mail da sua Empresa
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@empresa.co.mz"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a sua senha"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-900 hover:bg-blue-850 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md cursor-pointer text-xs flex items-center justify-center gap-2 transition-colors mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  A iniciar sessão com segurança...
                </>
              ) : (
                <>
                  ENTRAR NO SISTEMA
                  <ChevronRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Canal de aquisição de clientes (Vendas) */}
          <a 
            href="mailto:gersonjcumbane@gmail.com?subject=Solicita%C3%A7%C3%A3o%20de%20Registo%20-%20Payroll%20Tech%20Mz&body=Ol%C3%A1%20Gerson%2C%20gostaria%20de%20solicitar%20o%20registo%20comercial%20da%20minha%20empresa%20na%20plataforma%20Payroll%20Tech%20MZ." 
            target="_blank" 
            rel="noopener noreferrer"
            className="block text-center py-3 px-4 border-2 border-dashed border-blue-900 hover:border-blue-950 hover:bg-blue-50 text-blue-900 hover:text-blue-950 font-extrabold rounded-xl text-[11px] tracking-wide transition-all cursor-pointer"
          >
            ✉️ NÃO TEM CONTA? SOLICITAR REGISTO POR E-MAIL
          </a>

          <div className="text-center pt-2 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              Esqueceu-se da senha?{' '}
              <a href="#" className="text-blue-900 hover:underline font-bold inline-flex items-center gap-0.5">
                Pedir ajuda ao suporte
              </a>
            </div>
          </div>
        </motion.div>

        {/* Right column: Interactive Credentials panel for testing (Only shown if showDemoCredentials is true) */}
        {showDemoCredentials && (
          <motion.div 
             initial={{ opacity: 0, x: 15 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
             className="lg:col-span-5 space-y-4"
          >
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-md shadow-slate-100 space-y-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  🔑 Credenciais de Demonstração
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Selecione ou clique numa das contas abaixo para preencher o formulário automaticamente e testar os planos correspondentes:
                </p>
              </div>

              <div className="space-y-3">
                {/* Master Creds */}
                <button
                  type="button"
                  onClick={() => handlePrefill('admin@payrolltech.co.mz', 'UEM_Finanças_Engenharia_2026!', null)}
                  className="w-full text-left p-3.5 rounded-xl border border-blue-100 bg-blue-50/20 hover:bg-blue-50/50 transition-all flex flex-col gap-1 cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-blue-900 flex items-center gap-1">
                      👑 Credenciais Mestre (Super Admin)
                    </span>
                    <span className="text-[9px] font-mono bg-blue-900 text-white px-1.5 py-0.5 rounded">Preencher</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Permite gerir e adicionar empresas clientes do zero. O ERP inicia 100% limpo sem clientes por omissão.
                  </p>
                  <div className="text-[10px] font-mono text-slate-600 mt-1 pt-1 border-t border-blue-50/60">
                    Email: <span className="font-bold">admin@payrolltech.co.mz</span>
                  </div>
                </button>

                {/* Sector 1: Construção */}
                <button
                  type="button"
                  onClick={() => handlePrefill('construcao@payrolltech.co.mz', 'construcao2026', 'Bronze')}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1 cursor-pointer group ${
                    selectedPlan === 'Bronze' ? 'border-amber-300 bg-amber-50/30' : 'border-slate-100 bg-slate-50/30 hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-amber-900 flex items-center gap-1">
                      🏗️ Sector 1: Construção Civil & Engenharia
                    </span>
                    <span className="text-[9px] font-mono bg-amber-800 text-white px-1.5 py-0.5 rounded">Preencher</span>
                  </div>
                  <p className="text-[10px] text-slate-600 font-semibold leading-normal">
                    Construtora & Obras do Limpopo Lda — Apenas salários brutos (65k, 32k, 24k MT). Sem compras nem vendas (0 MT).
                  </p>
                  <div className="text-[10px] font-mono text-slate-600 mt-1 pt-1 border-t border-slate-100 flex justify-between">
                    <span>Email: <b className="text-slate-800">construcao@payrolltech.co.mz</b></span>
                    <span>Senha: <b className="text-slate-800">construcao2026</b></span>
                  </div>
                </button>

                {/* Sector 2: Educação */}
                <button
                  type="button"
                  onClick={() => handlePrefill('educacao@payrolltech.co.mz', 'educacao2026', 'Silver')}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1 cursor-pointer group ${
                    selectedPlan === 'Silver' ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-100 bg-slate-50/30 hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-emerald-900 flex items-center gap-1">
                      🎓 Sector 2: Educação & Formação Profissional
                    </span>
                    <span className="text-[9px] font-mono bg-emerald-800 text-white px-1.5 py-0.5 rounded">Preencher</span>
                  </div>
                  <p className="text-[10px] text-slate-600 font-semibold leading-normal">
                    Instituto de Ensino do Rovuma Lda — Apenas salários brutos (70k, 55k, 28k MT). Sem compras nem vendas (0 MT).
                  </p>
                  <div className="text-[10px] font-mono text-slate-600 mt-1 pt-1 border-t border-slate-100 flex justify-between">
                    <span>Email: <b className="text-slate-800">educacao@payrolltech.co.mz</b></span>
                    <span>Senha: <b className="text-slate-800">educacao2026</b></span>
                  </div>
                </button>

                {/* Sector 3: Serviços */}
                <button
                  type="button"
                  onClick={() => handlePrefill('servicos@payrolltech.co.mz', 'servicos2026', 'Gold')}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1 cursor-pointer group ${
                    selectedPlan === 'Gold' ? 'border-blue-300 bg-blue-50/30' : 'border-slate-100 bg-slate-50/30 hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-blue-900 flex items-center gap-1">
                      💻 Sector 3: Serviços & Tecnologia
                    </span>
                    <span className="text-[9px] font-mono bg-blue-900 text-white px-1.5 py-0.5 rounded">Preencher</span>
                  </div>
                  <p className="text-[10px] text-slate-600 font-semibold leading-normal">
                    Kuvanga Tecnologias & Consultoria Lda — Apenas salários brutos (95k, 85k, 38k MT). Sem compras nem vendas (0 MT).
                  </p>
                  <div className="text-[10px] font-mono text-slate-600 mt-1 pt-1 border-t border-slate-100 flex justify-between">
                    <span>Email: <b className="text-slate-800">servicos@payrolltech.co.mz</b></span>
                    <span>Senha: <b className="text-slate-800">servicos2026</b></span>
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Regulatory Footer */}
      <div className="mt-8 text-center text-[10px] text-slate-400 max-w-sm px-4">
        <p className="flex items-center justify-center gap-1 font-semibold text-slate-500">
          <ShieldCheck size={12} className="text-emerald-600" />
          Gateway PayTek Moçambique Protegido
        </p>
        <p className="mt-1">
          Regulado pela Autoridade Tributária e INSS. Todo o tráfego é encriptado com chaves SSL de 256 bits.
        </p>
      </div>
    </div>
  );
}
