# Entry Generator Webpack Plugin

[![NPM](https://nodei.co/npm/entry-generator-webpack-plugin.png)](http://github.com/bholloway/entry-generator-webpack-plugin)

A Webpack plugin to dynamically generate an entry file on compiler initialisation

## Rationale

Sometimes you will want to generate an entry file dynamically. This file may consist of your bower dependencies or it may be a test suite that consists of all your unit test specification files.

This plugin will generate such a file if it is not already present. You may depende your compiler upon the output of this plugin.

## Usage

The plugin is of the following form.

```javascript
new EntryGeneratorWebpackPlugin(outputFile, sources)
```

where:
* `outputFile` is the javascript file that will be generated
* `sources` is a `function|Array.<function>` of methods that return a list of files or promise to such

### Webpack configuration

The following configuration generates a `vendor.js` files that consists of your bower `dependencies`.

```javascript
var EntryGeneratorWebpackPlugin = require('entry-generator-webpack-plugin')

module.exports = {
	entry; {
		vendor: 'vendor.js'
		...
	},
	...
	plugins: [
		new EntryGeneratorWebpackPlugin('vendor.js', [
			EntryGeneratorWebpackPlugin.bowerDependenciesSource(),
			...
		]),
		...
	]
}
```

The sources are one or more `function([outputPath:string]):Array.<string>|Promise`. It returns a list of files relative to the given output path or a list of module names or a promise that resolves to such.

### Sources

There are a number of source factories exported on `EntryGeneratorWebpackPlugin`, these include:

* **`EntryGeneratorWebpackPlugin.bowerDependenciesSource([options])`**

	A source factory that will list bower modules from the **`dependencies`** field of the `bower.json` file in the Webpack `context` directory. The `options` may include any of the standard Webpack file filters (although applied to the module names), meaning `test`, `include`, `exclude`.


* **`EntryGeneratorWebpackPlugin.bowerDevDependenciesSource([options])`**

	As above, for the **`devDependencies`** field.

* **`EntryGeneratorWebpackPlugin.globSource(pattern, [options])`**

	A source factory that can glob files rooted in the Webpack `context` directory. It supports `options` per [glob properties](https://www.npmjs.com/package/glob#properties). The `options` may also include any of the standard Webpack file filters (although applied to the module names), meaning `test`, `include`, `exclude`. Note however that it is more efficient to use the glob `ignore` property than the Webpack `exclude` regular expression.