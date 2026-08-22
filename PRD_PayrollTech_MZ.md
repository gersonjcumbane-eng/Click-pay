# Product Requirement Document (PRD) - PayrollTech Mz
**Sistema Inteligente de Processamento Salarial, Impostos e Automação Financeira para Moçambique**

---

## 1. Visão Geral do Sistema (System Overview)
O **PayrollTech Mz** é uma plataforma SaaS e Full-Stack projetada especificamente para o mercado moçambicano, cujo propósito é simplificar o processamento de folha de pagamento (Payroll), cálculo automático de obrigações tributárias e fiscais, conformidade jurídica com a Lei do Trabalho Moçambicana, e execução de pagamentos automáticos em lote através de carteiras móveis (M-Pesa, e-Mola) e gateways bancários integrados (Millennium BIM).

O sistema suporta arquitetura multi-empresa (multi-tenant) ideal para gabinetes de contabilidade e departamentos de Recursos Humanos de empresas moçambicanas.

---

## 2. Objetivos de Teste Automatizado & Segurança
Este documento serve como a especificação de referência para ferramentas de teste dinâmico (DAST), varredores estáticos de código (SAST), analisadores de dependências, e testes unitários de regressão para identificar falhas funcionais ou vulnerabilidades de segurança (OWASP Top 10).

---

## 3. Arquitetura Técnica & Fluxo de Dados
*   **Frontend**: React 18+ com Vite, TypeScript, Tailwind CSS e Framer Motion.
*   **Backend**: Node.js com Express (servidor `server.ts` unificado de alta performance).
*   **Estado & Persistência**: Firebase Firestore (banco de dados NoSQL persistente) integrado no cliente e no servidor.
*   **Comunicação**: Protocolo HTTPS/REST APIs para endpoints no `/api/*`.

---

## 4. Modelos de Dados (Data Schemas)

### 4.1. Colaborador (`Employee`)
```typescript
interface Employee {
  id: string;                      // Identificador único (ID do Firestore ou emp-*)
  nome: string;                    // Nome completo do funcionário
  nuit: string;                    // Número Único de Identificação Tributária (9 dígitos)
  inss_numero: string;             // Número do INSS do beneficiário (9 dígitos)
  cargo: string;                   // Título profissional / Função exercida
  salario_base: number;            // Salário bruto acordado em Meticais (MZN)
  numero_dependentes: number;      // Número de dependentes para dedução de IRPS (0 a 4+)
  carteira_movel: string;          // Número de celular para desembolsos (82, 83, 84, 85, 86, 87)
  tipo_contrato?: 'Indeterminado' | 'Prazo Certo' | 'Prazo Incerto';
  data_inicio?: string;            // ISO Date YYYY-MM-DD
  data_fim?: string;               // ISO Date YYYY-MM-DD (para contratos a prazo)
  cargo_complexo?: boolean;        // Indicador de adicionais de risco ou turnos complexos
  faltas_historico?: FaltaItem[];  // Histórico de faltas para descontos na folha
}
```

### 4.2. Empresa (`CompanyData`)
```typescript
interface CompanyData {
  nome: string;                    // Nome jurídico da Empresa / Cliente
  nuit: string;                    // NUIT da Empresa (9 dígitos)
  endereco: string;                // Endereço físico
  provincia?: string;              // Província de Moçambique
  distrito?: string;               // Distrito correspondente
  email?: string;                  // Email corporativo principal
  telefone?: string;               // Contacto telefónico principal
  subscription_status?: 'ativo' | 'suspenso' | 'pendente';
  subscription_plan?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
}
```

