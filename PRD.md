# Documento de Requisitos do Produto (PRD)
## Sistema Payroll Tech Mz — Fintech de Salários & ERP Moçambique

Este documento define as especificações de negócio, fluxos de dados, regras fiscais e endpoints da API do sistema **Payroll Tech Mz** para servir como referência em testes automáticos de qualidade, segurança e integridade.

---

## 1. Visão Geral do Sistema
O **Payroll Tech Mz** é um ERP full-stack de processamento salarial e gestão de recursos humanos integrado com canais fintech de pagamento automático (M-Pesa, e-Mola, Millennium BIM) em estrito alinhamento com a **Lei do Trabalho de Moçambique (Lei nº 13/2023)** e o **Código do IRPS**.

O sistema opera com dois níveis de acesso principais:
1. **Administrador/Founder (`FOUNDERS_MEMBER`)**: Gestão de empresas clientes, configuração geral de taxas e visualização global de movimentações.
2. **Empresa Cliente (`CLIENTE_EMPRESA`)**: Gestão de funcionários próprios, contratos laborais, adiantamentos (vales) e emissão de folhas de pagamento locais.

---

## 2. Módulos Funcionais e Regras de Negócio

### Módulo A: Gestão de Colaboradores e Contratos (Lei nº 13/2023)
- **Cadastro**: Coleta de nome, NUIT (9 dígitos), INSS (formato `INSS-XXXXXX`), cargo, salário base, número de dependentes e número de carteira móvel (iniciado por 84, 85, 86, 87).
- **Contratos**: Suporta contratos por tempo *Indeterminado*, *Prazo Certo* e *Prazo Incerto*.
- **Período de Experiência (Regulamento de Auditoria)**:
  - Contrato Indeterminado para cargos complexos (técnicos ou diretores): **180 dias**.
  - Contrato Indeterminado padrão: **90 dias**.
  - Contrato a Prazo Certo: **15 ou 30 dias** consoante a duração total.
- **Caducidade e Aviso Prévio**: Contratos a termo certo exigem denúncia escrita com **30 dias de antecedência** (Artigo 41 da Lei nº 13/2023). O sistema emite automaticamente alertas vermelhos de risco e gera o PDF de Aviso Prévio oficial.

### Módulo B: Motor Fiscais de Salários (Regime Moçambicano)
O cálculo salarial baseia-se na seguinte precedência:
1. **Dedução de Faltas**:
   $$\text{Desconto de Faltas} = \left(\frac{\text{Salário Base}}{30}\right) \times \text{Dias de Falta}$$
2. **Cálculo do INSS**:
   - **Trabalhador (Retenção)**: $3\%$ do Salário Base (líquido de faltas).
   - **Entidade Empregadora (Encargo)**: $4\%$ do Salário Base (líquido de faltas).
3. **Cálculo do IRPS (Tabela de Retenção na Fonte)**:
   - Matéria Coletável = Salário Base $-$ Desconto de Faltas $-$ INSS Trabalhador ($3\%$).
   - Aplicação dos escalões oficiais mensais de Moçambique com dedução de taxa por número de dependentes ($0, 1, 2, 3, 4+$) conforme o Código do IRPS.
4. **Adiantamentos (Vales)**: Dedução direta sobre o valor líquido final a transferir.

### Módulo C: Integração Fintech e Canal de Pagamentos
- **Contas Corporativas**: Financiamento via Millennium BIM (Conta Primária ativa).
- **Dispersão em Massa (Bulk Payments)**: Liquidação instantânea para carteiras M-Pesa/e-Mola dos trabalhadores.
- **Piloto Automático (Auto-Pilot)**: Realiza de forma interligada a auto-dedução de vales ativos, calcula impostos e efetua as transferências para os trabalhadores em lote através da API de backend.
- **Auditoria Interna**: Histórico de logs de pagamento inviolável para auditorias financeiras e cruzamento com guias do SISSMO.

