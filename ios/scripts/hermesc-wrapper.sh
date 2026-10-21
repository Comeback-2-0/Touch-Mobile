#!/usr/bin/env bash
REAL_HERMESC="${PODS_ROOT}/hermes-engine/destroot/bin/hermesc"
if [ ! -f "$REAL_HERMESC" ]; then
  REAL_HERMESC="$(dirname "$0")/../Pods/hermes-engine/destroot/bin/hermesc"
fi
exec "$REAL_HERMESC" -w "$@"
