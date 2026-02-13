import React from 'react';
import { Sun, Moon, Monitor, RotateCcw } from 'lucide-react';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { Switch } from '../ui/Switch';
import { Button } from '../ui/Button';
import { Separator } from '../ui/Separator';

export const SettingsPanel: React.FC = () => {
  const { settings, updateSettings, resetSettings } = useSettingsStore();

  const themes = [
    { value: 'light' as const, icon: <Sun className="w-4 h-4" />, label: 'Light' },
    { value: 'dark' as const, icon: <Moon className="w-4 h-4" />, label: 'Dark' },
    { value: 'system' as const, icon: <Monitor className="w-4 h-4" />, label: 'System' },
  ];

  return (
    <div className="p-4 space-y-5">
      <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300">Settings</h3>
      <div>
        <label className="text-xs font-medium text-surface-600 dark:text-surface-400 mb-2 block">Theme</label>
        <div className="flex gap-1 p-0.5 bg-surface-100 dark:bg-surface-800 rounded-lg">
          {themes.map((t) => (
            <button
              key={t.value}
              onClick={() => updateSettings({ theme: t.value })}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                settings.theme === t.value
                  ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 shadow-sm'
                  : 'text-surface-500'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>
      <Separator />
      <div className="space-y-3">
        <Switch checked={settings.autoRecord} onChange={(v) => updateSettings({ autoRecord: v })} label="Auto Record" description="Track browsing automatically" />
        <Switch checked={settings.showFavicons} onChange={(v) => updateSettings({ showFavicons: v })} label="Show Favicons" />
        <Switch checked={settings.showLabels} onChange={(v) => updateSettings({ showLabels: v })} label="Show Labels" />
        <Switch checked={settings.animationsEnabled} onChange={(v) => updateSettings({ animationsEnabled: v })} label="Animations" />
        <Switch checked={settings.showMinimap} onChange={(v) => updateSettings({ showMinimap: v })} label="Show Minimap" />
      </div>
      <Separator />
      <Button variant="secondary" size="sm" className="w-full" onClick={resetSettings}>
        <RotateCcw className="w-3.5 h-3.5" /> Reset to Defaults
      </Button>
    </div>
  );
};