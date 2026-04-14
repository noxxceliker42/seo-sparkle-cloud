const PREFIX = "seo_os_v3_";

export const storage = {
  get: <T>(key: string, fallback: T): T => {
    try {
      const raw = sessionStorage.getItem(PREFIX + key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  set: <T>(key: string, value: T): void => {
    try {
      sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {}
  },

  remove: (key: string): void => {
    try {
      sessionStorage.removeItem(PREFIX + key);
    } catch {}
  },

  clear: (): void => {
    try {
      Object.keys(sessionStorage)
        .filter((k) => k.startsWith(PREFIX))
        .forEach((k) => sessionStorage.removeItem(k));
    } catch {}
  },
};
