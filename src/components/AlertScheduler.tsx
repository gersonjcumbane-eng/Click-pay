/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Bell, 
  Settings2, 
  Calendar, 
  Play, 
  CheckCircle2, 
  Trash2, 
  Clock, 
  Lock, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  Eye, 
  Check,
  AlertTriangle,
  Cpu,
  Info,
  AlertCircle,
  Sparkles,
  Bot
} from 'lucide-react';
import { CompanyData } from '../types';
import { 
  isNotificationSupported, 
  requestNotificationPermission, 
  getNotificationPermissionState, 
  sendBrowserNotification 
} from '../utils/notifications';

interface AlertConfig {
  email_destino: string;
  enviar_expiracao_contrato: boolean;
  enviar_fim_experiencia: boolean;
  enviar_obrigacao_inss: boolean;
  enviar_obrigacao_irps: boolean;
  enviar_obrigacao_iva: boolean;
  frequencia: string;
  dias_antecedencia_aviso: number;
}

interface AlertHistoryItem {
  id: string;
  data_envio: string;
  tipo_alerta: "CONTRATO_EXPIRANDO" | "EXPERIENCIA_FIM" | "FISCAL_INSS" | "FISCAL_IRPS" | "FISCAL_IVA" | "ASSINATURA_ATIVA" | "CADASTRO_COLABORADOR";
  destinatario: string;
  assunto: string;
  status: string;
  conteudo_html: string;
  detalhes_sucesso: string;
}

interface AlertSchedulerProps {
  company: CompanyData;
  onReloadMainMetrics?: () => Promise<void>;
}

