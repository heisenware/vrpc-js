#!/bin/bash

# Make sure the script runs in the directory in which it is placed
DIR=$(dirname `[[ $0 = /* ]] && echo "$0" || echo "$PWD/${0#./}"`)
cd $DIR

# Create project name
PROJECT=test

# Name of the container running the test
export TEST_CONT=${PROJECT}_testrunner

# define some colors to use for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# kill and remove any running containers
cleanup () {
  docker compose -p ${PROJECT} kill; docker compose -p ${PROJECT} rm -fv
}
# catch unexpected failures, do cleanup and output an error message
trap 'cleanup ; printf "${RED}Tests Failed For Unexpected Reasons${NC}\n"'\
  HUP INT QUIT PIPE TERM

# run the composed services
docker compose build && docker compose -p ${PROJECT} up -d

if [ $? -ne 0 ]; then
  printf "${RED}Docker Compose Failed (${TEST_CONT})${NC}\n"
  cleanup
  exit -1
fi

docker logs -f ${TEST_CONT}

EXIT_CODE=`docker inspect ${TEST_CONT} --format='{{.State.ExitCode}}'`

if [ -z ${EXIT_CODE+x} ] || [ "$EXIT_CODE" != "0" ]; then
  printf "${RED}Tests Failed (${TEST_CONT})${NC} - Exit Code: $EXIT_CODE\n"
else
  printf "${GREEN}Tests Passed (${TEST_CONT})${NC}\n"
fi

# call the cleanup fuction
cleanup

# exit the script with the same code as the test service code
exit $EXIT_CODE
