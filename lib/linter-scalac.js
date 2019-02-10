'use babel';

// eslint-disable-next-line import/no-extraneous-dependencies, import/extensions
import { CompositeDisposable } from 'atom';

let helpers;
let fs;
let path;
let glob;
let mkdirp;

const VALID_SEVERITIES = new Set(['error', 'warning', 'info']);
const fileRegex = /(.+):(\d+): (error|warning): (.+)/g;
const compilerRegex = /scalac (error|warning): (.+)/g;

const getSeverity = (givenSeverity) => {
  const severity = givenSeverity.toLowerCase();
  return VALID_SEVERITIES.has(severity) ? severity : 'warning';
};

const loadDeps = () => {
  if (!helpers) {
    helpers = require('atom-linter');
  }
  if (!path) {
    path = require('path');
  }
  if (!fs) {
    fs = require('fs');
  }
  if (!glob) {
    glob = require('glob');
  }
  if (!mkdirp) {
    mkdirp = require('mkdirp');
  }
};

const parseFileOutput = (output, filePath, editor) => {
  const messages = [];

  let match = fileRegex.exec(output, filePath);
  while (match !== null) {
    const severity = getSeverity(match[3]);
    const line = Number.parseInt(match[2], 10) - 1;
    const excerpt = match[4];
    messages.push({
      severity,
      excerpt,
      location: {
        file: filePath,
        position: helpers.generateRange(editor, line),
      },
    });
    match = fileRegex.exec(output);
  }
  return messages;
};

const parseCompileOutput = (output, filePath) => {
  const messages = [];

  let match = compilerRegex.exec(output);
  while (match !== null) {
    const severity = getSeverity(match[1]);
    const excerpt = match[2];
    messages.push({
      severity,
      excerpt,
      location: {
        file: filePath,
        // first line of the file
        position: [[0, 0], [0, Infinity]],
      },
    });
    match = compilerRegex.exec(output);
  }
  return messages;
};

module.exports = {
  activate() {
    this.idleCallbacks = new Set();
    let depsCallbackID;
    const installLinterReekDeps = () => {
      this.idleCallbacks.delete(depsCallbackID);
      if (!atom.inSpecMode()) {
        require('atom-package-deps').install('linter-scalac');
      }
      loadDeps();
    };
    depsCallbackID = window.requestIdleCallback(installLinterReekDeps);
    this.idleCallbacks.add(depsCallbackID);

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
            atom.config.set('linter-scalac.compileClassesToClasspath', true);
          }
        },
      ),
      atom.config.observe(
        'linter-scalac.lintsOnChange',
        (value) => {
          this.lintsOnChange = value;
          if (!this.lintsOnChange) {
            atom.config.set('linter-scalac.lintsOnChange', false);
          }
        },
      ),
    );
  },

  deactivate() {
    this.idleCallbacks.forEach(callbackID => window.cancelIdleCallback(callbackID));
    this.idleCallbacks.clear();
    this.subscriptions.dispose();
  },

  provideLinter() {
    return {
      name: 'scalac',
      grammarScopes: ['source.scala'],
      scope: this.compileAllClassesOnLint ? 'project' : 'file',
      lintsOnChange: this.lintsOnChange,
      lint: async (editor) => {
        loadDeps();

        const filePath = editor.getPath();
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

        const stdin = editor.getText();
        const execOptions = {
          stdin,
          stream: 'stderr',
          uniqueKey: `linter-scalac::${filePath}`,
          allowEmptyStderr: true,
        };

        let output;
        try {
          output = await helpers.exec(this.scalacExecutablePath, args, execOptions);
        } catch (e) {
          if (e.message !== 'Process execution timed out') {
            atom.notifications.addInfo('linter-scalac: `scalac` timed out', {
              description: 'A timeout occured while executing `scalac`, it could be due to lower resources '
                           + 'or a temporary overload.',
            });
          } else {
            atom.notifications.addError('linter-scalac: Unexpected error', { description: e.message });
          }
          return null;
        }

        // Process was canceled by newer process
        if (output === null) { return null; }

        return parseFileOutput(output, filePath, editor)
          .concat(parseCompileOutput(output, filePath));
      },
    };
  },
};
