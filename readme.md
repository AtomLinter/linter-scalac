# linter-scalac
Lint Scala on the fly, using scalac. Also possible to use other Scala linters, such as [WartRemover](https://github.com/typelevel/wartremover), via compiler options (a configurable setting).

## Installation
[Scala](http://www.scala-lang.org/):
```bash
$ brew install scala
```
---
[Atom](https://atom.io/):
```bash
$ brew cask install atom
```
---
[linter](https://github.com/AtomLinter/Linter):
```bash
$ apm install linter
```
---
[linter-scalac](https://github.com/AtomLinter/linter-scalac):
```bash
$ apm install linter-scalac
```
---

## Configuration
Via `config.json`:
```coffeescript
'linter-scalac':
  # Execute `which scala` to determine your own path.
  # Do not include the scalac file itself, just its parent directory.
  'scalacExecutablePath': '/usr/local/bin'
  # Execute `scalac -X` and `scalac -Y` for a handful of useful options.
  'scalacOptions': '-Xlint -P:wartremover:traverser:org.brianmckenna.wartremover.warts.Unsafe'
```

> <sub>__Note:__ It is also possible to configure linter-scalac via the GUI: `Atom` > `Preferences` > `linter-scalac`</sub>

## Classpath
It is strongly recommended that you utilize a `.classpath` file in the root of your project. While linter-scalac will work without it, you will be given numerous invalid errors and warnings due to the lack of a proper classpath passed to scalac. The `.classpath` file should simply contain the project's full classpath, which is easily generated via SBT:

```bash
$ sbt 'export fullClasspath'
```

> <sub>__Notes:__</sub>
>
> <sub>1. If your SBT project uses a multi-project setup, you will need a `.classpath` for each subproject.</sub>
>
> <sub>2. If your SBT project uses a multi-project setup, you cannot use the project root as the Atom project. You must treat each SBT subproject as its own Atom project.</sub>
>
> <sub>3. It is assumed that the first path in `.classpath` is your compiled classes directory (the SBT command above does this automatically). Assuming this is true, it will play nice with SBT. Performing SBT tasks will update linter-scalac compiled files and vice-versa.</sub>

## License

```
The MIT License (MIT)

Copyright (c) 2014 Rocky Madden (http://rockymadden.com/)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

## Donation
[![Share the love!](https://chewbacco-stuff.s3.amazonaws.com/donate.png)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=KXUYS4ARNHCN8)
