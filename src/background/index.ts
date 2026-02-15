/*
  SPATIAL BROWSING MAP — Background Service Worker
  
  ONE ROOT RULE:
  - The very first tab = the ONE AND ONLY root
  - Every other tab = child of whatever was active when it was opened
  - Ctrl+T, address bar, link click — ALL become children
  - The only root is the first tab ever tracked
  - If a URL already exists in tree → reuse that node
  - Clicking a link from reused node → new child under it
  - Nothing deleted, nothing moved
  - Back/forward → return to existing node
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

// tabId → nodeId this tab currently points to
const tabPointer: Map<number, string> = new Map();

// The ONE active tab right now (across all windows)
// When a new tab opens, THIS is the parent
let currentActiveTabId: number | null = null;

// tabId → whether first navigation processed
const tabInitialized: Map<number, boolean> = new Map();

// Debounce
const tabLastUrl: Map<number, string> = new Map();
const tabLastTime: Map<number, number> = new Map();

let isRecording = true;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

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

async function saveNow(session: TreeSession): Promise<void> {
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
  session.updatedAt = Date.now();
  await chrome.storage.local.set({ sbm_active_session: session });

  const lr = await chrome.storage.local.get('sbm_sessions');
  const list: TreeSession[] = lr.sbm_sessions || [];
  const idx = list.findIndex(x => x.id === session.id);
  if (idx >= 0) list[idx] = session;
  else list.unshift(session);
  await chrome.storage.local.set({ sbm_sessions: list });
}

function saveLater(session: TreeSession): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { saveNow(session); saveTimer = null; }, 200);
}

// ===== FIND EXISTING NODE BY URL =====
function findNodeByUrl(session: TreeSession, url: string): string | null {
  const clean = cleanUrl(url);
  for (const [id, node] of Object.entries(session.nodes)) {
    if (cleanUrl(node.url) === clean) return id;
  }
  return null;
}

// ===== HAS ANY ROOT? =====
function hasRoot(session: TreeSession): boolean {
  return session.rootNodes.length > 0;
}

// ===== GET CURRENT ACTIVE NODE =====
// Returns the node that the currently active tab points to.
// This is used as parent for new tabs.
function getActiveNodeId(): string | null {
  if (currentActiveTabId !== null && tabPointer.has(currentActiveTabId)) {
    return tabPointer.get(currentActiveTabId)!;
  }
  return null;
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
    isActive: true, isClosed: false, isCollapsed: false,
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
    // Only the very first node becomes root
    session.rootNodes.push(nodeId);
  }

  return nodeId;
}

// ===== SET ACTIVE =====
function markActive(session: TreeSession, nodeId: string, tabId: number): void {
  tabPointer.set(tabId, nodeId);
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
// tabs.onCreated
// Records that a new tab exists. Node created on first navigation.
// ============================================================
chrome.tabs.onCreated.addListener((tab) => {
  if (!tab.id) return;
  tabInitialized.set(tab.id, false);
  console.log(`[SBM] 📋 Tab ${tab.id} created`);
});

// ============================================================
// tabs.onActivated — Track which tab is active (for parent resolution)
// NEVER creates nodes. NEVER changes tree structure.
// ============================================================
chrome.tabs.onActivated.addListener(async (info) => {
  currentActiveTabId = info.tabId;

  if (!isRecording) return;
  const nodeId = tabPointer.get(info.tabId);
  if (!nodeId) return;

  const session = await loadSession();
  markActive(session, nodeId, info.tabId);
  saveLater(session);
});

// ============================================================
// webNavigation.onCommitted — ALL NODE CREATION HAPPENS HERE
//
// Logic:
// 1. URL already exists in tree? → Reuse that node. Move tab pointer.
// 2. URL is new + this is the very first node ever? → ROOT
// 3. URL is new + first navigation in new tab? → Child of active tab's node
// 4. URL is new + navigation within existing tab? → Child of tab's current node
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

  // Skip reloads
  if (transition === 'reload') return;

  // Debounce
  const now = Date.now();
  const prevUrl = tabLastUrl.get(tabId);
  const prevTime = tabLastTime.get(tabId) || 0;
  if (prevUrl && cleanUrl(prevUrl) === cleanUrl(url) && now - prevTime < 800) return;
  tabLastUrl.set(tabId, url);
  tabLastTime.set(tabId, now);

  const session = await loadSession();

  // Get tab info
  let title = '', favicon = '', windowId = 0;
  try {
    const tab = await chrome.tabs.get(tabId);
    title = tab.title || '';
    favicon = tab.favIconUrl || '';
    windowId = tab.windowId ?? 0;
  } catch { return; }

  // ══════════════════════════════════════════════
  // CHECK: Does this URL already exist in the tree?
  // ══════════════════════════════════════════════
  const existingId = findNodeByUrl(session, url);

  if (existingId) {
    // URL exists → reuse it. No duplicate.
    // Tab pointer moves to existing node.
    // Future clicks from this tab branch from HERE.
    markActive(session, existingId, tabId);
    tabInitialized.set(tabId, true);

    const existingNode = session.nodes[existingId];
    existingNode.visitCount += 1;
    if (title && title !== existingNode.title) existingNode.title = title;
    if (favicon) existingNode.favicon = favicon;

    saveLater(session);

    console.log(
      `[SBM] ↩ REUSE: "${existingNode.title}" | depth:${existingNode.depth} | ` +
      `tab ${tabId} → points here now`
    );
    return;
  }

  // ══════════════════════════════════════════════
  // URL IS NEW → Determine parent and create node
  // ══════════════════════════════════════════════

  let parentId: string | null = null;
  let edgeType = 'click';
  const isFirstNav = !tabInitialized.get(tabId);

  if (!hasRoot(session)) {
    // ── CASE 1: No root exists yet → This is THE root ──
    parentId = null;
    edgeType = 'root';
    tabInitialized.set(tabId, true);
    console.log(`[SBM] 👑 First ever node → ROOT`);

  } else if (isFirstNav) {
    // ── CASE 2: First navigation in a new tab ──
    // Parent = whatever tab was active when this tab was created
    // That's the "active node" at the time
    tabInitialized.set(tabId, true);

    // Find parent: the node of the tab that was active before this one
    // We use getActiveNodeId() which returns the current active tab's node
    // But since this tab just became active (onActivated fires before onCommitted),
    // we need the PREVIOUS active tab's node.
    // 
    // Workaround: look through all tabs to find another tab's node.
    // The opener or the previously active tab.
    
    // Try 1: This tab's pointer might already be set if onActivated ran
    // In that case, look at all OTHER tabs' pointers
    let bestParent: string | null = null;

    // Check all tabs that have nodes, find the most recently visited one
    // (that's the tab the user was on before opening this new tab)
    let latestVisit = 0;
    for (const [tid, nid] of tabPointer.entries()) {
      if (tid === tabId) continue; // Skip self
      const node = session.nodes[nid];
      if (node && node.lastVisited > latestVisit) {
        latestVisit = node.lastVisited;
        bestParent = nid;
      }
    }

    if (bestParent) {
      parentId = bestParent;
      edgeType = 'tab-open';
      console.log(`[SBM] 🔗 New tab → child of "${session.nodes[bestParent].title}"`);
    } else {
      // Fallback: use root
      parentId = session.rootNodes[0] || null;
      edgeType = 'tab-open';
      console.log(`[SBM] 🔗 New tab → child of ROOT (fallback)`);
    }

  } else {
    // ── CASE 3: Navigation within existing tab ──
    // Parent = this tab's current node
    const currentId = tabPointer.get(tabId);
    if (currentId && session.nodes[currentId]) {
      parentId = currentId;
      edgeType = transition === 'typed' ? 'search' : 'click';
    } else {
      // Safety fallback: attach to root
      parentId = session.rootNodes[0] || null;
      edgeType = 'click';
    }
  }

  // ── CREATE THE NODE ──
  const nodeId = createNode(
    session, url, title, favicon,
    tabId, windowId, parentId, edgeType,
  );
  markActive(session, nodeId, tabId);
  await saveNow(session);

  const node = session.nodes[nodeId];
  const parentLabel = parentId && session.nodes[parentId]
    ? `"${session.nodes[parentId].title}" (d${session.nodes[parentId].depth})`
    : 'ROOT';

  console.log(
    `[SBM] ✅ NEW: "${node.title}" | parent: ${parentLabel} | ` +
    `depth: ${node.depth} | tab: ${tabId} | ${edgeType}`
  );
});

// ============================================================
// tabs.onUpdated — title/favicon only. No structural change.
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
  if (changeInfo.title && changeInfo.title !== node.title) node.title = changeInfo.title;
  if (changeInfo.favIconUrl) node.favicon = changeInfo.favIconUrl;
  saveLater(session);
});

// ============================================================
// tabs.onRemoved — mark closed, NEVER delete
// ============================================================
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const nodeId = tabPointer.get(tabId);
  if (nodeId) {
    const session = await loadSession();
    const node = session.nodes[nodeId];
    if (node) {
      node.isClosed = true;
      node.isActive = false;
      saveLater(session);
      console.log(`[SBM] ❌ CLOSED: "${node.title}" → stays in tree`);
    }
  }
  tabPointer.delete(tabId);
  tabInitialized.delete(tabId);
  tabLastUrl.delete(tabId);
  tabLastTime.delete(tabId);
  if (currentActiveTabId === tabId) currentActiveTabId = null;
});

// ============================================================
// INIT
// ============================================================
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[SBM] Spatial Browsing Map installed');
  await loadSession();
  // Track current active tab
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

// Track window focus for active tab
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  try {
    const tabs = await chrome.tabs.query({ active: true, windowId });
    if (tabs[0]?.id) currentActiveTabId = tabs[0].id;
  } catch {}
});

// ============================================================
// MESSAGES
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
        const existing = tabs.find(
          t => t.url?.includes('map/index.html') && t.url?.includes(chrome.runtime.id)
        );
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