import React, { useEffect, useState, useCallback } from 'react';
import { useMapStore } from '@/hooks/useMapStore';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { SpatialMap } from '@/components/map/SpatialMap';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { StatusBar } from '@/components/layout/StatusBar';
import { Logo } from '@/components/shared/Logo';

interface NavigationPayload {
  url: string;
  title: string;
  favicon: string;
  domain: string;
  parentId: string | null;
  tabId: number;
  windowId: number;
}

interface MetadataPayload {
  nodeId?: string;
  title?: string;
  favicon?: string;
}

export const SidePanelApp: React.FC = () => {
  const { initSession, addNode, updateNode, isLoading, isRecording } =
    useMapStore();
  const { loadSettings } = useSettingsStore();
  const [showSearch, setShowSearch] = useState(false);

  // Initialize stores
  useEffect(() => {
    loadSettings();
    initSession();
  }, [loadSettings, initSession]);

  // Handle incoming navigation data
  const handleNavigation = useCallback(
    (payload: NavigationPayload) => {
      if (!isRecording) return;

      // Create the node in our store
      const newNode = addNode({
        url: payload.url,
        title: payload.title,
        favicon: payload.favicon,
        parentId: payload.parentId,
        tabId: payload.tabId,
        windowId: payload.windowId,
        edgeType: 'click',
      });

      // CRITICAL: Tell background what nodeId we assigned to this tab
      // So next navigation from this tab uses THIS node as parent
      chrome.runtime.sendMessage({
        type: 'NODE_CREATED',
        payload: {
          nodeId: newNode.id,
          tabId: payload.tabId,
        },
      }).catch(() => {
        // Background not available
      });
    },
    [addNode, isRecording],
  );

  // Handle metadata updates
  const handleMetadata = useCallback(
    (payload: MetadataPayload) => {
      if (!payload.nodeId) return;
      const updates: Partial<{ title: string; favicon: string }> = {};
      if (payload.title) updates.title = payload.title;
      if (payload.favicon) updates.favicon = payload.favicon;
      if (Object.keys(updates).length > 0) {
        updateNode(payload.nodeId, updates);
      }
    },
    [updateNode],
  );

  // Listen for messages from background
  useEffect(() => {
    const listener = (
      message: { type: string; payload: unknown },
      _sender: chrome.runtime.MessageSender,
      sendResponse: (resp?: unknown) => void,
    ) => {
      switch (message.type) {
        case 'MAP_DATA_UPDATED':
          handleNavigation(message.payload as NavigationPayload);
          sendResponse({ status: 'ok' });
          break;

        case 'PAGE_METADATA':
          handleMetadata(message.payload as MetadataPayload);
          sendResponse({ status: 'ok' });
          break;

        default:
          sendResponse({ status: 'ignored' });
      }

      return true;
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [handleNavigation, handleMetadata]);

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