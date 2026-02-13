import React from 'react';
import { BarChart3, Globe, GitBranch, Layers, Clock, ArrowDown } from 'lucide-react';
import { useMapStore } from '@/hooks/useMapStore';
import { formatDuration, getDomainColor } from '@/lib/utils';

export const StatsPanel: React.FC = () => {
  const stats = useMapStore((s) => s.getStats());

  if (stats.totalNodes === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <BarChart3 className="w-8 h-8 text-surface-400 mx-auto mb-3" />
          <p className="text-sm text-surface-500">No data yet</p>
        </div>
      </div>
    );
  }

  const cards = [
    { label: 'Pages', value: stats.totalNodes, icon: <Globe className="w-4 h-4" />, color: 'text-brand-500' },
    { label: 'Max Depth', value: stats.maxDepth, icon: <ArrowDown className="w-4 h-4" />, color: 'text-purple-500' },
    { label: 'Branches', value: stats.totalBranches, icon: <GitBranch className="w-4 h-4" />, color: 'text-amber-500' },
    { label: 'Domains', value: stats.domains.length, icon: <Layers className="w-4 h-4" />, color: 'text-emerald-500' },
    { label: 'Duration', value: formatDuration(stats.duration), icon: <Clock className="w-4 h-4" />, color: 'text-rose-500' },
  ];

  return (
    <div className="p-4 space-y-5">
      <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300">Analytics</h3>
      <div className="grid grid-cols-2 gap-2">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl bg-surface-50 dark:bg-surface-800/50 p-3">
            <div className={`${c.color} mb-1.5`}>{c.icon}</div>
            <div className="text-lg font-bold text-surface-800 dark:text-surface-200">{c.value}</div>
            <div className="text-2xs text-surface-500">{c.label}</div>
          </div>
        ))}
      </div>
      <div>
        <h4 className="text-xs font-semibold text-surface-600 dark:text-surface-400 mb-2">Top Domains</h4>
        {stats.domains.slice(0, 8).map((domain) => (
          <div key={domain} className="flex items-center gap-2 py-1">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getDomainColor(domain) }} />
            <span className="text-xs text-surface-600 dark:text-surface-400 truncate">{domain}</span>
          </div>
        ))}
      </div>
    </div>
  );
};