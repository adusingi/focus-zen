# Focus Zen

[![CI](https://github.com/adusingi/focus-zen/actions/workflows/ci.yml/badge.svg)](https://github.com/adusingi/focus-zen/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A quiet desktop checklist for follow-ups. Type a line, press Enter, tick it off when it is done. Nothing else on the screen.

Built with [Tauri 2](https://tauri.app) and Rust. Items are stored locally in SQLite. There is no account, no sync, and no network access.

![Focus Zen with four open follow-ups](docs/screenshot.png)

## Download

Get the `.dmg` from the [latest release](https://github.com/adusingi/focus-zen/releases/latest). It runs on Apple Silicon and Intel Macs with macOS 12 or later.

1. Open the `.dmg` and drag **Focus Zen** into **Applications**.
2. Open Focus Zen. The app is not notarized by Apple, so macOS blocks the first launch:
   - **macOS 15 or later:** click **Done**, open **System Settings → Privacy & Security**, scroll down, and click **Open Anyway**.
   - **macOS 14 or earlier:** right-click the app, choose **Open**, then click **Open**.

You can also clear the block in Terminal: `xattr -dr com.apple.quarantine "/Applications/Focus Zen.app"`

## Use it

| Action | How |
| --- | --- |
| Add an item | Type on the empty line, then press <kbd>Enter</kbd> |
| Edit an item | Click its text, change it, then press <kbd>Enter</kbd> |
| Cancel an edit | Press <kbd>Esc</kbd> |
| Finish an item | Click its checkbox |

Finished items leave the list. They stay in the database with a `completed_at` timestamp, next to the `created_at` timestamp of every item.

## Run from source

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (stable)
- [Node.js](https://nodejs.org) 22.13 or later
- [pnpm](https://pnpm.io/installation) 11
- The system packages that Tauri needs for your OS: see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/). On macOS this is the Xcode Command Line Tools (`xcode-select --install`).

### Clone and start

```sh
git clone https://github.com/adusingi/focus-zen.git
cd focus-zen
pnpm install
pnpm tauri dev
```

The first start compiles the Rust side, so it takes a few minutes. Later starts are fast.

To work on the UI only, run `pnpm dev` and open <http://127.0.0.1:1420>. In a normal browser the app stores items in `localStorage` instead of SQLite.

## Build the app

```sh
pnpm tauri build
```

The app and its installer are written to `src-tauri/target/release/bundle/`. On a Mac you get `Focus Zen.app` and a `.dmg`.

The macOS build is signed ad hoc and is not notarized. It opens normally on the Mac that built it. On another Mac, Gatekeeper blocks the first launch; see [Download](#download) for how to open it.

## Release

1. Set the same new version in `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`, then commit.
2. Tag that commit and push the tag:

   ```sh
   git tag v0.2.0
   git push origin v0.2.0
   ```

The [Release workflow](.github/workflows/release.yml) builds a universal `.dmg` (Apple Silicon and Intel), checks it, and publishes it with a SHA-256 checksum as a GitHub Release. It stops if the tag and the three versions do not match.

## Where your data lives

The database file is `focus-zen.db` in the app's config folder:

| OS | Folder |
| --- | --- |
| macOS | `~/Library/Application Support/com.focuszen.desktop/` |
| Linux | `~/.config/com.focuszen.desktop/` |
| Windows | `%APPDATA%\com.focuszen.desktop\` |

Each computer keeps its own list. To move your list, copy that folder while the app is closed.

## Project layout

```text
src/                     UI: index.html, styles.css, app.js (plain JavaScript, built by Vite)
src-tauri/               Rust app: window setup and the SQLite plugin
src-tauri/migrations/    SQL migrations, applied on start
src-tauri/capabilities/  Permissions the UI has for the SQL plugin
```

## Contributing

Issues and pull requests are welcome. Before you open a pull request, run the same checks as CI:

```sh
pnpm build
cd src-tauri
cargo fmt --check
cargo clippy --all-targets --locked -- -D warnings
```

## License

[MIT](LICENSE) © 2026 Aimable Dusingizimana
