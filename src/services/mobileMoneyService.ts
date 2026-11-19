import crypto from 'crypto';

export type MobileOperator = 'MPESA' | 'EMOLA' | 'MKESH';
export type IntegrationMode = 'LIVE_API' | 'SANDBOX_API' | 'SIMULATION';
export type PaymentDirection = 'B2C' | 'C2B';

export interface MobileMoneyTransaction {
  id: string;
  direction: PaymentDirection;
  operator: MobileOperator;
  msisdn: string;
  amount: number;
  currency: 'MZN';
  reference: string;
  thirdPartyReference: string;
  operatorTransactionId?: string;
  beneficiaryName?: string;
  description?: string;
  status: 'INICIADO' | 'LIQUIDADO' | 'CONFIRMADO_OPERADORA' | 'SIMULADO_SUCESSO' | 'FALHOU';
  mode: IntegrationMode;
  simulated: boolean;
  responseCode?: string;
  responseMessage: string;
  timestamp: string;
  webhookConfirmedAt?: string;
}

export interface OperatorGatewayStatus {
  operator: MobileOperator;
  name: string;
  prefixes: string[];
  configured: boolean;
  env: 'sandbox' | 'production';
  mode: IntegrationMode;
  shortcodeMasked: string | null;
  requiredEnvVars: string[];
  missingEnvVars: string[];
  webhookPath: string;
  kycDocuments: string[];
  technicalRequirements: string[];
}

const mobileMoneyTransactions: MobileMoneyTransaction[] = [];

function maskShortcode(val?: string): string | null {
  const clean = String(val || '').trim();
  if (!clean) return null;
  if (clean.length <= 3) return '***';
  return `${clean.slice(0, 2)}***${clean.slice(-2)}`;
}

/**
 * Normaliza números móveis moçambicanos para formato internacional 258XXXXXXXXX (12 dígitos).
 */
export function normalizeMozMsisdn(rawPhone: string): string {
  let digits = String(rawPhone || '').replace(/\D/g, '');
  if (digits.startsWith('00258')) {
    digits = digits.slice(2);
  }
  if (digits.length === 9 && digits.startsWith('8')) {
    digits = `258${digits}`;
  } else if (digits.length === 10 && digits.startsWith('08')) {
    digits = `258${digits.slice(1)}`;
  }
  return digits;
}

/**
 * Identifica automaticamente a operadora móvel pelo prefixo moçambicano:
 * - 84 / 85 -> Vodacom M-Pesa
 * - 86 / 87 -> Movitel e-Mola
 * - 82 / 83 -> Tmcel mKesh
 */
export function detectOperatorFromMsisdn(rawPhone: string): MobileOperator {
  const msisdn = normalizeMozMsisdn(rawPhone);
  const local = msisdn.startsWith('258') ? msisdn.slice(3) : msisdn;
  if (local.startsWith('86') || local.startsWith('87')) return 'EMOLA';
  if (local.startsWith('82') || local.startsWith('83')) return 'MKESH';
  return 'MPESA';
}

/**
 * Gera o Bearer Token oficial da Vodacom M-Pesa Open API usando encriptação RSA PKCS1 da API Key com a Public Key.
 */
export function generateMpesaBearerToken(apiKey: string, publicKeyRaw: string): string {
  const cleanedKey = publicKeyRaw.trim();
  const pem = cleanedKey.includes('BEGIN PUBLIC KEY')
    ? cleanedKey
    : `-----BEGIN PUBLIC KEY-----\n${cleanedKey.match(/.{1,64}/g)?.join('\n') || cleanedKey}\n-----END PUBLIC KEY-----`;

  const encrypted = crypto.publicEncrypt(
    {
      key: pem,
      padding: crypto.constants.RSA_PKCS1_PADDING
    },
    Buffer.from(apiKey.trim(), 'utf8')
  );
  return encrypted.toString('base64');
}

