import { create } from 'zustand';
import type {
  MapNode,
  MapEdge,
  MapSession,
  MapViewport,
  SessionStats,
  NodePosition,
  EdgeType,
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
  clearSession: () => void;
  getNodePositions: () => Record<string, NodePosition>;
  getStats: () => SessionStats;
}

export const useMapStore = create<MapState>((set, get) => ({
  session: null,
  nodes: {},
  edges: [],
  rootNodes: [],
  viewport: { x: 0, y: 0, zoom: 1, width: 800, height: 600 },
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
          nodes: active.nodes,
          edges: active.edges,
          rootNodes: active.rootNodes,
          isLoading: false,
        });
      } else {
        await get().newSession('New Session');
      }
    } catch {
      await get().newSession('New Session');
    }
  },

  addNode: (params) => {
    const state = get();
    const domain = extractDomain(params.url);

    // Check duplicate
    const existing = Object.values(state.nodes).find(
      (n) => n.url === params.url && n.tabId === params.tabId,
    );
    if (existing) {
      const updated = {
        ...existing,
        visitCount: existing.visitCount + 1,
        lastVisited: Date.now(),
        isActive: true,
        title: params.title || existing.title,
      };
      set({ nodes: { ...state.nodes, [existing.id]: updated } });
      return updated;
    }

    const nodeId = generateId();
    const parentNode = params.parentId ? state.nodes[params.parentId] : null;
    const depth = parentNode ? parentNode.depth + 1 : 0;

    const newNode: MapNode = {
      id: nodeId,
      url: params.url,
      title: params.title || params.url,
      favicon: params.favicon || '',
      domain,
      parentId: params.parentId,
      children: [],
      tabId: params.tabId,
      windowId: params.windowId,
      timestamp: Date.now(),
      lastVisited: Date.now(),
      visitCount: 1,
      depth,
      isActive: true,
      isCollapsed: false,
      metadata: {},
      position: { x: 0, y: 0, width: 200, height: 60 },
    };

    const newNodes = { ...state.nodes, [nodeId]: newNode };
    const newRootNodes = params.parentId
      ? state.rootNodes
      : [...state.rootNodes, nodeId];

    // Update parent children
    if (params.parentId && newNodes[params.parentId]) {
      newNodes[params.parentId] = {
        ...newNodes[params.parentId],
        children: [...newNodes[params.parentId].children, nodeId],
      };
    }

    // Create edge
    const newEdges = params.parentId
      ? [
          ...state.edges,
          {
            id: `${params.parentId}-${nodeId}`,
            sourceId: params.parentId,
            targetId: nodeId,
            type: (params.edgeType || 'click') as EdgeType,
            timestamp: Date.now(),
          },
        ]
      : state.edges;

    // Deactivate other nodes on same tab
    for (const [id, node] of Object.entries(newNodes)) {
      if (node.tabId === params.tabId && id !== nodeId) {
        newNodes[id] = { ...node, isActive: false };
      }
    }

    set({ nodes: newNodes, edges: newEdges, rootNodes: newRootNodes });
    get().saveSession();
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
    const collect = (id: string) => {
      toRemove.add(id);
      nodes[id]?.children.forEach(collect);
    };
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
    });
    get().saveSession();
  },

  toggleCollapse: (nodeId) => {
    const { nodes } = get();
    const node = nodes[nodeId];
    if (!node || node.children.length === 0) return;
    set({
      nodes: { ...nodes, [nodeId]: { ...node, isCollapsed: !node.isCollapsed } },
    });
  },

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
  hoverNode: (nodeId) => set({ hoveredNodeId: nodeId }),

  setViewport: (v) =>
    set((s) => ({ viewport: { ...s.viewport, ...v } })),

  zoomIn: () =>
    set((s) => ({
      viewport: { ...s.viewport, zoom: Math.min(s.viewport.zoom * 1.2, 3) },
    })),

  zoomOut: () =>
    set((s) => ({
      viewport: { ...s.viewport, zoom: Math.max(s.viewport.zoom / 1.2, 0.2) },
    })),

  fitToView: () => {
    const { viewport } = get();
    const positions = get().getNodePositions();
    const list = Object.values(positions);
    if (list.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of list) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + p.width);
      maxY = Math.max(maxY, p.y + p.height);
    }

    const pad = 80;
    const w = maxX - minX + pad * 2;
    const h = maxY - minY + pad * 2;
    const zoom = Math.min(viewport.width / w, viewport.height / h, 1.5);

    set({
      viewport: {
        ...viewport,
        x: -(minX - pad) * zoom + (viewport.width - w * zoom) / 2,
        y: -(minY - pad) * zoom + (viewport.height - h * zoom) / 2,
        zoom,
      },
    });
  },

  centerOnNode: (nodeId) => {
    const { viewport } = get();
    const pos = get().getNodePositions()[nodeId];
    if (!pos) return;
    set({
      viewport: {
        ...viewport,
        x: -pos.x * viewport.zoom + viewport.width / 2 - (pos.width * viewport.zoom) / 2,
        y: -pos.y * viewport.zoom + viewport.height / 2 - (pos.height * viewport.zoom) / 2,
      },
    });
  },

  setRecording: (r) => set({ isRecording: r }),

  setSearchQuery: (q) => {
    const { nodes } = get();
    if (!q.trim()) {
      set({ searchQuery: q, filteredNodeIds: null });
      return;
    }
    const lower = q.toLowerCase();
    const filtered = Object.values(nodes)
      .filter(
        (n) =>
          n.title.toLowerCase().includes(lower) ||
          n.url.toLowerCase().includes(lower) ||
          n.domain.toLowerCase().includes(lower),
      )
      .map((n) => n.id);
    set({ searchQuery: q, filteredNodeIds: filtered });
  },

  saveSession: async () => {
    const { session, nodes, edges, rootNodes } = get();
    if (!session) return;
    const updated: MapSession = {
      ...session,
      nodes,
      edges,
      rootNodes,
      updatedAt: Date.now(),
      stats: get().getStats(),
    };
    set({ session: updated });
    await storage.setActiveSession(updated);
  },

  loadSession: async (id) => {
    set({ isLoading: true });
    const sessions = await storage.getSessions();
    const session = sessions.find((s) => s.id === id);
    if (session) {
      set({
        session,
        nodes: session.nodes,
        edges: session.edges,
        rootNodes: session.rootNodes,
        selectedNodeId: null,
        isLoading: false,
      });
      await storage.setActiveSession(session);
    } else {
      set({ isLoading: false });
    }
  },

  newSession: async (name = 'New Session') => {
    const s: MapSession = {
      id: generateId(),
      name,
      nodes: {},
      edges: [],
      rootNodes: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isActive: true,
      stats: { totalNodes: 0, totalEdges: 0, maxDepth: 0, totalBranches: 0, domains: [], duration: 0 },
    };
    set({ session: s, nodes: {}, edges: [], rootNodes: [], selectedNodeId: null, isLoading: false });
    await storage.setActiveSession(s);
  },

  clearSession: () => {
    set({ nodes: {}, edges: [], rootNodes: [], selectedNodeId: null, hoveredNodeId: null });
    get().saveSession();
  },

  getNodePositions: () => {
    const { nodes, rootNodes } = get();
    return calculateTreeLayout(nodes, rootNodes);
  },

  getStats: (): SessionStats => {
    const { nodes, edges } = get();
    const list = Object.values(nodes);
    if (list.length === 0) {
      return { totalNodes: 0, totalEdges: 0, maxDepth: 0, totalBranches: 0, domains: [], duration: 0 };
    }
    const domains = [...new Set(list.map((n) => n.domain))];
    const maxDepth = Math.max(...list.map((n) => n.depth));
    const totalBranches = list.filter((n) => n.children.length > 1).length;
    const ts = list.map((n) => n.timestamp);
    return {
      totalNodes: list.length,
      totalEdges: edges.length,
      maxDepth,
      totalBranches,
      domains,
      duration: Math.max(...ts) - Math.min(...ts),
    };
  },
}));