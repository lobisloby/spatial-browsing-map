import type { MapNode, NodePosition } from '../types/map';

/*
  TREE LAYOUT ENGINE
  
  Rules:
  1. Root node fixed at top center
  2. Y-axis = depth (vertical spacing consistent)
  3. X-axis = sibling separation (no overlap, no crossing lines)
  4. Parent centered above its children
  5. Collapsed branches reserve space (optional: can also collapse space)
  6. Layout is stable — adding nodes doesn't shift unrelated branches
  
  Algorithm: Modified Reingold-Tilford
  - First pass (bottom-up): calculate width of each subtree
  - Second pass (top-down): assign X positions, centering parents over children
*/

const NODE_WIDTH = 220;
const NODE_HEIGHT = 56;
const H_GAP = 28;      // Horizontal gap between sibling subtrees
const V_GAP = 80;       // Vertical gap between levels

interface SubtreeInfo {
  nodeId: string;
  width: number;        // Total width of this subtree
  children: SubtreeInfo[];
}

export function calculateTreeLayout(
  nodes: Record<string, MapNode>,
  rootIds: string[],
): Record<string, NodePosition> {
  const positions: Record<string, NodePosition> = {};

  if (rootIds.length === 0) return positions;

  // Filter to only existing roots
  const validRoots = rootIds.filter((id) => nodes[id]);
  if (validRoots.length === 0) return positions;

  // Phase 1: Calculate subtree widths (bottom-up)
  function measureSubtree(nodeId: string): SubtreeInfo {
    const node = nodes[nodeId];
    if (!node) return { nodeId, width: NODE_WIDTH, children: [] };

    const visibleChildren = node.isCollapsed
      ? []
      : node.children.filter((id) => nodes[id]);

    if (visibleChildren.length === 0) {
      return { nodeId, width: NODE_WIDTH, children: [] };
    }

    const childInfos = visibleChildren.map((id) => measureSubtree(id));

    // Total width = sum of all children widths + gaps between them
    let totalWidth = 0;
    for (let i = 0; i < childInfos.length; i++) {
      totalWidth += childInfos[i].width;
      if (i < childInfos.length - 1) {
        totalWidth += H_GAP;
      }
    }

    // Subtree width is at least as wide as the node itself
    totalWidth = Math.max(totalWidth, NODE_WIDTH);

    return { nodeId, width: totalWidth, children: childInfos };
  }

  // Phase 2: Assign positions (top-down)
  // centerX = the center X coordinate for this node
  function assignPositions(
    info: SubtreeInfo,
    centerX: number,
    depth: number,
  ): void {
    const x = centerX - NODE_WIDTH / 2;
    const y = depth * (NODE_HEIGHT + V_GAP);

    positions[info.nodeId] = {
      x,
      y,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    };

    if (info.children.length === 0) return;

    // Calculate total children width
    let totalChildrenWidth = 0;
    for (let i = 0; i < info.children.length; i++) {
      totalChildrenWidth += info.children[i].width;
      if (i < info.children.length - 1) {
        totalChildrenWidth += H_GAP;
      }
    }

    // Start position: center the children block under the parent
    let childX = centerX - totalChildrenWidth / 2;

    for (const child of info.children) {
      // Each child is centered within its allocated width
      const childCenterX = childX + child.width / 2;
      assignPositions(child, childCenterX, depth + 1);
      childX += child.width + H_GAP;
    }
  }

  // Process each root tree
  const rootInfos = validRoots.map((id) => measureSubtree(id));

  // Calculate total width of all root trees
  let totalRootsWidth = 0;
  for (let i = 0; i < rootInfos.length; i++) {
    totalRootsWidth += rootInfos[i].width;
    if (i < rootInfos.length - 1) {
      totalRootsWidth += H_GAP * 3; // Extra gap between separate trees
    }
  }

  // Position all root trees side by side, centered at x=0
  let currentX = -totalRootsWidth / 2;

  for (const rootInfo of rootInfos) {
    const centerX = currentX + rootInfo.width / 2;
    assignPositions(rootInfo, centerX, 0);
    currentX += rootInfo.width + H_GAP * 3;
  }

  return positions;
}

// Generate SVG path for edge (smooth bezier curve from bottom-center of parent to top-center of child)
export function getEdgePath(
  source: NodePosition,
  target: NodePosition,
): string {
  const sx = source.x + source.width / 2;
  const sy = source.y + source.height;
  const tx = target.x + target.width / 2;
  const ty = target.y;

  // Vertical distance
  const dy = ty - sy;

  // Control point offset (how curvy the line is)
  const cp = Math.min(dy * 0.4, 35);

  return `M ${sx} ${sy} C ${sx} ${sy + cp}, ${tx} ${ty - cp}, ${tx} ${ty}`;
}