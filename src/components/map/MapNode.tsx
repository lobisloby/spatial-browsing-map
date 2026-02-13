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
    const selectNode = useMapStore((s) => s.selectNode);
    const hoverNode = useMapStore((s) => s.hoverNode);
    const toggleCollapse = useMapStore((s) => s.toggleCollapse);

    const depthColor = getDepthColor(node.depth);
    const domainColor = getDomainColor(node.domain);
    const hasChildren = node.children.length > 0;
    const isBranch = node.children.length > 1;

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      selectNode(node.id);
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      chrome.tabs.create({ url: node.url });
    };

    const handleCollapse = (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleCollapse(node.id);
    };

    return (
      <div
        className={cn(
          'map-node absolute flex items-center gap-2.5 px-3 py-2.5 select-none',
          isSelected && 'ring-2 ring-brand-400 ring-offset-1 ring-offset-surface-950',
          node.isActive && 'map-node--active',
          node.isCollapsed && 'opacity-70',
          isFiltered === false && 'opacity-20',
        )}
        style={{
          left: position.x,
          top: position.y,
          width: position.width,
          height: position.height,
          borderLeftColor: depthColor,
          borderLeftWidth: 3,
          animation: 'nodeAppear 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => hoverNode(node.id)}
        onMouseLeave={() => hoverNode(null)}
      >
        {/* Favicon */}
        <div className="shrink-0 w-5 h-5 rounded overflow-hidden bg-surface-800 flex items-center justify-center">
          <img
            src={`https://www.google.com/s2/favicons?domain=${node.domain}&sz=32`}
            alt=""
            className="w-4 h-4"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.style.display = 'none';
              const parent = img.parentElement;
              if (parent && !parent.querySelector('svg')) {
                // Already has fallback from below
              }
            }}
          />
          <Globe className="w-3 h-3 text-surface-500 absolute" style={{ display: 'none' }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-surface-200 truncate leading-tight">
            {truncateText(node.title || 'Untitled', 24)}
          </div>
          <div className="text-2xs text-surface-500 truncate mt-0.5 flex items-center gap-1">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0 inline-block"
              style={{ backgroundColor: domainColor }}
            />
            <span className="truncate">{node.domain}</span>
          </div>
        </div>

        {/* Right indicators */}
        <div className="flex items-center gap-1 shrink-0">
          {node.visitCount > 1 && (
            <span className="text-2xs text-surface-500 bg-surface-800 px-1 rounded">
              {node.visitCount}×
            </span>
          )}

          {hasChildren && (
            <button
              onClick={handleCollapse}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-700 transition-colors"
              title={node.isCollapsed ? 'Expand' : 'Collapse'}
            >
              {node.isCollapsed ? (
                <ChevronRight className="w-3 h-3 text-surface-400" />
              ) : (
                <ChevronDown className="w-3 h-3 text-surface-400" />
              )}
            </button>
          )}

          {node.isCollapsed && hasChildren && (
            <span className="text-2xs text-brand-400 bg-brand-900/30 px-1 rounded">
              +{node.children.length}
            </span>
          )}

          {isBranch && !node.isCollapsed && (
            <GitBranch className="w-3 h-3 text-amber-500" />
          )}

          {node.isActive && (
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse-soft" />
          )}
        </div>

        {/* Hover tooltip */}
        {isHovered && (
          <div
            className="absolute z-50 pointer-events-none"
            style={{
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: 8,
            }}
          >
            <div className="bg-surface-900 border border-surface-700 rounded-lg shadow-2xl p-3 max-w-[300px] min-w-[200px] animate-fade-in">
              <div className="text-xs font-medium text-surface-200 mb-1 break-words">
                {node.title}
              </div>
              <div className="text-2xs text-brand-400 truncate mb-2 font-mono">
                {node.url}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-surface-500">
                <span>Depth: {node.depth}</span>
                <span>Visits: {node.visitCount}</span>
                {hasChildren && <span>{node.children.length} children</span>}
              </div>
              <div className="mt-2 pt-2 border-t border-surface-800 text-2xs text-surface-600">
                Click to select · Double-click to open
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);

MapNodeComponent.displayName = 'MapNode';