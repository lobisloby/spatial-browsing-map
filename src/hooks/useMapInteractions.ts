// src/hooks/useMapInteractions.ts
import { useCallback, useRef, useEffect, useState } from 'react';
import { useMapStore } from './useMapStore';
import { throttle } from '@/lib/utils';

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
}

export function useMapInteractions(containerRef: React.RefObject<HTMLDivElement>) {
  const { viewport, setViewport, zoomIn, zoomOut } = useMapStore();
  const dragRef = useRef<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
  });
  const [isPanning, setIsPanning] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    dragRef.current = {
      isDragging: true,
      startX: e.clientX - viewport.x,
      startY: e.clientY - viewport.y,
      lastX: e.clientX,
      lastY: e.clientY,
    };
    setIsPanning(true);
  }, [viewport.x, viewport.y]);

  const handleMouseMove = useCallback(
    throttle((e: React.MouseEvent) => {
      if (!dragRef.current.isDragging) return;
      const x = e.clientX - dragRef.current.startX;
      const y = e.clientY - dragRef.current.startY;
      setViewport({ x, y });
    }, 16),
    [],
  );

  const handleMouseUp = useCallback(() => {
    dragRef.current.isDragging = false;
    setIsPanning(false);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(5, viewport.zoom * delta));

      // Zoom toward cursor
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newX = mouseX - (mouseX - viewport.x) * (newZoom / viewport.zoom);
      const newY = mouseY - (mouseY - viewport.y) * (newZoom / viewport.zoom);

      setViewport({ x: newX, y: newY, zoom: newZoom });
    },
    [viewport, setViewport, containerRef],
  );

  // Track container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setViewport({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, setViewport]);

  return {
    isPanning,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseUp,
      onWheel: handleWheel,
    },
  };
}