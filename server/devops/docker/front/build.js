"use strict";
const fs = require('fs-extended');
const sh = require('shelljs');
const path = require('path');

const packagePath = path.join(__dirname, '../../../front/package.json');

exports.version = JSON.parse(fs.readFileSync(packagePath, 'utf8')).version;


exports.build = function build() {
    const revert = process.cwd();
    fs.copyFileSync(packagePath, path.join(__dirname, 'package.json'));
    const tag = 'tmake/front:' + exports.version
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