# API is a bit wonky right now
xcode = require('xcode')
path = require('path')
sh = require "shelljs"
_ = require 'underscore'
Promise = require 'bluebird'
fs = require('../util/fs')
colors = require ('chalk')
tmp = require('temporary')

whichAsync = Promise.promisify require('which')
createGroup = require './pbxproj/createGroup'
# addFileToProject = require './pbxproj/addFileToProject'
###
yourWorkspaceFile : path and filename of workspace file, e.g. path/CoolGame.xcworkspace * (points to ./path/CoolGame.xcworkspace)*
schemeName : name of scheme defined in project, e.g. CoolGame
targetName : name of build target in project
targetSDK : e.g. iphoneos
buildConfig : Debug, Release or Distribution
NameOfCertificateIdentity : e.g. iPhone Developer: My Name (738d039880d)
ProvisioningProfileName: e.g. Cool Game Development Profile
keyChainName: points to your keychain that can open development certificate, e.g. /Users/johnsmith/Library/Keychains/login.keychain
###

String::format = ->
  formatted = this
  i = 0
  while i < arguments.length
    formatted = formatted.replace(new RegExp('\\{' + i + '\\}', 'g'), arguments[i])
    i++
  formatted

executeCommand = (command) ->
  new Promise (resolve, reject) ->
    sh.exec command, (code, stdout, stderr) ->
      if code then reject "xcode-build exited with code " + code + "\n" + command
      else if stdout then resolve stdout
      else if stderr then resolve stderr

