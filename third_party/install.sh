#!/bin/bash

script_dir=$(dirname `[[ $0 = /* ]] && echo "$0" || echo "$PWD/${0#./}"`)
cd ${script_dir}
if [ $? -ne 0 ]; then
    echo " Could not change directory to ${script_dir}"
    exit 1;
fi

INSTALL_PREFIX=${script_dir}
mkdir -p build
mkdir -p include
pushd build

### CATCH (for testing) ###

if [ ! -f ${INSTALL_PREFIX}/include/catch.hpp ]; then
    wget https://github.com/catchorg/Catch2/releases/download/v2.1.1/catch.hpp
    cp catch.hpp ../include
fi

popd
