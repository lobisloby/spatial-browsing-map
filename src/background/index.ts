/* eslint-disable @typescript-eslint/no-explicit-any */
const tabNodeMap: Record<number, string> = {};
let isRecording = true;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
}

function isValidUrl(url: string): boolean {
  try { const u = new URL(url); return ['http:', 'https:'].includes(u.protocol); } catch { return false; }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('Spatial Browsing Map installed');
});

chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (!isRecording || details.frameId !== 0 || !isValidUrl(details.url)) return;

  const excluded = ['chrome://', 'chrome-extension://', 'about:'];
  if (excluded.some((e) => details.url.startsWith(e))) return;

  try {
    const tab = await chrome.tabs.get(details.tabId);
    const parentNodeId = tabNodeMap[details.tabId] || null;
    const nodeId = generateId();
    tabNodeMap[details.tabId] = nodeId;

    chrome.runtime.sendMessage({
      type: 'MAP_DATA_UPDATED',
      payload: {
        url: details.url,
        title: tab.title || details.url,
        favicon: tab.favIconUrl || '',
        parentId: parentNodeId,
        tabId: details.tabId,
        windowId: tab.windowId,
        edgeType: details.transitionType === 'typed' ? 'search' : 'click',
      },
      timestamp: Date.now(),
    }).catch(() => {});
  } catch (err) {
    console.error('Navigation tracking error:', err);
  }
});

chrome.tabs.onCreated.addListener((tab) => {
  if (!isRecording || !tab.id) return;
  if (tab.openerTabId && tabNodeMap[tab.openerTabId]) {
    tabNodeMap[tab.id] = tabNodeMap[tab.openerTabId];
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabNodeMap[tabId];
});

chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (!isRecording) return;
  if (info.title || info.favIconUrl) {
    chrome.runtime.sendMessage({
      type: 'PAGE_METADATA',
      payload: { nodeId: tabNodeMap[tabId], title: info.title, favicon: info.favIconUrl },
      timestamp: Date.now(),
    }).catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((msg: any, _sender, sendResponse) => {
  if (msg.type === 'TOGGLE_RECORDING') {
    isRecording = !isRecording;
    sendResponse({ isRecording });
  } else if (msg.type === 'OPEN_SIDE_PANEL') {
    if (chrome.sidePanel && _sender.tab?.windowId) {
      chrome.sidePanel.open({ windowId: _sender.tab.windowId });
    }
    sendResponse({ status: 'ok' });
  }
  return true;
});