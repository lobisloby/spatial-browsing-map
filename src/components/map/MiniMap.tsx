import React, { useMemo } from 'react';
import { useMapStore } from '@/hooks/useMapStore';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { getDepthColor } from '@/lib/utils';

export const MiniMap: React.FC = () => {
  const { nodes, viewport } = useMapStore();
  const positions = useMapStore((s) => s.getNodePositions());
  const { settings } = useSettingsStore();

  if (!settings.showMinimap) return null;
  const nodeList = Object.values(nodes);
  if (nodeList.length === 0) return null;

  const posArr = Object.entries(positions);
  const bounds = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [, p] of posArr) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + p.width);
      maxY = Math.max(maxY, p.y + p.height);
    }
    return { minX, minY, width: maxX - minX || 1, height: maxY - minY || 1 };
  }, [posArr]);

  const W = 180, H = 120;
  const scale = Math.min((W - 16) / bounds.width, (H - 16) / bounds.height);

  return (
    <div className="absolute bottom-4 right-4 w-[180px] h-[120px] bg-surface-900/90 border border-surface-700/50 rounded-lg backdrop-blur-sm z-20 overflow-hidden">
      <svg width={W} height={H}>
        {posArr.map(([id, pos]) => {
          const node = nodes[id];
          if (!node) return null;
          return (
            <rect
              key={id}
              x={(pos.x - bounds.minX) * scale + 8}
              y={(pos.y - bounds.minY) * scale + 8}
              width={Math.max(3, pos.width * scale)}
              height={Math.max(2, pos.height * scale)}
              rx={1}
              fill={node.isActive ? '#22c55e' : getDepthColor(node.depth)}
              opacity={0.8}
            />
          );
        })}
        <rect
          x={(-viewport.x / viewport.zoom - bounds.minX) * scale + 8}
          y={(-viewport.y / viewport.zoom - bounds.minY) * scale + 8}
          width={(viewport.width / viewport.zoom) * scale}
          height={(viewport.height / viewport.zoom) * scale}
          fill="rgba(99,102,241,0.08)"
          stroke="rgba(99,102,241,0.5)"
          strokeWidth={1.5}
          rx={2}
        />
      </svg>
    </div>
  );
};