#!/bin/bash
set -e

cd "$(dirname "$0")"

executable="../../vrpc/vrpc-agent-js"
adapterFile="./fixtures/adapter.js"

cleanup() {
  exit_code=$?
  echo "--- Cleaning up agent process ---"

  if [ -n "$agent_pid" ] && kill -0 "$agent_pid" 2>/dev/null; then
    pkill -P "$agent_pid" 2>/dev/null || true
    kill "$agent_pid" 2>/dev/null || true
    sleep 1
    if kill -0 "$agent_pid" 2>/dev/null; then
      echo "Agent did not terminate gracefully, sending SIGKILL."
      kill -9 "$agent_pid" 2>/dev/null || true
    fi
    wait "$agent_pid" 2>/dev/null || true
  else
    echo "Agent process already stopped."
  fi

  exit $exit_code
}

trap cleanup EXIT INT TERM

echo "--- Starting agent ---"
$executable -d test.vrpc -a js -f "$adapterFile" & agent_pid=$!

sleep 6

echo "--- Running tests ---"
../../node_modules/.bin/mocha fixtures/vrpcRemoteTest.js --timeout 40000 --exit

echo "--- Tests finished ---"
