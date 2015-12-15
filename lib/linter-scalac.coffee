{BufferedProcess, CompositeDisposable} = require 'atom'

module.exports =
  config:
    scalacExecutablePath:
      type: 'string'
      default: 'scalac'
      order: 1
    scalacOptions:
      type: 'string'
      default: '-Xlint'
      order: 2
    compileClassesToClasspath:
      type: 'boolean'
      default: false
      order: 3
    compileAllClassesOnLint:
      type: 'boolean'
      default: false
      order: 4

  activate: ->
    require('atom-package-deps').install()
    @subscriptions = new CompositeDisposable
    @subscriptions.add atom.config.observe 'linter-scalac.scalacExecutablePath',
      (scalacExecutablePath) =>
        @scalacExecutablePath = scalacExecutablePath
    @subscriptions.add atom.config.observe 'linter-scalac.scalacOptions',
      (scalacOptions) =>
        @scalacOptions = scalacOptions
    @subscriptions.add atom.config.observe 'linter-scalac.compileClassesToClasspath',
      (compileClassesToClasspath) =>
        @compileClassesToClasspath = compileClassesToClasspath
        atom.config.set 'linter-scalac.compileAllClassesOnLint', false if not compileClassesToClasspath
    @subscriptions.add atom.config.observe 'linter-scalac.compileAllClassesOnLint',
      (compileAllClassesOnLint) =>
        @compileAllClassesOnLint = compileAllClassesOnLint
        atom.config.set 'linter-scalac.compileClassesToClasspath', true if compileAllClassesOnLint

  deactivate: ->
    @subscriptions.dispose()

  provideLinter: ->
    helpers = require 'atom-linter'
    fs = require 'fs'
    path = require 'path'
    glob = require 'glob'
    mkdirp = require 'mkdirp'
    regex = '(?<file>.+):(?<line>\\d+): (?<type>(error|warning)): (?<message>(.+))'
    compilerRegex = 'scalac (?<type>(error|warning)): (?<message>(.+))'
    provider =
      grammarScopes: ['source.scala']
      scope: if @compileAllClassesOnLint then 'project' else 'file'
      lintOnFly: false
      lint: (textEditor) =>
        filePath = textEditor.getPath()
        args = @scalacOptions.split(' ')
        command = atom.config.get 'linter-scalac.scalacExecutablePath'
        matchingProjectPaths = (tmpPath for tmpPath in atom.project.getPaths() when (filePath.replace /\\/g, "/").match ///^#{tmpPath.replace /\\/g, "/"}.+///)
        throw "No project paths available" unless matchingProjectPaths.length == 1
        projectPath = matchingProjectPaths[0]

        if helpers.find(projectPath, '.classpath')
          dotClasspath = helpers.find(filePath, '.classpath')
          classpath = fs.readFileSync(dotClasspath).toString().trim()

          args.push '-classpath'
          args.push "#{classpath}"

          if @compileClassesToClasspath
            outputPath = classpath.split(path.delimiter)[0]
            mkdirp.sync outputPath if atom.project.contains(outputPath)
            args.push '-d'
            args.push "#{outputPath}"

          if @compileAllClassesOnLint
            paths = glob.sync("**#{path.sep}*.scala", {'cwd': projectPath})
            .map (sourcePath) -> "#{projectPath}#{path.sep}#{sourcePath.replace /\//g, path.sep}"
            .filter (sourcePath) -> filePath isnt sourcePath
            .map (sourcePath) -> "#{sourcePath}"
            args = args.concat paths

        args.push "#{filePath}"
        return helpers.exec command, args, {stream: 'stderr'}
          .then (output) ->
            return helpers.parse output, regex
            .concat helpers.parse output, compilerRegex
