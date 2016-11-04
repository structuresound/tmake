// API is a bit wonky right now
import xcode from 'xcode';
import path from 'path';
import sh from "shelljs";
import _ from 'underscore';
import Promise from 'bluebird';
import fs from '../util/fs';
import colors from 'chalk';
import tmp from 'temporary';

const whichAsync = Promise.promisify(require('which'));
import createGroup from './pbxproj/createGroup';
// addFiconstoProject = require './pbxproj/addFiconstoProject'
/*
yourWorkspaceFile : path and filename of workspace file, e.g. path/CoolGame.xcworkspace * (points to ./path/CoolGame.xcworkspace)*
schemeName : name of scheme defined in project, e.g. CoolGame
targetName : name of build target in project
targetSDK : e.g. iphoneos
buildConfig : Debug, Release or Distribution
NameOfCertificateIdentity : e.g. iPhone Developer: My Name (738d039880d)
ProvisioningProfileName: e.g. Cool Game Development Profile
keyChainName: points to your keychain that can open development certificate, e.g. /Users/johnsmith/Library/Keychains/login.keychain
*/

String.prototype.format = function() {
  const formatted = this;
  const i = 0;
  while (i < arguments.length) {
    formatted = formatted.replace(new RegExp(`\\{${i}\\}`, 'g'), arguments[i]);
    i++;
  }
  return formatted;
};

const executeCommand = command => new Promise((resolve, reject) => sh.exec(command, function(code, stdout, stderr) {
  if (code) {
    return reject(`xcode-build exited with code ${code}\n${command}`);
  } else if (stdout) {
    return resolve(stdout);
  } else if (stderr) {
    return resolve(stderr);
  }
}));

const generate = function(buildFile) {
  const context = dep.configuration;
  return new Promise(function(res, rej) {
    if (argv.verbose) {
      console.log(colors.green('configure xcode project with context:'), context);
    }
    const pbxPath = path.join(buildFile, 'project.pbxproj');
    if (!fs.existsSync(pbxPath)) {
      var templatePath = path.join(argv.binDir, `assets/${platform.name()}.pbxproj`);
      if (!fs.existsSync(templatePath)) {
        throw new Error(`no file @ ${templatePath}`);
      }
      const pbxProj = fs.readFileSync(templatePath, 'utf8');
      pbxProj = platform.replaceAll(pbxProj, "TMAKE_PRODUCT_NAME", dep.name || 'tmake');
      pbxProj = platform.replaceAll(pbxProj, "TMAKE_ORGANIZATION_NAME", dep.organization || 'tmake');
      pbxProj = platform.replaceAll(pbxProj, "TMAKE-ORGANIZATION-IDENTIFIER", dep.identifier || 'tmake');
      sh.mkdir('-p', buildFile);
      fs.writeFileSync(pbxPath, pbxProj, 'utf8');
      if (!argv.quiet) {
        console.log(`wrote xc project @ ${pbxPath}`);
      }
    }
    const infoPath = path.join(dep.d.project, 'Info.plist');
    if (!fs.existsSync(infoPath)) {
      var templatePath = path.join(argv.binDir, `assets/${platform.name()}_Info.plist`);
      if (!fs.existsSync(templatePath)) {
        throw new Error(`no file @ ${templatePath}`);
      }
      const info = fs.readFileSync(templatePath, 'utf8');
      info = platform.replaceAll(info, "TMAKE_PRODUCT_NAME", dep.name || 'tmake');
      info = platform.replaceAll(info, "TMAKE_ORGANIZATION_NAME", dep.organization || 'tmake');
      info = platform.replaceAll(info, "TMAKE-ORGANIZATION-IDENTIFIER", dep.identifier || 'tmake');
      sh.mkdir('-p', buildFile);
      fs.writeFileSync(infoPath, info, 'utf8');
      if (!argv.quiet) {
        console.log(`wrote xc info plist @ ${infoPath}`);
      }
    }
    const xcProj = xcode.project(pbxPath);
    return xcProj.parse(function(err) {
      if (err) {
        rej(err);
      }
      createGroup(xcProj, 'source');
      // rootObject = xcProj.rootObject
      const addToXcProject = (collection, fn) => _.each(collection, function(filePath) {
        const relative = path.relative(dep.d.project, filePath);
        if (argv.verbose) {
          console.log(`add ${relative} to pbxproj`);
        }
        return fn(relative);
      });

      addToXcProject(context.includeDirs, rel => xcProj.addToHeaderSearchPaths(rel));
      addToXcProject(context.headers, rel => xcProj.addHeaderFile(rel, {}, dep.name));
      addToXcProject(context.sources, rel => xcProj.addSourceFile(rel, {}, dep.name));
      addToXcProject(context.libs, rel => xcProj.addStaticLibrary(rel));
      // xcProj.addToLibrarySearchPaths "trie_modules/libs"
      // addRelative xcProj.addFramework, context.raw.frameworks
      for (const i in xcProj.hash.project.objects.XCBuildConfiguration) {
        const conf = xcProj.hash.project.objects.XCBuildConfiguration[i];
        if (conf.buildSettings) {
          if (conf.buildSettings.LIBRARY_SEARCH_PATHS) {
            conf.buildSettings.LIBRARY_SEARCH_PATHS = _.map(conf.buildSettings.LIBRARY_SEARCH_PATHS, path => path.replace("$(TARGET_NAME)/", ""));
          }
        }
      }

      // console.log JSON.stringify xcProj.hash,0,2
      fs.writeFileSync(pbxPath, xcProj.writeSync());
      return res();
    });
  });
};

