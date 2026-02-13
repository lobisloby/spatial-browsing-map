import type { MapNode, MapEdge, MapSession, SessionStats } from '../types/map';

// ===== In-memory state =====
const tabNodeMap: Record<number, string> = {};
let isRecording = true;
let currentSessionId: string | null = null;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return url; }
}

function isValidUrl(url: string): boolean {
  try { const u = new URL(url); return ['http:', 'https:'].includes(u.protocol); }
  catch { return false; }
}

function isExcluded(url: string): boolean {
  const list = [
    'chrome://', 'chrome-extension://', 'about:',
    'edge://', 'brave://', 'devtools://', 'chrome://newtab',
  ];
  return list.some((e) => url.startsWith(e));
}

// ===== Storage helpers =====
async function getSession(): Promise<MapSession | null> {
  const result = await chrome.storage.local.get('sbm_active_session');
  return result.sbm_active_session || null;
}

async function saveSession(session: MapSession): Promise<void> {
  await chrome.storage.local.set({ sbm_active_session: session });

  // Also save to sessions list
  const listResult = await chrome.storage.local.get('sbm_sessions');
  const sessions: MapSession[] = listResult.sbm_sessions || [];
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) sessions[idx] = session;
  else sessions.unshift(session);
  await chrome.storage.local.set({ sbm_sessions: sessions });
}

function calcStats(session: MapSession): SessionStats {
  const nodes = Object.values(session.nodes);
  if (nodes.length === 0) {
    return { totalNodes: 0, totalEdges: 0, maxDepth: 0, totalBranches: 0, domains: [], duration: 0 };
  }
  const domains = [...new Set(nodes.map((n) => n.domain))];
  const ts = nodes.map((n) => n.timestamp);
  return {
    totalNodes: nodes.length,
    totalEdges: session.edges.length,
    maxDepth: Math.max(...nodes.map((n) => n.depth)),
    totalBranches: nodes.filter((n) => n.children.length > 1).length,
    domains,
    duration: Math.max(...ts) - Math.min(...ts),
  };
}

async function ensureSession(): Promise<MapSession> {
  let session = await getSession();
  if (!session) {
    session = {
      id: generateId(),
      name: 'Session 1',
      nodes: {},
      edges: [],
      rootNodes: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isActive: true,
      stats: { totalNodes: 0, totalEdges: 0, maxDepth: 0, totalBranches: 0, domains: [], duration: 0 },
    };
    await saveSession(session);
  }
  currentSessionId = session.id;
  return session;
}

// ===== Add a node to the tree =====
async function addNodeToTree(
  url: string,
  title: string,
  favicon: string,
  tabId: number,
  windowId: number,
): Promise<string> {
  const session = await ensureSession();
  const domain = extractDomain(url);
  const now = Date.now();
  const parentId = tabNodeMap[tabId] || null;

  // Deduplicate: same url + same parent + recent
  const existing = Object.values(session.nodes).find(
    (n) => n.url === url && n.parentId === parentId && now - n.timestamp < 2000,
  );
  if (existing) {
    existing.visitCount += 1;
    existing.lastVisited = now;
    existing.title = title || existing.title;
    existing.favicon = favicon || existing.favicon;
    existing.isActive = true;

    // Deactivate others on same tab
    for (const n of Object.values(session.nodes)) {
      if (n.tabId === tabId && n.id !== existing.id) n.isActive = false;
    }

    session.updatedAt = now;
    session.stats = calcStats(session);
    await saveSession(session);
    tabNodeMap[tabId] = existing.id;
    return existing.id;
  }

  // Create new node
  const nodeId = generateId();
  const parentNode = parentId ? session.nodes[parentId] : null;
  const depth = parentNode ? parentNode.depth + 1 : 0;

  const newNode: MapNode = {
    id: nodeId,
    url,
    title: title || domain,
    favicon: favicon || '',
    domain,
    parentId,
    children: [],
    tabId,
    windowId,
    timestamp: now,
    lastVisited: now,
    visitCount: 1,
    depth,
    isActive: true,
    isCollapsed: false,
    metadata: {},
    position: { x: 0, y: 0, width: 220, height: 56 },
  };

  // Deactivate others on same tab
  for (const n of Object.values(session.nodes)) {
    if (n.tabId === tabId) n.isActive = false;
  }

  // Add node
  session.nodes[nodeId] = newNode;

  // Link to parent
  if (parentId && session.nodes[parentId]) {
    session.nodes[parentId].children.push(nodeId);

    // Create edge
    session.edges.push({
      id: `${parentId}-${nodeId}`,
      sourceId: parentId,
      targetId: nodeId,
      type: 'click',
      timestamp: now,
    });
  } else {
    // Root node
    session.rootNodes.push(nodeId);
  }

  // Update tab mapping
  tabNodeMap[tabId] = nodeId;

  session.updatedAt = now;
  session.stats = calcStats(session);
  await saveSession(session);

  console.log(
    `[SpatialMap] Added node: "${title}" depth:${depth} parent:${parentId ? 'yes' : 'ROOT'} children-of-parent:${parentNode?.children.length || 0}`
  );

  return nodeId;
}

