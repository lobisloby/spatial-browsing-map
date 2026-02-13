import React from 'react';
import { cn } from '@/lib/utils';
import { useMapStore } from '@/hooks/useMapStore';
import { ChevronDown, ChevronRight, Globe, GitBranch } from 'lucide-react';
import { truncateText, getDepthColor, getDomainColor } from '@/lib/utils';
import type { MapNode as MapNodeType, NodePosition } from '@/types/map';

interface Props {
  node: MapNodeType;
  position: NodePosition;
  isSelected: boolean;
  isHovered: boolean;
  isFiltered: boolean | null;
}

export const MapNodeComponent: React.FC<Props> = React.memo(
  ({ node, position, isSelected, isHovered, isFiltered }) => {
    const { selectNode, hoverNode, toggleCollapse } = useMapStore();
    const depthColor = getDepthColor(node.depth);
    const hasChildren = node.children.length > 0;

    return (
      <div
        className={cn(
          'map-node absolute flex items-center gap-2.5 px-3 py-2.5 animate-node-appear select-none',
          isSelected && 'ring-2 ring-brand-500',
          node.isActive && 'map-node--active',
          isFiltered === false && 'opacity-20',
        )}
        style={{
          left: position.x,
          top: position.y,
          width: position.width,
          height: position.height,
          borderLeftColor: depthColor,
          borderLeftWidth: 3,
        }}
        onClick={(e) => { e.stopPropagation(); selectNode(node.id); }}
        onDoubleClick={(e) => { e.stopPropagation(); chrome.tabs.create({ url: node.url }); }}
        onMouseEnter={() => hoverNode(node.id)}
        onMouseLeave={() => hoverNode(null)}
      >
        <div className="shrink-0 w-5 h-5 rounded overflow-hidden bg-surface-800 flex items-center justify-center">
          {node.favicon ? (
            <img
              src={`https://www.google.com/s2/favicons?domain=${node.domain}&sz=32`}
              alt=""
              className="w-4 h-4"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <Globe className="w-3 h-3 text-surface-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-surface-200 truncate leading-tight">
            {truncateText(node.title || 'Untitled', 28)}
          </div>
          <div className="text-2xs text-surface-500 truncate mt-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: getDomainColor(node.domain) }} />
            {node.domain}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {node.visitCount > 1 && (
            <span className="text-2xs text-surface-500 bg-surface-800 px-1 py-0.5 rounded">{node.visitCount}</span>
          )}
          {hasChildren && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleCollapse(node.id); }}
              className="w-4 h-4 flex items-center justify-center rounded hover:bg-surface-700"
            >
              {node.isCollapsed ? <ChevronRight className="w-3 h-3 text-surface-400" /> : <ChevronDown className="w-3 h-3 text-surface-400" />}
            </button>
          )}
          {node.children.length > 1 && <GitBranch className="w-3 h-3 text-amber-500" />}
          {node.isActive && <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-soft" />}
        </div>

        {isHovered && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
            <div className="bg-surface-900 border border-surface-700 rounded-lg shadow-xl p-3 max-w-[280px] animate-fade-in">
              <div className="text-xs font-medium text-surface-200 mb-1">{node.title}</div>
              <div className="text-2xs text-brand-400 truncate mb-2">{node.url}</div>
              <div className="flex items-center gap-3 text-2xs text-surface-500">
                <span>Depth: {node.depth}</span>
                <span>Visits: {node.visitCount}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);

MapNodeComponent.displayName = 'MapNode';