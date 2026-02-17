import React, { useMemo, useCallback } from 'react';
import { useMapStore } from '@/hooks/useMapStore';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { getDepthColor } from '@/lib/utils';
import { X } from 'lucide-react';

const MINI_W = 200;
const MINI_H = 140;
const PADDING = 12;

export const MiniMap: React.FC = () => {
  const nodes = useMapStore((s) => s.nodes);
  const viewport = useMapStore((s) => s.viewport);
  const setViewport = useMapStore((s) => s.setViewport);
  const positions = useMapStore((s) => s.getNodePositions());
  const edges = useMapStore((s) => s.edges);
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  if (!settings.showMinimap) return null;

  const nodeEntries = Object.entries(positions);
  if (nodeEntries.length === 0) return null;

  // Calculate bounds of all nodes
  const bounds = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const [, pos] of nodeEntries) {
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + pos.width);
      maxY = Math.max(maxY, pos.y + pos.height);
    }

    const width = maxX - minX || 1;
    const height = maxY - minY || 1;

    return { minX, minY, maxX, maxY, width, height };
  }, [nodeEntries]);

  // Scale to fit minimap
  const scale = useMemo(() => {
    const availW = MINI_W - PADDING * 2;
    const availH = MINI_H - PADDING * 2;
    return Math.min(availW / bounds.width, availH / bounds.height);
  }, [bounds]);

  // Convert world coords to minimap coords
  const toMini = useCallback(
    (wx: number, wy: number) => ({
      x: (wx - bounds.minX) * scale + PADDING,
      y: (wy - bounds.minY) * scale + PADDING,
    }),
    [bounds, scale],
  );

  // Viewport rectangle in minimap space
  const vpRect = useMemo(() => {
    // World coordinates of the visible area
    const worldLeft = -viewport.x / viewport.zoom;
    const worldTop = -viewport.y / viewport.zoom;
    const worldRight = worldLeft + viewport.width / viewport.zoom;
    const worldBottom = worldTop + viewport.height / viewport.zoom;

    const topLeft = toMini(worldLeft, worldTop);
    const bottomRight = toMini(worldRight, worldBottom);

    return {
      x: topLeft.x,
      y: topLeft.y,
      width: Math.max(4, bottomRight.x - topLeft.x),
      height: Math.max(4, bottomRight.y - topLeft.y),
    };
  }, [viewport, toMini]);

  // Click on minimap to navigate
  const handleMiniMapClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Convert minimap coords back to world coords
      const worldX = (clickX - PADDING) / scale + bounds.minX;
      const worldY = (clickY - PADDING) / scale + bounds.minY;

      // Center viewport on this world position
      setViewport({
        x: -(worldX * viewport.zoom) + viewport.width / 2,
        y: -(worldY * viewport.zoom) + viewport.height / 2,
      });
    },
    [bounds, scale, viewport, setViewport],
  );

  return (
    <div className="absolute bottom-4 right-4 z-20">
      <div className="bg-surface-900/95 backdrop-blur-xl border border-surface-700/50 rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-surface-800">
          <span className="text-2xs font-medium text-surface-500">Overview</span>
          <button
            onClick={() => updateSettings({ showMinimap: false })}
            className="w-4 h-4 flex items-center justify-center rounded hover:bg-surface-700 text-surface-500 hover:text-surface-300 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Map */}
        <svg
          width={MINI_W}
          height={MINI_H}
          className="cursor-pointer"
          onClick={handleMiniMapClick}
        >
          {/* Background */}
          <rect width={MINI_W} height={MINI_H} fill="rgba(15,23,42,0.5)" />

          {/* Edges */}
          {edges.map((edge) => {
            const sp = positions[edge.sourceId];
            const tp = positions[edge.targetId];
            if (!sp || !tp) return null;

            const from = toMini(sp.x + sp.width / 2, sp.y + sp.height);
            const to = toMini(tp.x + tp.width / 2, tp.y);

            return (
              <line
                key={edge.id}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="rgba(99,102,241,0.15)"
                strokeWidth={0.5}
              />
            );
          })}

          {/* Nodes */}
          {nodeEntries.map(([id, pos]) => {
            const node = nodes[id];
            if (!node) return null;

            const mp = toMini(pos.x, pos.y);
            const w = Math.max(4, pos.width * scale);
            const h = Math.max(3, pos.height * scale);

            return (
              <rect
                key={id}
                x={mp.x}
                y={mp.y}
                width={w}
                height={h}
                rx={1}
                fill={node.isActive ? '#22c55e' : getDepthColor(node.depth)}
                opacity={0.85}
              />
            );
          })}

          {/* Viewport rectangle */}
          <rect
            x={vpRect.x}
            y={vpRect.y}
            width={vpRect.width}
            height={vpRect.height}
            fill="rgba(99,102,241,0.06)"
            stroke="rgba(99,102,241,0.5)"
            strokeWidth={1.5}
            rx={2}
            strokeDasharray="4 2"
          />
        </svg>
      </div>
    </div>
  );
};