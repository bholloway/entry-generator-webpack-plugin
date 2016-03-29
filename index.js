'use strict';

var path = require('path');

var assign = require('lodash.assign'),
    q      = require('q'),
    fsp    = require('fs-promise');

var PLUGIN_NAME = require('./package.json').name;

function EntryGeneratorWebpackPlugin(outputFile, sources) {
  var sourceList   = [].concat(sources),
      filteredList = sourceList.filter(isSourceFn);

  if (!outputFile || (typeof outputFile !== 'string')) {
    throw new Error(PLUGIN_NAME + ': output file parameter must be a string file path');
  }
  if (filteredList.length !== sourceList.length) {
    throw new Error(PLUGIN_NAME + ': one or more of the given sources is not type function()');
  }

  this.outputFile = outputFile;
  this.sources = filteredList;

  function isSourceFn(value) {
    return (typeof value === 'function');
  }
}

EntryGeneratorWebpackPlugin.prototype.apply = apply;

module.exports = assign(EntryGeneratorWebpackPlugin, {
  bowerDependenciesSource   : require('./source/bower-source')('dependencies'),
  bowerDevDependenciesSource: require('./source/bower-source')('devDependencies'),
  globSource                : require('./source/glob-source')
});

function apply(compiler) {
  var basePath   = compiler.context || process.cwd(),
      outputFile = path.resolve(basePath, this.outputFile),
      sources    = this.sources,
      outputPath = path.dirname(outputFile);

  compiler.plugin('run', onRun);
  compiler.plugin('watch-run', onRun);

  function onRun(unused, done) {
    fsp.exists(outputFile)
      .then(onExistsGetSources)
      .then(onSourcesWriteFile)
      .catch(onError)
      .then(done);

    function onExistsGetSources(isExist) {
      if (isExist) {
        return q.when();
      } else {
        return q.all(sources.map(eachSourceAsync));
      }

      function eachSourceAsync(source) {
        return q.when(source.call(compiler, outputPath) || []);
      }
    }

    function onSourcesWriteFile(list) {
      if (list) {
        var text = list
          .reduce(flatten, [])
          .filter(Boolean)
          .filter(firstOccurrence)
          .map(toRequireStatement)
          .join('\n');

        return fsp.exists(outputPath)
          .then(makeDir)
          .then(writeFile);
      }
      else {
        return q.when();
      }

      function flatten(list, value) {
        return value ? list.concat(value) : list;
      }

      function firstOccurrence(value, i, array) {
        return (array.indexOf(value) === i);
      }

      function toRequireStatement(value) {
        var posixPath = value.replace(/\\/g, '/');
        return 'require(\'' + posixPath + '\');';
      }

      function makeDir(isExist) {
        return isExist ? q.when() : fsp.mkdir(outputPath);
      }

      function writeFile() {
        return fsp.writeFile(path.resolve(outputFile), text);
      }
    }

    function onError(message) {
      done(PLUGIN_NAME + ': ' + message.split(/[:\n]+\w*/).join('\n  '));
    }
  }
}