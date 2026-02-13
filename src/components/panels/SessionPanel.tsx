import React, { useEffect, useState } from 'react';
import {
  FolderOpen, Plus, Trash2, Calendar, GitBranch, Globe,
  MoreVertical, Pencil, Check, X,
} from 'lucide-react';
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
  const { loadSession, newSession, session: activeSession, renameSession } = useMapStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Reload sessions when active session changes
  useEffect(() => {
    loadSessions();
  }, [activeSession?.id, activeSession?.stats.totalNodes, loadSessions]);

  const startRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const confirmRename = async () => {
    if (!editingId || !editName.trim()) return;
    if (editingId === activeSession?.id) {
      renameSession(editName.trim());
    } else {
      // Rename non-active session
      const { storage } = await import('@/lib/storage');
      const sessions = await storage.getSessions();
      const session = sessions.find((s) => s.id === editingId);
      if (session) {
        session.name = editName.trim();
        await storage.saveSession(session);
      }
    }
    setEditingId(null);
    setEditName('');
    loadSessions();
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleDelete = async (id: string) => {
    if (id === activeSession?.id) {
      // Delete current session and create new
      const mapStore = useMapStore.getState();
      await mapStore.deleteCurrentSession();
    } else {
      await deleteSession(id);
    }
    loadSessions();
  };

  const handleNewSession = async () => {
    const count = filteredSessions.length + 1;
    await newSession(`Session ${count}`);
    loadSessions();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-surface-200 dark:border-surface-800">
        <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300">
          Sessions
        </h3>
        <Button variant="primary" size="sm" onClick={handleNewSession}>
          <Plus className="w-3.5 h-3.5" /> New
        </Button>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto">
        {filteredSessions.length === 0 ? (
          <EmptyState
            icon={<FolderOpen className="w-6 h-6" />}
            title="No sessions"
            description="Click 'New' to start tracking."
          />
        ) : (
          <div className="p-2 space-y-1">
            {filteredSessions.map((s) => {
              const isActive = activeSession?.id === s.id;
              const isEditing = editingId === s.id;

              return (
                <div
                  key={s.id}
                  className={`group rounded-xl p-3 cursor-pointer transition-all ${
                    isActive
                      ? 'bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800'
                      : 'border border-transparent hover:bg-surface-100 dark:hover:bg-surface-800/50'
                  }`}
                  onClick={() => {
                    if (!isEditing) loadSession(s.id);
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') confirmRename();
                              if (e.key === 'Escape') cancelRename();
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 px-2 py-0.5 text-sm bg-surface-800 border border-brand-500 rounded text-surface-200 focus:outline-none"
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); confirmRename(); }}
                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-green-900/30 text-green-500"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); cancelRename(); }}
                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-700 text-surface-400"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">
                            {s.name}
                          </h4>
                          {s.isActive && <Badge variant="success" size="sm">Active</Badge>}
                        </div>
                      )}

                      {!isEditing && (
                        <div className="flex items-center gap-1 mt-1 text-2xs text-surface-500">
                          <Calendar className="w-3 h-3" /> {formatTimestamp(s.startedAt)}
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <DropdownMenu
                        trigger={
                          <Button
                            variant="icon"
                            className="opacity-0 group-hover:opacity-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </Button>
                        }
                        items={[
                          {
                            label: 'Rename',
                            icon: <Pencil className="w-4 h-4" />,
                            onClick: () => startRename(s.id, s.name),
                          },
                          'separator',
                          {
                            label: 'Delete',
                            icon: <Trash2 className="w-4 h-4" />,
                            onClick: () => handleDelete(s.id),
                            variant: 'danger',
                          },
                        ]}
                      />
                    )}
                  </div>

                  {/* Stats row */}
                  {!isEditing && (
                    <div className="flex items-center gap-3 text-2xs text-surface-500">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {s.nodeCount} pages
                      </span>
                      <span className="flex items-center gap-1">
                        <GitBranch className="w-3 h-3" />
                        Depth {s.maxDepth}
                      </span>
                      <span>
                        {s.domains.length} domain{s.domains.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};