const build = function() {
  // safelyWrap = (string) ->
  //   JSON.stringify string
  const buildFile = path.join(dep.d.project, dep.cache.buildFile);

  const options = {
    clean: true,
    export: true,
    project: buildFile,
    configuration: '',
    workspace: '',
    scheme: '',
    allTargets: true,
    target: '',
    archivePath: '',
    exportFormat: 'IPA',
    exportPath: process.cwd(),
    exportFilename: 'export.ipa',
    exportProvisioningProfile: '',
    exportSigningIdentity: '',
    exportInstallerIdentity: '',
    arch: '',
    sdk: ''
  };

  // runCleanCommand = ->
  //   if !options.clean
  //     return Promise.resolve()
  //   command = [ 'clean' ]
  //   if options.project
  //     command.push '-project', safelyWrap(options.project)
  //   executeCommand(command, true).then ->
  //     console.log '`xcodebuild clean` was successful'

  // runArchiveCommand = ->
  //   if !options.export
  //     return Promise.resolve()
  //   command = [ 'archive' ]
  //   command.push '-archivePath', safelyWrap(options.archivePath)
  //   if options.project
  //     command.push '-project', safelyWrap(options.project)
  //   if options.configuration
  //     command.push '-configuration', safelyWrap(options.configuration)
  //   if options.workspace
  //     command.push '-workspace', safelyWrap(options.workspace)
  //   if options.scheme
  //     command.push '-scheme', safelyWrap(options.scheme)
  //   if options.arch
  //     command.push '-arch', safelyWrap(options.arch)
  //   if options.sdk
  //     command.push '-sdk', safelyWrap(options.sdk)
  //   if !options.exportSigningIdentity
  //     command.push 'CODE_SIGN_IDENTITY=""', 'CODE_SIGN_ENTITLEMENTS=""', 'CODE_SIGNING_REQUIRED=NO'
  //   if options.target
  //     command.push '-target', safelyWrap(options.target)
  //   else if options.allTargets and !options.scheme
  //     command.push '-alltargets'
  //   console.log 'Archiving: '
  //   executeCommand(command).then ->
  //     console.log '`xcodebuild archive` was successful'
  //     return

  // runExportCommand = ->
  //   if !options.export
  //     return Promise.resolve()
  //   command = [ '-exportArchive' ]
  //   command.push '-archivePath "{0}.xcarchive"'.format(options.archivePath)
  //   command.push '-exportPath "{0}/{1}"'.format(options.exportPath, options.exportFilename)
  //   command.push '-exportFormat', options.exportFormat
  //   if options.exportProvisioningProfile
  //     command.push '-exportProvisioningProfile', safelyWrap(options.exportProvisioningProfile)
  //   if options.exportSigningIdentity
  //     command.push '-exportSigningIdentity', safelyWrap(options.exportSigningIdentity)
  //   if options.exportInstallerIdentity
  //     command.push '-exportInstallerIdentity', safelyWrap(options.exportInstallerIdentity)
  //   if !options.exportSigningIdentity
  //     command.push '-exportWithOriginalSigningIdentity'
  //   console.log 'Exporting: '
  //   executeCommand(command).then ->
  //     console.log '`xcodebuild export` was successful'
  //     return

  // cleanUp = ->
  //   if temporaryDirectory
  //     temporaryDirectory.rmdir()
  //   if options.export
  //     console.log 'Built and exported product to: {0}/{1}'.format(options.exportPath, options.exportFilename)

  whichAsync('xcodebuild').then(function(path) {
    if (!path) {
      throw new Error('`xcodebuild` command is required for grunt-xcode to work, please install Xcode Tools from developer.apple.com');
    }
  });
  if (!options.project && !options.workspace) {
    throw new Error('`options.project` or `options.workspace` is required');
  }
  if (options.workspace && !options.scheme) {
    throw new Error('`options.scheme` is required when building a workspace');
  }
  if (!options.archivePath) {
    const temporaryDirectory = new tmp.Dir();
    options.archivePath = temporaryDirectory.path;
  }

  // runCleanCommand().then(runArchiveCommand).then(runExportCommand).finally cleanUp
  return Promise.resolve();
};
// init = (context) ->
//   new Promise (resolve, reject) ->
//     getRelativeFromArray = (collection) ->
//       _.map collection, (filePath) ->
//         relative = path.relative dep.d.project, filePath
//         relative
//
//     binding =
//       includes: getRelativeFromArray context.headers
//       targets: [
//         target_name: dep.name
//         # type: 'static_library'
//         sources: getRelativeFromArray context.sources
//         include_dirs: getRelativeFromArray context.includeDirs
//         libraries: getRelativeFromArray context.libs
//         dependencies: []
//         cflags: context.cflags
//         xcode_settings: {
//           "OTHER_CFLAGS": [ "-Wall", "-Werror" ]
//         }
//         conditions: [
//           ['OS=="mac"', {
//             'xcode_settings': {
//               'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
//               'OTHER_LDFLAGS': [
//                 '-undefined dynamic_lookup'
//               ]
//             }
//           }]
//         ]
//       ]
//
//     gypDir = new tmp.Dir()
//     fs.writeFileAsync "#{gypDir.path}/binding.gyp", JSON.stringify(binding, 0, 2)
//     .then ->
//       #gyp_argv = defaultArgv.slice()
//       #if argv.verbose then console.log 'gyp argv:', JSON.stringify(gyp_argv, 0, 2)
//       gyp.parseArgv ["-f xcode"]
//       process.chdir gypDir.path
//       gyp.commands.configure ["-f xcode"], (error) ->
//         throw error if error
//         xcPath = path.join gypDir.path, "build/binding.xcodeproj"
//         if fs.existsSync xcPath
//           if argv.verbose then console.log "mkdir", buildFile
//           # console.log "move #{xcPath} to #{buildFile}"
//           sh.mkdir '-p', buildFile
//           if argv.verbose then console.log "cp", xcPath, "to", buildFile
//           sh.cp '-R', "#{xcPath}", "#{buildFile}/"
//           if argv.verbose then console.log "cleanup", gypDir.path
//           #gypDir.rmdir()
//         else
//           throw new Error "gyp didn't create xcodeproj @ #{xcPath}"
//     .catch (err) ->
//       fs.nuke gypDir.path
//       fs.nuke buildFile
//       reject err
export default {
  generate,
  build
};
