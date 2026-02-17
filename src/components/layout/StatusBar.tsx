import React from 'react';
import { useMapStore } from '@/hooks/useMapStore';
import { Activity, Circle, GitBranch, Layers, Radio, Globe } from 'lucide-react';

export const StatusBar: React.FC = () => {
  const isRecording = useMapStore((s) => s.isRecording);
  const nodes = useMapStore((s) => s.nodes);
  const viewport = useMapStore((s) => s.viewport);
  const stats = useMapStore((s) => s.getStats());
  const centerOnNode = useMapStore((s) => s.centerOnNode);

  // Find active node
  const activeNode = Object.values(nodes).find(n => n.isActive);

  return (
    <footer className="h-8 flex items-center justify-between px-3 border-t border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-950 text-2xs text-surface-500 shrink-0 gap-4">
      {/* Left: Recording + Stats */}
      <div className="flex items-center gap-4 min-w-0">
        <span className="flex items-center gap-1.5 shrink-0">
          <Circle
            className={`w-2 h-2 ${isRecording ? 'text-green-500 fill-green-500' : 'text-surface-400 fill-surface-400'}`}
          />
          {isRecording ? 'Recording' : 'Paused'}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <Activity className="w-3 h-3" />{stats.totalNodes} nodes
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <GitBranch className="w-3 h-3" />{stats.totalBranches} branches
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <Layers className="w-3 h-3" />depth {stats.maxDepth}
        </span>
      </div>

      {/* Center: Active node */}
      {activeNode && (
        <button
          onClick={() => centerOnNode(activeNode.id)}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-surface-800 transition-colors min-w-0 max-w-[300px]"
          title="Click to center on active tab"
        >
          <Radio className="w-3 h-3 text-green-500 animate-pulse-soft shrink-0" />
          <span className="text-green-400 font-medium shrink-0">Active:</span>
          <span className="truncate text-surface-400">{activeNode.title}</span>
          {activeNode.domain && (
            <span className="flex items-center gap-0.5 shrink-0 text-surface-600">
              <Globe className="w-2.5 h-2.5" />
              {activeNode.domain}
            </span>
          )}
        </button>
      )}

      {/* Right: Zoom */}
      <div className="font-mono tabular-nums shrink-0">
        {Math.round(viewport.zoom * 100)}%
      </div>
    </footer>
  );
};