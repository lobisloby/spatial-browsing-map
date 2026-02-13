import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useMapStore } from '@/hooks/useMapStore';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { SpatialMap } from '@/components/map/SpatialMap';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { StatusBar } from '@/components/layout/StatusBar';
import { Logo } from '@/components/shared/Logo';

export const MapApp: React.FC = () => {
  const initSession = useMapStore((s) => s.initSession);
  const isLoading = useMapStore((s) => s.isLoading);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const [showSearch, setShowSearch] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadSettings();
    initSession();
  }, [loadSettings, initSession]);

  // Poll storage for updates from background script
  useEffect(() => {
    const interval = setInterval(async () => {
      const state = useMapStore.getState();
      if (!state.session) return;

      try {
        const result = await chrome.storage.local.get('sbm_live_nodes');
        const liveData = result.sbm_live_nodes;
        if (!liveData || !Array.isArray(liveData) || liveData.length === 0) return;

        // Clear the queue
        await chrome.storage.local.set({ sbm_live_nodes: [] });

        // Process each queued navigation
        for (const nav of liveData) {
          const newNode = state.addNode({
            url: nav.url,
            title: nav.title,
            favicon: nav.favicon,
            parentId: nav.parentId,
            tabId: nav.tabId,
            windowId: nav.windowId,
            edgeType: nav.edgeType || 'click',
          });

          // Tell background the nodeId we created
          chrome.runtime.sendMessage({
            type: 'NODE_CREATED',
            payload: { nodeId: newNode.id, tabId: nav.tabId },
          }).catch(() => {});
        }
      } catch {
        // Storage access error
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Also listen for direct messages
  useEffect(() => {
    const listener = (
      message: { type: string; payload: Record<string, unknown> },
      _sender: chrome.runtime.MessageSender,
      sendResponse: (r?: unknown) => void,
    ) => {
      const state = useMapStore.getState();

      if (message.type === 'MAP_DATA_UPDATED' && state.isRecording) {
        const p = message.payload;
        const newNode = state.addNode({
          url: p.url as string,
          title: p.title as string,
          favicon: (p.favicon as string) || '',
          parentId: (p.parentId as string) || null,
          tabId: p.tabId as number,
          windowId: (p.windowId as number) || 0,
          edgeType: (p.edgeType as string as any) || 'click',
        });

        // Sync ID back to background
        chrome.runtime.sendMessage({
          type: 'NODE_CREATED',
          payload: { nodeId: newNode.id, tabId: p.tabId },
        }).catch(() => {});

        sendResponse({ status: 'ok', nodeId: newNode.id });
      } else if (message.type === 'PAGE_METADATA') {
        const p = message.payload;
        if (p.nodeId) {
          state.updateNode(p.nodeId as string, {
            ...(p.title ? { title: p.title as string } : {}),
            ...(p.favicon ? { favicon: p.favicon as string } : {}),
          });
        }
        sendResponse({ status: 'ok' });
      }

      return true;
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

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
        <Header
          onToggleSearch={() => setShowSearch(!showSearch)}
          showSearch={showSearch}
        />
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