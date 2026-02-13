// src/hooks/useChromeMessaging.ts
import { useEffect } from 'react';
import { useMapStore } from './useMapStore';
import type { ExtensionMessage } from '@/types/messages';

export function useChromeMessaging() {
  const { addNode, updateNode, isRecording } = useMapStore();

  useEffect(() => {
    const listener = (
      message: ExtensionMessage,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response?: unknown) => void,
    ) => {
      if (!isRecording) {
        sendResponse({ status: 'not_recording' });
        return;
      }

      switch (message.type) {
        case 'MAP_DATA_UPDATED': {
          const payload = message.payload as {
            url: string;
            title: string;
            favicon: string;
            parentId: string | null;
            tabId: number;
            windowId: number;
          };
          addNode(payload);
          sendResponse({ status: 'ok' });
          break;
        }

        case 'PAGE_METADATA': {
          const meta = message.payload as {
            nodeId: string;
            metadata: Record<string, unknown>;
          };
          updateNode(meta.nodeId, { metadata: meta.metadata as any });
          sendResponse({ status: 'ok' });
          break;
        }

        default:
          sendResponse({ status: 'unknown_type' });
      }

      return true; // Keep channel open for async
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [addNode, updateNode, isRecording]);
}