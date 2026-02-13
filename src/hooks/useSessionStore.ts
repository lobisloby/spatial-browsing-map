import { create } from 'zustand';
import { storage } from '@/lib/storage';

interface BrowsingSession {
  id: string;
  name: string;
  startedAt: number;
  endedAt: number | null;
  isActive: boolean;
  nodeCount: number;
  maxDepth: number;
  domains: string[];
}

interface SessionState {
  sessions: BrowsingSession[];
  isLoading: boolean;
  loadSessions: () => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  getFilteredSessions: () => BrowsingSession[];
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  isLoading: false,

  loadSessions: async () => {
    set({ isLoading: true });
    try {
      const mapSessions = await storage.getSessions();
      const sessions: BrowsingSession[] = mapSessions.map((s) => {
        const nodeCount = Object.keys(s.nodes || {}).length;
        const nodeList = Object.values(s.nodes || {});
        const maxDepth = nodeList.length > 0
          ? Math.max(...nodeList.map((n) => n.depth || 0))
          : 0;
        const domains = [...new Set(nodeList.map((n) => n.domain).filter(Boolean))];

        return {
          id: s.id,
          name: s.name,
          startedAt: s.createdAt,
          endedAt: s.isActive ? null : s.updatedAt,
          isActive: s.isActive,
          nodeCount,
          maxDepth,
          domains,
        };
      });
      set({ sessions, isLoading: false });
    } catch {
      set({ sessions: [], isLoading: false });
    }
  },

  deleteSession: async (id) => {
    await storage.deleteSession(id);
    // Reload immediately
    await get().loadSessions();
  },

  getFilteredSessions: () => {
    return [...get().sessions].sort((a, b) => b.startedAt - a.startedAt);
  },
}));