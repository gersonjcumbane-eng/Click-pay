# ClickPay ERP — Security Specification & Threat Model (`security_spec.md`)

## 1. Data Invariants
1. **Default Deny Catch-All**: Every undefined Firestore path is denied (`allow read, write: if false;`).
2. **Strict Schema & No Shadow Fields**: Every writable Firestore document validates required keys (`hasAll`), strictly limits allowed keys (`hasOnly`), enforces primitive types, and caps every string/number boundary.
3. **ID Poisoning Guard**: Every single-document path ID (`{userId}`, `{clientId}`, `{backupId}`, `{requestId}`, `{companyId}`) must satisfy `isValidId()` (`<= 128` chars, `^[a-zA-Z0-9_\-]+$`).
4. **No Plaintext Credentials**: Passwords (`passwordHash`, `adminPassword`) are salted PBKDF2-SHA256 digests (`cpk_v1$...`) and never stored or transmitted in plaintext.
5. **Immutable Audit & Ownership Fields**: `uid` and `createdAt` cannot be modified after creation; users cannot self-escalate `role` to `SUPER_ADMIN_PAYROLL`.
6. **Verified Admin Privileges**: Super Admin requires `request.auth != null` and either verified founder email (`email_verified == true`) or membership in `/admins/{uid}`.
7. **Zero Unauthenticated Deletes**: Client-side deletes on every collection require `isSuperAdmin()`.
8. **Upload Antivirus Guard**: Uploaded PDFs, spreadsheets, CSVs, and images must pass magic-byte verification, macro/JS exploit detection, and executable rejection (`MZ`, `ELF`, `Mach-O`, `#!`, `.exe`, `.js`, SVG `<script>`, EICAR).

## 2. The "Dirty Dozen" Adversarial Payloads (Expected: `PERMISSION_DENIED` / `422` / `403`)
1. **Privilege Escalation on `/users/{uid}`**: Creating `/users/{uid}` with `role: "SUPER_ADMIN_PAYROLL"` as a regular user.
2. **Shadow / Ghost Field Injection**: Creating `/erp_clients/{id}` or `/saas_clients/{id}` with extra field `isAdmin: true` or `isVerified: true`.
3. **ID Poisoning**: Writing to `/saas_clients/../../evil` or a 1,500-character document ID.
4. **Oversized String / Denial of Wallet**: Creating `/companies/{id}` with a 50,000-character `nome` field.
5. **Unverified Admin Email Spoof**: Request with `token.email == "gersonjcumbane@gmail.com"` but `token.email_verified == false`.
6. **Unauthorized Backup Scrape (`list`/`get`)**: Unauthenticated `get` or `list` on `/backups` or `/erp_backups`.
7. **Unauthorized Client Deletion**: Non-admin attempting `delete` on `/saas_clients/{id}`, `/companies/{id}`, or `/credential_requests/{id}`.
8. **Immutable Field Tampering**: Updating `/users/{uid}` changing `createdAt` or `uid`.
9. **Terminal State Bypass**: Unauthenticated update modifying `/credential_requests/{id}` after it reached `APROVADO`/`REGISTADO_ONLINE`.
10. **PII / User Profile Enumeration**: Authenticated user A attempting `get` or `list` on `/users/{userB}`.
11. **Infected Upload (Antivirus)**: Uploading Windows PE (`MZ`), PDF with `/JavaScript`, SVG `<script>`, or `EICAR` test signature to `/api/employees/upload-parse` or `/api/brain/invoice-ocr`.
12. **WAF Cyber Attack Payload**: Submitting `__proto__`, `$where` NoSQL operator, `UNION SELECT` SQLi, or `<script>alert(1)</script>` XSS to `/api/*`.
