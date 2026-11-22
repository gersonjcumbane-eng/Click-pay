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
  ArrowUpRight,
  Bell,
  Cloud
} from 'lucide-react';
import { useToast, useConfirm } from '../context/ToastContext';
import { db, doc, setDoc, collection, onSnapshot } from '../lib/firebase';
import { getDefaultNextBillingDate, baseDadosClientes } from '../db_tax';
import { hashPassword } from '../lib/security';
import { getAuthHeaders, isFounderUser } from '../lib/authSession';
import { getPlanExtraSlipFeeMzn, getPlanFeeMzn } from '../lib/pricing';
import {
  computeDocumentHashCode,
  PRIMAVERA_COMPUTER_NOTE
} from '../utils/documentUtils';

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
  userRole?: string | null;
}

export default function ClientManagement({ onCompanySwitched, userRole }: ClientManagementProps) {
  const { showSuccess, showError } = useToast();
  const confirmAction = useConfirm();
  const isSuperAdmin = isFounderUser(userRole);
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
  const [feeBase, setFeeBase] = useState('1500');
  const [feePorSlip, setFeePorSlip] = useState('120');
  const [newPassword, setNewPassword] = useState('');
  const [subStatus, setSubStatus] = useState<'ativo' | 'suspenso' | 'pendente'>('ativo');
  const [subPlan, setSubPlan] = useState<'Bronze' | 'Silver' | 'Gold' | 'Platinum'>('Bronze');
  const [nextBillingDate, setNextBillingDate] = useState(() => getDefaultNextBillingDate());

  // Selected client for generating a services invoice & subscription dashboard
  const [selectedInvoiceClient, setSelectedInvoiceClient] = useState<ClientCompany | null>(null);
  const [documentType, setDocumentType] = useState<'fatura' | 'recibo'>('fatura');

  // Edit fields state for managing the subscription of selected client
  const [editStatus, setEditStatus] = useState<'ativo' | 'suspenso' | 'pendente'>('ativo');
  const [editPlan, setEditPlan] = useState<'Bronze' | 'Silver' | 'Gold' | 'Platinum'>('Bronze');
  const [editFeeBase, setEditFeeBase] = useState('1500');
  const [editFeePorSlip, setEditFeePorSlip] = useState('120');
  const [editNextBillingDate, setEditNextBillingDate] = useState(() => getDefaultNextBillingDate());
  const [editPassword, setEditPassword] = useState('');
  const [updatingSubscription, setUpdatingSubscription] = useState(false);

  // Solicitações de Credenciais em tempo real (Firebase + API)
  const [credentialRequests, setCredentialRequests] = useState<any[]>([]);
  const [firebaseSynced, setFirebaseSynced] = useState<boolean>(true);

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
    setEditNextBillingDate(client.next_billing_date || getDefaultNextBillingDate());
    setEditPassword('');
  };

  const fetchFbUsers = async () => {
    if (!isSuperAdmin) return;
    try {
      setLoadingFbUsers(true);
      const res = await fetch('/api/firebase-auth/users', { headers: getAuthHeaders() });
      if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
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
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch('/api/clients', { headers: getAuthHeaders() });
      const isJson = res.ok && (res.headers.get('content-type') || '').includes('application/json');
      const data = isJson ? await res.json() : [];
      setClients(Array.isArray(data) ? data : []);
      setError(null);
      
      const active = (Array.isArray(data) ? data : []).find((c: ClientCompany) => c.isActive);
      if (active && !selectedInvoiceClient) {
        selectInvoiceClientAndSync(active);
      } else if (selectedInvoiceClient) {
        const updatedSelected = (Array.isArray(data) ? data : []).find((c: ClientCompany) => c.id === selectedInvoiceClient.id);
        if (updatedSelected) {
          selectInvoiceClientAndSync(updatedSelected);
        }
      }
    } catch (err: any) {
      setClients([]);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchCredentialRequests = async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await fetch('/api/admin/credential-requests', { headers: getAuthHeaders() });
      if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCredentialRequests(prev => {
            const combined = [...prev];
            data.forEach(item => {
              if (!combined.some(c => c.id === item.id)) combined.unshift(item);
            });
            return combined;
          });
        }
      }
    } catch (e) {
      console.warn('Erro ao buscar solicitações de credenciais:', e);
    }
  };

  useEffect(() => {
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }
    fetchClients();
    fetchFbUsers();
    fetchCredentialRequests();

    let unsubReq: (() => void) | undefined;
    try {
      unsubReq = onSnapshot(collection(db, 'credential_requests'), (snap) => {
        const list: any[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        if (list.length > 0) {
          setCredentialRequests(prev => {
            const combined = [...prev];
            list.forEach(item => {
              if (!combined.some(c => c.id === item.id)) {
                combined.unshift(item);
                showSuccess(`🔑 Nova solicitação de credenciais recebida: ${item.empresa || item.email}`);
              }
            });
            return combined;
          });
        }
      }, (error) => {
        console.warn('Erro no listener de credential_requests Firebase:', error);
      });
    } catch (e) {
      console.warn('Listener Firebase credential_requests:', e);
    }

    let unsubClients: (() => void) | undefined;
    try {
      unsubClients = onSnapshot(collection(db, 'saas_clients'), (snap) => {
        const fbClients: ClientCompany[] = [];
        snap.forEach((d) => {
          const data = d.data() || {};
          const rawPlan = String(data.plan || 'Starter').toLowerCase();
          const normalizedPlan: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' =
            rawPlan.includes('platinum') ? 'Platinum' :
            rawPlan.includes('gold') || rawPlan.includes('business') || rawPlan.includes('empresarial') ? 'Gold' :
            rawPlan.includes('silver') || rawPlan.includes('growth') || rawPlan.includes('profissional') ? 'Silver' :
            'Bronze';
          const fallbackFee = getPlanFeeMzn(normalizedPlan);
          fbClients.push({
            id: d.id,
            nome: String(data.companyName || data.tradeName || data.nome || 'Empresa ClickPay'),
            nuit: String(data.nuit || ''),
            endereco: String(data.address || data.endereco || 'Maputo'),
            provincia: String(data.provincia || 'Maputo Cidade'),
            distrito: String(data.distrito || 'KaMpfumo'),
            regime_iva: 'IVA Normal (16%)',
            nuel: String(data.nuel || ''),
            email: String(data.email || ''),
            telefone: String(data.phone || data.telefone || '+258 84 000 0000'),
            logo: '/clickpay-logo.png',
            subscription_status: String(data.status || 'ativo').toLowerCase() === 'suspenso' ? 'suspenso' : 'ativo',
            subscription_plan: normalizedPlan,
            fee_base: Number(data.monthlyFee) || fallbackFee,
            fee_por_slip: getPlanExtraSlipFeeMzn(normalizedPlan),
            billingFeeMzn: Number(data.monthlyFee) || fallbackFee,
            next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            countEmployees: 0,
            payrollGrossTotal: 0,
            isActive: false
          });
        });
        if (fbClients.length > 0) {
          setClients(prev => {
            const combined = [...prev];
            fbClients.forEach(fc => {
              const existingIdx = combined.findIndex(c => c.id === fc.id || (fc.email && c.email?.toLowerCase() === fc.email.toLowerCase()));
              if (existingIdx === -1) {
                combined.unshift(fc);
              }
            });
            return combined;
          });
        }
      }, (error) => {
        console.warn('Erro no listener de saas_clients Firebase:', error);
      });
    } catch (e) {
      console.warn('Listener Firebase saas_clients:', e);
    }

    return () => {
      if (unsubReq) unsubReq();
      if (unsubClients) unsubClients();
    };
  }, [isSuperAdmin]);

  const handleCreateFbUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFbEmail || !newFbPassword) {
      showError('Por favor, defina o e-mail e a palavra-passe do utilizador.');
      return;
    }
    const targetCompanyId = newFbCompanyId || (clients[0]?.id || 'cli_bronze');
    try {
      const res = await fetch('/api/firebase-auth/users', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          email: newFbEmail,
          password: newFbPassword,
          role: newFbRole,
          companyId: targetCompanyId
        })
      });
      if (!res.ok) throw new Error('Erro ao sincronizar com o Firebase Auth.');

      try {
        const hashedPass = await hashPassword(newFbPassword);
        await setDoc(doc(db, 'saas_clients', targetCompanyId), {
          email: newFbEmail,
          adminPassword: hashedPass,
          role: newFbRole,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (fbErr) {
        console.warn('Aviso ao gravar utilizador no Firestore:', fbErr);
      }

      showSuccess('Novo utilizador registado e sincronizado no Firebase com sucesso!');
      setNewFbEmail('');
      setNewFbPassword('');
      fetchFbUsers();
      fetchClients();
    } catch (err: any) {
      showError(err.message || 'Erro ao criar conta de acesso.');
    }
  };

  const handleUpdateFbUser = async (email: string) => {
    if (!editingUserPassword) {
      showError('Defina a nova palavra-passe de acesso.');
      return;
    }
    try {
      const res = await fetch('/api/firebase-auth/users', {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          email,
          password: editingUserPassword
        })
      });
      if (!res.ok) throw new Error('Erro ao atualizar palavra-passe.');

      try {
        const comp = clients.find(c => c.email === email);
        if (comp) {
          const hashedPass = await hashPassword(editingUserPassword);
          await setDoc(doc(db, 'saas_clients', comp.id), {
            email,
            adminPassword: hashedPass,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      } catch (fbErr) {
        console.warn('Aviso ao atualizar senha no Firestore:', fbErr);
      }

      showSuccess(`Palavra-passe de ${email} atualizada com sucesso no Firebase!`);
      setEditingUserEmail(null);
      setEditingUserPassword('');
      fetchFbUsers();
      fetchClients();
    } catch (err: any) {
      showError(err.message || 'Erro ao guardar nova senha.');
    }
  };

  const handleDeleteFbUser = async (email: string) => {
    if (email === 'admin@payrolltech.co.mz') {
      showError('Não é permitido desativar a conta mestre dos Founders.');
      return;
    }
    const confirmed = await confirmAction({
      title: 'Desassociar Utilizador Firebase Auth',
      message: `Tem a certeza que deseja desassociar a conta ${email} do Firebase Auth?`,
      confirmText: 'Desassociar',
      variant: 'danger'
    });
    if (!confirmed) {
      return;
    }
    try {
      const res = await fetch(`/api/firebase-auth/users/${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Erro ao apagar registo.');
      showSuccess(`Utilizador ${email} removido do Firebase Auth com sucesso!`);
      fetchFbUsers();
      fetchClients();
    } catch (err: any) {
      showError(err.message || 'Erro ao desassociar conta.');
    }
  };

  const handleSelectClient = async (id: string) => {
    try {
      const res = await fetch('/api/clients/select', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ id })
      });
      if (!res.ok) throw new Error('Erro ao alternar para esta empresa cliente.');
      const data = await res.json();
      
      // Notify parent to reload main metrics (employees, contracts, settings)
      onCompanySwitched();
      
      // Re-fetch clients to update active badge
      await fetchClients();
    } catch (err: any) {
      showError(err.message || 'Erro ao alternar de contexto.');
    }
  };

  const handleDeleteClient = async (id: string, name: string) => {
    const confirmed = await confirmAction({
      title: 'Eliminar Cliente do ERP',
      message: `Tem a certeza que deseja eliminar o cliente "${name}" permanentemente do ERP? Esta ação é irreversível e apagará todos os colaboradores e processamentos associados.`,
      confirmText: 'Eliminar Cliente',
      variant: 'danger'
    });
    if (!confirmed) {
      return;
    }
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Não foi possível eliminar o cliente.');
      const data = await res.json();
      
      if (selectedInvoiceClient?.id === id) {
        setSelectedInvoiceClient(null);
      }
      
      onCompanySwitched();
      await fetchClients();
    } catch (err: any) {
      showError(err.message || 'Erro ao eliminar o cliente.');
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !nuit) {
      showError('Nome da Empresa e NUIT são obrigatórios.');
      return;
    }

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
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
      const resData = await res.json();
      const createdId = resData.cliente?.id || `cli_${Date.now()}`;

      try {
        const hashedNewPass = newPassword ? await hashPassword(newPassword) : '';
        await setDoc(doc(db, 'saas_clients', createdId), {
          id: createdId,
          companyName: nome,
          tradeName: nome,
          nuit,
          email,
          phone: telefone,
          address: `${endereco}, ${distrito}, ${provincia}`,
          plan: subPlan,
          monthlyFee: Number(feeBase),
          status: subStatus === 'ativo' ? 'Ativo' : subStatus === 'suspenso' ? 'Suspenso' : 'Pendente',
          adminName: nome,
          adminPassword: hashedNewPass,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (fbErr) {
        console.warn('Aviso ao gravar cliente no Firebase:', fbErr);
      }
      
      showSuccess('Nova empresa cliente registada e sincronizada no Firebase com sucesso!');
      setShowAddForm(false);
      
      // Reset fields
      setNome('');
      setNuit('');
      setEndereco('');
      setNuel('');
      setEmail('');
      setTelefone('');
      setLogo('');
      setFeeBase('3000');
      setFeePorSlip('150');
      setNewPassword('');
      setSubStatus('ativo');
      setSubPlan('Bronze');
      setNextBillingDate(getDefaultNextBillingDate());

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
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
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

      try {
        const fbUpdate: any = {
          plan: editPlan,
          monthlyFee: Number(editFeeBase),
          status: editStatus === 'ativo' ? 'Ativo' : editStatus === 'suspenso' ? 'Suspenso' : 'Pendente',
          nextBillingDate: editNextBillingDate,
          updatedAt: new Date().toISOString()
        };
        if (editPassword) fbUpdate.adminPassword = await hashPassword(editPassword);
        await setDoc(doc(db, 'saas_clients', selectedInvoiceClient.id), fbUpdate, { merge: true });
      } catch (fbErr) {
        console.warn('Aviso ao atualizar assinatura no Firebase:', fbErr);
      }

      showSuccess(data.mensagem || 'Assinatura e credenciais sincronizadas no Firebase!');
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

  if (!isSuperAdmin) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white border border-rose-200 rounded-2xl p-8 text-center space-y-3 shadow-xs">
        <div className="w-12 h-12 mx-auto rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
          <Lock size={22} />
        </div>
        <h2 className="text-lg font-bold text-slate-950">Acesso Restrito ao Fundador</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          O Gestor de Clientes e o painel multi-empresa são exclusivos do Fundador da plataforma.
        </p>
      </div>
    );
  }

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

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-[11px] font-extrabold">
            <Cloud size={14} className="text-emerald-600" />
            Firebase Realtime Sync Ativo
          </span>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-900 hover:bg-blue-850 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer shrink-0"
          >
            <Plus size={16} />
            {showAddForm ? 'Fechar Formulário' : 'Novo Cliente Outsourcing'}
          </button>
        </div>
      </div>

      {/* Painel de Notificações de Solicitação de Credenciais em Tempo Real */}
      {credentialRequests.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-5 shadow-xs space-y-3 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500 text-white rounded-xl">
                <Bell size={16} />
              </div>
              <div>
                <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                  Notificações de Solicitação de Credenciais ({credentialRequests.length})
                </h3>
                <p className="text-[11px] text-amber-800">
                  Clientes que solicitaram credenciais de acesso na página oficial (sincronizado via Firebase).
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {credentialRequests.slice(0, 6).map((req) => (
              <div key={req.id} className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs flex flex-col justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900">{req.empresa}</span>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-blue-100 text-blue-900 rounded">
                      {req.plano || 'Starter'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium">
                    <b>Resp:</b> {req.responsavel || 'N/D'} | <b>NUIT:</b> {req.nuit || 'N/D'}
                  </p>
                  <p className="text-[11px] text-blue-900 font-mono font-bold">{req.email}</p>
                  <p className="text-[11px] text-emerald-700 font-bold">Tel: {req.telefone}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(true);
                    setNome(req.empresa || '');
                    setNuit(req.nuit && req.nuit !== 'Não informado' ? req.nuit : '');
                    setEmail(req.email || '');
                    setTelefone(req.telefone || '');
                    setSubPlan(req.plano === 'Business' || req.plano === 'Gold' ? 'Gold' : req.plano === 'Growth' || req.plano === 'Silver' ? 'Silver' : 'Bronze');
                    setFeeBase(String(getPlanFeeMzn(req.plano)));
                    setFeePorSlip(String(getPlanExtraSlipFeeMzn(req.plano)));
                  }}
                  className="w-full py-1.5 bg-blue-900 hover:bg-blue-950 text-white rounded-lg text-[10px] font-extrabold uppercase tracking-wider cursor-pointer transition-colors"
                >
                  Provisionar Credenciais no Firebase
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
                onChange={(e) => {
                  const next = e.target.value as 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
                  setSubPlan(next);
                  if (next !== 'Platinum') {
                    setFeeBase(String(getPlanFeeMzn(next)));
                    setFeePorSlip(String(getPlanExtraSlipFeeMzn(next)));
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900"
              >
                <option value="Bronze">Starter · Bronze (1.500 MT/mês)</option>
                <option value="Silver">Profissional · Silver (3.500 MT/mês)</option>
                <option value="Gold">Empresarial · Gold (6.900 MT/mês)</option>
                <option value="Platinum">Platinum · Personalizado</option>
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
                              <span className="text-slate-600 font-bold">{client.next_billing_date || getDefaultNextBillingDate()}</span>
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
                      onChange={(e) => {
                        const next = e.target.value as 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
                        setEditPlan(next);
                        if (next !== 'Platinum') {
                          setEditFeeBase(String(getPlanFeeMzn(next)));
                          setEditFeePorSlip(String(getPlanExtraSlipFeeMzn(next)));
                        }
                      }}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="Bronze">Starter · Bronze (1.500 MT)</option>
                      <option value="Silver">Profissional · Silver (3.500 MT)</option>
                      <option value="Gold">Empresarial · Gold (6.900 MT)</option>
                      <option value="Platinum">Platinum · Custom</option>
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
            (() => {
              const docNumber = `${documentType === 'fatura' ? 'FT' : 'RC'}-OUT-2026-06/${selectedInvoiceClient.nuit.substring(5)}`;
              const isExempt = selectedInvoiceClient.regime_iva === 'Isento';
              const subtotalVal = selectedInvoiceClient.billingFeeMzn;
              const ivaVal = isExempt ? 0 : subtotalVal * 0.16;
              const totalComIva = subtotalVal + ivaVal;
              const hashControlo = computeDocumentHashCode(docNumber, totalComIva, '402302399');

              return (
                <div
                  data-a4-print-sheet="true"
                  className="bg-white border border-slate-900 w-full max-w-[210mm] min-h-[297mm] mx-auto px-6 py-6 sm:px-8 sm:py-8 shadow-sm flex flex-col justify-between gap-5 text-slate-900 relative print:border-none print:shadow-none print:p-2 print:max-w-none print:w-full"
                >
                  <div className="space-y-5">
                    {/* Primavera ERP V10 Header Layout */}
                    <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-slate-900 pb-4 gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5">
                          <img src="/clickpay-logo.png" alt="ClickPay" className="h-11 w-auto object-contain" referrerPolicy="no-referrer" />
                          <div>
                            <span className="text-sm font-bold text-slate-950 block uppercase tracking-tight">ClickPay Moçambique, Lda</span>
                            <span className="text-[9px] font-mono text-slate-500 tracking-wider uppercase">ERP &amp; Fintech · NUEL 105086659</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-700 leading-snug">
                          Av. 24 de Julho, nº 1500, 5º Andar · Maputo Cidade, Moçambique<br />
                          <span className="font-mono tabular-nums"><b>NUIT:</b> 402302399</span> | <b>Tel:</b> +258 86 139 0061<br />
                          <b>E-mail:</b> gersonjcumbane@gmail.com
                        </p>
                      </div>

                      {/* Primavera Doc Type and Metadata Box */}
                      <div className="border border-slate-900 w-full sm:w-64 overflow-hidden text-[10px] bg-white shrink-0">
                        <div className="bg-slate-900 text-white font-bold px-3 py-1.5 flex items-center justify-between uppercase text-[10px] tracking-wider">
                          <span>{documentType === 'fatura' ? 'Fatura Proforma' : 'Recibo de Liquidação'}</span>
                          <span className="font-mono text-[9px] text-slate-300">ORIGINAL</span>
                        </div>
                        <div className="grid grid-cols-2 divide-x divide-y divide-slate-300 border-t border-slate-900 bg-white text-slate-800">
                          <div className="p-1.5 col-span-2 bg-slate-50 flex items-center justify-between">
                            <span className="text-[8.5px] text-slate-500 uppercase font-semibold">Documento N.º</span>
                            <span className="font-mono tabular-nums font-bold text-slate-950 text-[11px]">
                              {docNumber}
                            </span>
                          </div>
                          <div className="p-1.5">
                            <span className="text-[8px] text-slate-500 block uppercase font-semibold">Data Emissão</span>
                            <span className="font-mono tabular-nums font-semibold text-slate-950">28-06-2026</span>
                          </div>
                          {documentType === 'fatura' ? (
                            <div className="p-1.5">
                              <span className="text-[8px] text-slate-500 block uppercase font-semibold">Vencimento</span>
                              <span className="font-mono tabular-nums font-semibold text-rose-700">10-07-2026</span>
                            </div>
                          ) : (
                            <div className="p-1.5">
                              <span className="text-[8px] text-slate-500 block uppercase font-semibold">Ref. Fatura</span>
                              <span className="font-mono tabular-nums font-semibold text-slate-950">FT-OUT-2026-06/{selectedInvoiceClient.nuit.substring(5)}</span>
                            </div>
                          )}
                          <div className="p-1.5">
                            <span className="text-[8px] text-slate-500 block uppercase font-semibold">Moeda</span>
                            <span className="font-semibold text-slate-950">MZN (Metical)</span>
                          </div>
                          <div className="p-1.5">
                            <span className="text-[8px] text-slate-500 block uppercase font-semibold">Página</span>
                            <span className="font-mono tabular-nums font-semibold text-slate-950">1 / 1</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Envelope Window & Conditions Layout */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[10px]">
                      <div className="text-[9.5px] text-slate-600 space-y-1 bg-slate-50 p-3 border border-slate-300">
                        <p className="font-bold text-slate-900 uppercase tracking-wider text-[8.5px]">Condições Gerais &amp; Enquadramento</p>
                        <p><b>Regime Fiscal:</b> {isExempt ? 'Isento de IVA' : 'IVA Normal (16%) — Moçambique'}</p>
                        <p><b>Vencimento:</b> Liquidar até à data limite indicada no documento.</p>
                        <p><b>Liquidação:</b> Transferência bancária, NIB ou Carteira Móvel M-Pesa / e-Mola.</p>
                      </div>

                      <div className="border border-slate-900 p-3 bg-white">
                        <span className="text-[8.5px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Exmo.(s) Senhor(es)</span>
                        <h5 className="font-bold text-slate-950 text-xs uppercase">{selectedInvoiceClient.nome}</h5>
                        <div className="text-[9.5px] text-slate-700 mt-1 space-y-0.5 leading-snug">
                          <p className="font-mono tabular-nums"><b>NUIT:</b> {selectedInvoiceClient.nuit}</p>
                          <p><b>Endereço:</b> {selectedInvoiceClient.endereco || 'Maputo, Moçambique'}</p>
                          <p><b>E-mail:</b> {selectedInvoiceClient.email || 'N/D'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Document Specific Content */}
                    {documentType === 'fatura' ? (
                      <div className="space-y-2">
                        <span className="text-[8.5px] text-slate-600 font-bold uppercase tracking-wider block">
                          Discriminação de Artigos / Serviços
                        </span>
                        <div className="border border-slate-900 overflow-hidden text-[10px]">
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-900 text-white font-bold text-[9px] uppercase tracking-wider">
                              <tr className="divide-x divide-slate-700">
                                <th className="p-2 w-16">Artigo</th>
                                <th className="p-2">Descrição / Serviço Prestado</th>
                                <th className="p-2 w-14 text-center">Qtd.</th>
                                <th className="p-2 w-24 text-right">Pr. Unit.</th>
                                <th className="p-2 w-14 text-center">Desc.%</th>
                                <th className="p-2 w-16 text-center">IVA</th>
                                <th className="p-2 w-24 text-right">Total (MT)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 text-slate-800 bg-white">
                              <tr className="divide-x divide-slate-200">
                                <td className="p-2 font-mono tabular-nums font-bold text-slate-950">SO-001</td>
                                <td className="p-2">
                                  <span className="font-semibold text-slate-950 block uppercase text-[9.5px]">Honorário Fixo Mensal (Plataforma SaaS)</span>
                                  <span className="text-[8.5px] text-slate-500 block mt-0.5">Subscrição e manutenção base do portal ERP de salários e faturação.</span>
                                </td>
                                <td className="p-2 text-center font-mono tabular-nums">1,00</td>
                                <td className="p-2 text-right font-mono tabular-nums">{selectedInvoiceClient.fee_base.toFixed(2)}</td>
                                <td className="p-2 text-center font-mono tabular-nums">0,00</td>
                                <td className="p-2 text-center font-mono tabular-nums">{!isExempt ? '16,0%' : 'Isento'}</td>
                                <td className="p-2 text-right font-mono tabular-nums font-bold text-slate-950">{selectedInvoiceClient.fee_base.toFixed(2)}</td>
                              </tr>
                              <tr className="divide-x divide-slate-200">
                                <td className="p-2 font-mono tabular-nums font-bold text-slate-950">SO-002</td>
                                <td className="p-2">
                                  <span className="font-semibold text-slate-950 block uppercase text-[9.5px]">Processamento de Recibos (Payslips)</span>
                                  <span className="text-[8.5px] text-slate-500 block mt-0.5">Emissão e cálculo fiscal auditado ({selectedInvoiceClient.countEmployees} colaboradores ativos).</span>
                                </td>
                                <td className="p-2 text-center font-mono tabular-nums">{selectedInvoiceClient.countEmployees.toFixed(2)}</td>
                                <td className="p-2 text-right font-mono tabular-nums">{selectedInvoiceClient.fee_por_slip.toFixed(2)}</td>
                                <td className="p-2 text-center font-mono tabular-nums">0,00</td>
                                <td className="p-2 text-center font-mono tabular-nums">{!isExempt ? '16,0%' : 'Isento'}</td>
                                <td className="p-2 text-right font-mono tabular-nums font-bold text-slate-950">{(selectedInvoiceClient.fee_por_slip * selectedInvoiceClient.countEmployees).toFixed(2)}</td>
                              </tr>
                              <tr className="divide-x divide-slate-200">
                                <td className="p-2 font-mono tabular-nums font-bold text-slate-950">SO-003</td>
                                <td className="p-2">
                                  <span className="font-semibold text-slate-950 block uppercase text-[9.5px]">Gestão de Guias INSS &amp; IRPS</span>
                                  <span className="text-[8.5px] text-slate-500 block mt-0.5">Geração e conformidade mensal da folha SISSMO e Modelo M/19.</span>
                                </td>
                                <td className="p-2 text-center font-mono tabular-nums">1,00</td>
                                <td className="p-2 text-right font-mono tabular-nums">0,00</td>
                                <td className="p-2 text-center font-mono tabular-nums">0,00</td>
                                <td className="p-2 text-center font-mono tabular-nums">Isento</td>
                                <td className="p-2 text-right font-mono tabular-nums text-slate-500 font-semibold">0,00</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-3 bg-slate-50 border border-slate-300 text-slate-800 text-[10px] leading-relaxed">
                          Declaramos que recebemos de <b className="text-slate-950 uppercase">{selectedInvoiceClient.nome}</b> (NUIT <b className="font-mono tabular-nums">{selectedInvoiceClient.nuit}</b>) a quantia total de{' '}
                          <b className="text-slate-950 font-mono tabular-nums">
                            {totalComIva.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                          </b>{' '}
                          (<b>{numeroParaExtenso(totalComIva)}</b>) referente à liquidação integral do documento abaixo especificado.
                        </div>

                        <div className="border border-slate-900 overflow-hidden text-[10px]">
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-900 text-white font-bold text-[9px] uppercase tracking-wider">
                              <tr className="divide-x divide-slate-700">
                                <th className="p-2 w-32">N.º Documento</th>
                                <th className="p-2">Descrição / Detalhe</th>
                                <th className="p-2 w-24 text-center">Emissão</th>
                                <th className="p-2 w-28 text-right">Valor Original</th>
                                <th className="p-2 w-28 text-right">Liquidado (MT)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 text-slate-800 bg-white">
                              <tr className="divide-x divide-slate-200">
                                <td className="p-2 font-mono tabular-nums font-bold text-slate-950">FT-OUT-2026-06/{selectedInvoiceClient.nuit.substring(5)}</td>
                                <td className="p-2">
                                  <span className="font-semibold text-slate-950 block uppercase text-[9.5px]">Liquidação de Honorários Mensais</span>
                                  <span className="text-[8.5px] text-slate-500 block mt-0.5">Processamento mensal SaaS ClickPay ERP</span>
                                </td>
                                <td className="p-2 text-center font-mono tabular-nums font-semibold">28-06-2026</td>
                                <td className="p-2 text-right font-mono tabular-nums">{totalComIva.toFixed(2)}</td>
                                <td className="p-2 text-right font-mono tabular-nums font-bold text-emerald-800">{totalComIva.toFixed(2)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer pinned to bottom of A4 sheet */}
                  <div className="space-y-4 pt-3 border-t-2 border-slate-900 a4-avoid-break">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      {/* Quadro de Resumo de Impostos */}
                      <div className="border border-slate-900 overflow-hidden w-full sm:w-64 text-[9px] bg-white">
                        <div className="bg-slate-100 border-b border-slate-900 text-slate-950 font-bold p-1.5 text-center uppercase tracking-wider">
                          Quadro de Resumo de Impostos
                        </div>
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-300">
                              <th className="p-1.5">Taxa</th>
                              <th className="p-1.5 text-right">Incidência</th>
                              <th className="p-1.5 text-right">Imposto</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 text-slate-800 font-mono tabular-nums">
                            <tr>
                              <td className="p-1.5 font-semibold">{!isExempt ? 'IVA 16%' : 'Isento'}</td>
                              <td className="p-1.5 text-right">{subtotalVal.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                              <td className="p-1.5 text-right">{ivaVal.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Quadro de Totais */}
                      <div className="w-full sm:w-64 border border-slate-900 text-[10px] overflow-hidden bg-white">
                        <div className="p-1.5 flex justify-between border-b border-slate-200">
                          <span className="text-slate-600 font-semibold">Total Ilíquido</span>
                          <span className="font-mono tabular-nums font-semibold text-slate-950">{subtotalVal.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                        </div>
                        <div className="p-1.5 flex justify-between border-b border-slate-200">
                          <span className="text-slate-600 font-semibold">Total Desconto</span>
                          <span className="font-mono tabular-nums font-semibold text-slate-950">0,00 MT</span>
                        </div>
                        <div className="p-1.5 flex justify-between border-b border-slate-900 bg-slate-50">
                          <span className="text-slate-600 font-semibold">Total Impostos (IVA)</span>
                          <span className="font-mono tabular-nums font-semibold text-slate-950">{ivaVal.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                        </div>
                        <div className="p-2 flex justify-between bg-slate-900 text-white font-bold items-center">
                          <span className="uppercase text-[9px] tracking-wider">Total Documento</span>
                          <span className="font-mono tabular-nums text-xs">
                            {totalComIva.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Coordenadas Bancárias */}
                    <div className="p-2.5 bg-slate-50 border border-slate-300 space-y-1 text-[9px] text-slate-700">
                      <span className="font-bold text-slate-950 block uppercase tracking-wide">
                        Coordenadas Bancárias &amp; Carteiras Móveis (ClickPay Moçambique, Lda)
                      </span>
                      <div className="grid grid-cols-3 gap-2 pt-0.5 font-mono tabular-nums text-[8.5px] text-slate-800">
                        <div className="p-1.5 bg-white border border-slate-200">
                          <b className="text-slate-950 block">MILLENNIUM BIM</b>
                          Conta: 9944-8833-MZ · NIB: 0001 0000 9944 8833 01
                        </div>
                        <div className="p-1.5 bg-white border border-slate-200">
                          <b className="text-slate-950 block">BCI FOMENTO</b>
                          Conta: 1122-3344-MZ · NIB: 0008 0000 1122 3344 02
                        </div>
                        <div className="p-1.5 bg-white border border-slate-200">
                          <b className="text-slate-950 block">M-PESA / E-MOLA</b>
                          M-Pesa: +258 861390061 · E-Mola: +258 871234567
                        </div>
                      </div>
                    </div>

                    {/* Assinaturas */}
                    <div className="grid grid-cols-2 gap-8 text-center pt-1">
                      <div className="space-y-1">
                        <div className="border-b border-slate-400 w-48 mx-auto h-5" />
                        <p className="text-[8.5px] text-slate-700 uppercase font-semibold">Assinatura Autorizada (ClickPay)</p>
                      </div>
                      <div className="space-y-1">
                        <div className="border-b border-slate-400 w-48 mx-auto h-5" />
                        <p className="text-[8.5px] text-slate-700 uppercase font-semibold">Exmo.(s) Senhor(es) (O Cliente)</p>
                      </div>
                    </div>

                    {/* Rodapé Primavera ERP V10 + Processado por computador */}
                    <div className="border-t border-slate-900 pt-2 flex flex-wrap justify-between items-center gap-2 text-[8.5px] text-slate-600">
                      <span className="font-bold text-slate-950 uppercase tracking-wide">
                        {PRIMAVERA_COMPUTER_NOTE}
                      </span>
                      <span className="font-mono tabular-nums">
                        Ref. Controlo: {hashControlo} · Original · Página 1 / 1
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()
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
