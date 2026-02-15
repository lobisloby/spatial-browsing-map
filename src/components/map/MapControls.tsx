import React from 'react';
import { useMapStore } from '@/hooks/useMapStore';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Radio } from 'lucide-react';

export const MapControls: React.FC = () => {
  const viewport = useMapStore((s) => s.viewport);
  const zoomIn = useMapStore((s) => s.zoomIn);
  const zoomOut = useMapStore((s) => s.zoomOut);
  const fitToView = useMapStore((s) => s.fitToView);
  const setViewport = useMapStore((s) => s.setViewport);
  const centerOnNode = useMapStore((s) => s.centerOnNode);
  const nodes = useMapStore((s) => s.nodes);

  const activeNode = Object.values(nodes).find(n => n.isActive);
  const zoomPercent = Math.round(viewport.zoom * 100);

  return (
    <div className="absolute bottom-4 left-4 flex items-center gap-0.5 bg-surface-900/90 backdrop-blur-xl border border-surface-700/50 rounded-xl p-1 z-20 shadow-xl">
      <Tooltip content="Zoom in" side="top">
        <Button variant="icon" onClick={zoomIn}><ZoomIn className="w-4 h-4" /></Button>
      </Tooltip>

      <button
        onClick={() => setViewport({ zoom: 1 })}
        className="min-w-[48px] h-8 px-2 text-2xs font-mono text-surface-400 hover:text-surface-200 hover:bg-surface-800 rounded-lg transition-colors tabular-nums"
        title="Reset zoom to 100%"
      >
        {zoomPercent}%
      </button>

      <Tooltip content="Zoom out" side="top">
        <Button variant="icon" onClick={zoomOut}><ZoomOut className="w-4 h-4" /></Button>
      </Tooltip>

      <div className="w-px h-5 bg-surface-700 mx-0.5" />

      <Tooltip content="Fit all nodes" side="top">
        <Button variant="icon" onClick={fitToView}><Maximize2 className="w-4 h-4" /></Button>
      </Tooltip>

      <Tooltip content="Reset position" side="top">
        <Button variant="icon" onClick={() => setViewport({ x: 0, y: 0, zoom: 1 })}>
          <RotateCcw className="w-4 h-4" />
        </Button>
      </Tooltip>

      {activeNode && (
        <>
          <div className="w-px h-5 bg-surface-700 mx-0.5" />
          <Tooltip content={`Go to active: ${activeNode.title}`} side="top">
            <Button
              variant="icon"
              onClick={() => centerOnNode(activeNode.id)}
              className="text-green-500 hover:text-green-400"
            >
              <Radio className="w-4 h-4" />
            </Button>
          </Tooltip>
        </>
      )}
    </div>
  );
};