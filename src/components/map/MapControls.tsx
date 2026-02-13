import React from 'react';
import { useMapStore } from '@/hooks/useMapStore';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

export const MapControls: React.FC = () => {
  const { viewport, zoomIn, zoomOut, fitToView } = useMapStore();

  return (
    <div className="absolute bottom-4 left-4 flex items-center gap-1 bg-white/10 dark:bg-surface-900/80 backdrop-blur-xl border border-white/10 rounded-xl p-1 z-20">
      <Tooltip content="Zoom in" side="top">
        <Button variant="icon" onClick={zoomIn}><ZoomIn className="w-4 h-4" /></Button>
      </Tooltip>
      <span className="text-2xs font-mono text-surface-400 w-10 text-center">{Math.round(viewport.zoom * 100)}%</span>
      <Tooltip content="Zoom out" side="top">
        <Button variant="icon" onClick={zoomOut}><ZoomOut className="w-4 h-4" /></Button>
      </Tooltip>
      <div className="w-px h-5 bg-surface-700 mx-1" />
      <Tooltip content="Fit to view" side="top">
        <Button variant="icon" onClick={fitToView}><Maximize2 className="w-4 h-4" /></Button>
      </Tooltip>
    </div>
  );
};