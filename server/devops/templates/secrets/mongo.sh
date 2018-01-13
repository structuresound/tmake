
# Prerequisites:
#	a. Make sure you have MongoDB Enterprise installed.
#   b. Make sure mongod/mongo are in the executable path
#   c. Make sure no mongod running on 27017 port, or change the port below
#   d. Run this script in a clean directory

##### Feel free to change following section values ####
# Changing this to include: country, province, city, company
dn_prefix="/C=US/ST=OR/L=PDX/O=Chroma"
ou_member="Mongo"
ou_client="Meteor"
mongodb_server_hosts=( "mongo-0" "mongo-1" "mongo-2" )
mongodb_client_hosts=( "admin" "meteor" )

# make a subdirectory for mongodb cluster
rm -Rf tls
mkdir -p tls
cd tls

echo "##### STEP 1: Generate root CA "
openssl genrsa -out root-ca.key 2048
# !!! In production you will want to use -aes256 to password protect the keys
#openssl genrsa -aes256 -out root-ca.key 2048
openssl req -new -x509 -days 3650 -key root-ca.key -out root-ca.crt -subj "$dn_prefix/CN=ROOTCA"

mkdir -p RootCA/ca.db.certs
echo "01" >> RootCA/ca.db.serial
touch RootCA/ca.db.index
echo $RANDOM >> RootCA/ca.db.rand
mv root-ca* RootCA/

echo "##### STEP 2: Create CA config"
# Generate CA config
cat >> root-ca.cfg <<EOF
[ RootCA ]
dir             = ./RootCA
certs           = \$dir/ca.db.certs
database        = \$dir/ca.db.index
new_certs_dir   = \$dir/ca.db.certs
certificate     = \$dir/root-ca.crt
serial          = \$dir/ca.db.serial
private_key     = \$dir/root-ca.key
RANDFILE        = \$dir/ca.db.rand
default_md      = sha256
default_days    = 3650
default_crl_days= 30
email_in_dn     = no
unique_subject  = no
policy          = policy_match

[ SigningCA ]
dir             = ./SigningCA
certs           = \$dir/ca.db.certs
database        = \$dir/ca.db.index
new_certs_dir   = \$dir/ca.db.certs
certificate     = \$dir/signing-ca.crt
serial          = \$dir/ca.db.serial
private_key     = \$dir/signing-ca.key
RANDFILE        = \$dir/ca.db.rand
default_md      = sha256
default_days    = 3650
default_crl_days= 30
email_in_dn     = no
unique_subject  = no
policy          = policy_match

[ policy_match ]
countryName     = optional
stateOrProvinceName = optional
localityName            = optional
organizationName    = optional
organizationalUnitName  = optional
commonName      = supplied
emailAddress        = optional

[ v3_req ]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment

[ v3_ca ]
subjectKeyIdentifier=hash
authorityKeyIdentifier=keyid:always,issuer:always
basicConstraints = CA:true
EOF

echo "##### STEP 3: Generate signing key"
# We do not use root key to sign certificate, instead we generate a signing key
openssl genrsa -out signing-ca.key 2048
# !!! In production you will want to use -aes256 to password protect the keys
# openssl genrsa -aes256 -out signing-ca.key 2048

openssl req -new -days 3650 -key signing-ca.key -out signing-ca.csr -subj "$dn_prefix/CN=CA-SIGNER"
openssl ca -batch -name RootCA -config root-ca.cfg -extensions v3_ca -out signing-ca.crt -infiles signing-ca.csr

mkdir -p SigningCA/ca.db.certs
echo "01" >> SigningCA/ca.db.serial
touch SigningCA/ca.db.index
# Should use a better source of random here..
echo $RANDOM >> SigningCA/ca.db.rand
mv signing-ca* SigningCA/

# Create root-ca.pem
cat RootCA/root-ca.crt SigningCA/signing-ca.crt > root-ca.pem



echo "##### STEP 4: Create server certificates"
# Now create & sign keys for each mongod server
# Pay attention to the OU part of the subject in "openssl req" command
# You may want to use FQDNs instead of short hostname
for host in "${mongodb_server_hosts[@]}"; do
	echo "Generating key for $host"
cat >> $host-san.cnf <<EOF
[ req ]
default_bits        = 2048 
default_keyfile     = privkey.pem 
distinguished_name  = req_distinguished_name
req_extensions          = v3_req
x509_extensions         = v3_ca

