import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

process.env.CLICKPAY_NO_LISTEN = '1';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

let cachedAppPromise = null;

function resolveServerCreateApp() {
  const candidates = [
    path.resolve(__dirname, '_server.cjs'),
    path.join(process.cwd(), 'api', '_server.cjs'),
    path.join(process.cwd(), 'dist', 'server.cjs'),
    path.resolve(__dirname, '..', 'dist', 'server.cjs')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return require(candidate).createApp;
    }
  }

  // Fallback estático para garantir o rastreamento do bundle pelo Vercel @vercel/nft
  return require('./_server.cjs').createApp;
}

function getApp() {
  if (!cachedAppPromise) {
    try {
      const createApp = resolveServerCreateApp();
      cachedAppPromise = createApp({ skipStatic: true })
        .then(({ app }) => app)
        .catch((err) => {
          cachedAppPromise = null;
          throw err;
        });
    } catch (err) {
      cachedAppPromise = null;
      return Promise.reject(err);
    }
  }
  return cachedAppPromise;
}

export default async function handler(req, res) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (err) {
    console.error('[Vercel Serverless Boot Error]:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        erro: 'Falha ao inicializar o servidor de autenticação ClickPay.',
        detail: err && err.message ? err.message : 'Server boot error'
      })
    );
  }
}
