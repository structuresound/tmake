#!/bin/bash
# https://www.cockroachlabs.com/docs/manual-deployment.html

# Create a certs directory:
mkdir certs

# Create the CA key pair:
cockroach cert create-ca \
--ca-cert=certs/ca.cert \
--ca-key=certs/ca.key

# Create a client key pair for the root user:
cockroach cert create-client \
root \
--ca-cert=certs/ca.cert \
--ca-key=certs/ca.key \
--cert=certs/root.cert \
--key=certs/root.key

# For each node, create a node key pair issued to all common names you might use to refer to the node as well as to the HAProxy instances:
cockroach cert create-node \
<node internal IP address> \
<node external IP address> \
<node hostname>  \
<other common names for node> \
localhost \
127.0.0.1 \
<haproxy internal IP addresses> \
<haproxy external IP addresses> \
<haproxy hostnames>  \
<other common names for haproxy instances> \
--ca-cert=certs/ca.cert \
--ca-key=certs/ca.key \
--cert=certs/<node name>.cert \
--key=certs/<node name>.key