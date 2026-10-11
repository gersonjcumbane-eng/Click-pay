import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  Plus, 
  CheckCircle, 
  Printer, 
  MapPin, 
  Mail, 
  Phone, 
  FileText, 
  Briefcase, 
  Sparkles, 
  Coins, 
  ArrowRight,
  ShieldCheck,
  Percent,
  Trash2,
  Key,
  Lock,
  UserPlus,
  RefreshCw,
  ArrowUpRight
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface ClientCompany {
  id: string;
  nome: string;
  nuit: string;
  endereco: string;
  provincia: string;
  distrito: string;
  regime_iva: string;
  nuel: string;
  email: string;
  telefone: string;
  logo: string;
  fee_base: number;
  fee_por_slip: number;
  countEmployees: number;
  payrollGrossTotal: number;
  billingFeeMzn: number;
  isActive: boolean;
  password?: string;
  subscription_status?: 'ativo' | 'suspenso' | 'pendente';
  subscription_plan?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  next_billing_date?: string;
}

function numeroParaExtenso(num: number): string {
  if (num === 0) return "Zero Meticais";
  
  const unidades = ["", "Um", "Dois", "Três", "Quatro", "Cinco", "Seis", "Sete", "Oito", "Nove"];
  const dezenas_10_19 = ["Dez", "Onze", "Doze", "Treze", "Catorze", "Quinze", "Dezasseis", "Dezassete", "Dezoito", "Dezanove"];
  const dezenas = ["", "", "Vinte", "Trinta", "Quarenta", "Cinquenta", "Sessenta", "Setenta", "Oitenta", "Noventa"];
  const centenas = ["", "Cento", "Duzentos", "Trezentos", "Quatrocentos", "Quinhentos", "Seiscentos", "Setecentos", "Oitocentos", "Novecentos"];

  function converterGrupo(n: number): string {
    if (n === 0) return "";
    let extenso = "";
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;

    if (c > 0) {
      if (c === 1 && d === 0 && u === 0) {
        extenso += "Cem";
      } else {
        extenso += centenas[c];
      }
    }

    if (d > 0) {
      if (extenso !== "") extenso += " e ";
      if (d === 1) {
        extenso += dezenas_10_19[u];
        return extenso;
      } else {
        extenso += dezenas[d];
      }
    }

    if (u > 0) {
      if (extenso !== "") extenso += " e ";
      extenso += unidades[u];
    }

    return extenso;
  }

  const inteira = Math.floor(num);
  const centavos = Math.round((num - inteira) * 100);

  let resultado = "";

  if (inteira > 0) {
    const milhoes = Math.floor(inteira / 1000000);
    const milhares = Math.floor((inteira % 1000000) / 1000);
    const unidades_fim = inteira % 1000;

    let partes: string[] = [];

    if (milhoes > 0) {
      partes.push(converterGrupo(milhoes) + (milhoes === 1 ? " Milhão" : " Milhões"));
    }
    if (milhares > 0) {
      partes.push(converterGrupo(milhares) + " Mil");
    }
    if (unidades_fim > 0) {
      partes.push(converterGrupo(unidades_fim));
    }

    resultado = partes.join(" e ") + (inteira === 1 ? " Metical" : " Meticais");
  }

  if (centavos > 0) {
    if (resultado !== "") resultado += " e ";
    resultado += converterGrupo(centavos) + (centavos === 1 ? " Centavo" : " Centavos");
  }

  return resultado;
}

interface ClientManagementProps {
  onCompanySwitched: () => void;
}