function getMpesaConfig() {
  const env = (process.env.MPESA_ENV || 'sandbox').toLowerCase() === 'production' ? 'production' : 'sandbox';
  const apiKey = (process.env.MPESA_API_KEY || '').trim();
  const publicKey = (process.env.MPESA_PUBLIC_KEY || '').trim();
  const shortcode = (process.env.MPESA_SHORTCODE || '').trim();
  const origin = (process.env.MPESA_ORIGIN || '*').trim();
  const webhookSecret = (process.env.MPESA_WEBHOOK_SECRET || '').trim();
  const missing: string[] = [];
  if (!apiKey) missing.push('MPESA_API_KEY');
  if (!publicKey) missing.push('MPESA_PUBLIC_KEY');
  if (!shortcode) missing.push('MPESA_SHORTCODE');
  return {
    env: env as 'sandbox' | 'production',
    apiKey,
    publicKey,
    shortcode,
    origin,
    webhookSecret,
    configured: missing.length === 0,
    missing,
    host: env === 'production' ? 'api.vm.co.mz' : 'api.sandbox.vm.co.mz'
  };
}

function getEmolaConfig() {
  const env = (process.env.EMOLA_ENV || 'sandbox').toLowerCase() === 'production' ? 'production' : 'sandbox';
  const apiUrl = (process.env.EMOLA_API_URL || '').trim();
  const partnerCode = (process.env.EMOLA_PARTNER_CODE || '').trim();
  const apiKey = (process.env.EMOLA_API_KEY || '').trim();
  const secretKey = (process.env.EMOLA_SECRET_KEY || '').trim();
  const webhookSecret = (process.env.EMOLA_WEBHOOK_SECRET || '').trim();
  const missing: string[] = [];
  if (!apiUrl) missing.push('EMOLA_API_URL');
  if (!partnerCode) missing.push('EMOLA_PARTNER_CODE');
  if (!apiKey) missing.push('EMOLA_API_KEY');
  if (!secretKey) missing.push('EMOLA_SECRET_KEY');
  return {
    env: env as 'sandbox' | 'production',
    apiUrl,
    partnerCode,
    apiKey,
    secretKey,
    webhookSecret,
    configured: missing.length === 0,
    missing
  };
}

function getMkeshConfig() {
  const env = (process.env.MKESH_ENV || 'sandbox').toLowerCase() === 'production' ? 'production' : 'sandbox';
  const apiUrl = (process.env.MKESH_API_URL || '').trim();
  const merchantCode = (process.env.MKESH_MERCHANT_CODE || '').trim();
  const clientId = (process.env.MKESH_CLIENT_ID || '').trim();
  const clientSecret = (process.env.MKESH_CLIENT_SECRET || '').trim();
  const webhookSecret = (process.env.MKESH_WEBHOOK_SECRET || '').trim();
  const missing: string[] = [];
  if (!apiUrl) missing.push('MKESH_API_URL');
  if (!merchantCode) missing.push('MKESH_MERCHANT_CODE');
  if (!clientId) missing.push('MKESH_CLIENT_ID');
  if (!clientSecret) missing.push('MKESH_CLIENT_SECRET');
  return {
    env: env as 'sandbox' | 'production',
    apiUrl,
    merchantCode,
    clientId,
    clientSecret,
    webhookSecret,
    configured: missing.length === 0,
    missing
  };
}

