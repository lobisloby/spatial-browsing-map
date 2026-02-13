import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { useMapStore } from '@/hooks/useMapStore';
import { MapNodeComponent } from './MapNode';
import { MapEdgeComponent } from './MapEdge';
import { MapControls } from './MapControls';
import { MiniMap } from './MiniMap';
import { EmptyState } from '../shared/EmptyState';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  GitBranch, MousePointer2, Plus, Trash2,
  TestTube, ChevronDown, X,
} from 'lucide-react';
import '@/styles/map.css';

export const SpatialMap: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  const lastNodeCount = useRef(0);
  const [showTestPanel, setShowTestPanel] = useState(false);

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
  const removeNode = useMapStore((s) => s.removeNode);
  const clearSession = useMapStore((s) => s.clearSession);
  const positions = useMapStore((s) => s.getNodePositions());

  const nodeList = useMemo(() => Object.values(nodes), [nodes]);
  const hasNodes = nodeList.length > 0;
  const selectedNode = selectedNodeId ? nodes[selectedNodeId] : null;

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

  // Auto-fit on first load
  useEffect(() => {
    const count = nodeList.length;
    if (count > 0 && lastNodeCount.current === 0) {
      setTimeout(fitToView, 200);
    }
    lastNodeCount.current = count;
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

  // Pan
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('.map-node') || (e.target as HTMLElement).closest('.test-panel')) return;
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
    if (!hasMoved.current && !(e.target as HTMLElement).closest('.map-node') && !(e.target as HTMLElement).closest('.test-panel')) {
      selectNode(null);
    }
  }, [selectNode]);

  // ===== Add child to selected node =====
  const addChildToSelected = useCallback(() => {
    const parentId = selectedNodeId;
    const parent = parentId ? nodes[parentId] : null;
    const childCount = parent ? parent.children.length + 1 : Object.keys(nodes).length + 1;
    const domains = ['github.com', 'stackoverflow.com', 'developer.mozilla.org', 'docs.google.com', 'medium.com', 'dev.to', 'reddit.com', 'news.ycombinator.com'];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    const titles = [
      'Getting Started Guide', 'API Reference', 'Best Practices', 'Tutorial Part 1',
      'Deep Dive into Internals', 'Performance Tips', 'Common Mistakes', 'Advanced Patterns',
      'Architecture Overview', 'Security Considerations', 'Testing Strategies', 'Deployment Guide',
    ];
    const title = titles[Math.floor(Math.random() * titles.length)];

    const newNode = addNode({
      url: `https://${domain}/page-${childCount}`,
      title: `${title} - ${domain}`,
      favicon: '',
      parentId: parentId,
      tabId: 200 + childCount,
      windowId: 1,
    });

    selectNode(newNode.id);
    setTimeout(fitToView, 100);
  }, [selectedNodeId, nodes, addNode, selectNode, fitToView]);

  // ===== Demo data =====
  const loadDemoData = useCallback(() => {
    clearSession();

    setTimeout(() => {
      const root = addNode({ url: 'https://en.wikipedia.org/wiki/Web_browser', title: 'Web Browser - Wikipedia', favicon: '', parentId: null, tabId: 100, windowId: 1 });

      // Branch 1: Chrome
      const chrome = addNode({ url: 'https://en.wikipedia.org/wiki/Google_Chrome', title: 'Google Chrome', favicon: '', parentId: root.id, tabId: 100, windowId: 1 });
      const v8 = addNode({ url: 'https://en.wikipedia.org/wiki/V8_engine', title: 'V8 JavaScript Engine', favicon: '', parentId: chrome.id, tabId: 100, windowId: 1 });
      addNode({ url: 'https://nodejs.org', title: 'Node.js (uses V8)', favicon: '', parentId: v8.id, tabId: 100, windowId: 1 });
      addNode({ url: 'https://deno.land', title: 'Deno (uses V8)', favicon: '', parentId: v8.id, tabId: 103, windowId: 1 });

      const extensions = addNode({ url: 'https://developer.chrome.com/docs/extensions', title: 'Chrome Extensions', favicon: '', parentId: chrome.id, tabId: 104, windowId: 1 });
      addNode({ url: 'https://developer.chrome.com/docs/extensions/mv3', title: 'Manifest V3', favicon: '', parentId: extensions.id, tabId: 104, windowId: 1 });
      addNode({ url: 'https://developer.chrome.com/docs/extensions/reference', title: 'API Reference', favicon: '', parentId: extensions.id, tabId: 105, windowId: 1 });

      // Branch 2: Firefox
      const firefox = addNode({ url: 'https://en.wikipedia.org/wiki/Firefox', title: 'Mozilla Firefox', favicon: '', parentId: root.id, tabId: 101, windowId: 1 });
      addNode({ url: 'https://en.wikipedia.org/wiki/Gecko_(software)', title: 'Gecko Engine', favicon: '', parentId: firefox.id, tabId: 101, windowId: 1 });
      const mdn = addNode({ url: 'https://developer.mozilla.org', title: 'MDN Web Docs', favicon: '', parentId: firefox.id, tabId: 106, windowId: 1 });
      addNode({ url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript', title: 'JavaScript Guide - MDN', favicon: '', parentId: mdn.id, tabId: 106, windowId: 1 });
      addNode({ url: 'https://developer.mozilla.org/en-US/docs/Web/CSS', title: 'CSS Reference - MDN', favicon: '', parentId: mdn.id, tabId: 107, windowId: 1 });

      // Branch 3: Safari
      const safari = addNode({ url: 'https://en.wikipedia.org/wiki/Safari_(web_browser)', title: 'Safari', favicon: '', parentId: root.id, tabId: 102, windowId: 1 });
      addNode({ url: 'https://webkit.org', title: 'WebKit Engine', favicon: '', parentId: safari.id, tabId: 102, windowId: 1 });
      addNode({ url: 'https://developer.apple.com/safari/', title: 'Safari Dev Tools', favicon: '', parentId: safari.id, tabId: 108, windowId: 1 });

      setTimeout(fitToView, 300);
    }, 50);
  }, [addNode, clearSession, fitToView]);

  // Empty state
  if (!hasNodes) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-surface-950">
        <EmptyState
          icon={<GitBranch className="w-6 h-6" />}
          title="No browsing data yet"
          description="Start browsing in other tabs to see your tree, or load demo data to explore the map."
          action={
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={loadDemoData}>
                <MousePointer2 className="w-3.5 h-3.5" /> Load Demo Tree
              </Button>
            </div>
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
      {/* Transform layer */}
      <div
        className="map-viewport"
        style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}
      >
        {/* Edges */}
        <svg className="absolute pointer-events-none" style={{ overflow: 'visible', width: 1, height: 1 }}>
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
            const active =
              edge.sourceId === selectedNodeId || edge.targetId === selectedNodeId ||
              edge.sourceId === hoveredNodeId || edge.targetId === hoveredNodeId;
            return <MapEdgeComponent key={edge.id} edge={edge} sourcePos={sp} targetPos={tp} isActive={active} />;
          })}
        </svg>

        {/* Nodes */}
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

      {/* Controls */}
      <MapControls />
      <MiniMap />

      {/* ===== Test/Build Panel ===== */}
      <div className="test-panel absolute top-4 left-4 z-30">
        {!showTestPanel ? (
          <button
            onClick={() => setShowTestPanel(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-900/90 backdrop-blur-xl border border-surface-700/50 rounded-lg text-xs text-surface-400 hover:text-surface-200 transition-colors shadow-xl"
          >
            <TestTube className="w-3.5 h-3.5" />
            Build Tree
            <ChevronDown className="w-3 h-3" />
          </button>
        ) : (
          <div className="bg-surface-900/95 backdrop-blur-xl border border-surface-700/50 rounded-xl shadow-2xl p-3 w-64 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium text-surface-300">
                <TestTube className="w-3.5 h-3.5 text-brand-400" />
                Tree Builder
              </div>
              <button
                onClick={() => setShowTestPanel(false)}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-700 text-surface-500"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Selected node info */}
            <div className="rounded-lg bg-surface-800/50 p-2">
              {selectedNode ? (
                <div>
                  <div className="text-2xs text-surface-500 mb-0.5">Selected:</div>
                  <div className="text-xs text-surface-200 truncate font-medium">
                    {selectedNode.title}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-2xs text-surface-500">
                    <span>Depth: {selectedNode.depth}</span>
                    <span>·</span>
                    <span>{selectedNode.children.length} children</span>
                  </div>
                </div>
              ) : (
                <div className="text-2xs text-surface-500">
                  Click a node to select it, then add children to create branches
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-1.5">
              <button
                onClick={addChildToSelected}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {selectedNode ? `Add child to "${selectedNode.title.substring(0, 20)}..."` : 'Add root node'}
              </button>

              <button
                onClick={() => {
                  if (selectedNode) {
                    // Add 3 children at once to create a branch
                    const domains = ['github.com', 'stackoverflow.com', 'docs.python.org'];
                    const titles = ['Branch A - Research', 'Branch B - Tutorial', 'Branch C - Discussion'];
                    for (let i = 0; i < 3; i++) {
                      addNode({
                        url: `https://${domains[i]}/page-${Date.now()}-${i}`,
                        title: titles[i],
                        favicon: '',
                        parentId: selectedNode.id,
                        tabId: 300 + Date.now() + i,
                        windowId: 1,
                      });
                    }
                    setTimeout(fitToView, 100);
                  }
                }}
                disabled={!selectedNode}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
              >
                <GitBranch className="w-3.5 h-3.5" />
                Add 3 branches (fork)
              </button>

              {selectedNode && (
                <button
                  onClick={() => {
                    removeNode(selectedNode.id);
                    selectNode(null);
                    setTimeout(fitToView, 100);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-medium transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete selected node
                </button>
              )}
            </div>

            {/* Quick actions */}
            <div className="flex gap-1.5">
              <button
                onClick={loadDemoData}
                className="flex-1 px-2 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-2xs text-surface-400 hover:text-surface-200 transition-colors"
              >
                Reset Demo
              </button>
              <button
                onClick={() => { clearSession(); selectNode(null); }}
                className="flex-1 px-2 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-2xs text-red-400 hover:text-red-300 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={() => fitToView()}
                className="flex-1 px-2 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-2xs text-surface-400 hover:text-surface-200 transition-colors"
              >
                Fit View
              </button>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3 text-2xs text-surface-500 pt-1 border-t border-surface-800">
              <span>{nodeList.length} nodes</span>
              <span>{edges.length} edges</span>
              <span>
                {nodeList.filter((n) => n.children.length > 1).length} branches
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};