"use strict";
const fs = require('fs');
const sh = require('shelljs');

exports.build = function build() {

    const commands = [
        'eval $(minikube docker-env)',
        'docker build -f 7.dockerfile -t chromapdx/node:7 .',
        'docker push chromapdx/node:7'
    ]

    commands.forEach(function (str) {
        const code = sh.exec(str).code;
        if (code) {
            process.exit(code);
        }
    });

}