export function getMobileGatewayStatuses(): OperatorGatewayStatus[] {
  const mpesa = getMpesaConfig();
  const emola = getEmolaConfig();
  const mkesh = getMkeshConfig();

  return [
    {
      operator: 'MPESA',
      name: 'Vodacom M-Pesa (Open API)',
      prefixes: ['84', '85'],
      configured: mpesa.configured,
      env: mpesa.env,
      mode: mpesa.configured ? (mpesa.env === 'production' ? 'LIVE_API' : 'SANDBOX_API') : 'SIMULATION',
      shortcodeMasked: maskShortcode(mpesa.shortcode),
      requiredEnvVars: ['MPESA_ENV', 'MPESA_API_KEY', 'MPESA_PUBLIC_KEY', 'MPESA_SHORTCODE', 'MPESA_ORIGIN', 'MPESA_WEBHOOK_SECRET'],
      missingEnvVars: mpesa.missing,
      webhookPath: '/api/webhooks/mpesa',
      kycDocuments: [
        'Alvará Comercial & Certidão de Registo Comercial (NUEL)',
        'Comprovativo de NUIT e Certidão de Quitação Fiscal (AT)',
        'Pacto Social / Estatutos da ClickPay Moçambique',
        'BI/Passaporte dos sócios e carta de pedido M-Pesa Business (C2B + B2C)',
        'Comprovativo de NIB da conta bancária empresarial'
      ],
      technicalRequirements: [
        'Criar aplicação no portal developer.mpesa.vm.co.mz (API Key + Public Key RSA)',
        'Solicitar Shortcode (ServiceProviderCode) C2B (porta 18352) e B2C (porta 18345)',
        'Registar IP estático de saída (Whitelist) e URL HTTPS do Webhook M-Pesa'
      ]
    },
    {
      operator: 'EMOLA',
      name: 'Movitel e-Mola (Merchant Gateway)',
      prefixes: ['86', '87'],
      configured: emola.configured,
      env: emola.env,
      mode: emola.configured ? (emola.env === 'production' ? 'LIVE_API' : 'SANDBOX_API') : 'SIMULATION',
      shortcodeMasked: maskShortcode(emola.partnerCode),
      requiredEnvVars: ['EMOLA_ENV', 'EMOLA_API_URL', 'EMOLA_PARTNER_CODE', 'EMOLA_API_KEY', 'EMOLA_SECRET_KEY', 'EMOLA_WEBHOOK_SECRET'],
      missingEnvVars: emola.missing,
      webhookPath: '/api/webhooks/emola',
      kycDocuments: [
        'Carta formal de adesão ao serviço e-Mola Corporativo (C2B/B2C)',
        'Alvará, NUEL, NUIT e Certidão de Quitação Fiscal',
        'Documentos do representante legal e NIB empresarial para liquidação'
      ],
      technicalRequirements: [
        'Obter Partner Code, API Key, Secret Key e URL do Gateway Movitel',
        'Whitelist do IP fixo do servidor na Movitel e registo do Webhook HTTPS',
        'Carregamento de conta float empresarial para desembolsos salariais B2C'
      ]
    },
    {
      operator: 'MKESH',
      name: 'Tmcel mKesh (Enterprise API)',
      prefixes: ['82', '83'],
      configured: mkesh.configured,
      env: mkesh.env,
      mode: mkesh.configured ? (mkesh.env === 'production' ? 'LIVE_API' : 'SANDBOX_API') : 'SIMULATION',
      shortcodeMasked: maskShortcode(mkesh.merchantCode),
      requiredEnvVars: ['MKESH_ENV', 'MKESH_API_URL', 'MKESH_MERCHANT_CODE', 'MKESH_CLIENT_ID', 'MKESH_CLIENT_SECRET', 'MKESH_WEBHOOK_SECRET'],
      missingEnvVars: mkesh.missing,
      webhookPath: '/api/webhooks/mkesh',
      kycDocuments: [
        'Formulário de adesão mKesh Merchant/Enterprise assinado',
        'Alvará Comercial, NUIT, NUEL e Pacto Social',
        'Cópia do BI do representante legal e comprovativo de conta bancária'
      ],
      technicalRequirements: [
        'Obter Merchant Code, Client ID e Client Secret junto da Tmcel',
        'Configurar URL HTTPS de Callback mKesh para confirmações assíncronas'
      ]
    }
  ];
}

function recordTransaction(tx: MobileMoneyTransaction): MobileMoneyTransaction {
  mobileMoneyTransactions.unshift(tx);
  if (mobileMoneyTransactions.length > 200) {
    mobileMoneyTransactions.length = 200;
  }
  return tx;
}

export function listMobileTransactions(limit = 50): MobileMoneyTransaction[] {
  return mobileMoneyTransactions.slice(0, Math.max(1, Math.min(limit, 200)));
}

export function getMobileTransactionByRef(ref: string): MobileMoneyTransaction | undefined {
  return mobileMoneyTransactions.find(
    (t) => t.id === ref || t.thirdPartyReference === ref || t.reference === ref || t.operatorTransactionId === ref
  );
}

