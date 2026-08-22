/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, 
  Coins, 
  Send, 
  CheckCircle2, 
  Clock, 
  User, 
  Phone, 
  HelpCircle, 
  ShieldCheck, 
  AlertCircle,
  TrendingUp,
  Download,
  Calendar,
  Layers,
  ChevronRight,
  ArrowRightLeft,
  Plus,
  Trash2,
  Building,
  Lock,
  Shield,
  Cpu,
  Sparkles,
  Settings,
  Zap
} from 'lucide-react';
import { Employee, CompanyData } from '../types';
import { sendBrowserNotification } from '../utils/notifications';
import { configuracaoFiscal, matrizFiscaisMoçambique } from '../db_tax';

interface FintechPaymentsProps {
  employees: Employee[];
  company: CompanyData;
  selectedPeriod: string;
  onReload: () => void;
}

interface Vale {
  vale_id: string;
  funcionario_id: string;
  nome: string;
  valor: number;
  status: "APROVADO_E_TRANSFERIDO" | "DESCONTADO_FOLHA";
  data_lancamento: string;
}

export default function FintechPayments({
  employees,
  company,
  selectedPeriod,
  onReload
}: FintechPaymentsProps) {
  const [activeSubTab, setActiveSubTab] = useState<'batch' | 'advances' | 'bankAccounts' | 'autoPilot'>('batch');
  const [vales, setVales] = useState<Vale[]>([]);
  const [loadingVales, setLoadingVales] = useState(false);
  
  // Auto-Pilot states
  const [isAutoPilotActive, setIsAutoPilotActive] = useState(true);
  const [autoPilotScheduledDay, setAutoPilotScheduledDay] = useState(25);
  const [autoPilotBankSource, setAutoPilotBankSource] = useState('');
  const [autoRechargeEnabled, setAutoRechargeEnabled] = useState(true);
  const [autoPilotRunning, setAutoPilotRunning] = useState(false);
  const [autoPilotStep, setAutoPilotStep] = useState(0);
  const [autoPilotLogs, setAutoPilotLogs] = useState<string[]>([]);
  const [autoPilotSuccessResult, setAutoPilotSuccessResult] = useState<any | null>(null);
  const [autoPilotError, setAutoPilotError] = useState<string | null>(null);
  const [autoPilotErrorDetails, setAutoPilotErrorDetails] = useState<string | null>(null);

  // Wallet states
  const [saldoDisponivel, setSaldoDisponivel] = useState<number>(0.00);
  const [erroFintech, setErroFintech] = useState<string | null>(null);
  const [erroFintechDetails, setErroFintechDetails] = useState<string | null>(null);
  const [valorRecarga, setValorRecarga] = useState('');
  const [recharging, setRecharging] = useState(false);

  // Corporate Bank Accounts State
  interface ContaBancaria {
    banco: string;
    numero_conta: string;
    saldo: number;
    tem_senha?: boolean;
  }
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [selectedBank, setSelectedBank] = useState('');

  // Modal Recharge states
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [modalBank, setModalBank] = useState('');
  const [modalPassword, setModalPassword] = useState('');
  const [modalAmount, setModalAmount] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  // Bank Form State
  const [newBankName, setNewBankName] = useState('');
  const [newBankAccount, setNewBankAccount] = useState('');
  const [newBankBalance, setNewBankBalance] = useState('');
  const [newBankPassword, setNewBankPassword] = useState('');
  const [rechargePassword, setRechargePassword] = useState('');
  const [bankRegSuccess, setBankRegSuccess] = useState<string | null>(null);
  const [bankRegError, setBankRegError] = useState<string | null>(null);

  // Batch liquidation state
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [liquidating, setLiquidating] = useState(false);
  const [liquidationSuccess, setLiquidationSuccess] = useState<any>(null);

  // Vales Form State
  const [selectedFuncId, setSelectedFuncId] = useState('');
  const [valorSolicitado, setValorSolicitado] = useState('');
  const [valesSubmitting, setValesSubmitting] = useState(false);
  const [valesMessage, setValesMessage] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Fetch Vales
  const fetchVales = async () => {
    setLoadingVales(true);
    try {
      const res = await fetch('/api/vales/listar');
      if (res.ok) {
        const data = await res.json();
        setVales(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingVales(false);
    }
  };

  // Fetch Wallet Balance
  const fetchSaldo = async () => {
    try {
      const res = await fetch('/api/fintech/carteira');
      if (res.ok) {
        const data = await res.json();
        setSaldoDisponivel(data.saldo_disponivel_mz);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Corporate Bank Accounts
  const fetchContasBancarias = async () => {
    try {
      const res = await fetch('/api/fintech/contas-bancarias');
      if (res.ok) {
        const data = await res.json();
        setContasBancarias(data);
        if (data.length > 0) {
          setSelectedBank(data[0].numero_conta);
        } else {
          setSelectedBank('');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Register a new Corporate Bank Account
  const handleRegisterBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setBankRegError(null);
    setBankRegSuccess(null);
    if (!newBankName || !newBankAccount || !newBankPassword) {
      setBankRegError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    try {
      const res = await fetch('/api/fintech/contas-bancarias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          banco: newBankName,
          numero_conta: newBankAccount,
          saldo: Number(newBankBalance) || 0,
          senha: newBankPassword
        })
      });
      const data = await res.json();
      if (res.ok && data.sucesso) {
        setBankRegSuccess('Conta bancária corporativa real cadastrada com sucesso!');
        if (data.contas_bancarias) {
          setContasBancarias(data.contas_bancarias);
          if (data.contas_bancarias.length > 0) {
            setSelectedBank(data.contas_bancarias[data.contas_bancarias.length - 1].numero_conta);
          }
        }
        // Reset fields
        setNewBankName('');
        setNewBankAccount('');
        setNewBankBalance('');
        setNewBankPassword('');
      } else {
        setBankRegError(data.erro || 'Erro ao cadastrar conta bancária.');
      }
    } catch (err) {
      console.error(err);
      setBankRegError('Erro de ligação ao servidor.');
    }
  };

  // Delete a Corporate Bank Account
  const handleDeleteBankAccount = async (numeroConta: string) => {
    if (!window.confirm(`Tem certeza que deseja remover a conta bancária ${numeroConta}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/fintech/contas-bancarias/${encodeURIComponent(numeroConta)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.sucesso) {
        if (data.contas_bancarias) {
          setContasBancarias(data.contas_bancarias);
          if (data.contas_bancarias.length > 0) {
            setSelectedBank(data.contas_bancarias[0].numero_conta);
          } else {
            setSelectedBank('');
          }
        }
      } else {
        alert(data.erro || 'Erro ao remover conta bancária.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao ligar ao servidor para remover conta.');
    }
  };

  // Recharge Wallet (Simulated but requires real bank PIN/password)
  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valorRecarga || !selectedBank) {
      alert('Por favor, escolha uma conta bancária de origem e defina o valor.');
      return;
    }
    setRecharging(true);
    setErroFintech(null);
    setErroFintechDetails(null);
    try {
      const res = await fetch('/api/fintech/recarregar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          valor: Number(valorRecarga),
          banco: selectedBank,
          senha: rechargePassword
        })
      });
      const data = await res.json();
      if (res.ok && data.sucesso) {
        setSaldoDisponivel(data.saldo_disponivel_mz);
        if (data.contas_bancarias) {
          setContasBancarias(data.contas_bancarias);
        }
        setValorRecarga('');
        setRechargePassword('');
        setErroFintech(null);
        setErroFintechDetails(null);
        sendBrowserNotification(
          "💳 Recarga de Saldo Concluída!",
          `A carteira corporativa da empresa foi recarregada com sucesso no valor de ${Number(valorRecarga).toLocaleString('pt-MZ')} MT.`
        );
        alert('Carteira recarregada com sucesso!');
      } else {
        setErroFintech(data.erro || 'Falha ao recarregar a carteira.');
        setErroFintechDetails(data.detalhes || null);
      }
    } catch (err) {
      console.error(err);
      setErroFintech('Erro ao carregar saldo.');
    } finally {
      setRecharging(false);
    }
  };

  const handleModalRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalAmount || !modalBank) {
      setModalError('Por favor, escolha uma conta bancária de origem e defina o valor.');
      return;
    }
    setRecharging(true);
    setModalError(null);
    try {
      const res = await fetch('/api/fintech/recarregar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          valor: Number(modalAmount),
          banco: modalBank,
          senha: modalPassword
        })
      });
      const data = await res.json();
      if (res.ok && data.sucesso) {
        setSaldoDisponivel(data.saldo_disponivel_mz);
        if (data.contas_bancarias) {
          setContasBancarias(data.contas_bancarias);
        }
        setModalAmount('');
        setModalPassword('');
        setModalError(null);
        setShowRechargeModal(false);
        sendBrowserNotification(
          "💳 Recarga de Saldo Concluída!",
          `A carteira corporativa da empresa foi recarregada com sucesso no valor de ${Number(modalAmount).toLocaleString('pt-MZ')} MT.`
        );
        alert('Carteira recarregada com sucesso!');
      } else {
        setModalError(data.erro || 'Erro ao carregar saldo.');
      }
    } catch (err) {
      console.error(err);
      setModalError('Erro de ligação ao servidor.');
    } finally {
      setRecharging(false);
    }
  };

  const handleDownloadExtrato = async () => {
    try {
      const res = await fetch('/api/fintech/extrato-pdf');
      if (!res.ok) {
        alert('Não foi possível gerar o extrato no momento.');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `extrato_carteira_fintech_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Erro ao transferir o extrato.');
    }
  };

  useEffect(() => {
    fetchVales();
    fetchSaldo();
    fetchContasBancarias();
  }, []);

  // Set all employees as selected by default when directory loads
  useEffect(() => {
    if (employees.length > 0) {
      setSelectedEmpIds(employees.map(e => e.id));
    }
  }, [employees]);

  // Tax calculation helper for display
  const calcularSalarioNet = (emp: Employee) => {
    // Procura todos os vales ativos aprovados do funcionário
    const valesAtivosDoFuncionario = vales.filter(v => v.funcionario_id === emp.id && v.status === "APROVADO_E_TRANSFERIDO");
    const descontoVales = valesAtivosDoFuncionario.reduce((soma, v) => soma + v.valor, 0);

    const inssRate = (configuracaoFiscal.taxa_inss_trabalhador !== undefined ? configuracaoFiscal.taxa_inss_trabalhador : 3.0) / 100;
    const inss = emp.salario_base * inssRate;
    const materiaColetavel = Math.max(0, emp.salario_base - inss);
    
    const matrix = configuracaoFiscal.escaloes_irps && configuracaoFiscal.escaloes_irps.length > 0
      ? configuracaoFiscal.escaloes_irps
      : matrizFiscaisMoçambique;

    const escalao = matrix.find(e => 
      materiaColetavel >= e.limite_minimo && 
      (e.limite_maximo === null || materiaColetavel <= e.limite_maximo)
    ) || matrix[0];

    let irps = 0;
    if (escalao && escalao.coeficiente_taxa > 0) {
      const excesso = materiaColetavel - escalao.limite_minimo;
      const impostoExcesso = excesso * escalao.coeficiente_taxa;
      let deducao = 0;
      if (emp.numero_dependentes === 0) deducao = escalao.deducao_por_dependente.dep_0;
      else if (emp.numero_dependentes === 1) deducao = escalao.deducao_por_dependente.dep_1;
      else if (emp.numero_dependentes === 2) deducao = escalao.deducao_por_dependente.dep_2;
      else if (emp.numero_dependentes === 3) deducao = escalao.deducao_por_dependente.dep_3;
      else if (emp.numero_dependentes >= 4) deducao = escalao.deducao_por_dependente.dep_4_mais;

      irps = Math.max(0, escalao.valor_fixo_irps + impostoExcesso - deducao);
    }

    const liquidoSemVales = emp.salario_base - inss - irps;
    const liquidoFinal = Math.max(0, liquidoSemVales - descontoVales);

    return {
      inss: Number(inss.toFixed(2)),
      irps: Number(irps.toFixed(2)),
      descontoVales,
      liquidoFinal: Number(liquidoFinal.toFixed(2))
    };
  };

  // Checkbox handlers
  const handleToggleSelect = (id: string) => {
    if (selectedEmpIds.includes(id)) {
      setSelectedEmpIds(selectedEmpIds.filter(empId => empId !== id));
    } else {
      setSelectedEmpIds([...selectedEmpIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedEmpIds.length === employees.length) {
      setSelectedEmpIds([]);
    } else {
      setSelectedEmpIds(employees.map(e => e.id));
    }
  };

  // Batch Payment Submit
  const handleBatchPayment = async () => {
    if (selectedEmpIds.length === 0) {
      alert("Selecione pelo menos um colaborador para efetuar o pagamento.");
      return;
    }

    setLiquidating(true);
    setLiquidationSuccess(null);
    setErroFintech(null);
    setErroFintechDetails(null);

    // Prepare list of selected workers
    const listaTrabalhadores = employees
      .filter(emp => selectedEmpIds.includes(emp.id))
      .map(emp => {
        const calc = calcularSalarioNet(emp);
        return {
          id: emp.id,
          nome: emp.nome,
          telefone: emp.carteira_movel,
          salarioLiquido: calc.liquidoFinal
        };
      });

    try {
      const res = await fetch('/api/fintech/liquidar-via-carteira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa_id: company.nuit || 'emp_generica',
          listaTrabalhadores,
          periodo: selectedPeriod,
          banco_origem: selectedBank
        })
      });

      const data = await res.json();
      if (!res.ok || !data.sucesso) {
        setErroFintech(data.erro || 'Falha ao liquidar lote.');
        if (data.detalhes) {
          setErroFintechDetails(data.detalhes);
        }
      } else if (res.ok && data.sucesso) {
        setLiquidationSuccess(data);
        setErroFintech(null);
        setErroFintechDetails(null);
        // Sync database state and update stats
        await fetchContasBancarias();
        await fetchVales();
        onReload();
        sendBrowserNotification(
          "💸 Processamento de Salários Concluído!",
          `O lote de salários com ${listaTrabalhadores.length} colaboradores foi processado e liquidado com sucesso para o período ${selectedPeriod}.`
        );
      } else {
        setErroFintech(data.erro || 'Falha ao processar liquidação em lote.');
      }
    } catch (e) {
      console.error(e);
      setErroFintech('Erro de comunicação com o servidor.');
    } finally {
      setLiquidating(false);
    }
  };

  // Vale submit handler
  const handleValeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValesMessage(null);

    const emp = employees.find(e => e.id === selectedFuncId);
    if (!emp || !valorSolicitado) {
      setValesMessage({ tipo: 'erro', texto: 'Por favor, selecione um funcionário e introduza o valor solicitado.' });
      return;
    }

    const valorNum = Number(valorSolicitado);
    const maxLimit = emp.salario_base * 0.50; // 50% basic salary safety rule
    if (valorNum <= 0) {
      setValesMessage({ tipo: 'erro', texto: 'O valor solicitado deve ser maior do que 0 MT.' });
      return;
    }

    if (valorNum > maxLimit) {
      setValesMessage({ 
        tipo: 'erro', 
        texto: `Limite Excedido! O valor máximo para adiantamento é de 50% do salário base (${maxLimit.toLocaleString('pt-MZ')} MT).` 
      });
      return;
    }

    setValesSubmitting(true);
    try {
      const res = await fetch('/api/vales/solicitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          funcionario_id: emp.id,
          nome: emp.nome,
          valor_solicitado: valorNum,
          telefone_carteira: emp.carteira_movel
        })
      });

      const data = await res.json();
      if (data.sucesso) {
        setValesMessage({ 
          tipo: 'sucesso', 
          texto: `Vale de ${valorNum.toLocaleString('pt-MZ')} MT aprovado e transferido com sucesso para a carteira ${emp.carteira_movel}!` 
        });
        setValorSolicitado('');
        setSelectedFuncId('');
        await fetchVales();
        onReload();
        sendBrowserNotification(
          "📲 Adiantamento (Vale) Aprovado!",
          `O vale de ${valorNum.toLocaleString('pt-MZ')} MT solicitado para ${emp.nome} foi aprovado e transferido com sucesso via Carteira Móvel.`
        );
      } else {
        setValesMessage({ tipo: 'erro', texto: data.erro || 'Erro ao processar adiantamento.' });
      }
    } catch (err) {
      console.error(err);
      setValesMessage({ tipo: 'erro', texto: 'Erro de comunicação ao processar vale.' });
    } finally {
      setValesSubmitting(false);
    }
  };

  const handleDownloadRelatorioVales = async () => {
    try {
      const res = await fetch('/api/vales/pdf-relatorio');
      if (!res.ok) {
        alert('Não foi possível gerar o relatório consolidado de vales no momento.');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_consolidado_adiantamentos_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Erro ao transferir o relatório de vales.');
    }
  };

  const handleDownloadComprovativoVale = async (valeId: string) => {
    try {
      const res = await fetch(`/api/vales/pdf-comprovativo/${encodeURIComponent(valeId)}`);
      if (!res.ok) {
        alert('Não foi possível gerar o comprovativo deste adiantamento.');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprovativo_adiantamento_${valeId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Erro ao transferir o comprovativo de adiantamento.');
    }
  };

  const handleRunAutoPilot = async () => {
    setAutoPilotRunning(true);
    setAutoPilotStep(1);
    setAutoPilotError(null);
    setAutoPilotErrorDetails(null);
    setAutoPilotSuccessResult(null);
    setAutoPilotLogs([`[${new Date().toLocaleTimeString('pt-MZ')}] 🤖 Inicializando Motor Autónomo do Piloto Automático ERP...`]);

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    try {
      await sleep(1000);
      setAutoPilotStep(2);
      setAutoPilotLogs(prev => [...prev, `[${new Date().toLocaleTimeString('pt-MZ')}] 🔍 Passo 1: Analisando contratos e dados bancários de ${employees.length} colaboradores ativos...`]);
      
      await sleep(1200);
      setAutoPilotStep(3);
      setAutoPilotLogs(prev => [...prev, `[${new Date().toLocaleTimeString('pt-MZ')}] 💸 Passo 2: Verificando base de dados de Adiantamentos (Vales) do mês para abatimentos...`]);
      
      await sleep(1200);
      setAutoPilotStep(4);
      setAutoPilotLogs(prev => [...prev, `[${new Date().toLocaleTimeString('pt-MZ')}] 💳 Passo 3: Calculando provisionamento e encargos unificados com comissão fintech de 35,00 MT por colaborador...`]);

      await sleep(1000);
      setAutoPilotLogs(prev => [...prev, `[${new Date().toLocaleTimeString('pt-MZ')}] 🏦 Passo 4: Chamando API do Banco e validando saldo da carteira digital...`]);

      // Fire the real API call to execute the autopilot processing
      const response = await fetch('/api/fintech/autopilot/executar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodo: selectedPeriod,
          bancoOrigem: autoPilotBankSource,
          autoRecharge: autoRechargeEnabled
        })
      });

      const data = await response.json();

      if (!response.ok || !data.sucesso) {
        setAutoPilotStep(0);
        setAutoPilotRunning(false);
        setAutoPilotError(data.erro || 'Falha ao processar piloto automático.');
        if (data.detalhes) {
          setAutoPilotErrorDetails(data.detalhes);
        }
        setAutoPilotLogs(prev => [...prev, `[${new Date().toLocaleTimeString('pt-MZ')}] ❌ ERRO CRÍTICO: ${data.erro || 'Falha no processamento'}. ${data.detalhes || ''}`]);
        return;
      }

      await sleep(1200);
      setAutoPilotStep(5);
      setAutoPilotLogs(prev => [...prev, `[${new Date().toLocaleTimeString('pt-MZ')}] 🏦 [BANCO] Auto-Recharge processado com sucesso!`]);
      if (data.autoRechargeValue > 0) {
        setAutoPilotLogs(prev => [...prev, `[${new Date().toLocaleTimeString('pt-MZ')}] 💳 Auto-Pull de ${data.autoRechargeValue.toLocaleString('pt-MZ')} MT efetuado com sucesso da conta ${data.contaBancoNome}.`]);
      } else {
        setAutoPilotLogs(prev => [...prev, `[${new Date().toLocaleTimeString('pt-MZ')}] 💡 Saldo em carteira móvel era suficiente. Nenhuma transferência bancária foi necessária.`]);
      }

      await sleep(1200);
      setAutoPilotStep(6);
      setAutoPilotLogs(prev => [...prev, `[${new Date().toLocaleTimeString('pt-MZ')}] 🚀 Passo 5: Efetuando desembolso B2C móvel em massa via gateways autorizados...`]);
      setAutoPilotLogs(prev => [...prev, `[${new Date().toLocaleTimeString('pt-MZ')}] 📱 Transferências concluídas de ${data.totalPago.toLocaleString('pt-MZ')} MT para ${employees.length} contas de destino.`]);

      await sleep(1200);
      setAutoPilotStep(7);
      setAutoPilotLogs(prev => [...prev, `[${new Date().toLocaleTimeString('pt-MZ')}] 📄 Passo 6: Compilando folha oficial, retendo IRPS/INSS e gerando os comprovativos de recibos em PDF...`]);

      await sleep(1000);
      setAutoPilotLogs(prev => [...prev, `[${new Date().toLocaleTimeString('pt-MZ')}] 📥 Sincronizando e atualizando base de dados em tempo real...`]);

      // Sincronizar dados globais do ERP
      await fetchSaldo();
      await fetchVales();
      onReload();

      setAutoPilotLogs(prev => [...prev, `[${new Date().toLocaleTimeString('pt-MZ')}] ✅ Passo 7: Piloto Automático concluído com sucesso total! Todos os processos de pagamento foram executados.`]);
      setAutoPilotSuccessResult(data);
      setAutoPilotRunning(false);

    } catch (error: any) {
      console.error(error);
      setAutoPilotStep(0);
      setAutoPilotRunning(false);
      setAutoPilotError('Erro de comunicação ou tempo esgotado ao executar o piloto automático.');
      setAutoPilotLogs(prev => [...prev, `[${new Date().toLocaleTimeString('pt-MZ')}] ❌ ERRO EXCEÇÃO: Falha de conexão na API de Automação.`]);
    }
  };

  // Financial Summary calculations for the selected workers
  const totalLiquidoSelecionado = employees
    .filter(emp => selectedEmpIds.includes(emp.id))
    .reduce((soma, emp) => soma + calcularSalarioNet(emp).liquidoFinal, 0);

  const taxaConvenienciaTotal = selectedEmpIds.length * 35.00;
  const totalDebitoUnificado = totalLiquidoSelecionado + taxaConvenienciaTotal;

  // Selected employee for advances details
  const currentSelectedEmp = employees.find(e => e.id === selectedFuncId);

  return (
    <div id="fintech_panel" className="space-y-6">
      {/* Banner de Cabeçalho */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Módulo Fintech: Carteira Móvel & Adiantamentos</h2>
          <p className="text-xs text-slate-500">
            Simplifique a liquidação financeira de salários e a gestão integrada de adiantamentos no final e meio de cada mês.
          </p>
        </div>

        {/* Subtab selection badges */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => { setActiveSubTab('batch'); setLiquidationSuccess(null); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'batch' 
                ? 'bg-white text-blue-900 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Liquidação em Lote
          </button>
          <button
            onClick={() => { setActiveSubTab('advances'); setValesMessage(null); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'advances' 
                ? 'bg-white text-blue-900 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Adiantamento de Vales
          </button>
          <button
            onClick={() => { setActiveSubTab('bankAccounts'); setBankRegSuccess(null); setBankRegError(null); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'bankAccounts' 
                ? 'bg-white text-blue-900 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            💳 Contas Bancárias (Real)
          </button>
          <button
            onClick={() => { setActiveSubTab('autoPilot'); setAutoPilotSuccessResult(null); setAutoPilotError(null); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'autoPilot' 
                ? 'bg-blue-900 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cpu size={12} className={activeSubTab === 'autoPilot' ? 'animate-spin' : ''} />
            🤖 Piloto Automático
          </button>
        </div>
      </div>



      {/* Seção Principal */}
      {activeSubTab === 'batch' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tabela de Trabalhadores & Detalhe de Lote */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-900 rounded-xl">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Lista de Pagamento em Lote</h3>
                  <p className="text-[11px] text-slate-500">Selecione os colaboradores para inclusão no processamento B2C.</p>
                </div>
              </div>
              
              {employees.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="text-xs font-bold text-blue-900 hover:text-blue-800 cursor-pointer"
                >
                  {selectedEmpIds.length === employees.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </button>
              )}
            </div>

            {/* List */}
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {employees.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Não existem colaboradores cadastrados no diretório do ERP.
                </div>
              ) : (
                employees.map(emp => {
                  const isSelected = selectedEmpIds.includes(emp.id);
                  const calc = calcularSalarioNet(emp);
                  return (
                    <div 
                      key={emp.id}
                      onClick={() => handleToggleSelect(emp.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected 
                          ? 'bg-blue-50/50 border-blue-200' 
                          : 'bg-white hover:bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Custom Checkbox */}
                        <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                          isSelected ? 'bg-blue-900 border-blue-900 text-white' : 'bg-white border-slate-300'
                        }`}>
                          {isSelected && <span className="text-[10px] font-bold">✓</span>}
                        </div>

                        <div>
                          <p className="font-bold text-slate-800 text-xs">{emp.nome}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                            <span className="font-mono flex items-center gap-0.5">
                              <Phone size={10} /> {emp.carteira_movel}
                            </span>
                            <span>•</span>
                            <span>{emp.cargo}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-mono text-xs font-bold text-slate-700">
                          {calc.liquidoFinal.toLocaleString('pt-MZ')} MT
                        </p>
                        {calc.descontoVales > 0 && (
                          <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                            Vale abatido: -{calc.descontoVales} MT
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Formulario/Bloco de Acção do Usuário com Layout exacto solicitado */}
            <div className="border-2 border-blue-600 bg-white p-6 rounded-2xl shadow-lg shadow-blue-900/5 space-y-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center">
                  <span className="text-2xl mr-2.5">⚡</span>
                  <h3 className="text-slate-900 font-extrabold text-base">Liquidação de Salários em Lote</h3>
                </div>
                <span className="bg-blue-100 text-blue-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Modo Fintech Ativo
                </span>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Transfira o salário líquido de todos os seus colaboradores de forma automática. O dinheiro sairá da conta da sua empresa diretamente para a carteira móvel de cada funcionário.
              </p>

              {/* Tabela Resumo de Custos Finanças */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Total Líquido dos Funcionários:</span>
                  <b className="text-base text-slate-800 font-extrabold font-mono">
                    {totalLiquidoSelecionado.toLocaleString('pt-MZ')} MT
                  </b>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">
                    Taxa de Conveniência Fintech (35 MT × {selectedEmpIds.length}):
                  </span>
                  <b className="text-base text-emerald-600 font-extrabold font-mono">
                    {taxaConvenienciaTotal.toLocaleString('pt-MZ')} MT
                  </b>
                </div>
              </div>

              {/* Caixa Informativa de Débito Unificado */}
              <div className="bg-blue-50/50 border border-blue-200/60 p-3.5 rounded-xl flex justify-between items-center text-xs">
                <span className="text-blue-900 font-bold">Total a Debitar Bancário (Salários + Taxas):</span>
                <b className="text-blue-900 font-mono font-extrabold text-base">
                  {totalDebitoUnificado.toLocaleString('pt-MZ')} MT
                </b>
              </div>

              {/* Seletor da Conta Bancária para Débito Direto */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                <span className="text-[11px] text-slate-500 font-bold block uppercase tracking-wide">Conta de Origem para Débito Direto</span>
                {contasBancarias.length === 0 ? (
                  <p className="text-xs text-amber-600 font-semibold leading-normal">
                    ⚠️ Nenhuma conta bancária real cadastrada. Cadastre na aba "Contas Bancárias (Real)" para poder transferir diretamente.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <select
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-extrabold focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {contasBancarias.map((conta) => (
                        <option key={conta.numero_conta} value={conta.numero_conta}>
                          {conta.banco} — {conta.numero_conta} (Saldo: {conta.saldo.toLocaleString('pt-MZ')} MT)
                        </option>
                      ))}
                    </select>

                    {(() => {
                      const selectedConta = contasBancarias.find(c => c.numero_conta === selectedBank);
                      if (selectedConta) {
                        const hasSufficient = selectedConta.saldo >= totalDebitoUnificado;
                        return (
                          <div className="space-y-1.5 mt-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-500 font-semibold">Saldo Disponível no Banco:</span>
                              <span className="font-mono font-extrabold text-slate-900">
                                {selectedConta.saldo.toLocaleString('pt-MZ')} MT
                              </span>
                            </div>
                            {!hasSufficient && (
                              <p className="text-[11px] text-rose-600 font-bold leading-normal">
                                ⚠️ Saldo bancário insuficiente para liquidar este lote. Falta { (totalDebitoUnificado - selectedConta.saldo).toLocaleString('pt-MZ') } MT.
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>

              {/* Error container for Insufficient funds or invalid operations */}
              <AnimatePresence>
                {erroFintech && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-4 bg-rose-50 border-2 border-rose-200 rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex gap-2 text-rose-800 font-bold items-start">
                      <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-extrabold">{erroFintech}</p>
                        {erroFintechDetails && (
                          <p className="text-[11px] text-rose-700 font-medium leading-relaxed mt-1">{erroFintechDetails}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Botão de Disparo em Lote Unificado */}
              <button
                id="btn_pagar_lote"
                onClick={handleBatchPayment}
                disabled={
                  liquidating || 
                  selectedEmpIds.length === 0 || 
                  contasBancarias.length === 0 || 
                  (() => {
                    const selectedConta = contasBancarias.find(c => c.numero_conta === selectedBank);
                    return selectedConta ? selectedConta.saldo < totalDebitoUnificado : true;
                  })()
                }
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-extrabold rounded-xl text-sm shadow-md shadow-emerald-600/15 cursor-pointer transition-colors uppercase tracking-wider"
              >
                {liquidating ? '💸 Processando Liquidação...' : (() => {
                  const selectedConta = contasBancarias.find(c => c.numero_conta === selectedBank);
                  if (selectedConta && selectedConta.saldo < totalDebitoUnificado) {
                    return '❌ SALDO BANCÁRIO INSUFICIENTE';
                  }
                  return '🚀 CONFIRMAR E TRANSFERIR SALÁRIOS AGORA';
                })()}
              </button>

              {/* Status container */}
              <AnimatePresence>
                {liquidationSuccess && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-4 text-xs"
                  >
                    <div className="flex gap-2.5 items-start text-emerald-800 font-medium leading-normal">
                      <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={16} />
                      <div>
                        <p className="font-bold">🎉 Sucesso! Transferência concluída em lote.</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Os trabalhadores receberão a notificação de saldo nas suas carteiras móveis instantaneamente. Total de {liquidationSuccess.detalheTransacoes?.length} salários transferidos.
                        </p>
                      </div>
                    </div>

                    {/* Receipt logs breakdown */}
                    <div className="border border-emerald-100 bg-white rounded-lg overflow-hidden text-[10px]">
                      <div className="bg-emerald-50/40 p-2 border-b border-emerald-100 font-bold text-slate-600 uppercase font-mono tracking-wider">
                        Detalhes das Transferências Efetuadas:
                      </div>
                      <table className="w-full text-left font-mono">
                        <tbody>
                          {liquidationSuccess.detalheTransacoes?.map((tx: any, idx: number) => (
                            <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                              <td className="p-2 text-slate-700 font-semibold">{tx.funcionario}</td>
                              <td className="p-2 text-slate-500">{tx.contacto_carteira}</td>
                              <td className="p-2 text-right font-bold text-slate-800">{tx.valor_enviado.toLocaleString('pt-MZ')} MT</td>
                              <td className="p-2 text-emerald-600 font-bold">{tx.referencia_b2c}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Sidebar de Segurança e Relatórios */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Padrões de Liquidação Bancária</h4>
              
              <div className="space-y-3.5">
                <div className="flex gap-3 items-start text-xs">
                  <ShieldCheck className="text-blue-900 shrink-0 mt-0.5" size={16} />
                  <div>
                    <p className="font-bold text-slate-800">Conformidade Banco de Moçambique</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                      Transações B2C instantâneas liquidadas diretamente nas redes nacionais m-Pesa, e-Mola e PayTek através de chaves encriptadas seguras.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start text-xs">
                  <TrendingUp className="text-emerald-600 shrink-0 mt-0.5" size={16} />
                  <div>
                    <p className="font-bold text-slate-800">Taxas e Encargos Simplificados</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                      Faturação consolidada automática com taxa única fixa de 35,00 MT por transferência. Sem custos ocultos nem comissões sobre os valores transferidos.
                    </p>
                  </div>
                </div>
              </div>
            </div>


          </div>
        </div>
      ) : activeSubTab === 'advances' ? (
        /* ADIANTAMENTOS E VALES SUBTAB */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form para Lançamento de Vale */}
          <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-blue-50 text-blue-900 rounded-xl">
                <Coins size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Lançar & Aprovar Vale</h3>
                <p className="text-[10px] text-slate-400">Dinheiro enviado a meio do mês via Carteira Móvel.</p>
              </div>
            </div>

            <form onSubmit={handleValeSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Selecionar Colaborador *</label>
                <select
                  required
                  value={selectedFuncId}
                  onChange={(e) => setSelectedFuncId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-950"
                >
                  <option value="">-- Escolha o trabalhador --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.nome} ({emp.cargo})</option>
                  ))}
                </select>
              </div>

              {currentSelectedEmp && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-2"
                >
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Salário Base:</span>
                    <span className="font-semibold text-slate-700 font-mono">{currentSelectedEmp.salario_base.toLocaleString('pt-MZ')} MT</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span className="font-semibold">Limite de Vale Seguro (50%):</span>
                    <span className="font-bold font-mono">{(currentSelectedEmp.salario_base * 0.50).toLocaleString('pt-MZ')} MT</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Telemóvel de Recebimento:</span>
                    <span className="font-bold font-mono text-slate-700">{currentSelectedEmp.carteira_movel}</span>
                  </div>
                </motion.div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Valor Solicitado (MT) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={valorSolicitado}
                  onChange={(e) => setValorSolicitado(e.target.value)}
                  placeholder="Ex: 5000"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-blue-950"
                />
              </div>

              <button
                type="submit"
                disabled={valesSubmitting || !selectedFuncId || !valorSolicitado}
                className="w-full py-2.5 bg-blue-900 hover:bg-blue-800 disabled:bg-slate-200 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer flex items-center justify-center gap-2 transition-colors uppercase"
              >
                <Send size={12} />
                {valesSubmitting ? 'A processar transferência...' : 'Lançar e Transferir Vale'}
              </button>
            </form>

            {valesMessage && (
              <div className={`p-3 rounded-lg border text-xs text-center font-medium ${
                valesMessage.tipo === 'sucesso' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                {valesMessage.texto}
              </div>
            )}
          </div>

          {/* Historico de Vales em Lote */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-50 text-slate-700 rounded-xl">
                  <ArrowRightLeft size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Histórico Integrado de Adiantamentos</h3>
                  <p className="text-[10px] text-slate-400">Consulte os vales do mês que serão abatidos de forma automática na folha.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadRelatorioVales}
                className="px-3 py-1.5 bg-blue-900 hover:bg-blue-850 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer flex items-center gap-1 uppercase tracking-wide"
              >
                📥 Baixar Relatório (PDF)
              </button>
            </div>

            <div className="overflow-x-auto text-[11px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px] bg-slate-50/50">
                    <th className="p-2.5">Código Vale</th>
                    <th className="p-2.5">Colaborador</th>
                    <th className="p-2.5 text-right">Valor Sent (MT)</th>
                    <th className="p-2.5">Data Lançamento</th>
                    <th className="p-2.5 text-center">Estado de Desconto</th>
                    <th className="p-2.5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-[10px]">
                  {loadingVales ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">A obter histórico de vales...</td>
                    </tr>
                  ) : vales.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">Nenhum adiantamento ou vale registado para este período.</td>
                    </tr>
                  ) : (
                    [...vales].reverse().map((v, idx) => (
                      <tr key={v.vale_id || idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="p-2.5 font-bold text-slate-800">{v.vale_id}</td>
                        <td className="p-2.5 font-sans font-bold text-slate-700">{v.nome}</td>
                        <td className="p-2.5 text-right font-extrabold text-slate-800">{v.valor.toLocaleString('pt-MZ')} MT</td>
                        <td className="p-2.5 text-slate-400">{v.data_lancamento}</td>
                        <td className="p-2.5 text-center">
                          {v.status === "APROVADO_E_TRANSFERIDO" ? (
                            <span className="inline-block px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 font-bold font-sans text-[9px] uppercase">
                              Aguardando Folha
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold font-sans text-[9px] uppercase">
                              Demitido / Abatido
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleDownloadComprovativoVale(v.vale_id)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-[9px] cursor-pointer transition-colors uppercase tracking-wide"
                            title="Baixar Comprovativo PDF"
                          >
                            📄 PDF
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 text-xs leading-relaxed text-amber-900 mt-2">
              <Clock className="text-amber-600 shrink-0 mt-0.5" size={16} />
              <div>
                <p className="font-bold">Regras de Auditoria Interna de Vales:</p>
                <p className="text-[11px] text-amber-800 mt-1">
                  Qualquer vale com estado "Aguardando Folha" será descontado de forma integral do salário líquido final do funcionário durante a geração de recibos de final de mês ou na liquidação em lote do ERP de forma 100% automatizada.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : activeSubTab === 'autoPilot' ? (
        /* PILOTO AUTOMÁTICO COCKPIT */
        <div className="space-y-6">
          {/* Painel Superior de Configurações */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status e Chave de Ativação */}
            <div className="bg-linear-to-br from-blue-950 to-indigo-900 text-white rounded-2xl p-6 shadow-md border border-blue-900 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">Status do Sistema</span>
                </div>
                <h3 className="text-lg font-extrabold tracking-tight">Processamento Autónomo (Auto-Pilot)</h3>
                <p className="text-[11px] text-blue-200 leading-relaxed">
                  Quando ativo, o ERP executa todos os cálculos tributários, abates de vales e pagamentos móveis automaticamente no dia agendado.
                </p>
              </div>

              <div className="border-t border-white/10 pt-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-blue-300 block uppercase font-bold">Modo Piloto</span>
                  <span className="text-xs font-bold text-emerald-400">Totalmente Ativado</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAutoPilotActive(!isAutoPilotActive)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${isAutoPilotActive ? 'bg-emerald-500' : 'bg-slate-700'}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${isAutoPilotActive ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            {/* Agendamento & Regras */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-150 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-800">
                  <Calendar size={18} className="text-blue-900" />
                  <h4 className="font-bold text-xs uppercase tracking-wide">Agendamento Recorrente</h4>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Dia de Processamento Mensal</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={autoPilotScheduledDay}
                      onChange={(e) => setAutoPilotScheduledDay(Number(e.target.value))}
                      className="w-20 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold font-mono focus:outline-none"
                    />
                    <span className="text-[11px] text-slate-500">de cada mês útil (Fim de Período)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-medium text-slate-600">Simular data atual no ERP</span>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">
                    Dia {autoPilotScheduledDay} (Agendado)
                  </span>
                </div>
              </div>

              <div className="bg-blue-50/50 border border-blue-100 p-2.5 rounded-lg text-[10px] text-blue-900 font-medium">
                💡 O sistema realiza 3 tentativas automáticas a cada hora caso haja falha de conexão ou saldo na data de disparo.
              </div>
            </div>

            {/* Smart Auto-Recharge (Banco para Carteira Móvel) */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-150 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-800">
                  <Building size={18} className="text-blue-900" />
                  <h4 className="font-bold text-xs uppercase tracking-wide">Auto-Pull Bancário Seguro</h4>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-700 block">Débito Direto Integrado</span>
                    <span className="text-[10px] text-slate-400 block">Dedução direta da conta bancária corporativa</span>
                  </div>
                  <span className="text-[9px] bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded border border-emerald-200">
                    ATIVO
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Conta Bancária Preferencial</label>
                  <select
                    value={autoPilotBankSource}
                    onChange={(e) => setAutoPilotBankSource(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold font-mono focus:outline-none"
                  >
                    <option value="">-- Usar primeira conta com saldo --</option>
                    {contasBancarias.map(c => (
                      <option key={c.numero_conta} value={c.numero_conta}>
                        {c.banco} ({c.numero_conta}) — {c.saldo.toLocaleString('pt-MZ')} MT
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="text-[9px] text-slate-400 flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-600 shrink-0" />
                Operação bancária protegida por encriptação AES de 256 bits.
              </div>
            </div>
          </div>

          {/* Área Central: Disparador Autónomo e Terminal de Log */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* O Disparador Autónomo */}
            <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <div className="p-2.5 bg-indigo-50 text-indigo-900 rounded-xl">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">Disparar Fluxo</h3>
                    <p className="text-[10px] text-slate-400">Execute e simule as ações automáticas instantaneamente.</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Ao acionar o botão abaixo, o motor ERP Piloto Automático assumirá o controle total das seguintes etapas de forma integrada:
                </p>

                <ul className="text-[11px] text-slate-700 space-y-2 font-medium">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    Auditoria de contratos de todos os colaboradores
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    Recalcular INSS, IRPS e dedução de dependentes
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    Localizar e abater integralmente Vales do mês
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    Débito direto seguro na conta bancária de origem
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    Desembolso via APIs de Operadoras M-Pesa/e-Mola
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    Criação autónoma de comprovativos individuais em PDF
                  </li>
                </ul>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  disabled={autoPilotRunning || !isAutoPilotActive}
                  onClick={handleRunAutoPilot}
                  className="w-full py-3 bg-indigo-900 hover:bg-indigo-850 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-xs rounded-xl tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2 shadow-sm cursor-pointer hover:shadow-md transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  {autoPilotRunning ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Executando Automação...
                    </>
                  ) : (
                    <>
                      <Zap size={14} className="text-amber-400 animate-bounce" />
                      Disparar Piloto Automático
                    </>
                  )}
                </button>

                {!isAutoPilotActive && (
                  <p className="text-[10px] text-rose-500 font-bold text-center">
                    ⚠️ Ative a chave de modo piloto automático para liberar o disparo autónomo.
                  </p>
                )}
              </div>
            </div>

            {/* Terminal de Log do Piloto Automático */}
            <div className="lg:col-span-2 bg-slate-950 text-slate-100 rounded-2xl p-6 shadow-lg border border-slate-900 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                    Consola de Monitoramento Autónomo
                  </span>
                </div>
                {autoPilotRunning && (
                  <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold bg-indigo-950/80 text-indigo-400 border border-indigo-900/40 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping"></span>
                    Etapa {autoPilotStep}/7
                  </div>
                )}
              </div>

              {/* Console logs box */}
              <div className="bg-slate-950/40 rounded-xl p-4 border border-slate-900 font-mono text-[10px] leading-relaxed overflow-y-auto h-[240px] space-y-2 scrollbar-thin scrollbar-thumb-slate-900">
                {autoPilotLogs.map((log, index) => (
                  <div 
                    key={index} 
                    className={`font-mono ${
                      log.includes('❌') 
                        ? 'text-rose-400' 
                        : log.includes('✅') 
                        ? 'text-emerald-400 font-bold' 
                        : log.includes('💡')
                        ? 'text-amber-400'
                        : log.includes('[AUTO-RECHARGE]')
                        ? 'text-blue-400 font-bold'
                        : 'text-slate-300'
                    }`}
                  >
                    {log}
                  </div>
                ))}

                {autoPilotRunning && (
                  <div className="flex items-center gap-1.5 text-indigo-400 font-bold animate-pulse">
                    <span>❯</span>
                    <span className="w-2.5 h-4 bg-indigo-400 animate-ping"></span>
                  </div>
                )}

                {autoPilotLogs.length === 0 && (
                  <div className="text-slate-500 text-center py-16">
                    Aguardando ativação do motor do piloto automático...
                  </div>
                )}
              </div>

              {/* Resultados do Ciclo / Erros */}
              <div className="border-t border-slate-900 pt-3">
                {autoPilotError && (
                  <div className="p-3 bg-rose-950/30 border border-rose-900/40 rounded-xl flex items-start gap-3 text-rose-300 text-xs">
                    <AlertCircle className="shrink-0 mt-0.5 text-rose-400" size={16} />
                    <div className="space-y-1">
                      <p className="font-bold">Falha no Ciclo Autónomo:</p>
                      <p className="text-[11px] text-rose-400/90">{autoPilotError}</p>
                      {autoPilotErrorDetails && <p className="text-[10px] text-rose-500/70 font-mono">{autoPilotErrorDetails}</p>}
                    </div>
                  </div>
                )}

                {autoPilotSuccessResult && (
                  <div className="p-3.5 bg-emerald-950/25 border border-emerald-900/40 rounded-xl flex items-start gap-3.5 text-emerald-300 text-xs">
                    <CheckCircle2 className="shrink-0 mt-0.5 text-emerald-400" size={18} />
                    <div className="space-y-2 flex-1">
                      <div>
                        <p className="font-extrabold text-sm text-emerald-400">Sucesso do Piloto Automático!</p>
                        <p className="text-[10px] text-emerald-400/80">Ciclo de pagamento e obrigações fiscais concluído sem erros.</p>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-900/20 text-[10px] font-mono">
                        <div>
                          <span className="text-slate-400 block text-[9px]">Lote Líquido</span>
                          <span className="font-bold text-white">{autoPilotSuccessResult.totalPago?.toLocaleString('pt-MZ')} MT</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px]">Taxas Pagas</span>
                          <span className="font-bold text-white">{autoPilotSuccessResult.taxas?.toLocaleString('pt-MZ')} MT</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px]">Auto-Recharge</span>
                          <span className="font-bold text-white">{autoPilotSuccessResult.autoRechargeValue > 0 ? `${autoPilotSuccessResult.autoRechargeValue.toLocaleString('pt-MZ')} MT` : '0,00 MT'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px]">Novo Saldo</span>
                          <span className="font-bold text-white">{autoPilotSuccessResult.novoSaldoCarteira?.toLocaleString('pt-MZ')} MT</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleDownloadRelatorioVales}
                          className="px-2.5 py-1.5 bg-emerald-900 hover:bg-emerald-850 text-white font-bold text-[9px] rounded-lg transition-colors cursor-pointer uppercase font-sans tracking-wide"
                        >
                          📥 Baixar Relatório Vales PDF
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {!autoPilotError && !autoPilotSuccessResult && !autoPilotRunning && (
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <p className="font-medium">O sistema processará o total de {employees.length} funcionários cadastrados.</p>
                    <p className="font-mono text-[10px]">v1.0.0-PRO-AUTO</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* GESTÃO DE CONTAS BANCÁRIAS REAL SUBTAB */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form para Cadastro de Nova Conta */}
          <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-blue-50 text-blue-900 rounded-xl">
                <Building size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Registrar Conta Real</h3>
                <p className="text-[10px] text-slate-400">Adicione as contas corporativas reais da sua empresa.</p>
              </div>
            </div>

            <form onSubmit={handleRegisterBankAccount} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Nome do Banco *</label>
                <select
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-950"
                  required
                >
                  <option value="">-- Selecione o Banco --</option>
                  <option value="BCI">BCI (Banco Comercial e de Investimentos)</option>
                  <option value="Millennium BIM">Millennium BIM</option>
                  <option value="Moza Banco">Moza Banco</option>
                  <option value="Standard Bank">Standard Bank</option>
                  <option value="Absa Banco">Absa Banco Moçambique</option>
                  <option value="Nedbank">Nedbank Moçambique</option>
                  <option value="Outro">Outro (Inserir Manualmente)</option>
                </select>
              </div>

              {newBankName === 'Outro' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">Especifique o Banco *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nome do Banco"
                    onChange={(e) => setNewBankName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-950"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Número da Conta *</label>
                <input
                  type="text"
                  required
                  value={newBankAccount}
                  onChange={(e) => setNewBankAccount(e.target.value)}
                  placeholder="Ex: 100456789 BCI"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-950 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Saldo Real Inicial (MT)</label>
                <input
                  type="number"
                  value={newBankBalance}
                  onChange={(e) => setNewBankBalance(e.target.value)}
                  placeholder="Ex: 150000.00"
                  min="0"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-950 font-mono"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-700 block">Senha / PIN de Segurança *</label>
                  <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Só a empresa terá acesso</span>
                </div>
                <input
                  type="password"
                  required
                  value={newBankPassword}
                  onChange={(e) => setNewBankPassword(e.target.value)}
                  placeholder="Defina a senha para autorizar saídas"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-950"
                />
                <span className="text-[10px] text-slate-400 block leading-tight pt-1">
                  Esta senha será solicitada sempre que tentar carregar fundos no ERP usando esta conta.
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer flex items-center justify-center gap-2 transition-colors uppercase"
              >
                <Plus size={14} />
                Gravar Conta Bancária Real
              </button>
            </form>

            {bankRegSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium text-center">
                ✓ {bankRegSuccess}
              </div>
            )}

            {bankRegError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium text-center">
                ❌ {bankRegError}
              </div>
            )}
          </div>

          {/* Lista de Contas Cadastradas */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-50 text-slate-700 rounded-xl">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Contas Bancárias Ativas no ERP</h3>
                  <p className="text-[10px] text-slate-400">Gerencie as credenciais bancárias e os fundos disponíveis cadastrados.</p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-mono">
                {contasBancarias.length} Contas
              </span>
            </div>

            {contasBancarias.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                <div className="p-4 bg-slate-50 text-slate-400 rounded-full">
                  <Building size={32} />
                </div>
                <div className="max-w-xs space-y-1">
                  <p className="text-sm font-bold text-slate-800">Nenhuma conta bancária real cadastrada</p>
                  <p className="text-xs text-slate-500 leading-normal">
                    Todas as contas fictícias foram removidas para a segurança do seu ERP. Cadastre a sua primeira conta real usando o formulário ao lado.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contasBancarias.map((conta) => (
                  <div
                    key={conta.numero_conta}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between space-y-3 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <span className="text-[10px] bg-blue-100 text-blue-800 font-extrabold px-1.5 py-0.5 rounded font-mono uppercase">
                          {conta.banco}
                        </span>
                        <p className="text-xs font-bold text-slate-700 font-mono pt-1">{conta.numero_conta}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteBankAccount(conta.numero_conta)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remover conta"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="border-t border-slate-200/60 pt-2 flex justify-between items-end">
                      <div>
                        <span className="text-[9px] text-slate-400 block font-medium uppercase">Saldo Cadastrado</span>
                        <span className="text-sm font-extrabold font-mono text-slate-800">
                          {conta.saldo.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded font-bold">
                        <Lock size={10} />
                        Protegida
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex gap-3 text-xs leading-relaxed text-slate-700">
              <Lock className="text-blue-900 shrink-0 mt-0.5" size={16} />
              <div>
                <p className="font-bold text-slate-800">Garantia de Segurança dos Dados:</p>
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                  As senhas e chaves cadastradas nesta aba são mantidas encriptadas no servidor local do ERP e são utilizadas unicamente para verificar a autenticidade das solicitações de recarga efetuadas pelos administradores da empresa. Nenhuma entidade externa ou plataforma tem acesso a estas informações.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY MODAL: RECARREGAR CARTEIRA */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden"
          >
            {/* Header */}
            <div className="bg-blue-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Building size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Recarregar Carteira</h3>
                  <p className="text-[10px] text-blue-200">Adicione fundos à sua conta corporativa Payroll.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowRechargeModal(false)}
                className="text-white/60 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleModalRecharge} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Conta de Origem (Empresa)</label>
                <select
                  value={modalBank}
                  onChange={(e) => setModalBank(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-blue-950 cursor-pointer"
                  required
                >
                  {contasBancarias.map((conta) => (
                    <option key={conta.numero_conta} value={conta.numero_conta}>
                      {conta.banco} — {conta.numero_conta}
                    </option>
                  ))}
                </select>
              </div>

              {(() => {
                const selectedConta = contasBancarias.find(c => c.numero_conta === modalBank);
                if (selectedConta) {
                  return (
                    <div className="flex justify-between items-center text-xs bg-slate-50 border border-slate-150 rounded-lg p-2.5 font-medium text-slate-700">
                      <span>Saldo Bancário Disponível:</span>
                      <span className="font-mono font-extrabold text-blue-900">
                        {selectedConta.saldo.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT
                      </span>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Senha / PIN de Autorização</label>
                <input
                  type="password"
                  value={modalPassword}
                  onChange={(e) => setModalPassword(e.target.value)}
                  placeholder="PIN de autorização da conta"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-950 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Valor a Carregar (MT)</label>
                <input
                  type="number"
                  value={modalAmount}
                  onChange={(e) => setModalAmount(e.target.value)}
                  placeholder="Ex: 50000"
                  required
                  min="1"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-950"
                />
              </div>

              {modalError && (
                <div className="text-[11px] text-rose-800 bg-rose-50 border border-rose-150 p-3 rounded-lg font-medium text-center">
                  ⚠️ {modalError}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRechargeModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer text-center uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={recharging}
                  className="flex-1 py-2.5 bg-blue-900 hover:bg-blue-800 disabled:bg-slate-300 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 uppercase"
                >
                  {recharging ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : 'Confirmar Recarga'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
