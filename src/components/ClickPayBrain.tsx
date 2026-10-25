import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Brain,
  FileCheck2,
  Send,
  ShieldAlert,
  HelpCircle,
  Sparkles,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  MessageSquare,
  DollarSign,
  ArrowRight,
  RefreshCw,
  Building,
  Smartphone,
  ExternalLink,
  Info
} from 'lucide-react';
import { CompanyData } from '../types';

interface ClickPayBrainProps {
  company: CompanyData;
  onNavigateToTab?: (tab: string, subTab?: string) => void;
}

export const ClickPayBrain: React.FC<ClickPayBrainProps> = ({ company, onNavigateToTab }) => {
  const [activeAssistant, setActiveAssistant] = useState<'ap' | 'ar' | 'contracts' | 'policy'>('ap');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Assistente 1: Estado Leitor de Faturas (AP)
  const [loadingInvoice, setLoadingInvoice] = useState<boolean>(false);
  const [invoiceResult, setInvoiceResult] = useState<any>(null);
  const [invoiceSuccessMsg, setInvoiceSuccessMsg] = useState<string | null>(null);

  // Assistente 2: Estado Cobrança Ativa (AR)
  const [selectedDebt, setSelectedDebt] = useState<any>({
    cliente: 'Construtora do Rovuma Lda',
    telefone: '+258843339988',
    factura: 'FT-2026/0412',
    valorMT: 45000.0,
    diasAtraso: 12,
    canal: 'WhatsApp'
  });
  const [loadingDunning, setLoadingDunning] = useState<boolean>(false);
  const [dunningMessage, setDunningMessage] = useState<string>('');

  // Assistente 3: Estado Sentinela de Contratos
  const [loadingContract, setLoadingContract] = useState<boolean>(false);
  const [contractAnalysis, setContractAnalysis] = useState<any>(null);

  // Assistente 4: Estado Chat de Políticas
  const [policyQuestion, setPolicyQuestion] = useState<string>('');
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'brain'; text: string }>>([
    {
      sender: 'brain',
      text: 'Olá! Sou o seu Assistente de Políticas de Despesas da ClickPay. Pergunte-me sobre diárias para as províncias moçambicanas, limites de refeições, quilometragem ou prazos de reembolso!'
    }
  ]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2500);
  };

  // 1. Processar Fatura com Gemini 3.8 Flash
  const handleProcessInvoiceDemo = async () => {
    setLoadingInvoice(true);
    setInvoiceSuccessMsg(null);
    try {
      const res = await fetch('/api/brain/invoice-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64: 'demo_base64_invoice',
          mimeType: 'application/pdf',
          autoSave: true
        })
      });
      const data = await res.json();
      if (data.sucesso) {
        setInvoiceResult(data.dados);
        setInvoiceSuccessMsg('Factura validada com sucesso e lançada nas Compras & Despesas do ERP!');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInvoice(false);
    }
  };

  // 2. Gerar Mensagem de Cobrança com IA
  const handleGenerateDunning = async () => {
    setLoadingDunning(true);
    try {
      const res = await fetch('/api/brain/dunning-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteNome: selectedDebt.cliente,
          numeroFactura: selectedDebt.factura,
          valorMzn: selectedDebt.valorMT,
          diasAtraso: selectedDebt.diasAtraso,
          canal: selectedDebt.canal,
          mpesaNumero: company.telefone || '+258 84 990 0112',
          emolaNumero: '+258 86 990 0112',
          ibanSimo: '0001 0000 1234 5678 9012 3'
        })
      });
      const data = await res.json();
      if (data.sucesso) {
        setDunningMessage(data.mensagem);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDunning(false);
    }
  };

  // 3. Analisar Contrato com IA
  const handleAnalyzeContractDemo = async () => {
    setLoadingContract(true);
    try {
      const res = await fetch('/api/brain/analyze-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tituloContrato: 'Contrato de Manutenção de Servidores e Suporte de TI',
          textoContrato: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE TECNOLOGIA
Primeiro Outorgante: Tech Solutions Moçambique SA, NUIT 400112233
Segundo Outorgante: ${company.nome || 'ClickPay ERP'}, NUIT ${company.nuit || '400999888'}
Cláusula 1: O presente contrato tem a vigência de 12 meses com renovação automática, caso não seja denunciado com pré-aviso mínimo de 30 dias por carta registada.
Cláusula 2: O valor mensal é de 48.000,00 MT, indexado à variação do IPC apurado pelo INE de Moçambique no mês de renovação.
Cláusula 3: Em caso de atraso superior a 15 dias no pagamento da mensalidade, a prestadora reserva-se o direito de suspender os serviços e aplicar juros de mora à taxa de referência MIMO acrescida de 2%.`
        })
      });
      const data = await res.json();
      if (data.sucesso) {
        setContractAnalysis(data.analise);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingContract(false);
    }
  };

  // 4. Pergunta sobre Políticas
  const handleSendPolicyQuestion = async (perguntaTexto?: string) => {
    const q = perguntaTexto || policyQuestion;
    if (!q.trim()) return;

    const newHistory = [...chatHistory, { sender: 'user' as const, text: q }];
    setChatHistory(newHistory);
    setPolicyQuestion('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/brain/policy-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pergunta: q })
      });
      const data = await res.json();
      if (data.sucesso) {
        setChatHistory([...newHistory, { sender: 'brain', text: data.resposta }]);
      }
    } catch (err) {
      setChatHistory([
        ...newHistory,
        { sender: 'brain', text: 'Desculpe, ocorreu uma instabilidade temporária ao consultar as regras. Tente novamente.' }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Header */}
      <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-blue-900/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-blue-300 text-xs font-black uppercase tracking-wider">
              <Sparkles size={14} className="text-blue-400 animate-spin-slow" />
              <span>ClickPay BRAIN · Inteligência Artificial Financeira</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Brain className="text-blue-400 w-8 h-8" />
              Os 4 Assistentes Financeiros com IA
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Inspirado no modelo <span className="font-bold text-white">BRAIN da Bujeti (YC)</span> e 100% calibrado para a legislação tributária de Moçambique: 
              Recolha e OCR de facturas com IVA (16%), cobrança com M-Pesa/SIMO, vigilância de contratos e políticas de despesas.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 shrink-0 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Motor Activo: Gemini 3.8 Flash
            </div>
            <div className="text-[11px] text-slate-300">
              Empresa: <strong className="text-white">{company.nome || 'ClickPay ERP'}</strong>
            </div>
            <div className="text-[10px] text-blue-300 font-mono">
              Regime: {company.regime_fiscal_pme || 'Geral (IVA 16%)'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs for the 4 Assistants */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveAssistant('ap')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-2 ${
            activeAssistant === 'ap'
              ? 'bg-blue-900 text-white border-blue-900 shadow-lg shadow-blue-900/20 scale-[1.02]'
              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className={`p-2 rounded-xl ${activeAssistant === 'ap' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-900'}`}>
              <FileCheck2 size={20} />
            </div>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              activeAssistant === 'ap' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-900 border border-blue-200'
            }`}>
              AGENTE 1
            </span>
          </div>
          <div>
            <h3 className="text-sm font-black leading-tight">Leitor & Auditor AP</h3>
            <p className={`text-[11px] mt-0.5 leading-tight ${activeAssistant === 'ap' ? 'text-blue-100' : 'text-slate-500'}`}>
              Recolha de facturas, IVA 16% & Retenções
            </p>
          </div>
        </button>

        <button
          onClick={() => setActiveAssistant('ar')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-2 ${
            activeAssistant === 'ar'
              ? 'bg-emerald-900 text-white border-emerald-900 shadow-lg shadow-emerald-900/20 scale-[1.02]'
              : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className={`p-2 rounded-xl ${activeAssistant === 'ar' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-900'}`}>
              <Send size={20} />
            </div>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              activeAssistant === 'ar' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
            }`}>
              AGENTE 2
            </span>
          </div>
          <div>
            <h3 className="text-sm font-black leading-tight">Cobrança Ativa AR</h3>
            <p className={`text-[11px] mt-0.5 leading-tight ${activeAssistant === 'ar' ? 'text-emerald-100' : 'text-slate-500'}`}>
              Dunning WhatsApp & Link M-Pesa
            </p>
          </div>
        </button>

        <button
          onClick={() => setActiveAssistant('contracts')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-2 ${
            activeAssistant === 'contracts'
              ? 'bg-purple-900 text-white border-purple-900 shadow-lg shadow-purple-900/20 scale-[1.02]'
              : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300 hover:bg-purple-50/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className={`p-2 rounded-xl ${activeAssistant === 'contracts' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-900'}`}>
              <ShieldAlert size={20} />
            </div>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              activeAssistant === 'contracts' ? 'bg-white/20 text-white' : 'bg-purple-50 text-purple-900 border border-purple-200'
            }`}>
              AGENTE 3
            </span>
          </div>
          <div>
            <h3 className="text-sm font-black leading-tight">Sentinela Contratos</h3>
            <p className={`text-[11px] mt-0.5 leading-tight ${activeAssistant === 'contracts' ? 'text-purple-100' : 'text-slate-500'}`}>
              Vigiar SLAs, IPC e Caducidade
            </p>
          </div>
        </button>

        <button
          onClick={() => setActiveAssistant('policy')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-2 ${
            activeAssistant === 'policy'
              ? 'bg-amber-900 text-white border-amber-900 shadow-lg shadow-amber-900/20 scale-[1.02]'
              : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300 hover:bg-amber-50/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className={`p-2 rounded-xl ${activeAssistant === 'policy' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'}`}>
              <HelpCircle size={20} />
            </div>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              activeAssistant === 'policy' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-900 border border-amber-200'
            }`}>
              AGENTE 4
            </span>
          </div>
          <div>
            <h3 className="text-sm font-black leading-tight">Políticas & Diárias</h3>
            <p className={`text-[11px] mt-0.5 leading-tight ${activeAssistant === 'policy' ? 'text-amber-100' : 'text-slate-500'}`}>
              Dúvidas de despesas dos funcionários
            </p>
          </div>
        </button>
      </div>

      {/* Main Content Area based on Active Assistant */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
        {/* ========================================================= */}
        {/* ASSISTENTE 1: LEITOR DE FACTURAS (AP) */}
        {/* ========================================================= */}
        {activeAssistant === 'ap' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <FileCheck2 className="text-blue-600" size={22} />
                  Agente de Facturas de Fornecedores (Accounts Payable)
                </h2>
                <p className="text-xs text-slate-500">
                  Extrai automaticamente faturas moçambicanas, valida NUIT perante a AT, destaca o IVA a 16% e lança diretamente em Compras.
                </p>
              </div>
              <button
                onClick={handleProcessInvoiceDemo}
                disabled={loadingInvoice}
                className="px-4 py-2.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer whitespace-nowrap"
              >
                {loadingInvoice ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Lendo Factura com Gemini 3.8...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Carregar Factura Exemplo (TotalEnergies)</span>
                  </>
                )}
              </button>
            </div>

            {invoiceSuccessMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-bold">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span>{invoiceSuccessMsg}</span>
              </div>
            )}

            {/* Upload Box */}
            <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 text-center transition-all bg-slate-50/50 flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center">
                <Upload size={22} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Arraste e solte o PDF da Factura ou foto do Recibo do telemóvel
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Suporta PDF, JPG, PNG de recibos térmicos da bomba, supermercado, Telecomunicações ou prestadores de serviços
                </p>
              </div>
              <button
                onClick={handleProcessInvoiceDemo}
                disabled={loadingInvoice}
                className="px-4 py-2 bg-white border border-slate-300 hover:border-blue-400 text-slate-700 text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer"
              >
                {loadingInvoice ? 'Processando Documento...' : 'Selecionar Documento do Computador'}
              </button>
            </div>

            {/* Extracted Invoice Card */}
            {invoiceResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-black text-slate-900 uppercase">Resultado da Auditoria Fiscal</span>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-lg">
                    {invoiceResult.validoAutoridadeTributaria ? 'Conforme Código IVA Moçambique' : 'Requer Atenção'}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Fornecedor</span>
                    <span className="text-xs font-black text-slate-900">{invoiceResult.fornecedor}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">NUIT do Fornecedor</span>
                    <span className="text-xs font-mono font-bold text-slate-800">{invoiceResult.nuit}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Nº da Factura</span>
                    <span className="text-xs font-mono font-bold text-slate-800">{invoiceResult.numeroFactura}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Data Emissão</span>
                    <span className="text-xs font-bold text-slate-800">{invoiceResult.dataEmissao}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Subtotal Líquido</span>
                    <span className="text-xs font-bold text-slate-800">
                      {(invoiceResult.subtotalMzn || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Taxa de IVA</span>
                    <span className="text-xs font-black text-blue-700">{invoiceResult.taxaIva}% (Geral)</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Valor IVA</span>
                    <span className="text-xs font-bold text-blue-900">
                      {(invoiceResult.valorIvaMzn || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Total a Pagar</span>
                    <span className="text-sm font-black text-emerald-700">
                      {(invoiceResult.valorTotalMzn || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl text-xs text-blue-900">
                  <strong>Parecer do Assistente:</strong> {invoiceResult.observacoesFiscais}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* ASSISTENTE 2: COBRANÇA ATIVA (AR) */}
        {/* ========================================================= */}
        {activeAssistant === 'ar' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Send className="text-emerald-600" size={22} />
                  Agente de Cobrança Inteligente (Accounts Receivable)
                </h2>
                <p className="text-xs text-slate-500">
                  Vigia faturas vencidas a clientes e redige cobranças calibradas no tom certo com link de liquidação por M-Pesa e SIMO.
                </p>
              </div>
            </div>

            {/* Simulação de Dívida */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                Seleccione a Fatura em Atraso para Cobrança
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { cliente: 'Construtora do Rovuma Lda', factura: 'FT-2026/0412', valorMT: 45000, diasAtraso: 4, telefone: '+258843339988' },
                  { cliente: 'Logística & Transportes Beira Lda', factura: 'FT-2026/0398', valorMT: 120000, diasAtraso: 14, telefone: '+258825551122' },
                  { cliente: 'Comercial Matola Distribuidora', factura: 'FT-2026/0355', valorMT: 85000, diasAtraso: 28, telefone: '+258871114455' }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedDebt({ ...item, canal: selectedDebt.canal });
                      setDunningMessage('');
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedDebt.factura === item.factura
                        ? 'bg-emerald-50 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-[11px] font-bold text-slate-900 truncate">{item.cliente}</span>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                        item.diasAtraso <= 5 ? 'bg-amber-100 text-amber-900' : item.diasAtraso <= 15 ? 'bg-orange-100 text-orange-900' : 'bg-red-100 text-red-900'
                      }`}>
                        {item.diasAtraso} dias
                      </span>
                    </div>
                    <div className="mt-2 flex justify-between items-baseline">
                      <span className="text-xs font-mono text-slate-500">{item.factura}</span>
                      <span className="text-xs font-black text-emerald-800">{item.valorMT.toLocaleString('pt-MZ')} MT</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">Canal:</span>
                  {(['WhatsApp', 'SMS', 'Email'] as const).map(canal => (
                    <button
                      key={canal}
                      onClick={() => setSelectedDebt({ ...selectedDebt, canal })}
                      className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        selectedDebt.canal === canal
                          ? 'bg-emerald-900 text-white border-emerald-900'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {canal}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleGenerateDunning}
                  disabled={loadingDunning}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  {loadingDunning ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Gerando Mensagem Calibrada...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Gerar Mensagem de Cobrança com IA</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Generated Dunning Box */}
            {dunningMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border-2 border-emerald-500/40 rounded-2xl p-6 space-y-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="text-emerald-600" size={18} />
                    <span className="text-xs font-black text-slate-900">
                      Mensagem Pronta para Disparo ({selectedDebt.canal})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(dunningMessage, 'dunning')}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      {copiedText === 'dunning' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      <span>{copiedText === 'dunning' ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                    {selectedDebt.canal === 'WhatsApp' && (
                      <a
                        href={`https://wa.me/${selectedDebt.telefone.replace(/\+/g, '')}?text=${encodeURIComponent(dunningMessage)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-all"
                      >
                        <ExternalLink size={14} />
                        <span>Abrir no WhatsApp</span>
                      </a>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl font-sans text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {dunningMessage}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* ASSISTENTE 3: SENTINELA DE CONTRATOS */}
        {/* ========================================================= */}
        {activeAssistant === 'contracts' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="text-purple-600" size={22} />
                  Sentinela de Contratos, Prazos & SLAs
                </h2>
                <p className="text-xs text-slate-500">
                  Audita contratos de prestadores e clientes, vigiando prazos de rescisão (Lei do Trabalho / Código Comercial) e indexações ao IPC/Câmbio.
                </p>
              </div>
              <button
                onClick={handleAnalyzeContractDemo}
                disabled={loadingContract}
                className="px-4 py-2.5 bg-purple-900 hover:bg-purple-950 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                {loadingContract ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Auditando Contrato com Gemini 3.8...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Auditar Contrato de Exemplo</span>
                  </>
                )}
              </button>
            </div>

            {contractAnalysis && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl">
                    <span className="text-[10px] font-bold text-purple-700 uppercase block">Vigência & Renovação</span>
                    <span className="text-sm font-black text-purple-950 mt-1 block">
                      {contractAnalysis.vigenciaMeses} Meses · {contractAnalysis.renovacaoAutomatica ? 'Renovação Automática' : 'Termo Fixo'}
                    </span>
                  </div>

                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                    <span className="text-[10px] font-bold text-amber-700 uppercase block">Prazo de Pré-Aviso de Rescisão</span>
                    <span className="text-sm font-black text-amber-950 mt-1 block">
                      {contractAnalysis.prazoPreAvisoDias} Dias de Antecedência
                    </span>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                    <span className="text-[10px] font-bold text-blue-700 uppercase block">Reajuste de Preço</span>
                    <span className="text-xs font-bold text-blue-950 mt-1 block">
                      {contractAnalysis.clausulaReajustePreco}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                    Alertas Críticos Identificados pelo Sentinela
                  </span>
                  <div className="space-y-2">
                    {contractAnalysis.riscosIdentificados?.map((risco: string, i: number) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-slate-800">
                        <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                        <span>{risco}</span>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-purple-100/60 border border-purple-200 rounded-xl text-xs text-purple-950 font-medium mt-3">
                    <strong>Recomendação ClickPay:</strong> {contractAnalysis.recomendacaoVigilancia}
                  </div>
                </div>
              </motion.div>
            )}

            {!contractAnalysis && (
              <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-2">
                <ShieldAlert className="text-slate-400 mx-auto" size={32} />
                <p className="text-xs font-bold text-slate-700">Nenhum contrato em auditoria no momento</p>
                <p className="text-[11px] text-slate-400">Clique em "Auditar Contrato de Exemplo" para ver a extração de riscos em tempo real.</p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* ASSISTENTE 4: POLÍTICAS DE DESPESAS (HELPDESK) */}
        {/* ========================================================= */}
        {activeAssistant === 'policy' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <HelpCircle className="text-amber-600" size={22} />
                  Consultor de Políticas de Despesas & Diárias (Helpdesk Interno)
                </h2>
                <p className="text-xs text-slate-500">
                  Os colaboradores tiram dúvidas sobre limites de alimentação, viagens às províncias, quilometragem e requisitos fiscais.
                </p>
              </div>
            </div>

            {/* Quick Questions Badges */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Perguntas Frequentes:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  'Qual é a diária para viagem a Nampula ou Beira?',
                  'Posso reembolsar almoço com cliente sem NUIT na factura?',
                  'Quanto é o reembolso por quilómetro em viatura própria?',
                  'Qual é o prazo para submeter despesas e quando recebo no M-Pesa?'
                ].map((pergunta, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendPolicyQuestion(pergunta)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-amber-100/70 hover:text-amber-950 text-slate-700 text-xs font-medium rounded-xl border border-slate-200 transition-all cursor-pointer text-left"
                  >
                    💡 {pergunta}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Messages Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 max-h-[380px] overflow-y-auto">
              {chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-blue-900 text-white rounded-tr-none'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-2xs'
                    }`}
                  >
                    {msg.sender === 'brain' && (
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-700 uppercase mb-1.5">
                        <Brain size={12} />
                        <span>ClickPay BRAIN · Consultor Interno</span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-3 text-xs text-slate-500 flex items-center gap-2">
                    <RefreshCw size={14} className="animate-spin text-amber-600" />
                    <span>Consultando as normas corporativas...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={policyQuestion}
                onChange={e => setPolicyQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendPolicyQuestion()}
                placeholder="Pergunte sobre uma despesa, subsídio ou diária..."
                className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
              <button
                onClick={() => handleSendPolicyQuestion()}
                disabled={chatLoading || !policyQuestion.trim()}
                className="px-5 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-2xl flex items-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <Send size={14} />
                <span>Enviar</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClickPayBrain;
