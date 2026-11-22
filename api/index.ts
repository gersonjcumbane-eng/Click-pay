import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from '../server';

let cachedAppPromise: Promise<any> | null = null;

function getApp() {
  if (!cachedAppPromise) {
    cachedAppPromise = createApp({ skipStatic: true })
      .then(({ app }) => app)
      .catch((err) => {
        cachedAppPromise = null;
        throw err;
      });
  }
  return cachedAppPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Boot Error]:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        erro: 'Falha ao inicializar o servidor de autenticação ClickPay.',
        detail: err?.message || 'Server boot error'
      })
    );
  }
}
