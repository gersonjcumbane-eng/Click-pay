import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, setDoc, getDocs, collection, deleteDoc, onSnapshot, query, where } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { hashPassword, isHashedPassword, verifyPassword } from './security';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);
export { doc, getDocFromServer, setDoc, getDocs, collection, deleteDoc, onSnapshot, query, where };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Sincronizar dados de clientes e senhas no Firebase Firestore
export async function syncClientToFirestore(clientData: any): Promise<{ ok: boolean; error?: string }> {
  try {
    const safeId = String(clientData.id || `cli_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 128);
    const hashedSecret = clientData.password ? await hashPassword(String(clientData.password)) : '';
    await setDoc(doc(db, 'erp_clients', safeId), {
      id: safeId,
      nome: String(clientData.nome || '').substring(0, 256),
      nuit: String(clientData.nuit || '').substring(0, 32),
      email: String(clientData.email || '').substring(0, 256),
      telefone: String(clientData.telefone || '+258 84 000 0000').substring(0, 64),
      passwordHash: (hashedSecret || '••••••••').substring(0, 256),
      subscription_plan: clientData.subscription_plan || 'Starter',
      subscription_status: clientData.subscription_status || 'ativo',
      fee_base: Number(clientData.fee_base) || 3500,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return { ok: true };
  } catch (error: any) {
    console.warn('Sync client to Firestore warning:', error);
    return { ok: false, error: error?.message || String(error) };
  }
}

// Sincronizar backup de arquivos no Firebase Firestore
export async function syncBackupToFirestore(backup: any) {
  try {
    const snapshotJson = JSON.stringify(backup.snapshot || {}).substring(0, 850000);
    await setDoc(doc(db, 'erp_backups', backup.id), {
      id: String(backup.id).substring(0, 128),
      empresaId: String(backup.empresaId || 'cli_bronze').substring(0, 128),
      empresaNome: String(backup.empresaNome || 'Empresa').substring(0, 256),
      timestamp: String(backup.timestamp || new Date().toISOString()).substring(0, 64),
      tipo: String(backup.tipo || 'Automático (Firebase Cloud)').substring(0, 128),
      quantidadeColaboradores: Number(backup.quantidadeColaboradores) || 0,
      quantidadeLancamentos: Number(backup.quantidadeLancamentos) || 0,
      tamanhoKb: Number(backup.tamanhoKb) || 0,
      snapshotJson
    });
  } catch (error) {
    console.warn('Sync backup to Firestore warning:', error);
  }
}

// Sincronizar pedido de credenciais no Firebase Firestore
export async function syncCredentialRequestToFirestore(reqData: any): Promise<{ ok: boolean; error?: string }> {
  try {
    const safeId = String(reqData.id || `REQ_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 128);
    await setDoc(doc(db, 'erp_credential_requests', safeId), {
      id: safeId,
      nomeEmpresa: String(reqData.nomeEmpresa || '').substring(0, 256),
      nomeResponsavel: String(reqData.nomeResponsavel || reqData.nomeEmpresa || '').substring(0, 256),
      email: String(reqData.email || '').substring(0, 256),
      telefone: String(reqData.telefone || '+258 84 000 0000').substring(0, 64),
      nuit: String(reqData.nuit || '').substring(0, 32),
      planoEscolhido: String(reqData.planoEscolhido || 'Starter').substring(0, 64),
      precoMensal: Number(reqData.precoMensal) || 3500,
      status: reqData.status === 'APROVADO' || reqData.status === 'CREDENCIAIS_ENVIADAS' ? reqData.status : 'PENDENTE',
      dataSolicitacao: String(reqData.dataSolicitacao || new Date().toISOString()).substring(0, 64)
    });
    return { ok: true };
  } catch (error: any) {
    console.warn('Sync credential request to Firestore warning:', error);
    return { ok: false, error: error?.message || String(error) };
  }
}

