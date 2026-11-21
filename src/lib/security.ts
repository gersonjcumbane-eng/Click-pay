/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Módulo de Segurança Cibernética, Antivírus de Ficheiros e Criptografia — ClickPay ERP
 * Compatível com Browser (WebCrypto), Node.js e Vercel Serverless.
 */

export interface MalwareScanInput {
  base64: string;
  mimeType?: string;
  fileName?: string;
  maxBytes?: number;
}

export interface MalwareScanResult {
  safe: boolean;
  threatName?: string;
  reason?: string;
  fileSizeBytes: number;
  sha256Prefix: string;
  scannedAt: string;
}

export interface ThreatInspectionResult {
  safe: boolean;
  threatType?: string;
  fieldPath?: string;
  reason?: string;
}

const HASH_PREFIX = 'cpk_v1';
const HASH_ITERATIONS = 10000;

const DANGEROUS_EXTENSIONS = new Set([
  'exe', 'dll', 'bat', 'cmd', 'ps1', 'psm1', 'psd1', 'vbs', 'vbe',
  'js', 'jse', 'wsf', 'wsh', 'sh', 'bash', 'zsh', 'msi', 'msp',
  'scr', 'pif', 'com', 'hta', 'jar', 'docm', 'xlsm', 'pptm', 'dotm',
  'xltm', 'php', 'phtml', 'py', 'rb', 'pl', 'asp', 'aspx', 'jsp',
  'lnk', 'iso', 'img', 'vhd', 'sys', 'drv', 'cpl', 'reg', 'elf', 'apk'
]);

const EICAR_SIGNATURE = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

// =========================================================================
// UTILITÁRIOS CRIPTOGRÁFICOS (SHA-256 + HASHING COM SALT PARA SENHAS)
// =========================================================================

function getWebCrypto(): Crypto | undefined {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    return globalThis.crypto;
  }
  return undefined;
}

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

function randomHex(byteLength = 16): string {
  const bytes = new Uint8Array(byteLength);
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteLength; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytesToHex(bytes);
}

// Pure TS fallback SHA-256 (FIPS 180-4) para ambientes sem WebCrypto subtle
function sha256FallbackBytes(input: Uint8Array): Uint8Array {
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]);

  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ]);

  const bitLen = input.length * 8;
  const paddedLen = Math.ceil((input.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(input);
  padded[input.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);

  const w = new Uint32Array(64);
  const rotr = (n: number, x: number) => (x >>> n) | (x << (32 - n));

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3);
      const s1 = rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) {
    outView.setUint32(i * 4, H[i], false);
  }
  return out;
}

export async function sha256Bytes(input: Uint8Array): Promise<Uint8Array> {
  const webCrypto = getWebCrypto();
  if (webCrypto) {
    try {
      const copy = new Uint8Array(input.byteLength);
      copy.set(input);
      const digest = await webCrypto.subtle.digest('SHA-256', copy.buffer);
      return new Uint8Array(digest);
    } catch {
      // Fallback below
    }
  }
  return sha256FallbackBytes(input);
}

async function derivePasswordDigestHex(password: string, saltHex: string): Promise<string> {
  const encoder = new TextEncoder();
  const webCrypto = getWebCrypto();
  if (webCrypto) {
    try {
      const keyMaterial = await webCrypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
      );
      const bits = await webCrypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: encoder.encode(saltHex),
          iterations: HASH_ITERATIONS,
          hash: 'SHA-256'
        },
        keyMaterial,
        256
      );
      return bytesToHex(new Uint8Array(bits));
    } catch {
      // Fallback to iterative SHA-256 below
    }
  }

  let acc = encoder.encode(`${saltHex}:${password}`);
  for (let i = 0; i < 256; i++) {
    acc = sha256FallbackBytes(acc);
  }
  return bytesToHex(acc);
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function isHashedPassword(value?: string | null): boolean {
  return typeof value === 'string' && value.startsWith(`${HASH_PREFIX}$`);
}

export async function hashPassword(plainPassword: string): Promise<string> {
  const clean = String(plainPassword || '');
  if (!clean) return '';
  if (isHashedPassword(clean)) return clean;
  const saltHex = randomHex(16);
  const digestHex = await derivePasswordDigestHex(clean, saltHex);
  return `${HASH_PREFIX}$${saltHex}$${digestHex}`;
}

