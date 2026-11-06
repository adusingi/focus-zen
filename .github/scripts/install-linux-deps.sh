#!/usr/bin/env bash
# Install the system packages that Tauri needs on Ubuntu runners.
#
# The runner's apt mirror sometimes hangs. Network timeouts, a time limit per
# attempt, and three attempts make that fail fast and recover, instead of
# holding the job until GitHub's 6-hour limit.
set -euo pipefail

packages=(
  libwebkit2gtk-4.1-dev
  libxdo-dev
  libssl-dev
  libayatana-appindicator3-dev
  librsvg2-dev
)

apt_options=(
  -o Acquire::Retries=3
  -o Acquire::http::Timeout=30
  -o Acquire::https::Timeout=30
  -o DPkg::Lock::Timeout=120
)

for attempt in 1 2 3; do
  if timeout 300 sudo apt-get "${apt_options[@]}" update &&
    timeout 600 sudo apt-get "${apt_options[@]}" install -y "${packages[@]}"; then
    exit 0
  fi
  echo "::warning::apt attempt ${attempt} of 3 failed or timed out"
  sleep 15
done

echo "::error::Could not install the Tauri system packages after 3 attempts"
exit 1