module.exports = (argv, dep, platform) ->
  generate = (context) ->
    new Promise (res, rej) ->
      if argv.verbose then console.log colors.green('configure xcode project with context:'), context
      pbxPath = path.join dep.cache.buildFile, 'project.pbxproj'
      unless fs.existsSync pbxPath
        templatePath = path.join(argv.binDir, "assets/#{platform.name()}.pbxproj")
        unless fs.existsSync templatePath then throw new Error "no file @ #{templatePath}"
        pbxProj = fs.readFileSync templatePath, 'utf8'
        pbxProj = platform.replaceAll pbxProj, "TMAKE_PRODUCT_NAME", dep.name || 'tmake'
        pbxProj = platform.replaceAll pbxProj, "TMAKE_ORGANIZATION_NAME", dep.organization || 'tmake'
        pbxProj = platform.replaceAll pbxProj, "TMAKE-ORGANIZATION-IDENTIFIER", dep.identifier || 'tmake'
        sh.mkdir '-p', dep.cache.buildFile
        fs.writeFileSync pbxPath, pbxProj, 'utf8'
        unless argv.quiet then console.log "wrote xc project @ #{pbxPath}"
      infoPath = path.join dep.d.project, 'Info.plist'
      unless fs.existsSync infoPath
        templatePath = path.join(argv.binDir, "assets/#{platform.name()}_Info.plist")
        unless fs.existsSync templatePath then throw new Error "no file @ #{templatePath}"
        info = fs.readFileSync templatePath, 'utf8'
        info = platform.replaceAll info, "TMAKE_PRODUCT_NAME", dep.name || 'tmake'
        info = platform.replaceAll info, "TMAKE_ORGANIZATION_NAME", dep.organization || 'tmake'
        info = platform.replaceAll info, "TMAKE-ORGANIZATION-IDENTIFIER", dep.identifier || 'tmake'
        sh.mkdir '-p', dep.cache.buildFile
        fs.writeFileSync infoPath, info, 'utf8'
        unless argv.quiet then console.log "wrote xc info plist @ #{infoPath}"
      xcProj = xcode.project(pbxPath)
      xcProj.parse (err) ->
        if err then rej err
        createGroup xcProj, 'source'

        rootObject = xcProj.rootObject
        addToXcProject = (collection, fn) ->
          _.each collection, (filePath) ->
            relative = path.relative dep.d.project, filePath
            if argv.verbose then console.log "add #{relative} to pbxproj"
            fn relative

        addToXcProject context.includeDirs, (rel) -> xcProj.addToHeaderSearchPaths rel
        addToXcProject context.headers, (rel) -> xcProj.addHeaderFile rel, {}, dep.name
        addToXcProject context.sources, (rel) -> xcProj.addSourceFile rel, {}, dep.name
        addToXcProject context.libs, (rel) -> xcProj.addStaticLibrary rel
        # xcProj.addToLibrarySearchPaths "trie_modules/libs"
        # addRelative xcProj.addFramework, context.raw.frameworks
        for i of xcProj.hash.project.objects.XCBuildConfiguration
          conf = xcProj.hash.project.objects.XCBuildConfiguration[i]
          if conf.buildSettings
            if conf.buildSettings.LIBRARY_SEARCH_PATHS
              conf.buildSettings.LIBRARY_SEARCH_PATHS = _.map conf.buildSettings.LIBRARY_SEARCH_PATHS, (path) ->
                path.replace "$(TARGET_NAME)/", ""

        # console.log JSON.stringify xcProj.hash,0,2
        fs.writeFileSync pbxPath, xcProj.writeSync()
        res()

  build = (config) ->
    safelyWrap = (string) ->
      JSON.stringify string

    options =
      clean: true
      export: true
      project: dep.cache.buildFile
      configuration: ''
      workspace: ''
      scheme: ''
      allTargets: true
      target: ''
      archivePath: ''
      exportFormat: 'IPA'
      exportPath: process.cwd()
      exportFilename: 'export.ipa'
      exportProvisioningProfile: ''
      exportSigningIdentity: ''
      exportInstallerIdentity: ''
      arch: ''
      sdk: ''

    runCleanCommand = ->
      if !options.clean
        return Promise.resolve()
      command = [ 'clean' ]
      if options.project
        command.push '-project', safelyWrap(options.project)
      executeCommand(command, true).then ->
        console.log '`xcodebuild clean` was successful'

    runArchiveCommand = ->
      if !options.export
        return Promise.resolve()
      command = [ 'archive' ]
      command.push '-archivePath', safelyWrap(options.archivePath)
      if options.project
        command.push '-project', safelyWrap(options.project)
      if options.configuration
        command.push '-configuration', safelyWrap(options.configuration)
      if options.workspace
        command.push '-workspace', safelyWrap(options.workspace)
      if options.scheme
        command.push '-scheme', safelyWrap(options.scheme)
      if options.arch
        command.push '-arch', safelyWrap(options.arch)
      if options.sdk
        command.push '-sdk', safelyWrap(options.sdk)
      if !options.exportSigningIdentity
        command.push 'CODE_SIGN_IDENTITY=""', 'CODE_SIGN_ENTITLEMENTS=""', 'CODE_SIGNING_REQUIRED=NO'
      if options.target
        command.push '-target', safelyWrap(options.target)
      else if options.allTargets and !options.scheme
        command.push '-alltargets'
      console.log 'Archiving: '
      executeCommand(command).then ->
        console.log '`xcodebuild archive` was successful'
        return

    runExportCommand = ->
      if !options.export
        return Promise.resolve()
      command = [ '-exportArchive' ]
      command.push '-archivePath "{0}.xcarchive"'.format(options.archivePath)
      command.push '-exportPath "{0}/{1}"'.format(options.exportPath, options.exportFilename)
      command.push '-exportFormat', options.exportFormat
      if options.exportProvisioningProfile
        command.push '-exportProvisioningProfile', safelyWrap(options.exportProvisioningProfile)
      if options.exportSigningIdentity
        command.push '-exportSigningIdentity', safelyWrap(options.exportSigningIdentity)
      if options.exportInstallerIdentity
        command.push '-exportInstallerIdentity', safelyWrap(options.exportInstallerIdentity)
      if !options.exportSigningIdentity
        command.push '-exportWithOriginalSigningIdentity'
      console.log 'Exporting: '
      executeCommand(command).then ->
        console.log '`xcodebuild export` was successful'
        return

    cleanUp = ->
      if temporaryDirectory
        temporaryDirectory.rmdir()
      if options.export
        console.log 'Built and exported product to: {0}/{1}'.format(options.exportPath, options.exportFilename)

    whichAsync 'xcodebuild'
    .then (path) ->
      unless path then throw new Error('`xcodebuild` command is required for grunt-xcode to work, please install Xcode Tools from developer.apple.com')
    if !options.project and !options.workspace
      throw new Error('`options.project` or `options.workspace` is required')
    if options.workspace and !options.scheme
      throw new Error('`options.scheme` is required when building a workspace')
    if !options.archivePath
      temporaryDirectory = new tmp.Dir()
      options.archivePath = temporaryDirectory.path

    # runCleanCommand().then(runArchiveCommand).then(runExportCommand).finally cleanUp
    Promise.resolve()
  # init = (context) ->
  #   new Promise (resolve, reject) ->
  #     getRelativeFromArray = (collection) ->
  #       _.map collection, (filePath) ->
  #         relative = path.relative dep.d.project, filePath
  #         relative
  #
  #     binding =
  #       includes: getRelativeFromArray context.headers
  #       targets: [
  #         target_name: dep.name
  #         # type: 'static_library'
  #         sources: getRelativeFromArray context.sources
  #         include_dirs: getRelativeFromArray context.includeDirs
  #         libraries: getRelativeFromArray context.libs
  #         dependencies: []
  #         cflags: context.cflags
  #         xcode_settings: {
  #           "OTHER_CFLAGS": [ "-Wall", "-Werror" ]
  #         }
  #         conditions: [
  #           ['OS=="mac"', {
  #             'xcode_settings': {
  #               'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
  #               'OTHER_LDFLAGS': [
  #                 '-undefined dynamic_lookup'
  #               ]
  #             }
  #           }]
  #         ]
  #       ]
  #
  #     gypDir = new tmp.Dir()
  #     fs.writeFileAsync "#{gypDir.path}/binding.gyp", JSON.stringify(binding, 0, 2)
  #     .then ->
  #       #gyp_argv = defaultArgv.slice()
  #       #if argv.verbose then console.log 'gyp argv:', JSON.stringify(gyp_argv, 0, 2)
  #       gyp.parseArgv ["-f xcode"]
  #       process.chdir gypDir.path
  #       gyp.commands.configure ["-f xcode"], (error) ->
  #         throw error if error
  #         xcPath = path.join gypDir.path, "build/binding.xcodeproj"
  #         if fs.existsSync xcPath
  #           if argv.verbose then console.log "mkdir", dep.cache.buildFile
  #           # console.log "move #{xcPath} to #{dep.cache.buildFile}"
  #           sh.mkdir '-p', dep.cache.buildFile
  #           if argv.verbose then console.log "cp", xcPath, "to", dep.cache.buildFile
  #           sh.cp '-R', "#{xcPath}", "#{dep.cache.buildFile}/"
  #           if argv.verbose then console.log "cleanup", gypDir.path
  #           #gypDir.rmdir()
  #         else
  #           throw new Error "gyp didn't create xcodeproj @ #{xcPath}"
  #     .catch (err) ->
  #       fs.nuke gypDir.path
  #       fs.nuke dep.cache.buildFile
  #       reject err

  generate: generate
  build: build
