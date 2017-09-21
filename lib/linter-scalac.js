'use babel';

// eslint-disable-next-line import/no-extraneous-dependencies, import/extensions
import { CompositeDisposable } from 'atom';

module.exports = {
  config: {
    scalacExecutablePath: {
      type: 'string',
      default: 'scalac',
      order: 1,
    },
    scalacOptions: {
      type: 'string',
      default: '-Xlint',
      order: 2,
    },
    compileClassesToClasspath: {
      type: 'boolean',
      default: false,
      order: 3,
    },
    compileAllClassesOnLint: {
      type: 'boolean',
      default: false,
      order: 4,
    },
  },

  activate() {
    require('atom-package-deps').install();

    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(
      atom.config.observe(
        'linter-scalac.scalacExecutablePath',
        (value) => { this.scalacExecutablePath = value; },
      ),
      atom.config.observe(
        'linter-scalac.scalacOptions',
        (value) => { this.scalacOptions = value; },
      ),
      atom.config.observe(
        'linter-scalac.compileClassesToClasspath',
        (value) => {
          this.compileClassesToClasspath = value;
          if (!this.compileClassesToClasspath) {
            atom.config.set('linter-scalac.compileAllClassesOnLint', false);
          }
        },
      ),
      atom.config.observe(
        'linter-scalac.compileAllClassesOnLint',
        (value) => {
          this.compileAllClassesOnLint = value;
          if (this.compileAllClassesOnLint) {
            atom.config.set('linter-scalac.compileAllClassesOnLint', true);
          }
        },
      ),
    );
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  provideLinter() {
    const helpers = require('atom-linter');

    const fs = require('fs');
    const path = require('path');

    const glob = require('glob');
    const mkdirp = require('mkdirp');

    const regex = '(?<file>.+):(?<line>\\d+): (?<type>(error|warning)): (?<message>(.+))';
    const compilerRegex = 'scalac (?<type>(error|warning)): (?<message>(.+))';

    return {
      name: 'scalac',
      grammarScopes: ['source.scala'],
      scope: this.compileAllClassesOnLint ? 'project' : 'file',
      lintOnFly: false,
      lint: (textEditor) => {
        const filePath = textEditor.getPath();
        const relativizedPath = atom.project.relativizePath(filePath);

        let projectPath = relativizedPath[0];

        if (!projectPath) {
          projectPath = filePath.substring(0, filePath.lastIndexOf('/'));
        }

        let args = this.scalacOptions.split(' ');

        if (helpers.find(projectPath, '.classpath')) {
          const dotClasspath = helpers.find(filePath, '.classpath');
          const classpath = fs.readFileSync(dotClasspath).toString().trim();

          args.push('-classpath', classpath);

          if (this.compileClassesToClasspath) {
            const outputPath = classpath.split(path.delimiter)[0];

            mkdirp.sync(outputPath);

            if (atom.project.contains(outputPath)) {
              args.push('-d', outputPath);
            }
          }

          if (this.compileAllClassesOnLint) {
            const paths = glob.sync(path.join('**', '*.scala'), { cwd: projectPath })
              .map(sourcePath => path.join(projectPath, sourcePath))
              .filter(sourcePath => filePath !== sourcePath);
            args = args.concat(paths);
          }
        }

        args.push(filePath);

        const options = { stream: 'stderr', allowEmptyStderr: true };

        return helpers.exec(this.scalacExecutablePath, args, options)
          .then(output =>
            helpers.parse(output, regex).concat(helpers.parse(output, compilerRegex)));
      },
    };
  },
};
