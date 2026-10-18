#!/bin/sh

# ─────────────────────────────────────────────
# Xcode Cloud - Post Clone Script
# Runs on Apple's macOS runner after cloning the repository.
# Prepares Node.js, JS dependencies, and CocoaPods.
# ─────────────────────────────────────────────

set -e
set -x  # Enable command tracing for transparent Xcode Cloud logs

# ── Heartbeat function to prevent Xcode Cloud 15-min inactivity timeout ──
# Prints a dot every 60 seconds so stdout is never silent for too long.
start_heartbeat() {
    while true; do
        sleep 60
        echo "… heartbeat $(date +%H:%M:%S)"
    done
}

stop_heartbeat() {
    if [ -n "$HEARTBEAT_PID" ]; then
        kill "$HEARTBEAT_PID" 2>/dev/null || true
        wait "$HEARTBEAT_PID" 2>/dev/null || true
    fi
}

start_heartbeat &
HEARTBEAT_PID=$!
trap stop_heartbeat EXIT

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

# 4. Patch Typhoeus via RUBYOPT to enforce 120s timeout and HTTP/1.1 across all Ruby runs
cat << 'EOF' > /tmp/typhoeus_patch.rb
begin
  require 'typhoeus'
  module Typhoeus
    class Request
      unless method_defined?(:orig_custom_init)
        alias_method :orig_custom_init, :initialize
        def initialize(base_url, options = {})
          options[:timeout] = 120 if options[:timeout] && options[:timeout] < 120
          options[:connecttimeout] = 120 if options[:connecttimeout] && options[:connecttimeout] < 120
          options[:http_version] = :httpv1_1 if options[:http_version] == :httpv2_0
          orig_custom_init(base_url, options)
        end
      end
    end
  end
rescue LoadError
end
EOF

export RUBYOPT="-r/tmp/typhoeus_patch.rb"

# 5. Also patch physical cdn_source.rb files on disk if found
for f in $(find /opt/homebrew /usr/local -name "cdn_source.rb" 2>/dev/null || true); do
    if [ -f "$f" ]; then
        echo "▶ Increasing timeout in $f..."
        perl -pi -e 's/:timeout => \d+/:timeout => 120/g; s/:connecttimeout => \d+/:connecttimeout => 120/g; s/:http_version => :httpv2_0/:http_version => :httpv1_1/g' "$f" 2>/dev/null || true
    fi
done

# 6. Install JavaScript dependencies
echo "▶ Installing JS dependencies..."
cd "$CI_PRIMARY_REPOSITORY_PATH"
npm install --legacy-peer-deps 2>&1

# 7. Install CocoaPods dependencies with automatic cumulative retries
echo "▶ Installing CocoaPods dependencies..."
cd "$CI_PRIMARY_REPOSITORY_PATH/ios"

MAX_ATTEMPTS=3
ATTEMPT=1
SUCCESS=0

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    echo "▶ Running pod install (attempt $ATTEMPT of $MAX_ATTEMPTS)..."
    if pod install --verbose 2>&1; then
        echo "✅ pod install succeeded on attempt $ATTEMPT!"
        SUCCESS=1
        break
    else
        echo "⚠️ pod install failed on attempt $ATTEMPT."
        # Keep downloaded specs cache so subsequent attempts resume instead of starting from zero
        if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
            echo "Waiting 10 seconds before retrying (cumulative cache preserved)..."
            sleep 10
        fi
        ATTEMPT=$((ATTEMPT + 1))
    fi
done

if [ $SUCCESS -ne 1 ]; then
    echo "❌ pod install failed after all attempts."
    echo "=== CocoaPods logs ==="
    find ~/Library/Logs/CocoaPods -type f -exec cat {} + 2>/dev/null || true
    exit 1
fi

# Stop heartbeat before exit
stop_heartbeat

echo "✅ ci_post_clone.sh completed successfully."
exit 0