[ req_distinguished_name ]
countryName			= Country Name (2 letter code)
countryName_min			= 2
countryName_max			= 2
stateOrProvinceName		= State or Province Name (full name)
localityName			= Locality Name (eg, city)
0.organizationName		= Organization Name (eg, company)
organizationalUnitName		= Organizational Unit Name (eg, section)
commonName			= Common Name (eg, fully qualified host name)
commonName_max			= 64
emailAddress			= Email Address
emailAddress_max		= 64

[ v3_req ]
basicConstraints = CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment

[ v3_ca ]
subjectKeyIdentifier   = hash
authorityKeyIdentifier = keyid:always,issuer:always
subjectAltName         = email:myEmail@email.com
issuerAltName          = issuer:copy

EOF
  	openssl genrsa  -out ${host}.key 2048
	openssl req -new -days 3650 -key ${host}.key -out ${host}.csr -subj "$dn_prefix/OU=$ou_member/CN=${host}" -extensions v3_req -config $host-san.cnf
	openssl ca -batch -name SigningCA -config root-ca.cfg -out ${host}.crt -infiles ${host}.csr
	cat ${host}.crt ${host}.key > ${host}.pem
done

echo "##### STEP 5: Create client certificates"
# Now create & sign keys for each client
# Pay attention to the OU part of the subject in "openssl req" command
for host in "${mongodb_client_hosts[@]}"; do
	echo "Generating key for $host"
  	openssl genrsa  -out ${host}.key 2048
	openssl req -new -days 3650 -key ${host}.key -out ${host}.csr -subj "$dn_prefix/OU=$ou_client/CN=${host}"
	openssl ca -batch -name SigningCA -config root-ca.cfg -out ${host}.crt -infiles ${host}.csr
	cat ${host}.crt ${host}.key > ${host}.pem
done

# obtain the subject from the client key:
admin_subject=`openssl x509 -in ${mongodb_client_hosts[0]}.pem -inform PEM -subject -nameopt RFC2253 | grep subject | awk '{sub("subject= ",""); print}'`
meteor_subject=`openssl x509 -in ${mongodb_client_hosts[1]}.pem -inform PEM -subject -nameopt RFC2253 | grep subject | awk '{sub("subject= ",""); print}'`


echo "##### STEP 7: setup replicaset & initial user role\n"
myhostname=`hostname`
cat > ../setup_auth.js <<EOF
db.getSiblingDB("\$external").runCommand(
	{
		createUser: "$meteor_subject",
		roles: [
			{ role: "dbOwner", db: 'meteor' },
			{ role: "read", db: 'local' }
		],
		writeConcern: { w: "majority", wtimeout: 5000 }
	}
);
db.getSiblingDB("\$external").runCommand(
	{
		createUser: "$admin_subject",
		roles: [
			{ role: "readWriteAnyDatabase", db: 'admin' },
			{ role: "userAdminAnyDatabase", db: "admin" },
			{ role: "clusterAdmin", db: "admin" },
			{ role: "read", db: 'local' }
		],
		writeConcern: { w: "majority", wtimeout: 5000 }
	}
);
sleep(2000);
db.getSiblingDB("admin").runCommand({ shutdown: 1, force: true });
EOF

cat > ../setup_rs.js <<EOF
db.getSiblingDB("\$external").auth(
  {
    mechanism: "MONGODB-X509",
    user: "CN=admin,OU=Meteor,O=Chroma,L=PDX,ST=OR,C=US"
  }
);
use admin;
rs.initiate({
    _id: "rs0",
    version: 1,
    members: [
      { _id: 0, host : "mongo-0.mongo:27007" },
      { _id: 1, host : "mongo-1.mongo:27017" },
      { _id: 2, host : "mongo-2.mongo:27027" }
    ]
  });
sleep(20000);
db.getSiblingDB("admin").runCommand({ shutdown: 1, force: true });
EOF

# db.getSiblingDB("admin").runCommand(
# { shutdown: 1}
# );


