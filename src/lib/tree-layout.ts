import type { MapNode, NodePosition } from '../types/map';

interface LayoutConfig {
  nodeWidth: number;
  nodeHeight: number;
  horizontalGap: number;
  verticalGap: number;
}

const DEFAULTS: LayoutConfig = {
  nodeWidth: 220,
  nodeHeight: 56,
  horizontalGap: 32,
  verticalGap: 72,
};

export function calculateTreeLayout(
  nodes: Record<string, MapNode>,
  rootIds: string[],
  config?: Partial<LayoutConfig>,
): Record<string, NodePosition> {
  const cfg = { ...DEFAULTS, ...config };
  const positions: Record<string, NodePosition> = {};

  if (rootIds.length === 0) return positions;

  let globalOffsetX = 0;

  for (const rootId of rootIds) {
    if (!nodes[rootId]) continue;

    const subtreeWidth = layoutSubtree(
      rootId,
      nodes,
      cfg,
      positions,
      globalOffsetX,
      0,
    );

    globalOffsetX += subtreeWidth + cfg.horizontalGap * 3;
  }

  return positions;
}

function layoutSubtree(
  nodeId: string,
  nodes: Record<string, MapNode>,
  cfg: LayoutConfig,
  positions: Record<string, NodePosition>,
  startX: number,
  depth: number,
): number {
  const node = nodes[nodeId];
  if (!node) return 0;

  const y = depth * (cfg.nodeHeight + cfg.verticalGap);

  // Get visible children
  const childIds = node.isCollapsed
    ? []
    : node.children.filter((id) => nodes[id]);

  // Leaf node
  if (childIds.length === 0) {
    positions[nodeId] = {
      x: startX,
      y,
      width: cfg.nodeWidth,
      height: cfg.nodeHeight,
    };
    return cfg.nodeWidth;
  }

  // Layout children first
  let currentX = startX;
  const childWidths: number[] = [];

  for (let i = 0; i < childIds.length; i++) {
    const w = layoutSubtree(
      childIds[i],
      nodes,
      cfg,
      positions,
      currentX,
      depth + 1,
    );
    childWidths.push(w);

    if (i < childIds.length - 1) {
      currentX += w + cfg.horizontalGap;
    } else {
      currentX += w;
    }
  }

  // Total width of all children
  const totalChildrenWidth = currentX - startX;
  const subtreeWidth = Math.max(totalChildrenWidth, cfg.nodeWidth);

  // Center parent above children
  let parentX: number;

  if (childIds.length === 1) {
    // Single child — center parent above it
    const childPos = positions[childIds[0]];
    parentX = childPos
      ? childPos.x + childPos.width / 2 - cfg.nodeWidth / 2
      : startX;
  } else {
    // Multiple children — center between first and last
    const firstChild = positions[childIds[0]];
    const lastChild = positions[childIds[childIds.length - 1]];

    if (firstChild && lastChild) {
      const centerOfChildren =
        (firstChild.x + lastChild.x + lastChild.width) / 2;
      parentX = centerOfChildren - cfg.nodeWidth / 2;
    } else {
      parentX = startX + (subtreeWidth - cfg.nodeWidth) / 2;
    }
  }

  positions[nodeId] = {
    x: parentX,
    y,
    width: cfg.nodeWidth,
    height: cfg.nodeHeight,
  };

  return subtreeWidth;
}

export function getEdgePath(
  source: NodePosition,
  target: NodePosition,
): string {
  const sx = source.x + source.width / 2;
  const sy = source.y + source.height;
  const tx = target.x + target.width / 2;
  const ty = target.y;

  // Smooth bezier curve
  const dy = ty - sy;
  const controlOffset = Math.min(dy * 0.5, 40);

  return `M ${sx} ${sy} C ${sx} ${sy + controlOffset}, ${tx} ${ty - controlOffset}, ${tx} ${ty}`;
}