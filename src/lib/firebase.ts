import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, setDoc, getDocs, collection, deleteDoc, onSnapshot } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);
export { doc, getDocFromServer, setDoc, getDocs, collection, deleteDoc, onSnapshot };

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
export async function syncClientToFirestore(clientData: any) {
  const path = `erp_clients/${clientData.id}`;
  try {
    await setDoc(doc(db, 'erp_clients', clientData.id), {
      id: String(clientData.id).substring(0, 128),
      nome: String(clientData.nome || '').substring(0, 256),
      nuit: String(clientData.nuit || '').substring(0, 32),
      email: String(clientData.email || '').substring(0, 256),
      telefone: String(clientData.telefone || '').substring(0, 64),
      passwordHash: String(clientData.password || '••••••••').substring(0, 256),
      subscription_plan: clientData.subscription_plan || 'Bronze',
      subscription_status: clientData.subscription_status || 'ativo',
      fee_base: Number(clientData.fee_base) || 3000,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.warn('Sync client to Firestore warning:', error);
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
export async function syncCredentialRequestToFirestore(reqData: any) {
  try {
    await setDoc(doc(db, 'erp_credential_requests', reqData.id), {
      id: String(reqData.id).substring(0, 128),
      nomeEmpresa: String(reqData.nomeEmpresa || '').substring(0, 256),
      nomeResponsavel: String(reqData.nomeResponsavel || '').substring(0, 256),
      email: String(reqData.email || '').substring(0, 256),
      telefone: String(reqData.telefone || '').substring(0, 64),
      nuit: String(reqData.nuit || '').substring(0, 32),
      planoEscolhido: String(reqData.planoEscolhido || 'Starter').substring(0, 64),
      precoMensal: Number(reqData.precoMensal) || 3000,
      status: reqData.status || 'PENDENTE',
      dataSolicitacao: String(reqData.dataSolicitacao || new Date().toISOString()).substring(0, 64)
    });
  } catch (error) {
    console.warn('Sync credential request to Firestore warning:', error);
  }
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
