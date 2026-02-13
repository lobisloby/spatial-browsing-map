import { create } from 'zustand';
import { storage, DEFAULT_SETTINGS, type AppSettings } from '@/lib/storage';

interface SettingsState {
  settings: AppSettings;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: true,

  loadSettings: async () => {
    set({ isLoading: true });
    const s = await storage.getSettings();
    set({ settings: s, isLoading: false });

    if (
      s.theme === 'dark' ||
      (s.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    ) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  updateSettings: async (updates) => {
    const next = { ...get().settings, ...updates };
    set({ settings: next });
    await storage.saveSettings(next);

    if (updates.theme) {
      if (
        updates.theme === 'dark' ||
        (updates.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      ) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  },

  resetSettings: async () => {
    set({ settings: DEFAULT_SETTINGS });
    await storage.saveSettings(DEFAULT_SETTINGS);
  },
}));