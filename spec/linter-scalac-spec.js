'use babel';

import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import { exec } from 'atom-linter';
import rm from 'rimraf';
import {
  // eslint-disable-next-line no-unused-vars
  it, fit, wait, beforeEach, afterEach,
} from 'jasmine-fix';

const { lint } = require('../lib/linter-scalac').provideLinter();

// Scalac is _slow_, up the default timeout to 60 seconds.
jasmine.getEnv().defaultTimeoutInterval = 60 * 1000;

const fixturesPath = path.join(__dirname, 'fixtures');

// Requires scalac to be installed and on the path. Tests were written on OSX 10.10
// and verified on Windows 7.

// Utility functions
const openFile = async (targetFile) => atom.workspace.open(targetFile);

const resetPath = async (targetPath) => new Promise((resolve, reject) => {
  rm(targetPath, (err) => {
    if (err) {
      reject(err);
    }
    resolve();
  });
});

const mkdirs = async (targetDir) => new Promise((resolve, reject) => {
  mkdirp(targetDir, (err) => {
    if (err) {
      reject(err);
    }
    resolve();
  });
});

const fileStats = async (filePath) => new Promise((resolve, reject) => {
  fs.stat(filePath, (err, stats) => {
    if (err) {
      reject(err);
    }
    resolve(stats);
  });
});

const isFile = async (filePath) => (await fileStats(filePath)).isFile();

const getScalaVersion = async () => {
  if (!getScalaVersion.version) {
    const execOpts = {
      stream: 'both',
    };
    const output = await exec('scalac', ['-version'], execOpts);
    // stdout on Windows, stderr on *NIX, seriously scalac?
    const versionString = `${output.stdout} ${output.stderr}`;
    [, getScalaVersion.version] = /.+(\d+\.\d+\.\d+).+/.exec(versionString);
  }
  return getScalaVersion.version;
};

const buildOutputPath = async (targetPath, projectPath) => {
  const scalaVersion = await getScalaVersion();
  const outputPath = path.join(targetPath, `scala-${scalaVersion}`, 'classes');
  fs.writeFileSync(path.join(projectPath, '.classpath'), outputPath);
  await mkdirs(outputPath);
  return outputPath;
};

const buildSourceWithDependency = async (dependency, outputPath) => {
  const args = [
    '-d', outputPath,
    '-classpath', outputPath,
    dependency,
  ];
  return exec('scalac', args);
};

