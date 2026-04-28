const PREFIX = "seo_os_v3_";

const isBrowser = (): boolean => typeof window !== "undefined" && typeof sessionStorage !== "undefined";

export const storage = {
  get: <T>(key: string, fallback: T): T => {
    if (!isBrowser()) return fallback;
    try {
      const raw = sessionStorage.getItem(PREFIX + key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  set: <T>(key: string, value: T): void => {
    if (!isBrowser()) return;
    try {
      sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {}
  },

  remove: (key: string): void => {
    if (!isBrowser()) return;
    try {
      sessionStorage.removeItem(PREFIX + key);
    } catch {}
  },

  clear: (): void => {
    if (!isBrowser()) return;
    try {
      Object.keys(sessionStorage)
        .filter((k) => k.startsWith(PREFIX))
        .forEach((k) => sessionStorage.removeItem(k));
    } catch {}
  },
};