export async function verifyPassword(plainPassword: string, storedValue: string): Promise<boolean> {
  const plain = String(plainPassword || '');
  const stored = String(storedValue || '');
  if (!plain || !stored) return false;

  if (isHashedPassword(stored)) {
    const parts = stored.split('$');
    if (parts.length !== 3) return false;
    const [, saltHex, expectedDigest] = parts;
    const candidateDigest = await derivePasswordDigestHex(plain, saltHex);
    return constantTimeEquals(candidateDigest, expectedDigest);
  }

  // Compatibilidade segura para registos legados ainda não re-gravados
  return constantTimeEquals(plain, stored) || constantTimeEquals(plain.trim(), stored.trim());
}

// =========================================================================
// ANTIVÍRUS & SCANNER DE MALWARE PARA FICHEIROS (UPLOAD GUARD)
// =========================================================================

function decodeBase64ToBytes(rawBase64: string): Uint8Array | null {
  try {
    const cleaned = rawBase64.includes(',') ? rawBase64.split(',').slice(1).join(',') : rawBase64;
    const compact = cleaned.replace(/\s+/g, '');
    if (!compact || !/^[A-Za-z0-9+/=]+$/.test(compact)) {
      return null;
    }

    if (typeof Buffer !== 'undefined') {
      const buf = Buffer.from(compact, 'base64');
      return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    }

    const binaryStr = atob(compact);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

function bytesStartWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (bytes[offset + i] !== signature[i]) return false;
  }
  return true;
}

function bytesToAsciiSample(bytes: Uint8Array, maxLen = 262144): string {
  const limit = Math.min(bytes.length, maxLen);
  let out = '';
  for (let i = 0; i < limit; i++) {
    const code = bytes[i];
    out += code >= 9 && code <= 126 ? String.fromCharCode(code) : ' ';
  }
  return out;
}

