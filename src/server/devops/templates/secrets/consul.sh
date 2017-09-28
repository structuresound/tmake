echo "generate root ca + certs for consul and vault"

cat > ca-config.json <<EOF
{
  "signing": {
    "default": {
      "expiry": "87600h"
    },
    "profiles": {
      "default": {
        "usages": ["signing", "key encipherment", "server auth", "client auth"],
        "expiry": "87600h"
      }
    }
  }
}
EOF

cat > ca-csr.json <<EOF
{
  "hosts": [
    "GRUNT_NAMESPACE.svc.cluster.local",
    "GRUNT_URL"
  ],
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "US",
      "L": "Portland",
      "O": "Chroma",
      "OU": "CA",
      "ST": "Oregon"
    }
  ]
}
EOF

cat > consul-csr.json <<EOF
{
  "CN": "server.GRUNT_NAMESPACE.cluster.local",
  "hosts": [
    "server.GRUNT_NAMESPACE.cluster.local",
    "consul.GRUNT_NAMESPACE.svc.cluster.local",
    "consul.GRUNT_URL",
    "127.0.0.1"
  ],
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "US",
      "L": "Portland",
      "O": "Chroma",
      "OU": "Consul",
      "ST": "Oregon"
    }
  ]
}
EOF

cat > vault-csr.json <<EOF
{
  "CN": "vault.GRUNT_URL",
  "hosts": [
    "vault.GRUNT_NAMESPACE.svc.cluster.local",
    "vault.GRUNT_URL",
    "127.0.0.1"
  ],
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "US",
      "L": "Portland",
      "O": "Chroma",
      "OU": "Vault",
      "ST": "Oregon"
    }
  ]
}
EOF

cfssl gencert -initca ca-csr.json | cfssljson -bare ca

cfssl gencert \
  -ca=ca.pem \
  -ca-key=ca-key.pem \
  -config=ca-config.json \
  -profile=default \
  consul-csr.json | cfssljson -bare consul

cfssl gencert \
  -ca=ca.pem \
  -ca-key=ca-key.pem \
  -config=ca-config.json \
  -profile=default \
  vault-csr.json | cfssljson -bare vault

consul keygen > gossip-encryption-key
uuidgen > acl-agent-master-token