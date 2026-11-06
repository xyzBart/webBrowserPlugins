# MyExt — personal Firefox extension

Single Firefox extension (manifest name "MyExt", gecko id `myext@local`) bundling four personal features in one install:

- **LinkedIn job sidebar** — `sidebar_action`, content scripts injected on `linkedin.com/jobs/*`. Extracts company/recruiter info from the DOM (`extractor.js` + `content.js`), rendered in `sidebar.html`/`sidebar.js`.
- **YT playlist thumbnails** (`playlist.html`/`playlist.js`) — pick a bookmark folder from a dropdown, shows its YouTube video bookmarks as a full-tab thumbnail grid. Last-selected folder persists via `browser.storage.local`.
- **YT browse** (`browse.html`/`browse.js`) — the whole bookmark folder tree rendered on the left (all folders, nested, no filtering), clicking a folder shows its direct YouTube video children as a thumbnail grid on the right. Same idea as the playlist dropdown but navigable as a tree; last-selected folder persists separately (`lastBrowseFolderId`).
- **YT search across bookmarks + history** (`search.html`/`search.js`) — same thumbnail grid, filterable by a search box, sourced from all bookmarked + visited YouTube videos.

The three YT pages are reached via the `browser_action` toolbar popup (`popup.html`); the LinkedIn feature uses the native sidebar. Shared YT helpers/styles live in `yt-common.js` / `yt-style.css` (named with a `yt-` prefix to avoid clashing with the LinkedIn feature's `common`-style filenames).

This directory used to be `pageSummary/` (LinkedIn-only). It was renamed to `firefox/` and the extension renamed to MyExt when the YT features were merged in — single extension, not separate ones, since it's all personal/no-store use and extra manifests just add config overhead.

## Commands

- `npm test` — runs `test/extractor.test.js` (Node's built-in test runner + jsdom) against saved LinkedIn DOM fixtures in `test/resources/`.
- `npm run dev` — `web-ext run --firefox-binary ~/progs/firefox/firefox --firefox-profile ~/.config/mozilla/firefox/pd3e6zqc.dev-edition-default --keep-profile-changes`. Launches real Firefox Developer Edition against the actual profile (so real bookmarks/history show up in the YT features), auto-reloads the extension on every file save, and persists extension storage (e.g. the playlist dropdown selection) across separate `npm run dev` invocations.
- `web-ext build --overwrite-dest` — produces `web-ext-artifacts/myext-1.0.zip` for a permanent install via `about:addons` → gear icon → **Install Add-on From File**.

## Environment / profile setup (outside this repo)

- Firefox Developer Edition binary: `~/progs/firefox/firefox`.
- Its profile: `~/.config/mozilla/firefox/pd3e6zqc.dev-edition-default` (see `~/.config/mozilla/firefox/profiles.ini`).
- Regular/snap Firefox (`/usr/bin/firefox`) enforces `xpinstall.signatures.required` at the binary level — unsigned extensions cannot be installed there regardless of `about:config`. Developer Edition does respect the pref, so unsigned installs work there.
- Prefs `sidebar.revamp` and `xpinstall.signatures.required=false` are tracked at `~/repos/env/desktop/firefox/user.js` and **copied** (plain `cp`, not symlinked) into the Dev Edition profile's `user.js`.

## Gotchas

- **Never symlink `user.js` into the profile.** `web-ext run --keep-profile-changes` writes ~70 of its own automation/debug prefs (telemetry off, safebrowsing off, remote debugging on, etc.) directly into whatever `user.js` it's pointed at. If that file is a symlink back into this repo (or into `~/repos/env/desktop/firefox/user.js`), those writes land in the tracked source file and pollute it. Keep the profile's copy a plain file; re-`cp` manually if the source prefs ever change.
- **Don't run `npm run dev` from two places at once** (e.g. a background task and the user's own terminal simultaneously). Both processes fight over the same profile lock; Ctrl-C then hangs instead of exiting. Fix: find and `kill -9` the stray `web-ext`/`node` processes (`ps aux | grep web-ext`), then retry.
- `web-ext run` (without `--firefox-profile`) spins up a disposable temp profile with no bookmarks/history — fine for a quick UI smoke test, useless for testing the YT features for real. Always pass `--firefox-profile` (as the `dev` script already does) when testing those.
- Installing a built zip via `about:addons` does **not** hot-reload on rebuild — restarting Firefox reuses whatever was last installed. Re-run **Install Add-on From File** after every `web-ext build` if testing the packaged zip instead of `npm run dev`.
