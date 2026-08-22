# --- ESTÁGIO DE CONSTRUÇÃO (BUILD STAGE) ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar todas as dependências (incluindo devDependencies)
RUN npm ci

# Copiar o restante do código fonte
COPY . .

# Construir os ativos do frontend (Vite) e o servidor backend (esbuild)
RUN npm run build

# --- ESTÁGIO DE PRODUÇÃO (PRODUCTION RUNTIME) ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copiar arquivos de configuração de dependências
COPY package*.json ./

# Instalar apenas dependências de produção para manter a imagem leve
RUN npm ci --only=production

# Copiar os arquivos compilados do estágio anterior
COPY --from=builder /app/dist ./dist

# Expor a porta que o servidor Express escuta (padrão: 3000)
EXPOSE 3000

# Comando para iniciar o servidor de produção compilado em CommonJS
CMD ["npm", "run", "start"]
