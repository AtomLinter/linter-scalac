{exec, child} = require('child_process')
fs = require('fs')
Linter = require(atom.packages.getLoadedPackage('linter').path + '/lib/linter')

class LinterScalac extends Linter
	@syntax: ['source.scala']

	cmd: 'scalac'

	executablePath: ''

	linterName: 'scalac'

	options: ''

	regex: 'scala:(?<line>\\d+): ((?<error>error)|(?<warning>warning)): (?<message>(.+)\\n(.+))\\n'

	constructor: (editor) ->
		super(editor)

		@pathSubscription = atom.config.observe('linter-scalac.scalacExecutablePath', =>
			@executablePath = atom.config.get('linter-scalac.scalacExecutablePath')
		)

		@optionsSubscription = atom.config.observe('linter-scalac.scalacOptions', =>
			dotClasspath = atom.project.getPaths()[0] + '/.classpath'

			if atom.config.get('linter-scalac.scalacOptions')?
				@options = atom.config.get('linter-scalac.scalacOptions')

			if fs.existsSync(dotClasspath)
				classpath = fs.readFileSync(dotClasspath).toString().trim()
				@cwd = classpath.split(':')[0]
				@options = @options + ' -classpath "' + classpath + '"'
		)

	destroy: ->
		super
		@pathSubscription.dispose()
		@optionsSubscription.dispose()

	lintFile: (filePath, callback) ->
		command = @executablePath + '/' + @cmd + ' ' + filePath + ' ' + @options
		exec(command, cwd: @cwd, (error, stdout, stderr) => if stderr then @processMessage(stderr, callback))

module.exports = LinterScalac
