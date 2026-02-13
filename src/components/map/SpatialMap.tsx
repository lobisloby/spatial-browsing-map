import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { useMapStore } from '@/hooks/useMapStore';
import { MapNodeComponent } from './MapNode';
import { MapEdgeComponent } from './MapEdge';
import { MapControls } from './MapControls';
import { MiniMap } from './MiniMap';
import { EmptyState } from '../shared/EmptyState';
import { GitBranch, MousePointer2 } from 'lucide-react';
import { Button } from '../ui/Button';
import '@/styles/map.css';

export const SpatialMap: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  const {
    nodes, edges, viewport, selectedNodeId, hoveredNodeId,
    filteredNodeIds, selectNode, setViewport, fitToView, addNode,
  } = useMapStore();
  const positions = useMapStore((s) => s.getNodePositions());

  const nodeList = useMemo(() => Object.values(nodes), [nodes]);
  const hasNodes = nodeList.length > 0;

  // Track container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setViewport({ width: rect.width, height: rect.height });
    };

    updateSize();
    const obs = new ResizeObserver(() => updateSize());
    obs.observe(el);
    return () => obs.disconnect();
  }, [setViewport]);

  // Auto fit on first data
  const fitted = useRef(false);
  useEffect(() => {
    if (hasNodes && !fitted.current && viewport.width > 0) {
      setTimeout(() => {
        fitToView();
        fitted.current = true;
      }, 200);
    }
  }, [hasNodes, fitToView, viewport.width]);

  // Reset fit flag when session changes
  useEffect(() => {
    if (!hasNodes) fitted.current = false;
  }, [hasNodes]);

  // Wheel zoom — must use native event for passive: false
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const state = useMapStore.getState();
      const { viewport: vp } = state;

      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Zoom factor
      const delta = e.deltaY > 0 ? 0.92 : 1.08;
      const newZoom = Math.max(0.1, Math.min(4, vp.zoom * delta));

      // Zoom toward cursor position
      const scale = newZoom / vp.zoom;
      const newX = mouseX - (mouseX - vp.x) * scale;
      const newY = mouseY - (mouseY - vp.y) * scale;

      state.setViewport({ x: newX, y: newY, zoom: newZoom });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    // Don't start pan if clicking on a node
    const target = e.target as HTMLElement;
    if (target.closest('.map-node')) return;

    isPanning.current = true;
    hasMoved.current = false;
    panStart.current = {
      x: e.clientX - viewport.x,
      y: e.clientY - viewport.y,
    };
  }, [viewport.x, viewport.y]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    hasMoved.current = true;
    const newX = e.clientX - panStart.current.x;
    const newY = e.clientY - panStart.current.y;
    setViewport({ x: newX, y: newY });
  }, [setViewport]);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // Only deselect if we didn't pan and didn't click a node
    const target = e.target as HTMLElement;
    if (!hasMoved.current && !target.closest('.map-node')) {
      selectNode(null);
    }
  }, [selectNode]);

  // Demo data generator for testing
  const addDemoData = useCallback(() => {
    const root = addNode({
      url: 'https://en.wikipedia.org/wiki/Web_browser',
      title: 'Web Browser - Wikipedia',
      favicon: '',
      parentId: null,
      tabId: 1,
      windowId: 1,
    });

    const child1 = addNode({
      url: 'https://en.wikipedia.org/wiki/Chrome',
      title: 'Google Chrome - Wikipedia',
      favicon: '',
      parentId: root.id,
      tabId: 1,
      windowId: 1,
    });

    addNode({
      url: 'https://en.wikipedia.org/wiki/Firefox',
      title: 'Mozilla Firefox - Wikipedia',
      favicon: '',
      parentId: root.id,
      tabId: 2,
      windowId: 1,
    });

    addNode({
      url: 'https://en.wikipedia.org/wiki/V8_(JavaScript_engine)',
      title: 'V8 JavaScript Engine - Wikipedia',
      favicon: '',
      parentId: child1.id,
      tabId: 1,
      windowId: 1,
    });

    addNode({
      url: 'https://developer.chrome.com/docs/extensions',
      title: 'Chrome Extensions Documentation',
      favicon: '',
      parentId: child1.id,
      tabId: 1,
      windowId: 1,
    });

    const child2 = addNode({
      url: 'https://en.wikipedia.org/wiki/Safari_(web_browser)',
      title: 'Safari - Wikipedia',
      favicon: '',
      parentId: root.id,
      tabId: 3,
      windowId: 1,
    });

    addNode({
      url: 'https://webkit.org',
      title: 'WebKit - Open Source Web Browser Engine',
      favicon: '',
      parentId: child2.id,
      tabId: 3,
      windowId: 1,
    });

    addNode({
      url: 'https://developer.apple.com/safari/',
      title: 'Safari Developer Tools - Apple',
      favicon: '',
      parentId: child2.id,
      tabId: 3,
      windowId: 1,
    });

    setTimeout(fitToView, 100);
  }, [addNode, fitToView]);

  if (!hasNodes) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-surface-950">
        <EmptyState
          icon={<GitBranch className="w-6 h-6" />}
          title="No browsing data yet"
          description="Start browsing to see your exploration path, or load demo data to explore."
          action={
            <Button variant="primary" size="sm" onClick={addDemoData}>
              <MousePointer2 className="w-3.5 h-3.5" />
              Load Demo Data
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="map-canvas"
      style={{ cursor: isPanning.current ? 'grabbing' : 'grab' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
    >
      {/* Transform layer */}
      <div
        className="map-viewport"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        }}
      >
        {/* Edges SVG */}
        <svg
          className="absolute pointer-events-none"
          style={{
            overflow: 'visible',
            width: 1,
            height: 1,
            left: 0,
            top: 0,
          }}
        >
          <defs>
            <marker
              id="arrow"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="rgba(99,102,241,0.3)" />
            </marker>
            <marker
              id="arrow-active"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="rgba(99,102,241,0.7)" />
            </marker>
          </defs>

          {edges.map((edge) => {
            const sp = positions[edge.sourceId];
            const tp = positions[edge.targetId];
            if (!sp || !tp) return null;

            const isActive =
              edge.sourceId === selectedNodeId ||
              edge.targetId === selectedNodeId ||
              edge.sourceId === hoveredNodeId ||
              edge.targetId === hoveredNodeId;

            return (
              <MapEdgeComponent
                key={edge.id}
                edge={edge}
                sourcePos={sp}
                targetPos={tp}
                isActive={isActive}
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {nodeList.map((node) => {
          const pos = positions[node.id];
          if (!pos) return null;

          const isFiltered = filteredNodeIds
            ? filteredNodeIds.includes(node.id)
            : null;

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

      {/* Overlay Controls */}
      <MapControls />
      <MiniMap />
    </div>
  );
};