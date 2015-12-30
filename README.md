# linter-scalac

Lint Scala on the fly, using scalac. Also possible to use other Scala linters,
such as [WartRemover](https://github.com/typelevel/wartremover), via compiler
options (a configurable setting).

This package will ensure all Atom dependencies are installed on activation.

## Installation

[Scala](http://www.scala-lang.org/):

```ShellSession
brew install scala
```

---

[Atom](https://atom.io/):

```ShellSession
brew cask install atom
```

---

[linter-scalac](https://github.com/AtomLinter/linter-scalac):

```ShellSession
apm install linter-scalac
```

---

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

> <sub>**Note:** It is also possible to configure linter-scalac via the GUI:
>`Atom` > `Preferences` > `linter-scalac`</sub>

## Classpath

It is strongly recommended that you utilize a `.classpath` file in the root of
your project. While linter-scalac will work without it, you will be given
numerous invalid errors and warnings due to the lack of a proper classpath
passed to scalac. The `.classpath` file should simply contain the project's
full classpath, which is easily generated via SBT:

```ShellSession
sbt 'export fullClasspath'
```

> <sub>**Notes:**</sub>
>
> <sub>1. If your SBT project uses a multi-project setup, you will need a
>`.classpath` for each subproject.</sub>
>
> <sub>2. If your SBT project uses a multi-project setup, you cannot use the
>project root as the Atom project. You must treat each SBT subproject as its
>own Atom project.</sub>
>
> <sub>3. It is assumed that the first path in `.classpath` is your compiled
>classes directory (the SBT command above does this automatically). Assuming
>this is true, it will play nice with SBT. Performing SBT tasks will update
>linter-scalac compiled files and vice-versa.</sub>
