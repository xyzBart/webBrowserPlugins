import { Plugin, TFolder, TFile, PluginSettingTab, App, Setting, Notice } from 'obsidian';
import { spawn } from 'child_process';
import * as path from 'path';

interface OpenTerminalSettings {
  terminalCommand: string;
}

const DEFAULT_SETTINGS: OpenTerminalSettings = {
  terminalCommand: 'gnome-terminal',
};

export default class OpenTerminalPlugin extends Plugin {
  settings: OpenTerminalSettings;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new OpenTerminalSettingTab(this.app, this));

    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        // Determine the target directory
        let targetDir: string;
        const vaultPath = (this.app.vault.adapter as any).basePath as string;

        if (file instanceof TFolder) {
          targetDir = path.join(vaultPath, file.path);
        } else if (file instanceof TFile) {
          targetDir = path.join(vaultPath, file.parent?.path ?? '');
        } else {
          return;
        }

        menu.addItem((item) => {
          item
            .setTitle('Open Terminal here')
            .setIcon('terminal')
            .onClick(() => this.openTerminal(targetDir));
        });

        // Move item to top after the menu renders into the DOM
        setTimeout(() => {
          const menuEl = (menu as any).dom as HTMLElement | undefined;
          if (!menuEl) return;
          const ourItem = Array.from(menuEl.querySelectorAll<HTMLElement>('.menu-item'))
            .find(el => el.querySelector('.menu-item-title')?.textContent === 'Open Terminal here');
          if (ourItem) menuEl.prepend(ourItem);
        }, 0);
      })
    );
  }

  openTerminal(dir: string) {
    const cmd = this.settings.terminalCommand;

    // Map known terminals to their working-directory flags
    const knownTerminals: Record<string, string[]> = {
      'gnome-terminal': ['--working-directory', dir],
      'xterm': ['-e', `bash -c "cd '${dir}'; exec bash"`],
      'konsole': ['--workdir', dir],
      'xfce4-terminal': ['--working-directory', dir],
      'tilix': ['--working-directory', dir],
      'alacritty': ['--working-directory', dir],
      'kitty': ['-d', dir],
      'wezterm': ['start', '--cwd', dir],
    };

    const termName = cmd.split('/').pop() ?? cmd;
    const args = knownTerminals[termName] ?? [];

    const proc = spawn(cmd, args, {
      detached: true,
      stdio: 'ignore',
      cwd: dir,
    });
    proc.unref();

    proc.on('error', (err) => {
      new Notice(`Open Terminal: failed to launch "${cmd}"\n${err.message}`);
    });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class OpenTerminalSettingTab extends PluginSettingTab {
  plugin: OpenTerminalPlugin;

  constructor(app: App, plugin: OpenTerminalPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Terminal command')
      .setDesc('The terminal emulator executable to launch (e.g. gnome-terminal, xterm, kitty).')
      .addText((text) =>
        text
          .setPlaceholder('gnome-terminal')
          .setValue(this.plugin.settings.terminalCommand)
          .onChange(async (value) => {
            this.plugin.settings.terminalCommand = value.trim() || 'gnome-terminal';
            await this.plugin.saveSettings();
          })
      );
  }
}
