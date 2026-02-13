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

    // Only skip exact duplicate if same URL, same tab, same parent
    // (prevents double-firing from webNavigation events)
    const isDuplicate = Object.values(state.nodes).some(
      (n) =>
        n.url === params.url &&
        n.tabId === params.tabId &&
        n.parentId === params.parentId &&
        Date.now() - n.timestamp < 1000, // Within 1 second = duplicate event
    );

    if (isDuplicate) {
      // Find the existing node and return it
      const existing = Object.values(state.nodes).find(
        (n) => n.url === params.url && n.tabId === params.tabId,
      )!;
      return existing;
    }

    // Check if revisiting same URL on same tab (increment visit count)
    const revisit = Object.values(state.nodes).find(
      (n) =>
        n.url === params.url &&
        n.tabId === params.tabId &&
        n.parentId === params.parentId,
    );

    if (revisit) {
      const updated = {
        ...revisit,
        visitCount: revisit.visitCount + 1,
        lastVisited: Date.now(),
        isActive: true,
        title: params.title || revisit.title,
        favicon: params.favicon || revisit.favicon,
      };

      const newNodes = { ...state.nodes };
      // Deactivate other nodes on same tab
      for (const [id, node] of Object.entries(newNodes)) {
        if (node.tabId === params.tabId) {
          newNodes[id] = { ...node, isActive: false };
        }
      }
      newNodes[revisit.id] = updated;

      set({ nodes: newNodes });
      return updated;
    }

    // ===== Create new node =====
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
      position: { x: 0, y: 0, width: 220, height: 56 },
    };

    const newNodes = { ...state.nodes };

    // Deactivate other nodes on same tab
    for (const [id, node] of Object.entries(newNodes)) {
      if (node.tabId === params.tabId) {
        newNodes[id] = { ...node, isActive: false };
      }
    }

    // Add the new node
    newNodes[nodeId] = newNode;

    // Update parent's children array
    let newRootNodes = state.rootNodes;
    if (params.parentId && newNodes[params.parentId]) {
      newNodes[params.parentId] = {
        ...newNodes[params.parentId],
        children: [...newNodes[params.parentId].children, nodeId],
      };
    } else if (!params.parentId) {
      // No parent = root node
      newRootNodes = [...state.rootNodes, nodeId];
    } else {
      // Parent ID provided but doesn't exist in our nodes
      // This happens when parent was from a previous session
      // Make it a root node instead
      newRootNodes = [...state.rootNodes, nodeId];
    }

    // Create edge
    const newEdges =
      params.parentId && newNodes[params.parentId]
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

    set({ nodes: newNodes, edges: newEdges, rootNodes: newRootNodes });

    // Auto save
    setTimeout(() => get().saveSession(), 200);

    return newNode;
  },

  updateNode: (nodeId, updates) => {
    const { nodes } = get();
    if (!nodes[nodeId]) return;
    set({
      nodes: { ...nodes, [nodeId]: { ...nodes[nodeId], ...updates } },
    });
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
        children: newNodes[removed.parentId].children.filter(
          (id) => id !== nodeId,
        ),
      };
    }

    set({
      nodes: newNodes,
      edges: edges.filter(
        (e) => !toRemove.has(e.sourceId) && !toRemove.has(e.targetId),
      ),
      rootNodes: rootNodes.filter((id) => !toRemove.has(id)),
      selectedNodeId: null,
    });
    get().saveSession();
  },

  toggleCollapse: (nodeId) => {
    const { nodes } = get();
    const node = nodes[nodeId];
    if (!node || node.children.length === 0) return;
    set({
      nodes: {
        ...nodes,
        [nodeId]: { ...node, isCollapsed: !node.isCollapsed },
      },
    });
  },

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
  hoverNode: (nodeId) => set({ hoveredNodeId: nodeId }),

  setViewport: (v) =>
    set((s) => ({ viewport: { ...s.viewport, ...v } })),

  zoomIn: () => {
    const { viewport } = get();
    const newZoom = Math.min(viewport.zoom * 1.25, 4);
    const centerX = viewport.width / 2;
    const centerY = viewport.height / 2;
    const scale = newZoom / viewport.zoom;
    set({
      viewport: {
        ...viewport,
        zoom: newZoom,
        x: centerX - (centerX - viewport.x) * scale,
        y: centerY - (centerY - viewport.y) * scale,
      },
    });
  },

  zoomOut: () => {
    const { viewport } = get();
    const newZoom = Math.max(viewport.zoom / 1.25, 0.1);
    const centerX = viewport.width / 2;
    const centerY = viewport.height / 2;
    const scale = newZoom / viewport.zoom;
    set({
      viewport: {
        ...viewport,
        zoom: newZoom,
        x: centerX - (centerX - viewport.x) * scale,
        y: centerY - (centerY - viewport.y) * scale,
      },
    });
  },

  fitToView: () => {
    const state = get();
    const { viewport } = state;
    const positions = state.getNodePositions();
    const list = Object.values(positions);

    if (list.length === 0 || viewport.width === 0 || viewport.height === 0) {
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const p of list) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + p.width);
      maxY = Math.max(maxY, p.y + p.height);
    }

    const padding = 60;
    const contentWidth = maxX - minX + padding * 2;
    const contentHeight = maxY - minY + padding * 2;

    const zoomX = viewport.width / contentWidth;
    const zoomY = viewport.height / contentHeight;
    const zoom = Math.min(zoomX, zoomY, 1.5);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const x = viewport.width / 2 - centerX * zoom;
    const y = viewport.height / 2 - centerY * zoom;

    set({ viewport: { ...viewport, x, y, zoom } });
  },

  centerOnNode: (nodeId) => {
    const { viewport } = get();
    const pos = get().getNodePositions()[nodeId];
    if (!pos) return;

    const centerX = pos.x + pos.width / 2;
    const centerY = pos.y + pos.height / 2;

    set({
      viewport: {
        ...viewport,
        x: viewport.width / 2 - centerX * viewport.zoom,
        y: viewport.height / 2 - centerY * viewport.zoom,
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
      stats: {
        totalNodes: 0,
        totalEdges: 0,
        maxDepth: 0,
        totalBranches: 0,
        domains: [],
        duration: 0,
      },
    };
    set({
      session: s,
      nodes: {},
      edges: [],
      rootNodes: [],
      selectedNodeId: null,
      isLoading: false,
    });
    await storage.setActiveSession(s);
  },

  clearSession: () => {
    set({
      nodes: {},
      edges: [],
      rootNodes: [],
      selectedNodeId: null,
      hoveredNodeId: null,
    });
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
      return {
        totalNodes: 0,
        totalEdges: 0,
        maxDepth: 0,
        totalBranches: 0,
        domains: [],
        duration: 0,
      };
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