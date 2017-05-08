"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tmake_core_1 = require("tmake-core");
const colors = require("chalk");
const examples = [
    { name: 'hello world', type: 'binary', git: 'structuresound/tmakeExample' },
    { name: 'tmake repository server', type: 'binary', git: 'structuresound/tmakeServer' },
    { name: 'nodeKitten', type: 'library', git: 'structuresound/nodeKitten' }
];
function example() {
    tmake_core_1.log.log(`
***
* ${colors.magenta('Tmake Examples')}
***
`);
    for (const example of examples) {
        const g = new TMake.Git(example.git);
        tmake_core_1.log.log(colors.green('git clone'), colors.gray(`https://github.com/${g.organization}/`) + colors.magenta(g.repository));
    }
    tmake_core_1.log.log(`
${colors.green('cd')} ${colors.magenta('[example directory]')} && ${colors.green('tmake')}
  `);
}
exports.example = example;
