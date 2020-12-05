#!/bin/bash

export BASEIMAGE=${REGISTRY}/nginx-fips:${TAG}
echo "Openssl fips test"
docker run -it -e OPENSSL_FIPS=1 ${BASEIMAGE} openssl md5 /dev/null
status=$?

if test $status -eq 0
then
    echo "fips test failed"
    exit 1
else
	echo "fips test passed"
fi
