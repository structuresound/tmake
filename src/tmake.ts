import * as _ from 'lodash';
import * as Promise from 'bluebird';
import * as path from 'path';
import * as colors from 'chalk';
import * as fs from 'fs';
import {diff} from 'js-object-tools';

import {fetch, linkSource, destroy as destroySource} from './fetch';
import log from './util/log';
import args from './util/args';
import file from './util/file';
import profile from './profile';
import prompt from './prompt';
import {createNode, graph} from './graph';
import {Node, TMakeConf} from './node';
import cloud from './cloud';
import {isStale, configure, destroy as destroyConfiguration} from './configure';
import build from './build';
import {install, installHeaders} from './install';
import test from './test';
import {updateNode, cache, user as userDb, NodeModifier} from './db';

class Build {
  [index: string]: Function;

  fetch(node: Node) { return fetch(node); }
  configure(node: Node, isTest: boolean) {
    function doConfigure(node: Node) {
      return configure(node, isTest)
          .then(() => { return installHeaders(node); });
    }
    return this.fetch(node).then(() => {
      if (isStale(node)) {
        return destroyConfiguration(node)
            .then(() => { return doConfigure(node); });
      }
      return doConfigure(node);
    })
  }
  build(node: Node, isTest: boolean) {
    return this.configure(node, isTest)
        .then<any>(() => { return build(node, isTest); });
  }
  install(node: Node, isTest: boolean) {
    return this.build(node, isTest).then(() => install(node));
  }
  clean(node: Node, isTest: boolean) { return cleanDep(node); }
  test(node: Node) { return this.build(node, true).then(() => test(node)); }
  link(node: Node) {
    return this.install(node, false)
        .then(() => {
          const doc: TMakeConf = node.safe();
          const query = {name: doc.name, tag: doc.tag || 'master'};
          return userDb.update(query, {$set: doc}, {upsert: true});
        });
  }
}

function execute(conf: TMakeConf, phase: string) {
  let root: Node;
  return graph(_.extend(conf, {d: {root: args.runDir}}))
      .then((nodes: Node[]) =>
            {
              root = nodes[nodes.length - 1];
              if (!args.quiet) {
                log.add(_.map(nodes, d => d.name).join(' >> '));
              }
              if (args.nodeps) {
                return processDep(nodes[nodes.length - 1], phase);
              }
              return Promise.each(nodes, node => processDep(node, phase));
            })
      .then(() => { return Promise.resolve(root); });
}

function processDep(node: Node, phase: string) {
  if (!args.quiet) {
    log.log(`<< ${node.name} >>`);
  }
  if (args.verbose) {
    log.quiet(`>> ${phase} >>`);
  }
  process.chdir(args.runDir);
  return new Build()[phase](node);
}

function unlink(config: TMakeConf) {
  const query = {name: config.name, tag: config.tag || 'master'};
  return userDb.findOne(query).then<any>((doc: TMakeConf) => {
    if (doc) {
      return userDb.remove(query);
    }
    return Promise.resolve();
  });
}

function push(config: TMakeConf) {
  prompt
      .ask(colors.green(
          `push will do a clean, full build, test and if successful will upload to the ${colors.yellow('public repository')}\n${colors.yellow('do that now?')} ${colors.gray('(yy = disable this warning)')}`))
      .then((res: boolean) =>
            {
              if (res) {
                return execute(config, 'install');
              }
              return Promise.reject('user aborted push command');
            })
      .then(() => { return cache.findOne({name: config.name}); })
      .then((json: any) => {
        if (json.cache.bin || json.cache.libs) {
          return cloud.post(json).then((res) => {
            if (args.v) {
              log.quiet(`<< ${JSON.stringify(res, [], 2)}`, 'magenta');
            }
            return Promise.resolve(res);
          });
        }
        return Promise.reject(
            new Error('link failed because build or test failed'));
      });
}

function list(repo: string, selector: Object) {
  switch (repo) {
    default:
    case 'cache':
      return cache.find(selector);
    case 'user':
      return userDb.find(selector);
  }
}

function parse(config: TMakeConf) {
  const node = new Node(config, undefined);
  log.quiet(`parsing with selectors:\n ${node.profile.selectors}`);
  log.quiet(graph(module));
}

function cleanDep(node: Node) {
  log.quiet(`cleaning ${node.name}`);
  log.verbose(node.d);
  log.verbose(node.libs);
  if (fs.existsSync(node.d.build)) {
    log.quiet(`rm -R ${node.d.build}`);
    file.nuke(node.d.build);
  }
  _.each(node.libs, (libFile) => {
    log.quiet(`rm ${libFile}`);
    if (fs.existsSync(libFile)) {
      fs.unlinkSync(libFile);
    }
  });
  file.prune(node.d.root);
  const modifier: NodeModifier = {
    $unset: {
      'cache.configuration': true,
      'cache.metaConfiguration': true,
      'cache.target': true,
      'cache.libs': true,
      'cache.bin': true
    }
  };
  // const preserve = ['_id', 'cache', 'name'];
  // _.each(node, (v, k) => {
  //   if (!diff.contains(preserve, k)) {
  //     modifier.$unset[k] = true;
  //   }
  // });
  return cache.update(node, modifier)
      .then(() => {
        if (node.cache.generatedBuildFile) {
          const generatedBuildFile =
              path.join(node.d.project, node.cache.buildFile);
          const unsetter = {$unset: {'cache.buildFile': true}};
          try {
            if (fs.existsSync(generatedBuildFile)) {
              log.quiet(`clean generatedBuildFile ${generatedBuildFile}`);
              if (fs.lstatSync(generatedBuildFile).isDirectory()) {
                file.nuke(generatedBuildFile);
              } else {
                fs.unlinkSync(generatedBuildFile);
              }
            }
          } catch (err) {
            log.error(err(colors.yellow(err.message || err)));
          }
          return updateNode(node, unsetter);
        }
        return Promise.resolve();
      });
}

function findAndClean(depName: string) {
  return cache.findOne({name: depName})
      .then((node: Node) => {
        if (node) {
          return createNode(node, undefined)
              .then(cleanDep)
              .then(() => cache.findOne({name: depName})
                              .then((cleaned: TMakeConf) =>
                                        log.verbose(cleaned)));
        }
        return Promise.reject(`didn't find node for ${depName}`);
      });
}

export {
  execute,
  list,
  cleanDep,
  parse,
  push,
  unlink,
  profile,
  findAndClean,
  Build
};
