'use strict';

/**
 * All items that match the given glob.
 * Options are used by the glob and for filtering. While Webpack file filtering is used consider the glob.ignore option
 * for fast pattern-based filtering.
 * @param {string} pattern The pattern to glob
 * @param {object} [options] Optional options for the glob and for filtering
 * @returns {q.Promise} A promise to a list of file names
 */
function globSource(pattern, options) {
  return function list(outputPath) {
    var path = require('path');

    var ModuleFilenameHelpers = require('webpack/lib/ModuleFilenameHelpers'),
        glob                  = require('glob-promise');

    return glob(pattern, options)
      .then(filter)
      .then(adjustPath);

    function filter(list) {
      return list
        .filter(ModuleFilenameHelpers.matchObject.bind(undefined, options || {}));
    }

    function adjustPath(list) {
      return list
        .map(eachRelative);

      function eachRelative(value) {
        return path.relative(outputPath, value);
      }
    }
  }
}

module.exports = globSource;