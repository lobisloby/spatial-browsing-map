import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useMapStore } from '@/hooks/useMapStore';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { SpatialMap } from '@/components/map/SpatialMap';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { StatusBar } from '@/components/layout/StatusBar';
import { Logo } from '@/components/shared/Logo';
import type { MapSession } from '@/types/map';

export const MapApp: React.FC = () => {
  const initSession = useMapStore((s) => s.initSession);
  const syncFromStorage = useMapStore((s) => s.syncFromStorage);
  const isLoading = useMapStore((s) => s.isLoading);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const [showSearch, setShowSearch] = useState(false);
  const initialized = useRef(false);

  // Init
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadSettings();
    initSession();
  }, [loadSettings, initSession]);

  // Poll storage for updates from background
  useEffect(() => {
    let lastUpdate = 0;

    const poll = async () => {
      try {
        const result = await chrome.storage.local.get('sbm_active_session');
        const session: MapSession | null = result.sbm_active_session || null;
        if (!session) return;

        // Only sync if data changed
        if (session.updatedAt > lastUpdate) {
          lastUpdate = session.updatedAt;
          syncFromStorage(session);
        }
      } catch {}
    };

    // Poll every 500ms
    const interval = setInterval(poll, 500);

    // Also listen for storage changes (faster than polling)
    const storageListener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string,
    ) => {
      if (area === 'local' && changes.sbm_active_session?.newValue) {
        const session = changes.sbm_active_session.newValue as MapSession;
        if (session.updatedAt > lastUpdate) {
          lastUpdate = session.updatedAt;
          syncFromStorage(session);
        }
      }
    };

    chrome.storage.onChanged.addListener(storageListener);

    return () => {
      clearInterval(interval);
      chrome.storage.onChanged.removeListener(storageListener);
    };
  }, [syncFromStorage]);

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