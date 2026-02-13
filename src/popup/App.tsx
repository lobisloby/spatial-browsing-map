import React, { useEffect, useState } from 'react';
import {
  PanelRightOpen, Play, Pause, GitBranch, Globe,
  Layers, ArrowDown, Coffee, ExternalLink, Heart,
} from 'lucide-react';
import { Logo } from '@/components/shared/Logo';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';
import { storage } from '@/lib/storage';
import type { SessionStats } from '@/types/map';

export const PopupApp: React.FC = () => {
  const [recording, setRecording] = useState(true);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [name, setName] = useState('');

  useEffect(() => {
    // Load active session stats
    storage.getActiveSession().then((s) => {
      if (s) {
        setStats(s.stats);
        setName(s.name);
      }
    });

    // Get recording state from background
    chrome.runtime
      .sendMessage({ type: 'GET_RECORDING_STATE' })
      .then((res) => {
        if (res && typeof res.isRecording === 'boolean') {
          setRecording(res.isRecording);
        }
      })
      .catch(() => {});
  }, []);

  const openPanel = async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.windowId && chrome.sidePanel) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
      window.close();
    }
  };

  const toggleRecording = async () => {
    try {
      const res = await chrome.runtime.sendMessage({
        type: 'TOGGLE_RECORDING',
        payload: {},
        timestamp: Date.now(),
      });
      if (res && typeof res.isRecording === 'boolean') {
        setRecording(res.isRecording);
      }
    } catch {
      // Toggle locally
      setRecording((r) => !r);
    }
  };

  return (
    <div className="w-[320px] bg-white dark:bg-surface-900">
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <Logo size="sm" />
          <Badge variant={recording ? 'success' : 'warning'} size="sm">
            {recording ? 'Recording' : 'Paused'}
          </Badge>
        </div>
        {name && (
          <p className="text-xs text-surface-500">
            Active:{' '}
            <span className="font-medium text-surface-700 dark:text-surface-300">
              {name}
            </span>
          </p>
        )}
      </div>

      {stats && stats.totalNodes > 0 && (
        <>
          <Separator />
          <div className="grid grid-cols-4 gap-0 p-3">
            {[
              { icon: <Globe className="w-3.5 h-3.5" />, value: stats.totalNodes, label: 'Pages' },
              { icon: <ArrowDown className="w-3.5 h-3.5" />, value: stats.maxDepth, label: 'Depth' },
              { icon: <GitBranch className="w-3.5 h-3.5" />, value: stats.totalBranches, label: 'Branches' },
              { icon: <Layers className="w-3.5 h-3.5" />, value: stats.domains.length, label: 'Domains' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-brand-500 flex justify-center mb-1">
                  {s.icon}
                </div>
                <div className="text-sm font-bold text-surface-800 dark:text-surface-200">
                  {s.value}
                </div>
                <div className="text-2xs text-surface-500">{s.label}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <Separator />

      <div className="p-3 space-y-2">
        <Button variant="primary" className="w-full" onClick={openPanel}>
          <PanelRightOpen className="w-4 h-4" /> Open Spatial Map
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={toggleRecording}
        >
          {recording ? (
            <>
              <Pause className="w-3.5 h-3.5" /> Pause Recording
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" /> Resume Recording
            </>
          )}
        </Button>
      </div>

      <Separator />

      <div className="p-3">
        <button
          onClick={() =>
            chrome.tabs.create({
              url: 'https://buymeacoffee.com/YOUR_USERNAME',
            })
          }
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800/50 hover:shadow-md transition-all"
        >
          <Coffee className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-medium text-amber-800 dark:text-amber-300 flex-1 text-left">
            Support this project
          </span>
          <ExternalLink className="w-3.5 h-3.5 text-amber-500" />
        </button>
      </div>

      <div className="px-3 pb-3 text-center">
        <p className="text-2xs text-surface-400">
          v1.0.0 · Made with{' '}
          <Heart
            className="w-3 h-3 inline text-red-500"
            fill="currentColor"
          />{' '}
          for researchers
        </p>
      </div>
    </div>
  );
};