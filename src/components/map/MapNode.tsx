import React from 'react';
import { cn } from '@/lib/utils';
import { useMapStore } from '@/hooks/useMapStore';
import { ChevronDown, ChevronRight, Globe, GitBranch, XCircle } from 'lucide-react';
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
    const domainColor = getDomainColor(node.domain || 'default');
    const hasChildren = node.children.length > 0;
    const isBranch = node.children.length > 1;
    const isRoot = node.parentId === null;

    return (
      <div
        className={cn(
          'map-node absolute flex items-center gap-2 px-3 py-2 select-none',
          isSelected && 'ring-2 ring-brand-400 ring-offset-1 ring-offset-surface-950',
          node.isActive && !node.isClosed && 'map-node--active',
          node.isClosed && 'map-node--closed',
          isRoot && 'map-node--root',
          isFiltered === false && 'opacity-15',
        )}
        style={{
          left: position.x,
          top: position.y,
          width: position.width,
          height: position.height,
          borderLeftColor: node.isClosed ? '#475569' : depthColor,
          borderLeftWidth: 3,
        }}
        onClick={(e) => { e.stopPropagation(); selectNode(node.id); }}
        onDoubleClick={(e) => { e.stopPropagation(); if (node.url) chrome.tabs.create({ url: node.url }); }}
        onMouseEnter={() => hoverNode(node.id)}
        onMouseLeave={() => hoverNode(null)}
      >
        {/* Favicon */}
        <div className="shrink-0 w-5 h-5 rounded overflow-hidden bg-surface-800 flex items-center justify-center relative">
          {node.domain ? (
            <img
              src={`https://www.google.com/s2/favicons?domain=${node.domain}&sz=32`}
              alt="" className="w-4 h-4"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : null}
          <Globe className="w-3 h-3 text-surface-600 absolute" />
          {node.isClosed && (
            <div className="absolute inset-0 bg-surface-900/60 flex items-center justify-center">
              <XCircle className="w-3 h-3 text-surface-500" />
            </div>
          )}
        </div>

        {/* Title & domain */}
        <div className="flex-1 min-w-0">
          <div className={cn(
            'text-xs font-medium truncate leading-tight',
            node.isClosed ? 'text-surface-500 line-through decoration-surface-600' : 'text-surface-200',
          )}>
            {truncateText(node.title || 'New Tab', 26)}
          </div>
          <div className="text-2xs text-surface-500 truncate mt-0.5 flex items-center gap-1">
            {isRoot && <span className="text-brand-400 font-medium mr-0.5">ROOT</span>}
            <span className="w-1.5 h-1.5 rounded-full shrink-0 inline-block"
              style={{ backgroundColor: node.isClosed ? '#475569' : domainColor }} />
            <span className="truncate">{node.domain || 'new tab'}</span>
          </div>
        </div>

        {/* Right side indicators */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Depth badge */}
          <span className="text-2xs font-mono px-1 rounded"
            style={{ color: depthColor, backgroundColor: `${depthColor}15` }}>
            d{node.depth}
          </span>

          {/* Collapse/expand */}
          {hasChildren && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleCollapse(node.id); }}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-700 transition-colors"
              title={node.isCollapsed ? `Expand (${node.children.length} hidden)` : 'Collapse'}
            >
              {node.isCollapsed
                ? <ChevronRight className="w-3.5 h-3.5 text-surface-400" />
                : <ChevronDown className="w-3.5 h-3.5 text-surface-400" />
              }
            </button>
          )}

          {/* Hidden children count */}
          {node.isCollapsed && hasChildren && (
            <span className="text-2xs text-brand-400 bg-brand-900/30 px-1 rounded font-medium">
              +{node.children.length}
            </span>
          )}

          {/* Branch indicator */}
          {isBranch && !node.isCollapsed && (
            <GitBranch className="w-3.5 h-3.5 text-amber-500" />
          )}

          {/* Active dot */}
          {node.isActive && !node.isClosed && (
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse-soft ml-0.5" />
          )}
        </div>

        {/* Hover tooltip */}
        {isHovered && (
          <div className="absolute z-50 pointer-events-none"
            style={{ bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 10 }}>
            <div className="bg-surface-900 border border-surface-700 rounded-lg shadow-2xl p-3 max-w-[320px] min-w-[220px] animate-fade-in">
              <div className="text-xs font-medium text-surface-200 mb-1 break-words">{node.title}</div>
              {node.url && <div className="text-2xs text-brand-400 truncate mb-2 font-mono">{node.url}</div>}
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-2xs text-surface-500">
                <span>Depth: {node.depth}</span>
                <span>{node.children.length} children</span>
                {node.visitCount > 1 && <span>{node.visitCount} visits</span>}
                {node.isClosed && <span className="text-red-400">Tab closed</span>}
                {node.isActive && <span className="text-green-400">Active tab</span>}
                {isRoot && <span className="text-brand-400">Root node</span>}
              </div>
              <div className="mt-2 pt-2 border-t border-surface-800 text-2xs text-surface-600">
                Click to select · Double-click to reopen in new tab
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);

MapNodeComponent.displayName = 'MapNode';