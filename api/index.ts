import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from '../server';

let cachedAppPromise: Promise<any> | null = null;

function getApp() {
  if (!cachedAppPromise) {
    cachedAppPromise = createApp({ skipStatic: true }).then(({ app }) => app);
  }
  return cachedAppPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await getApp();
  return app(req, res);
}
