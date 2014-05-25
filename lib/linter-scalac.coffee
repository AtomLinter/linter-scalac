{exec, child} = require('child_process')
fs = require('fs')
linterPath = atom.packages.getLoadedPackage('linter').path
Linter = require("#{linterPath}/lib/linter")

class LinterScalac extends Linter
  @syntax: ['source.scala']

  classpath: null

  cmd: 'scalac'

  linterName: 'scalac'

  regex: 'scala:(?<line>\\d+): ((?<error>error)|(?<warning>warning)): (?<message>.+)\\n'

  constructor: (editor) ->
    super(editor)

    atom.config.observe('linter-scalac.scalacExecutablePath', =>
      # An assumption is made that Atom has a project open and
      # that it should look for `.classpath` in the root.
      dotClasspath = atom.project.path + '/.classpath'

      if atom.config.get('linter-scalac.scalacFlags')?
        @cmd = @cmd + ' ' + atom.config.get('linter-scalac.scalacFlags')

      if fs.existsSync(dotClasspath)
        @classpath = fs.readFileSync(dotClasspath).toString().trim()
        # An assumption is made that the first path is the classes path.
        @cwd = @classpath.split(':')[0]
        @cmd = @cmd + ' -classpath "' + @classpath + '"'

      @executablePath = atom.config.get('linter-scalac.scalacExecutablePath')
    )

  destroy: ->
    atom.config.unobserve('linter-scalac.scalacExecutablePath')

  lintFile: (filePath, callback) ->
    exec(@getCmd(filePath), cwd: @cwd, (error, stdout, stderr) =>
      if stderr then @processMessage(stderr, callback)
    )

module.exports = LinterScalac
