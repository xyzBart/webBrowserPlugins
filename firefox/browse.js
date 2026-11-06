const treeEl = document.getElementById("tree");
const grid = document.getElementById("grid");
const countEl = document.getElementById("count");
const folderNameEl = document.getElementById("folderName");

const STORAGE_KEY = "lastBrowseFolderId";

const foldersById = new Map(); // id -> { node, items }
const folderToggles = []; // { ul, toggle } for every folder that has child folders
const totalsById = new Map(); // id -> YT video count in this folder + all descendants

function toggleCollapsed(childUl, toggleEl) {
  const collapsed = childUl.classList.toggle("collapsed");
  toggleEl.textContent = collapsed ? "▶" : "▼";
}

// Recursively counts YT videos in a folder and its descendants, so empty branches can be hidden.
function computeTotal(node) {
  if (!node.children) return 0;
  let total = 0;
  for (const child of node.children) {
    if (child.url) {
      if (toYtItem(child)) total += 1;
    } else if (child.children) {
      total += computeTotal(child);
    }
  }
  totalsById.set(node.id, total);
  return total;
}

// Recursively renders folder nodes (and their folder children) as a nested <ul> tree.
// Folders with no YT videos anywhere inside them (directly or nested) are skipped entirely.
// depth 0 (the toolbar/menu/other/mobile roots) starts expanded; everything deeper starts collapsed.
function buildTree(nodes, container, depth) {
  const ul = document.createElement("ul");
  if (depth > 0) ul.classList.add("collapsed");

  for (const node of nodes) {
    if (!node.children) continue; // skip plain bookmarks/separators, tree shows folders only
    if (!totalsById.get(node.id)) continue; // skip folders with no YT videos anywhere inside

    const items = node.children.filter((c) => c.url).map(toYtItem).filter(Boolean);
    foldersById.set(node.id, { node, items });

    const li = document.createElement("li");
    const row = document.createElement("div");
    row.className = "folder-row";

    const childFolders = node.children.filter((c) => c.children && totalsById.get(c.id));
    const toggle = document.createElement("span");
    toggle.className = "toggle" + (childFolders.length > 0 ? "" : " spacer");
    toggle.textContent = childFolders.length > 0 ? "▶" : "";

    const label = document.createElement("span");
    label.className = "folder-label";
    label.dataset.id = node.id;
    label.textContent = `${node.title || "(untitled)"}${items.length ? ` (${items.length})` : ""}`;
    label.addEventListener("click", () => selectFolder(node.id));

    row.appendChild(toggle);
    row.appendChild(label);
    li.appendChild(row);

    if (childFolders.length > 0) {
      const childUl = buildTree(childFolders, li, depth + 1);
      toggle.addEventListener("click", () => toggleCollapsed(childUl, toggle));
      folderToggles.push({ ul: childUl, toggle });
    }

    ul.appendChild(li);
  }
  container.appendChild(ul);
  return ul;
}

// Expands every ancestor <ul> of a folder so it's visible in the tree, e.g. after restoring
// the last-selected folder on init.
function revealFolder(id) {
  const label = treeEl.querySelector(`.folder-label[data-id="${id}"]`);
  if (!label) return;

  let li = label.closest("li");
  while (li) {
    const parentUl = li.parentElement;
    if (parentUl && parentUl.classList.contains("collapsed")) {
      parentUl.classList.remove("collapsed");
      const row = parentUl.previousElementSibling;
      const toggle = row && row.querySelector(".toggle");
      if (toggle) toggle.textContent = "▼";
    }
    li = parentUl ? parentUl.closest("li") : null;
  }
}

function selectFolder(id) {
  const entry = foldersById.get(id);
  if (!entry) return;

  const prev = treeEl.querySelector(".folder-label.selected");
  if (prev) prev.classList.remove("selected");
  const label = treeEl.querySelector(`.folder-label[data-id="${id}"]`);
  if (label) label.classList.add("selected");
  revealFolder(id);

  folderNameEl.textContent = entry.node.title || "(untitled)";
  countEl.textContent = `${entry.items.length} video${entry.items.length === 1 ? "" : "s"}`;
  renderGrid(grid, entry.items);
  browser.storage.local.set({ [STORAGE_KEY]: id });
}

function setAllCollapsed(collapsed) {
  for (const { ul, toggle } of folderToggles) {
    ul.classList.toggle("collapsed", collapsed);
    toggle.textContent = collapsed ? "▶" : "▼";
  }
}

document.getElementById("collapseAll").addEventListener("click", () => setAllCollapsed(true));
document.getElementById("expandAll").addEventListener("click", () => setAllCollapsed(false));

async function init() {
  const tree = await browser.bookmarks.getTree();
  computeTotal(tree[0]);
  buildTree(tree[0].children, treeEl, 0);

  const stored = await browser.storage.local.get(STORAGE_KEY);
  const lastId = stored[STORAGE_KEY];
  if (lastId && foldersById.has(lastId)) {
    selectFolder(lastId);
    return;
  }

  const firstWithItems = [...foldersById.values()].find((f) => f.items.length > 0);
  if (firstWithItems) selectFolder(firstWithItems.node.id);
}

init();
