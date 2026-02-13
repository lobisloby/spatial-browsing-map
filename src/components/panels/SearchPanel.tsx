import React from 'react';
import { Search, X } from 'lucide-react';
import { useMapStore } from '@/hooks/useMapStore';
import { Input } from '../ui/Input';
import { truncateText, formatTimestamp } from '@/lib/utils';

export const SearchPanel: React.FC = () => {
  const { searchQuery, setSearchQuery, filteredNodeIds, nodes, centerOnNode, selectNode } = useMapStore();
  const results = filteredNodeIds ? filteredNodeIds.map((id) => nodes[id]).filter(Boolean) : [];

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-surface-200 dark:border-surface-800">
        <Input
          icon={<Search className="w-4 h-4" />}
          placeholder="Search pages, domains..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          suffix={searchQuery ? <button onClick={() => setSearchQuery('')}><X className="w-3.5 h-3.5" /></button> : undefined}
        />
        {searchQuery && <div className="mt-2 text-2xs text-surface-500">{results.length} results</div>}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {results.map((node) => (
          <button
            key={node.id}
            onClick={() => { selectNode(node.id); centerOnNode(node.id); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-left"
          >
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-surface-700 dark:text-surface-300 truncate">{truncateText(node.title, 40)}</div>
              <div className="text-2xs text-surface-500 truncate">{node.domain} · {formatTimestamp(node.timestamp)}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};