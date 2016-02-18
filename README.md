# linter-scalac

[![Circle CI Status](https://img.shields.io/circleci/project/AtomLinter/linter-scalac/master.svg?style=flat-square&label=linux)](https://circleci.com/gh/AtomLinter/linter-scalac)
[![Travis CI Status](https://img.shields.io/travis/AtomLinter/linter-scalac/master.svg?style=flat-square&label=os%20x)](https://travis-ci.org/AtomLinter/linter-scalac)
[![AppVeyor Status](https://img.shields.io/appveyor/ci/andystanton/linter-scalac-3ymif/master.svg?style=flat-square&label=windows)](https://ci.appveyor.com/project/andystanton/linter-scalac-3ymif)

Lint Scala using scalac.

## Installation

```sh
$ apm install linter-scalac
```

## Configuration

Via `config.json`:

```coffeescript
'linter-scalac':

  # Execute `which scala` to determine your own path.
  # By default the scalac binary is resolved from your path.
  'scalacExecutablePath': 'scalac'

  # Execute `scalac -X` and `scalac -Y` for a handful of useful options.
  'scalacOptions': '-Xlint -P:wartremover:traverser:org.brianmckenna.wartremover.warts.Unsafe'

  # Write the compiled classes to the location specified in .classpath
  'compileClassesToClasspath': false

  # Compile all Scala files in the project on lint.
  'compileAllClassesOnLint': false
```

It is also possible to configure these settings via the GUI:

`Atom` > `Preferences` > `linter-scalac`

## Classpath

It is strongly recommended that you utilize a `.classpath` file in the root of
your project. While linter-scalac will work without it, you will be given
numerous invalid errors and warnings due to the lack of a proper classpath
passed to scalac. The `.classpath` file should simply contain the project's
full classpath, which is easily generated via SBT:

```ShellSession
sbt 'export fullClasspath'
```

## Notes

1. If your SBT project uses a multi-project setup, you will need a `.classpath` for each subproject.

2. If your SBT project uses a multi-project setup, you cannot use the project root as the Atom project. You must treat each SBT subproject as its own Atom project.

3. It is assumed that the first path in `.classpath` is your compiled classes directory (the SBT command above does this automatically). Assuming this is true, it will play nice with SBT. Performing SBT tasks will update linter-scalac compiled files and vice-versa.</sub>
