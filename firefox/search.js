const queryInput = document.getElementById("query");
const grid = document.getElementById("grid");
const countEl = document.getElementById("count");

let allItems = [];

function applyFilter() {
  const q = queryInput.value.trim().toLowerCase();
  const filtered = q
    ? allItems.filter(
        (item) => (item.title || "").toLowerCase().includes(q) || item.url.includes(q)
      )
    : allItems;
  countEl.textContent = `${filtered.length} video${filtered.length === 1 ? "" : "s"}`;
  renderGrid(grid, filtered);
}

async function init() {
  countEl.textContent = "Loading...";

  const [bookmarkTree, historyItems] = await Promise.all([
    browser.bookmarks.getTree(),
    browser.history.search({ text: "", startTime: 0, maxResults: 100000 }),
  ]);

  const bookmarkYt = flattenBookmarks(bookmarkTree).map(toYtItem).filter(Boolean);
  const historyYt = historyItems
    .map((h) => toYtItem({ url: h.url, title: h.title, lastVisitTime: h.lastVisitTime }))
    .filter(Boolean);

  allItems = dedupeById([...bookmarkYt, ...historyYt]).sort((a, b) => (b.when || 0) - (a.when || 0));

  applyFilter();
}

queryInput.addEventListener("input", applyFilter);

init();
