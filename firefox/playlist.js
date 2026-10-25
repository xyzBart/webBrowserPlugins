const folderSelect = document.getElementById("folder");
const grid = document.getElementById("grid");
const countEl = document.getElementById("count");

const STORAGE_KEY = "lastFolderId";

// Collects every bookmark folder that has at least one direct YouTube-video child.
function collectYtFolders(nodes, path, out) {
  for (const node of nodes) {
    if (node.children) {
      const label = path ? `${path} / ${node.title || "(untitled)"}` : node.title || "(untitled)";
      const ytChildren = node.children
        .filter((c) => c.url)
        .map(toYtItem)
        .filter(Boolean);
      if (ytChildren.length > 0) {
        out.push({ id: node.id, label, items: ytChildren });
      }
      collectYtFolders(node.children, label, out);
    }
  }
  return out;
}

function renderFolder(folder) {
  countEl.textContent = `${folder.items.length} video${folder.items.length === 1 ? "" : "s"}`;
  renderGrid(grid, folder.items);
}

async function init() {
  const tree = await browser.bookmarks.getTree();
  const folders = collectYtFolders(tree, "", []);

  if (folders.length === 0) {
    folderSelect.style.display = "none";
    countEl.textContent = "No bookmark folder with YouTube videos found.";
    renderGrid(grid, []);
    return;
  }

  for (const folder of folders) {
    const opt = document.createElement("option");
    opt.value = folder.id;
    opt.textContent = `${folder.label} (${folder.items.length})`;
    folderSelect.appendChild(opt);
  }

  const stored = await browser.storage.local.get(STORAGE_KEY);
  const lastId = stored[STORAGE_KEY];
  const initial = folders.find((f) => f.id === lastId) || folders[0];
  folderSelect.value = initial.id;
  renderFolder(initial);

  folderSelect.addEventListener("change", () => {
    const chosen = folders.find((f) => f.id === folderSelect.value);
    browser.storage.local.set({ [STORAGE_KEY]: folderSelect.value });
    renderFolder(chosen);
  });
}

init();