# mongod &
# mongo --shell /etc/mongo/setup_auth.js &
# wait
cat > ../setup.sh <<EOF
PORT=\$1
mongod &
MONGO_PID=\$!
sleep 5
mongo --shell /etc/mongo/setup_auth.js
sleep 5
mongod --port \$PORT --auth --replSet rs0 \\
--sslMode requireSSL \\
--clusterAuthMode x509 \\
--sslPEMKeyFile /etc/mongo/mongo-2.pem \\
--sslCAFile /etc/mongo/root-ca.pem &
sleep 5
mongo mongodb://127.0.0.1:\$PORT --ssl \\
--sslPEMKeyFile /etc/mongo/admin.pem \\
--sslCAFile /etc/mongo/root-ca.pem \\
--sslAllowInvalidHostnames < /etc/mongo/setup_rs.js
sleep 5
EOF

cat > ../run.sh <<EOF
ORDINAL=\$(echo \$1 | sed 's/[^0-9]*//g')
PORT=\$(expr \$(expr \$ORDINAL \* 10) + 27007)
if [ "\$1" = 'mongo-2' ]; then
sh /etc/mongo/setup.sh \$PORT
fi;
echo starting mongo member \$ORDINAL @ \$PORT
mongod --port \$PORT --auth --replSet rs0 \\
--sslMode requireSSL \\
--clusterAuthMode x509 \\
--sslPEMKeyFile /etc/mongo/\$1.pem \\
--sslCAFile /etc/mongo/root-ca.pem
EOF

# echo "##### STEP 9: Connecting to replicaset using certificate\n"
cat > ../do_login.js <<EOF
db.getSiblingDB("\$external").auth(
  {
    mechanism: "MONGODB-X509",
    user: "$meteor_subject"
  }
)
EOF

# To Connect
# mongo mongodb://localhost:27007 --ssl --sslPEMKeyFile /etc/mongo/admin.pem --sslCAFile /etc/mongo/root-ca.pem --sslAllowInvalidHostnames
# mongo mongodb://localhost:27017 --ssl --sslPEMKeyFile /etc/mongo/admin.pem --sslCAFile /etc/mongo/root-ca.pem --sslAllowInvalidHostnames
# mongo mongodb://localhost:27027 --ssl --sslPEMKeyFile /etc/mongo/admin.pem --sslCAFile /etc/mongo/root-ca.pem --sslAllowInvalidHostnames


# mongo mongodb://mongo-1.mongo:27117 --ssl --sslPEMKeyFile /etc/mongo/admin.pem --sslCAFile /etc/mongo/root-ca.pem --sslAllowInvalidHostnames
# mongo mongodb://mongo-broker:27117 --ssl --sslPEMKeyFile /etc/mongo/admin.pem --sslCAFile /etc/mongo/root-ca.pem --sslAllowInvalidHostnames
# mongo mongodb://mongo-1.mongo:27017 --ssl --sslPEMKeyFile private/src/mongo/staging/tls/admin.pem --sslCAFile private/src/mongo/staging/tls/root-ca.pem --sslAllowInvalidHostnames
# mongo mongodb://mongo-0.mongo:5000 --ssl --sslPEMKeyFile admin.pem --sslCAFile ca.pem


# db.getSiblingDB("$external").auth(
#   {
#     mechanism: "MONGODB-X509",
#     user: "CN=admin,OU=Meteor,O=Chroma,L=PDX,ST=OR,C=US"
#   }
# )

# db.getSiblingDB("$external").auth(
#   {
#     mechanism: "MONGODB-X509",
#     user: "CN=admin,O=mongo"
#   }
# )

# rs.reconfig({
#     _id: "rs0",
#     version: 1,
#     members: [
#       { _id: 0, host : "mongo-0.mongo:27007" },
#       { _id: 1, host : "mongo-1.mongo:27017" },
#       { _id: 2, host : "mongo-2.mongo:27027" }
#     ]
#   }, {force: true});

# rs.reconfig({
#     _id: "rs0",
#     version: 1,
#     members: [
#       { _id: 0, host : "mongo.aucanna.chroma.fund:27017" },
#       { _id: 1, host : "mongo.aucanna.chroma.fund:27117" },
#       { _id: 2, host : "mongo.aucanna.chroma.fund:27217" }
#     ]
# });

# sudo bash -c 'echo mongo.aucanna.chroma.fund > /etc/hostname && hostname -F /etc/hostname'

# mongodb://CN%3Dmeteor%2COU%3DMeteor%2CO%3DChroma%2CL%3DPDX%2CST%3DOR%2CC%3DUS:@mongo.staging.chroma.fund:27017,mongo.staging.chroma.fund:27117,mongo.staging.chroma.fund:27217/meteor?authMechanism=MONGODB-X509&readPreference=primary&authSource=$external&ssl=true