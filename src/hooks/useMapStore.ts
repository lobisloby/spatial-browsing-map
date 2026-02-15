import { create } from 'zustand';
import type {
  MapNode, MapEdge, MapSession, MapViewport,
  SessionStats, NodePosition, EdgeType,
} from '@/types/map';
import { generateId, extractDomain } from '@/lib/utils';
import { calculateTreeLayout } from '@/lib/tree-layout';
import { storage } from '@/lib/storage';

interface AddNodeParams {
  url: string;
  title: string;
  favicon: string;
  parentId: string | null;
  tabId: number;
  windowId: number;
  edgeType?: EdgeType;
}

interface MapState {
  session: MapSession | null;
  nodes: Record<string, MapNode>;
  edges: MapEdge[];
  rootNodes: string[];
  viewport: MapViewport;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  isRecording: boolean;
  isLoading: boolean;
  searchQuery: string;
  filteredNodeIds: string[] | null;

  initSession: () => Promise<void>;
  syncFromStorage: (session: MapSession) => void;
  addNode: (params: AddNodeParams) => MapNode;
  updateNode: (nodeId: string, updates: Partial<MapNode>) => void;
  removeNode: (nodeId: string) => void;
  toggleCollapse: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  hoverNode: (nodeId: string | null) => void;
  setViewport: (v: Partial<MapViewport>) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitToView: () => void;
  centerOnNode: (nodeId: string) => void;
  setRecording: (r: boolean) => void;
  setSearchQuery: (q: string) => void;
  saveSession: () => Promise<void>;
  loadSession: (id: string) => Promise<void>;
  newSession: (name?: string) => Promise<void>;
  renameSession: (name: string) => void;
  deleteCurrentSession: () => Promise<void>;
  deleteSessionById: (id: string) => Promise<void>;
  clearSession: () => void;
  getNodePositions: () => Record<string, NodePosition>;
  getStats: () => SessionStats;
}

