/*
  SPATIAL BROWSING MAP — Background Service Worker
  
  ONE ROOT. Everything branches from it.
  - First tab = root
  - Every new tab = child of active tab's node
  - Click link in tab = child of current node
  - URL exists = reuse node
  - Tab switch = only visual change (green dot)
  - Tab close = mark closed, never delete
  - Nothing moves, nothing is deleted
*/

interface TreeNode {
  id: string;
  url: string;
  title: string;
  favicon: string;
  domain: string;
  parentId: string | null;
  children: string[];
  tabId: number;
  windowId: number;
  timestamp: number;
  lastVisited: number;
  visitCount: number;
  depth: number;
  isActive: boolean;
  isClosed: boolean;
  isCollapsed: boolean;
  metadata: Record<string, unknown>;
  position: { x: number; y: number; width: number; height: number };
}

interface TreeEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  timestamp: number;
}

interface TreeSession {
  id: string;
  name: string;
  nodes: Record<string, TreeNode>;
  edges: TreeEdge[];
  rootNodes: string[];
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
  stats: {
    totalNodes: number;
    totalEdges: number;
    maxDepth: number;
    totalBranches: number;
    domains: string[];
    duration: number;
  };
}

// ===== STATE =====
const tabPointer: Map<number, string> = new Map();
let currentActiveTabId: number | null = null;
const tabInitialized: Map<number, boolean> = new Map();
const tabLastUrl: Map<number, string> = new Map();
const tabLastTime: Map<number, number> = new Map();

let isRecording = true;

// Separate timers for structural saves vs activation saves
let structureSaveTimer: ReturnType<typeof setTimeout> | null = null;
let activationSaveTimer: ReturnType<typeof setTimeout> | null = null;

// Track the last activation to debounce rapid switches
let lastActivationTime = 0;
let lastActivatedNodeId: string | null = null;

// ===== HELPERS =====
function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return ''; }
}

function isTrackable(url: string): boolean {
  if (!url) return false;
  try { const u = new URL(url); return u.protocol === 'http:' || u.protocol === 'https:'; }
  catch { return false; }
}

function isOurPage(url: string): boolean {
  return url ? url.includes(chrome.runtime.id) : false;
}

function cleanUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.origin + u.pathname.replace(/\/+$/, '') + u.search;
  } catch { return url; }
}

// ===== STORAGE =====
async function loadSession(): Promise<TreeSession> {
  const r = await chrome.storage.local.get('sbm_active_session');
  if (r.sbm_active_session) return r.sbm_active_session;
  const s: TreeSession = {
    id: genId(), name: 'Session 1',
    nodes: {}, edges: [], rootNodes: [],
    createdAt: Date.now(), updatedAt: Date.now(), isActive: true,
    stats: { totalNodes: 0, totalEdges: 0, maxDepth: 0, totalBranches: 0, domains: [], duration: 0 },
  };
  await saveNow(s);
  return s;
}

function calcStats(session: TreeSession): void {
  const nodes = Object.values(session.nodes);
  if (nodes.length > 0) {
    const ts = nodes.map(n => n.timestamp);
    session.stats = {
      totalNodes: nodes.length,
      totalEdges: session.edges.length,
      maxDepth: Math.max(0, ...nodes.map(n => n.depth)),
      totalBranches: nodes.filter(n => n.children.length > 1).length,
      domains: [...new Set(nodes.map(n => n.domain).filter(Boolean))],
      duration: nodes.length > 1 ? Math.max(...ts) - Math.min(...ts) : 0,
    };
  }
}

async function saveNow(session: TreeSession): Promise<void> {
  calcStats(session);
  session.updatedAt = Date.now();
  await chrome.storage.local.set({ sbm_active_session: session });

  const lr = await chrome.storage.local.get('sbm_sessions');
  const list: TreeSession[] = lr.sbm_sessions || [];
  const idx = list.findIndex(x => x.id === session.id);
  if (idx >= 0) list[idx] = session;
  else list.unshift(session);
  await chrome.storage.local.set({ sbm_sessions: list });
}

// Save for structural changes (new node, close tab) — fast
function saveStructure(session: TreeSession): void {
  if (structureSaveTimer) clearTimeout(structureSaveTimer);
  structureSaveTimer = setTimeout(() => {
    saveNow(session);
    structureSaveTimer = null;
  }, 150);
}

// Save for activation changes (tab switch) — debounced more
// because rapid tab switching fires many events
function saveActivation(session: TreeSession): void {
  if (activationSaveTimer) clearTimeout(activationSaveTimer);
  activationSaveTimer = setTimeout(() => {
    saveNow(session);
    activationSaveTimer = null;
  }, 400);
}

