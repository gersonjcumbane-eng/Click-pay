# Guia de Hospedagem e Implementação (Deployment Guide)
## **PayrollTech Mz** — Sistema de Processamento Salarial e Automação

Este documento fornece as instruções detalhadas para colocar o seu sistema **PayrollTech Mz** (Landing Page + Painel de Controle + Servidor de Automação) online em produção.

---

## 1. Opções Recomendadas de Hospedagem

Como o projeto usa uma arquitetura full-stack integrada (**Vite/React** no frontend e **Express/Node.js** no backend no mesmo porto `3000`), a hospedagem deve suportar servidores de aplicação ou contêineres Docker:

### Opção A: **Google Cloud Run** (Altamente Recomendado)
O Cloud Run é ideal porque é totalmente gerenciado, possui escalonamento automático a partir de zero (gratuito se não houver acessos) e alta velocidade em Moçambique através da rede global do Google.
*   **Custo**: Grátis para baixos volumes de acesso.
*   **Requisito**: Uma conta no Google Cloud e a CLI `gcloud`.

### Opção B: **Railway.app** ou **Render.com** (Mais Simples)
Essas plataformas leem o repositório do seu GitHub e fazem o deploy automático de forma extremamente simples com base no nosso `Dockerfile`.
*   **Custo**: Planos hobby extremamente acessíveis.

### Opção C: **Servidor VPS Próprio** (DigitalOcean, Linode, AWS EC2, etc.)
Instale o Docker na sua máquina virtual e execute a imagem compilada.

---

## 2. Configurando o Firebase em Produção

Seu sistema usa o **Firebase Firestore** para armazenar dados e o **Firebase Auth** para autenticação segura dos clientes. Siga estes passos para preparar o seu próprio banco de dados de produção:

1.  Aceda ao [Consola do Firebase](https://console.firebase.google.com/).
2.  Crie um novo projeto chamado **PayrollTech Mz**.
3.  No menu esquerdo, aceda a **Firestore Database** e clique em **Criar base de dados** (Escolha a localização mais próxima da África, por exemplo, na Europa ou África do Sul se disponível).
4.  Crie a base de dados no **Modo de Produção** e aplique as regras contidas no arquivo `firestore.rules` que está na raiz deste projeto.
5.  Aceda a **Authentication** e ative o provedor de login com **E-mail/Senha**.
6.  Em **Configurações do Projeto** (ícone de engrenagem no topo), vá para a aba *Geral*, role até ao fundo e clique no ícone de código (`</>`) para registar um **Web App**.
7.  Copie as credenciais fornecidas (elas se parecem com o dicionário de chaves do Firebase).

---

## 3. Variáveis de Ambiente (.env)

Crie um arquivo chamado `.env` na raiz do seu servidor de produção e insira as suas chaves e configurações. Nunca exponha o arquivo `.env` publicamente ou em commits do Git:

```env
# Ambiente de Execução
NODE_ENV=production
PORT=3000

# Chave do Firebase Client (Cole as credenciais do seu Web App criado no passo 2)
VITE_FIREBASE_API_KEY=sua_chave_aqui
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
VITE_FIREBASE_APP_ID=seu_app_id

# Chave para Serviços de Inteligência Artificial (Caso use o Gemini)
GEMINI_API_KEY=sua_chave_secreta_gemini_aqui
```

---

## 4. Como Compilar e Rodar Localmente (Docker)

Se quiser testar o contêiner de produção antes de enviar para a nuvem, certifique-se de que tem o Docker instalado na sua máquina e execute no terminal:

```bash
# 1. Compilar a imagem do contêiner Docker
docker build -t payrolltech-mz .

# 2. Executar o contêiner mapeando a porta local 3000 para a porta do contêiner 3000
docker run -p 3000:3000 --env-file .env payrolltech-mz
```

O sistema estará acessível em `http://localhost:3000`.

---

## 5. Passos para Deploy em Produção

### Deploy via Google Cloud Run (Recomendado)
A partir da raiz do projeto, execute estes comandos na sua máquina (certificando-se de ter o `gcloud` instalado e autenticado):

```bash
# 1. Defina o ID do seu projeto no Google Cloud
gcloud config set project ID_DO_SEU_PROJETO

# 2. Compile e implante diretamente no Cloud Run (o comando lê o Dockerfile automaticamente)
gcloud run deploy payrolltech-app \
  --source . \
  --platform managed \
  --region us-east1 \
  --allow-unauthenticated \
  --port 3000
```

*Durante o deploy, o console solicitará a inserção das suas Variáveis de Ambiente. Introduza-as conforme especificado no ponto 3 deste guia.*

### Deploy via Railway ou Render
1.  Crie um repositório privado no seu **GitHub** e envie o código fonte do projeto para lá.
2.  Aceda ao painel da **Railway** ou **Render** e selecione "New Project" -> "GitHub Repository".
3.  Conecte o repositório correspondente.
4.  Nas configurações do painel da plataforma, adicione as chaves definidas na secção **Variáveis de Ambiente** deste documento.
5.  O painel lerá automaticamente o arquivo `Dockerfile` e gerará um link público seguro (HTTPS) pronto a usar!

---

## 6. Arquivos e Ativos Gerados para Descarregar
Para fazer o download de todo o seu sistema de forma integrada, utilize a opção do menu do seu editor **"Export as ZIP"** ou faça o download direto dos seguintes arquivos essenciais para backup:
*   `package.json` — Gerenciador de dependências e scripts de execução de produção.
*   `server.ts` — O backend Express unificado.
*   `src/components/LandingPage.tsx` — A Landing Page do seu produto.
*   `src/components/Dashboard.tsx` — O Painel de Controle de Automação com o Piloto Automático.
*   `Dockerfile` — O blueprint para colocar o sistema online.
