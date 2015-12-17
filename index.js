'use strict';

var path = require('path'),
    fs   = require('fs');

var assign = require('lodash.assign'),
    q      = require('q');

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
  var outputFile = this.outputFile,
      sources    = this.sources,
      outputPath = path.dirname(outputFile);

  compiler.plugin('run', onRun);
  compiler.plugin('watch-run', onRun);

  function onRun(unused, done) {

    // invoke sources in parallel
    q.all(sources.map(eachSourceAsync))
      .then(onSources)
      .catch(onError);

    function eachSourceAsync(source) {
      return source.call(compiler, outputPath);
    }

    function onSources(list) {
      var text = list
        .reduce(flatten, [])
        .filter(Boolean)
        .filter(firstOccurrence)
        .map(toRequireStatement)
        .join('\n');

      fs.writeFile(path.resolve(outputFile), text, done);

      function flatten(list, value) {
        return value ? list.concat(value) : list;
      }

      function firstOccurrence(value, i, array) {
        return (array.indexOf(value) === i);
      }

      function toRequireStatement(value) {
        return 'require(\'' + value + '\');';
      }
    }

    function onError(error) {
      throw new Error(PLUGIN_NAME + ': ' + error.message)
    }
  }
}
