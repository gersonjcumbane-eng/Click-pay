import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  getRedirectResult,
  signOut
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, setDoc, getDocs, collection, deleteDoc, onSnapshot, query, where } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { hashPassword, isHashedPassword, verifyPassword } from './security';
import { getPlanFeeMzn } from './pricing';

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
      fee_base: Number(clientData.fee_base) || getPlanFeeMzn(clientData.subscription_plan),
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
      precoMensal: Number(reqData.precoMensal) || getPlanFeeMzn(reqData.planoEscolhido),
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

const LOCAL_ACCOUNTS_KEY = 'clickpay_local_accounts';

interface LocalVaultAccount {
  id: string;
  email: string;
  companyName: string;
  nuit: string;
  passwordHash: string;
  plan: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  status: 'ativo' | 'suspenso';
  updatedAt: string;
}

function normalizeFirebasePlan(p?: string): 'Bronze' | 'Silver' | 'Gold' | 'Platinum' {
  if (!p) return 'Bronze';
  if (p === 'Starter' || p === 'Bronze') return 'Bronze';
  if (p === 'Growth' || p === 'Silver' || p === 'Profissional') return 'Silver';
  if (p === 'Business' || p === 'Gold' || p === 'Empresarial' || p === 'Vitalicio') return 'Gold';
  if (p === 'Platinum') return 'Platinum';
  return 'Bronze';
}

async function saveAccountToLocalVault(params: {
  id: string;
  email: string;
  companyName: string;
  nuit: string;
  password: string;
  plan: string;
}): Promise<boolean> {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false;
  try {
    const emailNorm = String(params.email || '').toLowerCase().trim();
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    const list: LocalVaultAccount[] = raw ? JSON.parse(raw) : [];
    const safeList = Array.isArray(list) ? list : [];
    const hashed = await hashPassword(String(params.password || ''));
    const entry: LocalVaultAccount = {
      id: params.id,
      email: emailNorm,
      companyName: params.companyName,
      nuit: params.nuit,
      passwordHash: hashed,
      plan: normalizeFirebasePlan(params.plan),
      status: 'ativo',
      updatedAt: new Date().toISOString()
    };
    const idx = safeList.findIndex((a) => a.email === emailNorm || a.id === params.id);
    if (idx >= 0) {
      safeList[idx] = { ...safeList[idx], ...entry };
    } else {
      safeList.push(entry);
    }
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(safeList));
    return true;
  } catch {
    return false;
  }
}

function getAccountFromLocalVault(email: string): LocalVaultAccount | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
  try {
    const emailNorm = String(email || '').toLowerCase().trim();
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    const list: LocalVaultAccount[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return null;
    return list.find((a) => String(a.email || '').toLowerCase().trim() === emailNorm) || null;
  } catch {
    return null;
  }
}

export async function updateLocalVaultPassword(
  email: string,
  newPassword: string,
  companyName?: string,
  clientId?: string
): Promise<boolean> {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false;
  const emailNorm = String(email || '').toLowerCase().trim();
  const cleanPwd = String(newPassword || '').trim();
  if (!emailNorm || !cleanPwd) return false;
  try {
    const existing = getAccountFromLocalVault(emailNorm);
    return await saveAccountToLocalVault({
      id: existing?.id || clientId || `cli_acc_${Date.now()}`,
      email: emailNorm,
      companyName: existing?.companyName || companyName || `Empresa ${emailNorm.split('@')[0].toUpperCase()}`,
      nuit: existing?.nuit || '',
      password: cleanPwd,
      plan: existing?.plan || 'Bronze'
    });
  } catch {
    return false;
  }
}

