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

    var path = require('path'),
        fs   = require('fs');

    var ModuleFilenameHelpers = require('webpack/lib/ModuleFilenameHelpers'),
        q                     = require('q'),
        fsp                   = require('fs-promise');

    return function list() {
      var basePath  = this.context || process.cwd(),
          bowerFile = path.join(basePath, 'bower.json'),
          hasBower  = fs.existsSync(bowerFile) && fs.statSync(bowerFile).isFile();

      if (hasBower) {
        var bowerrcFile = path.resolve(basePath, '.bowerrc'),
            hasRcFile   = fs.existsSync(bowerrcFile) && fs.statSync(bowerrcFile).isFile();

        return (hasRcFile && readJson(bowerrcFile) || q.when())
          .then(getDirectoryField)
          .then(onBowerPath);
      }

      function getDirectoryField(json) {
        if (json && (typeof json.directory === 'string')) {
          return json.directory;
        } else {
          return 'bower_components';
        }
      }

      function onBowerPath(bowerDir) {
        return bowerJson(path.join(basePath, 'bower.json'), key);

        function bowerJson(jsonFilePath, key) {
          return readJson(jsonFilePath)
            .then(onJson);

          function onJson(json) {
            var moduleNames = (json[key] && Object.keys(json[key]) || [])
              .filter(ModuleFilenameHelpers.matchObject.bind(undefined, options || {}));

            return q.all(moduleNames.map(recurseModule))
              .then(flatten);
          }

          function recurseModule(name) {
            return bowerJson(path.resolve(basePath, bowerDir, name, 'bower.json'), 'dependencies')
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
    };

    function readJson(fullPath) {
      return fsp.exists(fullPath)
        .then(onExistsReadFile);

      function onExistsReadFile(isExist) {
        if (isExist) {
          return fsp.readFile(fullPath)
            .then(onReadProcessJson);
        } else {
          return q.reject('expected json file: ' + fullPath)
        }

        function onReadProcessJson(buffer) {
          try {
            return JSON.parse(buffer.toString());
          } catch (exception) {
            return q.reject('cannot parse json file: ' + fullPath);
          }
        }
      }
    }
  }
}

module.exports = bowerSource;