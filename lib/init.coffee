module.exports =
  configDefaults:
    scalacExecutablePath: null
    scalacOptions: '-Xlint -Ywarn-adapted-args -Ywarn-dead-code -Ywarn-inaccessible -Ywarn-infer-any ' +
      '-Ywarn-nullary-override -Ywarn-nullary-unit -Ywarn-numeric-widen -Ywarn-unused -Ywarn-unused-import ' +
      '-Ywarn-value-discard'

  activate: ->
    console.log('activate linter-scalac')
