#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'

cd $(dirname `[[ $0 = /* ]] && echo "$0" || echo "$PWD/${0#./}"`)

# define some colors to use for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# final exit code
EXIT_CODE=0

# catch unexpected failures, do cleanup and output an error message
trap 'printf "${RED}Tests Failed For Unexpected Reasons${NC}\n"'\
  HUP INT QUIT PIPE TERM

# change to examples directory
cd ../examples

for dir in *; do

  # change into example folder
  cd $dir

  # install the example
  ./install.sh

  if [ $? -gt 0 ]; then
    printf "${RED}Installation of example ${dir} failed${NC}\n"
    cd ../
    continue
  fi

  # test the example
  ./test.sh

  if [ $? -gt 0 ]; then
    printf "${RED}Test of example ${dir} failed${NC}\n"
    EXIT_CODE=1
  fi

  # change back directory
  cd ../

done

exit $EXIT_CODE
