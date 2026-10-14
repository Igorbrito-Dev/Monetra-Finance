import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'monetra:hide-values';
const listeners = new Set<() => void>();

function readValue(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/**
 * Ocultar valores com um toque. O estado é compartilhado entre todas as telas e lembrado no navegador.
 */
export function usePrivacy() {
  const hideValues = useSyncExternalStore(subscribe, readValue, () => false);

  const setHideValues = useCallback((next: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      /* sem armazenamento: apenas notifica */
    }
    listeners.forEach((listener) => listener());
  }, []);

  const toggle = useCallback(() => setHideValues(!readValue()), [setHideValues]);

  return { hideValues, setHideValues, toggle };
}