### Módulo D: Gestão de Clientes e Contextos (Multi-Tenant)
- **Switcher de Empresas**: Permite alterar o contexto da sessão ativa (`selecionarClienteEmpresa`) mudando o ID do cliente e carregando em tempo real os seus colaboradores, contratos e histórico de pagamentos sem expor dados de terceiros.

---

## 3. Arquitetura Técnica
- **Frontend**: React (Vite, Tailwind CSS, Lucide Icons, Recharts, Motion).
- **Backend**: Node.js com Express e bundler de produção via esbuild.
- **Persistência**: Base de dados em memória persistente com APIs de sync e suporte a autenticação do Firebase.

---

## 4. Referência de API Endpoints para Testes de Integração e Segurança

### Autenticação e Sessões
- **`POST /api/auth/login`**: Valida credenciais e retorna o token de acesso e a função do usuário (`FOUNDERS_MEMBER` ou `CLIENTE_EMPRESA`).
- **`POST /api/auth/register-client`**: Registra nova empresa e cria as credenciais sincronizadas no Firebase.

### Switcher de Empresas
- **`GET /api/clients`**: Lista todas as empresas autorizadas para o usuário ativo.
- **`POST /api/clients/select`**: Altera a empresa ativa.
  - *Request Body*: `{ "id": "cli_gold" }`
  - *Response*: Retorna o novo contexto ativo de dados e configurações fiscais.

### Colaboradores e Contratos
- **`GET /api/employees`**: Retorna a lista de colaboradores da empresa ativa.
- **`POST /api/employees`**: Cria um novo funcionário e vincula um contrato por tempo indeterminado padrão.
- **`POST /api/clientes/criar-contrato`**: Registra contrato laboral e sincroniza com o colaborador.
- **`DELETE /api/clientes/remover-contrato/:id`**: Remove contrato laboral e apaga o colaborador do diretório sincronizadamente.

### Processamento e Fintech
- **`POST /api/payroll/bulk-process-and-pay`**: Processamento e pagamento salarial individual ou em lote.
  - *Request*: `{ "items": [{ "id": "emp-gerson", "diasFaltas": 1 }], "periodo": "Julho 2026" }`
- **`POST /api/fintech/autopilot/executar`**: Dispara o piloto automático para pagamento total da folha com auto-recharge inteligente.
- **`GET /api/fintech/carteira`**: Consulta o saldo atual da fintech para a empresa ativa.

### Exportações e Relatórios
- **`GET /api/exportar/mapa-pdf?periodo=Julho 2026`**: Gera o PDF consolidado do mapa de salários.
- **`GET /api/exportar/mapa-excel?periodo=Julho 2026`**: Exporta folha de salários em formato CSV estruturado.
- **`GET /api/auditoria/historico-remuneracoes?periodo=Julho 2026`**: Extrai relatório analítico de remunerações para conformidade regulatória.

---

## 5. Diretrizes para Busca de Vulnerabilidades (PenTesting)
Para garantir a integridade do sistema, testes automatizados devem focar nos seguintes pontos:
1. **Broken Object Level Authorization (BOLA)**: Validar se um usuário autenticado com `CLIENTE_EMPRESA` de uma empresa consegue aceder a funcionários de outra empresa através de IDs diretos nos endpoints `/api/employees/:id` ou no switcher `/api/clients/select`.
2. **Data Isolation (Isolamento Multitenant)**: Garantir que operações assíncronas do piloto automático (`/api/fintech/autopilot/executar`) não misturem fundos ou contas bancárias de empresas distintas.
3. **Flutuação de Salários e Faltas Negativas**: Injetar valores de faltas superiores a 30 dias ou negativos e verificar se o motor fiscal trata com validações robustas (evitando estornos fiscais indevidos).
4. **Evasão de Limite de Assinaturas**: Tentar adicionar mais colaboradores do que o plano de assinatura atual da empresa permite e validar se o backend bloqueia a transação de forma resiliente.
