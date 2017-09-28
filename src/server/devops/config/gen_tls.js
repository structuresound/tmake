const path = require('path');
const spawn = require('child_process').spawn;
var fs = require("fs");
var sh = require('shelljs');

const namespace = process.env.NAMESPACE;
let url;
if (namespace == 'www') {
  url = 'chroma.fund'
} else {
  url = `${namespace}.chroma.fund`
}
const localDns = `${namespace}.svc.cluster.local`
const artifactsDir = path.join(__dirname, '../../secrets/src/cluster', namespace);

if (fs.existsSync(artifactsDir)) {
  console.log('already printed cluster tls secrets for namespace', namespace);
  return
}
console.log('run vault @', url, 'cluster address', localDns, 'render to', artifactsDir);

const configPath = path.join(__dirname, 'vault.hcl');
const vault_server = spawn('vault', ['server', '-config', configPath]);

vault_server.on('error', function (error) {
  console.warn('vault server error', error);
});

vault_server.stdout.on('data', (data) => {
  console.log(`${data}`);
});

vault_server.stderr.on('data', (data) => {
  console.warn(`${data}`);
});

vault_server.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});

var options = {
  apiVersion: 'v1', // default
  endpoint: 'http://localhost:8200', // default
  token: '1234' // optional client token; can be fetched after valid initialization of the server
};
var vault = require("node-vault")(options);

var token;

vault.initialized().then((res) => {
    return vault.init({
      secret_shares: 1,
      secret_threshold: 1
    })
  })
  .then((result) => {
    vault.token = result.root_token;
    return vault.unseal({
      key: result.keys[0]
    })
  })
  .then(() => vault.addPolicy({
    name: 'localhost',
    rules: '{ "path": { "*": { "policy": "write" } } }'
  }))
  .then(pki)
  .then(() =>
    vault.enableAuth({
      mount_point: 'approle',
      type: 'approle',
      description: 'approle auth',
    }))
  .then(() =>
    vault.write('auth/approle/role/localhost', {
      role_id: 'localhost',
      bind_secret_id: false,
      policies: 'localhost',
      bound_cidr_list: '127.0.0.0/8',
      bind_secret_id: 'false'
    }))
  .then(() => {
    console.log('init success, fetch certs');
    fetchPKI();
  }).catch((error) => {
    console.log(error.message, error.stack);
  });

function pki() {
  return vault.mount({
      mount_point: 'pki',
      type: 'pki',
      description: 'pki root'
    })
    .then(() => vault.write('sys/mounts/pki/tune', {
      "max_lease_ttl": '87600h'
    }))
    .then(() => vault.write('pki/root/generate/internal', {
      common_name: url,
      ttl: '87600h'
    }))
    .then(() => vault.write('pki/config/urls', {
      issuing_certificates: `vault.${url}:8200/v1/pki/ca`,
      crl_distribution_points: `vault.${url}:8200/v1/pki/crl`,
    }))
    .then(() => vault.write(`pki/roles/cockroachdb`, {
      allow_any_name: 'true',
      organization: 'cockroachdb',
      max_ttl: '87600h'
    }))
    .then(() => vault.write(`pki/roles/mongo`, {
      allow_any_name: 'true',
      organization: 'mongo',
      max_ttl: '87600h'
    }))
    .then(() => vault.write(`pki/roles/meteor`, {
      allow_any_name: 'true',
      organization: 'meteor',
      max_ttl: '87600h'
    })).then(() => vault.write(`pki/roles/uoa`, {
      allow_any_name: 'true',
      organization: 'uoa',
      max_ttl: '87600h'
    })).catch((error) => {
      console.log(error.message, error.stack);
    });
}

