import React, { useEffect, useState } from 'react';
import {
  FolderOpen, Plus, Trash2, Calendar, GitBranch, Globe,
  MoreVertical, Pencil, Check, X, AlertTriangle,
} from 'lucide-react';
import { useSessionStore } from '@/hooks/useSessionStore';
import { useMapStore } from '@/hooks/useMapStore';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { DropdownMenu } from '../ui/DropdownMenu';
import { EmptyState } from '../shared/EmptyState';
import { formatTimestamp } from '@/lib/utils';
import { storage } from '@/lib/storage';

export const SessionPanel: React.FC = () => {
  const loadSessions = useSessionStore((s) => s.loadSessions);
  const filteredSessions = useSessionStore((s) => s.getFilteredSessions());
  const loadSession = useMapStore((s) => s.loadSession);
  const newSession = useMapStore((s) => s.newSession);
  const activeSession = useMapStore((s) => s.session);
  const renameSession = useMapStore((s) => s.renameSession);
  const nodeCount = Object.keys(useMapStore((s) => s.nodes)).length;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadSessions(); }, [loadSessions]);
  useEffect(() => {
    const t = setTimeout(() => loadSessions(), 300);
    return () => clearTimeout(t);
  }, [activeSession?.id, nodeCount, loadSessions]);

  const startRename = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
    setConfirmDeleteId(null);
  };

  const confirmRename = async () => {
    if (!editingId || !editName.trim()) return;
    if (editingId === activeSession?.id) {
      renameSession(editName.trim());
    } else {
      const sessions = await storage.getSessions();
      const s = sessions.find((x) => x.id === editingId);
      if (s) { s.name = editName.trim(); await storage.saveSession(s); }
    }
    setEditingId(null);
    setTimeout(() => loadSessions(), 100);
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await storage.deleteSession(id);

      if (id === activeSession?.id) {
        await storage.clearActiveSession();
        const remaining = await storage.getSessions();
        if (remaining.length > 0) {
          const latest = remaining[0];
          await storage.setActiveSession(latest);
          useMapStore.setState({
            session: latest,
            nodes: latest.nodes || {},
            edges: latest.edges || [],
            rootNodes: latest.rootNodes || [],
            selectedNodeId: null,
          });
        } else {
          await newSession('New Session');
        }
      }

      setConfirmDeleteId(null);
      setTimeout(() => loadSessions(), 100);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-surface-200 dark:border-surface-800">
        <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300">
          Sessions <span className="text-2xs font-normal text-surface-500">({filteredSessions.length})</span>
        </h3>
        <Button variant="primary" size="sm" onClick={() => newSession(`Session ${filteredSessions.length + 1}`).then(() => setTimeout(() => loadSessions(), 100))}>
          <Plus className="w-3.5 h-3.5" /> New
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredSessions.length === 0 ? (
          <EmptyState icon={<FolderOpen className="w-6 h-6" />} title="No sessions" description="Click 'New' to create one." />
        ) : (
          <div className="p-2 space-y-1">
            {filteredSessions.map((s) => {
              const isActive = activeSession?.id === s.id;
              const isEditing = editingId === s.id;
              const isConfirming = confirmDeleteId === s.id;

              return (
                <div
                  key={s.id}
                  className={`group rounded-xl p-3 transition-all ${
                    isActive
                      ? 'bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800'
                      : 'border border-transparent hover:bg-surface-100 dark:hover:bg-surface-800/50 cursor-pointer'
                  }`}
                  onClick={() => { if (!isEditing && !isConfirming) loadSession(s.id); }}
                >
                  {isConfirming ? (
                    <div className="space-y-2.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2 text-amber-500">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-xs font-medium">Delete "{s.name}"?</span>
                      </div>
                      <p className="text-2xs text-surface-500">
                        Permanently remove{s.nodeCount > 0 ? ` ${s.nodeCount} pages` : ''}. Cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <Button variant="danger" size="sm" className="flex-1" disabled={deleting} onClick={() => handleDelete(s.id)}>
                          <Trash2 className="w-3 h-3" /> {deleting ? 'Deleting...' : 'Delete'}
                        </Button>
                        <Button variant="secondary" size="sm" className="flex-1" onClick={() => setConfirmDeleteId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                autoFocus value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setEditingId(null); }}
                                className="flex-1 px-2 py-0.5 text-sm bg-surface-800 border border-brand-500 rounded text-surface-200 focus:outline-none min-w-0"
                              />
                              <button onClick={confirmRename} className="w-6 h-6 flex items-center justify-center rounded hover:bg-green-900/30 text-green-500"><Check className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setEditingId(null)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-700 text-surface-400"><X className="w-3.5 h-3.5" /></button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">{s.name}</h4>
                                {isActive && <Badge variant="success" size="sm">Active</Badge>}
                              </div>
                              <div className="flex items-center gap-1 mt-1 text-2xs text-surface-500">
                                <Calendar className="w-3 h-3" /> {formatTimestamp(s.startedAt)}
                              </div>
                            </>
                          )}
                        </div>
                        {!isEditing && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu
                              trigger={<Button variant="icon" className="opacity-0 group-hover:opacity-100"><MoreVertical className="w-3.5 h-3.5" /></Button>}
                              items={[
                                { label: 'Rename', icon: <Pencil className="w-4 h-4" />, onClick: () => startRename(s.id, s.name) },
                                'separator',
                                { label: 'Delete', icon: <Trash2 className="w-4 h-4" />, onClick: () => { setConfirmDeleteId(s.id); setEditingId(null); }, variant: 'danger' },
                              ]}
                            />
                          </div>
                        )}
                      </div>
                      {!isEditing && (
                        <div className="flex items-center gap-3 text-2xs text-surface-500">
                          <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {s.nodeCount} pages</span>
                          <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" /> Depth {s.maxDepth}</span>
                          <span>{s.domains.length} domain{s.domains.length !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </>
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