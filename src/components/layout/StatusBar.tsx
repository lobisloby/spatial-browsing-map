import React from 'react';
import { useMapStore } from '@/hooks/useMapStore';
import { Activity, Circle, GitBranch, Layers } from 'lucide-react';

export const StatusBar: React.FC = () => {
  const { isRecording, viewport } = useMapStore();
  const stats = useMapStore((s) => s.getStats());

  return (
    <footer className="h-7 flex items-center justify-between px-3 border-t border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-950 text-2xs text-surface-500 shrink-0">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <Circle className={`w-2 h-2 ${isRecording ? 'text-green-500 fill-green-500' : 'text-surface-400 fill-surface-400'}`} />
          {isRecording ? 'Recording' : 'Paused'}
        </span>
        <span className="flex items-center gap-1"><Activity className="w-3 h-3" />{stats.totalNodes} nodes</span>
        <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" />{stats.totalBranches} branches</span>
        <span className="flex items-center gap-1"><Layers className="w-3 h-3" />depth {stats.maxDepth}</span>
      </div>
      <div className="font-mono tabular-nums">{Math.round(viewport.zoom * 100)}%</div>
    </footer>
  );
};