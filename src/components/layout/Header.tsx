import React, { useState, useEffect } from 'react';
import {
  Search, Play, Pause, Trash2, Download,
  MoreHorizontal, Pencil, Check, X,
} from 'lucide-react';
import { useMapStore } from '@/hooks/useMapStore';
import { Logo } from '../shared/Logo';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Tooltip } from '../ui/Tooltip';
import { DropdownMenu } from '../ui/DropdownMenu';
import { storage } from '@/lib/storage';

interface HeaderProps {
  onToggleSearch: () => void;
  showSearch: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSearch, showSearch }) => {
  const isRecording = useMapStore((s) => s.isRecording);
  const setRecording = useMapStore((s) => s.setRecording);
  const nodes = useMapStore((s) => s.nodes);
  const session = useMapStore((s) => s.session);
  const clearSession = useMapStore((s) => s.clearSession);
  const renameSession = useMapStore((s) => s.renameSession);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');

  const count = Object.keys(nodes).length;

  // Sync recording state from background on mount
  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_RECORDING_STATE' })
      .then((response) => {
        if (response && typeof response.isRecording === 'boolean') {
          setRecording(response.isRecording);
        }
      })
      .catch(() => {});
  }, [setRecording]);

  const startEdit = () => {
    setEditName(session?.name || '');
    setIsEditing(true);
  };

  const confirmEdit = () => {
    if (editName.trim()) {
      renameSession(editName.trim());
    }
    setIsEditing(false);
  };

  const handleExport = async () => {
    if (!session) return;
    try {
      const json = await storage.exportSession(session.id);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spatial-map-${session.name.replace(/\s+/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleToggleRecording = async () => {
    try {
      // Send TOGGLE_RECORDING to background — it toggles and responds
      const response = await chrome.runtime.sendMessage({ 
        type: 'TOGGLE_RECORDING' 
      });

      // Update local state from background's authoritative response
      if (response && typeof response.isRecording === 'boolean') {
        setRecording(response.isRecording);
      } else {
        // Fallback: toggle locally
        setRecording(!isRecording);
      }
    } catch (err) {
      console.error('Failed to toggle recording:', err);
      // Fallback: toggle locally
      setRecording(!isRecording);
    }
  };

  return (
    <header className="h-12 flex items-center justify-between px-3 border-b border-surface-200 dark:border-surface-800 bg-white/80 dark:bg-surface-900/80 backdrop-blur-xl shrink-0">
      <div className="flex items-center gap-3">
        <Logo size="sm" />

        {/* Session name */}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmEdit();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
                className="px-2 py-0.5 text-sm bg-surface-800 border border-brand-500 rounded text-surface-200 focus:outline-none w-40"
              />
              <button onClick={confirmEdit} className="text-green-500 hover:text-green-400">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setIsEditing(false)} className="text-surface-400 hover:text-surface-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={startEdit}
              className="flex items-center gap-1.5 text-xs text-surface-400 hover:text-surface-200 transition-colors group"
            >
              <span className="font-medium">{session?.name || 'Untitled'}</span>
              <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}

          {count > 0 && <Badge variant="primary" size="sm">{count} pages</Badge>}

          {/* Recording status indicator */}
          <div className="flex items-center gap-1.5 ml-1">
            <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-green-500 animate-pulse' : 'bg-surface-500'}`} />
            <span className="text-2xs text-surface-500">
              {isRecording ? 'Recording' : 'Paused'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Tooltip content={isRecording ? 'Pause recording' : 'Resume recording'} side="bottom">
          <Button
            variant="icon"
            onClick={handleToggleRecording}
            className={isRecording ? 'text-green-500' : 'text-surface-400'}
          >
            {isRecording ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
        </Tooltip>

        <Tooltip content="Search (Ctrl+F)" side="bottom">
          <Button variant="icon" onClick={onToggleSearch} className={showSearch ? 'text-brand-500' : undefined}>
            <Search className="w-4 h-4" />
          </Button>
        </Tooltip>

        <DropdownMenu
          trigger={<Button variant="icon"><MoreHorizontal className="w-4 h-4" /></Button>}
          items={[
            { label: 'Export Session', icon: <Download className="w-4 h-4" />, onClick: handleExport, disabled: count === 0 },
            'separator',
            { label: 'Clear Map', icon: <Trash2 className="w-4 h-4" />, onClick: clearSession, variant: 'danger', disabled: count === 0 },
          ]}
        />
      </div>
    </header>
  );
};