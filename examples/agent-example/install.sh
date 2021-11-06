#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'

cd $(dirname `[[ $0 = /* ]] && echo "$0" || echo "$PWD/${0#./}"`)

npm install
