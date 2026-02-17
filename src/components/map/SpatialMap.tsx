import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { useMapStore } from '@/hooks/useMapStore';
import { MapNodeComponent } from './MapNode';
import { MapEdgeComponent } from './MapEdge';
import { MapControls } from './MapControls';
import { MiniMap } from './MiniMap';
import { EmptyState } from '../shared/EmptyState';
import { Button } from '../ui/Button';
import {
  GitBranch, MousePointer2, Plus, Trash2,
  TestTube, ChevronDown, X, RotateCcw,
} from 'lucide-react';
import '@/styles/map.css';

export const SpatialMap: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  const lastNodeCount = useRef(0);
  const [showBuilder, setShowBuilder] = useState(false);

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

  // Container size tracking
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

  // Auto-fit when nodes first appear
  useEffect(() => {
    const count = nodeList.length;
    if (count > 0 && lastNodeCount.current === 0) {
      setTimeout(fitToView, 250);
    }
    lastNodeCount.current = count;
  }, [nodeList.length, fitToView]);

  // Wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handle = (e: WheelEvent) => {
      e.preventDefault();
      const s = useMapStore.getState();
      const vp = s.viewport;
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      const nz = Math.max(0.1, Math.min(4, vp.zoom * factor));
      const sc = nz / vp.zoom;
      s.setViewport({ x: mx - (mx - vp.x) * sc, y: my - (my - vp.y) * sc, zoom: nz });
    };
    el.addEventListener('wheel', handle, { passive: false });
    return () => el.removeEventListener('wheel', handle);
  }, []);

  // Pan
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('.map-node,.builder-panel')) return;
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
    if (!hasMoved.current && !(e.target as HTMLElement).closest('.map-node,.builder-panel')) {
      selectNode(null);
    }
  }, [selectNode]);

  // Add child to selected (or add root if nothing selected)
  const addChild = useCallback(() => {
    const domains = ['github.com', 'stackoverflow.com', 'developer.mozilla.org', 'docs.google.com', 'medium.com', 'dev.to', 'reddit.com', 'arxiv.org'];
    const titles = ['Getting Started', 'API Reference', 'Best Practices', 'Tutorial', 'Deep Dive', 'Performance', 'Architecture', 'Security Guide', 'Testing', 'Deployment'];
    const d = domains[Math.floor(Math.random() * domains.length)];
    const t = titles[Math.floor(Math.random() * titles.length)];
    const n = addNode({
      url: `https://${d}/${Date.now()}`,
      title: `${t} - ${d}`,
      favicon: '', parentId: selectedNodeId,
      tabId: 200 + Date.now(), windowId: 1,
    });
    selectNode(n.id);
    setTimeout(fitToView, 150);
  }, [selectedNodeId, addNode, selectNode, fitToView]);

  // Add multiple branches
  const addBranches = useCallback((count: number) => {
    if (!selectedNodeId) return;
    const labels = ['Research Path', 'Tutorial Path', 'Discussion Path', 'Reference Path', 'Example Path'];
    for (let i = 0; i < count; i++) {
      addNode({
        url: `https://branch-${i + 1}.example.com/${Date.now()}`,
        title: labels[i] || `Branch ${i + 1}`,
        favicon: '', parentId: selectedNodeId,
        tabId: 300 + Date.now() + i, windowId: 1,
      });
    }
    setTimeout(fitToView, 150);
  }, [selectedNodeId, addNode, fitToView]);

  // Load exact example tree:  A → B → {C→R, E→G→H, F}
  const loadExampleTree = useCallback(() => {
    clearSession();
    setTimeout(() => {
      const a = addNode({ url: 'https://research.example.com/start', title: 'A — Research Start', favicon: '', parentId: null, tabId: 1, windowId: 1 });
      const b = addNode({ url: 'https://research.example.com/topic', title: 'B — Main Topic', favicon: '', parentId: a.id, tabId: 1, windowId: 1 });
      const c = addNode({ url: 'https://research.example.com/approach-1', title: 'C — Approach 1', favicon: '', parentId: b.id, tabId: 2, windowId: 1 });
      const e = addNode({ url: 'https://research.example.com/approach-2', title: 'E — Approach 2', favicon: '', parentId: b.id, tabId: 3, windowId: 1 });
      const f = addNode({ url: 'https://research.example.com/approach-3', title: 'F — Approach 3', favicon: '', parentId: b.id, tabId: 4, windowId: 1 });
      addNode({ url: 'https://research.example.com/result-1', title: 'R — Result from C', favicon: '', parentId: c.id, tabId: 2, windowId: 1 });
      const g = addNode({ url: 'https://research.example.com/deep-dive', title: 'G — Deep Dive from E', favicon: '', parentId: e.id, tabId: 3, windowId: 1 });
      addNode({ url: 'https://research.example.com/conclusion', title: 'H — Conclusion from G', favicon: '', parentId: g.id, tabId: 3, windowId: 1 });
      setTimeout(fitToView, 300);
    }, 50);
  }, [addNode, clearSession, fitToView]);

  // Load realistic research tree
  const loadRealisticTree = useCallback(() => {
    clearSession();
    setTimeout(() => {
      const start = addNode({ url: 'https://google.com/search?q=react+state+management', title: 'Google: react state management', favicon: '', parentId: null, tabId: 1, windowId: 1 });
      const redux = addNode({ url: 'https://redux.js.org', title: 'Redux - Official Site', favicon: '', parentId: start.id, tabId: 2, windowId: 1 });
      const zustand = addNode({ url: 'https://zustand-demo.pmnd.rs', title: 'Zustand - Demo', favicon: '', parentId: start.id, tabId: 3, windowId: 1 });
      const jotai = addNode({ url: 'https://jotai.org', title: 'Jotai - Primitive Atoms', favicon: '', parentId: start.id, tabId: 4, windowId: 1 });

      const reduxTk = addNode({ url: 'https://redux-toolkit.js.org/tutorials/quick-start', title: 'Redux Toolkit Quick Start', favicon: '', parentId: redux.id, tabId: 2, windowId: 1 });
      addNode({ url: 'https://redux.js.org/usage/structuring-reducers', title: 'Structuring Reducers', favicon: '', parentId: redux.id, tabId: 5, windowId: 1 });
      addNode({ url: 'https://github.com/reduxjs/redux-toolkit', title: 'Redux Toolkit GitHub', favicon: '', parentId: reduxTk.id, tabId: 2, windowId: 1 });

      const zustandGh = addNode({ url: 'https://github.com/pmndrs/zustand', title: 'Zustand GitHub', favicon: '', parentId: zustand.id, tabId: 3, windowId: 1 });
      addNode({ url: 'https://github.com/pmndrs/zustand/wiki', title: 'Zustand Wiki', favicon: '', parentId: zustandGh.id, tabId: 3, windowId: 1 });
      addNode({ url: 'https://blog.example.com/zustand-vs-redux', title: 'Zustand vs Redux (Blog)', favicon: '', parentId: zustand.id, tabId: 6, windowId: 1 });

      addNode({ url: 'https://jotai.org/docs/guides/comparison', title: 'Jotai Comparison Guide', favicon: '', parentId: jotai.id, tabId: 4, windowId: 1 });

      setTimeout(fitToView, 300);
    }, 50);
  }, [addNode, clearSession, fitToView]);

  // Empty state
  if (!hasNodes) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-surface-950">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-surface-800 flex items-center justify-center mx-auto">
            <GitBranch className="w-7 h-7 text-surface-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-surface-200 mb-2">No browsing data yet</h2>
            <p className="text-sm text-surface-500 leading-relaxed">
              Open new tabs and browse to see your exploration tree grow.
              Each new tab creates a branch. Clicking links creates depth.
            </p>
          </div>
          <div className="flex flex-col gap-2 items-center">
            <Button variant="primary" onClick={loadExampleTree}>
              <MousePointer2 className="w-4 h-4" /> Load Example Tree (A→B→C,E,F)
            </Button>
            <Button variant="secondary" onClick={loadRealisticTree}>
              <GitBranch className="w-4 h-4" /> Load Research Example
            </Button>
          </div>
          <div className="text-2xs text-surface-600 space-y-1">
            <p>The example tree shows:</p>
            <pre className="text-left inline-block font-mono bg-surface-900 rounded-lg px-4 py-2 text-surface-400">
{`      A
      |
      B
  /   |   \\
 C    E    F
 |    |
 R    G
      |
      H`}
            </pre>
          </div>
        </div>
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
        {/* Edge lines */}
        <svg className="absolute pointer-events-none" style={{ overflow: 'visible', width: 1, height: 1 }}>
          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
              <polygon points="0 0, 6 2.5, 0 5" fill="rgba(99,102,241,0.25)" />
            </marker>
            <marker id="arrow-active" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
              <polygon points="0 0, 6 2.5, 0 5" fill="rgba(99,102,241,0.6)" />
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

      {/* Map controls */}
      <MapControls />
      <MiniMap />

      {/* Builder Panel */}
      <div className="builder-panel absolute top-4 left-4 z-30">
        {!showBuilder ? (
          <button
            onClick={() => setShowBuilder(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-900/90 backdrop-blur-xl border border-surface-700/50 rounded-lg text-xs text-surface-400 hover:text-surface-200 hover:border-surface-600 transition-all shadow-xl"
          >
            <TestTube className="w-3.5 h-3.5" /> Tree Builder <ChevronDown className="w-3 h-3" />
          </button>
        ) : (
          <div className="bg-surface-900/95 backdrop-blur-xl border border-surface-700/50 rounded-xl shadow-2xl p-3 w-72 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-medium text-surface-300">
                <TestTube className="w-3.5 h-3.5 text-brand-400" /> Tree Builder
              </span>
              <button onClick={() => setShowBuilder(false)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-700 text-surface-500">
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Selected info */}
            <div className="rounded-lg bg-surface-800/60 p-2.5">
              {selectedNode ? (
                <>
                  <div className="text-2xs text-surface-500 mb-0.5">Selected node:</div>
                  <div className="text-xs text-surface-200 truncate font-medium">{selectedNode.title}</div>
                  <div className="flex gap-2 mt-1 text-2xs text-surface-500">
                    <span>Depth {selectedNode.depth}</span>
                    <span>·</span>
                    <span>{selectedNode.children.length} children</span>
                    {selectedNode.isClosed && <span className="text-red-400">· Closed</span>}
                  </div>
                </>
              ) : (
                <div className="text-2xs text-surface-500">
                  Select a node to add children, or add a new root node.
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-1.5">
              <button onClick={addChild}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium transition-colors">
                <Plus className="w-3.5 h-3.5" />
                {selectedNode ? 'Add child node' : 'Add root node'}
              </button>

              <button onClick={() => addBranches(3)} disabled={!selectedNode}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors">
                <GitBranch className="w-3.5 h-3.5" /> Add 3 branches (fork)
              </button>

              {selectedNode && (
                <button onClick={() => { removeNode(selectedNode.id); selectNode(null); setTimeout(fitToView, 100); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-medium transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Delete selected + children
                </button>
              )}
            </div>

            {/* Presets */}
            <div className="space-y-1.5 pt-1 border-t border-surface-800">
              <div className="text-2xs text-surface-500 font-medium">Load preset:</div>
              <div className="flex gap-1.5">
                <button onClick={loadExampleTree} className="flex-1 px-2 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-2xs text-surface-400 hover:text-surface-200 transition-colors">
                  A→B→C,E,F
                </button>
                <button onClick={loadRealisticTree} className="flex-1 px-2 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-2xs text-surface-400 hover:text-surface-200 transition-colors">
                  Research
                </button>
                <button onClick={() => { clearSession(); selectNode(null); }} className="px-2 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-2xs text-red-400 hover:text-red-300 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Fit view */}
            <button onClick={fitToView}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-2xs text-surface-400 hover:text-surface-200 transition-colors">
              <RotateCcw className="w-3 h-3" /> Fit to view
            </button>

            {/* Stats */}
            <div className="flex items-center gap-3 text-2xs text-surface-600 pt-1 border-t border-surface-800">
              <span>{nodeList.length} nodes</span>
              <span>{edges.length} edges</span>
              <span>{nodeList.filter((n) => n.children.length > 1).length} branches</span>
              <span>depth {Math.max(0, ...nodeList.map((n) => n.depth))}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};