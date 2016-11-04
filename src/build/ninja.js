import path from 'path';
import sh from "shelljs";
import _ from 'underscore';
import Promise from 'bluebird';
// fs = require('../util/fs')
// colors = require ('chalk')
const ninjaVersion = '1.6.0';
import log from '../util/log';

import toolchain from './toolchain';

const getNinja = function() {
  const resolved = toolchain.select({
    ninja: {
      version: ninjaVersion,
      url: "https://github.com/ninja-build/ninja/releases/download/v{ninja.version}/ninja-{HOST_PLATFORM}.zip"
    }
  });
  return toolchain.fetch(resolved).then(() => Promise.resolve(toolchain.pathForTool(resolved.ninja)));
};

const verifyToolchain = () => toolchain.fetch(dep.configuration.hostToolchain);

const build = () => new Promise((resolve, reject) => verifyToolchain().then(() => getNinja()).then(function(ninjaPath) {
  const directory = dep.d.project;
  const command = `${ninjaPath} -C ${directory}`;
  log.verbose(command);
  return sh.exec(command, function(code, stdout, stderr) {
    if (code) {
      return reject(`ninja exited with code ${code}\n${command}`);
    } else if (stdout) {
      return resolve(stdout);
    } else if (stderr) {
      return resolve(stderr);
    }
  });
}));

const genBuildScript = function(fileName) {
  const context = dep.configuration;
  // if argv.verbose then console.log colors.green('configure ninja with context:'), context
  const getRule = function(ext) {
    switch (ext) {
      case ".cpp":
      case ".cc":
        return "cxx";
      case ".c":
        return "c";
      default:
        throw "unknown extension, no coresponding ninja rule";
    }
  };
  const ninjaConfig = require('ninja-build-gen')(ninjaVersion, 'build');
  const includeString = ` -I${context.includeDirs.join(" -I")}`;

  const cc = context.cc || "gcc";

  const cCommand = `${cc} ${context.compilerFlags.join(' ')} -MMD -MF $out.d ${context.cFlags.join(' ')} -c $in -o $out ${includeString}`;
  const cxxCommand = `${cc} ${context.compilerFlags.join(' ')} -MMD -MF $out.d ${context.cxxFlags.join(' ')} -c $in -o $out ${includeString}`;

  ninjaConfig.rule('c').depfile('$out.d').run(cCommand).description(cCommand);

  ninjaConfig.rule('cxx').depfile('$out.d').run(cxxCommand).description(cxxCommand);

  const libName = dep.build.outputFile;
  const linkCommand = "ar rv $out $in";

  switch (context.target) {
    case 'static':
      if (dep.name.indexOf('lib') === -1) {
        if (typeof libName === 'undefined' || libName === null) {
          libName = `lib${dep.name}.a`;
        }
      } else {
        if (typeof libName === 'undefined' || libName === null) {
          libName = `${dep.name}.a`;
        }
      }
      linkCommand = "ar rv $out $in";
      break;
    case 'bin':
      if (typeof libName === 'undefined' || libName === null) {
        libName = `${dep.name}`;
      }
      const staticLibs = '';
      if (context.libs) {
        staticLibs = context.libs.join(' ');
      }
      linkCommand = `${cc} -o $out $in ${staticLibs} ${context.linkerFlags.join(' ')}`;
      break;
  }

  ninjaConfig.rule('link').run(linkCommand).description(linkCommand);

  const linkNames = _.map(context.sources, function(filePath) {
    // console.log 'process source file', filePath
    const dir = path.dirname(filePath);
    const relative = path.relative(dep.p.clone, dir);
    // console.log "relative from #{dep.p.clone} is #{relative}"
    const outBase = path.join("build/", relative);
    const ext = path.extname(filePath);
    const name = path.basename(filePath, ext);
    const linkName = `${outBase}/${name}.o`;
    // console.log 'add build file', linkName
    ninjaConfig.edge(linkName).from(filePath).using(getRule(ext));
    return linkName;
  });

  const linkInput = linkNames.join(" ");
  ninjaConfig.edge(`build/${libName}`).from(linkInput).using("link");

  return ninjaConfig.save(fileName);
};

export default {
  generate : genBuildScript,
  build,
  getNinja
}