function makeShortRef(prefix: string): string {
  const rnd = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}${Date.now().toString().slice(-5)}${rnd}`;
}

/**
 * Executa desembolso B2C (pagamento de salários, vales ou reembolsos para carteira móvel).
 * Usa API real quando os segredos da operadora estão configurados; caso contrário executa simulação segura.
 */
export async function dispatchB2CPayment(input: {
  phone: string;
  amount: number;
  reference?: string;
  thirdPartyReference?: string;
  beneficiaryName?: string;
  operatorOverride?: MobileOperator;
}): Promise<MobileMoneyTransaction> {
  const msisdn = normalizeMozMsisdn(input.phone);
  const operator = input.operatorOverride || detectOperatorFromMsisdn(msisdn);
  const amount = Math.round(Number(input.amount || 0) * 100) / 100;
  const thirdPartyReference = input.thirdPartyReference || makeShortRef('CPB2C');
  const reference = input.reference || `SAL-${Date.now().toString().slice(-6)}`;
  const now = new Date().toISOString();

  if (operator === 'MPESA') {
    const cfg = getMpesaConfig();
    if (cfg.configured) {
      const mode: IntegrationMode = cfg.env === 'production' ? 'LIVE_API' : 'SANDBOX_API';
      try {
        const bearer = generateMpesaBearerToken(cfg.apiKey, cfg.publicKey);
        const url = `https://${cfg.host}:18345/ipg/v1x/b2cPayment/`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': cfg.origin,
            'Authorization': `Bearer ${bearer}`
          },
          body: JSON.stringify({
            input_TransactionReference: reference,
            input_CustomerMSISDN: msisdn,
            input_Amount: amount.toFixed(2),
            input_ThirdPartyReference: thirdPartyReference,
            input_ServiceProviderCode: cfg.shortcode
          })
        });
        const data: any = await resp.json().catch(() => ({}));
        const ok = resp.ok && (!data.output_ResponseCode || data.output_ResponseCode === 'INS-0');
        return recordTransaction({
          id: `TX-MP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          direction: 'B2C',
          operator: 'MPESA',
          msisdn,
          amount,
          currency: 'MZN',
          reference,
          thirdPartyReference,
          operatorTransactionId: data.output_TransactionID || data.output_ConversationID,
          beneficiaryName: input.beneficiaryName,
          status: ok ? 'LIQUIDADO' : 'FALHOU',
          mode,
          simulated: false,
          responseCode: data.output_ResponseCode || String(resp.status),
          responseMessage: data.output_ResponseDesc || (ok ? 'Transferência M-Pesa B2C concluída.' : 'Erro na API Vodacom M-Pesa.'),
          timestamp: now
        });
      } catch (err: any) {
        return recordTransaction({
          id: `TX-MP-${Date.now()}`,
          direction: 'B2C',
          operator: 'MPESA',
          msisdn,
          amount,
          currency: 'MZN',
          reference,
          thirdPartyReference,
          beneficiaryName: input.beneficiaryName,
          status: 'FALHOU',
          mode,
          simulated: false,
          responseCode: 'NETWORK_ERROR',
          responseMessage: err?.message || 'Falha de ligação ao servidor M-Pesa.',
          timestamp: now
        });
      }
    }
  }

  if (operator === 'EMOLA') {
    const cfg = getEmolaConfig();
    if (cfg.configured) {
      const mode: IntegrationMode = cfg.env === 'production' ? 'LIVE_API' : 'SANDBOX_API';
      try {
        const payload = {
          partnerCode: cfg.partnerCode,
          transactionType: 'B2C',
          reference,
          thirdPartyReference,
          msisdn,
          amount: amount.toFixed(2),
          currency: 'MZN',
          beneficiaryName: input.beneficiaryName || ''
        };
        const signature = crypto
          .createHmac('sha256', cfg.secretKey)
          .update(JSON.stringify(payload))
          .digest('hex');

        const resp = await fetch(`${cfg.apiUrl.replace(/\/+$/, '')}/b2c/disburse`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cfg.apiKey}`,
            'X-Partner-Code': cfg.partnerCode,
            'X-Signature': signature
          },
          body: JSON.stringify(payload)
        });
        const data: any = await resp.json().catch(() => ({}));
        const ok = resp.ok;
        return recordTransaction({
          id: `TX-EM-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          direction: 'B2C',
          operator: 'EMOLA',
          msisdn,
          amount,
          currency: 'MZN',
          reference,
          thirdPartyReference,
          operatorTransactionId: data.transactionId || data.id,
          beneficiaryName: input.beneficiaryName,
          status: ok ? 'LIQUIDADO' : 'FALHOU',
          mode,
          simulated: false,
          responseCode: String(data.code || resp.status),
          responseMessage: data.message || (ok ? 'Transferência e-Mola B2C concluída.' : 'Erro na API Movitel e-Mola.'),
          timestamp: now
        });
      } catch (err: any) {
        return recordTransaction({
          id: `TX-EM-${Date.now()}`,
          direction: 'B2C',
          operator: 'EMOLA',
          msisdn,
          amount,
          currency: 'MZN',
          reference,
          thirdPartyReference,
          beneficiaryName: input.beneficiaryName,
          status: 'FALHOU',
          mode,
          simulated: false,
          responseCode: 'NETWORK_ERROR',
          responseMessage: err?.message || 'Falha de ligação ao gateway e-Mola.',
          timestamp: now
        });
      }
    }
  }

  if (operator === 'MKESH') {
    const cfg = getMkeshConfig();
    if (cfg.configured) {
      const mode: IntegrationMode = cfg.env === 'production' ? 'LIVE_API' : 'SANDBOX_API';
      try {
        const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64');
        const resp = await fetch(`${cfg.apiUrl.replace(/\/+$/, '')}/b2c/transfer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${basic}`,
            'X-Merchant-Code': cfg.merchantCode
          },
          body: JSON.stringify({
            merchantCode: cfg.merchantCode,
            reference,
            thirdPartyReference,
            msisdn,
            amount: amount.toFixed(2),
            currency: 'MZN'
          })
        });
        const data: any = await resp.json().catch(() => ({}));
        const ok = resp.ok;
        return recordTransaction({
          id: `TX-MK-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          direction: 'B2C',
          operator: 'MKESH',
          msisdn,
          amount,
          currency: 'MZN',
          reference,
          thirdPartyReference,
          operatorTransactionId: data.transactionId || data.id,
          beneficiaryName: input.beneficiaryName,
          status: ok ? 'LIQUIDADO' : 'FALHOU',
          mode,
          simulated: false,
          responseCode: String(data.code || resp.status),
          responseMessage: data.message || (ok ? 'Transferência mKesh B2C concluída.' : 'Erro na API Tmcel mKesh.'),
          timestamp: now
        });
      } catch (err: any) {
        return recordTransaction({
          id: `TX-MK-${Date.now()}`,
          direction: 'B2C',
          operator: 'MKESH',
          msisdn,
          amount,
          currency: 'MZN',
          reference,
          thirdPartyReference,
          beneficiaryName: input.beneficiaryName,
          status: 'FALHOU',
          mode,
          simulated: false,
          responseCode: 'NETWORK_ERROR',
          responseMessage: err?.message || 'Falha de ligação ao gateway mKesh.',
          timestamp: now
        });
      }
    }
  }

  // Fallback seguro em Modo Simulação (quando as chaves da operadora ainda não foram inseridas nos Secrets)
  const simPrefix = operator === 'EMOLA' ? 'SIM-EM' : operator === 'MKESH' ? 'SIM-MK' : 'SIM-MP';
  return recordTransaction({
    id: `${simPrefix}-${Math.floor(100000 + Math.random() * 900000)}`,
    direction: 'B2C',
    operator,
    msisdn,
    amount,
    currency: 'MZN',
    reference,
    thirdPartyReference,
    operatorTransactionId: `${simPrefix}-${Math.floor(100000 + Math.random() * 900000)}`,
    beneficiaryName: input.beneficiaryName,
    status: 'SIMULADO_SUCESSO',
    mode: 'SIMULATION',
    simulated: true,
    responseCode: 'SIM-0',
    responseMessage: `Simulação B2C ${operator} concluída. Configure os Secrets da operadora no servidor para liquidação real.`,
    timestamp: now
  });
}