// ===== Event Listeners =====
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[SpatialMap] Installed');
  await ensureSession();
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureSession();
});

// Navigation completed (page fully loaded)
chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (!isRecording) return;
  if (details.frameId !== 0) return;
  if (!isValidUrl(details.url)) return;
  if (isExcluded(details.url)) return;
  if (details.url.includes(chrome.runtime.id)) return;

  try {
    const tab = await chrome.tabs.get(details.tabId);
    await addNodeToTree(
      details.url,
      tab.title || details.url,
      tab.favIconUrl || '',
      details.tabId,
      tab.windowId ?? 0,
    );
  } catch (err) {
    console.error('[SpatialMap] Error:', err);
  }
});

// New tab inherits parent
chrome.tabs.onCreated.addListener((tab) => {
  if (!isRecording || !tab.id) return;
  if (tab.openerTabId && tabNodeMap[tab.openerTabId]) {
    tabNodeMap[tab.id] = tabNodeMap[tab.openerTabId];
    console.log(`[SpatialMap] Tab ${tab.id} inherits from tab ${tab.openerTabId} → node ${tabNodeMap[tab.id]}`);
  }
});

// Title/favicon updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (!isRecording) return;
  if (!changeInfo.title && !changeInfo.favIconUrl) return;

  const nodeId = tabNodeMap[tabId];
  if (!nodeId) return;

  try {
    const session = await getSession();
    if (!session || !session.nodes[nodeId]) return;

    if (changeInfo.title) session.nodes[nodeId].title = changeInfo.title;
    if (changeInfo.favIconUrl) session.nodes[nodeId].favicon = changeInfo.favIconUrl;
    session.updatedAt = Date.now();
    await saveSession(session);
  } catch {}
});

// Tab closed
chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabNodeMap[tabId];
});

// Message handler
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const { type } = msg;

  switch (type) {
    case 'TOGGLE_RECORDING':
      isRecording = !isRecording;
      sendResponse({ isRecording });
      break;

    case 'GET_RECORDING_STATE':
      sendResponse({ isRecording });
      break;

    case 'OPEN_MAP_PAGE': {
      const mapUrl = chrome.runtime.getURL('src/map/index.html');
      chrome.tabs.query({}, (allTabs) => {
        const existing = allTabs.find((t) => t.url?.includes('map/index.html') && t.url?.includes(chrome.runtime.id));
        if (existing?.id) {
          chrome.tabs.update(existing.id, { active: true });
          if (existing.windowId) chrome.windows.update(existing.windowId, { focused: true });
        } else {
          chrome.tabs.create({ url: mapUrl });
        }
      });
      sendResponse({ status: 'ok' });
      break;
    }

    case 'RELOAD_SESSION':
      sendResponse({ status: 'ok' });
      break;

    default:
      sendResponse({ status: 'unknown' });
  }

  return true;
});