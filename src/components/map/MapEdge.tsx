import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { MapEdge as MapEdgeType, NodePosition } from '@/types/map';
import { getEdgePath } from '@/lib/tree-layout';

interface Props {
  edge: MapEdgeType;
  sourcePos: NodePosition;
  targetPos: NodePosition;
  isActive: boolean;
}

export const MapEdgeComponent: React.FC<Props> = React.memo(
  ({ edge, sourcePos, targetPos, isActive }) => {
    const d = useMemo(
      () => getEdgePath(sourcePos, targetPos),
      [sourcePos, targetPos],
    );

    return (
      <g>
        {/* Wider invisible hit area for hovering */}
        <path
          d={d}
          fill="none"
          stroke="transparent"
          strokeWidth={12}
          style={{ cursor: 'pointer' }}
        />
        {/* Visible edge */}
        <path
          d={d}
          className={cn('map-edge', isActive && 'map-edge--active')}
          markerEnd={isActive ? 'url(#arrow-active)' : 'url(#arrow)'}
          style={{
            transition: 'stroke 0.2s, stroke-width 0.2s',
          }}
        />
      </g>
    );
  },
);

MapEdgeComponent.displayName = 'MapEdge';