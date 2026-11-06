## Install on a Mac

1. Download the `.dmg` below. It runs on Apple Silicon and Intel Macs with macOS 12 or later.
2. Open the `.dmg` and drag **Focus Zen** into **Applications**.
3. Open Focus Zen. The app is not notarized by Apple, so macOS blocks the first launch:
   - **macOS 15 or later:** click **Done**, open **System Settings → Privacy & Security**, scroll down, and click **Open Anyway**.
   - **macOS 14 or earlier:** right-click the app, choose **Open**, then click **Open**.

You can also clear the block in Terminal:

```sh
xattr -dr com.apple.quarantine "/Applications/Focus Zen.app"
```

To check the download, put the `.sha256` file next to the `.dmg` and run:

```sh
shasum -a 256 -c Focus-Zen_*_universal.dmg.sha256
```