export default function AlertScheduler({ company, onReloadMainMetrics }: AlertSchedulerProps) {
  const [config, setConfig] = useState<AlertConfig>({
    email_destino: company.email || "gestor@suaempresa.co.mz",
    enviar_expiracao_contrato: true,
    enviar_fim_experiencia: true,
    enviar_obrigacao_inss: true,
    enviar_obrigacao_irps: true,
    enviar_obrigacao_iva: true,
    frequencia: "diario",
    dias_antecedencia_aviso: 30
  });

  const [history, setHistory] = useState<AlertHistoryItem[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [runningScheduler, setRunningScheduler] = useState(false);
  const [showConfigSuccess, setShowConfigSuccess] = useState(false);
  const [simulatedDate, setSimulatedDate] = useState("2026-06-26");
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'all' | 'contratos' | 'fiscal'>('all');
  const [notificationPermission, setNotificationPermission] = useState(getNotificationPermissionState());

  // Copiloto Regulatório IA States
  const [copilotoResposta, setCopilotoResposta] = useState<{
    titulo: string;
    modelo_ia: string;
    parecer_legal: string;
    timestamp_auditoria?: string;
  } | null>(null);
  const [loadingCopiloto, setLoadingCopiloto] = useState(false);
  const [copilotoErro, setCopilotoErro] = useState<string | null>(null);

  const consultarCopiloto = async (topico: string) => {
    setLoadingCopiloto(true);
    setCopilotoErro(null);
    try {
      const res = await fetch('/api/copiloto/consultar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topico })
      });
      if (!res.ok) throw new Error('Não foi possível obter a resposta do copiloto.');
      const data = await res.json();
      setCopilotoResposta(data);
    } catch (err: any) {
      setCopilotoErro(err.message || 'Erro ao ligar com o copiloto IA.');
    } finally {
      setLoadingCopiloto(false);
    }
  };

  // Request browser notification permission
  const handleRequestPermission = async () => {
    const status = await requestNotificationPermission();
    setNotificationPermission(status);
    if (status === 'granted') {
      sendBrowserNotification(
        "🔔 Notificações Ativadas!",
        "Agora você receberá alertas diretos do Payroll Tech MZ no seu navegador."
      );
    }
  };

  // Load scheduler config and logs history from server
  const loadSchedulerData = async () => {
    setLoadingConfig(true);
    setLoadingHistory(true);
    try {
      const [configRes, historyRes] = await Promise.all([
        fetch('/api/alerts/config'),
        fetch('/api/alerts/history')
      ]);

      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData);
      }
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData);
      }
    } catch (err) {
      console.error("Erro ao carregar dados do agendador:", err);
    } finally {
      setLoadingConfig(false);
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadSchedulerData();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setShowConfigSuccess(false);
    try {
      const res = await fetch('/api/alerts/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        setShowConfigSuccess(true);
        setTimeout(() => setShowConfigSuccess(false), 3000);
      } else {
        alert("Erro ao salvar configurações do agendador.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao comunicar com o servidor.");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTriggerManualCheck = async () => {
    setRunningScheduler(true);
    try {
      const res = await fetch('/api/alerts/trigger-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataSimulada: simulatedDate })
      });
      if (res.ok) {
        const data = await res.json();
        // Reload history to show newly generated emails instantly!
        await loadSchedulerData();
        if (onReloadMainMetrics) {
          await onReloadMainMetrics();
        }
        
        // Auto-expand the first new alert if any were generated
        if (data.novasNotificacoes && data.novasNotificacoes.length > 0) {
          setExpandedAlertId(data.novasNotificacoes[0].id);
          
          // Send Native Browser Notifications for each new pending tax/contract alert!
          data.novasNotificacoes.forEach((alerta: any) => {
            sendBrowserNotification(
              alerta.assunto,
              "Lembrete de Obrigação Pendente ou Expiração de Contrato. Verifique a Central de Alertas."
            );
          });
        } else {
          // Send general notification that check was run successfully
          sendBrowserNotification(
            "✓ Verificação Concluída",
            `A verificação automática para a data ${new Date(simulatedDate).toLocaleDateString('pt-MZ')} foi concluída. Nenhuma obrigação pendente encontrada.`
          );
          alert(`Verificação do dia ${new Date(simulatedDate).toLocaleDateString('pt-MZ')} finalizada. Nenhuma obrigação iminente ou expiração nova encontrada para esta data específica.`);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao disparar verificação.");
    } finally {
      setRunningScheduler(false);
    }
  };

  const handleClearHistory = async () => {
    if (confirm("Deseja apagar todo o histórico de e-mails de alerta enviados?")) {
      try {
        const res = await fetch('/api/alerts/clear-history', { method: 'POST' });
        if (res.ok) {
          setHistory([]);
          setExpandedAlertId(null);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Filter history based on tabs
  const filteredHistory = history.filter(item => {
    if (activeHistoryTab === 'all') return true;
    if (activeHistoryTab === 'contratos') {
      return item.tipo_alerta === 'CONTRATO_EXPIRANDO' || item.tipo_alerta === 'EXPERIENCIA_FIM';
    }
    if (activeHistoryTab === 'fiscal') {
      return item.tipo_alerta === 'FISCAL_INSS' || item.tipo_alerta === 'FISCAL_IRPS' || item.tipo_alerta === 'FISCAL_IVA';
    }
    return true;
  });

  const getAlertBadgeStyles = (tipo: string) => {
    switch(tipo) {
      case 'CONTRATO_EXPIRANDO':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'EXPERIENCIA_FIM':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'FISCAL_INSS':
        return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'FISCAL_IRPS':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'FISCAL_IVA':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'ASSINATURA_ATIVA':
        return 'bg-violet-50 text-violet-700 border-violet-150';
      case 'CADASTRO_COLABORADOR':
        return 'bg-teal-50 text-teal-700 border-teal-150';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getAlertLabel = (tipo: string) => {
    switch(tipo) {
      case 'CONTRATO_EXPIRANDO': return 'Expiração de Contrato';
      case 'EXPERIENCIA_FIM': return 'Termo de Experiência';
      case 'FISCAL_INSS': return 'Obrigação INSS (SISSMO)';
      case 'FISCAL_IRPS': return 'Retenção IRPS';
      case 'FISCAL_IVA': return 'Declaração IVA';
      case 'ASSINATURA_ATIVA': return 'Subscrição Ativa';
      case 'CADASTRO_COLABORADOR': return 'Cadastro Efetuado';
      default: return 'Alerta Geral';
    }
  };

  return (
    <div className="space-y-6" id="alerts-scheduler-wrapper">
      
      {/* Welcome Title Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-50 text-blue-900 rounded-lg">
              <Bell size={18} />
            </span>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Central de Alertas & Agendamentos</h2>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Configure e gerencie o sistema automático de lembretes que monitoriza em tempo real as obrigações fiscais da <b>Autoridade Tributária</b> e prazos de contratos laborais sob a <b>Lei do Trabalho de Moçambique</b>.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          {/* Browser Notification Integration Settings */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
            <span className={`w-2 h-2 rounded-full ${notificationPermission === 'granted' ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
            <div className="text-left mr-2">
              <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Notificações do Navegador</div>
              <div className="text-[11px] font-bold text-slate-700">
                {notificationPermission === 'granted' ? 'Permitido / Ativo' : 'Não Ativado'}
              </div>
            </div>
            {notificationPermission !== 'granted' && (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="px-2.5 py-1 bg-blue-900 hover:bg-blue-950 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
              >
                Ativar
              </button>
            )}
            {notificationPermission === 'granted' && (
              <button
                type="button"
                onClick={() => sendBrowserNotification("📢 Teste de Alerta!", "As notificações do navegador estão funcionando perfeitamente no seu sistema!")}
                className="px-2 py-0.5 border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-[9px] rounded-md transition-colors cursor-pointer"
              >
                Testar
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Agendador Activo</span>
          </div>
        </div>
      </div>

      {/* 📅 Calendário de Obrigações Fiscais e Prazos de Pagamentos */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-slate-950">Calendário de Obrigações Fiscais & Prazos Legais (Moçambique)</h3>
            <p className="text-[11px] text-slate-500">Datas regulamentares de pagamento de impostos à Autoridade Tributária e Segurança Social.</p>
          </div>
          <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-full text-[10px] font-bold text-slate-600 font-mono">
            Ano Fiscal: 2026
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          
          {/* Card 1: INSS */}
          <div className="bg-gradient-to-br from-indigo-50/40 to-white border border-indigo-100 rounded-xl p-4 space-y-3 relative overflow-hidden group hover:shadow-md hover:border-indigo-200 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform"></div>
            <div className="flex items-start justify-between">
              <div className="p-2 bg-indigo-100/60 rounded-lg text-indigo-700">
                <Clock size={16} />
              </div>
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-extrabold uppercase rounded-md tracking-wide">
                Até Dia 10
              </span>
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-900">INSS (Segurança Social)</h4>
              <p className="text-[10.5px] text-slate-500 leading-relaxed">
                Submissão de folha eletrónica (SISSMO) e pagamento das contribuições (<b>3% do trabalhador + 4% patronal</b>) referentes ao mês anterior.
              </p>
            </div>
            <div className="border-t border-indigo-100/50 pt-2 flex items-center justify-between text-[9.5px]">
              <span className="text-slate-400 font-semibold">Alerta automático:</span>
              <span className="text-indigo-700 font-extrabold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span> Dias 1 a 10
              </span>
            </div>
          </div>

          {/* Card 2: IRPS */}
          <div className="bg-gradient-to-br from-rose-50/40 to-white border border-rose-100 rounded-xl p-4 space-y-3 relative overflow-hidden group hover:shadow-md hover:border-rose-200 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform"></div>
            <div className="flex items-start justify-between">
              <div className="p-2 bg-rose-100/60 rounded-lg text-rose-700">
                <AlertTriangle size={16} />
              </div>
              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-extrabold uppercase rounded-md tracking-wide">
                Até Dia 20
              </span>
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-900">IRPS (Retenção na Fonte)</h4>
              <p className="text-[10.5px] text-slate-500 leading-relaxed">
                Entrega do imposto retido na fonte sobre rendimentos de trabalho dependente (M19) e retenções de serviços de terceiros.
              </p>
            </div>
            <div className="border-t border-rose-100/50 pt-2 flex items-center justify-between text-[9.5px]">
              <span className="text-slate-400 font-semibold">Alerta automático:</span>
              <span className="text-rose-700 font-extrabold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span> Dias 10 a 20
              </span>
            </div>
          </div>

          {/* Card 3: IVA */}
          <div className="bg-gradient-to-br from-emerald-50/40 to-white border border-emerald-100 rounded-xl p-4 space-y-3 relative overflow-hidden group hover:shadow-md hover:border-emerald-200 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform"></div>
            <div className="flex items-start justify-between">
              <div className="p-2 bg-emerald-100/60 rounded-lg text-emerald-700">
                <Calendar size={16} />
              </div>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase rounded-md tracking-wide">
                Fim do Mês
              </span>
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-900">IVA (Valor Acrescentado)</h4>
              <p className="text-[10.5px] text-slate-500 leading-relaxed">
                Submissão da Declaração Periódica do <b>Modelo A</b> e guias de pagamento associadas relativas às transações tributáveis do mês anterior.
              </p>
            </div>
            <div className="border-t border-emerald-100/50 pt-2 flex items-center justify-between text-[9.5px]">
              <span className="text-slate-400 font-semibold">Alerta automático:</span>
              <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Últimos 5 dias
              </span>
            </div>
          </div>

          {/* Card 4: Lei do Trabalho */}
          <div className="bg-gradient-to-br from-blue-50/40 to-white border border-blue-100 rounded-xl p-4 space-y-3 relative overflow-hidden group hover:shadow-md hover:border-blue-200 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform"></div>
            <div className="flex items-start justify-between">
              <div className="p-2 bg-blue-100/60 rounded-lg text-blue-700">
                <Info size={16} />
              </div>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase rounded-md tracking-wide">
                30 Dias Antes
              </span>
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-900">Contratos (Lei 13/2023)</h4>
              <p className="text-[10.5px] text-slate-500 leading-relaxed">
                Notificação escrita de caducidade de contratos a prazo certo. A ausência de aviso implica <b>renovação automática</b> ou indemnização obrigatória.
              </p>
            </div>
            <div className="border-t border-blue-100/50 pt-2 flex items-center justify-between text-[9.5px]">
              <span className="text-slate-400 font-semibold">Alerta automático:</span>
              <span className="text-blue-700 font-extrabold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span> Diário (&lt;30 dias)
              </span>
            </div>
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <Settings2 size={15} className="text-slate-500" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Configuração de Disparos</h3>
            </div>
            
            <form onSubmit={handleSaveConfig} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider block">E-mail do Gestor Destinatário</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-slate-400" size={14} />
                  <input 
                    type="email" 
                    value={config.email_destino}
                    onChange={(e) => setConfig({ ...config, email_destino: e.target.value })}
                    placeholder="exemplo@empresa.co.mz"
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-900 rounded-xl outline-none font-medium transition-all"
                  />
                </div>
                <p className="text-[9px] text-slate-400">Os lembretes consolidados em formato de relatório serão despachados para este e-mail.</p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider block">Frequência da Auditoria em Background</label>
                <select 
                  value={config.frequencia}
                  onChange={(e) => setConfig({ ...config, frequencia: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-blue-900 py-2 px-3 rounded-xl outline-none font-semibold transition-all"
                >
                  <option value="diario">Disparar Diariamente (Recomendado)</option>
                  <option value="semanal">Disparar Semanalmente (Segundas-feiras)</option>
                  <option value="quinzenal">Disparar Quinzenalmente (Dias 10 e 25)</option>
                </select>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider block mb-2">Eventos Activos para Notificação</label>
                
                {/* Rule Toggles */}
                <div className="space-y-2.5">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900">Caducidade de Contratos (Art. 41)</span>
                    <input 
                      type="checkbox" 
                      checked={config.enviar_expiracao_contrato}
                      onChange={(e) => setConfig({ ...config, enviar_expiracao_contrato: e.target.checked })}
                      className="rounded text-blue-900 focus:ring-blue-900 w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900">Fim de Período Experimental</span>
                    <input 
                      type="checkbox" 
                      checked={config.enviar_fim_experiencia}
                      onChange={(e) => setConfig({ ...config, enviar_fim_experiencia: e.target.checked })}
                      className="rounded text-blue-900 focus:ring-blue-900 w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900">Entrega de INSS (Até dia 10)</span>
                    <input 
                      type="checkbox" 
                      checked={config.enviar_obrigacao_inss}
                      onChange={(e) => setConfig({ ...config, enviar_obrigacao_inss: e.target.checked })}
                      className="rounded text-blue-900 focus:ring-blue-900 w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900">Guia de IRPS (Até dia 20)</span>
                    <input 
                      type="checkbox" 
                      checked={config.enviar_obrigacao_irps}
                      onChange={(e) => setConfig({ ...config, enviar_obrigacao_irps: e.target.checked })}
                      className="rounded text-blue-900 focus:ring-blue-900 w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900">Declaração de IVA (Fim do Mês)</span>
                    <input 
                      type="checkbox" 
                      checked={config.enviar_obrigacao_iva}
                      onChange={(e) => setConfig({ ...config, enviar_obrigacao_iva: e.target.checked })}
                      className="rounded text-blue-900 focus:ring-blue-900 w-4 h-4 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="w-full py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  {savingConfig ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      Gravando Configurações...
                    </>
                  ) : (
                    <>
                      <Check size={14} className="text-emerald-400" />
                      Salvar Regras de Alerta
                    </>
                  )}
                </button>
              </div>

              {showConfigSuccess && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-[10px] p-2.5 rounded-lg text-center font-semibold"
                >
                  Configuração gravada com sucesso no agendador ERP!
                </motion.div>
              )}
            </form>
          </div>

          {/* Simulated Cron Sandbox Panel */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-extrabold uppercase text-indigo-400 tracking-wide">
                <Cpu size={10} className="animate-pulse" />
                Área de Testes Laboratório
              </span>
              <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Simulador Temporal de Cron</h4>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Escolha uma data do calendário para ver quais obrigações ou prazos expiram nessa data e disparar os e-mails correspondentes.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Data de Referência</span>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 text-slate-500" size={13} />
                  <input 
                    type="date" 
                    value={simulatedDate}
                    onChange={(e) => setSimulatedDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl outline-none font-semibold text-white transition-all"
                  />
                </div>
                <div className="grid grid-cols-3 gap-1.5 pt-1.5">
                  <button 
                    type="button"
                    onClick={() => setSimulatedDate("2026-06-09")}
                    className="text-[9px] bg-slate-800 hover:bg-slate-700 py-1 rounded text-slate-300 transition-colors"
                  >
                    Dia 9 (INSS)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSimulatedDate("2026-06-19")}
                    className="text-[9px] bg-slate-800 hover:bg-slate-700 py-1 rounded text-slate-300 transition-colors"
                  >
                    Dia 19 (IRPS)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSimulatedDate("2026-06-26")}
                    className="text-[9px] bg-slate-800 hover:bg-slate-700 py-1 rounded text-slate-300 transition-colors"
                  >
                    Dia 26 (Contratos)
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTriggerManualCheck}
                disabled={runningScheduler}
                className="w-full py-2 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                {runningScheduler ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    Processando Auditoria...
                  </>
                ) : (
                  <>
                    <Play size={12} className="text-amber-300 fill-amber-300" />
                    Disparar Verificação Manual ⚡
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Logs list & Live HTML Reader */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px] flex flex-col">
            
            {/* Header and Sub tabs */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-slate-500" />
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Histórico de E-mails Enviados</h3>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-200/60 p-0.5 rounded-lg text-[10px] font-bold">
                  <button 
                    onClick={() => setActiveHistoryTab('all')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${activeHistoryTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    Todos
                  </button>
                  <button 
                    onClick={() => setActiveHistoryTab('contratos')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${activeHistoryTab === 'contratos' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    Contratos
                  </button>
                  <button 
                    onClick={() => setActiveHistoryTab('fiscal')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${activeHistoryTab === 'fiscal' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    Fiscais
                  </button>
                </div>

                {history.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="p-1.5 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-100 rounded-lg transition-colors cursor-pointer"
                    title="Limpar Histórico"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Content area */}
            <div className="flex-1 p-5 space-y-4">
              {loadingHistory ? (
                <div className="py-12 text-center flex flex-col items-center justify-center space-y-2">
                  <RefreshCw size={24} className="animate-spin text-slate-400" />
                  <p className="text-xs text-slate-500">A carregar registos de e-mail...</p>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto border border-slate-100">
                    <Mail size={20} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-700">Sem e-mails enviados</p>
                    <p className="text-[10px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                      Nenhum e-mail de alerta foi disparado nas datas selecionadas ou para os filtros actuais. Use o cron temporal ao lado para simular disparos.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredHistory.map((item) => {
                    const isExpanded = expandedAlertId === item.id;
                    return (
                      <div 
                        key={item.id} 
                        className={`border rounded-xl transition-all overflow-hidden ${isExpanded ? 'border-slate-300 ring-4 ring-slate-50' : 'border-slate-100 hover:border-slate-200'}`}
                      >
                        {/* Summary Line */}
                        <div 
                          onClick={() => setExpandedAlertId(isExpanded ? null : item.id)}
                          className="p-4 bg-white hover:bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${getAlertBadgeStyles(item.tipo_alerta)}`}>
                                {getAlertLabel(item.tipo_alerta)}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono font-medium">
                                Sent: {new Date(item.data_envio).toLocaleString('pt-MZ')}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-800 tracking-tight truncate">
                              {item.assunto}
                            </h4>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                            <div className="text-right">
                              <span className="text-[10px] text-slate-500 font-semibold block">
                                To: {item.destinatario}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600">
                                <CheckCircle2 size={10} />
                                {item.status}
                              </span>
                            </div>
                            <span className="p-1 text-slate-400 group-hover:text-slate-700 bg-slate-50 border border-slate-100 rounded-lg">
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </span>
                          </div>
                        </div>

                        {/* Interactive Email Viewer Container */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="border-t border-slate-100 bg-slate-50/50"
                            >
                              <div className="p-4 space-y-4">
                                <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 space-y-2">
                                  <div className="border-b border-slate-100 pb-3 text-xs font-mono space-y-1">
                                    <p className="text-slate-500"><span className="font-bold text-slate-700">De:</span> Payroll Tech Mz Alerts &lt;no-reply@payrolltech.co.mz&gt;</p>
                                    <p className="text-slate-500"><span className="font-bold text-slate-700">Para:</span> {item.destinatario}</p>
                                    <p className="text-slate-500"><span className="font-bold text-slate-700">Assunto:</span> {item.assunto}</p>
                                    <p className="text-slate-400 text-[10px] pt-1 flex items-center gap-1.5">
                                      <Info size={11} className="text-blue-500" />
                                      {item.detalhes_sucesso}
                                    </p>
                                  </div>

                                  {/* Render simulated email body in pristine formatted view */}
                                  <div className="py-2 overflow-x-auto">
                                    <div 
                                      className="border rounded-xl p-2 bg-slate-50 overflow-hidden mx-auto max-w-[620px]"
                                      dangerouslySetInnerHTML={{ __html: item.conteudo_html }} 
                                    />
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Regulatory compliance info */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 font-medium flex items-center justify-between gap-4">
              <span className="flex items-center gap-1">
                <Lock size={11} className="text-slate-400" />
                Deteção automática integrada com o Cadastro de Contratos.
              </span>
              <span>Lei nº 13/2023 🇲🇿</span>
            </div>
          </div>
        </div>

        {/* 🤖 Seção: Copiloto Regulatório IA (Módulo 5) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-3 bg-blue-50 text-blue-900 rounded-xl">
              <Bot size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Copiloto Regulatório IA (Consultas em Tempo Real)</h3>
              <p className="text-xs text-slate-500">
                Conselheiro fiscal virtual treinado para conformidade laboral de Moçambique sob a Lei nº 13/2023.
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Tópicos Fiscais & Laborais Imediatos</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <button
                onClick={() => consultarCopiloto('indemnizacoes')}
                className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 hover:border-slate-200 rounded-xl text-left transition-all cursor-pointer group"
              >
                <p className="font-bold text-xs text-slate-700 group-hover:text-blue-900 flex items-center gap-1.5">
                  <span>⚖️</span> Indemnizações
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Cálculo de cessação sob a Lei nº 13/2023</p>
              </button>
              <button
                onClick={() => consultarCopiloto('horas_extra')}
                className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 hover:border-slate-200 rounded-xl text-left transition-all cursor-pointer group"
              >
                <p className="font-bold text-xs text-slate-700 group-hover:text-blue-900 flex items-center gap-1.5">
                  <span>⏱️</span> Horas Extras
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Acréscimos e limites semanais</p>
              </button>
              <button
                onClick={() => consultarCopiloto('irps_isencoes')}
                className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 hover:border-slate-200 rounded-xl text-left transition-all cursor-pointer group"
              >
                <p className="font-bold text-xs text-slate-700 group-hover:text-blue-900 flex items-center gap-1.5">
                  <span>💸</span> IRPS & Isenções
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Mínimo de existência e agregados</p>
              </button>
              <button
                onClick={() => consultarCopiloto('maternidade')}
                className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 hover:border-slate-200 rounded-xl text-left transition-all cursor-pointer group"
              >
                <p className="font-bold text-xs text-slate-700 group-hover:text-blue-900 flex items-center gap-1.5">
                  <span>🤰</span> Subsídio Maternidade
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Licença de 90 dias e regras do INSS</p>
              </button>
            </div>
          </div>

          {loadingCopiloto && (
            <div className="p-8 text-center flex flex-col items-center justify-center space-y-2 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <div className="w-6 h-6 border-2 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-semibold text-slate-500">O motor do Copiloto IA está a analisar o parecer regulatório...</p>
            </div>
          )}

          {copilotoErro && (
            <div className="p-4 bg-rose-50 text-rose-800 border border-rose-100 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={16} />
              {copilotoErro}
            </div>
          )}

          {copilotoResposta && !loadingCopiloto && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-50/70 border border-emerald-100 p-6 rounded-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-emerald-100 pb-3 gap-2">
                <span className="font-extrabold text-emerald-900 text-xs tracking-tight">
                  {copilotoResposta.titulo}
                </span>
                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono border border-emerald-200/50">
                  {copilotoResposta.modelo_ia}
                </span>
              </div>

              <p className="text-xs text-emerald-950 leading-relaxed whitespace-pre-wrap font-medium">
                {copilotoResposta.parecer_legal}
              </p>

              <div className="pt-3 border-t border-emerald-100/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-emerald-800 font-semibold">
                <span className="flex items-center gap-1">
                  🔒 <b>Garantia de Alta Reflexão:</b> Parecer fiscal auditado com base na legislação oficial de Moçambique.
                </span>
                {copilotoResposta.timestamp_auditoria && (
                  <span className="font-mono text-emerald-600">
                    Ref: {new Date(copilotoResposta.timestamp_auditoria).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
