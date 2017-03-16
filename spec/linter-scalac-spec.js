'use babel';

jasmine.getEnv().defaultTimeoutInterval = 60000;

// Requires scalac to be installed and on the path. Tests were written on OSX 10.10
// and verified on Windows 7. If running on Windows, Atom can't be open at the same
// time as it prevents some of the temp directories being created/torn down.

describe('linter-scalac', () => {
  const fs = require('fs');
  const path = require('path');

  const mkdirp = require('mkdirp');
  /* eslint-disable import/no-extraneous-dependencies */
  const exec = require('promised-exec');
  const rm = require('rimraf');
  /* eslint-enable import/no-extraneous-dependencies */

  const lint = require('../lib/linter-scalac')
    .provideLinter()
    .lint;

  const fixturesPath = path.join(__dirname, 'fixtures');

  // Utility functions for use inside Promise chains:

  const openFile = targetFile => () => atom.workspace.open(targetFile);
  const openURI = targetFile => () => atom.workspace.open(`file://${targetFile}`);

  const resetPath = targetPath =>
    Promise.resolve(rm.sync(targetPath)).catch(() => {});

  const getScalaVersion = () =>
    exec('scalac -version')
    .catch(versionString =>
      /.+(\d+\.\d+)\..+/.exec(versionString.buffer)[1]);

  const buildOutputPath = (targetPath, projectPath) => () =>
    getScalaVersion()
    .then((scalaVersion) => {
      const outputPath = path.join(targetPath, `scala-${scalaVersion}`, 'classes');
      fs.writeFileSync(path.join(projectPath, '.classpath'), outputPath);
      mkdirp(outputPath);
      return outputPath;
    });

  const buildSourceWithDependency = dependency => outputPath =>
    exec(`scalac -d "${outputPath}" -classpath "${outputPath}" "${dependency}"`);

  // Setup / Teardown

  beforeEach(() =>
    waitsForPromise(() =>
      atom.packages.activatePackage('linter-scalac')));

  afterEach(() =>
    waitsForPromise(() =>
      Promise.resolve(path.join(__dirname, '..', 'linter')).then(resetPath)));

  // Spec

  describe('the standard behaviour', () => {
    it('lints a source file with no dependencies', () => {
      const projectPath = path.join(fixturesPath, 'project1');
      const targetFile = path.join(fixturesPath, 'project1', 'EntryPoint.scala');

      atom.project.setPaths([projectPath]);

      return waitsForPromise(() => openURI(projectPath)()
        .then(openFile(targetFile))
        .then(lint)
        .then((messages) => {
          expect(messages.length).toEqual(1);
          expect(messages[0].type).toEqual('error');
          expect(messages[0].text)
            .toEqual('value bar2 is not a member of Foo');
        }),
      );
    });

    it('lints a source file with dependencies if the dependencies are already compiled', () => {
      const projectPath = path.join(fixturesPath, 'project2');
      const srcPath = path.join(projectPath, 'src', 'main', 'scala');
      const targetPath = path.join(projectPath, 'target');
      const targetFile = path.join(srcPath, 'EntryPoint.scala');
      const dependency = path.join(srcPath, 'Foo.scala');

      atom.project.setPaths([projectPath]);

      return waitsForPromise(() =>
        resetPath(targetPath)
        .then(buildOutputPath(targetPath, projectPath))
        .then(buildSourceWithDependency(dependency))
        .then(openFile(targetFile))
        .then(lint)
        .then((messages) => {
          expect(messages.length).toEqual(1);
          expect(messages[0].type).toEqual('error');
          expect(messages[0].text)
            .toEqual('value bar2 is not a member of Foo');
        }),
      );
    });

    it('lints a source file with dependencies in packages if the dependencies are already compiled', () => {
      const projectPath = path.join(fixturesPath, 'project3');
      const srcPath = path.join(projectPath, 'src', 'main', 'scala', 'linter', 'scalac');
      const targetPath = path.join(projectPath, 'target');
      const targetFile = path.join(srcPath, 'EntryPoint.scala');
      const dependency = path.join(srcPath, 'Foo.scala');

      atom.project.setPaths([projectPath]);

      return waitsForPromise(() =>
        resetPath(targetPath)
        .then(buildOutputPath(targetPath, projectPath))
        .then(buildSourceWithDependency(dependency))
        .then(openFile(targetFile))
        .then(lint)
        .then((messages) => {
          expect(messages.length).toEqual(1);
          expect(messages[0].type).toEqual('error');
          expect(messages[0].text)
            .toEqual('value bar2 is not a member of linter.scalac.Foo');
        }),
      );
    });

    it('does not usefully lint a source file with dependencies in packages if the dependencies are not compiled', () => {
      const projectPath = path.join(fixturesPath, 'project3');
      const srcPath = path.join(projectPath, 'src', 'main', 'scala', 'linter', 'scalac');
      const targetPath = path.join(projectPath, 'target');
      const targetFile = path.join(srcPath, 'EntryPoint.scala');

      atom.project.setPaths([projectPath]);

      return waitsForPromise(() =>
        resetPath(targetPath)
        .then(buildOutputPath(targetPath, projectPath))
        .then(openFile(targetFile))
        .then(lint)
        .then((messages) => {
          expect(messages.length).toEqual(1);
          expect(messages[0].type).toEqual('error');
          expect(messages[0].text).toEqual('not found: type Foo');
        }),
      );
    });

    it('does not compile files to the classpath', () => {
      const projectPath = path.join(fixturesPath, 'project3');
      const targetPath = path.join(projectPath, 'target');
      const targetFile = path.join(projectPath, 'src', 'main', 'scala', 'linter', 'scalac', 'Foo.scala');
      let outputPath = null;

      atom.project.setPaths([projectPath]);

      return waitsForPromise(() =>
        resetPath(targetPath)
        .then(buildOutputPath(targetPath, projectPath))
        .then((_) => { outputPath = _; })
        .then(openFile(targetFile))
        .then(lint)
        .then((messages) => {
          expect(messages.length).toEqual(0);
          expect(() =>
              fs.statSync(path.join(outputPath, 'linter', 'scalac', 'Foo.class')).isFile())
            .toThrow(Error(
              `ENOENT: no such file or directory, stat '${path.join(outputPath, 'linter', 'scalac', 'Foo.class')}'`));
          expect(fs.statSync(
              path.join(__dirname, '..', 'linter', 'scalac', 'Foo.class')).isFile())
            .toEqual(true);
        })
        .catch(() => {})
        .then(() => path.join(__dirname, '..', 'linter'))
        .then(resetPath));
    });
  });

  describe('the behaviour that writes to the classpath folder', () => {
    it('compiles files to the classpath', () => {
      const projectPath = path.join(fixturesPath, 'project3');
      const targetPath = path.join(projectPath, 'target');
      const targetFile = path.join(projectPath, 'src', 'main', 'scala', 'linter', 'scalac', 'Foo.scala');
      let outputPath = null;

      atom.config.set('linter-scalac.compileClassesToClasspath', true);
      atom.project.setPaths([projectPath]);

      return waitsForPromise(() =>
        resetPath(targetPath)
        .then(buildOutputPath(targetPath, projectPath))
        .then((_) => { outputPath = _; })
        .then(openFile(targetFile))
        .then(lint)
        .then((messages) => {
          expect(messages.length).toEqual(0);
          expect(fs.statSync(path.join(outputPath, 'linter', 'scalac', 'Foo.class')).isFile())
            .toEqual(true);
        }),
      );
    });
  });

  describe('the behaviour that compiles all classes on lint', () => {
    it('lints the active file by compiling all the scala files in the project', () => {
      const projectPath = path.join(fixturesPath, 'project3');
      const targetPath = path.join(projectPath, 'target');
      const targetFile = path.join(projectPath, 'src', 'main', 'scala', 'linter', 'scalac', 'EntryPoint.scala');

      atom.config.set('linter-scalac.compileClassesToClasspath', true);
      atom.config.set('linter-scalac.compileAllClassesOnLint', true);
      atom.project.setPaths([projectPath]);

      waitsForPromise(() =>
        resetPath(targetPath)
        .then(buildOutputPath(targetPath, projectPath))
        .then(openFile(targetFile))
        .then(lint)
        .then((messages) => {
          expect(messages.length).toEqual(1);
          expect(messages[0].type).toEqual('error');
          expect(messages[0].text).toEqual('value bar2 is not a member of linter.scalac.Foo');
        }),
      );
    });
  });
});
