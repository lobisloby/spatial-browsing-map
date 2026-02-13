import React, { useEffect, useState } from 'react';
import { useMapStore } from '@/hooks/useMapStore';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { SpatialMap } from '@/components/map/SpatialMap';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { StatusBar } from '@/components/layout/StatusBar';
import { Logo } from '@/components/shared/Logo';
import type { ExtensionMessage } from '@/types/messages';

export const SidePanelApp: React.FC = () => {
  const { initSession, addNode, updateNode, isLoading, isRecording } = useMapStore();
  const { loadSettings } = useSettingsStore();
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    loadSettings();
    initSession();
  }, [loadSettings, initSession]);

  // Listen for messages from background
  useEffect(() => {
    const listener = (message: ExtensionMessage) => {
      if (!isRecording) return;

      if (message.type === 'MAP_DATA_UPDATED') {
        const p = message.payload as {
          url: string; title: string; favicon: string;
          parentId: string | null; tabId: number; windowId: number; edgeType?: string;
        };
        addNode({
          url: p.url,
          title: p.title,
          favicon: p.favicon,
          parentId: p.parentId,
          tabId: p.tabId,
          windowId: p.windowId,
          edgeType: (p.edgeType as any) || 'click',
        });
      }

      if (message.type === 'PAGE_METADATA') {
        const p = message.payload as { nodeId?: string; title?: string; favicon?: string };
        if (p.nodeId) {
          updateNode(p.nodeId, {
            ...(p.title && { title: p.title }),
            ...(p.favicon && { favicon: p.favicon }),
          });
        }
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [addNode, updateNode, isRecording]);

  if (isLoading) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center gap-4 bg-surface-950">
        <Logo size="lg" />
        <LoadingSpinner size="lg" />
        <p className="text-sm text-surface-500">Loading your browsing map...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen w-full overflow-hidden bg-surface-950">
        <Header onToggleSearch={() => setShowSearch(!showSearch)} showSearch={showSearch} />
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 min-w-0 relative">
            <SpatialMap />
          </div>
          <Sidebar showSearch={showSearch} />
        </div>
        <StatusBar />
      </div>
    </ErrorBoundary>
  );
};