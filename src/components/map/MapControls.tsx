import React from 'react';
import { useMapStore } from '@/hooks/useMapStore';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Minus,
} from 'lucide-react';

export const MapControls: React.FC = () => {
  const viewport = useMapStore((s) => s.viewport);
  const zoomIn = useMapStore((s) => s.zoomIn);
  const zoomOut = useMapStore((s) => s.zoomOut);
  const fitToView = useMapStore((s) => s.fitToView);
  const setViewport = useMapStore((s) => s.setViewport);

  const zoomPercent = Math.round(viewport.zoom * 100);

  const resetZoom = () => {
    setViewport({ zoom: 1 });
  };

  return (
    <div className="absolute bottom-4 left-4 flex items-center gap-0.5 bg-surface-900/90 backdrop-blur-xl border border-surface-700/50 rounded-xl p-1 z-20 shadow-xl">
      <Tooltip content="Zoom in (Scroll up)" side="top">
        <Button variant="icon" onClick={zoomIn}>
          <ZoomIn className="w-4 h-4" />
        </Button>
      </Tooltip>

      <button
        onClick={resetZoom}
        className="min-w-[48px] h-8 px-2 text-2xs font-mono text-surface-400 hover:text-surface-200 hover:bg-surface-800 rounded-lg transition-colors tabular-nums"
        title="Click to reset to 100%"
      >
        {zoomPercent}%
      </button>

      <Tooltip content="Zoom out (Scroll down)" side="top">
        <Button variant="icon" onClick={zoomOut}>
          <ZoomOut className="w-4 h-4" />
        </Button>
      </Tooltip>

      <div className="w-px h-5 bg-surface-700 mx-0.5" />

      <Tooltip content="Fit all nodes in view" side="top">
        <Button variant="icon" onClick={fitToView}>
          <Maximize2 className="w-4 h-4" />
        </Button>
      </Tooltip>

      <Tooltip content="Reset position" side="top">
        <Button
          variant="icon"
          onClick={() => setViewport({ x: 0, y: 0, zoom: 1 })}
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </Tooltip>
    </div>
  );
};