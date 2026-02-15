import React from 'react';
import { cn } from '@/lib/utils';
import { useMapStore } from '@/hooks/useMapStore';
import { ChevronDown, ChevronRight, Globe, GitBranch, XCircle, Radio } from 'lucide-react';
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
    const isActive = node.isActive && !node.isClosed;

    return (
      <div
        className={cn(
          'map-node absolute flex items-center gap-2 px-3 py-2 select-none',
          isSelected && 'ring-2 ring-brand-400 ring-offset-1 ring-offset-surface-950',
          isActive && 'map-node--active',
          node.isClosed && 'map-node--closed',
          isRoot && !isActive && !node.isClosed && 'map-node--root',
          isFiltered === false && 'opacity-15',
        )}
        style={{
          left: position.x,
          top: position.y,
          width: position.width,
          height: position.height,
          borderLeftColor: node.isClosed ? '#475569' : isActive ? '#22c55e' : depthColor,
          borderLeftWidth: 3,
        }}
        onClick={(e) => { e.stopPropagation(); selectNode(node.id); }}
        onDoubleClick={(e) => { e.stopPropagation(); if (node.url) chrome.tabs.create({ url: node.url }); }}
        onMouseEnter={() => hoverNode(node.id)}
        onMouseLeave={() => hoverNode(null)}
      >
        {/* Active glow ring */}
        {isActive && (
          <div
            className="absolute -inset-[3px] rounded-[14px] pointer-events-none"
            style={{
              border: '2px solid rgba(34, 197, 94, 0.3)',
              animation: 'activeGlow 2s ease-in-out infinite',
            }}
          />
        )}

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

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className={cn(
            'text-xs font-medium truncate leading-tight',
            node.isClosed
              ? 'text-surface-500 line-through decoration-surface-600'
              : isActive
                ? 'text-green-300'
                : 'text-surface-200',
          )}>
            {truncateText(node.title || 'New Tab', 24)}
          </div>
          <div className="text-2xs text-surface-500 truncate mt-0.5 flex items-center gap-1">
            {isRoot && <span className="text-brand-400 font-semibold mr-0.5">ROOT</span>}
            <span className="w-1.5 h-1.5 rounded-full shrink-0 inline-block"
              style={{ backgroundColor: node.isClosed ? '#475569' : isActive ? '#22c55e' : domainColor }} />
            <span className="truncate">{node.domain || 'new tab'}</span>
          </div>
        </div>

        {/* Right indicators */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Depth */}
          <span className="text-2xs font-mono px-1 rounded"
            style={{ color: depthColor, backgroundColor: `${depthColor}15` }}>
            {node.depth}
          </span>

          {/* Collapse */}
          {hasChildren && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleCollapse(node.id); }}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-700 transition-colors"
            >
              {node.isCollapsed
                ? <ChevronRight className="w-3.5 h-3.5 text-surface-400" />
                : <ChevronDown className="w-3.5 h-3.5 text-surface-400" />
              }
            </button>
          )}

          {node.isCollapsed && hasChildren && (
            <span className="text-2xs text-brand-400 bg-brand-900/30 px-1 rounded font-medium">
              +{node.children.length}
            </span>
          )}

          {isBranch && !node.isCollapsed && (
            <GitBranch className="w-3.5 h-3.5 text-amber-500" />
          )}

          {/* Active indicator */}
          {isActive && (
            <div className="flex items-center gap-1 ml-0.5">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse-soft" />
            </div>
          )}

          {node.isClosed && (
            <span className="text-2xs text-surface-600 italic">closed</span>
          )}
        </div>

        {/* Tooltip */}
        {isHovered && (
          <div className="absolute z-50 pointer-events-none"
            style={{ bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 10 }}>
            <div className="bg-surface-900 border border-surface-700 rounded-lg shadow-2xl p-3 max-w-[320px] min-w-[220px] animate-fade-in">
              <div className="flex items-center gap-2 mb-1">
                {isActive && <Radio className="w-3 h-3 text-green-400 animate-pulse-soft" />}
                <span className="text-xs font-medium text-surface-200 break-words flex-1">{node.title}</span>
              </div>
              {node.url && <div className="text-2xs text-brand-400 truncate mb-2 font-mono">{node.url}</div>}
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-2xs text-surface-500">
                <span>Depth {node.depth}</span>
                <span>{node.children.length} children</span>
                {node.visitCount > 1 && <span>Visited {node.visitCount}×</span>}
              </div>
              <div className="flex flex-wrap gap-x-2 mt-1.5 text-2xs">
                {isActive && <span className="text-green-400 font-medium">● Currently active tab</span>}
                {node.isClosed && <span className="text-red-400">Tab closed</span>}
                {isRoot && <span className="text-brand-400">Root node</span>}
              </div>
              <div className="mt-2 pt-2 border-t border-surface-800 text-2xs text-surface-600">
                Click to select · Double-click to reopen
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);

MapNodeComponent.displayName = 'MapNode';