describe('linter-scalac', () => {
  // Setup / Teardown
  beforeEach(async () => {
    await atom.packages.activatePackage('linter-scalac');
  });

  afterEach(async () => {
    await resetPath(path.join(__dirname, '..', 'linter'));
  });

  // Spec
  describe('the standard behaviour', () => {
    it('lints a source file with no dependencies', async () => {
      const projectPath = path.join(fixturesPath, 'project1');
      const targetFile = path.join(fixturesPath, 'project1', 'EntryPoint.scala');

      atom.project.setPaths([projectPath]);

      const editor = await openFile(targetFile);
      const messages = await lint(editor);

      expect(messages.length).toBe(1);
      expect(messages[0].severity).toBe('error');
      expect(messages[0].excerpt).toBe('value bar2 is not a member of Foo');
    });

    it('lints a source file with dependencies if the dependencies are already compiled', async () => {
      const projectPath = path.join(fixturesPath, 'project2');
      const srcPath = path.join(projectPath, 'src', 'main', 'scala');
      const targetPath = path.join(projectPath, 'target');
      const targetFile = path.join(srcPath, 'EntryPoint.scala');
      const dependency = path.join(srcPath, 'Foo.scala');

      atom.project.setPaths([projectPath]);

      await resetPath(targetPath);
      const outputPath = await buildOutputPath(targetPath, projectPath);
      await buildSourceWithDependency(dependency, outputPath);
      const editor = await openFile(targetFile);
      const messages = await lint(editor);

      expect(messages.length).toBe(1);
      expect(messages[0].severity).toBe('error');
      expect(messages[0].excerpt).toBe('value bar2 is not a member of Foo');
    });

    it('lints a source file with dependencies in packages if the dependencies are already compiled', async () => {
      const projectPath = path.join(fixturesPath, 'project3');
      const srcPath = path.join(projectPath, 'src', 'main', 'scala', 'linter', 'scalac');
      const targetPath = path.join(projectPath, 'target');
      const targetFile = path.join(srcPath, 'EntryPoint.scala');
      const dependency = path.join(srcPath, 'Foo.scala');

      atom.project.setPaths([projectPath]);

      await resetPath(targetPath);
      const outputPath = await buildOutputPath(targetPath, projectPath);
      await buildSourceWithDependency(dependency, outputPath);
      const editor = await openFile(targetFile);
      const messages = await lint(editor);

      expect(messages.length).toBe(1);
      expect(messages[0].severity).toBe('error');
      expect(messages[0].excerpt).toBe('value bar2 is not a member of linter.scalac.Foo');
    });

    it('does not usefully lint a source file with dependencies in packages if the dependencies are not compiled', async () => {
      const projectPath = path.join(fixturesPath, 'project3');
      const srcPath = path.join(projectPath, 'src', 'main', 'scala', 'linter', 'scalac');
      const targetPath = path.join(projectPath, 'target');
      const targetFile = path.join(srcPath, 'EntryPoint.scala');

      atom.project.setPaths([projectPath]);

      await resetPath(targetPath);
      await buildOutputPath(targetPath, projectPath);
      const editor = await openFile(targetFile);
      const messages = await lint(editor);

      expect(messages.length).toBe(1);
      expect(messages[0].severity).toBe('error');
      expect(messages[0].excerpt).toBe('not found: type Foo');
    });

    it('does not compile files to the classpath', async () => {
      const projectPath = path.join(fixturesPath, 'project3');
      const targetPath = path.join(projectPath, 'target');
      const targetFile = path.join(projectPath, 'src', 'main', 'scala', 'linter', 'scalac', 'Foo.scala');

      atom.project.setPaths([projectPath]);

      await resetPath(targetPath);
      const outputPath = await buildOutputPath(targetPath, projectPath);
      const editor = await openFile(targetFile);
      const messages = await lint(editor);

      expect(messages.length).toBe(0);

      const classPath = path.join(outputPath, 'linter', 'scalac', 'Foo.class');
      try {
        await isFile(classPath);
        expect(false).toBe(true);
      } catch (e) {
        const errMessage = `ENOENT: no such file or directory, stat '${classPath}'`;
        expect(e.message).toBe(errMessage);
      }
      const goodpath = path.join(__dirname, '..', 'linter', 'scalac', 'Foo.class');
      expect(await isFile(goodpath)).toEqual(true);
    });
  });

  describe('the behaviour that writes to the classpath folder', () => {
    it('compiles files to the classpath', async () => {
      const projectPath = path.join(fixturesPath, 'project3');
      const targetPath = path.join(projectPath, 'target');
      const targetFile = path.join(projectPath, 'src', 'main', 'scala', 'linter', 'scalac', 'Foo.scala');

      atom.config.set('linter-scalac.compileClassesToClasspath', true);
      atom.project.setPaths([projectPath]);

      await resetPath(targetPath);
      const outputPath = await buildOutputPath(targetPath, projectPath);
      const editor = await openFile(targetFile);
      const messages = await lint(editor);

      expect(messages.length).toBe(0);
      const classPath = path.join(outputPath, 'linter', 'scalac', 'Foo.class');
      expect(await isFile(classPath)).toEqual(true);
    });
  });

  describe('the behaviour that compiles all classes on lint', () => {
    it('lints the active file by compiling all the scala files in the project', async () => {
      const projectPath = path.join(fixturesPath, 'project3');
      const targetPath = path.join(projectPath, 'target');
      const targetFile = path.join(projectPath, 'src', 'main', 'scala', 'linter', 'scalac', 'EntryPoint.scala');

      atom.config.set('linter-scalac.compileClassesToClasspath', true);
      atom.config.set('linter-scalac.compileAllClassesOnLint', true);
      atom.project.setPaths([projectPath]);

      await resetPath(targetPath);
      await buildOutputPath(targetPath, projectPath);
      const editor = await openFile(targetFile);
      const messages = await lint(editor);

      expect(messages.length).toBe(1);
      expect(messages[0].severity).toBe('error');
      expect(messages[0].excerpt).toBe('value bar2 is not a member of linter.scalac.Foo');
    });
  });
});
