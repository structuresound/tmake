const settings = require("./package.json").vaultSettings;
var argv = require('minimist')(process.argv.slice(2));
var path = require('path');
var sh = require('shelljs');
settings.NAMESPACE = argv.namespace || process.env.NAMESPACE;

settings.ca = {
  domain: `${settings.NAMESPACE}.chroma.fund`,
  cluster: `${settings.NAMESPACE}.svc.cluster.local`
};

if (!settings.NAMESPACE) {
  throw new Error("no namespace provided");
}

if (process.env.VAULT_ADDR) {
  settings.vault.endpoint = process.env.VAULT_ADDR;
}

// get new instance of the client
var vault = require("node-vault")(settings.vault);
var Bluebird = require("bluebird");
var fs = require("fs");

const masterCredentialsCachePath = path.join(__dirname, '../../private/src/vault', settings.NAMESPACE, 'master-vault-keys.json');

function doUnseal() {
  var master = JSON.parse(fs.readFileSync(masterCredentialsCachePath, 'utf8'));
  vault.token = master.root_token;
  return Bluebird.each(master.keys, (key) => vault.unseal({
    key
  }));
}

function pki() {
  return vault.write('sys/mounts/pki/tune', {
    "max_lease_ttl": '87600h'
  }).then(() => vault.write('pki/root/generate/internal', {
    common_name: settings.ca.domain,
    ttl: '87600h'
  })).then(() => vault.write('pki/config/urls', {
    issuing_certificates: `vault.${settings.ca.domain}:8200/v1/pki/ca`,
    crl_distribution_points: `vault.${settings.ca.domain}:8200/v1/pki/crl`,
  })).then(() => vault.write(`pki/roles/cockroachdb`, {
    allow_any_name: 'true',
    organization: 'chroma',
    ou: 'cockroachdb',
    max_ttl: '720h'
  })).then(() => vault.write(`pki/roles/mongo`, {
    allow_any_name: 'true',
    organization: 'chroma',
    ou: 'mongodb',
    max_ttl: '720h'
  }))
}

const cli = {
  unseal: function unseal() {
    vault.initialized()
      .then((result) => {
        if (!result.initialized) {
          console.log('vault has not been initialized');
          process.exit(0);
        }
        return doUnseal();
      }).then(() => {
        console.log('vault has been unsealed');
      });
  },
  init: function init() {
    vault.initialized()
      .then((result) => {
        console.log(result);
        if (result.initialized) {
          console.log('vault has already been initialized')
          process.exit(0);
        }
        return vault.init({
          secret_shares: 3,
          secret_threshold: 2
        })
      })
      .then((result) => {
        console.log(JSON.stringify(result, 0, 2));
        sh.mkdir('-p', path.dirname(masterCredentialsCachePath));
        fs.writeFileSync(masterCredentialsCachePath, JSON.stringify(result, 0, 2));
        return doUnseal();
      })
      .then(() => vault.addPolicy({
        name: 'pod',
        rules: '{ "path": { "pki/*": { "policy": "write" } } }',
      }))
      .then(() => vault.addPolicy({
        name: 'dev',
        rules: '{ "path": { "*": { "policy": "sudo" } } }',
      }))
      .then(() => {
        return vault.mount({
          mount_point: 'pki',
          type: 'pki',
          description: 'pki root',
        })
      }).then(pki).then(() => {
        return vault.enableAuth({
          mount_point: 'approle',
          type: 'approle',
          description: 'approle auth',
        })
          .then(() => vault.write('auth/approle/role/pod', {
            role_id: 'pod',
            bind_secret_id: false,
            policies: 'pod',
            bound_cidr_list: '100.64.0.0/10,10.0.0.0/8'
          }))
      }).then(() => {
        return vault.auths()
          .then((result) => vault.enableAuth({
            mount_point: 'github',
            type: 'github',
            description: 'GitHub auth',
          }))
          .then(() => vault.write('auth/github/config', {
            organization: settings.github.org
          }))
          .then(() => vault.write(`auth/github/map/teams/${settings.github.team}`, {
            value: 'dev'
          }))
          .then(() => {
            console.log('vault has been initialized with github, and local roles')
            process.exit(0);
          })
      });
  },
  pki: pki
}

const command = argv._[0];
if (!command) throw new Error("no command supplied ['init', 'unseal', 'pki']")
cli[argv._[0]]();