function openPage(page) {
  browser.tabs.create({ url: browser.runtime.getURL(page) });
  window.close();
}

document.getElementById("playlist").addEventListener("click", () => openPage("playlist.html"));
document.getElementById("browse").addEventListener("click", () => openPage("browse.html"));
document.getElementById("search").addEventListener("click", () => openPage("search.html"));
