# Focus Zen

A small Tauri 2 desktop checklist. Items are stored locally in SQLite with creation and completion timestamps.

## Develop

```sh
npm install
npm run tauri dev
```

## Build for this Mac

```sh
npm run tauri build
```

The macOS app and installer are written under `src-tauri/target/release/bundle/`.

The database is local to each computer. Installing the app on another laptop does not automatically sync its list.