// ===== FIND NODE =====
function findNodeByUrl(session: TreeSession, url: string): string | null {
  const clean = cleanUrl(url);
  for (const [id, node] of Object.entries(session.nodes)) {
    if (cleanUrl(node.url) === clean) return id;
  }
  return null;
}

function hasRoot(session: TreeSession): boolean {
  return session.rootNodes.length > 0;
}

// ===== CREATE NODE =====
function createNode(
  session: TreeSession,
  url: string, title: string, favicon: string,
  tabId: number, windowId: number,
  parentId: string | null, edgeType: string,
): string {
  const nodeId = genId();
  const domain = getDomain(url);
  const parent = parentId ? session.nodes[parentId] : null;
  const depth = parent ? parent.depth + 1 : 0;

  session.nodes[nodeId] = {
    id: nodeId, url,
    title: title || domain || 'New Tab',
    favicon: favicon || '', domain, parentId,
    children: [], tabId, windowId,
    timestamp: Date.now(), lastVisited: Date.now(),
    visitCount: 1, depth,
    isActive: false, isClosed: false, isCollapsed: false,
    metadata: {},
    position: { x: 0, y: 0, width: 220, height: 56 },
  };

  if (parentId && session.nodes[parentId]) {
    session.nodes[parentId].children.push(nodeId);
    session.edges.push({
      id: `${parentId}-${nodeId}`,
      sourceId: parentId, targetId: nodeId,
      type: edgeType, timestamp: Date.now(),
    });
  } else {
    session.rootNodes.push(nodeId);
  }

  return nodeId;
}

// ===== SET ACTIVE (used by both navigation and activation) =====
function markActive(session: TreeSession, nodeId: string, tabId: number): void {
  // Only update if actually changed
  if (lastActivatedNodeId === nodeId) {
    // Same node, just update timestamp
    const node = session.nodes[nodeId];
    if (node) node.lastVisited = Date.now();
    return;
  }

  tabPointer.set(tabId, nodeId);
  lastActivatedNodeId = nodeId;

  for (const n of Object.values(session.nodes)) {
    n.isActive = n.id === nodeId;
  }

  const node = session.nodes[nodeId];
  if (node) {
    node.lastVisited = Date.now();
    node.isClosed = false;
  }
}

// ============================================================
// tabs.onCreated — Just record. No node creation.
// ============================================================
chrome.tabs.onCreated.addListener((tab) => {
  if (!tab.id) return;
  tabInitialized.set(tab.id, false);
});

// ============================================================
// tabs.onActivated — ONLY moves the green dot.
// Debounced to handle rapid switching.
// NEVER creates nodes. NEVER changes tree structure.
// ============================================================
chrome.tabs.onActivated.addListener(async (info) => {
  const tabId = info.tabId;
  const now = Date.now();

  // Always track which tab is active (for parent resolution)
  currentActiveTabId = tabId;

  if (!isRecording) return;

  // Get the node this tab points to
  const nodeId = tabPointer.get(tabId);

  if (!nodeId) {
    // Tab has no node (untracked tab, opened before extension, or chrome:// tab)
    // Do nothing — don't break the tree
    return;
  }

  // Debounce: if switching tabs rapidly (< 100ms apart), skip intermediate ones
  if (now - lastActivationTime < 100 && lastActivatedNodeId !== nodeId) {
    // Cancel previous activation save, this one will overwrite
    if (activationSaveTimer) clearTimeout(activationSaveTimer);
  }
  lastActivationTime = now;

  // If same node already active, skip entirely
  if (lastActivatedNodeId === nodeId) return;

  const session = await loadSession();

  // Verify node still exists
  if (!session.nodes[nodeId]) return;

  // Mark active — ONLY visual change, no structural change
  markActive(session, nodeId, tabId);

  // Use the slower save for activation (debounced)
  saveActivation(session);
});