export async function syncUpdatedCredentialsToFirestore(params: {
  email: string;
  newEmail?: string;
  newPassword?: string;
  status?: 'ativo' | 'inativo' | 'suspenso';
  companyName?: string;
  plan?: string;
}): Promise<{ ok: boolean; updatedDocs: number }> {
  const emailNorm = String(params.email || '').toLowerCase().trim();
  const nextEmail = params.newEmail ? String(params.newEmail).toLowerCase().trim() : emailNorm;
  if (!emailNorm || !auth.currentUser) {
    return { ok: false, updatedDocs: 0 };
  }

  let updatedDocs = 0;
  const now = new Date().toISOString();
  const hashedPass = params.newPassword ? await hashPassword(String(params.newPassword).trim()) : '';

  try {
    const qSaas = query(collection(db, 'saas_clients'), where('email', '==', emailNorm));
    const snapSaas = await getDocs(qSaas);
    for (const d of snapSaas.docs) {
      const payload: Record<string, any> = {
        email: nextEmail,
        updatedAt: now
      };
      if (hashedPass) payload.adminPassword = hashedPass.substring(0, 256);
      if (params.status) {
        payload.status = params.status === 'ativo' ? 'Ativo' : 'Suspenso';
      }
      if (params.companyName) payload.companyName = String(params.companyName).substring(0, 256);
      if (params.plan) payload.plan = String(params.plan).substring(0, 64);

      await setDoc(doc(db, 'saas_clients', d.id), payload, { merge: true });
      updatedDocs += 1;
    }

    const qErp = query(collection(db, 'erp_clients'), where('email', '==', emailNorm));
    const snapErp = await getDocs(qErp);
    for (const d of snapErp.docs) {
      const payload: Record<string, any> = {
        email: nextEmail,
        updatedAt: now
      };
      if (hashedPass) payload.passwordHash = hashedPass.substring(0, 256);
      if (params.status) {
        payload.subscription_status = params.status === 'ativo' ? 'ativo' : 'suspenso';
      }
      if (params.companyName) payload.nome = String(params.companyName).substring(0, 256);
      if (params.plan) payload.subscription_plan = String(params.plan).substring(0, 64);

      await setDoc(doc(db, 'erp_clients', d.id), payload, { merge: true });
      updatedDocs += 1;
    }

    return { ok: true, updatedDocs };
  } catch (err) {
    console.warn('Firestore credential sync warning:', err instanceof Error ? err.message : String(err));
    return { ok: false, updatedDocs };
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
  isUpdate?: boolean;
}) {
  const now = new Date().toISOString();
  const safeId = String(params.clientId).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 128);
  const reqId = `ONB_${safeId}`.substring(0, 128);
  const plano = params.plano || 'Starter';
  const feeBase = Number(params.feeBase) || getPlanFeeMzn(plano);
  const syncedCollections: string[] = [];
  const errors: string[] = [];

  // 0. Persistir imediatamente no cofre local para garantir login em modo estático/offline
  const savedVault = await saveAccountToLocalVault({
    id: safeId,
    email: params.email,
    companyName: params.nomeEmpresa,
    nuit: params.nuit,
    password: params.password,
    plan: plano
  });
  if (savedVault) {
    syncedCollections.push('local_vault');
  }

  // Se for apenas atualização da Etapa 3 sem sessão Firebase Auth ativa, evitar reescrita que dispara erro de permissão de atualização
  if (params.isUpdate && !auth.currentUser) {
    return { syncedCollections, errors };
  }

  // 1. Tentar criar utilizador no Firebase Auth (se o provedor Email/Password estiver ativo)
  if (!params.isUpdate) {
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

  // 5. Gravar pedido/registo de credenciais no Firestore apenas na criação inicial
  if (!params.isUpdate) {
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

  // Verificar também no cofre local (para contas recém-registadas no navegador)
  const localVaultAcc = getAccountFromLocalVault(emailNorm);
  if (localVaultAcc) {
    const matchesLocal =
      (await verifyPassword(passTrim, localVaultAcc.passwordHash)) ||
      (await verifyPassword(passRaw, localVaultAcc.passwordHash));
    if (matchesLocal) {
      return {
        ok: true,
        client: {
          id: localVaultAcc.id,
          email: localVaultAcc.email,
          companyName: localVaultAcc.companyName,
          plan: localVaultAcc.plan,
          status: localVaultAcc.status,
          nuit: localVaultAcc.nuit
        }
      };
    }
  }

  return { ok: false };
}

export interface GoogleAuthResult {
  ok: boolean;
  cancelled?: boolean;
  redirected?: boolean;
  googleAccessToken?: string;
  idToken?: string;
  email?: string;
  emailVerified?: boolean;
  displayName?: string;
  error?: string;
}

export async function signInWithGoogleAccount(): Promise<GoogleAuthResult> {
  // Usar exclusivamente Firebase Authentication signInWithPopup (conforme Política OAuth 2.0 da Google)
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const idToken = await user.getIdToken();
    const credential = GoogleAuthProvider.credentialFromResult(result);
    return {
      ok: true,
      idToken,
      googleAccessToken: credential?.accessToken,
      email: (user.email || '').toLowerCase().trim(),
      emailVerified: Boolean(user.emailVerified),
      displayName: user.displayName || ''
    };
  } catch (err: any) {
    const code = err?.code || '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return { ok: false, cancelled: true, error: 'Janela de autenticação Google fechada antes de concluir.' };
    }
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      return {
        ok: false,
        error:
          'O navegador bloqueou a janela de início de sessão Google. Permita popups para este site, abra a aplicação num novo separador ou entre com e-mail e palavra-passe.'
      };
    }
    if (code === 'auth/unauthorized-domain') {
      const host = typeof window !== 'undefined' ? window.location.hostname : '';
      return {
        ok: false,
        error: `O domínio "${host}" ainda não está autorizado para Login Google na Consola Firebase. Adicione-o em Authentication → Settings → Authorized domains ou entre com e-mail e palavra-passe.`
      };
    }
    if (code === 'auth/operation-not-allowed') {
      return {
        ok: false,
        error: 'O provedor Google não está activo no projecto Firebase. Active-o em Authentication → Sign-in method → Google.'
      };
    }
    if (code === 'auth/network-request-failed') {
      return {
        ok: false,
        error: 'Falha de ligação ao contactar os serviços Google. Verifique a internet ou utilize e-mail e palavra-passe.'
      };
    }
    return {
      ok: false,
      error: 'Não foi possível concluir a autenticação com a conta Google. Utilize e-mail e palavra-passe.'
    };
  }
}

