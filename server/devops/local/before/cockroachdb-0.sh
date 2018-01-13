#!/bin/bash

APPROLE=localhost
DOMAIN=local
SERVICE=cockroachdb

echo fetch auth from $VAULT_ADDR
function login(){
    local JSON="{\"role_id\":\"$APPROLE\"}"
    local res=$(curl --silent -X POST -d $JSON $VAULT_ADDR/v1/auth/approle/login)
    echo $res | jq -r .auth.client_token > ~/.vault-token
    echo $res | jq -r .auth.policies[1]
}

while [[ "localhost" != $(login) ]]
do
    printf '.'
    sleep 1
done

# curl --silent -X POST -d $JSON $VAULT_ADDR/v1/auth/approle/login | jq .auth.client_token

# vault write auth/approle/login role_id=$APPROLE | grep -w token | while read id token; do echo $token > ~/.vault-token; done

for i in {0..2}
do
CERT_DIR=secrets/local/$SERVICE/tls/$i
rm -Rf $CERT_DIR
mkdir -p $CERT_DIR
NODE=$SERVICE-$i

vault write -format=json pki/issue/cockroachdb \
    common_name=node \
    alt_names="$NODE.$DOMAIN,localhost" \
    ip_sans="127.0.0.1" \
    ttl=720h \
    format=pem \
    > $CERT_DIR/$NODE.json

cat $CERT_DIR/$NODE.json | jq .data.certificate -r > $CERT_DIR/node.crt
cat $CERT_DIR/$NODE.json | jq .data.private_key -r > $CERT_DIR/node.key
cat $CERT_DIR/$NODE.json | jq .data.issuing_ca -r > $CERT_DIR/ca.crt    
(cd $CERT_DIR && chmod 700 *)
done