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

export const MapEdgeComponent: React.FC<Props> = React.memo(({ edge, sourcePos, targetPos, isActive }) => {
  const d = useMemo(() => getEdgePath(sourcePos, targetPos), [sourcePos, targetPos]);
  return <path d={d} className={cn('map-edge', isActive && 'map-edge--active')} />;
});

MapEdgeComponent.displayName = 'MapEdge';