// ============================================================
// webNavigation.onCommitted — ALL node creation
// ============================================================
chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (!isRecording) return;
  if (details.frameId !== 0) return;
  if (!isTrackable(details.url)) return;
  if (isOurPage(details.url)) return;

  const tabId = details.tabId;
  const url = details.url;
  const transition = details.transitionType;
  const qualifiers = details.transitionQualifiers || [];

  if (transition === 'reload') return;

  // Debounce same URL
  const now = Date.now();
  const prevUrl = tabLastUrl.get(tabId);
  const prevTime = tabLastTime.get(tabId) || 0;
  if (prevUrl && cleanUrl(prevUrl) === cleanUrl(url) && now - prevTime < 800) return;
  tabLastUrl.set(tabId, url);
  tabLastTime.set(tabId, now);

  const session = await loadSession();

  let title = '', favicon = '', windowId = 0;
  try {
    const tab = await chrome.tabs.get(tabId);
    title = tab.title || '';
    favicon = tab.favIconUrl || '';
    windowId = tab.windowId ?? 0;
  } catch { return; }

  // Check existing
  const existingId = findNodeByUrl(session, url);

  if (existingId) {
    markActive(session, existingId, tabId);
    tabInitialized.set(tabId, true);
    const node = session.nodes[existingId];
    node.visitCount += 1;
    if (title && title !== node.title) node.title = title;
    if (favicon) node.favicon = favicon;
    saveStructure(session);
    console.log(`[SBM] ↩ REUSE: "${node.title}" d${node.depth}`);
    return;
  }

  // New URL — determine parent
  let parentId: string | null = null;
  let edgeType = 'click';
  const isFirstNav = !tabInitialized.get(tabId);

  if (!hasRoot(session)) {
    parentId = null;
    edgeType = 'root';
    tabInitialized.set(tabId, true);

  } else if (isFirstNav) {
    tabInitialized.set(tabId, true);

    // Parent = most recently visited node from another tab
    let bestParent: string | null = null;
    let latestVisit = 0;
    for (const [tid, nid] of tabPointer.entries()) {
      if (tid === tabId) continue;
      const node = session.nodes[nid];
      if (node && node.lastVisited > latestVisit) {
        latestVisit = node.lastVisited;
        bestParent = nid;
      }
    }

    parentId = bestParent || session.rootNodes[0] || null;
    edgeType = 'tab-open';

  } else {
    const currentId = tabPointer.get(tabId);
    if (currentId && session.nodes[currentId]) {
      parentId = currentId;
      edgeType = transition === 'typed' ? 'search' : 'click';
    } else {
      parentId = session.rootNodes[0] || null;
      edgeType = 'click';
    }
  }

  const nodeId = createNode(session, url, title, favicon, tabId, windowId, parentId, edgeType);
  markActive(session, nodeId, tabId);
  await saveNow(session); // Immediate save for new nodes

  const node = session.nodes[nodeId];
  const pLabel = parentId && session.nodes[parentId]
    ? `"${session.nodes[parentId].title}" d${session.nodes[parentId].depth}`
    : 'ROOT';
  console.log(`[SBM] ✅ NEW: "${node.title}" | parent: ${pLabel} | d${node.depth} | ${edgeType}`);
});

// ============================================================
// tabs.onUpdated — title/favicon only
// ============================================================
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!isRecording) return;
  if (tab.url && isOurPage(tab.url)) return;
  const nodeId = tabPointer.get(tabId);
  if (!nodeId) return;
  if (!changeInfo.title && !changeInfo.favIconUrl) return;

  const session = await loadSession();
  const node = session.nodes[nodeId];
  if (!node) return;
  let changed = false;
  if (changeInfo.title && changeInfo.title !== node.title) { node.title = changeInfo.title; changed = true; }
  if (changeInfo.favIconUrl && changeInfo.favIconUrl !== node.favicon) { node.favicon = changeInfo.favIconUrl; changed = true; }
  if (changed) saveStructure(session);
});

// ============================================================
// tabs.onRemoved — mark closed
// ============================================================
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const nodeId = tabPointer.get(tabId);
  if (nodeId) {
    const session = await loadSession();
    const node = session.nodes[nodeId];
    if (node) {
      node.isClosed = true;
      node.isActive = false;
      saveStructure(session);
      console.log(`[SBM] ❌ CLOSED: "${node.title}"`);
    }
  }
  tabPointer.delete(tabId);
  tabInitialized.delete(tabId);
  tabLastUrl.delete(tabId);
  tabLastTime.delete(tabId);
  if (currentActiveTabId === tabId) {
    currentActiveTabId = null;
    lastActivatedNodeId = null;
  }
});

// ============================================================
// Window focus
// ============================================================
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  try {
    const tabs = await chrome.tabs.query({ active: true, windowId });
    if (tabs[0]?.id) currentActiveTabId = tabs[0].id;
  } catch {}
});

// ============================================================
// Init
// ============================================================
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[SBM] Installed');
  await loadSession();
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) currentActiveTabId = tabs[0].id;
  } catch {}
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('[SBM] Startup');
  await loadSession();
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) currentActiveTabId = tabs[0].id;
  } catch {}
});

// ============================================================
// Messages
// ============================================================
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  switch (msg.type) {
    case 'TOGGLE_RECORDING':
      isRecording = !isRecording;
      sendResponse({ isRecording });
      break;
    case 'GET_RECORDING_STATE':
      sendResponse({ isRecording });
      break;
    case 'OPEN_MAP_PAGE': {
      const mapUrl = chrome.runtime.getURL('src/map/index.html');
      chrome.tabs.query({}, (tabs) => {
        const existing = tabs.find(t => t.url?.includes('map/index.html') && t.url?.includes(chrome.runtime.id));
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
    default:
      sendResponse({ status: 'unknown' });
  }
  return true;
});