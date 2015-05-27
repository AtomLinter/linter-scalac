module.exports =
	config:
		scalacExecutablePath:
			type: 'string'
			default: ''
		scalacOptions:
			type: 'string'
			default: '-Xlint'

	activate: -> console.log('activate linter-scalac')
