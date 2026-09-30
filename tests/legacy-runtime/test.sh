#!/bin/bash
# Runs the legacy-runtime spec on Node 16, the oldest runtime vrpc agents
# still ship on (native agents with OPC UA), against this checkout
DIR=$(cd "$(dirname "$0")/../.." && pwd)
exec docker run --rm -v "$DIR:/vrpc:ro" -w /vrpc node:16-alpine \
  ./node_modules/.bin/mocha tests/legacy-runtime/*.js --exit
