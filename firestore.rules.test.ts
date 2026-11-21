import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  hashPassword,
  verifyPassword,
  isHashedPassword,
  scanFileForMalware,
  inspectPayloadForThreats,
  sanitizeObjectDeep
} from './src/lib/security';

async function runSecurityTests() {
  console.log('Running ClickPay Cyber-Defense & Antivirus Verification Suite...');

  // 1. Password hashing & verification tests
  const pw = 'EmpresaSegura2026!';
  const hashed = await hashPassword(pw);
  assert.equal(isHashedPassword(hashed), true, 'Password must use cpk_v1 salted hash prefix');
  assert.notEqual(hashed.includes(pw), true, 'Hash must not contain plaintext password');
  assert.equal(await verifyPassword(pw, hashed), true, 'Valid password must verify against hash');
  assert.equal(await verifyPassword('SenhaErrada!', hashed), false, 'Wrong password must be rejected');

  // 2. Antivirus tests — Malware & Exploits MUST be blocked
  const peExeBase64 = Buffer.from('MZ\x90\x00\x03\x00\x00\x00This program cannot be run in DOS mode').toString('base64');
  const peScan = await scanFileForMalware({ base64: peExeBase64, mimeType: 'application/pdf', fileName: 'folha.pdf.exe' });
  assert.equal(peScan.safe, false, 'Executable PE/double-extension must be blocked');

  const pdfJsBase64 = Buffer.from('%PDF-1.7\n1 0 obj << /OpenAction << /S /JavaScript /JS (app.alert(1)) >> >>\n%%EOF').toString('base64');
  const pdfJsScan = await scanFileForMalware({ base64: pdfJsBase64, mimeType: 'application/pdf', fileName: 'contrato.pdf' });
  assert.equal(pdfJsScan.safe, false, 'PDF with embedded JavaScript exploit must be blocked');

  const eicarStr = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
  const eicarScan = await scanFileForMalware({
    base64: Buffer.from(eicarStr).toString('base64'),
    mimeType: 'text/csv',
    fileName: 'colaboradores.csv'
  });
  assert.equal(eicarScan.safe, false, 'EICAR signature must be blocked');

  const svgXssBase64 = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(document.cookie)</script></svg>').toString('base64');
  const svgScan = await scanFileForMalware({ base64: svgXssBase64, mimeType: 'image/svg+xml', fileName: 'logo.svg' });
  assert.equal(svgScan.safe, false, 'Malicious SVG with XSS script must be blocked');

  // 3. Antivirus tests — Clean legitimate files MUST pass
  const cleanPdfBase64 = Buffer.from('%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n%%EOF').toString('base64');
  const cleanPdfScan = await scanFileForMalware({ base64: cleanPdfBase64, mimeType: 'application/pdf', fileName: 'folha_salarios.pdf' });
  assert.equal(cleanPdfScan.safe, true, 'Clean PDF must pass antivirus scan');

  const cleanPngBase64 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]).toString('base64');
  const cleanPngScan = await scanFileForMalware({ base64: cleanPngBase64, mimeType: 'image/png', fileName: 'logo.png' });
  assert.equal(cleanPngScan.safe, true, 'Clean PNG must pass antivirus scan');

  // 4. WAF & Prototype Pollution tests
  const xssPayload = { nome: '<script>fetch("https://evil.test")</script>' };
  assert.equal(inspectPayloadForThreats(xssPayload).safe, false, 'XSS payload must be blocked');

  const sqliPayload = { q: "admin' OR '1'='1' UNION SELECT * FROM users" };
  assert.equal(inspectPayloadForThreats(sqliPayload).safe, false, 'SQLi payload must be blocked');

  const nosqliPayload = { email: { $ne: null } };
  assert.equal(inspectPayloadForThreats(nosqliPayload).safe, false, 'NoSQLi $ne operator must be blocked');

  const protoInput = JSON.parse('{"__proto__":{"polluted":true},"nome":"Empresa"}');
  const sanitized = sanitizeObjectDeep(protoInput);
  assert.equal(Object.prototype.hasOwnProperty.call(sanitized, '__proto__'), false, '__proto__ must be stripped');

  // 5. Static Audit of firestore.rules (no wildcard allow read, write: if true)
  const rulesText = fs.readFileSync('firestore.rules', 'utf8');
  assert.equal(/allow\s+read\s*,\s*write\s*:\s*if\s+true\s*;/.test(rulesText), false, 'firestore.rules must never allow read, write: if true');
  assert.equal(/isValidId\(/.test(rulesText), true, 'firestore.rules must enforce isValidId');
  assert.equal(/isValidSupportTicket\(/.test(rulesText), true, 'firestore.rules must enforce isValidSupportTicket');

  console.log('ALL SECURITY & ANTIVIRUS CHECKS PASSED.');
}

runSecurityTests().catch((err) => {
  console.error('SECURITY TEST FAILURE:', err);
  process.exit(1);
});
