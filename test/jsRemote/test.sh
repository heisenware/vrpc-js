#!/bin/bash

# Make sure the script runs in the directory in which it is placed
cd $(dirname `[[ $0 = /* ]] && echo "$0" || echo "$PWD/${0#./}"`)
executable="../../vrpc/vrpc-agent-js"
bindingFile="../fixtures/binding.js"

$executable -t vrpc_test -f $bindingFile js & agent_pid=$!
sleep 2
../../node_modules/.bin/mocha . --exit & mocha_pid=$!
EXIT_CODE=$?
sleep 8
kill -9 "$agent_pid" > /dev/null 2>&1
kill -9 "$mocha_pid" > /dev/null 2>&1
exit $EXIT_CODE
