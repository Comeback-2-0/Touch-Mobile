#!/bin/sh

# ─────────────────────────────────────────────
# Xcode Cloud - Post Clone Script
# Runs on Apple's servers after cloning the repo
# Installs Node + CocoaPods + JS deps + Pods
# ─────────────────────────────────────────────

set -e  # Exit immediately on any error

echo "▶ Installing Homebrew..."
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

echo "▶ Installing Node via Homebrew..."
brew install node

echo "▶ Installing CocoaPods via Homebrew..."
brew install cocoapods

echo "▶ Installing JS dependencies (npm install)..."
cd "$CI_PRIMARY_REPOSITORY_PATH"
npm install

echo "▶ Running pod install..."
cd "$CI_PRIMARY_REPOSITORY_PATH/ios"
pod install

echo "✅ ci_post_clone.sh completed successfully."

exit 0
