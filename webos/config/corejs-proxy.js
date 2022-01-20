/*
 *  corejs-proxy.js
 *
 *  For babel-preset-env with "useBuiltin":"entry", it requires that the
 *  require('core-js') expression be at the module level for it to
 *  be transpiled into the individual core-js polyfills. This proxy module
 *  allows for dynamic core-js usage while still using the individual feature
 *  transforms.
 */

// Apply stable core-js polyfills
require('core-js/stable');

// Manually set global._babelPolyfill as a flag to avoid multiple loading.
// Uses 'babelPolyfill' name for historical meaning and external/backward
// compatibility.
global._babelPolyfill = true;
