'use strict';

/**
 * Create a source for the given json key.
 * Typical keys include `dependencies` or `devDependencies`, use multiple sources if you need both.
 * @param {string} key A key in `bower.json`
 * @returns {function(options:object)} A source factory function
 */
function bowerSource(key) {
  /**
   * All items specified by bower and their sub-dependencies.
   * @param {object} [options] Optional options for filtering the resulting module list
   * @returns {q.Promise} A promise to a list of module names
   */
  return function bowerSourceForKey(options) {

    var path = require('path');

    var ModuleFilenameHelpers = require('webpack/lib/ModuleFilenameHelpers'),
        bowerDirectory        = require('bower-directory'),
        q                     = require('q'),
        fsp                   = require('fs-promise');

    return function list() {
      var basePath = this.context || '',
          deferred = q.defer();
      bowerDirectory({cwd: basePath}, onBower);
      return deferred.promise;

      function onBower(error, bowerDir) {
        if (error) {
          deferred.reject(new Error('cannot locate bower components as sub-directory of the Webpack context'));
        } else {
          deferred.resolve(bowerJson(path.resolve(basePath, 'bower.json'), key));
        }

        function bowerJson(jsonFilePath, key) {
          return fsp.exists(jsonFilePath)
            .then(onExistsReadFile)
            .then(onReadProcessJson)
            .catch(onError);

          function onExistsReadFile(isExist) {
            if (isExist) {
              return fsp.readFile(jsonFilePath)
            } else {
              return q.reject(new Error('expected bower.json file ' + jsonFilePath))
            }
          }

          function onReadProcessJson(buffer) {
            var json;
            try {
              json = JSON.parse(buffer.toString());
            } catch (exception) {
              return q.reject(new Error('cannot parse bower.json file ' + jsonFilePath));
            }
            var moduleNames = (json[key] && Object.keys(json[key]) || [])
              .filter(ModuleFilenameHelpers.matchObject.bind(undefined, options || {}));

            return q.all(moduleNames.map(recurseModule))
              .then(flatten);
          }

          function onError() {
            return q.reject(new Error('cannot read bower.json file ' + jsonFilePath));
          }

          function recurseModule(name) {
            return bowerJson(path.resolve(bowerDir, name, 'bower.json'), 'dependencies')
              .then(flatten)
              .then(onRecursed);

            function onRecursed(list) {
              return list.concat(name);
            }
          }

          function flatten(list) {
            return list.reduce(eachElement, [])
              .filter(firstOccurrence);

            function eachElement(reduced, value) {
              return reduced.concat(value);
            }
          }

          function firstOccurrence(value, i, array) {
            return (array.indexOf(value) === i);
          }
        }
      }
    }
  }
}

module.exports = bowerSource;