/**
 * Executa cobrança C2B (recebimento de cliente / subscrição ERP / factura via prompt PIN USSD no telemóvel).
 */
export async function collectC2BPayment(input: {
  phone: string;
  amount: number;
  reference?: string;
  thirdPartyReference?: string;
  description?: string;
  operatorOverride?: MobileOperator;
}): Promise<MobileMoneyTransaction> {
  const msisdn = normalizeMozMsisdn(input.phone);
  const operator = input.operatorOverride || detectOperatorFromMsisdn(msisdn);
  const amount = Math.round(Number(input.amount || 0) * 100) / 100;
  const thirdPartyReference = input.thirdPartyReference || makeShortRef('CPC2B');
  const reference = input.reference || `FAT-${Date.now().toString().slice(-6)}`;
  const now = new Date().toISOString();

  if (operator === 'MPESA') {
    const cfg = getMpesaConfig();
    if (cfg.configured) {
      const mode: IntegrationMode = cfg.env === 'production' ? 'LIVE_API' : 'SANDBOX_API';
      try {
        const bearer = generateMpesaBearerToken(cfg.apiKey, cfg.publicKey);
        const url = `https://${cfg.host}:18352/ipg/v1x/c2bPayment/singleStage/`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': cfg.origin,
            'Authorization': `Bearer ${bearer}`
          },
          body: JSON.stringify({
            input_TransactionReference: reference,
            input_CustomerMSISDN: msisdn,
            input_Amount: amount.toFixed(2),
            input_ThirdPartyReference: thirdPartyReference,
            input_ServiceProviderCode: cfg.shortcode,
            input_PurchasedItemsDesc: (input.description || 'ClickPay ERP').slice(0, 64)
          })
        });
        const data: any = await resp.json().catch(() => ({}));
        const ok = resp.ok && (!data.output_ResponseCode || data.output_ResponseCode === 'INS-0');
        return recordTransaction({
          id: `C2B-MP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          direction: 'C2B',
          operator: 'MPESA',
          msisdn,
          amount,
          currency: 'MZN',
          reference,
          thirdPartyReference,
          operatorTransactionId: data.output_TransactionID || data.output_ConversationID,
          description: input.description,
          status: ok ? 'LIQUIDADO' : 'FALHOU',
          mode,
          simulated: false,
          responseCode: data.output_ResponseCode || String(resp.status),
          responseMessage: data.output_ResponseDesc || (ok ? 'Cobrança M-Pesa C2B confirmada.' : 'Pagamento C2B rejeitado/expirado.'),
          timestamp: now
        });
      } catch (err: any) {
        return recordTransaction({
          id: `C2B-MP-${Date.now()}`,
          direction: 'C2B',
          operator: 'MPESA',
          msisdn,
          amount,
          currency: 'MZN',
          reference,
          thirdPartyReference,
          description: input.description,
          status: 'FALHOU',
          mode,
          simulated: false,
          responseCode: 'NETWORK_ERROR',
          responseMessage: err?.message || 'Erro de rede ao contactar M-Pesa C2B.',
          timestamp: now
        });
      }
    }
  }

  if (operator === 'EMOLA') {
    const cfg = getEmolaConfig();
    if (cfg.configured) {
      const mode: IntegrationMode = cfg.env === 'production' ? 'LIVE_API' : 'SANDBOX_API';
      try {
        const payload = {
          partnerCode: cfg.partnerCode,
          transactionType: 'C2B',
          reference,
          thirdPartyReference,
          msisdn,
          amount: amount.toFixed(2),
          currency: 'MZN',
          description: input.description || 'ClickPay ERP'
        };
        const signature = crypto
          .createHmac('sha256', cfg.secretKey)
          .update(JSON.stringify(payload))
          .digest('hex');

        const resp = await fetch(`${cfg.apiUrl.replace(/\/+$/, '')}/c2b/collect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cfg.apiKey}`,
            'X-Partner-Code': cfg.partnerCode,
            'X-Signature': signature
          },
          body: JSON.stringify(payload)
        });
        const data: any = await resp.json().catch(() => ({}));
        const ok = resp.ok;
        return recordTransaction({
          id: `C2B-EM-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          direction: 'C2B',
          operator: 'EMOLA',
          msisdn,
          amount,
          currency: 'MZN',
          reference,
          thirdPartyReference,
          operatorTransactionId: data.transactionId || data.id,
          description: input.description,
          status: ok ? 'INICIADO' : 'FALHOU',
          mode,
          simulated: false,
          responseCode: String(data.code || resp.status),
          responseMessage: data.message || (ok ? 'Pedido de PIN e-Mola enviado ao telemóvel do cliente.' : 'Erro no pedido e-Mola C2B.'),
          timestamp: now
        });
      } catch (err: any) {
        return recordTransaction({
          id: `C2B-EM-${Date.now()}`,
          direction: 'C2B',
          operator: 'EMOLA',
          msisdn,
          amount,
          currency: 'MZN',
          reference,
          thirdPartyReference,
          description: input.description,
          status: 'FALHOU',
          mode,
          simulated: false,
          responseCode: 'NETWORK_ERROR',
          responseMessage: err?.message || 'Erro de rede ao contactar e-Mola C2B.',
          timestamp: now
        });
      }
    }
  }

  if (operator === 'MKESH') {
    const cfg = getMkeshConfig();
    if (cfg.configured) {
      const mode: IntegrationMode = cfg.env === 'production' ? 'LIVE_API' : 'SANDBOX_API';
      try {
        const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64');
        const resp = await fetch(`${cfg.apiUrl.replace(/\/+$/, '')}/c2b/collect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${basic}`,
            'X-Merchant-Code': cfg.merchantCode
          },
          body: JSON.stringify({
            merchantCode: cfg.merchantCode,
            reference,
            thirdPartyReference,
            msisdn,
            amount: amount.toFixed(2),
            currency: 'MZN',
            description: input.description || 'ClickPay ERP'
          })
        });
        const data: any = await resp.json().catch(() => ({}));
        const ok = resp.ok;
        return recordTransaction({
          id: `C2B-MK-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          direction: 'C2B',
          operator: 'MKESH',
          msisdn,
          amount,
          currency: 'MZN',
          reference,
          thirdPartyReference,
          operatorTransactionId: data.transactionId || data.id,
          description: input.description,
          status: ok ? 'INICIADO' : 'FALHOU',
          mode,
          simulated: false,
          responseCode: String(data.code || resp.status),
          responseMessage: data.message || (ok ? 'Pedido de pagamento mKesh enviado.' : 'Erro no pedido mKesh C2B.'),
          timestamp: now
        });
      } catch (err: any) {
        return recordTransaction({
          id: `C2B-MK-${Date.now()}`,
          direction: 'C2B',
          operator: 'MKESH',
          msisdn,
          amount,
          currency: 'MZN',
          reference,
          thirdPartyReference,
          description: input.description,
          status: 'FALHOU',
          mode,
          simulated: false,
          responseCode: 'NETWORK_ERROR',
          responseMessage: err?.message || 'Erro de rede ao contactar mKesh C2B.',
          timestamp: now
        });
      }
    }
  }

  const simPrefix = operator === 'EMOLA' ? 'SIM-C2B-EM' : operator === 'MKESH' ? 'SIM-C2B-MK' : 'SIM-C2B-MP';
  return recordTransaction({
    id: `${simPrefix}-${Math.floor(100000 + Math.random() * 900000)}`,
    direction: 'C2B',
    operator,
    msisdn,
    amount,
    currency: 'MZN',
    reference,
    thirdPartyReference,
    operatorTransactionId: `${simPrefix}-${Math.floor(100000 + Math.random() * 900000)}`,
    description: input.description,
    status: 'SIMULADO_SUCESSO',
    mode: 'SIMULATION',
    simulated: true,
    responseCode: 'SIM-0',
    responseMessage: `Simulação de cobrança C2B ${operator} (${amount.toFixed(2)} MT para ${msisdn}). Configure os Secrets no servidor para prompt real de PIN.`,
    timestamp: now
  });
}

/**
 * Consulta o estado de uma transação na Vodacom M-Pesa (porta 18353) ou no histórico local.
 */
export async function queryMobileTransactionStatus(ref: string): Promise<{
  found: boolean;
  transaction?: MobileMoneyTransaction;
  operatorResponse?: any;
}> {
  const tx = getMobileTransactionByRef(ref);
  const mpesa = getMpesaConfig();

  if (mpesa.configured && (!tx || tx.operator === 'MPESA')) {
    try {
      const bearer = generateMpesaBearerToken(mpesa.apiKey, mpesa.publicKey);
      const queryRef = tx?.operatorTransactionId || tx?.thirdPartyReference || ref;
      const url = `https://${mpesa.host}:18353/ipg/v1x/queryTransactionStatus/?input_QueryReference=${encodeURIComponent(queryRef)}&input_ServiceProviderCode=${encodeURIComponent(mpesa.shortcode)}&input_ThirdPartyReference=${encodeURIComponent(tx?.thirdPartyReference || ref)}`;
      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Origin': mpesa.origin,
          'Authorization': `Bearer ${bearer}`
        }
      });
      const data = await resp.json().catch(() => null);
      return { found: !!tx || resp.ok, transaction: tx, operatorResponse: data };
    } catch {
      return { found: !!tx, transaction: tx };
    }
  }

  return { found: !!tx, transaction: tx };
}

