/**
 * Portions of this source code file are from create-react-app, used under the
 * following MIT license:
 *
 * Copyright (c) 2014-present, Facebook, Inc.
 * https://github.com/facebook/create-react-app
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path');
const babelJest = require('babel-jest');

module.exports = babelJest.createTransformer({
	extends: path.join(__dirname, '..', 'babel.config.js'),
	plugins: [
		require.resolve('@babel/plugin-transform-modules-commonjs'),
		require.resolve('babel-plugin-dynamic-import-node')
	],
	babelrc: false,
	configFile: false
});
