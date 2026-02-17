// src/lib/analytics.ts
import type { MapSession, MapNode } from '@/types/map';

export interface MapAnalytics {
  totalNodes: number;
  totalEdges: number;
  maxDepth: number;
  averageDepth: number;
  branchCount: number;
  uniqueDomains: number;
  topDomains: { domain: string; count: number }[];
  sessionDuration: number;
  deepestPath: string[];
  mostVisitedNode: MapNode | null;
}

export function analyzeSession(session: MapSession): MapAnalytics {
  const nodes = Object.values(session.nodes);
  const totalNodes = nodes.length;
  const totalEdges = session.edges.length;

  if (totalNodes === 0) {
    return {
      totalNodes: 0,
      totalEdges: 0,
      maxDepth: 0,
      averageDepth: 0,
      branchCount: 0,
      uniqueDomains: 0,
      topDomains: [],
      sessionDuration: 0,
      deepestPath: [],
      mostVisitedNode: null,
    };
  }

  const maxDepth = Math.max(...nodes.map((n) => n.depth));
  const averageDepth =
    nodes.reduce((sum, n) => sum + n.depth, 0) / totalNodes;

  const branchCount = nodes.filter((n) => n.children.length > 1).length;

  const domainCounts: Record<string, number> = {};
  for (const node of nodes) {
    domainCounts[node.domain] = (domainCounts[node.domain] || 0) + 1;
  }

  const topDomains = Object.entries(domainCounts)
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const timestamps = nodes.map((n) => n.timestamp);
  const sessionDuration = Math.max(...timestamps) - Math.min(...timestamps);

  const mostVisitedNode = nodes.reduce((most, node) =>
    node.visitCount > (most?.visitCount ?? 0) ? node : most,
    nodes[0],
  );

  // Find deepest path
  const deepestNode = nodes.reduce((deepest, node) =>
    node.depth > deepest.depth ? node : deepest,
    nodes[0],
  );

  const deepestPath: string[] = [];
  let current: MapNode | undefined = deepestNode;
  while (current) {
    deepestPath.unshift(current.id);
    current = current.parentId ? session.nodes[current.parentId] : undefined;
  }

  return {
    totalNodes,
    totalEdges,
    maxDepth,
    averageDepth: Math.round(averageDepth * 10) / 10,
    branchCount,
    uniqueDomains: Object.keys(domainCounts).length,
    topDomains,
    sessionDuration,
    deepestPath,
    mostVisitedNode,
  };
}