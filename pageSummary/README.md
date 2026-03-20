# pageSummary — LinkedIn Job Info Sidebar

Firefox sidebar extension that extracts key company info from LinkedIn job pages and displays it in the native Firefox sidebar panel (same area as Bookmarks/History).

## What it shows

- **Verdict**: RECRUITER / AGENCY (orange) or Direct Employer (green)
- Company name, Industry, Company size, LinkedIn followers
- Job title, Location, Poster title

Recruiter detection matches industry/company name/poster title against keywords: staffing, recruiting, placement, headhunting, manpower, outsourcing, etc.

## Architecture

| File | Role |
|---|---|
| `manifest.json` | MV2 manifest, declares `sidebar_action` and content scripts |
| `extractor.js` | Pure DOM extraction logic — shared by browser (global) and Node tests (CommonJS) |
| `content.js` | Injected into LinkedIn tabs — responds to `GET_JOB_INFO` messages, watches DOM for changes |
| `sidebar.js` | Runs in the sidebar panel — queries active tab, renders results |
| `sidebar.html/css` | Sidebar UI |

## Build and install on Ubuntu 24

### Prerequisites

```bash
npm install --global web-ext
```

### Build

```bash
cd /home/uzer/repos/webBrowserPlugins/pageSummary
web-ext build --overwrite-dest
# produces: web-ext-artifacts/page_summary_-_linkedin_job_info-1.0.zip
```

### Install

Regular Firefox (snap) on Ubuntu 24 **does not allow unsigned extensions** — `xpinstall.signatures.required` is enforced at the binary level regardless of `about:config`. Two working options:

**Option A — Firefox Developer Edition (recommended for local/personal use)**

Developer Edition genuinely supports unsigned extensions.

```bash
cd ~/Downloads
wget "https://download.mozilla.org/?product=firefox-devedition-latest-ssl&os=linux64&lang=en-US" -O firefox-dev.tar.bz2
tar xf firefox-dev.tar.bz2
mv firefox ~/progs/firefox-dev
~/progs/firefox-dev/firefox &
```

Then in Developer Edition:
1. `about:config` → set `xpinstall.signatures.required` to `false`
2. `about:addons` → gear icon → **Install Add-on From File**
3. Select `web-ext-artifacts/page_summary_-_linkedin_job_info-1.0.zip`

Developer Edition runs independently from regular Firefox with its own profile.

**Option B — Sign via Mozilla AMO (works in any Firefox)**

Produces a properly signed `.xpi` that installs in any Firefox without any config changes.

1. Create an account on `addons.mozilla.org`
2. Go to **Developer Hub → Manage API Keys** and generate JWT issuer + secret
3. Run:

```bash
web-ext sign --api-key=<JWT_issuer> --api-secret=<secret> --channel=unlisted
```

Mozilla signs it automatically (no review for unlisted/self-distributed add-ons) and downloads the signed `.xpi` into `web-ext-artifacts/`. Install via `about:addons` → gear → **Install Add-on From File**.

### After installing

Open the sidebar via **View → Sidebar → Job Summary**, then navigate to any LinkedIn job page.

## Running tests

```bash
npm test
```

Uses Node's built-in test runner + jsdom. Test fixtures are saved LinkedIn page DOM dumps in `test/resources/`.

## Key challenges

### 1. Native sidebar vs injected div

The extension uses Firefox's `sidebar_action` API (same panel as Bookmarks/History), **not** a `position: fixed` div injected into the page. This means the sidebar runs in its own isolated page context and communicates with the tab via `browser.tabs.sendMessage` / `browser.runtime.onMessage`.

### 2. LinkedIn uses obfuscated CSS class names

LinkedIn's current layout generates randomised class names (e.g. `_270d69ec`, `_93900a58`) that change with each deploy. **Never use class names as selectors.** Stable alternatives used:

- `[aria-label^="Company, "]` — identifies the company container; the aria-label value contains the exact company name
- Pill row: locate the `<p>` whose **entire text** matches a size pattern like `1001-5000 employees`, walk up 2 levels — that container holds industry / size / followers as sibling `<p>` elements

### 3. Pill row false-match on company description text

The naive regex `/\d.*employees/i` matches sentences like "more than 3,000 employees across five continents" inside the company bio. Fix: anchor the regex to the full string — `^[\d,]+[\s\-–]+[\d,]+\+?\s*employees$` — so it only matches standalone pill text, not embedded prose.

### 4. Two different LinkedIn page layouts

LinkedIn serves structurally different HTML depending on context:

| Layout | Where | Company selector | Industry/size selector |
|---|---|---|---|
| New (obfuscated) | `/jobs/view/*`, search results | `[aria-label^="Company, "]` → parse aria-label | Pill row `<p>` siblings (walk up 2 from size `<p>`) |
| Old (stable classes) | Job list detail panel | `.jobs-company__box .artdeco-entity-lockup__title` | `.jobs-company__inline-information` spans; industry is a direct text node in `.jobs-company__box .t-14.mt5` |

The extractor tries the new layout first and falls back to the old layout.

### 5. Job list view — detail panel in an iframe

When browsing `/jobs/search/`, the right-side job detail panel is rendered inside an `<iframe>`. Firefox's "Save Page As" captures the iframe as a separate `a.html` file inside the `_files/` folder — **not** in the main HTML file. Consequently:

- `document.documentElement.outerHTML` from the console does **not** contain the job detail data
- To get a usable test fixture, use the browser console snippet below to dump the iframe's document separately
- `all_frames: true` in `manifest.json` ensures content scripts are injected into the iframe too

**Dumping the live rendered DOM for test fixtures** (run in browser DevTools console after the target content is fully loaded):

```js
{
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([document.documentElement.outerHTML], {type:'text/html'}));
  a.download = 'dom-dump.html';
  a.click();
}
```

For the iframe specifically:

```js
{
  const iframe = document.querySelector('iframe');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([iframe.contentDocument.documentElement.outerHTML], {type:'text/html'}));
  a.download = 'dom-dump-iframe.html';
  a.click();
}
```

Note: `iframe.contentDocument` will be `null` for cross-origin iframes. LinkedIn's job detail iframe is same-origin so this works.

### 6. SPA navigation and auto-refresh timing

LinkedIn is a React SPA. Several issues arose:

**`tabs.onUpdated status=complete` fires too early** — the page shell loads but job details render asynchronously afterwards. Solved by using a `MutationObserver` in the content script that notifies the sidebar when the pill row appears or changes.

**Infinite refresh loop** — initial implementation sent `PAGE_UPDATED` immediately if the pill row was already present. This caused: `PAGE_UPDATED` → `scan()` → `GET_JOB_INFO` → pill present → `PAGE_UPDATED` → ∞. Fix: only send `PAGE_UPDATED` from inside the observer (never synchronously), so it only fires on actual DOM mutations.

**SPA job switching — observer misses the update** — when navigating between jobs in the list, the old job's pill row is briefly still in the DOM when `GET_JOB_INFO` arrives. The observer saw the pill as "already present" and did not watch for changes, so the new job's content replaced it silently. Fix: the observer now snapshots the pill row's text content at scan time and only fires `PAGE_UPDATED` when that content **changes**, not merely when it exists.

**Multiple rapid `tabs.onUpdated` events** — LinkedIn fires many update events during SPA navigation. Solved with a 300 ms debounce on `scan()` in the sidebar.

### 7. web-ext + snap Firefox incompatibility

`web-ext run` cannot launch snap-packaged Firefox due to snap's network sandbox blocking the remote debugging port. Use `about:debugging` → **This Firefox** → **Load Temporary Add-on** instead.
