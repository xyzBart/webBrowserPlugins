// Firefox restores the sidebar's last open/closed state on startup; force it
// closed instead so the Job Summary sidebar doesn't always greet us open.
browser.runtime.onStartup.addListener(() => {
  browser.sidebarAction.close();
});
