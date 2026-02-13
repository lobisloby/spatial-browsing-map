import React, { useState } from 'react';
import { FolderOpen, BarChart3, Settings, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip } from '../ui/Tooltip';
import { SessionPanel } from '../panels/SessionPanel';
import { StatsPanel } from '../panels/StatsPanel';
import { SettingsPanel } from '../panels/SettingsPanel';
import { SupportPanel } from '../panels/SupportPanel';
import { SearchPanel } from '../panels/SearchPanel';

type TabId = 'sessions' | 'stats' | 'settings' | 'support';

const tabs: { id: TabId; icon: typeof FolderOpen; label: string }[] = [
  { id: 'sessions', icon: FolderOpen, label: 'Sessions' },
  { id: 'stats', icon: BarChart3, label: 'Analytics' },
  { id: 'settings', icon: Settings, label: 'Settings' },
  { id: 'support', icon: Heart, label: 'Support' },
];

export const Sidebar: React.FC<{ showSearch: boolean }> = ({ showSearch }) => {
  const [activeTab, setActiveTab] = useState<TabId>('sessions');
  const [collapsed, setCollapsed] = useState(false);

  const panel = () => {
    if (showSearch) return <SearchPanel />;
    switch (activeTab) {
      case 'sessions': return <SessionPanel />;
      case 'stats': return <StatsPanel />;
      case 'settings': return <SettingsPanel />;
      case 'support': return <SupportPanel />;
    }
  };

  return (
    <div className={cn('flex shrink-0 border-l border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 transition-all duration-300', collapsed ? 'w-12' : 'w-72')}>
      <div className="w-12 shrink-0 flex flex-col items-center py-2 gap-1 border-l border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-950">
        {tabs.map((tab) => (
          <Tooltip key={tab.id} content={tab.label} side="left">
            <button
              onClick={() => { setActiveTab(tab.id); if (collapsed) setCollapsed(false); }}
              className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center transition-all',
                activeTab === tab.id && !showSearch
                  ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
                  : 'text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800',
              )}
            >
              <tab.icon className="w-4 h-4" />
            </button>
          </Tooltip>
        ))}
        <div className="flex-1" />
        <Tooltip content={collapsed ? 'Expand' : 'Collapse'} side="left">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all"
          >
            {collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </Tooltip>
      </div>
      {!collapsed && <div className="flex-1 min-w-0 overflow-y-auto">{panel()}</div>}
    </div>
  );
};