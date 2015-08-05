{BufferedProcess, CompositeDisposable} = require 'atom'

module.exports =
  config:
    scalacExecutablePath:
      type: 'string'
      default: ''
    scalacOptions:
      type: 'string'
      default: '-Xlint'

  activate: ->
    @subscriptions = new CompositeDisposable
    @subscriptions.add atom.config.observe 'linter-scalac.scalacExecutablePath',
      (scalacExecutablePath) =>
        @scalacExecutablePath = scalacExecutablePath
    @subscriptions.add atom.config.observe 'linter-scalac.scalacOptions',
      (scalacOptions) =>
        @scalacOptions = scalacOptions
    @cmd = 'scalac'

  deactivate: ->
    @subscriptions.dispose()

  provideLinter: ->
    helpers = require 'atom-linter'
    fs = require 'fs'

    provider =
      grammarScopes: ['source.scala']
      scope: 'file'
      lintOnFly: true
      lint: (textEditor) =>
        filePath = textEditor.getPath()
        if @scalacExecutablePath
          command = @scalacExecutablePath + '/' + @cmd
        else
          command = @cmd
        args = @scalacOptions.split(' ')
        if helpers.findFile(filePath, '.classpath')
          dotClasspath = helpers.findFile(filePath, '.classpath')
          classpath = fs.readFileSync(dotClasspath).toString().trim()
          args.push('-classpath')
          args.push(classpath)
        args.push(filePath)
        return helpers.exec(command, args, {stream: 'stderr'}).then (output) ->
          regex = 'scala:(?<line>\\d+): (?<type>(error|warning)): (?<message>(.+))'
          return helpers.parse(output, regex, {filePath: filePath})
