import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { MapEdge as MapEdgeType, NodePosition } from '@/types/map';
import { getEdgePath } from '@/lib/tree-layout';
import { useMapStore } from '@/hooks/useMapStore';

interface Props {
  edge: MapEdgeType;
  sourcePos: NodePosition;
  targetPos: NodePosition;
  isActive: boolean;
}

export const MapEdgeComponent: React.FC<Props> = React.memo(
  ({ edge, sourcePos, targetPos, isActive }) => {
    const nodes = useMapStore((s) => s.nodes);
    const d = useMemo(() => getEdgePath(sourcePos, targetPos), [sourcePos, targetPos]);

    // Check if either end is the currently active tab
    const sourceNode = nodes[edge.sourceId];
    const targetNode = nodes[edge.targetId];
    const isActiveEdge = (sourceNode?.isActive || targetNode?.isActive) && !sourceNode?.isClosed && !targetNode?.isClosed;
    const isClosedEdge = sourceNode?.isClosed || targetNode?.isClosed;

    return (
      <g>
        <path d={d} fill="none" stroke="transparent" strokeWidth={12} style={{ cursor: 'pointer' }} />
        <path
          d={d}
          className={cn(
            'transition-all duration-300',
            isActive ? 'map-edge--active' : 'map-edge',
          )}
          style={{
            stroke: isActiveEdge
              ? 'rgba(34, 197, 94, 0.35)'
              : isClosedEdge
                ? 'rgba(71, 85, 105, 0.12)'
                : undefined,
            strokeWidth: isActiveEdge ? 2 : isActive ? 2 : 1.5,
          }}
          markerEnd={isActive ? 'url(#arrow-active)' : 'url(#arrow)'}
        />
      </g>
    );
  },
);

MapEdgeComponent.displayName = 'MapEdge';