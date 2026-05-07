const SAVE_KEY = 'crucible_save_v1';

export const storage = {
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  save(state) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  },
  clear() {
    localStorage.removeItem(SAVE_KEY);
  }
};
