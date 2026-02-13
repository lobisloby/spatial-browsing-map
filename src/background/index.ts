const tabNodeMap: Record<number, string> = {};
let isRecording = true;

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return ['http:', 'https:'].includes(u.protocol);
  } catch {
    return false;
  }
}

function isExcluded(url: string): boolean {
  const excluded = [
    'chrome://',
    'chrome-extension://',
    'about:',
    'edge://',
    'brave://',
    'chrome://newtab',
    'chrome://extensions',
  ];
  return excluded.some((e) => url.startsWith(e));
}

// ===== Installation =====
chrome.runtime.onInstalled.addListener(() => {
  console.log('[SpatialMap] Extension installed');
});

// ===== Track navigation =====
chrome.webNavigation.onCompleted.addListener(async (details) => {
  // Only main frame, only valid URLs, only when recording
  if (!isRecording) return;
  if (details.frameId !== 0) return;
  if (!isValidUrl(details.url)) return;
  if (isExcluded(details.url)) return;

  try {
    const tab = await chrome.tabs.get(details.tabId);
    if (!tab) return;

    // The parent is whatever node was last associated with this tab
    const parentId = tabNodeMap[details.tabId] || null;

    // Send to side panel / popup — let THEM create the node and tell us the ID
    chrome.runtime.sendMessage({
      type: 'MAP_DATA_UPDATED',
      payload: {
        url: details.url,
        title: tab.title || details.url,
        favicon: tab.favIconUrl || '',
        domain: extractDomain(details.url),
        parentId: parentId,
        tabId: details.tabId,
        windowId: tab.windowId ?? 0,
      },
      timestamp: Date.now(),
    }).catch(() => {
      // Side panel not open — that's OK
    });
  } catch (err) {
    // Tab might have been closed already
    console.error('[SpatialMap] Navigation tracking error:', err);
  }
});

// ===== Track new tabs =====
chrome.tabs.onCreated.addListener((tab) => {
  if (!isRecording || !tab.id) return;

  // If opened from another tab, inherit the parent mapping
  if (tab.openerTabId && tabNodeMap[tab.openerTabId]) {
    tabNodeMap[tab.id] = tabNodeMap[tab.openerTabId];
    console.log(
      `[SpatialMap] Tab ${tab.id} opened from tab ${tab.openerTabId}, ` +
      `parent node: ${tabNodeMap[tab.openerTabId]}`
    );
  }
});

// ===== Track tab title/favicon updates =====
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!isRecording) return;
  if (!changeInfo.title && !changeInfo.favIconUrl) return;

  const nodeId = tabNodeMap[tabId];
  if (!nodeId) return;

  chrome.runtime.sendMessage({
    type: 'PAGE_METADATA',
    payload: {
      nodeId,
      title: changeInfo.title || undefined,
      favicon: changeInfo.favIconUrl || undefined,
    },
    timestamp: Date.now(),
  }).catch(() => {});
});

// ===== Clean up closed tabs =====
chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabNodeMap[tabId];
});

// ===== Message handler =====
chrome.runtime.onMessage.addListener(
  (
    msg: { type: string; payload?: Record<string, unknown> },
    sender,
    sendResponse,
  ) => {
    switch (msg.type) {
      // Side panel tells us: "I created node X for tab Y"
      case 'NODE_CREATED': {
        const { nodeId, tabId } = msg.payload as {
          nodeId: string;
          tabId: number;
        };
        tabNodeMap[tabId] = nodeId;
        console.log(`[SpatialMap] Registered node ${nodeId} for tab ${tabId}`);
        sendResponse({ status: 'ok' });
        break;
      }

      case 'TOGGLE_RECORDING': {
        isRecording = !isRecording;
        console.log(`[SpatialMap] Recording: ${isRecording}`);
        sendResponse({ isRecording });
        break;
      }

      case 'GET_RECORDING_STATE': {
        sendResponse({ isRecording });
        break;
      }

      case 'OPEN_SIDE_PANEL': {
        if (chrome.sidePanel && sender.tab?.windowId) {
          chrome.sidePanel.open({ windowId: sender.tab.windowId });
        }
        sendResponse({ status: 'ok' });
        break;
      }

      // Get current tab-node mapping (for restoring state)
      case 'GET_TAB_MAP': {
        sendResponse({ tabNodeMap: { ...tabNodeMap } });
        break;
      }

      default:
        sendResponse({ status: 'unknown' });
    }

    return true; // Keep channel open for async
  },
);