/**
 * Processa callbacks/webhooks assíncronos enviados por M-Pesa, e-Mola ou mKesh.
 */
export function processOperatorWebhook(
  operator: MobileOperator,
  headers: Record<string, string | string[] | undefined>,
  payload: any
): { valid: boolean; reason?: string; transaction: MobileMoneyTransaction } {
  const configuredSecret =
    operator === 'MPESA' ? getMpesaConfig().webhookSecret :
    operator === 'EMOLA' ? getEmolaConfig().webhookSecret :
    getMkeshConfig().webhookSecret;

  if (configuredSecret) {
    const incomingSecret = String(
      headers['x-webhook-secret'] ||
      headers['x-signature'] ||
      headers['authorization']?.toString().replace(/^Bearer\s+/i, '') ||
      ''
    ).trim();
    if (incomingSecret !== configuredSecret) {
      throw new Error('Assinatura ou segredo de Webhook inválido.');
    }
  }

  const ref = String(
    payload?.input_ThirdPartyReference ||
    payload?.thirdPartyReference ||
    payload?.output_ThirdPartyReference ||
    payload?.reference ||
    ''
  ).trim();
  const opTxId = String(
    payload?.output_TransactionID ||
    payload?.transactionId ||
    payload?.output_ConversationID ||
    payload?.id ||
    ''
  ).trim();
  const rawCode = String(payload?.output_ResponseCode || payload?.status || payload?.code || 'INS-0').trim();
  const isSuccess =
    rawCode === 'INS-0' ||
    rawCode.toUpperCase() === 'SUCCESS' ||
    rawCode.toUpperCase() === 'COMPLETED' ||
    rawCode.toUpperCase() === 'PAID' ||
    rawCode === '0' ||
    rawCode === '200';

  const existing = (ref && getMobileTransactionByRef(ref)) || (opTxId && getMobileTransactionByRef(opTxId));
  const now = new Date().toISOString();

  if (existing) {
    existing.status = isSuccess ? 'CONFIRMADO_OPERADORA' : 'FALHOU';
    if (opTxId) existing.operatorTransactionId = opTxId;
    existing.responseCode = rawCode;
    existing.responseMessage = payload?.output_ResponseDesc || payload?.message || existing.responseMessage;
    existing.webhookConfirmedAt = now;
    return { valid: true, transaction: existing };
  }

  const msisdn = normalizeMozMsisdn(
    payload?.input_CustomerMSISDN || payload?.msisdn || payload?.phone || '258840000000'
  );
  const created = recordTransaction({
    id: `WH-${operator}-${Date.now()}`,
    direction: String(payload?.transactionType || '').toUpperCase() === 'B2C' ? 'B2C' : 'C2B',
    operator,
    msisdn,
    amount: Number(payload?.input_Amount || payload?.amount || 0),
    currency: 'MZN',
    reference: ref || `WH-${Date.now().toString().slice(-6)}`,
    thirdPartyReference: ref || opTxId || `WH-${Date.now()}`,
    operatorTransactionId: opTxId || undefined,
    status: isSuccess ? 'CONFIRMADO_OPERADORA' : 'FALHOU',
    mode: 'LIVE_API',
    simulated: false,
    responseCode: rawCode,
    responseMessage: payload?.output_ResponseDesc || payload?.message || `Callback recebido de ${operator}.`,
    timestamp: now,
    webhookConfirmedAt: now
  });

  return { valid: true, transaction: created };
}
