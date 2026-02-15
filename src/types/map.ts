export interface MapNode {
  id: string;
  url: string;
  title: string;
  favicon: string;
  domain: string;
  parentId: string | null;
  children: string[];
  tabId: number;
  windowId: number;
  timestamp: number;
  lastVisited: number;
  visitCount: number;
  depth: number;
  isActive: boolean;
  isClosed: boolean;
  isCollapsed: boolean;
  metadata: NodeMetadata;
  position: NodePosition;
}

export interface NodeMetadata {
  description?: string;
  ogImage?: string;
  wordCount?: number;
  note?: string;
}

export interface NodePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MapEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: EdgeType;
  timestamp: number;
}

export type EdgeType = 'click' | 'tab-open' | 'redirect' | 'search' | 'manual';

export interface MapViewport {
  x: number;
  y: number;
  zoom: number;
  width: number;
  height: number;
}

export interface MapSession {
  id: string;
  name: string;
  nodes: Record<string, MapNode>;
  edges: MapEdge[];
  rootNodes: string[];
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
  stats: SessionStats;
}

export interface SessionStats {
  totalNodes: number;
  totalEdges: number;
  maxDepth: number;
  totalBranches: number;
  domains: string[];
  duration: number;
}