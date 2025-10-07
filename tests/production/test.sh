#!/bin/bash
set -e

# Make sure the script runs in the directory in which it is placed
cd "$(dirname "$0")"

executable="../../vrpc/vrpc-agent-js"
adapterFile="./fixtures/adapter.js"

# Cleanup function to be called on exit
cleanup() {
  echo "--- Cleaning up agent process ---"
  # First, check if the agent_pid variable was set and if the process still exists.
  # `kill -0` is a portable way to check for a process without sending a signal.
  if [ -n "$agent_pid" ] && kill -0 "$agent_pid" 2>/dev/null; then
    # Use pkill with the -P flag to find and gracefully terminate all
    # processes whose parent PID is the agent's PID. This cleans up child processes.
    pkill -P "$agent_pid"

    # Now, send a graceful terminate signal to the main agent process.
    kill "$agent_pid"

    # Wait a brief moment to allow for a clean shutdown.
    sleep 1

    # As a final measure, if the process is still running, force kill it.
    if kill -0 "$agent_pid" 2>/dev/null; then
      echo "Agent did not terminate gracefully, sending SIGKILL."
      kill -9 "$agent_pid"
    fi
  else
    echo "Agent process already stopped."
  fi
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