export async function consumeGoogleRedirectResult(): Promise<GoogleAuthResult | null> {
  try {
    const result = await getRedirectResult(auth);
    if (!result?.user) return null;
    const idToken = await result.user.getIdToken();
    return {
      ok: true,
      idToken,
      email: (result.user.email || '').toLowerCase().trim(),
      emailVerified: Boolean(result.user.emailVerified),
      displayName: result.user.displayName || ''
    };
  } catch {
    return null;
  }
}

export async function signOutGoogleSession(): Promise<void> {
  try {
    await signOut(auth);
  } catch {
    // ignore
  }
}

export async function lookupClientByEmailInCloud(email: string): Promise<{
  found: boolean;
  client?: {
    id: string;
    email: string;
    companyName: string;
    plan: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
    status: 'ativo' | 'suspenso';
  };
}> {
  const emailNorm = String(email || '').toLowerCase().trim();
  if (!emailNorm) return { found: false };
  const mapPlan = (p?: string): 'Bronze' | 'Silver' | 'Gold' | 'Platinum' => {
    if (!p) return 'Bronze';
    if (p === 'Starter' || p === 'Bronze') return 'Bronze';
    if (p === 'Growth' || p === 'Silver' || p === 'Profissional') return 'Silver';
    if (p === 'Business' || p === 'Gold' || p === 'Empresarial') return 'Gold';
    if (p === 'Platinum') return 'Platinum';
    return 'Bronze';
  };

  try {
    const qSaas = query(collection(db, 'saas_clients'), where('email', '==', emailNorm));
    const snapSaas = await getDocs(qSaas);
    for (const d of snapSaas.docs) {
      const data: any = d.data();
      return {
        found: true,
        client: {
          id: data.id || d.id,
          email: emailNorm,
          companyName: data.companyName || data.tradeName || 'Empresa ClickPay',
          plan: mapPlan(data.plan),
          status: String(data.status || 'ativo').toLowerCase() === 'suspenso' ? 'suspenso' : 'ativo'
        }
      };
    }

    const qErp = query(collection(db, 'erp_clients'), where('email', '==', emailNorm));
    const snapErp = await getDocs(qErp);
    for (const d of snapErp.docs) {
      const data: any = d.data();
      return {
        found: true,
        client: {
          id: data.id || d.id,
          email: emailNorm,
          companyName: data.nome || 'Empresa ClickPay',
          plan: mapPlan(data.subscription_plan),
          status: String(data.subscription_status || 'ativo').toLowerCase() === 'suspenso' ? 'suspenso' : 'ativo'
        }
      };
    }
    const localVaultAcc = getAccountFromLocalVault(emailNorm);
    if (localVaultAcc) {
      return {
        found: true,
        client: {
          id: localVaultAcc.id,
          email: localVaultAcc.email,
          companyName: localVaultAcc.companyName,
          plan: localVaultAcc.plan,
          status: localVaultAcc.status
        }
      };
    }

    return { found: false };
  } catch (error) {
    const localVaultAcc = getAccountFromLocalVault(emailNorm);
    if (localVaultAcc) {
      return {
        found: true,
        client: {
          id: localVaultAcc.id,
          email: localVaultAcc.email,
          companyName: localVaultAcc.companyName,
          plan: localVaultAcc.plan,
          status: localVaultAcc.status
        }
      };
    }
    console.warn('Cloud client lookup skipped:', error instanceof Error ? error.message : String(error));
    return { found: false };
  }
}