// Sincronizar pedido de suporte técnico (E-mail + WhatsApp) no Firebase Firestore
export async function syncSupportTicketToFirestore(ticketData: {
  id?: string;
  nome: string;
  empresa?: string;
  email: string;
  telefone: string;
  assunto: string;
  prioridade?: 'Normal' | 'Alta' | 'Urgente';
  mensagem: string;
  canalOrigem?: string;
  emailDestino?: string;
  whatsappDestino?: string;
}): Promise<{ ok: boolean; id: string; error?: string }> {
  const safeId = String(ticketData.id || `SUP_${Date.now()}`)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 128);
  const prioridade =
    ticketData.prioridade === 'Alta' || ticketData.prioridade === 'Urgente'
      ? ticketData.prioridade
      : 'Normal';
  try {
    await setDoc(doc(db, 'support_tickets', safeId), {
      id: safeId,
      nome: String(ticketData.nome || 'Utilizador ClickPay').trim().substring(0, 256),
      empresa: String(ticketData.empresa || 'Empresa Cliente').trim().substring(0, 256),
      email: String(ticketData.email || '').trim().substring(0, 256),
      telefone: String(ticketData.telefone || '').trim().substring(0, 64),
      assunto: String(ticketData.assunto || 'Suporte Técnico').trim().substring(0, 256),
      prioridade,
      mensagem: String(ticketData.mensagem || '').trim().substring(0, 4000),
      canalOrigem: String(ticketData.canalOrigem || 'Web ERP').trim().substring(0, 64),
      emailDestino: String(ticketData.emailDestino || 'click@payrolltech.co.mz').substring(0, 256),
      whatsappDestino: String(ticketData.whatsappDestino || '+258 84 201 4173').substring(0, 64),
      status: 'ABERTO',
      createdAt: new Date().toISOString()
    });
    return { ok: true, id: safeId };
  } catch (error: any) {
    console.warn('Sync support ticket to Firestore warning:', error);
    return { ok: false, id: safeId, error: error?.message || String(error) };
  }
}

// Registar e sincronizar conta recém-criada em todas as coleções Firebase da ClickPay
export async function syncRegisteredAccountToFirestore(params: {
  clientId: string;
  nomeEmpresa: string;
  email: string;
  nuit: string;
  password: string;
  plano?: string;
  feeBase?: number;
  telefone?: string;
  endereco?: string;
  provincia?: string;
}) {
  const now = new Date().toISOString();
  const safeId = String(params.clientId).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 128);
  const reqId = `ONB_${safeId}`.substring(0, 128);
  const plano = params.plano || 'Starter';
  const feeBase = Number(params.feeBase) || (plano === 'Gold' || plano === 'Business' ? 9500 : plano === 'Silver' || plano === 'Growth' ? 6500 : 3500);
  const syncedCollections: string[] = [];
  const errors: string[] = [];

  // 1. Tentar criar utilizador no Firebase Auth (se o provedor Email/Password estiver ativo)
  try {
    const cred = await createUserWithEmailAndPassword(auth, params.email, params.password);
    if (cred?.user?.uid) {
      syncedCollections.push('firebase_auth');
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        email: String(params.email).substring(0, 256),
        role: 'CLIENTE_EMPRESA',
        companyId: safeId,
        createdAt: now,
        status: 'ativo'
      }, { merge: true });
      syncedCollections.push('users');
    }
  } catch (authErr: any) {
    // Se Email/Password estiver desativado no console Firebase, continua normalmente para gravar no Firestore
    if (authErr?.code !== 'auth/operation-not-allowed' && authErr?.code !== 'auth/email-already-in-use') {
      console.warn('Firebase Auth signup info:', authErr?.code || authErr?.message);
    }
  }

  // 2. Gravar na coleção oficial erp_clients
  const erpRes = await syncClientToFirestore({
    id: safeId,
    nome: params.nomeEmpresa,
    nuit: params.nuit,
    email: params.email,
    telefone: params.telefone || '+258 84 000 0000',
    password: params.password,
    subscription_plan: plano,
    subscription_status: 'ativo',
    fee_base: feeBase
  });
  if (erpRes.ok) syncedCollections.push('erp_clients');
  else if (erpRes.error) errors.push(`erp_clients: ${erpRes.error}`);

  // 3. Gravar na coleção saas_clients (listagem em tempo real, com palavra-passe encriptada/hashed)
  try {
    const hashedAdminPass = await hashPassword(String(params.password));
    await setDoc(doc(db, 'saas_clients', safeId), {
      id: safeId,
      companyName: String(params.nomeEmpresa).substring(0, 256),
      tradeName: String(params.nomeEmpresa).substring(0, 256),
      nuit: String(params.nuit).substring(0, 32),
      email: String(params.email).substring(0, 256),
      phone: String(params.telefone || '+258 84 000 0000').substring(0, 64),
      address: `${params.endereco || 'Maputo'}, ${params.provincia || 'Maputo Cidade'}`,
      plan: plano,
      monthlyFee: feeBase,
      status: 'Ativo',
      adminName: String(params.nomeEmpresa).substring(0, 256),
      adminPassword: hashedAdminPass.substring(0, 256),
      createdAt: now,
      updatedAt: now
    }, { merge: true });
    syncedCollections.push('saas_clients');
  } catch (err: any) {
    errors.push(`saas_clients: ${err?.message || String(err)}`);
  }

  // 4. Gravar na coleção companies
  try {
    await setDoc(doc(db, 'companies', safeId), {
      id: safeId,
      nome: String(params.nomeEmpresa).substring(0, 256),
      nuit: String(params.nuit).substring(0, 32),
      email: String(params.email).substring(0, 256),
      plano,
      status: 'ativo',
      origem: 'Criar Conta ClickPay',
      createdAt: now,
      updatedAt: now
    }, { merge: true });
    syncedCollections.push('companies');
  } catch (err: any) {
    errors.push(`companies: ${err?.message || String(err)}`);
  }

  // 5. Gravar pedido/registo de credenciais no Firestore
  const reqRes = await syncCredentialRequestToFirestore({
    id: reqId,
    nomeEmpresa: params.nomeEmpresa,
    nomeResponsavel: params.nomeEmpresa,
    email: params.email,
    telefone: params.telefone || '+258 84 000 0000',
    nuit: params.nuit,
    planoEscolhido: plano,
    precoMensal: feeBase,
    status: 'APROVADO',
    dataSolicitacao: now
  });
  if (reqRes.ok) syncedCollections.push('erp_credential_requests');
  else if (reqRes.error) errors.push(`erp_credential_requests: ${reqRes.error}`);

  try {
    await setDoc(doc(db, 'credential_requests', reqId), {
      id: reqId,
      empresa: String(params.nomeEmpresa).substring(0, 256),
      responsavel: String(params.nomeEmpresa).substring(0, 256),
      nuit: String(params.nuit).substring(0, 32),
      email: String(params.email).substring(0, 256),
      telefone: String(params.telefone || '+258 84 000 0000').substring(0, 64),
      plano,
      status: 'REGISTADO_ONLINE',
      createdAt: now
    }, { merge: true });
    syncedCollections.push('credential_requests');
  } catch (err: any) {
    errors.push(`credential_requests: ${err?.message || String(err)}`);
  }

  return { syncedCollections, errors };
}

