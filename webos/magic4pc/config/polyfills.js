/* eslint no-var: off, no-extend-native: off */
/*
 *  polyfills.js
 *
 *  Any polyfills or code required prior to loading the app.
 */

if (!global.skipPolyfills && !global._babelPolyfill) {
	// Temporarily remap [Array].toLocaleString to [Array].toString.
	// Fixes an issue with loading the polyfills within the v8 snapshot environment
	// where toLocaleString() within the TypedArray polyfills causes snapshot failure.
	var origToLocaleString = Array.prototype.toLocaleString,
		origTypedToLocaleString;
	Array.prototype.toLocaleString = Array.prototype.toString;
	if (global.Int8Array && Int8Array.prototype.toLocaleString) {
		origTypedToLocaleString = Int8Array.prototype.toLocaleString;
		Int8Array.prototype.toLocaleString = Int8Array.prototype.toString;
	}

	// Apply core-js polyfills
	require('./corejs-proxy');

	// Restore real [Array].toLocaleString for runtime usage.
	if (origToLocaleString) Array.prototype.toLocaleString = origToLocaleString;
	if (origTypedToLocaleString) Int8Array.prototype.toLocaleString = origTypedToLocaleString;
}
