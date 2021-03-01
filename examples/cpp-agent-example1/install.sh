#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'

cd $(dirname `[[ $0 = /* ]] && echo "$0" || echo "$PWD/${0#./}"`)

PLATFORM=ubuntu-18.04

wget http://heisenware.com:4433/vrpc-cpp-agent/latest/vrpc-cpp-agent-${PLATFORM}.tar.gz

tar -xzf vrpc-cpp-agent-${PLATFORM}.tar.gz

mv ${PLATFORM} third_party

make
