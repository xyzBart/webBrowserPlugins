# Obsidian — Open Terminal

Adds an **Open Terminal here** item to the file explorer context menu.

## Installation

1. Build the plugin (or use the pre-built `main.js`):
   ```bash
   npm install
   npm run build
   ```

2. Copy `main.js` and `manifest.json` into your vault's plugin folder:
   ```bash
   mkdir -p /path/to/your/vault/.obsidian/plugins/open-terminal
   cp main.js manifest.json /path/to/your/vault/.obsidian/plugins/open-terminal/
   ```

3. In Obsidian: **Settings → Community plugins → disable Safe mode → enable Open Terminal**.

## Usage

Right-click any file or folder in the **File Explorer** panel. The **Open Terminal here** item appears at the top of the context menu.

- Right-clicking a **folder** opens the terminal in that folder.
- Right-clicking a **file** opens the terminal in the file's parent folder.

## Changing the menu item position

The position is controlled in `src/main.ts`. Find this block inside the `file-menu` event handler:

```typescript
// Move item to top after the menu renders into the DOM
setTimeout(() => {
  const menuEl = (menu as any).dom as HTMLElement | undefined;
  if (!menuEl) return;
  const ourItem = Array.from(menuEl.querySelectorAll<HTMLElement>('.menu-item'))
    .find(el => el.querySelector('.menu-item-title')?.textContent === 'Open Terminal here');
  if (ourItem) menuEl.prepend(ourItem);
}, 0);
```

| Goal | Change |
|------|--------|
| **Top** (default) | `menuEl.prepend(ourItem)` |
| **Bottom** | `menuEl.append(ourItem)` |
| **Second from top** | `menuEl.children[0].insertAdjacentElement('afterend', ourItem)` |
| **Remove positioning** | Delete the entire `setTimeout` block — item will appear at Obsidian's default position |

After any edit, rebuild and copy `main.js` to your vault:
```bash
npm run build
cp main.js /path/to/your/vault/.obsidian/plugins/open-terminal/
```

Then reload the plugin in Obsidian (**Settings → Community plugins → disable/enable Open Terminal**).

## Changing the terminal emulator

Go to **Settings → Open Terminal** and enter the executable name, e.g. `gnome-terminal`, `xterm`, `kitty`, `alacritty`, `konsole`, `tilix`, `wezterm`.

Default is `gnome-terminal` (standard on Ubuntu 24).
