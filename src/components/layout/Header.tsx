import React from 'react';
import { Search, Play, Pause, Trash2, Download, MoreHorizontal, Settings } from 'lucide-react';
import { useMapStore } from '@/hooks/useMapStore';
import { Logo } from '../shared/Logo';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Tooltip } from '../ui/Tooltip';
import { DropdownMenu } from '../ui/DropdownMenu';

interface HeaderProps {
  onToggleSearch: () => void;
  showSearch: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSearch, showSearch }) => {
  const { isRecording, setRecording, nodes, clearSession } = useMapStore();
  const count = Object.keys(nodes).length;

  return (
    <header className="h-12 flex items-center justify-between px-3 border-b border-surface-200 dark:border-surface-800 bg-white/80 dark:bg-surface-900/80 backdrop-blur-xl shrink-0">
      <div className="flex items-center gap-3">
        <Logo size="sm" />
        {count > 0 && <Badge variant="primary" size="sm">{count} pages</Badge>}
      </div>
      <div className="flex items-center gap-1">
        <Tooltip content={isRecording ? 'Pause' : 'Resume'} side="bottom">
          <Button variant="icon" onClick={() => setRecording(!isRecording)} className={isRecording ? 'text-green-500' : 'text-surface-400'}>
            {isRecording ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
        </Tooltip>
        <Tooltip content="Search" side="bottom">
          <Button variant="icon" onClick={onToggleSearch} className={showSearch ? 'text-brand-500' : undefined}>
            <Search className="w-4 h-4" />
          </Button>
        </Tooltip>
        <DropdownMenu
          trigger={<Button variant="icon"><MoreHorizontal className="w-4 h-4" /></Button>}
          items={[
            { label: 'Export Session', icon: <Download className="w-4 h-4" />, onClick: () => {}, disabled: count === 0 },
            'separator',
            { label: 'Clear Map', icon: <Trash2 className="w-4 h-4" />, onClick: clearSession, variant: 'danger', disabled: count === 0 },
          ]}
        />
      </div>
    </header>
  );
};