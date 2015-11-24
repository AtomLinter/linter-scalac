
# Requires scalac to be installed and on the path. Tests were written on OSX 10.10
# and verified on Windows 7. If running on Windows, Atom can't be open at the same
# time as it prevents some of the temp directories being created/torn down.

describe "linter-scalac", ->
  exec = require 'promised-exec'
  fs = require 'fs'
  mkdirp = require 'mkdirp'
  rm = require 'rimraf'
  path = require 'path'

  lint = require('../lib/linter-scalac')
    .provideLinter()
    .lint

  fixturesPath = "#{__dirname}#{path.sep}fixtures"

  resetPath = (targetPath) ->
    Promise.resolve rm.sync targetPath
    .catch (error) -> ;

  getScalaVersion = () ->
    exec "scalac -version"
    .catch (versionString) ->
      (/.+(\d+\.\d+)\..+/.exec versionString.buffer)[1]

  beforeEach ->
    jasmine.getEnv().defaultTimeoutInterval = 60000
    waitsForPromise ->
      atom.packages.activatePackage("linter-scalac")

  describe "the standard behaviour", ->

    it "lints a source file with no dependencies", ->
      projectPath = "#{fixturesPath}#{path.sep}project1"
      targetFile = "#{fixturesPath}#{path.sep}project1#{path.sep}EntryPoint.scala"
      waitsForPromise ->
        atom.project.setPaths [projectPath]
        atom.workspace.open projectPath
        .then () ->
          atom.workspace.open targetFile
        .then (editor) ->
          lint editor
        .then (messages) ->
          expect messages.length
          .toEqual 1

          expect messages[0].type
          .toEqual 'error'

          expect messages[0].text
          .toEqual 'value bar2 is not a member of Foo'

    it "lints a source file with dependencies if the dependencies are already compiled", ->
      projectPath = "#{fixturesPath}#{path.sep}project2"
      targetPath = "#{projectPath}#{path.sep}target"
      targetFile = "#{projectPath}#{path.sep}src#{path.sep}main#{path.sep}scala#{path.sep}EntryPoint.scala"
      dependency = "#{projectPath}#{path.sep}src#{path.sep}main#{path.sep}scala#{path.sep}Foo.scala"

      waitsForPromise ->
        resetPath(targetPath)
        .then getScalaVersion
        .then (scalaVersion) ->
          outputPath = "#{targetPath}#{path.sep}scala-#{scalaVersion}#{path.sep}classes"
          fs.writeFileSync "#{projectPath}#{path.sep}.classpath", outputPath
          mkdirp outputPath
          outputPath
        .then (outputPath) ->
          exec "scalac -d \"#{outputPath}\" -classpath \"#{outputPath}\" \"#{dependency}\""
        .then () ->
          atom.project.setPaths [projectPath]
          atom.workspace.open targetFile
        .then (editor) ->
          lint editor
        .then (messages) ->
          expect messages.length
          .toEqual 1

          expect messages[0].type
          .toEqual 'error'

          expect messages[0].text
          .toEqual 'value bar2 is not a member of Foo'

    it "lints a source file with dependencies in packages if the dependencies are already compiled", ->
      projectPath = "#{fixturesPath}#{path.sep}project3"
      targetPath = "#{projectPath}#{path.sep}target"
      targetFile = "#{projectPath}#{path.sep}src#{path.sep}main#{path.sep}scala#{path.sep}linter#{path.sep}scalac#{path.sep}EntryPoint.scala"
      dependency = "#{projectPath}#{path.sep}src#{path.sep}main#{path.sep}scala#{path.sep}linter#{path.sep}scalac#{path.sep}Foo.scala"

      waitsForPromise ->
        resetPath(targetPath)
        .then getScalaVersion
        .then (scalaVersion) ->
          outputPath = "#{targetPath}#{path.sep}scala-#{scalaVersion}#{path.sep}classes"
          fs.writeFileSync "#{projectPath}#{path.sep}.classpath", outputPath
          mkdirp outputPath
          outputPath
        .then (outputPath) ->
          exec "scalac -d \"#{outputPath}\" -classpath \"#{outputPath}\" \"#{dependency}\""
        .then () ->
          atom.project.setPaths [projectPath]
          atom.workspace.open "#{projectPath}#{path.sep}src#{path.sep}main#{path.sep}scala#{path.sep}linter#{path.sep}scalac#{path.sep}EntryPoint.scala"
        .then (editor) ->
          lint editor
        .then (messages) ->
          expect messages.length
          .toEqual 1

          expect messages[0].type
          .toEqual 'error'

          expect messages[0].text
          .toEqual 'value bar2 is not a member of linter.scalac.Foo'

    it "does not usefully lint a source file with dependencies in packages if the dependencies are not compiled", ->
      projectPath = "#{fixturesPath}#{path.sep}project3"
      targetPath = "#{projectPath}#{path.sep}target"
      targetFile = "#{projectPath}#{path.sep}src#{path.sep}main#{path.sep}scala#{path.sep}linter#{path.sep}scalac#{path.sep}EntryPoint.scala"
      dependency = "#{projectPath}#{path.sep}src#{path.sep}main#{path.sep}scala#{path.sep}linter#{path.sep}scalac#{path.sep}Foo.scala"

      waitsForPromise ->
        resetPath(targetPath)
        .then getScalaVersion
        .then (scalaVersion) ->
          outputPath = "#{targetPath}#{path.sep}scala-#{scalaVersion}#{path.sep}classes"
          fs.writeFileSync "#{projectPath}#{path.sep}.classpath", outputPath
          mkdirp outputPath
          outputPath
        .then () ->
          atom.project.setPaths [projectPath]
          atom.workspace.open targetFile
        .then (editor) ->
          lint editor
        .then (messages) ->
          expect messages.length
          .toEqual 1

          expect messages[0].type
          .toEqual 'error'

          expect messages[0].text
          .toEqual 'not found: type Foo'

    it "does not compile files to the classpath", ->
      projectPath = "#{fixturesPath}#{path.sep}project3"
      targetPath = "#{projectPath}#{path.sep}target"
      targetFile = "#{projectPath}#{path.sep}src#{path.sep}main#{path.sep}scala#{path.sep}linter#{path.sep}scalac#{path.sep}Foo.scala"
      outputPath = null

      waitsForPromise ->
        resetPath(targetPath)
        .then getScalaVersion
        .then (scalaVersion) ->
          outputPath = "#{targetPath}#{path.sep}scala-#{scalaVersion}#{path.sep}classes"
          fs.writeFileSync "#{projectPath}#{path.sep}.classpath", outputPath
          mkdirp outputPath
          outputPath
        .then () ->
          atom.project.setPaths [projectPath]
          atom.workspace.open targetFile
        .then (editor) ->
          lint editor
        .then (messages) ->
          expect messages.length
          .toEqual 0

          expect () ->
            (fs.statSync "#{outputPath}#{path.sep}linter#{path.sep}scalac#{path.sep}Foo.class").isFile()
          .toThrow Error("ENOENT: no such file or directory, stat '#{outputPath}#{path.sep}linter#{path.sep}scalac#{path.sep}Foo.class'")

          expect (fs.statSync "#{__dirname}#{path.sep}..#{path.sep}linter#{path.sep}scalac#{path.sep}Foo.class").isFile()
          .toEqual true
          "#{__dirname}#{path.sep}..#{path.sep}linter"
        .then resetPath

  describe "the behaviour that writes to the classpath folder", ->

    it "compiles files to the classpath", ->
      projectPath = "#{fixturesPath}#{path.sep}project3"
      targetPath = "#{projectPath}#{path.sep}target"
      targetFile = "#{projectPath}#{path.sep}src#{path.sep}main#{path.sep}scala#{path.sep}linter#{path.sep}scalac#{path.sep}Foo.scala"
      outputPath = null

      waitsForPromise ->
        resetPath(targetPath)
        .then getScalaVersion
        .then (scalaVersion) ->
          outputPath = "#{targetPath}#{path.sep}scala-#{scalaVersion}#{path.sep}classes"
          fs.writeFileSync "#{projectPath}#{path.sep}.classpath", outputPath
          mkdirp outputPath
          outputPath
        .then () ->
          atom.config.set "linter-scalac.compileClassesToClasspath", true
          atom.project.setPaths [projectPath]
          atom.workspace.open targetFile
        .then (editor) ->
          lint editor
        .then (messages) ->
          expect messages.length
          .toEqual 0

          expect (fs.statSync "#{outputPath}#{path.sep}linter#{path.sep}scalac#{path.sep}Foo.class").isFile()
          .toEqual true

  describe "the behaviour that compiles all classes on lint", ->

    it "lints the active file by compiling all the scala files in the project", ->
      projectPath = "#{fixturesPath}#{path.sep}project3"
      targetPath = "#{projectPath}#{path.sep}target"
      targetFile = "#{projectPath}#{path.sep}src#{path.sep}main#{path.sep}scala#{path.sep}linter#{path.sep}scalac#{path.sep}EntryPoint.scala"
      outputPath = null

      waitsForPromise ->
        resetPath(targetPath)
        .then getScalaVersion
        .then (scalaVersion) ->
          outputPath = "#{targetPath}#{path.sep}scala-#{scalaVersion}#{path.sep}classes"
          fs.writeFileSync "#{projectPath}#{path.sep}.classpath", outputPath
          mkdirp outputPath
          outputPath
        .then () ->
          atom.config.set "linter-scalac.compileClassesToClasspath", true
          atom.config.set "linter-scalac.compileAllClassesOnLint", true
          atom.project.setPaths [projectPath]
          atom.workspace.open "#{projectPath}#{path.sep}src#{path.sep}main#{path.sep}scala#{path.sep}linter#{path.sep}scalac#{path.sep}EntryPoint.scala"
        .then (editor) ->
          lint editor
        .then (messages) ->
          expect messages.length
          .toEqual 1

          expect messages[0].type
          .toEqual 'error'

          expect messages[0].text
          .toEqual 'value bar2 is not a member of linter.scalac.Foo'
