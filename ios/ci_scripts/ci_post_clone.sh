#!/bin/sh

# ─────────────────────────────────────────────
# Xcode Cloud - Post Clone Script
# Runs on Apple's macOS runner after cloning the repository.
# Prepares Node.js, JS dependencies, and CocoaPods.
# ─────────────────────────────────────────────

set -e

echo "▶ Setting up PATH for Homebrew and system binaries..."
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

# Resolve repository root
CI_PRIMARY_REPOSITORY_PATH="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$(dirname "$0")/../.." && pwd)}"
echo "▶ Primary repository path: $CI_PRIMARY_REPOSITORY_PATH"

# 1. Ensure Node.js is installed
if ! command -v node >/dev/null 2>&1; then
    echo "▶ Installing Node.js via Homebrew..."
    brew install node
else
    echo "▶ Node.js already available: $(node -v)"
fi

echo "▶ Using Node: $(command -v node)"

# 2. Configure .xcode.env.local for Xcode build phases
NODE_BINARY="$(command -v node)"
echo "export NODE_BINARY=${NODE_BINARY}" > "$CI_PRIMARY_REPOSITORY_PATH/ios/.xcode.env.local"
echo "▶ Configured .xcode.env.local with NODE_BINARY=$NODE_BINARY"

# 3. Ensure CocoaPods is installed
if ! command -v pod >/dev/null 2>&1; then
    echo "▶ Installing CocoaPods via Homebrew..."
    brew install cocoapods
else
    echo "▶ CocoaPods already available: $(pod --version)"
fi

# 4. Install JavaScript dependencies
echo "▶ Installing JS dependencies..."
cd "$CI_PRIMARY_REPOSITORY_PATH"
npm install --legacy-peer-deps

# 5. Install CocoaPods dependencies
echo "▶ Installing CocoaPods dependencies..."
cd "$CI_PRIMARY_REPOSITORY_PATH/ios"
pod install

echo "✅ ci_post_clone.sh completed successfully."
exit 0
