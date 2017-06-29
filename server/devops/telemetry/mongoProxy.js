const path = require('path');
const spawn = require('child_process').spawn;
var Bluebird = require("bluebird");
var fs = require("fs");
var sh = require('shelljs');

const namespace = process.env.NAMESPACE;
if (!namespace) {
  throw new Error('please set kubernetes namespace in environment');
}

var mongoServers = [0, 1, 2];

for (const server of mongoServers) {
  const port = 27007 + server * 10;
  console.log('proxy mongo @', namespace, 'to localhost', port);
  const proxy = spawn('kubectl', ['--namespace=' + namespace, 'port-forward', 'mongo-' + server, port, port]);

  proxy.on('error', function (error) {
    console.warn('vault server error', error);
  });

  proxy.stdout.on('data', (data) => {
    console.log(`${data}`);
  });

  proxy.stderr.on('data', (data) => {
    console.warn(`${data}`);
  });

  proxy.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
  });
}