### 4.3. Cálculo Salarial (`PayrollCalculation`)
```typescript
interface PayrollCalculation {
  salarioBase: number;             // Salário bruto antes de descontos
  descontoFaltas: number;          // Desconto financeiro decorrente de faltas
  diasFaltas: number;              // Quantidade de dias faltados
  inssTrabalhador: number;         // 3% sobre o salário bruto (exclui certos bónus)
  inssEmpresa: number;             // 4% sobre o salário bruto (encargo patronal)
  salarioTributavel: number;       // Base tributável para cálculo do IRPS
  irpsConstatado: number;          // Imposto sobre o Rendimento das Pessoas Singulares calculado
  totalDescontos: number;          // Soma de INSS Trabalhador + IRPS + Faltas + IPA
  salarioLiquido: number;          // Valor líquido real a transferir para o trabalhador
  ipaDesconto: number;             // Imposto Pessoal Autárquico fixo aplicável
  periodo: string;                 // Mês/Ano de processamento (Ex: "07/2026")
  descontoVales?: number;          // Vales ou adiantamentos descontados automaticamente
}
```

---

## 5. Módulos Funcionais e Regras de Negócio (Business Logic)

### 5.1. Motor Fiscal Moçambicano (Tax Calculation Engine)
O motor de processamento deve cumprir com as regras estabelecidas pelo Regulamento do IRPS e as directivas da Autoridade Tributária de Moçambique.

*   **Dedução de Faltas**:
    *   Fórmula padrão: `Desconto = (Salário Base / 30) * Dias de Falta Injustificada`.
*   **Cálculo do INSS**:
    *   **Trabalhador**: Fixo em `3.0%` do salário bruto ajustado.
    *   **Entidade Patronal**: Fixo em `4.0%` do salário bruto ajustado.
*   **Cálculo do IRPS (Imposto sobre Rendimento)**:
    *   Aplicação de tabela progressiva de retenção na fonte sobre a base de cálculo (`Salário Bruto - Desconto de Faltas - INSS Trabalhador`).
    *   Dedução base de acordo com a quantidade de dependentes declarados (0, 1, 2, 3, ou 4 ou mais dependentes), escalonados progressivamente.

### 5.2. Gestão de Contratos sob a Lei do Trabalho 13/2023
O sistema executa uma auditoria de conformidade em tempo real baseada nos parâmetros do contrato:
*   Contratos por **Prazo Certo** não podem exceder 2 anos (ou 8 anos para PMEs), requerendo justificação legal específica.
*   Contratos por **Prazo Incerto** necessitam de preenchimento obrigatório do escopo da obra ou serviço temporário.
*   Contratos por **Tempo Indeterminado** exigem verificação do período probatório legal aplicável (90 a 180 dias de acordo com a complexidade do cargo).

### 5.3. Sistema de Pagamentos Fintech (M-Pesa, e-Mola & Millennium BIM)
O módulo de liquidação fornece transferência automática de fundos do banco corporativo directo para as carteiras móveis dos trabalhadores.
*   **Millennium BIM (Gateway)**: Garante a conexão directa para débito da conta corporativa e provisionamento instantâneo (Financiamento Activo com auto-refill).
*   **M-Pesa / e-Mola (Destaque Móvel)**: Processamento de lotes de pagamento instantâneos. O sistema de validação impede transferências para números com formato inválido no território de Moçambique (comprimento e prefixos correspondentes).

### 5.4. Central de Automação & Piloto Automático (Auto-Pilot)
Um painel exclusivo de administração permite ao administrador do sistema simular e executar de forma orquestrada e ponta-a-ponta:
1.  **Auditoria sob a Lei 13/2023**: Verificação se todos os colaboradores do lote têm contratos legais ativos.
2.  **Conexão Bancária Primária**: Validação do saldo e autorização na API do Millennium BIM.
3.  **Cruzamento de Vales**: Auto-dedução de adiantamentos diretamente da folha.
4.  **Desembolso Automatizado**: Liquidação massiva instantânea via M-Pesa/e-Mola com logs de transação e geração de recibos assinados eletronicamente.

### 5.5. Exportação SISSMO (Declaração de INSS)
O sistema compila as folhas de pagamento no formato oficial `.txt` codificado de acordo com os padrões informáticos do Sistema de Segurança Social de Moçambique (SISSMO) para importação sem erros na plataforma oficial.

---

## 6. Endpoints do Sistema (Para Testes de API / DAST)
A ferramenta de testes automatizados deve submeter payloads de teste para avaliar as respostas e a resiliência dos seguintes endpoints simulados ou reais no Express:

