import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { useMapStore } from '@/hooks/useMapStore';
import { MapNodeComponent } from './MapNode';
import { MapEdgeComponent } from './MapEdge';
import { MapControls } from './MapControls';
import { MiniMap } from './MiniMap';
import { EmptyState } from '../shared/EmptyState';
import { GitBranch } from 'lucide-react';
import '@/styles/map.css';

export const SpatialMap: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0 });

  const {
    nodes, edges, viewport, selectedNodeId, hoveredNodeId,
    filteredNodeIds, selectNode, setViewport, fitToView,
  } = useMapStore();
  const positions = useMapStore((s) => s.getNodePositions());

  const nodeList = useMemo(() => Object.values(nodes), [nodes]);
  const hasNodes = nodeList.length > 0;

  // Auto fit
  const fitted = useRef(false);
  useEffect(() => {
    if (hasNodes && !fitted.current) {
      setTimeout(fitToView, 100);
      fitted.current = true;
    }
  }, [hasNodes, fitToView]);

  // Track container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setViewport({ width: r.width, height: r.height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [setViewport]);

  // Pan handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragRef.current = { dragging: true, startX: e.clientX - viewport.x, startY: e.clientY - viewport.y };
  }, [viewport.x, viewport.y]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current.dragging) return;
    setViewport({ x: e.clientX - dragRef.current.startX, y: e.clientY - dragRef.current.startY });
  }, [setViewport]);

  const onMouseUp = useCallback(() => { dragRef.current.dragging = false; }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, viewport.zoom * factor));
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setViewport({
      x: mx - (mx - viewport.x) * (newZoom / viewport.zoom),
      y: my - (my - viewport.y) * (newZoom / viewport.zoom),
      zoom: newZoom,
    });
  }, [viewport, setViewport]);

  if (!hasNodes) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-surface-950">
        <EmptyState
          icon={<GitBranch className="w-6 h-6" />}
          title="No browsing data yet"
          description="Start browsing to see your exploration path visualized as an interactive map."
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="map-canvas"
      onClick={() => selectNode(null)}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
    >
      <div
        className="map-viewport"
        style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
          {edges.map((edge) => {
            const sp = positions[edge.sourceId];
            const tp = positions[edge.targetId];
            if (!sp || !tp) return null;
            const active = [edge.sourceId, edge.targetId].includes(selectedNodeId ?? '') ||
                          [edge.sourceId, edge.targetId].includes(hoveredNodeId ?? '');
            return <MapEdgeComponent key={edge.id} edge={edge} sourcePos={sp} targetPos={tp} isActive={active} />;
          })}
        </svg>

        {nodeList.map((node) => {
          const pos = positions[node.id];
          if (!pos) return null;
          const isFiltered = filteredNodeIds ? filteredNodeIds.includes(node.id) : null;
          return (
            <MapNodeComponent
              key={node.id}
              node={node}
              position={pos}
              isSelected={selectedNodeId === node.id}
              isHovered={hoveredNodeId === node.id}
              isFiltered={isFiltered}
            />
          );
        })}
      </div>

      <MapControls />
      <MiniMap />
    </div>
  );
};