export async function scanFileForMalware(input: MalwareScanInput): Promise<MalwareScanResult> {
  const scannedAt = new Date().toISOString();
  const maxBytes = input.maxBytes ?? 15 * 1024 * 1024;
  const fileName = String(input.fileName || '').trim();
  const mimeType = String(input.mimeType || '').toLowerCase().trim();

  // 1. Verificar extensão do ficheiro e extensões duplas disfarçadas
  if (fileName) {
    const cleanName = fileName.split(/[\\/]/).pop() || fileName;
    if (cleanName.includes('\0') || cleanName.includes('..')) {
      return {
        safe: false,
        threatName: 'Malware.PathTraversal.Filename',
        reason: 'Nome de ficheiro inválido ou tentativa de manipulação de diretório.',
        fileSizeBytes: 0,
        sha256Prefix: 'invalid',
        scannedAt
      };
    }

    const parts = cleanName.toLowerCase().split('.');
    if (parts.length > 1) {
      const lastExt = parts[parts.length - 1];
      if (DANGEROUS_EXTENSIONS.has(lastExt)) {
        return {
          safe: false,
          threatName: `Trojan.Executable.${lastExt.toUpperCase()}`,
          reason: `Tipo de ficheiro executável ou script perigoso bloqueado (.${lastExt}).`,
          fileSizeBytes: 0,
          sha256Prefix: 'blocked',
          scannedAt
        };
      }
      // Bloquear dupla extensão suspeita (ex: folha.pdf.exe, recibo.xlsx.js)
      if (parts.length > 2) {
        const prevExt = parts[parts.length - 2];
        if (DANGEROUS_EXTENSIONS.has(prevExt)) {
          return {
            safe: false,
            threatName: `Trojan.DoubleExtension.${prevExt.toUpperCase()}`,
            reason: 'Ficheiro suspeito com dupla extensão disfarçada bloqueado.',
            fileSizeBytes: 0,
            sha256Prefix: 'blocked',
            scannedAt
          };
        }
      }
    }
  }

  // 2. Descodificar base64 e validar tamanho
  const bytes = decodeBase64ToBytes(input.base64);
  if (!bytes || bytes.length === 0) {
    return {
      safe: false,
      threatName: 'Corrupt.InvalidBase64Payload',
      reason: 'Conteúdo do ficheiro corrompido ou formato base64 inválido.',
      fileSizeBytes: 0,
      sha256Prefix: 'invalid',
      scannedAt
    };
  }

  if (bytes.length > maxBytes) {
    return {
      safe: false,
      threatName: 'DoS.OversizedUpload',
      reason: `O ficheiro (${(bytes.length / (1024 * 1024)).toFixed(2)} MB) excede o limite máximo permitido.`,
      fileSizeBytes: bytes.length,
      sha256Prefix: 'oversized',
      scannedAt
    };
  }

  const digest = await sha256Bytes(bytes);
  const sha256Prefix = bytesToHex(digest).slice(0, 16);

  // 3. Assinaturas binárias de executáveis (PE/MZ, ELF, Mach-O, LNK, Shell Script)
  if (bytesStartWith(bytes, [0x4d, 0x5a])) {
    return {
      safe: false,
      threatName: 'Win32.PE.Executable',
      reason: 'Assinatura de executável Windows (MZ/PE) detetada e neutralizada.',
      fileSizeBytes: bytes.length,
      sha256Prefix,
      scannedAt
    };
  }

  if (bytesStartWith(bytes, [0x7f, 0x45, 0x4c, 0x46])) {
    return {
      safe: false,
      threatName: 'Linux.ELF.Binary',
      reason: 'Binário executável Linux (ELF) bloqueado pelo antivírus.',
      fileSizeBytes: bytes.length,
      sha256Prefix,
      scannedAt
    };
  }

  if (
    bytesStartWith(bytes, [0xfe, 0xed, 0xfa, 0xce]) ||
    bytesStartWith(bytes, [0xfe, 0xed, 0xfa, 0xcf]) ||
    bytesStartWith(bytes, [0xcf, 0xfa, 0xed, 0xfe]) ||
    bytesStartWith(bytes, [0xce, 0xfa, 0xed, 0xfe])
  ) {
    return {
      safe: false,
      threatName: 'MacOS.MachO.Executable',
      reason: 'Binário executável Mach-O bloqueado pelo antivírus.',
      fileSizeBytes: bytes.length,
      sha256Prefix,
      scannedAt
    };
  }

  if (bytesStartWith(bytes, [0x4c, 0x00, 0x00, 0x00, 0x01, 0x14, 0x02, 0x00])) {
    return {
      safe: false,
      threatName: 'Win32.Shortcut.LNK',
      reason: 'Atalho malicioso (.lnk) bloqueado.',
      fileSizeBytes: bytes.length,
      sha256Prefix,
      scannedAt
    };
  }

  if (bytesStartWith(bytes, [0x23, 0x21])) {
    return {
      safe: false,
      threatName: 'Unix.ShellScript.Shebang',
      reason: 'Script executável (#!) bloqueado pelo scanner de segurança.',
      fileSizeBytes: bytes.length,
      sha256Prefix,
      scannedAt
    };
  }

  // 4. Inspeção de assinaturas no conteúdo ASCII/UTF-8
  const sample = bytesToAsciiSample(bytes, 524288);
  if (sample.includes(EICAR_SIGNATURE)) {
    return {
      safe: false,
      threatName: 'EICAR-Test-Signature',
      reason: 'Assinatura de vírus detetada (EICAR) — ficheiro colocado em quarentena.',
      fileSizeBytes: bytes.length,
      sha256Prefix,
      scannedAt
    };
  }

  // 5. Validação por tipo MIME vs Magic Bytes
  const isPdfMagic = bytesStartWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
  const isPngMagic = bytesStartWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const isJpegMagic = bytesStartWith(bytes, [0xff, 0xd8, 0xff]);
  const isGifMagic = bytesStartWith(bytes, [0x47, 0x49, 0x46, 0x38]);
  const isWebpMagic = bytesStartWith(bytes, [0x52, 0x49, 0x46, 0x46]) && bytes.length > 12 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  const isZipMagic = bytesStartWith(bytes, [0x50, 0x4b, 0x03, 0x04]) || bytesStartWith(bytes, [0x50, 0x4b, 0x05, 0x06]);
  const isOleMagic = bytesStartWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

  if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
    if (!isPdfMagic) {
      return {
        safe: false,
        threatName: 'Spoof.FakePDF',
        reason: 'O ficheiro declara ser PDF mas a assinatura binária não corresponde a um documento PDF válido.',
        fileSizeBytes: bytes.length,
        sha256Prefix,
        scannedAt
      };
    }

    const pdfThreatPatterns: Array<[RegExp, string]> = [
      [/\/JavaScript\b/i, 'PDF.Exploit.JavaScript'],
      [/\/JS\b\s*[(<]/i, 'PDF.Exploit.EmbeddedJS'],
      [/\/Launch\b/i, 'PDF.Trojan.LaunchAction'],
      [/\/OpenAction\b[\s\S]{0,120}\/(JS|JavaScript|Launch|URI)/i, 'PDF.Trojan.OpenAction'],
      [/\/RichMedia\b/i, 'PDF.Exploit.RichMedia'],
      [/\/EmbeddedFile\b/i, 'PDF.Suspicious.EmbeddedFile']
    ];
    for (const [pattern, threat] of pdfThreatPatterns) {
      if (pattern.test(sample)) {
        return {
          safe: false,
          threatName: threat,
          reason: `Código ativo ou ação perigosa detetada no PDF (${threat}).`,
          fileSizeBytes: bytes.length,
          sha256Prefix,
          scannedAt
        };
      }
    }
  }

  if (mimeType.startsWith('image/')) {
    if (mimeType === 'image/svg+xml' || sample.trimStart().toLowerCase().startsWith('<svg')) {
      const svgThreatPatterns = [
        /<script\b/i,
        /javascript\s*:/i,
        /\bon(load|error|click|mouseover|focus|animationstart)\s*=/i,
        /<foreignObject\b/i,
        /<iframe\b/i,
        /<embed\b/i
      ];
      if (svgThreatPatterns.some((p) => p.test(sample))) {
        return {
          safe: false,
          threatName: 'XSS.MaliciousSVG',
          reason: 'SVG contém scripts executáveis ou vetores de ataque XSS.',
          fileSizeBytes: bytes.length,
          sha256Prefix,
          scannedAt
        };
      }
    } else if (!isPngMagic && !isJpegMagic && !isGifMagic && !isWebpMagic) {
      return {
        safe: false,
        threatName: 'Spoof.FakeImage',
        reason: 'O ficheiro de imagem não possui cabeçalho válido (PNG, JPEG, GIF ou WebP).',
        fileSizeBytes: bytes.length,
        sha256Prefix,
        scannedAt
      };
    }
  }

  if (
    mimeType.includes('spreadsheet') ||
    mimeType.includes('wordprocessing') ||
    mimeType === 'application/vnd.ms-excel' ||
    fileName.toLowerCase().endsWith('.xlsx') ||
    fileName.toLowerCase().endsWith('.xls') ||
    fileName.toLowerCase().endsWith('.docx')
  ) {
    if (!isZipMagic && !isOleMagic) {
      return {
        safe: false,
        threatName: 'Spoof.FakeOfficeDocument',
        reason: 'Documento Office inválido ou disfarçado.',
        fileSizeBytes: bytes.length,
        sha256Prefix,
        scannedAt
      };
    }

    const macroOrExecMarkers = [
      'vbaProject.bin',
      'vbaData.xml',
      '.exe',
      '.bat',
      '.ps1',
      '.vbs',
      '.dll',
      'ActiveXObject',
      'WScript.Shell'
    ];
    const lowerSample = sample.toLowerCase();
    for (const marker of macroOrExecMarkers) {
      if (lowerSample.includes(marker.toLowerCase())) {
        return {
          safe: false,
          threatName: 'Office.MacroOrEmbeddedExec',
          reason: `Macro VBA ou conteúdo executável perigoso detetado no ficheiro (${marker}).`,
          fileSizeBytes: bytes.length,
          sha256Prefix,
          scannedAt
        };
      }
    }
  }

  if (mimeType === 'text/csv' || mimeType === 'text/plain' || fileName.toLowerCase().endsWith('.csv')) {
    const scriptMarkers = [
      /<script\b/i,
      /javascript\s*:/i,
      /<iframe\b/i,
      /\bonerror\s*=/i,
      /\bonload\s*=/i,
      /powershell\s+-(enc|e|nop|w)\b/i,
      /WScript\.Shell/i,
      /(^|[\r\n,;])\s*[=+\-@]cmd\|/i
    ];
    for (const pattern of scriptMarkers) {
      if (pattern.test(sample)) {
        return {
          safe: false,
          threatName: 'Injection.ScriptOrFormula',
          reason: 'O ficheiro de texto/CSV contém comandos ou fórmulas de injeção maliciosa.',
          fileSizeBytes: bytes.length,
          sha256Prefix,
          scannedAt
        };
      }
    }
  }

  return {
    safe: true,
    fileSizeBytes: bytes.length,
    sha256Prefix,
    scannedAt
  };
}

