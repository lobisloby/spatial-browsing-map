/* 
  Background service worker
  - Tracks tab navigations
  - Maintains tab → nodeId mapping
  - Queues navigation events to storage for the map page to consume
  - Also sends direct runtime messages (if map page is open)
*/

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
  return [
    'chrome://', 'chrome-extension://', 'about:',
    'edge://', 'brave://', 'devtools://',
    'chrome://newtab', 'chrome://extensions',
  ].some((e) => url.startsWith(e));
}

// Queue a navigation event to storage + send direct message
async function queueNavigation(data: {
  url: string;
  title: string;
  favicon: string;
  parentId: string | null;
  tabId: number;
  windowId: number;
  edgeType: string;
}) {
  // Try direct message first (map page might be listening)
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'MAP_DATA_UPDATED',
      payload: data,
      timestamp: Date.now(),
    });

    // If map page responded with a nodeId, update our mapping
    if (response?.nodeId) {
      tabNodeMap[data.tabId] = response.nodeId;
      return; // Direct delivery succeeded
    }
  } catch {
    // Map page not open, fall through to storage queue
  }

  // Queue to storage for when map page opens or polls
  try {
    const result = await chrome.storage.local.get('sbm_live_nodes');
    const queue: unknown[] = result.sbm_live_nodes || [];
    queue.push(data);

    // Keep queue reasonable
    if (queue.length > 200) {
      queue.splice(0, queue.length - 200);
    }

    await chrome.storage.local.set({ sbm_live_nodes: queue });
  } catch (err) {
    console.error('[SpatialMap] Queue error:', err);
  }
}

// ===== Installation =====
chrome.runtime.onInstalled.addListener(() => {
  console.log('[SpatialMap] Installed');
  chrome.storage.local.set({ sbm_live_nodes: [] });
});

// ===== Track navigation (onCompleted = page fully loaded) =====
chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (!isRecording) return;
  if (details.frameId !== 0) return;
  if (!isValidUrl(details.url)) return;
  if (isExcluded(details.url)) return;

  // Skip our own map page
  if (details.url.includes(chrome.runtime.id)) return;

  try {
    const tab = await chrome.tabs.get(details.tabId);
    const parentId = tabNodeMap[details.tabId] || null;

    console.log(
      `[SpatialMap] Navigation: ${details.url} | tab:${details.tabId} | parent:${parentId}`
    );

    await queueNavigation({
      url: details.url,
      title: tab.title || details.url,
      favicon: tab.favIconUrl || '',
      parentId,
      tabId: details.tabId,
      windowId: tab.windowId ?? 0,
      edgeType: 'click',
    });
  } catch (err) {
    console.error('[SpatialMap] Nav error:', err);
  }
});

// ===== Track new tabs (opener relationship) =====
chrome.tabs.onCreated.addListener((tab) => {
  if (!isRecording || !tab.id) return;
  if (tab.openerTabId && tabNodeMap[tab.openerTabId]) {
    tabNodeMap[tab.id] = tabNodeMap[tab.openerTabId];
  }
});

// ===== Track title/favicon updates =====
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
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

// ===== Clean up =====
chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabNodeMap[tabId];
});

// ===== Message handler =====
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const { type, payload } = msg as { type: string; payload?: Record<string, unknown> };

  switch (type) {
    case 'NODE_CREATED': {
      if (payload) {
        const nodeId = payload.nodeId as string;
        const tabId = payload.tabId as number;
        tabNodeMap[tabId] = nodeId;
      }
      sendResponse({ status: 'ok' });
      break;
    }

    case 'TOGGLE_RECORDING': {
      isRecording = !isRecording;
      sendResponse({ isRecording });
      break;
    }

    case 'GET_RECORDING_STATE': {
      sendResponse({ isRecording });
      break;
    }

    case 'OPEN_MAP_PAGE': {
      const mapUrl = chrome.runtime.getURL('src/map/index.html');
      chrome.tabs.query({ url: mapUrl }, (tabs) => {
        if (tabs.length > 0 && tabs[0].id) {
          chrome.tabs.update(tabs[0].id, { active: true });
        } else {
          chrome.tabs.create({ url: mapUrl });
        }
      });
      sendResponse({ status: 'ok' });
      break;
    }

    default:
      sendResponse({ status: 'unknown' });
  }

  return true;
});