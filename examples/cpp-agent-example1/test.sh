#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'

cd $(dirname `[[ $0 = /* ]] && echo "$0" || echo "$PWD/${0#./}"`)

./vrpc-foo-agent -d publi.vrpc -a $(hostname)-${RANDOM} & pid=$!

EXIT_CODE=$?
sleep 5
kill -9 "$pid" > /dev/null 2>&1
exit $EXIT_CODE
