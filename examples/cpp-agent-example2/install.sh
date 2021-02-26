#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'

cd $(dirname `[[ $0 = /* ]] && echo "$0" || echo "$PWD/${0#./}"`)

PLATFORM=ubuntu-18.04

wget http://media.vrpc.io:8080/vrpc-cpp-agent-${PLATFORM}.tar.gz

tar -xzf vrpc-cpp-agent-${PLATFORM}.tar.gz

mv ${PLATFORM} third_party

make
