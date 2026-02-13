import React, { useEffect } from 'react';
import { FolderOpen, Plus, Trash2, Calendar, GitBranch, Globe, MoreVertical } from 'lucide-react';
import { useSessionStore } from '@/hooks/useSessionStore';
import { useMapStore } from '@/hooks/useMapStore';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { DropdownMenu } from '../ui/DropdownMenu';
import { EmptyState } from '../shared/EmptyState';
import { formatTimestamp } from '@/lib/utils';

export const SessionPanel: React.FC = () => {
  const { loadSessions, deleteSession } = useSessionStore();
  const filteredSessions = useSessionStore((s) => s.getFilteredSessions());
  const { loadSession, newSession, session: activeSession } = useMapStore();

  useEffect(() => { loadSessions(); }, [loadSessions]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-surface-200 dark:border-surface-800">
        <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300">Sessions</h3>
        <Button variant="primary" size="sm" onClick={() => newSession()}>
          <Plus className="w-3.5 h-3.5" /> New
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredSessions.length === 0 ? (
          <EmptyState icon={<FolderOpen className="w-6 h-6" />} title="No sessions" description="Your sessions will appear here." />
        ) : (
          <div className="p-2 space-y-1">
            {filteredSessions.map((s) => (
              <div
                key={s.id}
                className={`group rounded-xl p-3 cursor-pointer transition-all hover:bg-surface-100 dark:hover:bg-surface-800/50 ${
                  activeSession?.id === s.id ? 'bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800' : 'border border-transparent'
                }`}
                onClick={() => loadSession(s.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">{s.name}</h4>
                      {s.isActive && <Badge variant="success" size="sm">Active</Badge>}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-2xs text-surface-500">
                      <Calendar className="w-3 h-3" /> {formatTimestamp(s.startedAt)}
                    </div>
                  </div>
                  <DropdownMenu
                    trigger={<Button variant="icon" className="opacity-0 group-hover:opacity-100"><MoreVertical className="w-3.5 h-3.5" /></Button>}
                    items={[{ label: 'Delete', icon: <Trash2 className="w-4 h-4" />, onClick: () => deleteSession(s.id), variant: 'danger' }]}
                  />
                </div>
                <div className="flex items-center gap-3 text-2xs text-surface-500">
                  <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{s.nodeCount} pages</span>
                  <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" />Depth {s.maxDepth}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};