// Shared helpers for playlist.js and search.js

const YT_ID_RE = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

function extractVideoId(url) {
  if (!url) return null;
  const m = url.match(YT_ID_RE);
  return m ? m[1] : null;
}

function thumbnailUrl(videoId) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

function watchUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

// Renders {id, title, url, when} items into a thumbnail grid inside `container`.
function renderGrid(container, items) {
  container.innerHTML = "";
  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No YouTube videos found.";
    container.appendChild(empty);
    return;
  }
  for (const item of items) {
    const card = document.createElement("a");
    card.className = "card";
    card.href = item.url;
    card.target = "_blank";
    card.rel = "noopener noreferrer";

    const img = document.createElement("img");
    img.src = thumbnailUrl(item.id);
    img.loading = "lazy";
    img.alt = item.title || item.id;

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = item.title || item.url;

    card.appendChild(img);
    card.appendChild(title);
    container.appendChild(card);
  }
}

// Recursively walks a bookmarks.getTree() result, returning {id, title, url} for every node.
function flattenBookmarks(nodes, out = []) {
  for (const node of nodes) {
    if (node.url) {
      out.push(node);
    }
    if (node.children) {
      flattenBookmarks(node.children, out);
    }
  }
  return out;
}

function toYtItem(node) {
  const id = extractVideoId(node.url);
  if (!id) return null;
  return {
    id,
    title: node.title,
    url: watchUrl(id),
    when: node.dateAdded || node.lastVisitTime || 0,
  };
}

function dedupeById(items) {
  const seen = new Map();
  for (const item of items) {
    if (!seen.has(item.id) || (item.when || 0) > (seen.get(item.id).when || 0)) {
      seen.set(item.id, item);
    }
  }
  return Array.from(seen.values());
}
