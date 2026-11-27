/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const logoPngCache = new Map<string, string>();
const MAX_FIRESTORE_LOGO_CHARS = 135000;

export function getCompanyInitials(name?: string): string {
  const clean = String(name || '')
    .replace(/\b(lda|limitada|sarl|sa|s\.a\.|e|de|da|do|das|dos)\b/gi, ' ')
    .replace(/[^a-zA-ZÀ-ÿ0-9\s]/g, ' ')
    .trim();
  if (!clean) return 'EM';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

export function isRenderableLogoUrl(url?: string | null): boolean {
  const val = String(url || '').trim();
  if (!val) return false;
  return (
    val.startsWith('data:image/') ||
    val.startsWith('/') ||
    val.startsWith('https://') ||
    val.startsWith('http://')
  );
}

function loadImageElement(src: string, useAnonymousCors = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (useAnonymousCors) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function drawResizedToCanvas(img: HTMLImageElement, maxDim: number, fillWhite = false): string {
  const natW = Math.max(1, img.naturalWidth || img.width || maxDim);
  const natH = Math.max(1, img.naturalHeight || img.height || maxDim);
  const scale = Math.min(1, maxDim / Math.max(natW, natH));
  const targetW = Math.max(1, Math.round(natW * scale));
  const targetH = Math.max(1, Math.round(natH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D não disponível neste navegador.');
  }
  if (fillWhite) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(img, 0, 0, targetW, targetH);
    return canvas.toDataURL('image/jpeg', 0.85);
  }
  ctx.clearRect(0, 0, targetW, targetH);
  ctx.drawImage(img, 0, 0, targetW, targetH);
  return canvas.toDataURL('image/png');
}

export async function normalizeLogoToPngDataUrl(input: File | string, maxDim = 280): Promise<string> {
  const rawSrc = typeof input === 'string' ? input.trim() : await fileToDataUrl(input);
  if (!rawSrc) return '';

  const isRemote = rawSrc.startsWith('http://') || rawSrc.startsWith('https://');
  const img = await loadImageElement(rawSrc, isRemote);

  const dims = [maxDim, 200, 140, 100];
  for (const dim of dims) {
    const pngUrl = drawResizedToCanvas(img, dim, false);
    if (pngUrl.length <= MAX_FIRESTORE_LOGO_CHARS) {
      return pngUrl;
    }
  }

  // Fallback para JPEG comprimido caso PNG detalhado exceda limite do Firestore
  for (const dim of [180, 120, 96]) {
    const jpgUrl = drawResizedToCanvas(img, dim, true);
    if (jpgUrl.length <= MAX_FIRESTORE_LOGO_CHARS) {
      return jpgUrl;
    }
  }

  return drawResizedToCanvas(img, 84, true);
}

export async function warmLogoCache(url?: string | null): Promise<string | null> {
  const clean = String(url || '').trim();
  if (!clean) return null;

  if (logoPngCache.has(clean)) {
    return logoPngCache.get(clean) || null;
  }

  if (/^data:image\/(png|jpeg|jpg);base64,/i.test(clean)) {
    logoPngCache.set(clean, clean);
    return clean;
  }

  if (typeof document === 'undefined') return null;

  try {
    const normalized = await normalizeLogoToPngDataUrl(clean, 280);
    if (normalized) {
      logoPngCache.set(clean, normalized);
      return normalized;
    }
  } catch {
    return null;
  }
  return null;
}

export function getCachedLogoDataUrl(url?: string | null): string | null {
  const clean = String(url || '').trim();
  if (!clean) return null;

  if (logoPngCache.has(clean)) {
    return logoPngCache.get(clean) || null;
  }

  if (/^data:image\/(png|jpeg|jpg);base64,/i.test(clean)) {
    logoPngCache.set(clean, clean);
    return clean;
  }

  if (typeof document !== 'undefined') {
    warmLogoCache(clean).catch(() => null);
  }
  return null;
}
