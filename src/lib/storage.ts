import type { MapSession } from '../types/map';

const KEYS = {
  SESSIONS: 'sbm_sessions',
  ACTIVE: 'sbm_active_session',
  SETTINGS: 'sbm_settings',
} as const;

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  autoRecord: boolean;
  showFavicons: boolean;
  showLabels: boolean;
  layoutDirection: 'vertical' | 'horizontal';
  animationsEnabled: boolean;
  showMinimap: boolean;
  excludedDomains: string[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  autoRecord: true,
  showFavicons: true,
  showLabels: true,
  layoutDirection: 'vertical',
  animationsEnabled: true,
  showMinimap: true,
  excludedDomains: [],
};

class StorageService {
  private get<T>(key: string): Promise<T | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (r) => resolve((r[key] as T) ?? null));
    });
  }
  private set<T>(key: string, value: T): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  }
  private remove(key: string): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, resolve);
    });
  }

  async getSessions(): Promise<MapSession[]> {
    return (await this.get<MapSession[]>(KEYS.SESSIONS)) ?? [];
  }

  async saveSession(session: MapSession): Promise<void> {
    const list = await this.getSessions();
    const idx = list.findIndex((s) => s.id === session.id);
    if (idx >= 0) list[idx] = session;
    else list.unshift(session);
    await this.set(KEYS.SESSIONS, list);
  }

  async deleteSession(id: string): Promise<void> {
    // Remove from list
    const list = await this.getSessions();
    const filtered = list.filter((s) => s.id !== id);
    await this.set(KEYS.SESSIONS, filtered);

    // If active session, clear it
    const active = await this.getActiveSession();
    if (active?.id === id) {
      await this.remove(KEYS.ACTIVE);
    }
  }

  async getActiveSession(): Promise<MapSession | null> {
    return this.get<MapSession>(KEYS.ACTIVE);
  }

  async setActiveSession(session: MapSession): Promise<void> {
    await this.set(KEYS.ACTIVE, session);
    await this.saveSession(session);
  }

  async clearActiveSession(): Promise<void> {
    await this.remove(KEYS.ACTIVE);
  }

  async getSettings(): Promise<AppSettings> {
    return (await this.get<AppSettings>(KEYS.SETTINGS)) ?? DEFAULT_SETTINGS;
  }

  async saveSettings(s: AppSettings): Promise<void> {
    await this.set(KEYS.SETTINGS, s);
  }

  async exportSession(id: string): Promise<string> {
    const list = await this.getSessions();
    const s = list.find((x) => x.id === id);
    if (!s) throw new Error('Not found');
    return JSON.stringify(s, null, 2);
  }
}

export const storage = new StorageService();