// Autenticar conta registada no Firebase (Firestore saas_clients + Firebase Auth) para ambientes estáticos/cloud
export async function authenticateClientInFirebase(
  email: string,
  password: string
): Promise<{
  ok: boolean;
  client?: {
    id: string;
    email: string;
    companyName: string;
    plan: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
    status: 'ativo' | 'suspenso';
    nuit?: string;
  };
}> {
  const emailNorm = String(email || '').toLowerCase().trim();
  const passRaw = String(password || '');
  const passTrim = passRaw.trim();
  if (!emailNorm || !passTrim) return { ok: false };

  const mapPlan = (p?: string): 'Bronze' | 'Silver' | 'Gold' | 'Platinum' => {
    if (!p) return 'Bronze';
    if (p === 'Starter' || p === 'Bronze') return 'Bronze';
    if (p === 'Growth' || p === 'Silver' || p === 'Profissional') return 'Silver';
    if (p === 'Business' || p === 'Gold' || p === 'Empresarial') return 'Gold';
    if (p === 'Platinum') return 'Platinum';
    return 'Bronze';
  };

  let firebaseAuthOk = false;
  try {
    const cred = await signInWithEmailAndPassword(auth, emailNorm, passTrim);
    if (cred?.user) {
      firebaseAuthOk = true;
    }
  } catch {
    // Continua para verificação na coleção saas_clients do Firestore
  }

  try {
    const q = query(collection(db, 'saas_clients'), where('email', '==', emailNorm));
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      const data: any = d.data();
      const storedPass = String(data.adminPassword || '');
      const passMatches =
        firebaseAuthOk ||
        (await verifyPassword(passTrim, storedPass)) ||
        (await verifyPassword(passRaw, storedPass));
      if (passMatches) {
        // Migração automática para hash seguro caso o documento antigo ainda estivesse em texto limpo
        if (storedPass && !isHashedPassword(storedPass)) {
          hashPassword(passTrim)
            .then((upgraded) =>
              setDoc(doc(db, 'saas_clients', d.id), { adminPassword: upgraded, updatedAt: new Date().toISOString() }, { merge: true })
            )
            .catch(() => {});
        }
        return {
          ok: true,
          client: {
            id: data.id || d.id,
            email: emailNorm,
            companyName: data.companyName || data.tradeName || 'Empresa ClickPay',
            plan: mapPlan(data.plan),
            status: String(data.status || 'ativo').toLowerCase() === 'suspenso' ? 'suspenso' : 'ativo',
            nuit: data.nuit || ''
          }
        };
      }
    }
  } catch (err) {
    console.warn('Firestore saas_clients auth lookup warning:', err);
  }

  if (firebaseAuthOk) {
    return {
      ok: true,
      client: {
        id: `cli_fb_${Date.now()}`,
        email: emailNorm,
        companyName: emailNorm.split('@')[0],
        plan: 'Bronze',
        status: 'ativo'
      }
    };
  }

  return { ok: false };
}

// Test Connection to Firestore as per requirements
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Conectado com sucesso ao Firestore!");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Por favor verifique a sua configuração do Firebase.");
    }
  }
}
testConnection();
