import { createInitialSeedState } from './seed';
import { TosAppState } from './types';

const STORAGE_KEY = 'axiom_tos_state_v1';

export function validateAppState(raw: unknown): raw is TosAppState {
  if (!raw || typeof raw !== 'object') return false;
  const candidate = raw as Partial<TosAppState>;
  return (
    typeof candidate.version === 'number' &&
    Array.isArray(candidate.accounts) &&
    candidate.accounts.length > 0 &&
    Array.isArray(candidate.instruments) &&
    candidate.instruments.length > 0 &&
    Array.isArray(candidate.trades) &&
    Array.isArray(candidate.checklistItems) &&
    typeof candidate.checklistRecords === 'object' &&
    candidate.checklistRecords !== null &&
    Array.isArray(candidate.strategies)
  );
}

export function loadAppState(): TosAppState {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return createInitialSeedState();
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = createInitialSeedState();
      saveAppState(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw);
    if (validateAppState(parsed)) {
      return parsed;
    }
    const seeded = createInitialSeedState();
    saveAppState(seeded);
    return seeded;
  } catch {
    return createInitialSeedState();
  }
}

export function saveAppState(state: TosAppState): { ok: boolean; error?: string } {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ok: true };
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Storage quota warning: ${err.message}. Consider exporting a backup or removing large screenshots.`
          : 'Failed to persist state to localStorage.',
    };
  }
}

export function exportBackupJson(state: TosAppState): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      application: 'Axiom TOS',
      payload: state,
    },
    null,
    2
  );
}

export function parseBackupJson(jsonText: string): { ok: true; state: TosAppState } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(jsonText);
    const candidate = parsed?.payload ?? parsed;
    if (!validateAppState(candidate)) {
      return {
        ok: false,
        error: 'Invalid Axiom TOS backup format. Missing required accounts, instruments, or trades arrays.',
      };
    }
    return { ok: true, state: candidate };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? `Invalid JSON file: ${err.message}` : 'Unable to parse JSON backup.',
    };
  }
}

/**
 * Compresses an uploaded image file to a clean JPEG/WebP DataURL (max 1280px wide)
 * so trade screenshots remain crisp while staying safe inside local-first storage.
 */
export async function compressImageFileToDataUrl(file: File, maxWidth = 1280, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => resolve(dataUrl); // Fallback to raw dataUrl if decode fails
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