*   `POST /api/auth/login`: Autenticação e emissão de tokens.
*   `GET /api/companies`: Listagem de empresas autorizadas para o utilizador.
*   `GET /api/employees?companyId={id}`: Listagem de colaboradores vinculados à empresa fornecida.
*   `POST /api/employees`: Criação de novo colaborador (Verificar validação de input).
*   `PUT /api/employees/{id}`: Actualização de dados cadastrais.
*   `GET /api/payroll/calculate?employeeId={id}&period={month}`: Simulação imediata de IRPS, INSS e salário líquido.
*   `POST /api/payments/disburse-batch`: Desembolso massivo para M-Pesa/e-Mola.
*   `GET /api/reports/sissmo?companyId={id}&period={month}`: Geração do arquivo estruturado para o SISSMO.
*   `GET /api/reports/payslip-pdf?employeeId={id}&period={month}`: Geração do Recibo de Vencimento assinado digitalmente.

---

## 7. Vetores de Segurança e Casos de Teste (Vulnerability & Bug Mapping)

### 7.1. Casos de Teste Funcional (Bugs Lógicos)
| ID Caso | Descrição do Teste | Input de Teste | Resultado Esperado |
| :--- | :--- | :--- | :--- |
| **TC-001** | Validação de NUIT inválido | `nuit: "123456"` | Retornar erro HTTP 400 (Formato inválido. Deve ter exatamente 9 dígitos). |
| **TC-002** | Salário base negativo | `salario_base: -50000` | Impedir inserção ou atualização. |
| **TC-003** | IRPS Progressivo Escalão 1 | `salario: 20000` | Aplicar isenção ou taxas correspondentes de acordo com a tabela oficial de IRPS. |
| **TC-004** | Dedução excessiva de dependentes | `dependentes: 10` | Forçar limite de dedução máxima para o escalão do colaborador. |
| **TC-005** | Formato de Carteira Móvel | `carteira_movel: "123456789"` | Bloquear número fora dos padrões nacionais de Moçambique (deve iniciar com 82, 83, 84, 85, 86, 87). |

### 7.2. Falhas de Segurança (Penetration Testing Scope)
1.  **Dificultador de Bypass de Autenticação (Broken Object Level Authorization - BOLA)**:
    *   *Ameaça*: Um utilizador logado na empresa `cli_A` consegue aceder aos dados de colaboradores da empresa `cli_B` alterando o parâmetro `companyId` na query string.
    *   *Verificação*: O scanner automatizado de APIs deve rodar testes autenticados com múltiplos perfis de empresa e validar se o backend retorna código HTTP `403 Forbidden` ao cruzar dados de IDs.
2.  **Injeção de Input & Cross-Site Scripting (XSS)**:
    *   *Ameaça*: Injeção de scripts no campo `nome` do funcionário ou `cargo` que seriam renderizados indevidamente no navegador do Administrador ou compilados no arquivo PDF do Recibo de Vencimento.
    *   *Verificação*: Enviar payloads `<script>alert(1)</script>` ou payloads HTML nos formulários de cadastro e auditar a esterilização nas views do Dashboard e Relatórios.
3.  **Segurança e Encriptação de Chaves / Chaves API**:
    *   *Ameaça*: Chaves de teste ou chaves oficiais de sandbox de M-Pesa expostas no código do Frontend.
    *   *Verificação*: Varrer todo o bundle de frontend distribuído em `/dist` à procura de padrões de tokens, chaves SSH, credenciais de base de dados ou senhas. Toda comunicação de integração financeira deve ser estritamente proxyada pelo backend usando variáveis de ambiente seguras.
4.  **Rate Limiting no Processamento Financeiro**:
    *   *Ameaça*: Duplo clique ou requisições em rajada no endpoint `POST /api/payments/disburse-batch` causando saídas duplicadas de fundos no banco ou carteira móvel.
    *   *Verificação*: Submeter requisições paralelas idênticas com intervalo inferior a 1 segundo e atestar se o servidor rejeita o processamento duplicado com controle de idempotência ativa.