export const lookupClientByEmailInFirebase = lookupClientByEmailInCloud;

function deterministicGoogleTenantId(email: string): string {
  const clean = String(email || '').toLowerCase().trim();
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash * 31 + clean.charCodeAt(i)) >>> 0;
  }
  const slug = clean.replace(/[^a-z0-9]/g, '_').slice(0, 14);
  return `cli_google_${slug}_${hash.toString(16)}`;
}

export async function provisionOrLookupGoogleClientInCloud(params: {
  email: string;
  displayName?: string;
}): Promise<{
  id: string;
  email: string;
  companyName: string;
  plan: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  status: 'ativo' | 'suspenso';
}> {
  const emailNorm = String(params.email || '').toLowerCase().trim();
  const existing = await lookupClientByEmailInCloud(emailNorm);
  if (existing.found && existing.client) {
    return existing.client;
  }

  const companyName = params.displayName
    ? `${params.displayName} (ClickPay ERP)`
    : `Empresa ${emailNorm.split('@')[0].toUpperCase()}`;
  const clientId = deterministicGoogleTenantId(emailNorm);
  const randomSeedPass = Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  await saveAccountToLocalVault({
    id: clientId,
    email: emailNorm,
    companyName,
    nuit: '400000000',
    password: randomSeedPass,
    plan: 'Bronze'
  });

  if (auth.currentUser) {
    await syncRegisteredAccountToFirestore({
      clientId,
      nomeEmpresa: companyName,
      email: emailNorm,
      nuit: '400000000',
      password: randomSeedPass,
      plano: 'Starter',
      feeBase: getPlanFeeMzn('Starter'),
      isUpdate: false
    }).catch(() => {});
  }

  return {
    id: clientId,
    email: emailNorm,
    companyName,
    plan: 'Bronze',
    status: 'ativo'
  };
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
