{exec, child} = require('child_process')
fs = require('fs')
Linter = require(atom.packages.getLoadedPackage('linter').path + '/lib/linter')

class LinterScalac extends Linter
	@syntax: ['source.scala']

	classpath: null

	cmd: 'scalac'

	linterName: 'scalac'

	regex: 'scala:(?<line>\\d+): ((?<error>error)|(?<warning>warning)): (?<message>.+)\\n'

	constructor: (editor) ->
		super(editor)

		atom.config.observe('linter-scalac.scalacExecutablePath', =>
			dotClasspath = atom.project.path + '/.classpath'

			if atom.config.get('linter-scalac.scalacOptions')?
				@cmd = @cmd + ' ' + atom.config.get('linter-scalac.scalacOptions')

			if fs.existsSync(dotClasspath)
				@classpath = fs.readFileSync(dotClasspath).toString().trim()
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
