#!/bin/bash
set -e

# Make sure the script runs in the directory in which it is placed
cd "$(dirname "$0")"

executable="../../vrpc/vrpc-agent-js"
adapterFile="./fixtures/adapter.js"

# Cleanup function to be called on exit
cleanup() {
  echo "--- Cleaning up agent process ---"
  # Kill the entire process group by using a negative PID.
  # The '--' prevents the negative PID from being interpreted as an option.
  kill -- -$agent_pid || true
}

# Set a trap to run the cleanup function when the script exits for any reason
trap cleanup EXIT INT TERM

# Start the agent in the background
echo "--- Starting agent ---"
$executable -d test.vrpc -a js -f "$adapterFile" & agent_pid=$!

# Give the agent a moment to initialize.
# A better solution would be to poll a port or check a log file.
sleep 6

# Run mocha in the foreground and wait for it to complete
echo "--- Running tests ---"
../../node_modules/.bin/mocha fixtures/vrpcRemoteTest.js --timeout 30000 --exit

# The trap will handle the cleanup automatically
echo "--- Tests finished ---"
