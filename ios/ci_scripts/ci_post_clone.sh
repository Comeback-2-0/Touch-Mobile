#!/bin/sh

# ─────────────────────────────────────────────
# Xcode Cloud - Post Clone Script
# Runs on Apple's macOS runner after cloning the repository.
# Prepares Node.js, JS dependencies, and CocoaPods.
# ─────────────────────────────────────────────

set -e
set -x  # Enable command tracing for transparent Xcode Cloud logs

echo "▶ Setting up PATH and environment variables..."
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
export HOMEBREW_NO_AUTO_UPDATE=1
export COCOAPODS_DISABLE_STATS=true

# Git network resilience
git config --global http.postBuffer 524288000 || true
git config --global http.lowSpeedLimit 1000 || true
git config --global http.lowSpeedTime 60 || true

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

# 4. Patch CocoaPods CDN timeout from default 10s to 120s
# CocoaPods cdn_source.rb hardcodes a 10s Typhoeus timeout, causing
# 'Response: Timeout was reached' when downloading specs from raw.githubusercontent.com.
echo "▶ Patching CocoaPods CDN request timeouts from 10s to 120s..."
for f in $(find /opt/homebrew /usr/local /System/Library /Library -name "cdn_source.rb" 2>/dev/null); do
    if [ -f "$f" ]; then
        echo "▶ Increasing timeout in $f..."
        perl -pi -e 's/:timeout => \d+/:timeout => 120/g; s/:connecttimeout => \d+/:connecttimeout => 120/g' "$f" 2>/dev/null || true
    fi
done

# 5. Install JavaScript dependencies
echo "▶ Installing JS dependencies..."
cd "$CI_PRIMARY_REPOSITORY_PATH"
npm install --legacy-peer-deps

# 6. Install CocoaPods dependencies with automatic retries for CDN resilience
echo "▶ Installing CocoaPods dependencies..."
cd "$CI_PRIMARY_REPOSITORY_PATH/ios"

MAX_ATTEMPTS=4
ATTEMPT=1
SUCCESS=0

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    echo "▶ Running pod install (attempt $ATTEMPT of $MAX_ATTEMPTS)..."
    if pod install; then
        echo "✅ pod install succeeded on attempt $ATTEMPT!"
        SUCCESS=1
        break
    else
        echo "⚠️ pod install encountered network/CDN error on attempt $ATTEMPT."
        echo "▶ Cleaning trunk cache before retry..."
        pod repo remove trunk 2>/dev/null || true
        
        if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
            echo "Waiting 10 seconds before retrying..."
            sleep 10
        fi
        ATTEMPT=$((ATTEMPT + 1))
    fi
done

if [ $SUCCESS -ne 1 ]; then
    echo "❌ pod install failed after $MAX_ATTEMPTS attempts."
    echo "=== CocoaPods logs ==="
    find ~/Library/Logs/CocoaPods -type f -exec cat {} + 2>/dev/null || true
    exit 1
fi

echo "✅ ci_post_clone.sh completed successfully."
exit 0
