#!/bin/bash
cd uoa
APPROLE=localhost
CERT_DIR=settings/tls

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

echo cleanup cert dir $CERT_DIR
mkdir -p $CERT_DIR
rm $CERT_DIR/*
echo fetch certificate from $VAULT_ADDR
VAULT_ADDR=$VAULT_ADDR vault write -format=json pki/issue/cockroachdb \
    common_name=root \
    alt_names="$(hostname),localhost" \
    ip_sans="127.0.0.1" \
    ttl=720h \
    format=pem \
    > $CERT_DIR/root.json

echo build certificates + correct permissions
cat $CERT_DIR/root.json | jq .data.certificate -r > $CERT_DIR/client.root.crt
cat $CERT_DIR/root.json | jq .data.private_key -r > $CERT_DIR/client.root.key
cat $CERT_DIR/root.json | jq .data.issuing_ca -r > $CERT_DIR/ca.crt
(cd $CERT_DIR && chmod 700 * && openssl pkcs12 -export -inkey client.root.key -in client.root.crt -name cockroach-admin -out cockroach-admin.pfx -passout pass:cockroach)

echo generate local user for cockroachdb
cockroach sql --certs-dir=$CERT_DIR --host=cockroachdb-0.local --port=5100 \
-e "CREATE DATABASE uoa;" \
-e "CREATE USER local WITH PASSWORD 'insecure';" \
-e "GRANT ALL ON DATABASE uoa TO local;" \
-e "\q" \

gulp scripts