export default function ClientManagement({ onCompanySwitched }: ClientManagementProps) {
  const { showSuccess, showError } = useToast();
  const [clients, setClients] = useState<ClientCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states for creating a new client
  const [showAddForm, setShowAddForm] = useState(false);
  const [nome, setNome] = useState('');
  const [nuit, setNuit] = useState('');
  const [endereco, setEndereco] = useState('');
  const [provincia, setProvincia] = useState('Maputo Cidade');
  const [distrito, setDistrito] = useState('KaMpfumo');
  const [regimeIva, setRegimeIva] = useState('Geral (16%)');
  const [nuel, setNuel] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [logo, setLogo] = useState('');
  const [feeBase, setFeeBase] = useState('2000');
  const [feePorSlip, setFeePorSlip] = useState('150');
  const [newPassword, setNewPassword] = useState('');
  const [subStatus, setSubStatus] = useState<'ativo' | 'suspenso' | 'pendente'>('ativo');
  const [subPlan, setSubPlan] = useState<'Bronze' | 'Silver' | 'Gold' | 'Platinum'>('Bronze');
  const [nextBillingDate, setNextBillingDate] = useState('2026-07-28');

  // Selected client for generating a services invoice & subscription dashboard
  const [selectedInvoiceClient, setSelectedInvoiceClient] = useState<ClientCompany | null>(null);
  const [documentType, setDocumentType] = useState<'fatura' | 'recibo'>('fatura');

  // Edit fields state for managing the subscription of selected client
  const [editStatus, setEditStatus] = useState<'ativo' | 'suspenso' | 'pendente'>('ativo');
  const [editPlan, setEditPlan] = useState<'Bronze' | 'Silver' | 'Gold' | 'Platinum'>('Bronze');
  const [editFeeBase, setEditFeeBase] = useState('2000');
  const [editFeePorSlip, setEditFeePorSlip] = useState('150');
  const [editNextBillingDate, setEditNextBillingDate] = useState('2026-07-28');
  const [editPassword, setEditPassword] = useState('');
  const [updatingSubscription, setUpdatingSubscription] = useState(false);

  // Estados para Gestão Dinâmica de Logins Firebase
  const [fbUsers, setFbUsers] = useState<any[]>([]);
  const [loadingFbUsers, setLoadingFbUsers] = useState(false);
  const [newFbEmail, setNewFbEmail] = useState('');
  const [newFbPassword, setNewFbPassword] = useState('');
  const [newFbRole, setNewFbRole] = useState('CLIENTE_EMPRESA');
  const [newFbCompanyId, setNewFbCompanyId] = useState('');
  const [editingUserEmail, setEditingUserEmail] = useState<string | null>(null);
  const [editingUserPassword, setEditingUserPassword] = useState('');
  const [isEmailPasswordDisabled, setIsEmailPasswordDisabled] = useState(false);
  const [fbProjectId, setFbProjectId] = useState('future-charter-96ppv');

  // Sync selected client and its subscription form
  const selectInvoiceClientAndSync = (client: ClientCompany) => {
    setSelectedInvoiceClient(client);
    setEditStatus(client.subscription_status || 'ativo');
    setEditPlan(client.subscription_plan || 'Bronze');
    setEditFeeBase(client.fee_base.toString());
    setEditFeePorSlip(client.fee_por_slip.toString());
    setEditNextBillingDate(client.next_billing_date || '2026-07-28');
    setEditPassword('');
  };

  const fetchFbUsers = async () => {
    try {
      setLoadingFbUsers(true);
      const res = await fetch('/api/firebase-auth/users');
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object' && 'users' in data) {
          setFbUsers(data.users || []);
          setIsEmailPasswordDisabled(!!data.isEmailPasswordProviderDisabled);
          if (data.projectId) {
            setFbProjectId(data.projectId);
          }
        } else if (Array.isArray(data)) {
          setFbUsers(data);
        }
      }
    } catch (err) {
      console.error('Erro ao ler utilizadores Firebase:', err);
    } finally {
      setLoadingFbUsers(false);
    }
  };

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/clients');
      if (!res.ok) throw new Error('Não foi possível obter a lista de empresas clientes.');
      const data = await res.json();
      setClients(data);
      
      // If there's an active client and no invoice client selected, select the active one by default
      const active = data.find((c: ClientCompany) => c.isActive);
      if (active && !selectedInvoiceClient) {
        selectInvoiceClientAndSync(active);
      } else if (selectedInvoiceClient) {
        // Refresh currently selected client details too
        const updatedSelected = data.find((c: ClientCompany) => c.id === selectedInvoiceClient.id);
        if (updatedSelected) {
          selectInvoiceClientAndSync(updatedSelected);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar clientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchFbUsers();
  }, []);

  const handleCreateFbUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFbEmail || !newFbPassword) {
      alert('Por favor, defina o e-mail e a palavra-passe do utilizador.');
      return;
    }
    try {
      const res = await fetch('/api/firebase-auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newFbEmail,
          password: newFbPassword,
          role: newFbRole,
          companyId: newFbCompanyId || (clients[0]?.id || 'cli_bronze')
        })
      });
      if (!res.ok) throw new Error('Erro ao sincronizar com o Firebase Auth.');
      alert('Novo utilizador registado e integrado no Firebase Auth com sucesso!');
      setNewFbEmail('');
      setNewFbPassword('');
      fetchFbUsers();
      fetchClients();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar conta de acesso.');
    }
  };

  const handleUpdateFbUser = async (email: string) => {
    if (!editingUserPassword) {
      alert('Defina a nova palavra-passe de acesso.');
      return;
    }
    try {
      const res = await fetch('/api/firebase-auth/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: editingUserPassword
        })
      });
      if (!res.ok) throw new Error('Erro ao atualizar palavra-passe.');
      alert(`Palavra-passe de ${email} atualizada com sucesso no Firebase!`);
      setEditingUserEmail(null);
      setEditingUserPassword('');
      fetchFbUsers();
      fetchClients();
    } catch (err: any) {
      alert(err.message || 'Erro ao guardar nova senha.');
    }
  };

  const handleDeleteFbUser = async (email: string) => {
    if (email === 'admin@payrolltech.co.mz') {
      alert('Não é permitido desativar a conta mestre dos Founders.');
      return;
    }
    if (!confirm(`Tem a certeza que deseja desassociar a conta ${email} do Firebase Auth?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/firebase-auth/users/${encodeURIComponent(email)}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Erro ao apagar registo.');
      alert(`Utilizador ${email} removido do Firebase Auth com sucesso!`);
      fetchFbUsers();
      fetchClients();
    } catch (err: any) {
      alert(err.message || 'Erro ao desassociar conta.');
    }
  };

  const handleSelectClient = async (id: string) => {
    try {
      const res = await fetch('/api/clients/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (!res.ok) throw new Error('Erro ao alternar para esta empresa cliente.');
      const data = await res.json();
      
      // Notify parent to reload main metrics (employees, contracts, settings)
      onCompanySwitched();
      
      // Re-fetch clients to update active badge
      await fetchClients();
    } catch (err: any) {
      alert(err.message || 'Erro ao alternar de contexto.');
    }
  };

  const handleDeleteClient = async (id: string, name: string) => {
    if (!window.confirm(`Tem a certeza que deseja eliminar o cliente "${name}" permanentemente do ERP? Esta ação é irreversível e apagará todos os colaboradores e processamentos associados.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Não foi possível eliminar o cliente.');
      const data = await res.json();
      
      if (selectedInvoiceClient?.id === id) {
        setSelectedInvoiceClient(null);
      }
      
      onCompanySwitched();
      await fetchClients();
    } catch (err: any) {
      alert(err.message || 'Erro ao eliminar o cliente.');
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !nuit) {
      alert('Nome da Empresa e NUIT são obrigatórios.');
      return;
    }

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          nuit,
          endereco,
          provincia,
          distrito,
          regime_iva: regimeIva,
          nuel,
          email,
          telefone,
          logo: logo || undefined,
          fee_base: Number(feeBase),
          fee_por_slip: Number(feePorSlip),
          password: newPassword,
          subscription_status: subStatus,
          subscription_plan: subPlan,
          next_billing_date: nextBillingDate
        })
      });

      if (!res.ok) throw new Error('Erro ao registar nova empresa cliente.');
      
      showSuccess('Nova empresa cliente registada com sucesso no portfólio de outsourcing!');
      setShowAddForm(false);
      
      // Reset fields
      setNome('');
      setNuit('');
      setEndereco('');
      setNuel('');
      setEmail('');
      setTelefone('');
      setLogo('');
      setFeeBase('2000');
      setFeePorSlip('150');
      setNewPassword('');
      setSubStatus('ativo');
      setSubPlan('Bronze');
      setNextBillingDate('2026-07-28');

      fetchClients();
    } catch (err: any) {
      showError(err.message || 'Erro ao submeter.');
    }
  };

  const handleUpdateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceClient) return;
    try {
      setUpdatingSubscription(true);
      const res = await fetch('/api/clients/update-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedInvoiceClient.id,
          status: editStatus,
          plan: editPlan,
          fee_base: Number(editFeeBase),
          fee_por_slip: Number(editFeePorSlip),
          next_billing_date: editNextBillingDate,
          password: editPassword
        })
      });

      if (!res.ok) throw new Error('Erro ao atualizar dados da assinatura SaaS.');
      const data = await res.json();
      showSuccess(data.mensagem || 'Assinatura atualizada com sucesso!');
      await fetchClients();
    } catch (err: any) {
      showError(err.message || 'Erro ao guardar alterações.');
    } finally {
      setUpdatingSubscription(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 print:p-0" id="client-management-portal">
      
      {/* Page Title Header (Hidden during print) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="space-y-1">
          <span className="px-3 py-1 bg-blue-100 text-blue-900 rounded-full text-[10px] font-black tracking-wider uppercase">
            Módulo Multi-Cliente & Outsourcing
          </span>
          <h2 className="text-xl font-black text-slate-950 tracking-tight">
            Painel do Gestor de Contas de Salários
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
            Gerencie múltiplos clientes de processamento de salários de forma centralizada. Alterne o contexto do ERP em tempo real para gerir colaboradores, gerar o SISSMO, e processar pagamentos de cada cliente individualmente.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-900 hover:bg-blue-850 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer shrink-0"
        >
          <Plus size={16} />
          {showAddForm ? 'Fechar Formulário' : 'Novo Cliente Outsourcing'}
        </button>
      </div>

      {/* Add Client Form Collapsible Panel (Hidden during print) */}
      {showAddForm && (
        <div className="bg-white rounded-2xl p-6 shadow-md border border-blue-100 space-y-6 print:hidden">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Building2 className="text-blue-900" size={18} />
              Registar Nova Empresa Cliente (Outsourcing)
            </h3>
            <p className="text-[11px] text-slate-500">
              Insira os dados cadastrais oficiais e configure o modelo comercial de faturação para processamento de salários.
            </p>
          </div>

          <form onSubmit={handleAddClient} className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700">Nome Oficial da Empresa *</label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Comercial Maputo Lda"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700">NUIT Oficial (9 Dígitos) *</label>
              <input
                type="text"
                required
                maxLength={9}
                value={nuit}
                onChange={(e) => setNuit(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 400123456"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700">NUEL (Licença de Atividade)</label>
              <input
                type="text"
                value={nuel}
                onChange={(e) => setNuel(e.target.value)}
                placeholder="Ex: 10099443"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700">E-mail de Contacto</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex: rh@cliente.co.mz"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700">Telefone Oficial</label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="Ex: +258 84 111 2222"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700">Regime de IVA</label>
              <select
                value={regimeIva}
                onChange={(e) => setRegimeIva(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900"
              >
                <option value="Isento">Isento (Artigo 9 do CIVA)</option>
                <option value="Geral (16%)">Regime Geral (16% IVA)</option>
                <option value="Simplificado (12.5%)">Regime Simplificado (12.5%)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700">Endereço (Rua e Nº)</label>
              <input
                type="text"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Ex: Av. 25 de Setembro, nº 500"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700">Província</label>
              <input
                type="text"
                value={provincia}
                onChange={(e) => setProvincia(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700">Distrito</label>
              <input
                type="text"
                value={distrito}
                onChange={(e) => setDistrito(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700">URL do Logótipo (Opcional)</label>
              <input
                type="text"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                placeholder="Ex: https://link.com/logo.png"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700">Fee Fixo Base Mensal (MT) *</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 text-xs font-mono font-bold">MT</span>
                <input
                  type="number"
                  required
                  value={feeBase}
                  onChange={(e) => setFeeBase(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700">Fee por Recibo de Salário (MT) *</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 text-xs font-mono font-bold">MT</span>
                <input
                  type="number"
                  required
                  value={feePorSlip}
                  onChange={(e) => setFeePorSlip(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700">Senha do Cliente (SaaS) *</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a palavra-passe do cliente"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700">Plano de Assinatura *</label>
              <select
                value={subPlan}
                onChange={(e) => setSubPlan(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900"
              >
                <option value="Bronze">Plano Bronze (SaaS)</option>
                <option value="Silver">Plano Silver (SaaS)</option>
                <option value="Gold">Plano Gold (SaaS)</option>
                <option value="Platinum">Plano Platinum (SaaS)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700">Estado da Assinatura *</label>
              <select
                value={subStatus}
                onChange={(e) => setSubStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900"
              >
                <option value="ativo">Ativo (Acesso Total)</option>
                <option value="pendente">Pendente (Início Recente)</option>
                <option value="suspenso">Suspenso (Acesso Bloqueado)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700">Data de Expiração/Renovação *</label>
              <input
                type="date"
                required
                value={nextBillingDate}
                onChange={(e) => setNextBillingDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900"
              />
            </div>

            <div className="md:col-span-3 pt-2 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                Registar Cliente e Iniciar Acordo Comercial
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Grid View: Clients List + Invoice Display */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* LEFT 3 COLS: Clients Cards (Hidden during print if not selected) */}
        <div className="lg:col-span-3 space-y-4 print:hidden">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Briefcase size={16} className="text-slate-500" />
            Portfólio de Clientes Ativos
          </h3>

          {loading ? (
            <div className="bg-white rounded-2xl p-12 border border-slate-100 text-center flex flex-col items-center justify-center space-y-2">
              <div className="w-6 h-6 border-2 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500">A carregar carteira de empresas...</p>
            </div>
          ) : clients.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-slate-100 text-center">
              <p className="text-xs text-slate-500">Nenhum cliente registado ainda.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {clients.map((client) => {
                const isFoundersCo = client.id === 'cli_founders';
                return (
                  <div 
                    key={client.id}
                    className={`rounded-2xl p-5 border transition-all hover:shadow-md ${
                      client.isActive 
                        ? 'border-blue-900 ring-2 ring-blue-900/10' 
                        : 'border-slate-100'
                    } ${
                      isFoundersCo 
                        ? 'bg-gradient-to-br from-blue-50/70 via-indigo-50/20 to-white border-blue-200 shadow-sm shadow-blue-500/5' 
                        : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl overflow-hidden shrink-0 flex items-center justify-center border ${
                          isFoundersCo 
                            ? 'bg-blue-900 border-blue-950 text-white' 
                            : 'bg-slate-50 border-slate-100'
                        }`}>
                          {isFoundersCo ? (
                            <Sparkles size={24} className="text-white animate-pulse" />
                          ) : client.logo ? (
                            <img src={client.logo} alt={client.nome} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Building2 size={24} className="text-slate-400" />
                          )}
                        </div>
                        
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-extrabold text-slate-950">
                              {client.nome}
                              {isFoundersCo && (
                                <span className="ml-1.5 text-[9px] font-black text-blue-900 bg-blue-100/80 px-2 py-0.5 rounded-md border border-blue-200">
                                  ADMIN WORKSPACE
                                </span>
                              )}
                            </h4>
                            {client.isActive && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-900 text-[9px] font-extrabold rounded-full tracking-wider uppercase flex items-center gap-1">
                                <CheckCircle size={10} />
                                Activo no ERP
                              </span>
                            )}
                            
                            {/* Plan Badge */}
                            <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-md tracking-wider uppercase border ${
                              isFoundersCo 
                                ? 'bg-blue-900 text-white border-blue-950 shadow-sm shadow-blue-900/20' 
                                : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                            }`}>
                              {isFoundersCo ? '👑 ERP Original (Mestre)' : `👑 ${client.subscription_plan || 'Bronze'}`}
                            </span>

                          {/* Status Badge */}
                          {isFoundersCo ? (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-100 text-[9px] font-extrabold rounded-md tracking-wider uppercase">
                              Permanente
                            </span>
                          ) : client.subscription_status === 'ativo' ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-extrabold rounded-md tracking-wider uppercase">
                              Activa
                            </span>
                          ) : client.subscription_status === 'suspenso' ? (
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 text-[9px] font-extrabold rounded-md tracking-wider uppercase">
                              Suspensa
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-extrabold rounded-md tracking-wider uppercase">
                              Pendente
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400 font-medium">
                          <span className="font-semibold text-slate-600">NUIT: {client.nuit}</span>
                          <span className="flex items-center gap-0.5">
                            <MapPin size={10} />
                            {client.distrito}, {client.provincia}
                          </span>
                        </div>
                        {/* Credentials helper */}
                        <div className="pt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]">
                          <span className="text-slate-500 font-semibold">Login:</span>
                          <span className="text-blue-900 font-bold bg-slate-50 px-1 rounded select-all">{client.email || 'N/D'}</span>
                          <span className="text-slate-400 font-semibold">| Senha:</span>
                          <span className="text-slate-500 font-mono bg-slate-50 px-1 rounded">•••••••• (Encriptada)</span>
                          {!isFoundersCo && (
                            <>
                              <span className="text-slate-400 font-semibold">| Expira:</span>
                              <span className="text-slate-600 font-bold">{client.next_billing_date || '2026-07-28'}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Acordo de Fee Mensal</span>
                      <p className="text-sm font-black text-slate-900 font-mono">
                        {isFoundersCo ? '0.00 MT' : `${client.billingFeeMzn.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT`}
                      </p>
                      <span className="text-[9px] text-slate-400 block font-medium">
                        {isFoundersCo ? 'Uso Interno Administrativo' : `${client.fee_base.toLocaleString('pt-PT')} MT base + ${client.fee_por_slip} MT/recibo`}
                      </span>
                    </div>
                  </div>

                  {/* Client Statistics Section */}
                  <div className="mt-4 pt-4 border-t border-slate-50 grid grid-cols-3 gap-3 text-center">
                    <div className="bg-slate-50/50 rounded-xl p-2.5">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Colaboradores</span>
                      <span className="text-xs font-black text-slate-800 font-mono">{client.countEmployees}</span>
                    </div>
                    
                    <div className="bg-slate-50/50 rounded-xl p-2.5">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Folha Bruta Est.</span>
                      <span className="text-xs font-black text-slate-800 font-mono">
                        {client.payrollGrossTotal.toLocaleString('pt-PT')} MT
                      </span>
                    </div>

                    <div className="bg-slate-50/50 rounded-xl p-2.5">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Regime Fiscal</span>
                      <span className="text-[10px] font-bold text-slate-700 truncate">{client.regime_iva}</span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-3">
                      {!isFoundersCo ? (
                        <>
                          <button
                            onClick={() => setSelectedInvoiceClient(client)}
                            className={`inline-flex items-center gap-1 text-[11px] font-bold hover:underline cursor-pointer transition-colors ${
                              selectedInvoiceClient?.id === client.id ? 'text-blue-900' : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            <FileText size={14} className="text-blue-900" />
                            Visualizar Fatura de Honorários
                          </button>

                          <button
                            onClick={() => handleDeleteClient(client.id, client.nome)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer transition-colors"
                            title="Eliminar este cliente permanentemente"
                          >
                            <Trash2 size={13} />
                            Eliminar
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-blue-900 bg-blue-50/50 px-2.5 py-1.5 rounded-xl border border-blue-100">
                          <ShieldCheck size={14} className="text-blue-900" />
                          Espaço Master • Sem Faturação SaaS
                        </div>
                      )}
                    </div>

                    {!client.isActive && (
                      <button
                        onClick={() => handleSelectClient(client.id)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[10px] font-extrabold active:scale-95 transition-all cursor-pointer border ${
                          isFoundersCo 
                            ? 'bg-blue-950 hover:bg-slate-900 text-white border-blue-950 shadow-md shadow-blue-950/20' 
                            : 'bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200/50'
                        }`}
                      >
                        {isFoundersCo ? 'Regressar ao ERP Mestre' : 'Alternar ERP para esta Empresa'}
                        <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>

        {/* RIGHT 2 COLS: Fatura de Prestação de Serviços (Print friendly structure) */}
        <div className="lg:col-span-2 space-y-4 print:col-span-5 print:w-full">
          
          {/* PAINEL DE CONTROLO DE ASSINATURA SAAS (Hidden during print) */}
          {selectedInvoiceClient && (
            <div className="bg-white border border-indigo-100 rounded-2xl p-5 shadow-sm space-y-4 print:hidden">
              <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="text-indigo-600" size={14} />
                    Gestão de Assinatura SaaS: {selectedInvoiceClient.nome}
                  </h4>
                  <p className="text-[10px] text-slate-400">Controle o acesso do cliente e faturamento de assinatura.</p>
                </div>
              </div>

              <form onSubmit={handleUpdateSubscription} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600">Estado do Acesso</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="ativo">Ativo (Acesso Liberado)</option>
                      <option value="suspenso">Suspenso (Bloqueado)</option>
                      <option value="pendente">Pendente (Aguardando Pagto)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600">Plano Contratado</label>
                    <select
                      value={editPlan}
                      onChange={(e) => setEditPlan(e.target.value as any)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="Bronze">Plano Bronze</option>
                      <option value="Silver">Plano Silver</option>
                      <option value="Gold">Plano Gold</option>
                      <option value="Platinum">Plano Platinum</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600">Fee Mensal Fixo (MT)</label>
                    <input
                      type="number"
                      value={editFeeBase}
                      onChange={(e) => setEditFeeBase(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600">Fee Por Recibo (MT)</label>
                    <input
                      type="number"
                      value={editFeePorSlip}
                      onChange={(e) => setEditFeePorSlip(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium font-mono"
                    />
                  </div>

                  <div className="space-y-1 col-span-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-600">Nova Senha de Acesso (Opcional)</label>
                        <input
                          type="password"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="Deixe em branco para manter"
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium font-mono text-blue-900 bg-blue-50/30 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-600">Data de Expiração</label>
                        <input
                          type="date"
                          value={editNextBillingDate}
                          onChange={(e) => setEditNextBillingDate(e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={updatingSubscription}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                  >
                    {updatingSubscription ? 'A guardar...' : 'Guardar Alterações da Assinatura'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="flex items-center justify-between print:hidden">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Coins size={16} className="text-emerald-600" />
              Fatura de Outsourcing Mensal
            </h3>
            
            {selectedInvoiceClient && (
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-300 rounded-lg text-[10px] font-bold text-slate-700 hover:text-blue-900 transition-colors cursor-pointer shadow-xs"
              >
                <Printer size={12} className="text-rose-500" />
                {documentType === 'fatura' ? 'Imprimir Fatura' : 'Imprimir Recibo'}
              </button>
            )}
          </div>

          {selectedInvoiceClient && (
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1 print:hidden mb-4 border border-slate-200">
              <button
                onClick={() => setDocumentType('fatura')}
                className={`flex-1 py-1.5 text-center rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                  documentType === 'fatura'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                🧾 Fatura Proforma
              </button>
              <button
                onClick={() => setDocumentType('recibo')}
                className={`flex-1 py-1.5 text-center rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                  documentType === 'recibo'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                💸 Recibo Primavera V10
              </button>
            </div>
          )}

          {selectedInvoiceClient ? (
            <div className="bg-white border-2 border-slate-300 rounded-lg p-6 shadow-sm space-y-6 text-slate-800 relative overflow-hidden print:border-0 print:shadow-none print:p-0">
              
              {/* Primavera ERP V10 Header Layout */}
              <div className="flex justify-between items-start border-b-2 border-slate-300 pb-5 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <img src="logo-payroll.png" alt="Payroll Tech Mz" className="h-10 w-auto object-contain" referrerPolicy="no-referrer" />
                    <div>
                      <span className="text-xs font-black text-slate-900 block uppercase tracking-wide">Payroll Tech Mz, Lda</span>
                      <span className="text-[8px] font-bold text-slate-400 font-mono tracking-wider">PRIMAVERA ERP V10 PARTNER</span>
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-600 leading-tight">
                    Av. Julius Nyerere, nº 3400, Edifício Jat V<br />
                    Maputo Cidade, Moçambique<br />
                    <b>NUIT:</b> 400990887 | <b>Tel:</b> +258 861390061<br />
                    <b>E-mail:</b> gersonjcumbane@gmail.com
                  </p>
                </div>

                {/* Primavera Doc Type and Metadata Box */}
                <div className="border border-slate-400 rounded w-64 overflow-hidden text-[10px] bg-white">
                  <div className="bg-slate-800 text-white font-extrabold px-3 py-1 text-center tracking-wider uppercase text-[10px]">
                    {documentType === 'fatura' ? 'Fatura Proforma' : 'Recibo de Liquidação'}
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-y divide-slate-300 border-t border-slate-300 bg-slate-50/30 text-slate-700">
                    <div className="p-1.5 col-span-2">
                      <span className="text-[7.5px] text-slate-500 block uppercase font-black tracking-wider">Documento / N.º</span>
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        {documentType === 'fatura' ? 'FT-OUT-2026-06/' : 'RC-OUT-2026-06/'}{selectedInvoiceClient.nuit.substring(5)}
                      </span>
                    </div>
                    <div className="p-1.5">
                      <span className="text-[7.5px] text-slate-500 block uppercase font-black tracking-wider">Data Emissão</span>
                      <span className="font-bold text-slate-900">28-06-2026</span>
                    </div>
                    {documentType === 'fatura' ? (
                      <div className="p-1.5">
                        <span className="text-[7.5px] text-slate-500 block uppercase font-black tracking-wider">Vencimento</span>
                        <span className="font-bold text-red-600">10-07-2026</span>
                      </div>
                    ) : (
                      <div className="p-1.5">
                        <span className="text-[7.5px] text-slate-500 block uppercase font-black tracking-wider">Ref. Fatura</span>
                        <span className="font-bold text-slate-900 font-mono">FT-OUT-2026-06/{selectedInvoiceClient.nuit.substring(5)}</span>
                      </div>
                    )}
                    <div className="p-1.5">
                      <span className="text-[7.5px] text-slate-500 block uppercase font-black tracking-wider">Moeda</span>
                      <span className="font-bold text-slate-900">Metical (MT)</span>
                    </div>
                    <div className="p-1.5">
                      <span className="text-[7.5px] text-slate-500 block uppercase font-black tracking-wider">Página</span>
                      <span className="font-bold text-slate-900">1 de 1</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Envelope Window & Conditions Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 text-xs">
                <div className="text-[9.5px] text-slate-500 space-y-1 bg-slate-50/50 p-3 rounded border border-slate-150">
                  <p className="font-extrabold text-slate-700 uppercase tracking-wider text-[8px]">REQUISITOS LEGAIS & PAGAMENTO</p>
                  <p><b>Regime Fiscal:</b> Enquadrado no IVA Normal de Moçambique.</p>
                  <p><b>Vencimento:</b> Liquidar até à data de vencimento indicada.</p>
                  <p><b>Modo Pagamento:</b> Transferência para as contas do emitente.</p>
                  <p className="text-[8.5px] text-slate-400 font-medium">As faturas e recibos gerados neste portal seguem estritamente os padrões técnicos da versão Primavera ERP V10.</p>
                </div>

                <div className="border border-slate-400 rounded-lg p-3 bg-slate-50/50 shadow-xs relative">
                  <span className="text-[7.5px] text-slate-400 font-extrabold uppercase tracking-widest block mb-1">Exmo.(s) Senhor(es)</span>
                  <h5 className="font-black text-slate-900 text-[11px] uppercase">{selectedInvoiceClient.nome}</h5>
                  <div className="text-[9.5px] text-slate-600 mt-1.5 space-y-0.5 leading-relaxed">
                    <p><b>NUIT:</b> {selectedInvoiceClient.nuit}</p>
                    <p><b>Endereço:</b> {selectedInvoiceClient.endereco || 'Maputo, Moçambique'}</p>
                    <p><b>E-mail:</b> {selectedInvoiceClient.email || 'N/D'}</p>
                  </div>
                </div>
              </div>

              {/* Document Specific Content */}
              {documentType === 'fatura' ? (
                /* FATURA VIEW */
                <div className="space-y-3">
                  <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest block">DISCRIMINAÇÃO DOS SERVIÇOS PRESTADOS</span>
                  
                  <div className="border border-slate-400 rounded overflow-hidden text-[10px]">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-800 text-white font-extrabold text-[8.5px] uppercase tracking-wider">
                        <tr className="divide-x divide-slate-400">
                          <th className="p-2 w-16">Artigo</th>
                          <th className="p-2">Descrição / Serviço Prestado</th>
                          <th className="p-2 w-12 text-center">Quant.</th>
                          <th className="p-2 w-24 text-right">Preço Un.</th>
                          <th className="p-2 w-16 text-center">Desc.%</th>
                          <th className="p-2 w-16 text-center">Taxa IVA</th>
                          <th className="p-2 w-28 text-right">Total (MT)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300 text-slate-700 bg-white">
                        <tr className="divide-x divide-slate-300">
                          <td className="p-2 font-mono font-bold text-slate-900">SO-001</td>
                          <td className="p-2">
                            <span className="font-bold text-slate-900 block uppercase text-[10px]">Honorário Fixo Mensal</span>
                            <span className="text-[9px] text-slate-400 leading-tight block mt-0.5">Taxa de administração base da conta e infraestrutura do ERP de salários.</span>
                          </td>
                          <td className="p-2 text-center font-mono">1.00</td>
                          <td className="p-2 text-right font-mono">{selectedInvoiceClient.fee_base.toFixed(2)} MT</td>
                          <td className="p-2 text-center font-mono">0.00</td>
                          <td className="p-2 text-center font-mono">{selectedInvoiceClient.regime_iva !== 'Isento' ? '16.0%' : 'Isento'}</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">{selectedInvoiceClient.fee_base.toFixed(2)} MT</td>
                        </tr>
                        <tr className="divide-x divide-slate-300">
                          <td className="p-2 font-mono font-bold text-slate-900">SO-002</td>
                          <td className="p-2">
                            <span className="font-bold text-slate-900 block uppercase text-[10px]">Processamento de Recibos (Payslips)</span>
                            <span className="text-[9px] text-slate-400 leading-tight block mt-0.5">Emissão de recibos de salários auditados e cálculo fiscal por colaborador ativo ({selectedInvoiceClient.countEmployees} colaboradores).</span>
                          </td>
                          <td className="p-2 text-center font-mono">{selectedInvoiceClient.countEmployees.toFixed(2)}</td>
                          <td className="p-2 text-right font-mono">{selectedInvoiceClient.fee_por_slip.toFixed(2)} MT</td>
                          <td className="p-2 text-center font-mono">0.00</td>
                          <td className="p-2 text-center font-mono">{selectedInvoiceClient.regime_iva !== 'Isento' ? '16.0%' : 'Isento'}</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">{(selectedInvoiceClient.fee_por_slip * selectedInvoiceClient.countEmployees).toFixed(2)} MT</td>
                        </tr>
                        <tr className="divide-x divide-slate-300">
                          <td className="p-2 font-mono font-bold text-slate-900">SO-003</td>
                          <td className="p-2">
                            <span className="font-bold text-slate-900 block uppercase text-[10px]">Gestão de Guias de INSS & IRPS</span>
                            <span className="text-[9px] text-slate-400 leading-tight block mt-0.5">Geração e submissão automatizada da folha SISSMO e conformidade legal.</span>
                          </td>
                          <td className="p-2 text-center font-mono">1.00</td>
                          <td className="p-2 text-right font-mono">0.00 MT</td>
                          <td className="p-2 text-center font-mono">0.00</td>
                          <td className="p-2 text-center font-mono">Isento</td>
                          <td className="p-2 text-right font-mono text-slate-400 font-bold">Incluído</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* RECIBO VIEW */
                <div className="space-y-4">
                  <div className="p-3 bg-slate-50 border border-slate-300 rounded text-slate-800 text-[10px] leading-relaxed">
                    Declaramos para fins comerciais que recebemos de <b className="text-slate-950 uppercase">{selectedInvoiceClient.nome}</b>, com o NUIT <b className="text-slate-950">{selectedInvoiceClient.nuit}</b>, a quantia líquida total de <b className="text-slate-950 font-mono">
                      {(selectedInvoiceClient.regime_iva !== 'Isento' ? selectedInvoiceClient.billingFeeMzn * 1.16 : selectedInvoiceClient.billingFeeMzn).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT
                    </b> (<b>{numeroParaExtenso(selectedInvoiceClient.regime_iva !== 'Isento' ? selectedInvoiceClient.billingFeeMzn * 1.16 : selectedInvoiceClient.billingFeeMzn)}</b>) para a integral liquidação do documento de faturação abaixo especificado.
                  </div>

                  <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest block">DOCUMENTOS LIQUIDADOS & QUITADOS</span>
                  <div className="border border-slate-400 rounded overflow-hidden text-[10px]">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-800 text-white font-extrabold text-[8.5px] uppercase tracking-wider">
                        <tr className="divide-x divide-slate-400">
                          <th className="p-2 w-32">N.º Documento</th>
                          <th className="p-2">Descrição / Detalhe de Serviço</th>
                          <th className="p-2 w-28 text-center">Data Emissão</th>
                          <th className="p-2 w-28 text-right">Valor Original</th>
                          <th className="p-2 w-28 text-right">Valor Liquidado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300 text-slate-700 bg-white">
                        <tr className="divide-x divide-slate-300">
                          <td className="p-2 font-mono font-bold text-slate-900">FT-OUT-2026-06/{selectedInvoiceClient.nuit.substring(5)}</td>
                          <td className="p-2">
                            <span className="font-bold text-slate-900 block uppercase text-[10px]">Liquidação de Honorários de Outsourcing Mensal</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">Referente ao mês de Junho de 2026 (Processamento SaaS)</span>
                          </td>
                          <td className="p-2 text-center font-semibold">28-06-2026</td>
                          <td className="p-2 text-right font-mono">{(selectedInvoiceClient.regime_iva !== 'Isento' ? selectedInvoiceClient.billingFeeMzn * 1.16 : selectedInvoiceClient.billingFeeMzn).toFixed(2)} MT</td>
                          <td className="p-2 text-right font-mono font-black text-emerald-700">{(selectedInvoiceClient.regime_iva !== 'Isento' ? selectedInvoiceClient.billingFeeMzn * 1.16 : selectedInvoiceClient.billingFeeMzn).toFixed(2)} MT</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Summary Layout: Left Tax Summary, Right Totals (Classic Primavera ERP design) */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-4 border-t-2 border-slate-300">
                {/* Resumo de Impostos (Tax Summary) */}
                <div className="border border-slate-300 rounded overflow-hidden w-full sm:w-64 text-[8.5px] bg-slate-50/50">
                  <div className="bg-slate-700 text-white font-black p-1 text-center uppercase tracking-wide">
                    Quadro de Resumo de Impostos
                  </div>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-200 text-slate-600 font-bold border-b border-slate-300">
                        <th className="p-1">Cód. Taxa</th>
                        <th className="p-1 text-right">Incidência (MT)</th>
                        <th className="p-1 text-right">Valor Imposto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 text-slate-700 font-mono">
                      <tr>
                        <td className="p-1 font-semibold">{selectedInvoiceClient.regime_iva !== 'Isento' ? 'IVA (16.0%)' : 'Isento (Art.9)'}</td>
                        <td className="p-1 text-right">{selectedInvoiceClient.billingFeeMzn.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
                        <td className="p-1 text-right">
                          {selectedInvoiceClient.regime_iva !== 'Isento' 
                            ? (selectedInvoiceClient.billingFeeMzn * 0.16).toLocaleString('pt-PT', { minimumFractionDigits: 2 })
                            : '0.00'
                          }
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Totals Block */}
                <div className="w-full sm:w-64 border border-slate-400 rounded text-[10px] overflow-hidden bg-white">
                  <div className="p-1.5 flex justify-between border-b border-slate-300">
                    <span className="text-slate-500 font-bold uppercase text-[9px]">Total Ilíquido:</span>
                    <span className="font-mono font-bold text-slate-900">{selectedInvoiceClient.billingFeeMzn.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT</span>
                  </div>
                  <div className="p-1.5 flex justify-between border-b border-slate-300">
                    <span className="text-slate-500 font-bold uppercase text-[9px]">Total Desconto:</span>
                    <span className="font-mono font-bold text-slate-900">0.00 MT</span>
                  </div>
                  <div className="p-1.5 flex justify-between border-b border-slate-300 bg-slate-50">
                    <span className="text-slate-500 font-bold uppercase text-[9px]">Total Impostos (IVA):</span>
                    <span className="font-mono font-bold text-slate-900">
                      {selectedInvoiceClient.regime_iva !== 'Isento' 
                        ? (selectedInvoiceClient.billingFeeMzn * 0.16).toLocaleString('pt-PT', { minimumFractionDigits: 2 })
                        : '0.00'
                      } MT
                    </span>
                  </div>
                  <div className="p-2 flex justify-between bg-slate-800 text-white font-extrabold items-center">
                    <span className="uppercase text-[8px] tracking-widest block font-black">Total a Pagar (MT):</span>
                    <span className="font-mono text-xs block font-black">
                      {(selectedInvoiceClient.regime_iva !== 'Isento' ? selectedInvoiceClient.billingFeeMzn * 1.16 : selectedInvoiceClient.billingFeeMzn).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT
                    </span>
                  </div>
                </div>
              </div>

              {/* Coordenadas Bancárias & Instruções */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg space-y-1.5 text-[9.5px] text-slate-700 leading-relaxed">
                <span className="font-bold text-slate-900 block flex items-center gap-1 text-[10px]">
                  <ShieldCheck size={13} className="text-blue-900" />
                  Coordenadas Bancárias Oficiais para Transferência / M-Pesa (Payroll Tech MZ, Lda)
                </span>
                <p className="text-[9px]">
                  Efectue a transferência bancária para uma das contas abaixo e envie o comprovativo para: <b>gersonjcumbane@gmail.com</b>
                </p>
                <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[8.5px] text-slate-800">
                  <div className="p-1.5 bg-white rounded border border-blue-150">
                    <b className="text-blue-900 block">MILLENNIUM BIM</b>
                    Conta: 9944-8833-MZ<br />
                    NIB: 0001 0000 9944 8833 01
                  </div>
                  <div className="p-1.5 bg-white rounded border border-blue-150">
                    <b className="text-blue-900 block">BCI FOMENTO</b>
                    Conta: 1122-3344-MZ<br />
                    NIB: 0008 0000 1122 3344 02
                  </div>
                  <div className="p-1.5 bg-white rounded border border-blue-150">
                    <b className="text-blue-900 block">M-PESA / E-MOLA</b>
                    M-Pesa: +258 861390061<br />
                    E-Mola: +258 871234567
                  </div>
                </div>
              </div>

              {/* Certified Software & Watermark Block */}
              <div className="border-t border-slate-300 pt-3 space-y-4 text-[9px] text-slate-500">
                <div className="flex justify-between items-center text-[7.5px] font-bold text-slate-400">
                  <span>Processado por Computador | Software Certificado nº 01/AT/2026 | PRIMAVERA ERP V10</span>
                  <span className="uppercase tracking-wider">Original</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-center pt-2">
                  <div className="space-y-1">
                    <div className="border-b border-dashed border-slate-300 w-48 mx-auto h-5"></div>
                    <p className="text-[7.5px] text-slate-400 uppercase tracking-widest font-bold">Assinatura Autorizada (Payroll Tech)</p>
                  </div>
                  <div className="space-y-1">
                    <div className="border-b border-dashed border-slate-300 w-48 mx-auto h-5"></div>
                    <p className="text-[7.5px] text-slate-400 uppercase tracking-widest font-bold">Exmo.(s) Senhor(es) (O Cliente)</p>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 border border-slate-100 text-center">
              <p className="text-xs text-slate-400">Selecione um cliente para visualizar o seu demonstrativo de faturação mensal.</p>
            </div>
          )}
        </div>

      </div>

      {/* SEÇÃO FIREBASE AUTHENTICATION MANAGER (GESTÃO COMPLETA DE LOGINS DO PROPRIETÁRIO) */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-6 mt-8 print:hidden" id="firebase-auth-control-panel">
        <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-[9px] font-extrabold tracking-wider uppercase">
              🔥 Integração Firebase Sincronizada
            </span>
            <h3 className="text-base font-black tracking-tight flex items-center gap-2 text-slate-100">
              <Key className="text-indigo-400" size={18} />
              Gestor de Contas de Acesso (Firebase Auth)
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-2xl">
              Crie, atualize, altere senhas e gerencie múltiplos logins de utilizadores no sistema. Cada conta criada aqui é automaticamente sincronizada com o Firebase Authentication para garantir a segurança dos acessos individuais dos seus clientes.
            </p>
          </div>
          <button
            onClick={fetchFbUsers}
            className="p-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700/50 flex items-center gap-2 active:scale-95 cursor-pointer self-start md:self-auto animate-none"
            title="Sincronizar utilizadores com Firebase"
          >
            <RefreshCw size={14} className={loadingFbUsers ? "animate-spin text-indigo-400" : ""} />
            Sincronizar Lista
          </button>
        </div>

        {isEmailPasswordDisabled && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 text-xs text-amber-200 space-y-3 animate-none">
            <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm">
              <span className="p-1.5 bg-amber-500/20 rounded-lg text-amber-300">⚠️</span>
              Provedor "E-mail/Senha" desativado no Firebase!
            </div>
            <p className="leading-relaxed text-[11px] text-slate-300">
              O Firebase retornou o erro <code className="font-mono bg-slate-950 px-1 py-0.5 rounded text-rose-300">OPERATION_NOT_ALLOWED</code>. Isto significa que o provedor de autenticação por E-mail e Palavra-passe ainda não está ativo no seu projeto Firebase.
            </p>
            <div className="text-[11px] text-slate-300 space-y-2">
              <p className="font-bold text-slate-200">Como corrigir isso em 1 minuto:</p>
              <ol className="list-decimal pl-5 space-y-1.5 text-slate-400">
                <li>Aceda ao seu <a href={`https://console.firebase.google.com/project/${fbProjectId}/authentication/providers`} target="_blank" rel="noreferrer" className="underline text-indigo-400 hover:text-indigo-300 font-extrabold inline-flex items-center gap-1">Firebase Console <ArrowUpRight size={12} /></a>.</li>
                <li>Clique no separador <strong className="text-slate-200">Authentication</strong> no menu lateral esquerdo.</li>
                <li>Vá até <strong className="text-slate-200">Sign-in method</strong> (Método de início de sessão).</li>
                <li>Clique em <strong className="text-slate-200">Adicionar novo provedor</strong> (ou selecione <strong className="text-slate-200">E-mail/Senha</strong>).</li>
                <li>Ative o botão de alternância (Habilitar) e clique em <strong className="text-indigo-400">Guardar</strong>.</li>
              </ol>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 text-[10px] text-emerald-400 font-medium">
              💡 <strong>Garantia de Funcionamento:</strong> O sistema ativou automaticamente um fallback de autenticação local seguro para que você e os seus clientes possam continuar a iniciar sessão e testar todas as funcionalidades do sistema sem interrupções!
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COLUNA 1: Form para criar login */}
          <div className="bg-slate-950 rounded-xl p-5 border border-slate-800 space-y-4">
            <div>
              <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <UserPlus className="text-indigo-400" size={14} />
                Registar Novo Login
              </h4>
              <p className="text-[10px] text-slate-500">Crie credenciais prontas para o Firebase Auth.</p>
            </div>

            <form onSubmit={handleCreateFbUser} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block">E-mail de Acesso (Login) *</label>
                <input
                  type="email"
                  required
                  value={newFbEmail}
                  onChange={(e) => setNewFbEmail(e.target.value)}
                  placeholder="rh@empresa.co.mz"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block">Palavra-passe de Acesso *</label>
                <input
                  type="password"
                  required
                  value={newFbPassword}
                  onChange={(e) => setNewFbPassword(e.target.value)}
                  placeholder="Min. 6 caracteres"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block">Nível de Função de Utilizador</label>
                <select
                  value={newFbRole}
                  onChange={(e) => setNewFbRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="CLIENTE_EMPRESA">Cliente Empresa (Gestor de RH da Empresa Cliente)</option>
                  <option value="SUPER_ADMIN_PAYROLL">Founders Super Admin (Acesso Global Multitask)</option>
                </select>
              </div>

              {newFbRole === 'CLIENTE_EMPRESA' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 block">Associar ao Contexto de Empresa</label>
                  <select
                    value={newFbCompanyId}
                    onChange={(e) => setNewFbCompanyId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">-- Escolher Empresa do Portfólio --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.nome} (NUIT: {c.nuit})</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg hover:shadow-indigo-500/10 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <UserPlus size={14} />
                Registar no Firebase Auth
              </button>
            </form>
          </div>

          {/* COLUNA 2 e 3: Tabela/Lista dos Logins Cadastrados */}
          <div className="lg:col-span-2 bg-slate-950 rounded-xl p-5 border border-slate-800 space-y-4">
            <div>
              <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="text-indigo-400" size={14} />
                Logins Sincronizados no Firebase ({fbUsers.length})
              </h4>
              <p className="text-[10px] text-slate-500">Credenciais ativas, níveis de permissão e redefinição de senhas.</p>
            </div>

            {loadingFbUsers ? (
              <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                <RefreshCw size={20} className="animate-spin text-indigo-500" />
                A comunicar com o Firebase Authentication...
              </div>
            ) : fbUsers.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Nenhum utilizador registado no Firebase ainda.
              </div>
            ) : (
              <div className="border border-slate-850 rounded-xl overflow-hidden divide-y divide-slate-850 max-h-[380px] overflow-y-auto">
                {fbUsers.map((user: any) => (
                  <div key={user.email} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="p-1 bg-slate-900 text-indigo-400 rounded-lg">
                          <Lock size={12} />
                        </span>
                        <span className="text-xs font-extrabold text-slate-100 select-all">{user.email}</span>
                        
                        {/* Role Badge */}
                        <span className={`px-2 py-0.5 text-[8px] font-extrabold rounded uppercase tracking-wider ${
                          user.role === 'SUPER_ADMIN_PAYROLL'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {user.role === 'SUPER_ADMIN_PAYROLL' ? 'Super Admin' : 'Cliente ERP'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-slate-400 font-medium">
                        <span className="text-slate-500 font-semibold">Contexto:</span>
                        <span className="text-slate-300 font-bold flex items-center gap-1">
                          <Building2 size={10} className="text-slate-500" />
                          {user.companyName}
                        </span>
                        <span className="text-slate-600">|</span>
                        <span className="text-slate-500 font-semibold">Senha:</span>
                        <span className="text-slate-400 font-mono bg-slate-900 px-1 rounded">••••••••</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:sm:self-auto">
                      {editingUserEmail === user.email ? (
                        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                          <input
                            type="text"
                            value={editingUserPassword}
                            onChange={(e) => setEditingUserPassword(e.target.value)}
                            placeholder="Nova Senha"
                            className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-mono font-semibold focus:outline-none w-28 text-slate-100"
                          />
                          <button
                            onClick={() => handleUpdateFbUser(user.email)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={() => {
                              setEditingUserEmail(null);
                              setEditingUserPassword('');
                            }}
                            className="px-2 py-1 text-slate-400 hover:text-white text-[10px] font-medium cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingUserEmail(user.email);
                              setEditingUserPassword('');
                            }}
                            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw size={11} />
                            Mudar Senha
                          </button>

                          {user.email !== 'admin@payrolltech.co.mz' && (
                            <button
                              onClick={() => handleDeleteFbUser(user.email)}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-xl transition-all border border-rose-500/10 cursor-pointer"
                              title="Remover este utilizador"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
