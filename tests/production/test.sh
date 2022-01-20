#!/bin/bash

# Make sure the script runs in the directory in which it is placed
cd $(dirname `[[ $0 = /* ]] && echo "$0" || echo "$PWD/${0#./}"`)
executable="../../vrpc/vrpc-agent-js"
adapterFile="./fixtures/adapter.js"

$executable -d test.vrpc -a js -f $adapterFile & agent_pid=$!
sleep 6
../../node_modules/.bin/mocha fixtures/vrpcRemoteTest.js --timeout 30000 --exit & mocha_pid=$!
EXIT_CODE=$?
sleep 30
kill -9 "$agent_pid" > /dev/null 2>&1
kill -9 "$mocha_pid" > /dev/null 2>&1
exit $EXIT_CODE
