// src/types/session.ts
export interface BrowsingSession {
  id: string;
  name: string;
  startedAt: number;
  endedAt: number | null;
  isActive: boolean;
  nodeCount: number;
  maxDepth: number;
  domains: string[];
  thumbnail?: string;
}

export interface SessionFilter {
  search: string;
  dateRange: [number, number] | null;
  domains: string[];
  minDepth: number;
  sortBy: 'date' | 'name' | 'nodes' | 'depth';
  sortOrder: 'asc' | 'desc';
}