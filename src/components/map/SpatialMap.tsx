import React, { useRef, useEffect, useMemo, useCallback } from 'react';
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
  const lastNodeCount = useRef(0);

  const nodes = useMapStore((s) => s.nodes);
  const edges = useMapStore((s) => s.edges);
  const viewport = useMapStore((s) => s.viewport);
  const selectedNodeId = useMapStore((s) => s.selectedNodeId);
  const hoveredNodeId = useMapStore((s) => s.hoveredNodeId);
  const filteredNodeIds = useMapStore((s) => s.filteredNodeIds);
  const selectNode = useMapStore((s) => s.selectNode);
  const setViewport = useMapStore((s) => s.setViewport);
  const fitToView = useMapStore((s) => s.fitToView);
  const addNode = useMapStore((s) => s.addNode);
  const positions = useMapStore((s) => s.getNodePositions());

  const nodeList = useMemo(() => Object.values(nodes), [nodes]);
  const hasNodes = nodeList.length > 0;

  // Track container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setViewport({ width: r.width, height: r.height });
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, [setViewport]);

  // Auto-fit when new nodes appear
  useEffect(() => {
    const count = nodeList.length;
    if (count > 0 && count !== lastNodeCount.current) {
      // Only full fit on first nodes or big jumps
      if (lastNodeCount.current === 0) {
        setTimeout(fitToView, 200);
      }
      lastNodeCount.current = count;
    }
  }, [nodeList.length, fitToView]);

  // Wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handle = (e: WheelEvent) => {
      e.preventDefault();
      const state = useMapStore.getState();
      const vp = state.viewport;
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      const newZoom = Math.max(0.1, Math.min(4, vp.zoom * factor));
      const scale = newZoom / vp.zoom;
      state.setViewport({
        x: mx - (mx - vp.x) * scale,
        y: my - (my - vp.y) * scale,
        zoom: newZoom,
      });
    };
    el.addEventListener('wheel', handle, { passive: false });
    return () => el.removeEventListener('wheel', handle);
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('.map-node')) return;
    isPanning.current = true;
    hasMoved.current = false;
    panStart.current = { x: e.clientX - viewport.x, y: e.clientY - viewport.y };
  }, [viewport.x, viewport.y]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    hasMoved.current = true;
    setViewport({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
  }, [setViewport]);

  const onMouseUp = useCallback(() => { isPanning.current = false; }, []);

  const onClick = useCallback((e: React.MouseEvent) => {
    if (!hasMoved.current && !(e.target as HTMLElement).closest('.map-node')) {
      selectNode(null);
    }
  }, [selectNode]);

  // Demo data
  const addDemoData = useCallback(() => {
    const root = addNode({ url: 'https://en.wikipedia.org/wiki/Web_browser', title: 'Web Browser - Wikipedia', favicon: '', parentId: null, tabId: 100, windowId: 1 });
    const chrome = addNode({ url: 'https://en.wikipedia.org/wiki/Google_Chrome', title: 'Google Chrome - Wikipedia', favicon: '', parentId: root.id, tabId: 100, windowId: 1 });
    const firefox = addNode({ url: 'https://en.wikipedia.org/wiki/Firefox', title: 'Mozilla Firefox - Wikipedia', favicon: '', parentId: root.id, tabId: 101, windowId: 1 });
    const safari = addNode({ url: 'https://en.wikipedia.org/wiki/Safari_(web_browser)', title: 'Safari - Wikipedia', favicon: '', parentId: root.id, tabId: 102, windowId: 1 });

    addNode({ url: 'https://en.wikipedia.org/wiki/V8_(JavaScript_engine)', title: 'V8 Engine - Wikipedia', favicon: '', parentId: chrome.id, tabId: 100, windowId: 1 });
    addNode({ url: 'https://developer.chrome.com/docs/extensions', title: 'Chrome Extensions Docs', favicon: '', parentId: chrome.id, tabId: 100, windowId: 1 });
    const chromium = addNode({ url: 'https://en.wikipedia.org/wiki/Chromium_(web_browser)', title: 'Chromium - Wikipedia', favicon: '', parentId: chrome.id, tabId: 100, windowId: 1 });
    addNode({ url: 'https://en.wikipedia.org/wiki/Blink_(browser_engine)', title: 'Blink Engine - Wikipedia', favicon: '', parentId: chromium.id, tabId: 100, windowId: 1 });

    addNode({ url: 'https://en.wikipedia.org/wiki/Gecko_(software)', title: 'Gecko Engine - Wikipedia', favicon: '', parentId: firefox.id, tabId: 101, windowId: 1 });
    addNode({ url: 'https://developer.mozilla.org', title: 'MDN Web Docs', favicon: '', parentId: firefox.id, tabId: 101, windowId: 1 });

    addNode({ url: 'https://webkit.org', title: 'WebKit Engine', favicon: '', parentId: safari.id, tabId: 102, windowId: 1 });
    addNode({ url: 'https://developer.apple.com/safari/', title: 'Safari Developer - Apple', favicon: '', parentId: safari.id, tabId: 102, windowId: 1 });

    setTimeout(fitToView, 200);
  }, [addNode, fitToView]);

  if (!hasNodes) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-surface-950">
        <EmptyState
          icon={<GitBranch className="w-6 h-6" />}
          title="No browsing data yet"
          description="Start browsing in other tabs to see your exploration path, or load demo data."
          action={
            <Button variant="primary" size="sm" onClick={addDemoData}>
              <MousePointer2 className="w-3.5 h-3.5" /> Load Demo Data
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
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onClick={onClick}
    >
      <div
        className="map-viewport"
        style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}
      >
        <svg
          className="absolute pointer-events-none"
          style={{ overflow: 'visible', width: 1, height: 1 }}
        >
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="rgba(99,102,241,0.3)" />
            </marker>
            <marker id="arrow-active" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="rgba(99,102,241,0.7)" />
            </marker>
          </defs>
          {edges.map((edge) => {
            const sp = positions[edge.sourceId], tp = positions[edge.targetId];
            if (!sp || !tp) return null;
            const active = [edge.sourceId, edge.targetId].includes(selectedNodeId ?? '') ||
                          [edge.sourceId, edge.targetId].includes(hoveredNodeId ?? '');
            return <MapEdgeComponent key={edge.id} edge={edge} sourcePos={sp} targetPos={tp} isActive={active} />;
          })}
        </svg>

        {nodeList.map((node) => {
          const pos = positions[node.id];
          if (!pos) return null;
          return (
            <MapNodeComponent
              key={node.id}
              node={node}
              position={pos}
              isSelected={selectedNodeId === node.id}
              isHovered={hoveredNodeId === node.id}
              isFiltered={filteredNodeIds ? filteredNodeIds.includes(node.id) : null}
            />
          );
        })}
      </div>

      <MapControls />
      <MiniMap />
    </div>
  );
};