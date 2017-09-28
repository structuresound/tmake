"use strict";
const fs = require('fs-extended');
const sh = require('shelljs');
const path = require('path');

exports.version = '1.0.0';

exports.build = function build() {
    const revert = process.cwd();
    // fs.copyFileSync(packagePath, 'package.json');
    const tag = 'tmake/rabbitmq:' + exports.version
    console.log('building', tag);
    const commands = [
        'docker build -t ' + tag + ' .'
    ]
    sh.cd(__dirname);
    commands.forEach(function (str) {
        const code = sh.exec(str).code;
        if (code) {
            process.exit(code);
        }
    });
    sh.cd(revert);
}