import * as fs from 'fs';
import * as path from 'path';
import * as Bluebird from 'bluebird';
import 'mocha';
import { assert, expect } from 'chai';
import { contains, each, check } from 'typed-json-transform';

import {
  ProjectRunner, list, findAndClean, defaults,
  Runtime, execAsync, graph, loadCache, args, parseFileSync, nuke, moveArchive
} from 'tmake-core';


import { TestDb } from './db';

import * as os from 'os';

interface Ctx {
  zlib: TMake.Project,
  testDb: TMake.Database.Interface,
  targets: TMake.Target,
  architectures: string[],
  platform: string
}

let crossCompilePlatforms = ['android'];

if (os.platform() == 'darwin'){
  // crossCompilePlatforms.push('ios');
  crossCompilePlatforms = ['ios'];
}

each( crossCompilePlatforms, (platform) => {
  describe(`${platform}: `, function () {
    this.timeout(240000);

    const ctx: Ctx = <any>{
      zlib: undefined,
      testDb: undefined,
      targets: {},
      architectures: [],
      platform
    }
    
    before(() => {
      ctx.testDb = new TestDb();
      assert.ok(ctx.testDb.projectNamed, 'Missing Db');
      Runtime.init({commandLine: {[platform]: true}, database: ctx.testDb});

      ctx.targets = defaults.environment.build[ctx.platform];

      const architectures = Object.keys(ctx.targets);
      assert.ok(contains(architectures, 'arm64'), 'missing architecture arm64');

      Runtime.loadPlugins();
      assert.equal(args.runDir, path.join(__dirname, '../runtime'), 'test configuration');
      const zlibConf = parseFileSync(path.join(__dirname, 'config/zlib.yaml'));
      return graph(zlibConf)
        .then((res) => {
          ctx.zlib = res[res.length - 1];
          const {parsed} = ctx.zlib;
          assert.isOk(parsed);
          assert.equal(parsed.name, 'zlib');
          const {target} = parsed;
          assert.isOk(target, 'Missing target from parsed project');
          assert.isOk(target.flags, 'Missing flags from parsed target');
        });
    });

    it('build: ninja', () => {
      const {zlib, platform, architectures} = ctx;
      assert.ok(zlib, 'missing project');
      return loadCache(zlib).then(() => {
        return new ProjectRunner(zlib).all().then(() => {
          return Bluebird.each(architectures, (architecture: string) => {
            const id = zlib.parsed.platforms[platform][architecture].hash();
            const fp = path.join(args.runDir, 'build', id, `${zlib.parsed.name}`);
            const exists = fs.existsSync(fp);
            return expect(exists, fp).to.equal(true);
          });
        });
      });
    });  

    it('can clean the project', () => {
      const {zlib} = ctx;
      assert.ok(zlib, 'missing project');
      return loadCache(zlib).then(() => {
        return new ProjectRunner(zlib).clean().then(() => {
          const fe = fs.existsSync(path.join(args.runDir, 'build'));
          return expect(fe).to.not.be.ok;
        });
      });
    });
  });
});