export const useMapStore = create<MapState>((set, get) => ({
  session: null,
  nodes: {},
  edges: [],
  rootNodes: [],
  viewport: { x: 0, y: 0, zoom: 1, width: 0, height: 0 },
  selectedNodeId: null,
  hoveredNodeId: null,
  isRecording: true,
  isLoading: true,
  searchQuery: '',
  filteredNodeIds: null,

  initSession: async () => {
    set({ isLoading: true });
    try {
      const active = await storage.getActiveSession();
      if (active) {
        set({
          session: active,
          nodes: active.nodes || {},
          edges: active.edges || [],
          rootNodes: active.rootNodes || [],
          isLoading: false,
        });
      } else {
        await get().newSession('Session 1');
      }
    } catch {
      await get().newSession('Session 1');
    }
  },

    syncFromStorage: (session: MapSession) => {
    const state = get();
    if (state.session && state.session.id !== session.id) return;

    const oldCount = Object.keys(state.nodes).length;
    const newCount = Object.keys(session.nodes || {}).length;
    const isFirstData = oldCount === 0 && newCount > 0;

    // Find active node
    const activeNode = Object.values(session.nodes || {}).find(n => n.isActive);
    const prevActiveNode = Object.values(state.nodes).find(n => n.isActive);
    const activeChanged = activeNode?.id !== prevActiveNode?.id;

    set({
      session,
      nodes: session.nodes || {},
      edges: session.edges || [],
      rootNodes: session.rootNodes || [],
    });

    if (isFirstData) {
      setTimeout(() => get().fitToView(), 300);
    } else if (activeChanged && activeNode) {
      // Smoothly center on the newly active node
      // Only if it's off-screen
      const positions = get().getNodePositions();
      const pos = positions[activeNode.id];
      const vp = get().viewport;

      if (pos && vp.width > 0) {
        // Check if node is visible in current viewport
        const nodeScreenX = pos.x * vp.zoom + vp.x;
        const nodeScreenY = pos.y * vp.zoom + vp.y;
        const margin = 100;

        const isVisible =
          nodeScreenX > margin &&
          nodeScreenX < vp.width - margin &&
          nodeScreenY > margin &&
          nodeScreenY < vp.height - margin;

        if (!isVisible) {
          // Smooth center on the active node
          setTimeout(() => get().centerOnNode(activeNode.id), 50);
        }
      }
    }
  },

  // For demo/manual additions only — real nodes come from background via storage sync
  addNode: (params) => {
    const state = get();
    const domain = extractDomain(params.url);
    const now = Date.now();
    const nodeId = generateId();
    const parentNode = params.parentId ? state.nodes[params.parentId] : null;
    const depth = parentNode ? parentNode.depth + 1 : 0;

    const newNode: MapNode = {
      id: nodeId,
      url: params.url,
      title: params.title || domain,
      favicon: params.favicon || '',
      domain,
      parentId: params.parentId,
      children: [],
      tabId: params.tabId,
      windowId: params.windowId,
      timestamp: now,
      lastVisited: now,
      visitCount: 1,
      depth,
      isActive: true,
      isClosed: false,
      isCollapsed: false,
      metadata: {},
      position: { x: 0, y: 0, width: 220, height: 56 },
    };

    const newNodes = { ...state.nodes };
    newNodes[nodeId] = newNode;

    let newRootNodes = [...state.rootNodes];
    if (params.parentId && newNodes[params.parentId]) {
      newNodes[params.parentId] = {
        ...newNodes[params.parentId],
        children: [...newNodes[params.parentId].children, nodeId],
      };
    } else {
      newRootNodes.push(nodeId);
    }

    const newEdges = params.parentId && newNodes[params.parentId]
      ? [...state.edges, {
          id: `${params.parentId}-${nodeId}`,
          sourceId: params.parentId,
          targetId: nodeId,
          type: (params.edgeType || 'tab-open') as EdgeType,
          timestamp: now,
        }]
      : [...state.edges];

    set({ nodes: newNodes, edges: newEdges, rootNodes: newRootNodes });
    setTimeout(() => get().saveSession(), 200);
    return newNode;
  },

  updateNode: (nodeId, updates) => {
    const { nodes } = get();
    if (!nodes[nodeId]) return;
    set({ nodes: { ...nodes, [nodeId]: { ...nodes[nodeId], ...updates } } });
  },

  removeNode: (nodeId) => {
    const { nodes, edges, rootNodes } = get();
    const toRemove = new Set<string>();
    const collect = (id: string) => { toRemove.add(id); nodes[id]?.children.forEach(collect); };
    collect(nodeId);

    const newNodes = { ...nodes };
    toRemove.forEach((id) => delete newNodes[id]);

    const removed = nodes[nodeId];
    if (removed?.parentId && newNodes[removed.parentId]) {
      newNodes[removed.parentId] = {
        ...newNodes[removed.parentId],
        children: newNodes[removed.parentId].children.filter((id) => id !== nodeId),
      };
    }

    set({
      nodes: newNodes,
      edges: edges.filter((e) => !toRemove.has(e.sourceId) && !toRemove.has(e.targetId)),
      rootNodes: rootNodes.filter((id) => !toRemove.has(id)),
      selectedNodeId: null,
    });
    get().saveSession();
  },

  toggleCollapse: (nodeId) => {
    const { nodes } = get();
    const node = nodes[nodeId];
    if (!node || node.children.length === 0) return;
    set({ nodes: { ...nodes, [nodeId]: { ...node, isCollapsed: !node.isCollapsed } } });
  },

  selectNode: (id) => set({ selectedNodeId: id }),
  hoverNode: (id) => set({ hoveredNodeId: id }),
  setViewport: (v) => set((s) => ({ viewport: { ...s.viewport, ...v } })),

  zoomIn: () => {
    const { viewport: vp } = get();
    const z = Math.min(vp.zoom * 1.25, 4);
    const cx = vp.width / 2, cy = vp.height / 2, s = z / vp.zoom;
    set({ viewport: { ...vp, zoom: z, x: cx - (cx - vp.x) * s, y: cy - (cy - vp.y) * s } });
  },

  zoomOut: () => {
    const { viewport: vp } = get();
    const z = Math.max(vp.zoom / 1.25, 0.1);
    const cx = vp.width / 2, cy = vp.height / 2, s = z / vp.zoom;
    set({ viewport: { ...vp, zoom: z, x: cx - (cx - vp.x) * s, y: cy - (cy - vp.y) * s } });
  },

  fitToView: () => {
    const { viewport: vp } = get();
    const positions = get().getNodePositions();
    const list = Object.values(positions);
    if (list.length === 0 || vp.width === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of list) {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + p.width); maxY = Math.max(maxY, p.y + p.height);
    }

    const pad = 80;
    const cw = maxX - minX + pad * 2, ch = maxY - minY + pad * 2;
    const zoom = Math.min(vp.width / cw, vp.height / ch, 1.5);
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    set({ viewport: { ...vp, x: vp.width / 2 - cx * zoom, y: vp.height / 2 - cy * zoom, zoom } });
  },

  centerOnNode: (nodeId) => {
    const { viewport: vp } = get();
    const pos = get().getNodePositions()[nodeId];
    if (!pos) return;
    set({ viewport: { ...vp, x: vp.width / 2 - (pos.x + pos.width / 2) * vp.zoom, y: vp.height / 2 - (pos.y + pos.height / 2) * vp.zoom } });
  },

  setRecording: (r) => {
    set({ isRecording: r });
    chrome.runtime.sendMessage({ type: 'TOGGLE_RECORDING' }).catch(() => {});
  },

  setSearchQuery: (q) => {
    const { nodes } = get();
    if (!q.trim()) { set({ searchQuery: q, filteredNodeIds: null }); return; }
    const lower = q.toLowerCase();
    set({
      searchQuery: q,
      filteredNodeIds: Object.values(nodes)
        .filter((n) => n.title.toLowerCase().includes(lower) || n.url.toLowerCase().includes(lower) || n.domain.toLowerCase().includes(lower))
        .map((n) => n.id),
    });
  },

  saveSession: async () => {
    const { session, nodes, edges, rootNodes } = get();
    if (!session) return;
    const updated: MapSession = { ...session, nodes, edges, rootNodes, updatedAt: Date.now(), stats: get().getStats() };
    set({ session: updated });
    await storage.setActiveSession(updated);
  },

  loadSession: async (id) => {
    set({ isLoading: true });
    const sessions = await storage.getSessions();
    const session = sessions.find((s) => s.id === id);
    if (session) {
      set({ session, nodes: session.nodes || {}, edges: session.edges || [], rootNodes: session.rootNodes || [], selectedNodeId: null, isLoading: false });
      await storage.setActiveSession(session);
      setTimeout(() => get().fitToView(), 200);
    } else set({ isLoading: false });
  },

  newSession: async (name = 'New Session') => {
    const { session } = get();
    if (session && Object.keys(get().nodes).length > 0) await get().saveSession();
    const s: MapSession = {
      id: generateId(), name, nodes: {}, edges: [], rootNodes: [],
      createdAt: Date.now(), updatedAt: Date.now(), isActive: true,
      stats: { totalNodes: 0, totalEdges: 0, maxDepth: 0, totalBranches: 0, domains: [], duration: 0 },
    };
    set({ session: s, nodes: {}, edges: [], rootNodes: [], selectedNodeId: null, isLoading: false });
    await storage.setActiveSession(s);
  },

  renameSession: (name) => {
    const { session } = get();
    if (!session) return;
    const u = { ...session, name, updatedAt: Date.now() };
    set({ session: u });
    storage.setActiveSession(u);
  },

  deleteCurrentSession: async () => {
    const { session } = get();
    if (session) await storage.deleteSession(session.id);
    await storage.clearActiveSession();
    const remaining = await storage.getSessions();
    if (remaining.length > 0) {
      await get().loadSession(remaining[0].id);
    } else {
      await get().newSession('New Session');
    }
  },

  deleteSessionById: async (id) => {
    const { session } = get();
    await storage.deleteSession(id);
    if (session?.id === id) {
      await storage.clearActiveSession();
      const remaining = await storage.getSessions();
      if (remaining.length > 0) await get().loadSession(remaining[0].id);
      else await get().newSession('New Session');
    }
  },

  clearSession: () => {
    set({ nodes: {}, edges: [], rootNodes: [], selectedNodeId: null, hoveredNodeId: null });
    get().saveSession();
  },

  getNodePositions: () => calculateTreeLayout(get().nodes, get().rootNodes),

  getStats: (): SessionStats => {
    const { nodes, edges } = get();
    const list = Object.values(nodes);
    if (list.length === 0) return { totalNodes: 0, totalEdges: 0, maxDepth: 0, totalBranches: 0, domains: [], duration: 0 };
    const ts = list.map((n) => n.timestamp);
    return {
      totalNodes: list.length, totalEdges: edges.length,
      maxDepth: Math.max(...list.map((n) => n.depth)),
      totalBranches: list.filter((n) => n.children.length > 1).length,
      domains: [...new Set(list.map((n) => n.domain).filter(Boolean))],
      duration: Math.max(...ts) - Math.min(...ts),
    };
  },
}));