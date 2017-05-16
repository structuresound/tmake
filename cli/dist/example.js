"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tmake_core_1 = require("tmake-core");
var colors = require("chalk");
var examples = [
    { name: 'hello world', type: 'binary', git: 'structuresound/tmakeExample' },
    { name: 'tmake repository server', type: 'binary', git: 'structuresound/tmakeServer' },
    { name: 'nodeKitten', type: 'library', git: 'structuresound/nodeKitten' }
];
function example() {
    tmake_core_1.log.log("\n***\n* " + colors.magenta('Tmake Examples') + "\n***\n");
    for (var _i = 0, examples_1 = examples; _i < examples_1.length; _i++) {
        var example_1 = examples_1[_i];
        var g = new TMake.Git(example_1.git);
        tmake_core_1.log.log(colors.green('git clone'), colors.gray("https://github.com/" + g.organization + "/") + colors.magenta(g.repository));
    }
    tmake_core_1.log.log("\n" + colors.green('cd') + " " + colors.magenta('[example directory]') + " && " + colors.green('tmake') + "\n  ");
}
exports.example = example;