function fetchPKI() {
  sh.exec(`
export VAULT_ADDR="http://127.0.0.1:8200"
SERVICE=mongo
APPROLE=localhost
CLUSTER_DNS=svc.cluster.local
CERT_DIR=${path.join(artifactsDir, '/tls/mongo')}
rm -rf $CERT_DIR
mkdir -p $CERT_DIR
OU=$SERVICE

vault write auth/approle/login role_id=$APPROLE | grep -w token | while read id token; do echo $token > ~/.vault-token; done
for i in {0..2}
do
NODE=$SERVICE-$i
vault write -format=json pki/issue/$SERVICE \
    common_name=$NODE \
    alt_names="$SERVICE.${url},$SERVICE.${namespace}.$CLUSTER_DNS,$NODE.$SERVICE,$NODE.$SERVICE.${namespace}.$CLUSTER_DNS" \
    ttl="87500h" \
    format=pem > $CERT_DIR/$SERVICE.json

cat $CERT_DIR/$SERVICE.json | jq .data.certificate -r > $CERT_DIR/$NODE.crt
cat $CERT_DIR/$SERVICE.json | jq .data.private_key -r > $CERT_DIR/$NODE.key
cat $CERT_DIR/$NODE.crt $CERT_DIR/$NODE.key > $CERT_DIR/$NODE.pem
cat $CERT_DIR/$SERVICE.json | jq .data.issuing_ca -r > $CERT_DIR/ca.crt
done

vault write -format=json pki/issue/$SERVICE \
    common_name=admin \
    ttl="87500h" \
    format=pem > $CERT_DIR/$SERVICE.json

cat $CERT_DIR/$SERVICE.json | jq .data.certificate -r > $CERT_DIR/admin.crt
cat $CERT_DIR/$SERVICE.json | jq .data.private_key -r > $CERT_DIR/admin.key
cat $CERT_DIR/admin.crt $CERT_DIR/admin.key > $CERT_DIR/admin.pem

vault write -format=json pki/issue/meteor \
    common_name=meteor \
    ttl="87500h" \
    format=pem > $CERT_DIR/$SERVICE.json

cat $CERT_DIR/$SERVICE.json | jq .data.certificate -r > $CERT_DIR/meteor.crt
cat $CERT_DIR/$SERVICE.json | jq .data.private_key -r > $CERT_DIR/meteor.key
cat $CERT_DIR/meteor.crt $CERT_DIR/meteor.key > $CERT_DIR/meteor.pem
`);

  sh.exec(`
export VAULT_ADDR="http://127.0.0.1:8200"
SERVICE=cockroachdb
APPROLE=localhost
CLUSTER_DNS=svc.cluster.local
CERT_DIR=${path.join(artifactsDir, '/tls/cockroachdb')}
rm -rf $CERT_DIR
mkdir -p $CERT_DIR
OU=$SERVICE

vault write auth/approle/login role_id=$APPROLE | grep -w token | while read id token; do echo $token > ~/.vault-token; done
for i in {0..2}
do
NODE=$SERVICE-$i
vault write -format=json pki/issue/$SERVICE \
    common_name=$NODE \
    alt_names="$SERVICE.${url},$SERVICE.${namespace}.$CLUSTER_DNS,$NODE.$SERVICE,$NODE.$SERVICE.${namespace}.$CLUSTER_DNS" \
    ttl="87500h" \
    format=pem > $CERT_DIR/$SERVICE.json

cat $CERT_DIR/$SERVICE.json | jq .data.certificate -r > $CERT_DIR/$NODE.crt
cat $CERT_DIR/$SERVICE.json | jq .data.private_key -r > $CERT_DIR/$NODE.key
cat $CERT_DIR/$SERVICE.json | jq .data.issuing_ca -r > $CERT_DIR/ca.crt
cat $CERT_DIR/ca.crt $CERT_DIR/$NODE.crt > $CERT_DIR/$NODE-fullchain.pem
done

vault write -format=json pki/issue/$SERVICE \
    common_name=root \
    ttl="87500h" \
    format=pem > $CERT_DIR/$SERVICE.json

cat $CERT_DIR/$SERVICE.json | jq .data.certificate -r > $CERT_DIR/root.crt
cat $CERT_DIR/$SERVICE.json | jq .data.private_key -r > $CERT_DIR/root.key
cat $CERT_DIR/ca.crt $CERT_DIR/root.crt > $CERT_DIR/fullchain.pem
`);

  vault_server.kill();
}