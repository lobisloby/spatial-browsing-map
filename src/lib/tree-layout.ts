import type { MapNode, NodePosition } from '../types/map';

interface LayoutConfig {
  nodeWidth: number;
  nodeHeight: number;
  horizontalGap: number;
  verticalGap: number;
}

const DEFAULTS: LayoutConfig = {
  nodeWidth: 200,
  nodeHeight: 60,
  horizontalGap: 40,
  verticalGap: 80,
};

export function calculateTreeLayout(
  nodes: Record<string, MapNode>,
  rootIds: string[],
  config?: Partial<LayoutConfig>,
): Record<string, NodePosition> {
  const cfg = { ...DEFAULTS, ...config };
  const positions: Record<string, NodePosition> = {};
  let offsetX = 0;

  for (const rootId of rootIds) {
    const width = layoutSubtree(rootId, nodes, cfg, positions, offsetX, 0);
    offsetX += width + cfg.horizontalGap * 2;
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

  const visibleChildren = node.isCollapsed
    ? []
    : node.children.filter((id) => nodes[id]);

  if (visibleChildren.length === 0) {
    positions[nodeId] = {
      x: startX,
      y: depth * (cfg.nodeHeight + cfg.verticalGap),
      width: cfg.nodeWidth,
      height: cfg.nodeHeight,
    };
    return cfg.nodeWidth;
  }

  let currentX = startX;
  let totalWidth = 0;

  for (let i = 0; i < visibleChildren.length; i++) {
    const childWidth = layoutSubtree(
      visibleChildren[i],
      nodes,
      cfg,
      positions,
      currentX,
      depth + 1,
    );
    if (i < visibleChildren.length - 1) {
      currentX += childWidth + cfg.horizontalGap;
      totalWidth += childWidth + cfg.horizontalGap;
    } else {
      totalWidth += childWidth;
    }
  }

  totalWidth = Math.max(totalWidth, cfg.nodeWidth);
  const centerX = startX + (totalWidth - cfg.nodeWidth) / 2;

  positions[nodeId] = {
    x: centerX,
    y: depth * (cfg.nodeHeight + cfg.verticalGap),
    width: cfg.nodeWidth,
    height: cfg.nodeHeight,
  };

  return totalWidth;
}

export function getEdgePath(
  source: NodePosition,
  target: NodePosition,
): string {
  const sx = source.x + source.width / 2;
  const sy = source.y + source.height;
  const tx = target.x + target.width / 2;
  const ty = target.y;
  const midY = (sy + ty) / 2;
  return `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;
}