// =========================================================================
// FIREWALL ANTI-HACKER PARA PAYLOADS HTTP (XSS / SQLi / NoSQLi / PROTO)
// =========================================================================

const FORBIDDEN_PROTO_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const NOSQL_OPERATOR_PATTERN = /^\$(where|ne|gt|gte|lt|lte|in|nin|regex|expr|function|accumulator|jsonSchema)$/i;

const HIGH_CONFIDENCE_THREATS: Array<[RegExp, string]> = [
  [/<\s*script\b[^>]*>/i, 'XSS_SCRIPT_TAG'],
  [/javascript\s*:\s*[a-zA-Z0-9_($]/i, 'XSS_JAVASCRIPT_URI'],
  [/\bon(error|load|mouseover|focus|click)\s*=\s*["']?[^"'>]{3,}/i, 'XSS_EVENT_HANDLER'],
  [/<\s*iframe\b[^>]*>/i, 'XSS_IFRAME_INJECTION'],
  [/\bunion\s+(all\s+)?select\b/i, 'SQL_UNION_INJECTION'],
  [/;\s*(drop|truncate|alter)\s+(table|database|schema)\b/i, 'SQL_DDL_INJECTION'],
  [/(['"])\s*or\s+\1?\s*1\s*\1?\s*=\s*\1?\s*1/i, 'SQL_TAUTOLOGY_INJECTION'],
  [/\$\{\s*(jndi|ldap|rmi|dns)\s*:/i, 'JNDI_RCE_INJECTION']
];

const SKIP_INSPECTION_KEYS = new Set(['base64', 'conteudo_html', 'html', 'pdfData', 'snapshotJson']);

export function sanitizeObjectDeep<T>(value: T, depth = 0): T {
  if (depth > 20 || value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return value.replace(/\0/g, '') as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeObjectDeep(item, depth + 1)) as unknown as T;
  }

  if (typeof value === 'object') {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(value as Record<string, any>)) {
      if (FORBIDDEN_PROTO_KEYS.has(k)) continue;
      clean[k] = sanitizeObjectDeep(v, depth + 1);
    }
    return clean as T;
  }

  return value;
}

export function inspectPayloadForThreats(
  value: unknown,
  currentPath = 'body',
  depth = 0
): ThreatInspectionResult {
  if (depth > 16 || value === null || value === undefined) {
    return { safe: true };
  }

  if (typeof value === 'string') {
    const keyName = currentPath.split('.').pop() || '';
    if (SKIP_INSPECTION_KEYS.has(keyName) || value.length > 50000) {
      return { safe: true };
    }
    for (const [pattern, threatType] of HIGH_CONFIDENCE_THREATS) {
      if (pattern.test(value)) {
        return {
          safe: false,
          threatType,
          fieldPath: currentPath,
          reason: `Padrão suspeito bloqueado pela firewall (${threatType}).`
        };
      }
    }
    return { safe: true };
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < Math.min(value.length, 500); i++) {
      const res = inspectPayloadForThreats(value[i], `${currentPath}[${i}]`, depth + 1);
      if (!res.safe) return res;
    }
    return { safe: true };
  }

  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (FORBIDDEN_PROTO_KEYS.has(k)) {
        return {
          safe: false,
          threatType: 'PROTOTYPE_POLLUTION',
          fieldPath: `${currentPath}.${k}`,
          reason: 'Tentativa de poluição de protótipo bloqueada.'
        };
      }
      if (NOSQL_OPERATOR_PATTERN.test(k)) {
        return {
          safe: false,
          threatType: 'NOSQL_INJECTION',
          fieldPath: `${currentPath}.${k}`,
          reason: 'Operador de injeção NoSQL bloqueado pela firewall.'
        };
      }
      const res = inspectPayloadForThreats(v, `${currentPath}.${k}`, depth + 1);
      if (!res.safe) return res;
    }
  }

  return { safe: true };
}
