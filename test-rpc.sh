#!/bin/bash

source .env
curl -v -v \
	-H "Origin: ${CURL_PROTOCOL}://${CURL_ORIGIN}" \
	-H 'Content-Type: application/json' \
	-d '{"jsonrpc":"2.0","id":"0","method":"get_info"}' \
	${CURL_PROTOCOL}://${CURL_HOST}:${CURL_PORT}/json_rpc
