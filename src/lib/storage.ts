import type { MapSession } from '../types/map';

const KEYS = {
  SESSIONS: 'sbm_sessions',
  ACTIVE_SESSION: 'sbm_active_session',
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
  excludedDomains: ['chrome://', 'chrome-extension://', 'about:'],
};

class StorageService {
  private async get<T>(key: string): Promise<T | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        resolve((result[key] as T) ?? null);
      });
    });
  }

  private async set<T>(key: string, value: T): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  }

  private async remove(key: string): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, resolve);
    });
  }

  // ===== Sessions =====
  async getSessions(): Promise<MapSession[]> {
    return (await this.get<MapSession[]>(KEYS.SESSIONS)) ?? [];
  }

  async saveSession(session: MapSession): Promise<void> {
    const sessions = await this.getSessions();
    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      sessions[idx] = session;
    } else {
      sessions.unshift(session);
    }
    await this.set(KEYS.SESSIONS, sessions);
  }

  async deleteSession(id: string): Promise<void> {
    // Remove from sessions list
    const sessions = await this.getSessions();
    const filtered = sessions.filter((s) => s.id !== id);
    await this.set(KEYS.SESSIONS, filtered);

    // If it's the active session, clear it
    const active = await this.getActiveSession();
    if (active && active.id === id) {
      await this.remove(KEYS.ACTIVE_SESSION);
    }
  }

  async getActiveSession(): Promise<MapSession | null> {
    return this.get<MapSession>(KEYS.ACTIVE_SESSION);
  }

  async setActiveSession(session: MapSession): Promise<void> {
    await this.set(KEYS.ACTIVE_SESSION, session);
    // Also update in sessions list
    await this.saveSession(session);
  }

  async clearActiveSession(): Promise<void> {
    await this.remove(KEYS.ACTIVE_SESSION);
  }

  // ===== Settings =====
  async getSettings(): Promise<AppSettings> {
    return (await this.get<AppSettings>(KEYS.SETTINGS)) ?? DEFAULT_SETTINGS;
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await this.set(KEYS.SETTINGS, settings);
  }

  // ===== Export =====
  async exportSession(sessionId: string): Promise<string> {
    const sessions = await this.getSessions();
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error('Session not found');
    return JSON.stringify(session, null, 2);
  }
}

export const storage = new StorageService();